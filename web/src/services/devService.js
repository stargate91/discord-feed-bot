/**
 * DevService for handling all API communications on the Developer Controls page.
 */
const devService = {
  // Premium Keys
  async getKeys() {
    const res = await fetch('/api/premium');
    return await res.json();
  },
  async generateKey(days, uses, tier) {
    const res = await fetch('/api/premium/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days, uses, tier })
    });
    if (!res.ok) throw new Error("Failed to generate key");
    return res;
  },
  async deleteKey(code) {
    const res = await fetch(`/api/premium?code=${code}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to delete key");
    return res;
  },
  async revokeKey(code) {
    const res = await fetch(`/api/premium?code=${code}`, { method: 'PATCH' });
    if (!res.ok) throw new Error("Failed to revoke key");
    return res;
  },

  // Bot Status
  async getStatuses() {
    const res = await fetch('/api/bot/status');
    return await res.json();
  },
  async addStatus(type, text) {
    const res = await fetch('/api/bot/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, text })
    });
    if (!res.ok) throw new Error("Failed to add status");
    return res;
  },
  async deleteStatus(id) {
    const res = await fetch(`/api/bot/status?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to delete status");
    return res;
  },

  // Bot Settings
  async getBotSettings() {
    const res = await fetch('/api/bot/settings');
    return await res.json();
  },
  async updateBotSetting(key, value) {
    const res = await fetch('/api/bot/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    if (!res.ok) throw new Error("Failed to update bot setting");
    return res;
  },

  // Announcements
  async getAnnouncements() {
    const res = await fetch('/api/announcements');
    if (!res.ok) return [];
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return [];
    return await res.json();
  },
  async addAnnouncement(announcement) {
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(announcement)
    });
    if (!res.ok) throw new Error("Failed to add announcement");
    return res;
  },
  async deleteAnnouncement(id) {
    const res = await fetch(`/api/announcements?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to delete announcement");
    return res;
  },

  // System Administration
  async resetHistory() {
    const res = await fetch('/api/admin/reset-history', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'history' })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Reset failed');
    }
    return res;
  },
  async factoryReset() {
    const res = await fetch('/api/admin/reset-history', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'factory' })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Reset failed');
    }
    return res;
  }
};

export default devService;
