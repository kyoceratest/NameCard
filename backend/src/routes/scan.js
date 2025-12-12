import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const tokenRaw = req.query.t || '';
  const token = String(tokenRaw);

  if (!token) {
    res.type('html').send('<p>Missing token.</p>');
    return;
  }

  try {
    const cardResult = await pool.query(
      'SELECT id, first_name, last_name, company, position, email, mobile, office, address_street, address_city, address_region, address_zip_country FROM cards WHERE public_token = $1',
      [token]
    );

    if (cardResult.rows.length === 0) {
      res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NameCard Scan</title>
</head>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 1.5rem;">
  <h1>Card not found</h1>
  <p>No NameCard is associated with this QR code.</p>
</body>
</html>`);
      return;
    }

    const card = cardResult.rows[0];

    // Log scan (best-effort, ignore errors)
    pool.query(
      'INSERT INTO scans (card_id, source, scan_meta) VALUES ($1, $2, $3)',
      [card.id, 'public', null]
    ).catch((err) => {
      console.error('Error logging scan:', err);
    });

    const esc = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const fullName = `${esc(card.first_name)} ${esc(card.last_name)}`.trim();
    const addressParts = [card.address_street, card.address_city, card.address_region, card.address_zip_country]
      .filter(Boolean)
      .map(esc)
      .join(', ');

    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NameCard Contact</title>
  <style>
    body { margin:0; padding:1.5rem; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f7eee7; }
    .page { max-width: 720px; margin: 0 auto; }
    .brand { display:flex; align-items:center; gap:0.5rem; font-weight:600; letter-spacing:0.12em; font-size:0.8rem; color:#b66b4d; text-transform:uppercase; margin-bottom:0.75rem; }
    .brand img { display:block; }
    .card { background:#ffffff; border-radius:24px; padding:1.75rem 2rem; box-shadow:0 18px 45px rgba(0,0,0,0.08); }
    .card-header { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:1.25rem; }
    .logo-circle { width:44px; height:44px; border-radius:50%; background:#f2e3d8; display:flex; align-items:center; justify-content:center; font-size:1.1rem; color:#b66b4d; font-weight:600; }
    .header-text { flex:1; text-align:right; }
    .header-company { font-size:0.95rem; font-weight:600; color:#444; }
    .name-block { margin-bottom:0.75rem; }
    .name { font-size:1.5rem; font-weight:600; color:#333; margin:0 0 0.1rem 0; }
    .name-divider { width:56px; height:2px; background:#b66b4d; border-radius:999px; margin:0.25rem 0 0.4rem 0; }
    .position { font-size:0.95rem; color:#777; margin:0 0 0.25rem 0; }
    .company-line { font-size:0.95rem; color:#444; font-weight:500; }
    .info-row { display:flex; align-items:center; font-size:0.95rem; color:#444; margin:0.25rem 0; }
    .info-label { min-width:4.75rem; font-weight:500; color:#666; }
    .info-value { flex:1; }
    .actions { margin-top:1.4rem; display:flex; flex-wrap:wrap; gap:0.85rem; }
    .btn { display:inline-flex; align-items:center; justify-content:center; padding:0.55rem 1.3rem; border-radius:999px; font-size:0.9rem; border:1px solid transparent; cursor:pointer; text-decoration:none; transition:background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
    .btn-primary { background:#b66b4d; color:#fff; border-color:#b66b4d; }
    .btn-primary:hover { background:#9b5a40; border-color:#9b5a40; }
    .btn-ghost { background:#fff; color:#555; border-color:#e2d6cc; }
    .btn-ghost:hover { border-color:#cbb9aa; }
    .hint { margin-top:0.8rem; font-size:0.8rem; color:#8a7a6c; }
  </style>
</head>
<body>
  <main class="page">
    <div class="brand">
      <img src="/image/logoCDC.png" alt="CDC logo" style="height:26px; border-radius:4px;" />
      <img src="/image/nom.png" alt="Cœur Du Ciel" style="height:20px;" />
      <span>Digital NameCard</span>
    </div>
    <section class="card">
      <div class="card-header">
        <div class="logo-circle">☘</div>
        <div class="header-text">
          ${card.company ? `<div class="header-company">${esc(card.company)}</div>` : ''}
        </div>
      </div>
      <div class="name-block">
        <h1 class="name">${fullName || 'Contact'}</h1>
        <div class="name-divider"></div>
        ${card.position ? `<p class="position">${esc(card.position)}</p>` : ''}
        ${card.company ? `<p class="company-line">${esc(card.company)}</p>` : ''}
      </div>
      <div>
        ${card.mobile ? `<div class="info-row"><div class="info-label">Mobile</div><div class="info-value">${esc(card.mobile)}</div></div>` : ''}
        ${card.office ? `<div class="info-row"><div class="info-label">Office</div><div class="info-value">${esc(card.office)}</div></div>` : ''}
        ${card.email ? `<div class="info-row"><div class="info-label">Email</div><div class="info-value">${esc(card.email)}</div></div>` : ''}
        ${addressParts ? `<div class="info-row"><div class="info-label">Address</div><div class="info-value">${addressParts}</div></div>` : ''}
      </div>
      <div class="actions">
        <a class="btn btn-primary" href="/scan/vcard?t=${encodeURIComponent(token)}">Save vCard</a>
        ${card.email ? `<a class="btn btn-ghost" href="mailto:${esc(card.email)}">Send email</a>` : ''}
      </div>
      <p class="hint">Use "Save vCard" to add this contact directly to your phone or email client.</p>
    </section>
  </main>
</body>
</html>`);
  } catch (err) {
    console.error('Error handling scan request:', err);
    res.type('html').status(500).send('<p>Server error while resolving this QR code.</p>');
  }
});

// vCard download endpoint for a given token
router.get('/vcard', async (req, res) => {
  const tokenRaw = req.query.t || '';
  const token = String(tokenRaw);

  if (!token) {
    res.status(400).send('Missing token');
    return;
  }

  try {
    const cardResult = await pool.query(
      'SELECT first_name, last_name, company, position, email, mobile, office, address_street, address_city, address_region, address_zip_country FROM cards WHERE public_token = $1',
      [token]
    );

    if (cardResult.rows.length === 0) {
      res.status(404).send('Card not found');
      return;
    }

    const card = cardResult.rows[0];

    const esc = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

    const firstName = esc(card.first_name);
    const lastName = esc(card.last_name);
    const email = esc(card.email);
    const mobile = esc(card.mobile);

    const vcardLines = [];
    vcardLines.push('BEGIN:VCARD');
    vcardLines.push('VERSION:3.0');
    vcardLines.push('N:' + lastName + ';' + firstName + ';;;');
    vcardLines.push('FN:' + (firstName + ' ' + lastName).trim());

    if (mobile) {
      vcardLines.push('TEL;TYPE=CELL,VOICE:' + mobile);
    }
    if (email) {
      vcardLines.push('EMAIL;TYPE=INTERNET:' + email);
    }

    vcardLines.push('END:VCARD');

    const vcardContent = vcardLines.join('\n');

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contact.vcf"');
    res.send(vcardContent);
  } catch (err) {
    console.error('Error generating vCard:', err);
    res.status(500).send('Server error while generating vCard');
  }
});

export default router;
