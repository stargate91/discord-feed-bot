"use client";

import { Play, ExternalLink } from 'lucide-react';

export default function DiscordV2Preview() {
  return (
    <div className="ui-discord-wrapper">
      <div className="ui-discord-container">
        {/* Discord Header Mockup */}
        <div className="ui-discord-header">
          <div style={{ color: '#949ba4', fontSize: '20px', opacity: 0.7 }}>#</div>
          <span style={{ color: '#f2f3f5', fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.2px' }}>neural-transmission</span>
        </div>

        <div className="scanline" style={{ position: 'absolute', top: '-100%', left: 0, width: '100%', height: '100px', background: 'linear-gradient(to bottom, transparent 0%, rgba(123, 44, 191, 0.1) 50%, transparent 100%)', pointerEvents: 'none', zIndex: 10 }}></div>

        {/* Message Content */}
        <div className="ui-discord-message">
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <img src="/nova_v2.jpg" alt="Nova" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1rem' }}>Nova</span>
              <span className="ui-badge-neon" style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', textTransform: 'none', letterSpacing: 'normal' }}>APP</span>
              <span style={{ color: 'rgba(148, 155, 164, 0.7)', fontSize: '0.75rem' }}>Today at 1:47 PM</span>
            </div>

            {/* The Rich Embed - English & Aligned Layout */}
            <div className="ui-discord-embed">
              <div style={{ width: '4px', background: 'linear-gradient(to bottom, #ff0000, #b00000)', flexShrink: 0, position: 'relative' }}></div>
              <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header with YouTube Icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <img src="https://cdn.discordapp.com/emojis/1495845103447576807.png" style={{ width: '24px', height: '18px', objectFit: 'contain' }} alt="YouTube" />
                  <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>Project Awakening: First Neural Sync with a Class-4 Android</span>
                </div>

                {/* Large Main Image */}
                <div style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <img src="/nova_thumbnail.jpg" alt="Video Thumbnail" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>

                {/* Info & Button Row - Perfectly Aligned */}
                <div className="embed-footer-aligned" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2, marginBottom: '2px' }}>Nova Cybernetics</div>
                    <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>Published:</div>
                    <div style={{ color: '#dbdee1', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>
                      April 27, 2026 02:10 <span style={{ color: '#949ba4' }}>(just now)</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <button className="ui-discord-btn">
                      <span>View on YouTube</span>
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#949ba4', fontStyle: 'italic', fontSize: '0.75rem' }}>
                  Delivered by <span style={{ color: '#5865f2', fontWeight: 700, fontStyle: 'normal' }}>Nova</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
