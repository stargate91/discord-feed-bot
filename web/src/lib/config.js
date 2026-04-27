import fs from 'fs';
import path from 'path';

let cachedConfig = null;

export function getConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    const configPath = path.join(process.cwd(), '..', 'config.json');
    // If not found in parent, try current (depending on deployment)
    let finalPath = configPath;
    if (!fs.existsSync(finalPath)) {
      finalPath = path.join(process.cwd(), 'config.json');
    }

    const data = fs.readFileSync(finalPath, 'utf8');
    cachedConfig = JSON.parse(data);
    return cachedConfig;
  } catch (e) {
    console.error("[Config] Failed to load config.json:", e);
    return {};
  }
}

export function getTierConfig(tier) {
  const config = getConfig();
  const tierConfig = config.tier_config || {};
  return tierConfig[String(tier)] || tierConfig["0"] || {};
}

export function hasFeature(tier, featureName) {
  const tierInfo = getTierConfig(tier);
  const features = tierInfo.features || [];
  return features.includes(featureName);
}
