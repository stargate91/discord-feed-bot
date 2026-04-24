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
    <div className="gauge-container">
      <div className="gauge-wrapper">
        <svg viewBox="0 0 100 100" className="gauge-svg">
          {/* Background Track */}
          <circle 
            className="gauge-track"
            cx="50" cy="50" r={radius} 
          />
          {/* Progress Indicator */}
          <circle 
            className="gauge-progress"
            cx="50" cy="50" r={radius}
            style={{ 
              strokeDasharray: circumference, 
              strokeDashoffset: offset,
              stroke: color,
              filter: `drop-shadow(0 0 8px ${color}66)`
            }}
          />
        </svg>
        <div className="gauge-content">
          <span className="gauge-value">{percentage}%</span>
          <span className="gauge-label">{label}</span>
        </div>
      </div>
      
      <div className="gauge-stats">
        <div className="stat-pill">
          <span className="pill-label">Usage</span>
          <span className="pill-value" style={{ color }}>{current} / {max}</span>
        </div>
        <div className="stat-pill">
          <span className="pill-label">Remaining</span>
          <span className="pill-value">{Math.max(0, max - current)}</span>
        </div>
      </div>

      <style jsx>{`
        .gauge-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 1rem 0;
        }

        .gauge-wrapper {
          position: relative;
          width: 180px;
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gauge-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        circle {
          fill: none;
          stroke-width: 7;
          stroke-linecap: round;
        }

        .gauge-track {
          stroke: rgba(255, 255, 255, 0.03);
          stroke-width: 7;
        }

        .gauge-progress {
          transition: stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s;
        }

        .gauge-content {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          width: 120px;
          text-align: center;
        }

        .gauge-value {
          font-size: 2.2rem;
          font-weight: 900;
          color: white;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        .gauge-label {
          font-size: 0.6rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.4);
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .gauge-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          width: 100%;
        }

        .stat-pill {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0.6rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .pill-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.3);
          text-transform: uppercase;
        }

        .pill-value {
          font-size: 0.9rem;
          font-weight: 700;
          color: white;
        }
      `}</style>
    </div>
  );
}
