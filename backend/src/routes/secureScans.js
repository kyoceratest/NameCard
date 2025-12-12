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

  // Roles allowed to view secure scans. All are still tenant-restricted
  // except the future global CDC admin.
  const allowedViewRoles = ['cdc_admin', 'tenant_admin', 'manager', 'employee'];
  if (!req.user.role || allowedViewRoles.indexOf(req.user.role) === -1) {
    return res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Your account does not have permission to view secure scans.'
    });
  }

  try {
    // First get user's tenant_id and role from the users table
    const userResult = await pool.query(
      'SELECT tenant_id, role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User not found.'
      });
    }

    const dbUser = userResult.rows[0];
    const tenantId = dbUser.tenant_id;
    const role = dbUser.role || req.user.role;

    let result;

    if (role === 'cdc_admin') {
      // CDC admin: see all scans across all tenants
      result = await pool.query(
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
         ORDER BY s.created_at DESC
         LIMIT 100`
      );
    } else {
      // Non-CDC roles: restrict to their own tenant
      result = await pool.query(
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
    }

    res.json({
      success: true,
      tenant_id: tenantId || null, // For debugging
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
