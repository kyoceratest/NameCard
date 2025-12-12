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

  try {
    // If an auth token is present, try to resolve the calling user and use
    // their tenant_id for this card. This is what will be used by the
    // secure business builder so scans can be filtered per company.
    let finalTenantId = tenantId || null;

    const authHeader = req.header('x-auth-token');
    const token = authHeader && authHeader.trim();

    if (token) {
      const [userIdPart] = token.split(':');
      const userId = parseInt(userIdPart, 10);

      if (Number.isFinite(userId)) {
        try {
          const meResult = await pool.query(
            'SELECT id, tenant_id FROM users WHERE id = $1',
            [userId]
          );

          if (meResult.rowCount > 0) {
            const me = meResult.rows[0];
            if (me.tenant_id != null) {
              finalTenantId = me.tenant_id;
            }
          }
        } catch (authErr) {
          console.error('Error resolving tenant for /api/cards:', authErr);
          // Continue without tenant rather than failing card creation.
        }
      }
    }

    const baseScanUrl = process.env.PUBLIC_SCAN_BASE_URL || 'http://localhost:4000/scan';

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
        details_json,
        tenant_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
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
        details ? JSON.stringify(details) : null,
        finalTenantId
      ]
    );

    const row = result.rows[0];
    const publicTokenValue = row.public_token;
    const scanUrl = `${baseScanUrl}?t=${encodeURIComponent(publicTokenValue)}`;

    res.json({
      success: true,
      card: {
        id: row.id,
        publicToken: publicTokenValue,
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
        tenantId: finalTenantId || null,
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
