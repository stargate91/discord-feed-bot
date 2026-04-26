import { Check, X, Zap, Shield, BarChart3, Settings, Crown } from "lucide-react";

export default function PremiumComparisonTable() {
  const tiers = ["Free", "Starter", "Professional", "Ultimate"];
  
  const categories = [
    {
      name: "Monitoring Capacity",
      icon: <Zap size={18} />,
      features: [
        { name: "Max Feed Monitors", values: ["3", "10", "30", "100"] },
        { name: "Refresh Interval", values: ["30m", "10m", "5m", "2m"], highlight: [3] },
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
        { name: "Heatmap Range", values: ["3d", "7d", "30d", "∞"] },
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
    <div className="comparison-wrapper">
      <div className="table-header-row">
        <div className="feature-col-title">Features</div>
        {tiers.map((t, i) => (
          <div key={i} className={`tier-col-title ${i === 3 ? 'ultimate-col' : ''}`}>
            <span className="tier-name">{t}</span>
          </div>
        ))}
      </div>

      {categories.map((cat, catIdx) => (
        <div key={catIdx} className="category-group">
          <div className="category-title">
            {cat.icon}
            <span>{cat.name}</span>
          </div>
          {cat.features.map((feat, featIdx) => (
            <div key={featIdx} className="feature-row">
              <div className="feature-name">{feat.name}</div>
              {feat.values.map((val, valIdx) => (
                <div key={valIdx} className={`value-cell ${feat.highlight?.includes(valIdx) ? 'is-highlighted' : ''}`}>
                  {renderValue(val, feat.highlight?.includes(valIdx))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      <style jsx>{`
        .ultimate-col .tier-name {
          color: #9d4edd;
          text-shadow: 0 0 15px rgba(157, 78, 221, 0.6);
          font-size: 1.2rem;
        }

        .ultimate-col {
          background: rgba(123, 44, 191, 0.05);
          position: relative;
        }

        .ultimate-col::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 2px;
          background: var(--accent-color);
          box-shadow: 0 0 10px var(--accent-color);
        }

        .comparison-wrapper {
          width: 100%;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          overflow: hidden;
          margin-top: 4rem;
        }

        .table-header-row {
          display: grid;
          grid-template-columns: 2fr repeat(4, 1fr);
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .feature-col-title {
          padding: 2rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.3);
          text-transform: uppercase;
          letter-spacing: 2px;
          font-size: 0.75rem;
        }

        .tier-col-title {
          padding: 2rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.1rem;
          color: white;
          text-align: center;
        }

        .category-group {
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .category-title {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 1.5rem 2rem;
          background: rgba(123, 44, 191, 0.05);
          color: #9d4edd;
          font-weight: 800;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .feature-row {
          display: grid;
          grid-template-columns: 2fr repeat(4, 1fr);
          transition: background 0.2s;
        }

        .feature-row:hover {
          background: rgba(255, 255, 255, 0.01);
        }

        .feature-row:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }

        .feature-name {
          padding: 1.2rem 2rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
          font-size: 0.95rem;
        }

        .value-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.2rem 1rem;
          border-left: 1px solid rgba(255, 255, 255, 0.02);
        }

        .is-highlighted {
          background: rgba(123, 44, 191, 0.02);
        }

        @media (max-width: 900px) {
          .comparison-wrapper { font-size: 0.8rem; }
          .feature-col-title, .tier-col-title { padding: 1rem 0.5rem; }
          .feature-name { padding: 1rem; }
        }
      `}</style>
    </div>
  );
}
