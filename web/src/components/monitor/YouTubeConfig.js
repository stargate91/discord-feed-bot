import { Info } from 'lucide-react';

export default function YouTubeConfig({ 
  formData, 
  setFormData, 
  resolvedChannel, 
  resolving, 
  handleResolve, 
  selectedPlatform, 
  isLocked,
  styles
}) {
  return (
    <>
      <div className={styles.formGroup + ' ' + styles.highlightedGroup}>
        <div className={styles.labelRow}>
          <label>{selectedPlatform.inputLabel}</label>
          <div className={`${styles.hintPill} ${styles.infoPill}`}><Info size={12} /> {selectedPlatform.hint}</div>
        </div>
        <div className={styles.inputWithAction}>
          <input
            type="text"
            value={formData.platform_input}
            onChange={(e) => setFormData({ ...formData, platform_input: e.target.value })}
            required
            className={`${styles.styledInputMain} ${resolvedChannel ? styles.valid : ''}`}
            style={{ flex: 1 }}
            placeholder={selectedPlatform.placeholder}
          />

          <button
            type="button"
            onClick={handleResolve}
            className={`${styles.actionLinkBtn} ${resolving ? styles.loading : ''}`}
            disabled={resolving || !formData.platform_input}
          >
            {resolving ? 'Checking...' : (resolvedChannel ? 'Change' : 'Verify')}
          </button>
        </div>

        {resolvedChannel && (
          <div className={styles.validationChip}>
            <div className={styles.chipAvatar}>
              <img src={resolvedChannel.thumbnail} alt="" />
              <div className={styles.checkMark}>✓</div>
            </div>
            <div className={styles.chipContent}>
              <span className={styles.chipTitle}>{resolvedChannel.title}</span>
              <span className={styles.chipSubtitle}>Channel Verified</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
