import { Pool } from 'pg';

let pool;

if (!pool) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  // Run migrations in the background to ensure schema is up to date
  const ensureSchema = async () => {
    try {
      const client = await pool.connect();
      try {
        console.log("[DB] Running web-side migrations...");
        await client.query("ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true");
        await client.query("ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 0");
        await client.query("ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP");
        // Add any other missing columns that the web UI needs
        await client.query("ALTER TABLE monitors ADD COLUMN IF NOT EXISTS last_post_at TIMESTAMP WITH TIME ZONE");
        console.log("[DB] Web-side migrations completed.");
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("[DB] Migration error:", err.message);
    }
  };

  ensureSchema();
}

export default pool;

export const query = (text, params) => pool.query(text, params);
