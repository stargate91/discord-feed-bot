"use client";

import { useState } from 'react';
import { MessageSquare, Lock, Zap } from 'lucide-react';
import Link from 'next/link';
import { PLATFORMS, TAG_DESCRIPTIONS } from '@/lib/constants';

/**
 * TemplateEditor component for editing alert message formats.
 * 
 * Props:
 * - templates: object containing platform-specific templates
 * - onUpdate: function(platform, newTemplateValue)
 * - isLocked: boolean, if true shows the premium lock overlay
 * - guildId: string, for the upgrade link
 * - styles: the styles object from the parent module
 */
export default function TemplateEditor({ templates, onUpdate, isLocked, guildId, styles }) {
  const [activePlatform, setActivePlatform] = useState(PLATFORMS[0].id);

  const currentPlatform = PLATFORMS.find(p => p.id === activePlatform);

  if (isLocked) {
    return (
      <div className={styles.premiumLockOverlay}>
        <Lock size={32} />
        <p>Available for Professional Tier & above</p>
        <Link href={`/premium?guild=${guildId}`}>
          <button className={styles.upgradeBtnSmall}>Upgrade Now</button>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.templateEditorWrapper}>
      <div className={styles.platformTabs}>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            className={`${styles.platformTab} ${activePlatform === p.id ? styles.active : ''}`}
            onClick={() => setActivePlatform(p.id)}
          >
            <img src={p.icon} alt={p.name} className={styles.tabIconImg} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.editorContainer}>
        <div className={styles.tagsHint}>
          <div className={styles.tagsHintHeader}>
            <span>Available dynamic tags (click to insert):</span>
          </div>
          <div className={styles.tagsList}>
            {currentPlatform?.tags.map(tag => (
              <button
                key={tag}
                className={styles.tagPill}
                onClick={() => onUpdate(activePlatform, (templates[activePlatform] || "") + tag)}
                title={TAG_DESCRIPTIONS[tag]}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className={styles.templateTextarea}
          placeholder="Enter your custom template..."
          value={templates[activePlatform] || ""}
          onChange={(e) => onUpdate(activePlatform, e.target.value)}
        />
      </div>
    </div>
  );
}
