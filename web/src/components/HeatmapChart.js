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
    <div className="ui-heatmap-container">
      <div className="ui-heatmap-header">
        <div className="ui-heatmap-hour-labels">
          {hours.filter(h => h % 3 === 0).map(h => (
            <span key={h} className="ui-heatmap-hour-label" style={{ left: `${(h / 24) * 100}%` }}>
              {h}:00
            </span>
          ))}
        </div>
      </div>
      
      <div className="ui-heatmap-grid">
        {days.map((day, dIdx) => (
          <div key={day} className="ui-heatmap-row">
            <span className="ui-heatmap-day">{day}</span>
            <div className="ui-heatmap-cells">
              {hours.map(hour => {
                const count = grid.matrix[dIdx][hour];
                return (
                  <div 
                    key={hour} 
                    className="ui-heatmap-cell"
                    style={{ background: getColor(count) }}
                    title={`${day}, ${hour}:00 - ${count} messages`}
                  >
                    {count > 0 && <div className="ui-heatmap-cell-glow" style={{ opacity: count / grid.max }}></div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="ui-heatmap-legend">
        <span>Less</span>
        <div className="ui-heatmap-legend-cells">
          <div className="ui-heatmap-legend-cell" style={{ background: "rgba(255, 255, 255, 0.03)" }}></div>
          <div className="ui-heatmap-legend-cell" style={{ background: "rgba(123, 44, 191, 0.3)" }}></div>
          <div className="ui-heatmap-legend-cell" style={{ background: "rgba(123, 44, 191, 0.6)" }}></div>
          <div className="ui-heatmap-legend-cell" style={{ background: "rgba(123, 44, 191, 1)" }}></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
