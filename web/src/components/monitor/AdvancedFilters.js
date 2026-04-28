import MultiSelect from '../MultiSelect';
import { MOVIE_GENRES, LANGUAGES } from '@/lib/monitorConstants';

export default function AdvancedFilters({ formData, setFormData, isLocked, styles }) {
  return (
    <div className={styles.formSection}>
      <h4 className={styles.sectionTitle}>Advanced Filters</h4>
      <div className={`${styles.gridResponsive} ${(isLocked("genre_filter") || isLocked("tmdb_language_filter")) ? styles.lockedGroup : ''}`}>
        <div className={styles.formGroup}>
          <label>Target Genres</label>
          <MultiSelect
            options={MOVIE_GENRES}
            value={formData.target_genres}
            onChange={(val) => setFormData({ ...formData, target_genres: val })}
            placeholder={isLocked("genre_filter") ? "Unlock Starter Tier" : "Select genres"}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Languages</label>
          <MultiSelect
            options={LANGUAGES}
            value={formData.target_languages}
            onChange={(val) => setFormData({ ...formData, target_languages: val })}
            placeholder={isLocked("tmdb_language_filter") ? "Unlock Starter Tier" : "Select languages"}
          />
        </div>
        {(isLocked("genre_filter") || isLocked("tmdb_language_filter")) && (
          <div className={styles.premiumFieldOverlay}>
            <span className={styles.lockTag}>Starter Tier+</span>
          </div>
        )}
      </div>
    </div>
  );
}
