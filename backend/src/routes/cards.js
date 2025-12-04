import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

function generatePublicToken() {
  return 'nc_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

router.post('/', async (req, res) => {
  const {
    firstName,
    lastName,
    mobile,
    office,
    company,
    position,
    email,
    address,
    street,
    city,
    region,
    zipCountry,
    tenantId,
    details
  } = req.body || {};

  if (!firstName || !lastName || !mobile) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields (firstName, lastName, mobile)'
    });
  }

  const baseScanUrl = process.env.PUBLIC_SCAN_BASE_URL || 'http://localhost:4000/scan';

  try {
    const publicToken = generatePublicToken();

    const result = await pool.query(
      `INSERT INTO cards (
        public_token,
        first_name,
        last_name,
        company,
        position,
        email,
        mobile,
        office,
        address_street,
        address_city,
        address_region,
        address_zip_country,
        details_json
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING id, public_token`,
      [
        publicToken,
        firstName,
        lastName,
        company || null,
        position || null,
        email || null,
        mobile,
        office || null,
        street || null,
        city || null,
        region || null,
        zipCountry || null,
        details ? JSON.stringify(details) : null
      ]
    );

    const row = result.rows[0];
    const token = row.public_token;
    const scanUrl = `${baseScanUrl}?t=${encodeURIComponent(token)}`;

    res.json({
      success: true,
      card: {
        id: row.id,
        publicToken: token,
        scanUrl,
        firstName,
        lastName,
        mobile,
        office,
        company,
        position,
        email,
        address,
        street,
        city,
        region,
        zipCountry,
        tenantId: tenantId || null,
        details: details || null
      }
    });
  } catch (err) {
    console.error('Error inserting card:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while creating online card.'
    });
  }
});

export default router;
