import { ChevronRight } from 'lucide-react';

export default function PlatformGrid({ platforms, onSelect, styles }) {
  return (
    <div className={styles.platformGrid}>
      {platforms.map(p => (
        <div
          key={p.id}
          className={styles.platformCard}
          onClick={() => onSelect(p)}
          style={{ "--platform-color": p.color }}
        >
          <div className={styles.pIcon}>
            <img src={p.logo} alt={p.name} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <div className={styles.pIconGlow}></div>
          </div>
          <div className={styles.pInfo}>
            <span className={styles.pName}>{p.name}</span>
            <span className={styles.pDesc}>{p.description}</span>
          </div>
          <div className={styles.pArrowWrapper}>
            <ChevronRight size={18} className={styles.pArrow} />
          </div>
        </div>
      ))}
    </div>
  );
}
