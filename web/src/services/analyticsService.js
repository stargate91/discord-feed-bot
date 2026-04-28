/**
 * AnalyticsService for handling analytics data fetching and processing.
 */
const analyticsService = {
  /**
   * Fetch analytics data for a specific guild and date range.
   */
  async getStats(guildId, range) {
    const res = await fetch(`/api/stats?guild=${guildId}&days=${range}`);
    
    if (res.status === 403) {
      throw new Error("Access Denied: You do not have permission to view this server's analytics.");
    }
    
    if (!res.ok) {
      throw new Error("Failed to fetch analytics data.");
    }

    const json = await res.json();
    
    // Process platform data for display
    if (json && json.platforms) {
      json.platforms = json.platforms.map(p => ({
        ...p,
        count: parseInt(p.count),
        displayName: p.platform
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }));
    }
    
    return json;
  },

  /**
   * Helper to determine the tier limit for analytics range.
   */
  getTierLimit(tier) {
    if (tier >= 3) return 999;
    if (tier >= 2) return 30;
    if (tier >= 1) return 7;
    return 3;
  }
};

export default analyticsService;
