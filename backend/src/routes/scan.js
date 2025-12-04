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

    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NameCard Scan</title>
</head>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 1.5rem; max-width: 640px; margin: 0 auto;">
  <h1>Contact details</h1>
  <p><strong>Name:</strong> ${esc(card.first_name)} ${esc(card.last_name)}</p>
  ${card.company ? `<p><strong>Company:</strong> ${esc(card.company)}</p>` : ''}
  ${card.position ? `<p><strong>Position:</strong> ${esc(card.position)}</p>` : ''}
  ${card.mobile ? `<p><strong>Mobile:</strong> ${esc(card.mobile)}</p>` : ''}
  ${card.office ? `<p><strong>Office:</strong> ${esc(card.office)}</p>` : ''}
  ${card.email ? `<p><strong>Email:</strong> ${esc(card.email)}</p>` : ''}
  ${card.address_street || card.address_city || card.address_region || card.address_zip_country
        ? `<p><strong>Address:</strong> ${esc(card.address_street || '')} ${esc(card.address_city || '')} ${esc(card.address_region || '')} ${esc(card.address_zip_country || '')}</p>`
        : ''}
</body>
</html>`);
  } catch (err) {
    console.error('Error handling scan request:', err);
    res.type('html').status(500).send('<p>Server error while resolving this QR code.</p>');
  }
});

export default router;
