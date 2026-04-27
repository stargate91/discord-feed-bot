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

/**
 * Normalizes the tier level considering premium expiration and master status.
 */
export function getEffectiveTier(tier, isMaster = false, premiumUntil = null) {
  if (isMaster) return 3; // Master is always Ultimate
  
  let effectiveTier = parseInt(tier) || 0;
  
  // Fallback: If tier is 0 but premium is active, treat as Tier 3 (Ultimate)
  if (effectiveTier === 0 && premiumUntil && new Date(premiumUntil) > new Date()) {
    effectiveTier = 3;
  }
  
  return effectiveTier;
}

export function getGuildTierLimits(tier, isMaster = false, premiumUntil = null) {
  const config = getConfig();
  const effectiveTier = getEffectiveTier(tier, isMaster, premiumUntil);
  const tierConfig = config.tier_config || {};
  return tierConfig[String(effectiveTier)] || tierConfig["0"] || {};
}

export function hasFeature(tier, isMaster = false, featureName, premiumUntil = null) {
  const tierInfo = getGuildTierLimits(tier, isMaster, premiumUntil);
  const features = tierInfo.features || [];
  return isMaster || features.includes(featureName) || featureName === "basic";
}
