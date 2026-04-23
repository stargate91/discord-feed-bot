"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  Calendar,
  ArrowLeft,
  ChevronDown
} from 'lucide-react';
import ChartCard from "@/components/ChartCard";
import StatCard from "@/components/StatCard";

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const guildId = searchParams.get("guild");
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("14"); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const rangeLabels = {
    "7": "Last 7 Days",
    "14": "Last 14 Days",
    "30": "Last 1 Month"
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

  if (loading && !data) return <div className="loading-container"><div className="loader"></div></div>;
  if (error) return <div className="error-container"><h3>Error: {error}</h3></div>;
  if (!data) return null;

  const chartData = data.history.map(item => ({
    date: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    posts: parseInt(item.count)
  }));

  const COLORS = ['#7b2cbf', '#9d4edd', '#c19ee0', '#3c096c', '#5a189a'];

  return (
    <div className="analytics-container" onClick={() => setIsDropdownOpen(false)}>
      <style jsx global>{`
        .analytics-container {
          max-width: 1450px;
          margin: 0 auto;
        }
      `}</style>
      <header className="header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h2>Feed Analytics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Detailed insights and performance metrics for your active monitor streams.
          </p>
        </div>
        
        <div className="range-selector-container">
          <button 
            className={`custom-dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
          >
            <Calendar size={16} />
            <span>{rangeLabels[range]}</span>
            <ChevronDown size={14} className={`chevron ${isDropdownOpen ? 'rotated' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="custom-dropdown-menu">
              {Object.entries(rangeLabels).map(([value, label]) => (
                <div 
                  key={value}
                  className={`dropdown-item ${range === value ? 'selected' : ''}`}
                  onClick={() => {
                    setRange(value);
                    setIsDropdownOpen(false);
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className="stats-grid">
        <StatCard 
          title="Total Messages" 
          value={data.totalPosts.toLocaleString()} 
          description="Lifetime posts sent"
          compact={true}
        />
        <StatCard 
          title="Active Feeds" 
          value={data.activeMonitors} 
          description="Monitors currently running"
          compact={true}
        />
        <StatCard 
          title="Platforms" 
          value={data.platformCount} 
          description="Different sources active"
          compact={true}
        />
      </section>

      <div className="charts-grid">
        {/* Main Message Trend Chart */}
        <div className="chart-span-2">
          <ChartCard title="Daily Message Activity" description="Number of posts sent across all monitors per day.">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: 'var(--accent-color)' }}
              />
              <Line 
                type="monotone" 
                dataKey="posts" 
                stroke="var(--accent-color)" 
                strokeWidth={3} 
                dot={{ r: 4, fill: 'var(--accent-color)', strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ChartCard>
        </div>

        {/* Platform Breakdown Pie Chart */}
        <ChartCard title="Platform Distribution" description="Which sources are generating the most traffic.">
          <PieChart>
            <Pie
              data={data.platforms}
              dataKey="count"
              nameKey="displayName"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
            >
              {data.platforms.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
               contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
               itemStyle={{ color: '#fff' }}
               formatter={(value, name) => [value.toLocaleString(), name]}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ChartCard>
      </div>
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
