import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Minimal login endpoint for future multi-tenant auth.
// This is intentionally simple and temporary:
// - Looks up the user by email in the "users" table.
// - Compares the provided password directly to password_hash (no hashing yet).
// - On success, returns a very simple token and basic user info.
// - Does NOT yet protect any existing routes.

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Missing email or password.'
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, tenant_id, email, password_hash, role, display_name
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = result.rows[0];

    // TEMP: plain-text compare with password_hash column.
    if (password !== user.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Very simple, unsigned token for now.
    const token = `${user.id}:${user.tenant_id || ''}`;

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        role: user.role,
        displayName: user.display_name
      }
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
});

export default router;
