import { RefreshCcw, Shield, Send, Trash, Radio, Moon, TrendingUp, Sparkles, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DiagnosticsPanel({ 
  monitor, 
  showTools, 
  actionLoading, 
  actionStatus, 
  runAction, 
  canRepost, 
  repostCount, 
  setRepostCount, 
  purgeAmount, 
  setPurgeAmount, 
  isPremium,
  styles 
}) {
  return (
    <div className={`${styles.diagnosticsPanel} ${showTools ? styles.expanded : ''}`}>
      <div className={styles.toolsGrid}>
        <button className={styles.toolBtn} onClick={() => runAction('check')} disabled={actionLoading}>
          <RefreshCcw size={16} className={actionLoading === 'check' ? styles.spin : ''} />
          <span>Check</span>
        </button>

        <div className={`${styles.toolGroup} ${!canRepost ? styles.locked : ''}`} title={!canRepost ? "Requires Professional Tier" : ""}>
          <button
            className={`${styles.toolBtn} ${styles.wide} ${!canRepost ? styles.isLocked : ''}`}
            onClick={() => canRepost && runAction('repost')}
            disabled={actionLoading || !canRepost}
          >
            {!canRepost ? <Shield size={14} style={{ color: '#ffd700' }} /> : <Send size={16} className={actionLoading === 'repost' ? styles.pulse : ''} />}
            <span>{!canRepost ? "Repost (Locked)" : `Repost (${repostCount})`}</span>
          </button>
          <input
            type="range" min="1" max="10"
            value={repostCount}
            onChange={(e) => canRepost && setRepostCount(parseInt(e.target.value))}
            className={styles.repostSlider}
            disabled={!canRepost}
          />
        </div>

        <div className={styles.toolGroup}>
          <button className={`${styles.toolBtn} ${styles.purge} ${styles.wide}`} onClick={() => runAction('purge')} disabled={actionLoading} title="Clear Discord Channel">
            <Trash size={16} className={actionLoading === 'purge' ? styles.shake : ''} />
            <span>Purge ({purgeAmount})</span>
          </button>
          <input
            type="range" min="5" max="100" step="5"
            value={purgeAmount}
            onChange={(e) => setPurgeAmount(parseInt(e.target.value))}
            className={styles.purgeSlider}
          />
        </div>
      </div>
      {actionStatus.message && (
        <div className={`${styles.actionFeedback} ${styles[actionStatus.type]}`}>
          {actionStatus.type === 'success' && actionStatus.message.includes('LIVE NOW') ? <Radio size={14} className={styles.pulse} /> :
            actionStatus.type === 'success' && actionStatus.message.includes('OFFLINE') ? <Moon size={14} /> :
              actionStatus.type === 'success' && actionStatus.message.includes('Price Alert') ? <TrendingUp size={14} /> :
                actionStatus.type === 'success' && actionStatus.message.includes('Found') ? <Sparkles size={14} /> :
                  actionStatus.type === 'success' ? <Check size={14} /> :
                    <AlertCircle size={14} />}
          {actionStatus.message}
        </div>
      )}
      {!isPremium && showTools && (
        <div className={styles.premiumLockMessage}>
          Upgrade to <Link href={`/premium?guild=${monitor.guild_id}`} style={{ color: '#ffd700', textDecoration: 'underline' }}>Premium</Link> to use Repost tools.
        </div>
      )}
    </div>
  );
}
