"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import MonitorCard from '@/components/MonitorCard';
import Link from 'next/link';
import EditMonitorModal from '@/components/EditMonitorModal';
import CreateMonitorModal from '@/components/CreateMonitorModal';
import BulkEditModal from '@/components/BulkEditModal';
import { Plus, Play, Pause, Trash2, Globe, AlertTriangle, Edit3, Activity } from 'lucide-react';

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
  const [tier, setTier] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

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
        setTier(currentGuild?.tier || 0);
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
      const idsToUpdate = selectedIds.length > 0 ? selectedIds : filteredMonitors.map(m => m.id);
      
      const res = await fetch('/api/monitors/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, guildId, monitorIds: selectedIds.length > 0 ? selectedIds : null })
      });
      
      if (res.ok) {
        if (action === 'delete') {
          setMonitors(monitors.filter(m => !idsToUpdate.includes(m.id)));
          setSelectedIds([]);
        } else {
          const isEnabled = action === 'resume';
          setMonitors(monitors.map(m => idsToUpdate.includes(m.id) ? { ...m, enabled: isEnabled } : m));
        }
        setBulkDeleteConfirm(false);
      }
    } catch (err) {
      console.error(err);
    }
    setBulkActionLoading(false);
  };

  const handleBulkUpdate = async (updateData) => {
    try {
      const res = await fetch('/api/monitors/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update', 
          guildId, 
          monitorIds: selectedIds,
          ...updateData
        })
      });

      if (res.ok) {
        setMonitors(monitors.map(m => {
          if (selectedIds.includes(m.id)) {
            return {
              ...m,
              target_channels: updateData.target_channels || m.target_channels,
              target_roles: updateData.target_roles || m.target_roles,
              embed_color: updateData.embed_color || m.embed_color
            };
          }
          return m;
        }));
        setSelectedIds([]);
        setIsBulkEditOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredMonitors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMonitors.map(m => m.id));
    }
  };

  const filteredMonitors = monitors.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || m.type === filter;
    return matchesSearch && matchesFilter;
  });

  const platforms = ['all', ...new Set(monitors.map(m => m.type))];

  return (
    <div className="monitors-page-wrapper" style={{ maxWidth: '100%', margin: '0 auto' }}>
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
      <div className="filter-tabs-container">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <Globe size={16} className="tab-icon-lucide" />
            All Feeds
          </button>
          {platforms.filter(p => p !== 'all').map(p => {
            let iconSrc = `/emojis/${p.replace('_news', '').replace('_free', '').replace('_', '-')}.png`;
            if (p === 'stream') iconSrc = '/emojis/twitch.png';
            if (p === 'movie' || p === 'tv_series') iconSrc = '/emojis/tmdb.png';
            
            return (
              <button 
                key={p} 
                className={`filter-tab ${filter === p ? 'active' : ''}`}
                onClick={() => setFilter(p)}
              >
                <img 
                  src={iconSrc} 
                  alt="" 
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    objectFit: 'contain',
                    filter: filter === p ? 'none' : 'grayscale(1) opacity(0.6)'
                  }} 
                />
                {platformNames[p] || p.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <div className="bulk-actions-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="select-all-wrapper">
            <input 
              type="checkbox" 
              checked={selectedIds.length > 0 && selectedIds.length === filteredMonitors.length}
              onChange={handleSelectAll}
              className="bulk-checkbox"
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {selectedIds.length > 0 ? `${selectedIds.length} Selected` : `Bulk Actions (${filteredMonitors.length})`}
            </span>
          </div>
          <div className="vertical-divider"></div>
          {selectedIds.length > 0 && (
            <button 
              className="bulk-btn" 
              onClick={() => setSelectedIds([])}
              style={{ color: 'var(--text-secondary)' }}
            >
              Deselect All
            </button>
          )}
          {(() => {
            const targets = selectedIds.length > 0 
              ? monitors.filter(m => selectedIds.includes(m.id)) 
              : filteredMonitors;
            const activeCount = targets.filter(m => m.enabled).length;
            const mostlyActive = activeCount > targets.length / 2;
            const toggleAction = mostlyActive ? 'pause' : 'resume';
            const suffix = selectedIds.length > 0 ? 'Selected' : 'All';

            return (
              <button 
                className="bulk-btn" 
                onClick={() => handleBulkAction(toggleAction)}
                disabled={bulkActionLoading || filteredMonitors.length === 0}
                style={{ minWidth: '130px' }}
              >
                {mostlyActive 
                  ? <><Pause size={14} /> Pause {suffix}</>
                  : <><Play size={14} /> Resume {suffix}</>
                }
              </button>
            );
          })()}
          
          <button 
            className="bulk-btn" 
            onClick={() => setIsBulkEditOpen(true)}
            disabled={bulkActionLoading || filteredMonitors.length === 0}
          >
            <Edit3 size={14} /> {selectedIds.length > 0 ? 'Edit Selected' : 'Edit All'}
          </button>

          <button 
            className={`bulk-btn ${bulkDeleteConfirm ? 'danger-active' : 'danger'}`} 
            onClick={() => handleBulkAction('delete')}
            disabled={bulkActionLoading || filteredMonitors.length === 0}
          >
            {bulkDeleteConfirm ? (
              <><AlertTriangle size={14} /> Confirm Delete {selectedIds.length > 0 ? 'Selected' : 'ALL'}?</>
            ) : (
              <><Trash2 size={14} /> {selectedIds.length > 0 ? 'Delete Selected' : 'Delete All'}</>
            )}
          </button>
        </div>
        
        {guildId && !isPremium && (
            <Link href={`/premium?guild=${guildId}`}>
              <div className="premium-badge" style={{ cursor: 'pointer' }}>PREMIUM FEATURE</div>
            </Link>
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
              isPremium={isPremium}
              tier={tier}
              onToggle={handleToggle} 
              onDelete={handleDelete} 
              onEdit={openEditModal}
              isSelected={selectedIds.includes(m.id)}
              onSelect={handleSelect}
              selectionMode={selectedIds.length > 0}
            />
          ))}
          
          <EditMonitorModal 
            monitor={editingMonitor} 
            guildId={guildId}
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleUpdate}
            tier={tier}
            isPremium={isPremium}
          />


          <CreateMonitorModal 
            guildId={guildId}
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={fetchMonitors}
            tier={tier}
            isPremium={isPremium}
          />

          <BulkEditModal 
            isOpen={isBulkEditOpen}
            onClose={() => setIsBulkEditOpen(false)}
            onSave={handleBulkUpdate}
            monitorCount={selectedIds.length > 0 ? selectedIds.length : monitors.length}
            guildId={guildId}
            tier={tier}
            isPremium={isPremium}
          />

          
          {filteredMonitors.length === 0 && (
            <div className="empty-state-container">
              <div className="empty-state-icon">
                <div className="radar-ring ring-1"></div>
                <div className="radar-ring ring-2"></div>
                <div className="radar-ring ring-3"></div>
                <Activity size={32} color="var(--accent-color)" />
              </div>

              {monitors.length === 0 ? (
                <>
                  <h3 className="empty-state-title">No Monitors Yet</h3>
                  <p className="empty-state-desc">
                    Set up your first feed monitor and start receiving automated updates directly in your Discord channels.
                  </p>
                  <button className="empty-state-btn" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={18} /> Create Your First Monitor
                  </button>
                </>
              ) : (
                <>
                  <h3 className="empty-state-title">No Results Found</h3>
                  <p className="empty-state-desc">
                    No monitors match your current search or filter. Try adjusting your criteria.
                  </p>
                  <button className="empty-state-btn-ghost" onClick={() => { setSearch(''); setFilter('all'); }}>
                    Clear Filters
                  </button>
                </>
              )}
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
        .filter-tabs-container {
          overflow-x: auto;
          padding: 10px 0;
          margin-top: -10px;
          margin-bottom: 24px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .filter-tabs-container::-webkit-scrollbar {
          display: none;
        }
        .filter-tabs {
          display: flex;
          gap: 10px;
          min-width: max-content;
          padding: 5px;
        }
        .filter-tab {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          padding: 10px 18px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.85rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        .filter-tab:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }
        .filter-tab.active {
          background: rgba(123, 44, 191, 0.1);
          border-color: var(--accent-color);
          color: white;
          box-shadow: 0 4px 15px rgba(123, 44, 191, 0.2);
        }
        .tab-icon-lucide {
          transition: all 0.2s;
          opacity: 0.6;
        }
        .filter-tab.active .tab-icon-lucide {
          color: var(--accent-color);
          opacity: 1;
          transform: scale(1.1);
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
        .select-all-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .bulk-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--accent-color);
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

        .empty-state-container {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 5rem 2rem;
        }

        .empty-state-icon {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .radar-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(123, 44, 191, 0.15);
          animation: radar-pulse 3s ease-out infinite;
        }

        .ring-1 { width: 60px; height: 60px; animation-delay: 0s; }
        .ring-2 { width: 90px; height: 90px; animation-delay: 0.5s; }
        .ring-3 { width: 120px; height: 120px; animation-delay: 1s; }

        @keyframes radar-pulse {
          0% { transform: scale(0.8); opacity: 0.6; border-color: rgba(123, 44, 191, 0.3); }
          50% { opacity: 0.2; }
          100% { transform: scale(1.3); opacity: 0; border-color: rgba(123, 44, 191, 0); }
        }

        .empty-state-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
          margin-bottom: 0.75rem;
        }

        .empty-state-desc {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.95rem;
          max-width: 400px;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .empty-state-btn {
          background: var(--accent-color);
          border: none;
          color: white;
          padding: 0.9rem 2rem;
          border-radius: 16px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s;
          box-shadow: 0 10px 30px rgba(123, 44, 191, 0.3);
        }

        .empty-state-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(123, 44, 191, 0.4);
          filter: brightness(1.1);
        }

        .empty-state-btn-ghost {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .empty-state-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
