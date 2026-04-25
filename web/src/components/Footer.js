import React from 'react';

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-brand">
          <img src="/nova_v2.jpg" alt="NovaFeeds" className="lp-footer-logo" />
          <div>
            <div className="lp-footer-name">NovaFeeds</div>
            <p className="lp-footer-desc">Your friendly neighborhood Discord feed bot.</p>
          </div>
        </div>
        <div className="lp-footer-col">
          <h4>Product</h4>
          <a href="/dashboard">Dashboard</a>
          <a href="/premium">Premium</a>
        </div>
        <div className="lp-footer-col">
          <h4>Resources</h4>
          <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer">Support Server</a>
          <a href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1489908793780338688'}&permissions=8&scope=bot%20applications.commands`} target="_blank" rel="noopener noreferrer">Invite Bot</a>
        </div>
        <div className="lp-footer-col">
          <h4>Legal</h4>
          <a href="/terms">Terms of Service</a>
          <a href="/privacy">Privacy Policy</a>
        </div>
      </div>
      <div className="lp-footer-bottom">
        <span>© {new Date().getFullYear()} NovaFeeds. All rights reserved.</span>
      </div>
    </footer>
  );
}
