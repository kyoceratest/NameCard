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
       WHERE email = $1
         AND (is_active IS NULL OR is_active = true)`,
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

// POST /auth/users/:id/activate
// Re-activate a previously soft-deleted user.
router.post('/users/:id/activate', async (req, res) => {
  const authHeader = req.header('x-auth-token');
  const token = authHeader && authHeader.trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  const [userIdPart] = token.split(':');
  const requesterId = parseInt(userIdPart, 10);
  const targetId = parseInt(req.params.id, 10);

  if (!Number.isFinite(requesterId) || !Number.isFinite(targetId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user id.'
    });
  }

  try {
    const meResult = await pool.query(
      'SELECT id, tenant_id, role FROM users WHERE id = $1',
      [requesterId]
    );

    if (meResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found for this token.'
      });
    }

    const me = meResult.rows[0];

    const targetResult = await pool.query(
      'SELECT id, tenant_id, role, is_active FROM users WHERE id = $1',
      [targetId]
    );

    if (targetResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const target = targetResult.rows[0];

    if (target.is_active === true) {
      return res.status(200).json({
        success: true,
        message: 'User is already active.'
      });
    }

    // Role-based permission checks (same as for delete)
    if (me.role === 'cdc_admin') {
      // can activate any user
    } else if (me.role === 'tenant_admin') {
      if (target.tenant_id !== me.tenant_id) {
        return res.status(403).json({
          success: false,
          message: 'You can only activate users from your own tenant.'
        });
      }
      if (!['manager', 'employee'].includes(target.role)) {
        return res.status(403).json({
          success: false,
          message: 'Tenant admin can only activate manager or employee users.'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to activate users.'
      });
    }

    await pool.query(
      'UPDATE users SET is_active = true WHERE id = $1',
      [targetId]
    );

    return res.json({
      success: true,
      message: 'User has been re-activated.'
    });
  } catch (err) {
    console.error('Error activating user via /auth/users/:id/activate:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while activating user.'
    });
  }
});

// --- User management helpers (for /secure-users) ---

// Build a simple user object from DB row
function mapUserRow(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    tenant_name: row.tenant_name,
    email: row.email,
    role: row.role,
    display_name: row.display_name,
    is_active: row.is_active
  };
}

// GET /auth/users/me
// Returns current user info and the list of users they are allowed to see.
router.get('/users/me', async (req, res) => {
  const authHeader = req.header('x-auth-token');
  const token = authHeader && authHeader.trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  // Reuse the same login token format: userId:tenantId
  const [userIdPart] = token.split(':');
  const userId = parseInt(userIdPart, 10);

  if (!Number.isFinite(userId)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid auth token.'
    });
  }

  try {
    const meResult = await pool.query(
      `SELECT u.id,
              u.tenant_id,
              u.email,
              u.role,
              u.display_name,
              t.name AS tenant_name
         FROM users u
         LEFT JOIN tenants t ON t.id = u.tenant_id
        WHERE u.id = $1`,
      [userId]
    );

    if (meResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found for this token.'
      });
    }

    const me = meResult.rows[0];

    let usersResult;
    let canViewUsers = false;
    let canDeleteUsers = false;
    const allowedRoles = [];

    if (me.role === 'cdc_admin') {
      // CDC admin: can see all users, can create tenant_admin/manager/employee
      usersResult = await pool.query(
        `SELECT u.id,
                u.tenant_id,
                t.name AS tenant_name,
                u.email,
                u.role,
                u.display_name,
                u.is_active
           FROM users u
           LEFT JOIN tenants t ON t.id = u.tenant_id
          ORDER BY u.email`
      );
      canViewUsers = true;
      canDeleteUsers = true;
      allowedRoles.push(
        { value: 'tenant_admin', label: 'Client admin (tenant_admin)' },
        { value: 'manager', label: 'Manager (manager)' },
        { value: 'employee', label: 'Employee (employee)' }
      );
    } else if (me.role === 'tenant_admin') {
      // Tenant admin: can see only their tenant users, can create manager/employee
      usersResult = await pool.query(
        `SELECT u.id,
                u.tenant_id,
                t.name AS tenant_name,
                u.email,
                u.role,
                u.display_name,
                u.is_active
           FROM users u
           LEFT JOIN tenants t ON t.id = u.tenant_id
          WHERE u.tenant_id = $1
          ORDER BY u.email`,
        [me.tenant_id]
      );
      canViewUsers = true;
      canDeleteUsers = true;
      allowedRoles.push(
        { value: 'manager', label: 'Manager (manager)' },
        { value: 'employee', label: 'Employee (employee)' }
      );
    } else {
      // Other roles: no management rights
      usersResult = { rows: [] };
      canViewUsers = false;
    }

    const users = (usersResult.rows || []).map((row) => {
      const u = mapUserRow(row);

      // Compute per-user delete permission for convenience in UI
      let canDelete = false;
      if (canDeleteUsers && u.id !== me.id) {
        if (me.role === 'cdc_admin') {
          canDelete = true;
        } else if (me.role === 'tenant_admin') {
          if (u.tenant_id === me.tenant_id && (u.role === 'manager' || u.role === 'employee')) {
            canDelete = true;
          }
        }
      }

      u.canDelete = canDelete;
      return u;
    });

    return res.json({
      success: true,
      me: {
        id: me.id,
        tenantId: me.tenant_id,
        email: me.email,
        role: me.role,
        displayName: me.display_name
      },
      users,
      canViewUsers,
      canDeleteUsers,
      allowedRoles
    });
  } catch (err) {
    console.error('Error loading users for /auth/users/me:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading users.'
    });
  }
});

// POST /auth/users
// Creates a user, enforcing creator role rules.
router.post('/users', async (req, res) => {
  const authHeader = req.header('x-auth-token');
  const token = authHeader && authHeader.trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  const [userIdPart] = token.split(':');
  const userId = parseInt(userIdPart, 10);

  if (!Number.isFinite(userId)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid auth token.'
    });
  }

  const { email, displayName, password, role, tenantId } = req.body || {};

  if (!email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Missing email, password or role.'
    });
  }

  try {
    const meResult = await pool.query(
      'SELECT id, tenant_id, role FROM users WHERE id = $1',
      [userId]
    );

    if (meResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found for this token.'
      });
    }

    const me = meResult.rows[0];

    let targetTenantId = null;
    const normalizedEmail = email.toLowerCase();

    if (me.role === 'cdc_admin') {
      // CDC admin can choose tenant and role (but not create cdc_admin via this route)
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'tenantId is required when creating users as CDC admin.'
        });
      }

      if (!['tenant_admin', 'manager', 'employee'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role for CDC admin. Allowed: tenant_admin, manager, employee.'
        });
      }

      targetTenantId = tenantId;
    } else if (me.role === 'tenant_admin') {
      // Tenant admin can only create manager/employee in their own tenant
      if (!['manager', 'employee'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Tenant admin can only create manager or employee users.'
        });
      }

      targetTenantId = me.tenant_id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create users.'
      });
    }

    // Ensure email is unique
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    const insertResult = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, role, display_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id, email, role, display_name`,
      [targetTenantId, normalizedEmail, password, role, displayName || null]
    );

    const newUser = mapUserRow(insertResult.rows[0]);

    return res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (err) {
    console.error('Error creating user via /auth/users:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating user.'
    });
  }
});

