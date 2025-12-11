import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Lock down the old public dashboard: redirect everyone to the secure dashboard,
// which handles authentication, tenant restriction and roles.
router.get('/', (req, res) => {
  res.redirect('/secure-dashboard');
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
