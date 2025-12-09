import { Router } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../authContext.js';

const router = Router();

// All routes in this file require authentication.
router.use(authMiddleware);

// Simple protected endpoint: list recent scans.
// For now it returns all scans visible in the database but only
// if the caller is authenticated. We can later restrict by tenant_id.
router.get('/', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'tenant_admin') {
    return res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Admin role required to view secure scans.'
    });
  }

  try {
    // First get user's tenant_id from the users table
    const userResult = await pool.query(
      'SELECT tenant_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User not found.'
      });
    }

    const tenantId = userResult.rows[0].tenant_id;

    // Get scans only for cards that belong to the user's tenant
    const result = await pool.query(
      `SELECT
         s.id,
         s.card_id,
         s.source,
         s.scan_meta,
         s.created_at,
         c.first_name,
         c.last_name,
         c.company,
         c.email,
         c.mobile
       FROM scans s
       JOIN cards c ON c.id = s.card_id
       WHERE c.tenant_id = $1
       ORDER BY s.created_at DESC
       LIMIT 100`,
      [tenantId]
    );

    res.json({
      success: true,
      tenant_id: tenantId, // For debugging
      user: req.user,
      scans: result.rows
    });
  } catch (err) {
    console.error('Error fetching secure scans:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching scans.'
    });
  }
});

export default router;
