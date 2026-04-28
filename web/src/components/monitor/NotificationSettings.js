import MultiSelect from '../MultiSelect';
import { Info } from 'lucide-react';
import { getAvailableVars } from '@/lib/monitorConstants';

export default function NotificationSettings({ 
  formData, 
  setFormData, 
  guildChannels, 
  guildRoles, 
  loadingContext, 
  selectedPlatform, 
  isLocked,
  styles
}) {
  return (
    <div className={styles.formSection}>
      <h4 className={styles.sectionTitle}>Notification Settings</h4>
      <div className={styles.gridResponsive}>
        <div className={styles.formGroup}>
          <label>Target Channels</label>
          <MultiSelect
            options={guildChannels}
            value={formData.target_channels}
            onChange={(val) => setFormData({ ...formData, target_channels: val })}
            placeholder={loadingContext ? "Loading..." : "Select channels"}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Ping Roles</label>
          <MultiSelect
            options={guildRoles}
            value={formData.target_roles}
            onChange={(val) => setFormData({ ...formData, target_roles: val })}
            placeholder={loadingContext ? "Loading..." : "Select roles"}
          />
        </div>
      </div>

      <div className={`${styles.formGroup} ${styles.highlightedGroup} ${styles.customAlertSection}`}>
        <div className={styles.labelRow}>
          <label>Custom Alert Message</label>
          {isLocked("alert_template") ? (
            <div className={styles.hintPill} style={{ background: 'rgba(255, 183, 3, 0.1)', color: '#ffb703' }}>
              <Info size={12} /> Professional Tier Required
            </div>
          ) : (
            <div className={styles.hintPill} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Info size={12} /> Overrides server defaults
            </div>
          )}
        </div>
        <div className={styles.inputWrapper}>
          <textarea
            name="custom_alert"
            value={formData.custom_alert}
            onChange={(e) => setFormData({ ...formData, custom_alert: e.target.value })}
            className={styles.styledInputMain}
            placeholder={isLocked("alert_template") ? "Unlock Professional Tier to customize messages" : `Leave empty to use default.\nExample: @everyone Here is a new post: {title}`}
            rows={3}
            disabled={isLocked("alert_template")}
          />
          {isLocked("alert_template") && (
            <div className={styles.premiumFieldOverlay}>
              <span className={styles.lockTag}>Professional Tier+</span>
            </div>
          )}
        </div>

        <div className={styles.varBtnGrid}>
          {getAvailableVars(selectedPlatform?.id).map(v => (
            <button
              key={v}
              type="button"
              className={styles.varBtn}
              onClick={() => !isLocked("alert_template") && setFormData(prev => ({ ...prev, custom_alert: (prev.custom_alert || '') + `{${v}}` }))}
              title={`Insert {${v}}`}
              disabled={isLocked("alert_template")}
            >
              {`{${v}}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
