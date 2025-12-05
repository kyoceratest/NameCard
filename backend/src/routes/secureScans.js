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

  try {
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
       LEFT JOIN cards c ON c.id = s.card_id
       ORDER BY s.created_at DESC
       LIMIT 100`
    );

    res.json({
      success: true,
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
