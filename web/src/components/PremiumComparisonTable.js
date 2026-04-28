import { Check, X, Zap, Shield, BarChart3, Settings, Crown } from "lucide-react";
import styles from './Premium.module.css';

export default function PremiumComparisonTable() {
  const tiers = ["Free", "Starter", "Professional", "Ultimate"];

  const categories = [
    {
      name: "Monitoring Capacity",
      icon: <Zap size={18} />,
      features: [
        { name: "Max Feed Monitors", values: ["2", "10", "30", "100"] },
        { name: "Refresh Interval", values: ["20m", "10m", "5m", "2m"], highlight: [3] },
        { name: "Target Channels", values: ["1", "5", "10", "20"] },
        { name: "Ping Roles", values: ["1", "5", "10", "20"] },
      ]
    },
    {
      name: "Management Tools",
      icon: <Settings size={18} />,
      features: [
        { name: "Live Repost Tool", values: [false, false, true, true], highlight: [2, 3] },
        { name: "Max Purge Limit", values: ["10", "25", "50", "100"] },
        { name: "Manual Force Check", values: [true, true, true, true] },
        { name: "Bulk Basic Actions", values: [false, true, true, true] },
        { name: "Bulk Settings Edit", values: [false, false, true, true], highlight: [2, 3] },
        { name: "Bulk Import Wizard", values: [false, false, true, true], highlight: [2, 3] },
      ]
    },
    {
      name: "Branding & Logic",
      icon: <Shield size={18} />,
      features: [
        { name: "Remove Branding", values: [false, true, true, true], highlight: [1, 2, 3] },
        { name: "Custom Templates", values: [false, false, true, true] },
        { name: "Advanced Filters", values: [false, true, true, true] },
        { name: "Custom Embed Color", values: [false, true, true, true] },
        { name: "Native YouTube Player", values: [false, true, true, true] },
      ]
    },
    {
      name: "Analytics",
      icon: <BarChart3 size={18} />,
      features: [
        { name: "Analytics Dashboard Range", values: ["3d", "7d", "30d", "∞"] },
        { name: "System Logs", values: [true, true, true, true] },
        { name: "Export Data", values: [false, false, false, true] },
      ]
    }
  ];

  const renderValue = (val, isHighlighted) => {
    if (typeof val === "boolean") {
      return val ?
        <Check size={20} color={isHighlighted ? "#9d4edd" : "#4ade80"} style={{ filter: isHighlighted ? 'drop-shadow(0 0 8px #9d4edd)' : 'none' }} /> :
        <X size={20} color="rgba(255,255,255,0.1)" />;
    }
    return <span style={{
      color: isHighlighted ? "#9d4edd" : "white",
      fontWeight: isHighlighted ? "900" : "600",
      fontSize: isHighlighted ? "1.1rem" : "0.95rem",
      textShadow: isHighlighted ? "0 0 10px rgba(157, 78, 221, 0.4)" : "none"
    }}>{val}</span>;
  };

  return (
    <div className={styles.comparisonWrapper}>
      <div className={styles.tableHeaderRow}>
        <div className={styles.featureColTitle}>Features</div>
        {tiers.map((t, i) => (
          <div key={i} className={`${styles.tierColTitle} ${i === 3 ? styles.ultimateCol : ''}`}>
            <span className={styles.tierName}>{t}</span>
          </div>
        ))}
      </div>

      {categories.map((cat, catIdx) => (
        <div key={catIdx} className={styles.categoryGroup}>
          <div className={styles.categoryTitle}>
            {cat.icon}
            <span>{cat.name}</span>
          </div>
          {cat.features.map((feat, featIdx) => (
            <div key={featIdx} className={styles.featureRow}>
              <div className={styles.featureName}>{feat.name}</div>
              {feat.values.map((val, valIdx) => (
                <div key={valIdx} className={`${styles.valueCell} ${feat.highlight?.includes(valIdx) ? styles.isHighlighted : ''}`}>
                  {renderValue(val, feat.highlight?.includes(valIdx))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}


    </div>
  );
}
