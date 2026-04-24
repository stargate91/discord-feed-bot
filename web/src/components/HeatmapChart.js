"use client";

import { useMemo } from "react";

export default function HeatmapChart({ data }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Initialize grid with 0s
  const grid = useMemo(() => {
    const matrix = Array(7).fill(0).map(() => Array(24).fill(0));
    let max = 0;

    data.forEach(item => {
      matrix[item.day][item.hour] = item.count;
      if (item.count > max) max = item.count;
    });

    return { matrix, max };
  }, [data]);

  const getColor = (count) => {
    if (count === 0) return "rgba(255, 255, 255, 0.03)";
    const opacity = 0.1 + (count / grid.max) * 0.9;
    return `rgba(123, 44, 191, ${opacity})`;
  };

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <div className="hour-labels">
          <div className="empty-corner"></div>
          {hours.filter(h => h % 3 === 0).map(h => (
            <span key={h} className="hour-label" style={{ left: `${(h / 24) * 100}%` }}>
              {h}:00
            </span>
          ))}
        </div>
      </div>
      
      <div className="heatmap-grid-wrapper">
        {days.map((day, dIdx) => (
          <div key={day} className="heatmap-row">
            <span className="day-label">{day}</span>
            <div className="heatmap-cells">
              {hours.map(hour => {
                const count = grid.matrix[dIdx][hour];
                return (
                  <div 
                    key={hour} 
                    className="heatmap-cell"
                    style={{ background: getColor(count) }}
                    title={`${day}, ${hour}:00 - ${count} messages`}
                  >
                    {count > 0 && <div className="cell-glow" style={{ opacity: count / grid.max }}></div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="heatmap-legend">
        <span>Less</span>
        <div className="legend-cells">
          <div className="legend-cell" style={{ background: "rgba(255, 255, 255, 0.03)" }}></div>
          <div className="legend-cell" style={{ background: "rgba(123, 44, 191, 0.3)" }}></div>
          <div className="legend-cell" style={{ background: "rgba(123, 44, 191, 0.6)" }}></div>
          <div className="legend-cell" style={{ background: "rgba(123, 44, 191, 1)" }}></div>
        </div>
        <span>More</span>
      </div>

      <style jsx>{`
        .heatmap-container {
          width: 100%;
          padding: 1rem 0;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .heatmap-header {
          position: relative;
          height: 20px;
          margin-bottom: 5px;
        }

        .hour-labels {
          position: relative;
          display: flex;
          margin-left: 38px;
          height: 100%;
          margin-right: 10px;
        }

        .hour-label {
          position: absolute;
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.3);
          font-weight: 700;
          transform: translateX(-50%);
        }

        .heatmap-grid-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .heatmap-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .day-label {
          width: 30px;
          font-size: 0.6rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.2);
          text-transform: uppercase;
        }

        .heatmap-cells {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(24, 1fr);
          gap: 2px;
        }

        .heatmap-cell {
          aspect-ratio: 1;
          border-radius: 4px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.01);
        }

        .heatmap-cell:hover {
          transform: scale(1.4);
          z-index: 10;
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 20px rgba(123, 44, 191, 0.6);
        }

        .cell-glow {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #7b2cbf;
          filter: blur(8px);
          z-index: -1;
          pointer-events: none;
        }

        .heatmap-legend {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.3);
          font-weight: 700;
          text-transform: uppercase;
        }

        .legend-cells {
          display: flex;
          gap: 4px;
        }

        .legend-cell {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
