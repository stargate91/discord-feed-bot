import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="ui-footer">
      <div className="ui-footer-inner ui-container">
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <img src="/nova_v2.jpg" alt="NovaFeeds" style={{ width: '36px', height: '36px', borderRadius: '10px', marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '2px', color: 'white', marginBottom: '0.25rem' }}>NovaFeeds</div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', opacity: 0.5, lineHeight: 1.5 }}>Your friendly neighborhood Discord feed bot.</p>
          </div>
        </div>
        <div className="ui-footer-col">
          <h4>Product</h4>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/premium">Premium</Link>
        </div>
        <div className="ui-footer-col">
          <h4>Resources</h4>
          <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer">Support Server</a>
          <a href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1489908793780338688'}&permissions=3387582172359760&response_type=code&redirect_uri=https%3A%2F%2Fnovafeeds.xyz%2Fapi%2Fauth%2Fcallback%2Fdiscord&integration_type=0&scope=identify+guilds+bot+applications.commands`} target="_blank" rel="noopener noreferrer">Invite Bot</a>
        </div>
        <div className="ui-footer-col">
          <h4>Legal</h4>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
      </div>
      <div className="ui-container" style={{ margin: '2rem auto 0', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>© {new Date().getFullYear()} NovaFeeds. All rights reserved.</span>
      </div>
    </footer>
  );
}
