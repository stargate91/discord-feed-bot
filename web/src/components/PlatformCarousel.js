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
    <div className="ui-carousel-wrapper" style={{ marginBottom: '5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span className="ui-label-caps">Integrations</span>
        <h2 className="ui-title-section" style={{ marginBottom: 0 }}>Supported Platforms</h2>
      </div>
      <div className="ui-carousel-track">
        {displayPlatforms.map((platform, index) => (
          <div key={index} className="ui-carousel-item" style={{ '--platform-color': platform.color }}>
            <div className="ui-carousel-icon-box">
              <img src={platform.icon} alt={platform.name} />
            </div>
            <span className="ui-carousel-name">{platform.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
