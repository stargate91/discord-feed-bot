"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MonitorCard from '@/components/MonitorCard';
import EditMonitorModal from '@/components/EditMonitorModal';
import CreateMonitorModal from '@/components/CreateMonitorModal';
import BulkEditModal from '@/components/BulkEditModal';
import BulkAddModal from '@/components/BulkAddModal';
import { Plus, Play, Pause, Trash2, Globe, AlertTriangle, Edit3, Activity, Zap } from 'lucide-react';
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

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const fetchMonitors = async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/monitors?guildId=${guildId}`);
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

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    try {
      const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMonitors(monitors.filter(m => m.id !== id));
        addToast('Monitor deleted', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteConfirm) {
      setBulkDeleteConfirm(true);
      setTimeout(() => setBulkDeleteConfirm(false), 3000);
      return;
    }

    const idsToDelete = selectedIds.length > 0 ? selectedIds : monitors.map(m => m.id);
    if (idsToDelete.length === 0) return;

    try {
      const res = await fetch('/api/monitors/bulk', {
        method: 'POST', // Use POST for bulk delete payload
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: idsToDelete, guildId })
      });

      if (res.ok) {
        addToast(`Deleted ${idsToDelete.length} monitors`, 'success');
        fetchMonitors();
        setSelectedIds([]);
        setBulkDeleteConfirm(false);
      }
    } catch (err) {
      addToast('Failed to delete monitors', 'error');
    }
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
    try {
      const res = await fetch('/api/monitors/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ids: idsToToggle, data: { enabled }, guildId })
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

      {/* Platform Tabs */}
      <div className="filter-tabs-container">
        <div className="filter-tabs">
          {platforms.map(p => (
            <button 
              key={p}
              className={`filter-tab ${filter === p ? 'active' : ''}`}
              onClick={() => setFilter(p)}
            >
              {p === 'all' ? 'All Platforms' : (platformNames[p] || p)}
              <span className="count-badge">
                {p === 'all' ? monitors.length : monitors.filter(m => m.type === p).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions - separate row */}
      <div className="bulk-actions-toolbar">
          <button 
            className="bulk-btn resume" 
            onClick={() => handleBulkToggle(true)}
            disabled={monitors.length === 0 || undefined}
          >
            <Play size={14} /> {selectedIds.length > 0 ? 'Resume Selected' : 'Resume All'}
          </button>
          <button 
            className="bulk-btn pause-btn" 
            onClick={() => handleBulkToggle(false)}
            disabled={monitors.length === 0 || undefined}
          >
            <Pause size={14} /> {selectedIds.length > 0 ? 'Pause Selected' : 'Pause All'}
          </button>
          <button 
            className="bulk-btn edit" 
            onClick={() => setIsBulkEditOpen(true)}
            disabled={monitors.length === 0 || undefined}
          >
            <Edit3 size={14} /> {selectedIds.length > 0 ? `Edit Selected (${selectedIds.length})` : 'Edit All'}
          </button>
          <button 
            className={`bulk-btn delete ${bulkDeleteConfirm ? 'confirm' : ''}`} 
            onClick={handleBulkDelete}
            disabled={monitors.length === 0 || undefined}
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
      />

      <style jsx>{`
        .monitors-page-wrapper {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .filter-tabs-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          background: rgba(255, 255, 255, 0.02);
          padding: 0.75rem;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          flex-wrap: wrap;
          gap: 1rem;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .filter-tab {
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          padding: 0.6rem 1.2rem;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.25s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-tab:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .filter-tab.active {
          background: var(--accent-color);
          color: white;
          box-shadow: 0 4px 15px rgba(123, 44, 191, 0.3);
        }

        .count-badge {
          background: rgba(0, 0, 0, 0.2);
          padding: 1px 6px;
          border-radius: 6px;
          font-size: 0.7rem;
          opacity: 0.8;
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

        .btn-add {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
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

        .bulk-actions-toolbar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
          padding: 0.5rem 0;
        }

        .bulk-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          padding: 0.6rem 1rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bulk-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .bulk-btn.delete:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.2);
        }

        .bulk-btn.resume:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.2);
        }

        .bulk-btn.pause-btn:hover:not(:disabled) {
          background: rgba(251, 191, 36, 0.1);
          color: #fbbf24;
          border-color: rgba(251, 191, 36, 0.2);
        }

        .bulk-btn.delete.confirm {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
          animation: pulse 1s infinite;
        }

        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

        .bulk-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
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
