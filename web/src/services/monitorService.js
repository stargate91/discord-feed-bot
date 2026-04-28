/**
 * Service for handling Monitor-related API communications.
 */
const monitorService = {
  async getMonitors(guildId) {
    if (!guildId) return [];
    const res = await fetch(`/api/monitors?guild=${guildId}`);
    if (!res.ok) throw new Error('Failed to fetch monitors');
    return await res.json();
  },

  async toggleMonitor(id, enabled) {
    const res = await fetch(`/api/monitors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw new Error('Failed to toggle monitor');
    return await res.json();
  },

  async updateMonitor(id, data) {
    const res = await fetch(`/api/monitors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Update failed (${res.status})`);
    }
    return await res.json();
  },

  async deleteMonitor(id) {
    const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Delete failed (${res.status})`);
    }
    return await res.json();
  },

  async bulkUpdate(guildId, monitorIds, updateData) {
    const res = await fetch('/api/monitors/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', monitorIds, guildId, ...updateData })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Bulk update failed');
    }
    return await res.json();
  },

  async bulkToggle(guildId, monitorIds, action) {
    // action should be 'resume' or 'pause'
    const res = await fetch('/api/monitors/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, monitorIds, guildId })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Bulk ${action} failed`);
    }
    return await res.json();
  },

  async bulkDelete(guildId, monitorIds) {
    const res = await fetch('/api/monitors/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', monitorIds, guildId })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Bulk delete failed');
    }
    return await res.json();
  }
};

export default monitorService;
