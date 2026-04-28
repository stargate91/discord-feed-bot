import fs from 'fs';
import path from 'path';

let cachedConfig = null;

export function getConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    const configPath = path.join(process.cwd(), '..', 'config.json');
    let finalPath = configPath;
    if (!fs.existsSync(finalPath)) {
      finalPath = path.join(process.cwd(), 'config.json');
    }

    const data = fs.readFileSync(finalPath, 'utf8');
    // Sanitize large IDs if necessary (JSON.parse can lose precision on 64-bit ints)
    const sanitizedData = data.replace(/:\s*([0-9]{15,})/g, ': "$1"');
    cachedConfig = JSON.parse(sanitizedData);
    return cachedConfig;
  } catch (e) {
    console.error("[Config] Failed to load config.json:", e);
    return {};
  }
}

export function isMasterGuild(guildId) {
  const gIdStr = String(guildId);
  if (gIdStr === "1083433370815582240") return true; // Hardcoded safety fallback
  
  const config = getConfig();
  const masterGuilds = config.master_guilds || {};
  return masterGuilds.hasOwnProperty(gIdStr);
}

/**
 * Normalizes the tier level considering premium expiration and master status.
 */
export function getEffectiveTier(tier, guildId = null, premiumUntil = null) {
  if (guildId && isMasterGuild(guildId)) return 3; // Master is always Ultimate
  
  let effectiveTier = parseInt(tier) || 0;
  
  // Fallback: If tier is 0 but premium is active, treat as Tier 3 (Ultimate)
  if (effectiveTier === 0 && premiumUntil && new Date(premiumUntil) > new Date()) {
    effectiveTier = 3;
  }
  
  return effectiveTier;
}

export function getGuildTierLimits(tier, guildId = null, premiumUntil = null) {
  const config = getConfig();
  const effectiveTier = getEffectiveTier(tier, guildId, premiumUntil);
  const tierConfig = config.tier_config || {};
  return tierConfig[String(effectiveTier)] || tierConfig["0"] || {};
}

export function hasFeature(tier, guildId = null, featureName, premiumUntil = null) {
  const tierInfo = getGuildTierLimits(tier, guildId, premiumUntil);
  const features = tierInfo.features || [];
  
  // Master Guilds bypass all feature locks
  if (guildId && isMasterGuild(guildId)) return true;
  
  return features.includes(featureName) || featureName === "basic";
}