// DELETE /auth/users/:id
// Soft delete: marks user as inactive and logs into user_deletions.
router.delete('/users/:id', async (req, res) => {
  const authHeader = req.header('x-auth-token');
  const token = authHeader && authHeader.trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  const [userIdPart] = token.split(':');
  const requesterId = parseInt(userIdPart, 10);
  const targetId = parseInt(req.params.id, 10);

  if (!Number.isFinite(requesterId) || !Number.isFinite(targetId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user id.'
    });
  }

  if (requesterId === targetId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account.'
    });
  }

  const { reason } = req.body || {};

  try {
    const meResult = await pool.query(
      'SELECT id, tenant_id, role FROM users WHERE id = $1',
      [requesterId]
    );

    if (meResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found for this token.'
      });
    }

    const me = meResult.rows[0];

    const targetResult = await pool.query(
      'SELECT id, tenant_id, role, is_active FROM users WHERE id = $1',
      [targetId]
    );

    if (targetResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const target = targetResult.rows[0];

    if (target.is_active === false) {
      return res.status(200).json({
        success: true,
        message: 'User is already inactive.'
      });
    }

    // Role-based permission checks
    if (me.role === 'cdc_admin') {
      // can delete any user except self (already checked)
    } else if (me.role === 'tenant_admin') {
      if (target.tenant_id !== me.tenant_id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete users from your own tenant.'
        });
      }
      if (!['manager', 'employee'].includes(target.role)) {
        return res.status(403).json({
          success: false,
          message: 'Tenant admin can only delete manager or employee users.'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete users.'
      });
    }

    // Mark user as inactive
    await pool.query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [targetId]
    );

    // Insert audit record; ignore failure if table does not exist
    try {
      await pool.query(
        `INSERT INTO user_deletions (user_id, tenant_id, requested_by, reason)
         VALUES ($1, $2, $3, $4)`,
        [targetId, target.tenant_id, me.id, reason || null]
      );
    } catch (auditErr) {
      console.error('Error writing user_deletions audit record:', auditErr);
    }

    return res.json({
      success: true,
      message: 'User has been disabled.'
    });
  } catch (err) {
    console.error('Error deleting user via /auth/users/:id:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting user.'
    });
  }
});

// GET /auth/user-deletions
// CDC admin only: returns recent user deletion audit records.
router.get('/user-deletions', async (req, res) => {
  const authHeader = req.header('x-auth-token');
  const token = authHeader && authHeader.trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  const [userIdPart] = token.split(':');
  const requesterId = parseInt(userIdPart, 10);

  if (!Number.isFinite(requesterId)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid auth token.'
    });
  }

  try {
    const meResult = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [requesterId]
    );

    if (meResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found for this token.'
      });
    }

    const me = meResult.rows[0];
    if (me.role !== 'cdc_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only CDC admins can view the deletion audit log.'
      });
    }

    const auditResult = await pool.query(
      `SELECT d.id,
              d.user_id,
              u.email AS user_email,
              d.tenant_id,
              t.name AS tenant_name,
              d.requested_by,
              rb.email AS requested_by_email,
              d.reason,
              d.created_at
         FROM user_deletions d
         LEFT JOIN users u ON u.id = d.user_id
         LEFT JOIN users rb ON rb.id = d.requested_by
         LEFT JOIN tenants t ON t.id = d.tenant_id
         ORDER BY d.created_at DESC
         LIMIT 50`
    );

    return res.json({
      success: true,
      deletions: auditResult.rows || []
    });
  } catch (err) {
    console.error('Error loading user_deletions audit log:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading deletion audit log.'
    });
  }
});

export default router;
