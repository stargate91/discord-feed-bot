const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkDb() {
  console.log("Connecting to:", process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const res = await pool.query('SELECT guild_id FROM guild_settings');
    console.log("Successfully retrieved data!");
    console.log("Count of guilds in DB:", res.rows.length);
    console.log("Guild IDs in DB:", res.rows.map(row => row.guild_id));
  } catch (err) {
    console.error("Database connection error:", err.message);
  } finally {
    await pool.end();
  }
}

checkDb();
