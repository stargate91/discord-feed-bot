import { Info } from 'lucide-react';

export default function GenericPlatformConfig({ 
  selectedPlatform, 
  formData, 
  setFormData, 
  autoQuery, 
  setAutoQuery, 
  autoResults, 
  showAutoDropdown, 
  setShowAutoDropdown, 
  isAutoSearching, 
  dropdownRef,
  styles
}) {
  const isAutocomplete = ['steam_news', 'twitch', 'github'].includes(selectedPlatform?.id);

  return (
    <div className={`${styles.formGroup} ${styles.highlightedGroup}`}>
      <div className={styles.labelRow}>
        <label>{selectedPlatform.inputLabel}</label>
        <div className={`${styles.hintPill} ${styles.infoPill}`}><Info size={12} /> {selectedPlatform.hint}</div>
      </div>
      <div className={styles.inputWithAction}>
        {isAutocomplete ? (
          <div className={styles.autocompleteWrapper} style={{ flex: 1 }} ref={dropdownRef}>
            <input
              type="text"
              value={autoQuery || formData.platform_input}
              onChange={(e) => {
                setAutoQuery(e.target.value);
                setFormData({ ...formData, platform_input: e.target.value });
              }}
              onFocus={() => autoResults.length > 0 && setShowAutoDropdown(true)}
              required
              className={styles.styledInputMain}
              placeholder={selectedPlatform.placeholder}
            />
            {isAutoSearching && (
              <div className={styles.searchLoader}></div>
            )}
            {showAutoDropdown && autoResults.length > 0 && (
              <div className={styles.autocompleteDropdown}>
                {autoResults.map(item => (
                  <div
                    key={item.id}
                    className={styles.autocompleteItem}
                    onClick={() => {
                      setFormData({ ...formData, platform_input: item.id, name: item.name });
                      setAutoQuery(item.id);
                      setShowAutoDropdown(false);
                    }}
                  >
                    <img src={item.thumbnail || "/nova_thumbnail.jpg"} alt={item.name} className={selectedPlatform.id === 'twitch' ? styles.gameThumb + ' ' + styles.circle : styles.gameThumb} />
                    <div className={styles.gameInfo}>
                      <span className={styles.gameTitle}>
                        {item.name} {item.is_live && <span className={styles.liveBadge}>LIVE</span>}
                      </span>
                      <span className={styles.gameId}>
                        {selectedPlatform.id === 'github' ? `⭐ ${item.stars} - ${item.id}` : `ID: ${item.id}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <input
            type="text"
            value={formData.platform_input}
            onChange={(e) => setFormData({ ...formData, platform_input: e.target.value })}
            required
            className={styles.styledInputMain}
            style={{ flex: 1 }}
            placeholder={selectedPlatform.placeholder}
          />
        )}
      </div>
    </div>
  );
}
