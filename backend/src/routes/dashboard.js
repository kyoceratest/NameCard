import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.created_at, s.source,
              c.first_name, c.last_name, c.company, c.position, c.email, c.mobile
         FROM scans s
         JOIN cards c ON s.card_id = c.id
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT 200`
    );

    const rows = result.rows || [];

    const esc = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const tableRows = rows.map((row) => {
      return `<tr>
        <td>${esc(row.id)}</td>
        <td>${esc(row.created_at)}</td>
        <td>${esc(row.source)}</td>
        <td>${esc(row.first_name)} ${esc(row.last_name)}</td>
        <td>${esc(row.company)}</td>
        <td>${esc(row.position)}</td>
        <td>${esc(row.email)}</td>
        <td>${esc(row.mobile)}</td>
      </tr>`;
    }).join('');

    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NameCard · Scan Dashboard</title>
  <style>
    body { margin:0; padding:1.5rem; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f7eee7; }
    .page { max-width: 960px; margin: 0 auto; }
    h1 { font-size:1.6rem; margin:0 0 0.5rem 0; color:#333; }
    .brand { font-weight:600; letter-spacing:0.12em; font-size:0.8rem; color:#b66b4d; text-transform:uppercase; margin-bottom:0.75rem; }
    .actions { margin:0.75rem 0 1rem 0; }
    .btn { display:inline-flex; align-items:center; justify-content:center; padding:0.45rem 1.1rem; border-radius:999px; font-size:0.85rem; border:1px solid #b66b4d; color:#b66b4d; background:#fff; text-decoration:none; }
    .btn:hover { background:#f1e0d4; }
    table { width:100%; border-collapse:collapse; font-size:0.85rem; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,0.06); }
    thead { background:#f1e0d4; }
    th, td { padding:0.55rem 0.7rem; text-align:left; }
    th { font-weight:600; color:#444; }
    tbody tr:nth-child(even) { background:#faf5f0; }
    tbody tr:hover { background:#f3e7dd; }
  </style>
</head>
<body>
  <main class="page">
    <div class="brand">Cœur Du Ciel · Digital NameCard</div>
    <h1>Scan Dashboard</h1>
    <p style="font-size:0.9rem; color:#555;">Recent scans of database QR codes (latest 200 entries).</p>
    <div class="actions">
      <a class="btn" href="/dashboard/export">Export for Excel (CSV)</a>
    </div>
    <p style="font-size:0.8rem; color:#777; margin:0 0 1rem 0;">Downloads a standard CSV file compatible with Excel and other systems.</p>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>When</th>
          <th>Source</th>
          <th>Name</th>
          <th>Company</th>
          <th>Position</th>
          <th>Email</th>
          <th>Mobile</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || '<tr><td colspan="8" style="padding:0.8rem; color:#777;">No scans yet.</td></tr>'}
      </tbody>
    </table>
  </main>
</body>
</html>`);
  } catch (err) {
    console.error('Error rendering dashboard:', err);
    res.status(500).send('Server error while loading dashboard');
  }
});

// CSV export of all scans
router.get('/export', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.created_at, s.source,
              c.first_name, c.last_name, c.company, c.position, c.email, c.mobile
         FROM scans s
         JOIN cards c ON s.card_id = c.id
        ORDER BY s.created_at DESC, s.id DESC`
    );

    const rows = result.rows || [];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="namecard_scans.csv"');

    const header = 'id,created_at,source,first_name,last_name,company,position,email,mobile\n';
    const escapeCsv = (value) => {
      if (value == null) return '';
      const s = String(value);
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const lines = rows.map((row) => [
      escapeCsv(row.id),
      escapeCsv(row.created_at),
      escapeCsv(row.source),
      escapeCsv(row.first_name),
      escapeCsv(row.last_name),
      escapeCsv(row.company),
      escapeCsv(row.position),
      escapeCsv(row.email),
      escapeCsv(row.mobile)
    ].join(','));

    res.send(header + lines.join('\n'));
  } catch (err) {
    console.error('Error exporting scans CSV:', err);
    res.status(500).send('Server error while exporting scans');
  }
});

export default router;
