import { useState, useEffect } from 'react';

let globalConfig = null;
let listeners = [];

export function useConfig() {
  const [config, setConfig] = useState(globalConfig);
  const [loading, setLoading] = useState(!globalConfig);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (globalConfig) {
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error("Failed to fetch config");
        const data = await res.json();
        globalConfig = data;
        setConfig(data);
        listeners.forEach(l => l(data));
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    const listener = (newConfig) => setConfig(newConfig);
    listeners.push(listener);

    fetchConfig();

    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  const getTierConfig = (tier, isPremium = false) => {
    if (!config) return {};
    const effectiveTier = (isPremium && tier === 0) ? 3 : tier;
    return config.tier_config?.[String(effectiveTier)] || config.tier_config?.["0"] || {};
  };

  const hasFeature = (tier, isPremium, featureName) => {
    const tierConfig = getTierConfig(tier, isPremium);
    const features = tierConfig.features || [];
    return features.includes(featureName) || featureName === "basic";
  };

  return { config, loading, error, getTierConfig, hasFeature };
}
