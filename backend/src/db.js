import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set. The NameCard backend will not be able to connect to Postgres.');
}

export const pool = new Pool({
  connectionString
});

export async function initDb() {
  if (!connectionString) {
    console.warn('Skipping DB init because DATABASE_URL is missing.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Core multi-tenant tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN (
          'platform_admin','tenant_admin','manager','employee','client'
        )),
        display_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        public_token TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name  TEXT NOT NULL,
        company    TEXT,
        position   TEXT,
        email      TEXT,
        mobile     TEXT NOT NULL,
        office     TEXT,
        address_street TEXT,
        address_city   TEXT,
        address_region TEXT,
        address_zip_country TEXT,
        details_json JSONB,
        tenant_id INTEGER REFERENCES tenants(id),
        owner_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Backwards-compatible: ensure new columns exist even if table was created earlier
    await client.query(`
      ALTER TABLE cards
      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
    `);

    await client.query(`
      ALTER TABLE cards
      ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS scans (
        id SERIAL PRIMARY KEY,
        card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
        source TEXT,
        scan_meta JSONB,
        tenant_id INTEGER REFERENCES tenants(id),
        scanner_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE scans
      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
    `);

    await client.query(`
      ALTER TABLE scans
      ADD COLUMN IF NOT EXISTS scanner_user_id INTEGER REFERENCES users(id);
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database tables:', err);
    throw err;
  } finally {
    client.release();
  }
}
