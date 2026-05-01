"use client";

export default function UsageIndicator({ label, current, max, unit = "" }) {
  const percentage = Math.min(Math.round((current / max) * 100), 100);
  
  // SVG Circle parameters
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  let color = "var(--accent-color)";
  if (percentage >= 100) color = "#ef4444";
  else if (percentage >= 80) color = "#f59e0b";

  return (
    <div className="ui-gauge-container">
      <div className="ui-gauge-wrapper">
        <svg viewBox="0 0 100 100" className="ui-gauge-svg">
          {/* Background Track */}
          <circle 
            className="ui-gauge-track"
            cx="50" cy="50" r={radius} 
          />
          {/* Progress Indicator */}
          <circle 
            className="ui-gauge-progress"
            cx="50" cy="50" r={radius}
            style={{ 
              strokeDasharray: circumference, 
              strokeDashoffset: offset,
              stroke: color,
              filter: `drop-shadow(0 0 8px ${color}66)`
            }}
          />
        </svg>
        <div className="ui-gauge-content">
          <span className="ui-gauge-value">{percentage}%</span>
          <span className="ui-gauge-label">{label}</span>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
        <div className="ui-stat-pill">
          <span className="ui-stat-pill-label">Usage</span>
          <span className="ui-stat-pill-value" style={{ color }}>{current} / {max}</span>
        </div>
        <div className="ui-stat-pill">
          <span className="ui-stat-pill-label">Remaining</span>
          <span className="ui-stat-pill-value">{Math.max(0, max - current)}</span>
        </div>
      </div>
    </div>
  );
}
