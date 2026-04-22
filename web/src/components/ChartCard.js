"use client";

import dynamic from "next/dynamic";

// Dynamically import charts with no SSR to avoid hydration issues
const ResponsiveContainer = dynamic(() => import("recharts").then(mod => mod.ResponsiveContainer), { ssr: false });

export default function ChartCard({ title, description, children, height = 300 }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {description && <p className="chart-description">{description}</p>}
      </div>
      <div className="chart-content" style={{ height: `${height}px`, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
