"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MonitorCard from '@/components/MonitorCard';
import EditMonitorModal from '@/components/EditMonitorModal';
import CreateMonitorModal from '@/components/CreateMonitorModal';
import BulkEditModal from '@/components/BulkEditModal';
import BulkAddModal from '@/components/BulkAddModal';
import { Plus, Play, Pause, Trash2, Globe, AlertTriangle, Edit3, Activity, Zap, X, MousePointer2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const platformNames = {
  'youtube': 'YouTube',
  'twitch': 'Twitch',
  'kick': 'Kick',
  'rss': 'RSS Feed',
  'github': 'GitHub',
  'steam_news': 'Steam News',
  'epic_games': 'Epic Games',
  'steam_free': 'Steam Free',
  'gog_free': 'GOG Free',
  'movie': 'Movies',
  'tv_series': 'TV Series',
  'crypto': 'Crypto'
};

const platformIcons = {
  'all': <Globe size={14} />,
  'youtube': <img src="/emojis/youtube.png" alt="" style={{ width: '16px', height: '16px' }} />,
  'twitch': <img src="/emojis/twitch.png" alt="" style={{ width: '16px', height: '16px' }} />,
  'kick': <img src="/emojis/kick.png" alt="" style={{ width: '16px', height: '16px' }} />,
  'rss': <img src="/emojis/rss.png" alt="" style={{ width: '16px', height: '16px' }} />,
  'github': <img src="/emojis/github.png" alt="" style={{ width: '16px', height: '16px' }} />,
  'steam_news': <img src="/emojis/steam.png" alt="" style={{ width: '16px', height: '16px' }} />,
  'epic_games': <img src="/emojis/epic.png" alt="" style={{ width: '16px', height: '16px' }} />,
  'steam_free': <img src="/emojis/steam.png" alt="" style={{ width: '16px', height: '16px' }} />,
  'gog_free': <img src="/emojis/gog.png" alt="" style={{ width: '16px', height: '16px' }} />,
  'movie': <img src="/emojis/movie.png" alt="" style={{ width: '16px', height: '16px' }} />,
  'tv_series': <img src="/emojis/tv.png" alt="" style={{ width: '16px', height: '16px' }} />,
  'crypto': <img src="/emojis/crypto.png" alt="" style={{ width: '16px', height: '16px' }} />
};

function MonitorsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const guildId = searchParams.get('guild');
  const { addToast, showSuccess } = useToast();

  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [isPremium, setIsPremium] = useState(false);
  const [tier, setTier] = useState(0);
  const [guildLoading, setGuildLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [monitorToDelete, setMonitorToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeletingMode, setIsBulkDeletingMode] = useState(false);

  const platforms = ['all', ...new Set(monitors.map(m => m.type))];
  
  const scrollRef = useRef(null);
  const [canScroll, setCanScroll] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      setCanScroll(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    
    const el = scrollRef.current;
    if (el) {
      const onWheel = (e) => {
        // If content overflows, take over the wheel event
        if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => {
        window.removeEventListener('resize', checkScroll);
        el.removeEventListener('wheel', onWheel);
      };
    }
    
    return () => window.removeEventListener('resize', checkScroll);
  }, [monitors, platforms]);

  const fetchMonitors = async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/monitors?guild=${guildId}`);
      if (res.ok) {
        const data = await res.json();
        setMonitors(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchGuildInfo = async () => {
    if (!guildId) return;
    setGuildLoading(true);
    try {
      const res = await fetch('/api/guilds');
      if (res.ok) {
        const guilds = await res.json();
        const current = guilds.find(g => String(g.id) === String(guildId));
        if (current) {
          setIsPremium(current.isPremium || current.isMaster || false);
          setTier(current.isMaster ? 0 : (current.tier || 0));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGuildLoading(false);
    }
  };

  useEffect(() => {
    if (guildId) {
      fetchMonitors();
      fetchGuildInfo();
    }
  }, [guildId]);

  // Handle auto-open for Modals via URL Params
  useEffect(() => {
    const addParam = searchParams.get('add');
    const bulkParam = searchParams.get('bulk');

    if (addParam === 'true') {
      setIsCreateModalOpen(true);
    }

    if (bulkParam === 'true') {
      setIsBulkAddOpen(true);
    }

    if (addParam === 'true' || bulkParam === 'true') {
      // Clean up URL parameter after opening, but preserve guild
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
        addToast(`Monitor ${enabled ? 'enabled' : 'disabled'}`, 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id) => {
    const monitor = monitors.find(m => m.id === id);
    if (monitor) {
      setMonitorToDelete(monitor);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    
    try {
      if (isBulkDeletingMode) {
        const idsToDelete = selectedIds.length > 0 ? selectedIds : monitors.map(m => m.id);
        const res = await fetch('/api/monitors/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', ids: idsToDelete, guildId })
        });

        if (res.ok) {
          addToast(`Deleted ${idsToDelete.length} monitors`, 'success');
          fetchMonitors();
          setSelectedIds([]);
          setIsBulkDeletingMode(false);
        }
      } else if (monitorToDelete) {
        const res = await fetch(`/api/monitors/${monitorToDelete.id}`, { method: 'DELETE' });
        if (res.ok) {
          setMonitors(monitors.filter(m => m.id !== monitorToDelete.id));
          addToast('Monitor deleted', 'success');
          setMonitorToDelete(null);
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to delete monitor(s)', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    setIsBulkDeletingMode(true);
  };

  const handleBulkUpdate = async (updateData) => {
    const idsToUpdate = selectedIds.length > 0 ? selectedIds : monitors.map(m => m.id);
    try {
      const res = await fetch('/api/monitors/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ids: idsToUpdate, data: updateData, guildId })
      });

      if (res.ok) {
        showSuccess();
        addToast(`Updated ${idsToUpdate.length} monitors`, 'success');
        fetchMonitors();
        setSelectedIds([]);
        setIsBulkEditOpen(false);
      }
    } catch (err) {
      addToast('Failed to update monitors', 'error');
    }
  };

  const openEditModal = (monitor) => {
    setEditingMonitor(monitor);
    setIsModalOpen(true);
  };

  const handleUpdate = async (id, data) => {
    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        showSuccess();
        fetchMonitors();
        setIsModalOpen(false);
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

  const handleBulkToggle = async (enabled) => {
    const idsToToggle = selectedIds.length > 0 ? selectedIds : monitors.map(m => m.id);
    const action = enabled ? 'resume' : 'pause';
    try {
      const res = await fetch('/api/monitors/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, monitorIds: idsToToggle, guildId })
      });
      if (res.ok) {
        addToast(`${enabled ? 'Resumed' : 'Paused'} ${idsToToggle.length} monitors`, 'success');
        fetchMonitors();
      }
    } catch (err) {
      addToast('Failed to toggle monitors', 'error');
    }
  };

  const filteredMonitors = monitors.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.api_url?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || m.type === filter;
    return matchesSearch && matchesFilter;
  });



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
          <button className="btn-bulk-magic" onClick={() => { console.log('Opening Bulk Wizard'); setIsBulkAddOpen(true); }}>
            <Zap size={18} />
            Bulk Wizard
          </button>
          <button className="btn btn-add" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} />
            Add Monitor
          </button>
        </div>
      </header>

      {/* Platform Control Center */}
      <div className="control-center">
        <div className="filter-tabs-wrapper">
          <div className="fade-left"></div>
          <div 
            className="filter-tabs" 
            ref={scrollRef}
          >
            {platforms.map(p => (
              <button
                key={p}
                className={`filter-tab ${filter === p ? 'active' : ''}`}
                onClick={() => setFilter(p)}
              >
                <span className="tab-icon">{platformIcons[p] || <Activity size={14} />}</span>
                <span className="tab-label">{p === 'all' ? 'All Platforms' : (platformNames[p] || p)}</span>
                <span className="count-badge">
                  {p === 'all' ? monitors.length : monitors.filter(m => m.type === p).length}
                </span>
              </button>
            ))}
          </div>
          <div className="fade-right"></div>
        </div>
        
        {canScroll && (
          <div className="scroll-hint">
            <MousePointer2 size={12} />
            <span>Scroll horizontally to see all platforms</span>
          </div>
        )}

        {/* Bulk Actions - separate row */}
        <div className="bulk-actions-toolbar">
          {selectedIds.length > 0 && (
            <button
              className="bulk-btn deselect"
              onClick={() => setSelectedIds([])}
            >
              <X size={14} /> Deselect ({selectedIds.length})
            </button>
          )}
          <button
            className={`bulk-btn toggle-btn ${(() => {
              const target = selectedIds.length > 0
                ? monitors.filter(m => selectedIds.includes(m.id))
                : monitors;
              return target.every(m => m.enabled) ? 'is-active' : 'is-paused';
            })()}`}
            onClick={() => {
              const target = selectedIds.length > 0
                ? monitors.filter(m => selectedIds.includes(m.id))
                : monitors;
              const allEnabled = target.every(m => m.enabled);
              handleBulkToggle(!allEnabled);
            }}
            disabled={monitors.length === 0}
          >
            {(() => {
              const target = selectedIds.length > 0
                ? monitors.filter(m => selectedIds.includes(m.id))
                : monitors;
              const allEnabled = target.every(m => m.enabled);
              return allEnabled
                ? <><Pause size={14} /> {selectedIds.length > 0 ? 'Pause Selected' : 'Pause All'}</>
                : <><Play size={14} /> {selectedIds.length > 0 ? 'Resume Selected' : 'Resume All'}</>;
            })()}
          </button>
          <button
            className="bulk-btn edit"
            onClick={() => setIsBulkEditOpen(true)}
            disabled={monitors.length === 0}
          >
            <Edit3 size={14} /> {selectedIds.length > 0 ? `Edit Selected (${selectedIds.length})` : 'Edit All'}
          </button>
          <button
            className="bulk-btn delete"
            onClick={handleBulkDelete}
            disabled={monitors.length === 0}
          >
            <Trash2 size={14} /> {selectedIds.length > 0 ? 'Delete Selected' : 'Delete All'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>Loading monitors...</div>
      ) : (
        <>
          <div className="dashboard-grid">
            {filteredMonitors.map(m => (
              <MonitorCard
                key={m.id}
                monitor={m}
                isPremium={isPremium}
                tier={tier}
                loading={guildLoading}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={openEditModal}
                isSelected={selectedIds.includes(m.id)}
                onSelect={handleSelect}
                selectionMode={selectedIds.length > 0}
              />
            ))}
          </div>

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
        </>
      )}

      {/* Modals outside main flow */}
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

      <BulkAddModal
        isOpen={isBulkAddOpen}
        onClose={() => setIsBulkAddOpen(false)}
        guildId={guildId}
        onSuccess={fetchMonitors}
        tier={tier}
        isPremium={isPremium}
        guildLoading={guildLoading}
      />

      {(monitorToDelete || isBulkDeletingMode) && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <div className="delete-modal-icon">
              <Trash2 size={36} color="#ef4444" />
            </div>
            <h3>Delete Monitor{isBulkDeletingMode ? 's' : ''}</h3>
            <p>
              {isBulkDeletingMode ? (
                <>
                  Are you sure you want to delete <strong>{selectedIds.length > 0 ? `${selectedIds.length} selected` : 'ALL'}</strong> monitors? 
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{monitorToDelete?.name}</strong>? 
                </>
              )}
              <br/><br/>This action cannot be undone and will stop all future notifications to your Discord server.
            </p>
            <div className="delete-modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setMonitorToDelete(null);
                  setIsBulkDeletingMode(false);
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm-delete" 
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .monitors-page-wrapper {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .control-center {
          background: rgba(255, 255, 255, 0.02);
          padding: 1rem;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          margin-bottom: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .filter-tabs-wrapper {
          position: relative;
          width: 100%;
        }

        .fade-left, .fade-right {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 40px;
          pointer-events: none;
          z-index: 2;
          transition: opacity 0.3s;
        }
        
        .scroll-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
          font-size: 0.7rem;
          margin-top: -8px;
          margin-bottom: 8px;
          padding-left: 10px;
          opacity: 0.6;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 0.6; transform: translateY(0); }
        }

        .fade-left {
          left: 0;
          background: linear-gradient(to right, #0f0f13 0%, transparent 100%);
        }

        .fade-right {
          right: 0;
          background: linear-gradient(to left, #0f0f13 0%, transparent 100%);
        }

        .filter-tabs {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 10px 10px;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        .filter-tabs::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
        }

        .filter-tab {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          padding: 0.75rem 1.5rem;
          border-radius: 16px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.85rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .filter-tab:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .filter-tab.active {
          background: linear-gradient(135deg, var(--accent-color) 0%, #3c096c 100%);
          color: white;
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 25px rgba(123, 44, 191, 0.4);
        }

        .tab-icon {
          display: flex;
          align-items: center;
          opacity: 0.8;
          transition: transform 0.3s;
        }

        .filter-tab:hover .tab-icon {
          transform: scale(1.2) rotate(-5deg);
          opacity: 1;
        }

        .filter-tab.active .tab-icon {
          opacity: 1;
        }

        .count-badge {
          background: rgba(0, 0, 0, 0.25);
          padding: 2px 8px;
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 800;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .bulk-actions-toolbar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .bulk-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          padding: 0.65rem 1.25rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bulk-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .bulk-btn.delete:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .bulk-btn.toggle-btn.is-active:hover:not(:disabled) {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
          border-color: rgba(251, 191, 36, 0.3);
        }

        .bulk-btn.toggle-btn.is-paused:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.3);
        }

        .bulk-btn.deselect {
          background: rgba(123, 44, 191, 0.15);
          border-color: rgba(123, 44, 191, 0.4);
          color: #b085f5;
        }
        .bulk-btn.deselect:hover {
          background: rgba(123, 44, 191, 0.25);
          color: white;
        }

        .bulk-btn.delete.confirm {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
          animation: pulse 1s infinite;
        }

        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

        .bulk-btn:disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }

        .search-input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0.75rem 1.25rem;
          border-radius: 14px;
          outline: none;
          width: 280px;
          transition: all 0.3s;
          font-size: 0.9rem;
        }

        .search-input:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--accent-color);
          width: 320px;
          box-shadow: 0 0 20px rgba(123, 44, 191, 0.15);
        }

        .btn-bulk-magic {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #7b2cbf 0%, #3c096c 100%);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 14px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 10px 20px rgba(60, 9, 108, 0.3);
        }

        .btn-bulk-magic:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 15px 30px rgba(60, 9, 108, 0.5), 0 0 20px rgba(123, 44, 191, 0.4);
          border-color: rgba(255,255,255,0.3);
        }

        .btn-add {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
        }

        .premium-badge {
          background: linear-gradient(90deg, #ffb703, #ff8200);
          color: black;
          font-size: 0.65rem;
          font-weight: 900;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 1px;
          box-shadow: 0 4px 15px rgba(255, 183, 3, 0.3);
          margin-bottom: 1rem;
          display: inline-block;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }

        .empty-state-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 2rem;
          text-align: center;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed rgba(255, 255, 255, 0.05);
          border-radius: 32px;
          margin-top: 2rem;
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
          border: 1px solid var(--accent-color);
          border-radius: 50%;
          opacity: 0;
          animation: radar 4s infinite linear;
        }

        .ring-1 { width: 40px; height: 40px; animation-delay: 0s; }
        .ring-2 { width: 40px; height: 40px; animation-delay: 1.3s; }
        .ring-3 { width: 40px; height: 40px; animation-delay: 2.6s; }

        @keyframes radar {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(3.5); opacity: 0; }
        }

        .empty-state-title { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.75rem; }
        .empty-state-desc { color: var(--text-secondary); max-width: 400px; line-height: 1.6; margin-bottom: 2rem; font-size: 0.95rem; }
        
        .empty-state-btn {
          background: var(--accent-color);
          color: white;
          border: none;
          padding: 0.85rem 2rem;
          border-radius: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s;
          box-shadow: 0 10px 25px rgba(123, 44, 191, 0.3);
        }

        .empty-state-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(123, 44, 191, 0.4);
        }

        .empty-state-btn-ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .empty-state-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        /* Sexy Delete Modal */
        .delete-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          animation: overlayIn 0.3s ease-out;
        }

        .delete-modal-content {
          background: #111116;
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 24px;
          padding: 2.5rem;
          width: 90%;
          max-width: 450px;
          text-align: center;
          box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 40px rgba(239, 68, 68, 0.1);
          animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .delete-modal-icon {
          width: 70px;
          height: 70px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
        }

        .delete-modal-content h3 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 0 1rem;
          color: white;
        }

        .delete-modal-content p {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .delete-modal-content strong {
          color: white;
          font-weight: 700;
        }

        .delete-modal-actions {
          display: flex;
          gap: 1rem;
        }

        .btn-cancel, .btn-confirm-delete {
          flex: 1;
          padding: 0.85rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-cancel {
          background: rgba(255, 255, 255, 0.05);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-cancel:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
        }

        .btn-confirm-delete {
          background: #ef4444;
          color: white;
          box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);
        }

        .btn-confirm-delete:hover:not(:disabled) {
          background: #dc2626;
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(239, 68, 68, 0.4);
        }

        .btn-cancel:disabled, .btn-confirm-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default function MonitorsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MonitorsContent />
    </Suspense>
  );
}
