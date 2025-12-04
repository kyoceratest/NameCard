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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS scans (
        id SERIAL PRIMARY KEY,
        card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
        source TEXT,
        scan_meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
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
