"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import MonitorCard from '@/components/MonitorCard';
import EditMonitorModal from '@/components/EditMonitorModal';
import CreateMonitorModal from '@/components/CreateMonitorModal';
import BulkEditModal from '@/components/BulkEditModal';
import BulkAddModal from '@/components/BulkAddModal';
import { Plus, Play, Pause, Trash2, Globe, Activity, Zap, X, MousePointer2, Edit3 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import monitorService from '@/services/monitorService';
import settingsService from '@/services/settingsService';
import LoginButton from '@/components/LoginButton';
import styles from './monitors.module.css';

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
  const { data: session } = useSession();
  const searchParams = useSearchParams();
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

  const loadData = async () => {
    if (!guildId) return;
    setLoading(true);
    setGuildLoading(true);
    try {
      const [fetchedMonitors, guilds] = await Promise.all([
        monitorService.getMonitors(guildId),
        settingsService.getGuilds()
      ]);
      setMonitors(fetchedMonitors);
      
      const current = guilds.find(g => String(g.id) === String(guildId));
      if (current) {
        setIsPremium(current.isPremium || current.isMaster || false);
        setTier(current.isMaster ? 0 : (current.tier || 0));
      }
    } catch (err) {
      console.error(err);
      addToast(err.message || "Failed to sync server data", "error");
    } finally {
      setLoading(false);
      setGuildLoading(false);
    }
  };

  const reloadMonitors = async () => {
    if (!guildId) return;
    try {
      const fetchedMonitors = await monitorService.getMonitors(guildId);
      setMonitors(fetchedMonitors);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  useEffect(() => {
    const addParam = searchParams.get('add');
    const bulkParam = searchParams.get('bulk');

    if (addParam === 'true') setIsCreateModalOpen(true);
    if (bulkParam === 'true') setIsBulkAddOpen(true);

    if (addParam === 'true' || bulkParam === 'true') {
      const newUrl = window.location.pathname + (guildId ? `?guild=${guildId}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, guildId]);

  const handleToggle = async (id, enabled) => {
    try {
      await monitorService.toggleMonitor(id, enabled);
      setMonitors(monitors.map(m => m.id === id ? { ...m, enabled } : m));
      addToast(`Monitor ${enabled ? 'enabled' : 'disabled'}`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id) => {
    const monitor = monitors.find(m => m.id === id);
    if (monitor) setMonitorToDelete(monitor);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (isBulkDeletingMode) {
        const idsToDelete = selectedIds.length > 0 ? selectedIds : monitors.map(m => m.id);
        await monitorService.bulkDelete(guildId, idsToDelete);
        addToast(`Deleted ${idsToDelete.length} monitors`, 'success');
        setSelectedIds([]);
        reloadMonitors();
      } else if (monitorToDelete) {
        await monitorService.deleteMonitor(monitorToDelete.id);
        setMonitors(monitors.filter(m => m.id !== monitorToDelete.id));
        addToast('Monitor deleted', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to delete monitor(s)', 'error');
    } finally {
      setIsDeleting(false);
      setMonitorToDelete(null);
      setIsBulkDeletingMode(false);
    }
  };

  const handleBulkUpdate = async (updateData) => {
    const idsToUpdate = selectedIds.length > 0 ? selectedIds : monitors.map(m => m.id);
    try {
      await monitorService.bulkUpdate(guildId, idsToUpdate, updateData);
      showSuccess();
      addToast(`Updated ${idsToUpdate.length} monitors`, 'success');
      setSelectedIds([]);
      setIsBulkEditOpen(false);
      reloadMonitors();
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
      await monitorService.updateMonitor(id, data);
      showSuccess();
      reloadMonitors();
      setIsModalOpen(false);
      return true;
    } catch (err) {
      addToast(err.message || 'Failed to update monitor', 'error', 'Error');
      return false;
    }
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkToggle = async (enabled) => {
    const idsToToggle = selectedIds.length > 0 ? selectedIds : monitors.map(m => m.id);
    const action = enabled ? 'resume' : 'pause';
    try {
      await monitorService.bulkToggle(guildId, idsToToggle, action);
      addToast(`${enabled ? 'Resumed' : 'Paused'} ${idsToToggle.length} monitors`, 'success');
      reloadMonitors();
    } catch (err) {
      addToast('Failed to toggle monitors', 'error');
    }
  };

  const filteredMonitors = monitors.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.api_url?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || m.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={styles.monitorsPageWrapper}>
      <header className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Manage Monitors</h1>
          <p className="page-subtitle">Configure and oversee your automated feed sources and notification targets.</p>
        </div>

        <div className="page-header-actions">
          <input
            type="text"
            placeholder="Search monitors..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <LoginButton session={session} />
        </div>
      </header>

      {/* Platform Control Center */}
      <div className={styles.controlCenter}>
        <div className={styles.filterTabsWrapper}>
          <div className={styles.filterTabs} ref={scrollRef}>
            {platforms.map(p => (
              <button
                key={p}
                className={`${styles.filterTab} ${filter === p ? styles.filterTabActive : ''}`}
                onClick={() => setFilter(p)}
              >
                <span className={styles.tabIcon}>{platformIcons[p] || <Activity size={14} />}</span>
                <span className={styles.tabLabel}>{p === 'all' ? 'All Platforms' : (platformNames[p] || p)}</span>
                <span className={styles.countBadge}>
                  {p === 'all' ? monitors.length : monitors.filter(m => m.type === p).length}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        {canScroll && (
          <div className={styles.scrollHint}>
            <MousePointer2 size={12} />
            <span>Scroll horizontally to see all platforms</span>
          </div>
        )}

        {/* Bulk Actions */}
        <div className={styles.bulkActionsToolbar}>
          {selectedIds.length > 0 && (
            <button className={`${styles.bulkBtn} ${styles.bulkBtnDeselect}`} onClick={() => setSelectedIds([])}>
              <X size={14} /> Deselect ({selectedIds.length})
            </button>
          )}
          <button
            className={`${styles.bulkBtn} ${(() => {
              const target = selectedIds.length > 0 ? monitors.filter(m => selectedIds.includes(m.id)) : monitors;
              return target.every(m => m.enabled) ? styles.bulkBtnToggleActive : styles.bulkBtnTogglePaused;
            })()}`}
            onClick={() => {
              const target = selectedIds.length > 0 ? monitors.filter(m => selectedIds.includes(m.id)) : monitors;
              handleBulkToggle(!target.every(m => m.enabled));
            }}
            disabled={monitors.length === 0}
          >
            {(() => {
              const target = selectedIds.length > 0 ? monitors.filter(m => selectedIds.includes(m.id)) : monitors;
              return target.every(m => m.enabled) 
                ? <><Pause size={14} /> {selectedIds.length > 0 ? 'Pause Selected' : 'Pause All'}</>
                : <><Play size={14} /> {selectedIds.length > 0 ? 'Resume Selected' : 'Resume All'}</>;
            })()}
          </button>
          <button className={`${styles.bulkBtn} ${styles.bulkBtnEdit}`} onClick={() => setIsBulkEditOpen(true)} disabled={monitors.length === 0}>
            <Edit3 size={14} /> {selectedIds.length > 0 ? `Edit Selected (${selectedIds.length})` : 'Edit All'}
          </button>
          <button className={`${styles.bulkBtn} ${styles.bulkBtnDelete}`} onClick={() => setIsBulkDeletingMode(true)} disabled={monitors.length === 0}>
            <Trash2 size={14} /> {selectedIds.length > 0 ? 'Delete Selected' : 'Delete All'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>Loading monitors...</div>
      ) : (
        <>
          <div className={styles.dashboardGrid}>
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
            <div className={styles.emptyStateContainer}>
              <div className={styles.emptyStateIcon}>
                <div className={`${styles.radarRing} ${styles.ring1}`}></div>
                <div className={`${styles.radarRing} ${styles.ring2}`}></div>
                <div className={`${styles.radarRing} ${styles.ring3}`}></div>
                <Activity size={32} color="var(--accent-color)" />
              </div>

              {monitors.length === 0 ? (
                <>
                  <h3 className={styles.emptyStateTitle}>No Monitors Yet</h3>
                  <p className={styles.emptyStateDesc}>
                    Set up your first feed monitor and start receiving automated updates directly in your Discord channels.
                  </p>
                  <button className={styles.emptyStateBtn} onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={18} /> Create Your First Monitor
                  </button>
                </>
              ) : (
                <>
                  <h3 className={styles.emptyStateTitle}>No Results Found</h3>
                  <p className={styles.emptyStateDesc}>
                    No monitors match your current search or filter. Try adjusting your criteria.
                  </p>
                  <button className={styles.emptyStateBtnGhost} onClick={() => { setSearch(''); setFilter('all'); }}>
                    Clear Filters
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals outside main flow */}
      <EditMonitorModal monitor={editingMonitor} guildId={guildId} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleUpdate} tier={tier} isPremium={isPremium} />
      <CreateMonitorModal guildId={guildId} isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={reloadMonitors} tier={tier} isPremium={isPremium} />
      <BulkEditModal isOpen={isBulkEditOpen} onClose={() => setIsBulkEditOpen(false)} onSave={handleBulkUpdate} monitorCount={selectedIds.length > 0 ? selectedIds.length : monitors.length} guildId={guildId} tier={tier} isPremium={isPremium} />
      <BulkAddModal isOpen={isBulkAddOpen} onClose={() => setIsBulkAddOpen(false)} guildId={guildId} onSuccess={reloadMonitors} tier={tier} isPremium={isPremium} guildLoading={guildLoading} />

      {(monitorToDelete || isBulkDeletingMode) && (
        <div className={styles.deleteModalOverlay}>
          <div className={styles.deleteModalContent}>
            <div className={styles.deleteModalIcon}>
              <Trash2 size={36} color="#ef4444" />
            </div>
            <h3>Delete Monitor{isBulkDeletingMode ? 's' : ''}</h3>
            <p>
              {isBulkDeletingMode ? (
                <>Are you sure you want to delete <strong>{selectedIds.length > 0 ? `${selectedIds.length} selected` : 'ALL'}</strong> monitors?</>
              ) : (
                <>Are you sure you want to delete <strong>{monitorToDelete?.name}</strong>?</>
              )}
              <br/><br/>This action cannot be undone and will stop all future notifications to your Discord server.
            </p>
            <div className={styles.deleteModalActions}>
              <button className={styles.btnCancel} onClick={() => { setMonitorToDelete(null); setIsBulkDeletingMode(false); }} disabled={isDeleting}>Cancel</button>
              <button className={styles.btnConfirmDelete} onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Command Pill - Hidden when any modal is open */}
      {!(isCreateModalOpen || isBulkAddOpen || isModalOpen || isBulkEditOpen || monitorToDelete || isBulkDeletingMode) && (
        <div className={styles.floatingActions}>
          <div className={styles.floatingActionsInner}>
            <button className={styles.floatingBulkBtn} onClick={() => setIsBulkAddOpen(true)}>
              <Zap size={18} />
              <span>Bulk Wizard</span>
            </button>
            <button className={styles.floatingAddBtn} onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={18} />
              <span>Add Monitor</span>
            </button>
          </div>
        </div>
      )}
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
