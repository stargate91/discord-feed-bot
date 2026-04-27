"use client";

import { Play, ExternalLink } from 'lucide-react';

export default function DiscordV2Preview() {
  return (
    <div className="discord-preview-wrapper">
      <div className="discord-container">
        {/* Discord Header Mockup */}
        <div className="discord-header">
          <div className="channel-icon">#</div>
          <span className="channel-name">neural-transmission</span>
        </div>

        <div className="scanline"></div>

        {/* Message Content */}
        <div className="discord-message">
          <div className="avatar">
            <img src="/nova_v2.jpg" alt="Nova" onError={(e) => e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'} />
          </div>

          <div className="message-content">
            <div className="message-header">
              <span className="bot-name">Nova</span>
              <span className="bot-badge">APP</span>
              <span className="timestamp">Today at 1:47 PM</span>
            </div>

            {/* The Rich Embed - English & Aligned Layout */}
            <div className="discord-embed">
              <div className="embed-border"></div>
              <div className="embed-inner">
                {/* Header with YouTube Icon */}
                <div className="embed-header">
                  <img src="https://cdn.discordapp.com/emojis/1495845103447576807.png" className="platform-icon" alt="YouTube" />
                  <span className="embed-title-text">Project Awakening: First Neural Sync with a Class-4 Android</span>
                </div>

                {/* Large Main Image */}
                <div className="embed-image">
                  <img src="/nova_thumbnail.jpg" alt="Video Thumbnail" />
                </div>

                {/* Info & Button Row - Aligned */}
                <div className="embed-footer-info">
                  <div className="info-top-row">
                    <div className="author-name">Nova Cybernetics</div>
                    <button className="discord-btn-v2">
                      <span>View on YouTube</span>
                      <ExternalLink size={14} />
                    </button>
                  </div>

                  <div className="info-bottom-row">
                    <div className="publish-label">Published:</div>
                    <div className="publish-date">April 27, 2026 02:10 <span className="relative-time">(just now)</span></div>
                  </div>
                </div>

                <div className="embed-branding">
                  Delivered by <span>Nova</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .discord-preview-wrapper {
          perspective: 1000px;
          padding: 1rem;
          width: 100%;
          max-width: 650px;
          margin: 0 auto;
        }

        .discord-container {
          background: rgba(30, 31, 34, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 
            0 40px 100px rgba(0, 0, 0, 0.8),
            0 0 60px rgba(123, 44, 191, 0.15);
          transform: rotateX(2deg) rotateY(-5deg);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid rgba(123, 44, 191, 0.4);
          position: relative;
        }

        .scanline {
          position: absolute;
          top: -100%;
          left: 0;
          width: 100%;
          height: 100px;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(123, 44, 191, 0.1) 50%,
            transparent 100%
          );
          animation: scanline 4s linear infinite;
          pointer-events: none;
          z-index: 10;
        }

        @keyframes scanline {
          0% { top: -20% }
          100% { top: 120% }
        }

        .discord-container:hover {
          transform: rotateX(0) rotateY(0) scale(1.05);
          background: rgba(30, 31, 34, 0.65);
          border-color: var(--accent-color);
          box-shadow: 
            0 50px 150px rgba(0, 0, 0, 1),
            0 0 100px rgba(123, 44, 191, 0.4);
        }

        .discord-header {
          height: 48px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 8px;
        }

        .channel-icon { color: #949ba4; font-size: 20px; opacity: 0.7; }
        .channel-name { color: #f2f3f5; font-weight: 600; font-size: 0.95rem; letter-spacing: 0.2px; }

        .discord-message {
          padding: 20px;
          display: flex;
          gap: 16px;
        }

        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .avatar img { width: 100%; height: 100%; object-fit: cover; }

        .message-content { flex: 1; }

        .message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .bot-name { color: #ffffff; font-weight: 700; font-size: 1rem; }
        .bot-badge {
          background: linear-gradient(135deg, var(--accent-color), var(--accent-hover));
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          box-shadow: 0 0 15px var(--accent-glow);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .timestamp { color: rgba(148, 155, 164, 0.7); font-size: 0.75rem; }

        .discord-embed {
          margin-top: 10px;
          background: rgba(20, 21, 23, 0.5);
          border-radius: 12px;
          display: flex;
          max-width: 520px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .embed-border {
          width: 4px;
          background: linear-gradient(to bottom, #ff0000, #b00000);
          flex-shrink: 0;
          position: relative;
        }

        .embed-border::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #ff0000;
          filter: blur(6px);
          opacity: 0.6;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        .embed-inner {
          padding: 12px 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .embed-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .platform-icon { width: 24px; height: 18px; object-fit: contain; }
        .embed-title-text {
          color: #ffffff;
          font-weight: 700;
          font-size: 0.95rem;
          line-height: 1.3;
        }

        .embed-image {
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 12px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .embed-image img { width: 100%; height: auto; display: block; }

        .embed-footer-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 16px;
        }

        .info-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .author-name { color: #ffffff; font-weight: 700; font-size: 0.95rem; }
        
        .info-bottom-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .publish-label { color: #ffffff; font-weight: 700; font-size: 0.85rem; }
        .publish-date { color: #dbdee1; font-size: 0.85rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; display: inline-block; width: fit-content; }
        .relative-time { color: #949ba4; }

        .discord-btn-v2 {
          background: #2b2d31;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 2px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          height: 34px;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .discord-btn-v2:hover {
          background: #313338;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .discord-btn-v2 span {
          margin-top: -1px;
        }

        .embed-branding {
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.05);
          color: #949ba4;
          font-style: italic;
          font-size: 0.75rem;
        }

        .embed-branding span { color: #5865f2; font-weight: 700; font-style: normal; }

        @media (max-width: 600px) {
          .info-top-row { flex-direction: column; align-items: flex-start; gap: 8px; }
          .discord-btn-v2 { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
