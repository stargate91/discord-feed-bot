"use client";


const PLATFORMS = [
  { name: "YouTube", icon: "/emojis/youtube.png", color: "#FF0000" },
  { name: "Twitch", icon: "/emojis/twitch.png", color: "#9146FF" },
  { name: "Kick", icon: "/emojis/kick.png", color: "#53FC18" },
  { name: "Epic Games", icon: "/emojis/epic-games.png", color: "#FFFFFF" },
  { name: "Steam", icon: "/emojis/steam.png", color: "#171a21" },
  { name: "RSS", icon: "/emojis/rss.png", color: "#FFA500" },
  { name: "GitHub", icon: "/emojis/github.png", color: "#FFFFFF" },
  { name: "Crypto", icon: "/emojis/crypto.png", color: "#F7931A" },
];

export default function PlatformCarousel() {
  // Duplicate the list for seamless infinite loop
  const displayPlatforms = [...PLATFORMS, ...PLATFORMS, ...PLATFORMS];

  return (
    <div className="carousel-wrapper">
      <div className="carousel-track">
        {displayPlatforms.map((platform, index) => (
          <div key={index} className="carousel-item">
            <div className="icon-container" style={{ '--platform-color': platform.color }}>
              <img src={platform.icon} alt={platform.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            </div>
            <span className="platform-name">{platform.name}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .carousel-wrapper {
          width: 100%;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding: 2.5rem 0;
          position: relative;
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }

        .carousel-track {
          display: flex;
          gap: 4rem;
          width: max-content;
          animation: scroll 40s linear infinite;
        }

        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }

        .carousel-item {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          opacity: 0.5;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          filter: grayscale(1);
        }

        .carousel-item:hover {
          opacity: 1;
          filter: grayscale(0);
          transform: translateY(-5px) scale(1.1);
        }

        .icon-container {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.4s;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .carousel-item:hover .icon-container {
          background: color-mix(in srgb, var(--platform-color), transparent 85%);
          border-color: var(--platform-color);
          color: var(--platform-color);
          box-shadow: 0 0 25px color-mix(in srgb, var(--platform-color), transparent 70%);
        }

        .platform-name {
          font-size: 1.1rem;
          font-weight: 800;
          color: white;
          text-transform: uppercase;
          letter-spacing: 2px;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
