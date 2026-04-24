"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Cell, PieChart, Pie, Legend, BarChart, Bar, ResponsiveContainer
} from 'recharts';
import { 
  Calendar,
  ChevronDown,
  TrendingUp,
  Activity,
  Layers,
  Zap,
  ArrowUpRight,
  Monitor,
  Lock
} from 'lucide-react';
import LiveTicker from "@/components/LiveTicker";
import HeatmapChart from "@/components/HeatmapChart";
import { useSession } from "next-auth/react";

// Custom Chart Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">
          <Zap size={14} fill="var(--accent-color)" stroke="var(--accent-color)" />
          {payload[0].value.toLocaleString()} Posts
        </p>
      </div>
    );
  }
  return null;
};

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const guildId = searchParams.get("guild");
  const { data: session } = useSession();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("7"); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const rangeLabels = {
    "3": "Last 3 Days",
    "7": "Last 7 Days",
    "30": "Last 30 Days",
    "999": "∞ Lifetime"
  };

  const getTierLimit = (tier) => {
    if (tier >= 3) return 999;
    if (tier >= 2) return 30;
    if (tier >= 1) return 7;
    return 3;
  };

  const isRangeLocked = (val) => {
    if (!data) return true;
    const limit = getTierLimit(data.tier || 0);
    return parseInt(val) > limit;
  };

  useEffect(() => {
    if (!guildId) {
      router.push("/select-server");
      return;
    }

    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats?guild=${guildId}&days=${range}`);
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const json = await res.json();
        
        if (json && json.platforms) {
          json.platforms = json.platforms.map(p => ({
            ...p,
            count: parseInt(p.count),
            displayName: p.platform.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
          }));
        }
        
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [guildId, range, router]);

  const chartData = useMemo(() => {
    if (!data || !data.history) return [];
    return data.history.map(item => ({
      date: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      posts: parseInt(item.count)
    }));
  }, [data]);

  if (loading && !data) return <div className="loading-container"><div className="loader"></div></div>;
  if (error) return <div className="error-container"><h3>Error: {error}</h3></div>;
  if (!data) return null;

  const PIE_COLORS = ['#7b2cbf', '#9d4edd', '#3c096c', '#5a189a', '#c19ee0'];

  return (
    <div className="analytics-wrapper" onClick={() => setIsDropdownOpen(false)}>
      <header className="analytics-header">
        <h2 className="page-title">Analytics Dashboard</h2>
        <div className="ticker-expand">
          <LiveTicker />
        </div>
        <div className="range-dropdown-container">
          <button 
            className="dropdown-trigger"
            onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
          >
            <Calendar size={18} />
            <span>{rangeLabels[range]}</span>
            <ChevronDown size={16} className={isDropdownOpen ? 'rotate' : ''} />
          </button>
          
          {isDropdownOpen && (
            <div className="range-dropdown">
              {Object.entries(rangeLabels).map(([val, label]) => {
                const locked = isRangeLocked(val);
                return (
                  <button 
                    key={val} 
                    className={`${range === val ? 'active' : ''} ${locked ? 'locked' : ''}`} 
                    onClick={() => { 
                      if (locked) {
                        router.push(`/premium?guild=${guildId}`);
                        return;
                      }
                      setRange(val); 
                      setIsDropdownOpen(false); 
                    }}
                  >
                    <span>{label}</span>
                    {locked && <Lock size={12} className="lock-icon" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <div className="stats-row">
        <div className="stat-card-premium">
           <div className="stat-icon-bg" style={{ '--color': '#7b2cbf' }}>
              <TrendingUp size={24} color="#7b2cbf" />
           </div>
           <div className="stat-info">
              <span className="stat-label">Total Messages</span>
              <div className="stat-value">{data.totalPosts.toLocaleString()}</div>
              <span className="stat-change"><ArrowUpRight size={14} /> Overall Activity</span>
           </div>
        </div>

        <div className="stat-card-premium">
           <div className="stat-icon-bg" style={{ '--color': '#9d4edd' }}>
              <Monitor size={24} color="#9d4edd" />
           </div>
           <div className="stat-info">
              <span className="stat-label">Active Monitors</span>
              <div className="stat-value">{data.activeMonitors}</div>
              <span className="stat-change">Currently Monitoring</span>
           </div>
        </div>

        <div className="stat-card-premium">
           <div className="stat-icon-bg" style={{ '--color': '#5a189a' }}>
              <Layers size={24} color="#5a189a" />
           </div>
           <div className="stat-info">
              <span className="stat-label">Platform Count</span>
              <div className="stat-value">{data.platformCount}</div>
              <span className="stat-change">Across all sources</span>
           </div>
        </div>

        <div className="stat-card-premium">
           <div className="stat-icon-bg" style={{ '--color': '#10b981' }}>
              <Activity size={24} color="#10b981" />
           </div>
           <div className="stat-info">
              <span className="stat-label">System Health</span>
              <div className="stat-value">Optimal</div>
              <span className="stat-change" style={{ color: '#10b981' }}>All systems operational</span>
           </div>
        </div>
      </div>

      <div className="main-charts-grid">
        <div className="chart-large-card">
           <div className="chart-header-inner">
              <h3>Message Activity Trend</h3>
              <p>Daily breakdown of posts sent to your Discord server.</p>
           </div>
           <div className="chart-content-inner" style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7b2cbf" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7b2cbf" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="posts" 
                    stroke="#7b2cbf" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorPosts)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="chart-small-card">
           <div className="chart-header-inner">
              <h3>Platform Distribution</h3>
              <p>Message volume per source.</p>
           </div>
           <div className="chart-content-inner" style={{ flex: 1 }}>
              <div className="pie-container-vertical">
                 <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={data.platforms}
                        dataKey="count"
                        nameKey="displayName"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={8}
                        stroke="none"
                      >
                        {data.platforms.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="pie-legend-grid">
                    {data.platforms.map((p, i) => (
                       <div key={p.platform} className="legend-item">
                          <div className="dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                          <span className="name">{p.displayName}</span>
                          <span className="val">{p.count}</span>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        <div className="chart-large-card">
           <div className="chart-header-inner">
              <h3>Global Heatmap</h3>
              <p>Peak activity hours and days for your feed monitors.</p>
           </div>
           <div className="chart-content-inner" style={{ flex: 1 }}>
              <HeatmapChart data={data.heatmap || []} />
           </div>
        </div>

        <div className="chart-small-card">
           <div className="chart-header-inner">
              <h3>Source Efficiency</h3>
              <p>Performance ranking.</p>
           </div>
           <div className="chart-content-inner" style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.platforms}>
                   <XAxis dataKey="displayName" hide />
                   <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                   <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {data.platforms.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                   </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <style jsx>{`
        .analytics-wrapper {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-bottom: 3rem;
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .analytics-header {
          display: flex;
          align-items: center;
          gap: 2rem;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .page-title {
          font-size: 2.2rem;
          font-weight: 900;
          margin: 0;
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          white-space: nowrap;
        }

        .ticker-expand {
          flex: 1;
          min-width: 0;
        }

        .range-dropdown-container {
          position: relative;
          flex-shrink: 0;
        }

        .dropdown-trigger {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: white;
          padding: 10px 18px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          min-width: 180px;
          justify-content: space-between;
        }

        .dropdown-trigger:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .range-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #1e1e26;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          overflow: hidden;
          z-index: 1000;
          min-width: 200px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.5);
          animation: slideUp 0.2s ease-out;
          display: flex;
          flex-direction: column;
        }

        @keyframes slideUp { 
          from { opacity: 0; transform: translateY(10px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        .range-dropdown button {
          padding: 12px 18px;
          font-size: 0.9rem;
          cursor: pointer;
          color: rgba(255,255,255,0.6);
          background: transparent;
          border: none;
          text-align: left;
          transition: all 0.2s;
          width: 100%;
        }

        .range-dropdown button:hover { 
          background: rgba(123, 44, 191, 0.1); 
          color: white; 
        }

        .range-dropdown button.active { 
          background: rgba(123, 44, 191, 0.2); 
          color: #9d4edd; 
          font-weight: 700; 
        }

        .range-dropdown button.locked {
          opacity: 0.5;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .lock-icon {
          color: #ffb703;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
        }

        .stat-card-premium {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          transition: all 0.3s ease;
        }
        .stat-card-premium:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .stat-icon-bg {
          width: 54px; height: 54px;
          background: color-mix(in srgb, var(--color), transparent 90%);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
        }
        
        .stat-info { display: flex; flex-direction: column; }
        .stat-label { font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 1.8rem; font-weight: 800; color: white; margin: 2px 0; }
        .stat-change { font-size: 0.75rem; color: rgba(255,255,255,0.3); display: flex; align-items: center; gap: 4px; }

        .main-charts-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 1.5rem;
        }
        @media (max-width: 1100px) { .main-charts-grid { grid-template-columns: 1fr; } }

        .chart-large-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .chart-header-inner h3 { font-size: 1.3rem; font-weight: 700; margin: 0; }
        .chart-header-inner p { color: rgba(255,255,255,0.4); font-size: 0.9rem; margin-top: 4px; }

        .chart-small-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .chart-small-card h3 { font-size: 1rem; font-weight: 700; color: rgba(255,255,255,0.6); margin: 0; }
        .chart-content-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .pie-container-vertical { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
        .pie-legend-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 10px; 
          width: 100%; 
          margin-top: 0.5rem;
          padding: 0 10px;
          justify-items: center;
        }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; }
        .legend-item .dot { width: 8px; height: 8px; border-radius: 50%; }
        .legend-item .name { color: rgba(255,255,255,0.5); }
        .legend-item .val { font-weight: 700; margin-left: 6px; }

        .custom-tooltip p { margin: 0; font-size: 0.85rem; color: rgba(255,255,255,0.7); }

        .logs-section {
          margin-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .section-header-simple {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.5);
        }

        .section-header-simple h3 {
          font-size: 1.1rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0;
        }

        .custom-tooltip {
          background: rgba(26, 26, 32, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 10px 14px;
          border-radius: 12px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }
        .tooltip-label { color: rgba(255,255,255,0.5); font-size: 0.75rem; margin-bottom: 4px; }
        .tooltip-value { display: flex; align-items: center; gap: 6px; font-weight: 800; color: white; font-size: 1rem; }
      `}</style>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="loading-container"><div className="loader"></div></div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
