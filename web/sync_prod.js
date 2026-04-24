const { Client } = require('pg');

async function sync() {
  const dbUrl = process.env.DATABASE_URL;
  const token = process.env.BOT_TOKEN;

  if (!dbUrl || !token) {
    console.error("Missing DATABASE_URL or BOT_TOKEN in .env.local");
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl
  });
  
  await client.connect();
  console.log("Connected to DB:", dbUrl.split('@')[1]); // Log host safely
  
  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: {
      Authorization: `Bot ${token}`
    }
  });
  
  if (!res.ok) {
    console.error("Failed to fetch guilds from Discord:", res.status, await res.text());
    process.exit(1);
  }

  const guilds = await res.json();
  console.log(`Bot is in ${guilds.length} guilds`);
  
  let synced = 0;
  for (const guild of guilds) {
    console.log(`Checking guild: ${guild.name} (${guild.id})`);
    try {
      const dbRes = await client.query(
        "INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING",
        [guild.id]
      );
      if (dbRes.rowCount > 0) {
        console.log(` -> REGISTERED NEW GUILD!`);
        synced++;
      } else {
        console.log(` -> Already in DB.`);
      }
    } catch (err) {
      console.error(err);
    }
  }
  
  console.log(`\nSUCCESS: Synced ${synced} new guilds.`);
  await client.end();
}

sync();
