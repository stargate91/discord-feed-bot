export async function notifyBotOfChange() {
  const botUrl = process.env.BOT_INTERNAL_URL || "http://localhost:8080";
  
  try {
    console.log(`[BotSync] Notifying bot at ${botUrl}/monitors/sync...`);
    const res = await fetch(`${botUrl}/monitors/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: Date.now() })
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`[BotSync] Bot notification failed (${res.status}):`, text);
      return false;
    }
    
    console.log("[BotSync] Bot successfully notified and synchronized.");
    return true;
  } catch (err) {
    console.error("[BotSync] Error connecting to bot:", err.message);
    return false;
  }
}
