"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import MonitorCard from '@/components/MonitorCard';
import EditMonitorModal from '@/components/EditMonitorModal';
import CreateMonitorModal from '@/components/CreateMonitorModal';
import { Plus, Play, Pause, Trash2 } from 'lucide-react';

const platformNames = {
  all: "All Feeds",
  youtube: "YouTube",
  rss: "RSS",
  epic_games: "Epic Games",
  steam_free: "Steam Free",
  gog_free: "GOG",
  stream: "Twitch",
  steam_news: "Steam News",
  movie: "TMDB Movies",
  tv_series: "TMDB Series",
  crypto: "Crypto",
  github: "GitHub"
};

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const fetchMonitors = async () => {
    setLoading(true);
    try {
      const url = guildId ? `/api/monitors?guild=${guildId}` : '/api/monitors';
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMonitors(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMonitors();
    if (guildId) fetchGuildInfo();
  }, [guildId]);

  const fetchGuildInfo = async () => {
    try {
      const res = await fetch('/api/guilds');
      if (res.ok) {
        const guilds = await res.json();
        const currentGuild = guilds.find(g => g.id === guildId);
        setIsPremium(!!currentGuild?.isPremium || !!currentGuild?.isMaster);
      }
    } catch (err) {
      console.error("Failed to fetch guild info:", err);
    }
  };

  // Handle auto-open for Create Modal via Quick Actions
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsCreateModalOpen(true);
      
      // Clean up URL parameter after opening
      const newUrl = window.location.pathname + (guildId ? `?guild=${guildId}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, guildId]);

  const handleToggle = async (id, enabled) => {
    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        setMonitors(monitors.map(m => m.id === id ? { ...m, enabled } : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMonitors(monitors.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id, updateData) => {
    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (res.ok) {
        setMonitors(monitors.map(m => m.id === id ? { ...m, ...updateData } : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (monitor) => {
    setEditingMonitor(monitor);
    setIsModalOpen(true);
  };

  const handleBulkAction = async (action) => {
    if (action === 'delete' && !bulkDeleteConfirm) {
      setBulkDeleteConfirm(true);
      setTimeout(() => setBulkDeleteConfirm(false), 5000);
      return;
    }

    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/monitors/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, guildId })
      });
      
      if (res.ok) {
        if (action === 'delete') {
          setMonitors([]);
        } else {
          const isEnabled = action === 'resume';
          setMonitors(monitors.map(m => ({ ...m, enabled: isEnabled })));
        }
        setBulkDeleteConfirm(false);
      }
    } catch (err) {
      console.error(err);
    }
    setBulkActionLoading(false);
  };

  const filteredMonitors = monitors.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || m.type === filter;
    return matchesSearch && matchesFilter;
  });

  const platforms = ['all', ...new Set(monitors.map(m => m.type))];

  return (
    <div className="monitors-page-wrapper" style={{ maxWidth: '1450px', margin: '0 auto' }}>
      <header className="header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h2>Manage Monitors</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Configure and oversee your automated feed sources and notification targets.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
           <input 
             type="text" 
             placeholder="Search by name..." 
             className="search-input"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
           <button className="btn btn-add" onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={18} />
              Add New Monitor
           </button>
        </div>
      </header>

      {/* Platform Tabs */}
      <div className="filter-tabs">
        {platforms.map(p => (
          <button 
            key={p} 
            className={`filter-tab ${filter === p ? 'active' : ''}`}
            onClick={() => setFilter(p)}
          >
            {platformNames[p] || p.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      <div className="bulk-actions-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Bulk Actions ({filteredMonitors.length})
          </span>
          <div className="vertical-divider"></div>
          <button 
            className="bulk-btn" 
            onClick={() => handleBulkAction('resume')}
            disabled={bulkActionLoading || filteredMonitors.length === 0}
          >
            <Play size={14} /> Resume All
          </button>
          <button 
            className="bulk-btn" 
            onClick={() => handleBulkAction('pause')}
            disabled={bulkActionLoading || filteredMonitors.length === 0}
          >
            <Pause size={14} /> Pause All
          </button>
          <button 
            className={`bulk-btn ${bulkDeleteConfirm ? 'danger-active' : 'danger'}`} 
            onClick={() => handleBulkAction('delete')}
            disabled={bulkActionLoading || filteredMonitors.length === 0}
          >
            {bulkDeleteConfirm ? '⚠️ Confirm Delete ALL?' : <><Trash2 size={14} /> Delete All</>}
          </button>
        </div>
        
        {guildId && !isPremium && (
            <div className="premium-badge">PREMIUM FEATURE</div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>Loading monitors...</div>
      ) : (
        <div className="dashboard-grid">
          {filteredMonitors.map(m => (
            <MonitorCard 
              key={m.id} 
              monitor={m} 
              onToggle={handleToggle} 
              onDelete={handleDelete} 
              onEdit={openEditModal}
            />
          ))}
          
          <EditMonitorModal 
            monitor={editingMonitor} 
            guildId={guildId}
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleUpdate}
          />

          <CreateMonitorModal 
            guildId={guildId}
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={fetchMonitors}
          />
          
          {filteredMonitors.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              No monitors found matching your criteria.
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .btn-add {
          background: var(--accent-color);
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 30px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 20px rgba(123, 44, 191, 0.2);
          transition: all 0.2s;
        }
        .btn-add:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
          box-shadow: 0 10px 30px rgba(123, 44, 191, 0.3);
        }
        .search-input {
          background: var(--bg-panel);
          border: 1px solid var(--border-color);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 30px;
          outline: none;
          min-width: 300px;
          transition: border-color 0.2s;
        }
        .search-input:focus {
          border-color: var(--accent-color);
        }
        .filter-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }
        .filter-tab {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .filter-tab:hover {
          color: var(--text-primary);
        }
        .filter-tab.active {
          color: var(--accent-color);
          border-bottom-color: var(--accent-color);
        }
        .bulk-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
        }
        .bulk-btn {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 6px;
          transition: all 0.2s;
          opacity: 0.8;
        }
        .bulk-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
          opacity: 1;
        }
        .bulk-btn.danger {
          color: #ef4444;
        }
        .bulk-btn.danger-active {
          background: #ef4444 !important;
          color: white !important;
          opacity: 1;
        }
        .bulk-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .vertical-divider {
          width: 1px;
          height: 16px;
          background: var(--border-color);
        }
        .premium-badge {
          font-size: 0.65rem;
          font-weight: 800;
          background: linear-gradient(45deg, #ffd700, #ff8c00);
          color: #000;
          padding: 2px 8px;
          border-radius: 4px;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
}
