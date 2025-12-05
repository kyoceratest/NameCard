import { pool } from './db.js';

// Helper to load the current user from a simple token.
// Token format (temporary): "<userId>:<tenantId>" (no signing yet).

export async function getUserFromToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split(':');
  const userId = parts[0];

  if (!userId) {
    return null;
  }

  const id = parseInt(userId, 10);
  if (!Number.isFinite(id)) {
    return null;
  }

  const result = await pool.query(
    `SELECT id, tenant_id, email, role, display_name
     FROM users
     WHERE id = $1`,
    [id]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const user = result.rows[0];

  return {
    id: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role,
    displayName: user.display_name
  };
}

// Optional middleware for future use. Currently not wired to routes
// so it does not change existing behavior unless explicitly enabled.

export async function authMiddleware(req, _res, next) {
  try {
    const headerToken = req.header('x-auth-token');
    const token = headerToken && headerToken.trim() ? headerToken.trim() : null;

    if (!token) {
      req.user = null;
      return next();
    }

    const user = await getUserFromToken(token);
    req.user = user || null;
  } catch (err) {
    console.error('Error resolving auth context:', err);
    req.user = null;
  }

  return next();
}
