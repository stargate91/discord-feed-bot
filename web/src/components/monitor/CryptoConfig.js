import { Info, Trash2, Plus } from 'lucide-react';

export default function CryptoConfig({ cryptoPairs, onUpdate, onAdd, onRemove, styles }) {
  return (
    <div className={styles.formGroup + ' ' + styles.highlightedGroup}>
      <div className={styles.labelRow}>
        <label>Price Alert Targets</label>
        <div className={`${styles.hintPill} ${styles.infoPill}`}><Info size={12} /> Set coin and threshold</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cryptoPairs.map((pair, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="BTC"
              value={pair.symbol}
              onChange={(e) => onUpdate(idx, 'symbol', e.target.value)}
              className={styles.styledInputMain + ' ' + styles.compactInput}
              style={{ flex: 1 }}
              required
            />
            <span style={{ opacity: 0.3 }}>:</span>
            <input
              type="number"
              placeholder="50000"
              value={pair.threshold}
              onChange={(e) => onUpdate(idx, 'threshold', e.target.value)}
              className={styles.styledInputMain + ' ' + styles.compactInput}
              style={{ flex: 2 }}
              required
            />
            {cryptoPairs.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className={styles.deleteIconBtn}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={onAdd}
          className={styles.addPairBtn}
        >
          <Plus size={14} /> Add Another Coin
        </button>
      </div>
    </div>
  );
}
