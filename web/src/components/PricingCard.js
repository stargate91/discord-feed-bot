export default function PricingCard({ label, days, price, isPopular = false }) {
  const calculatedPrice = (days / 30 * 4.99).toFixed(2);

  return (
    <div className={`pricing-card ${isPopular ? 'popular' : ''}`} style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: `1px solid ${isPopular ? '#7b2cbf' : 'rgba(255, 255, 255, 0.08)'}`,
      borderRadius: '20px',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    }}>
      {isPopular && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          background: '#7b2cbf',
          color: 'white',
          padding: '4px 15px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '800',
          textTransform: 'uppercase'
        }}>Best Value</div>
      )}
      
      <div style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '0.85rem', color: '#a0a0b0', marginBottom: '1.5rem' }}>{days} Days of Premium</div>
      
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '2rem' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#9d4edd' }}>$</span>
        <span style={{ fontSize: '3rem', fontWeight: '900', color: 'white' }}>{calculatedPrice}</span>
        <span style={{ fontSize: '0.9rem', color: '#a0a0b0' }}>/ plan</span>
      </div>

      <ul style={{ listStyle: 'none', width: '100%', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0 }}>
        <li style={{ fontSize: '0.9rem', color: '#f8f8f8' }}>✨ 100 Feed Monitors</li>
        <li style={{ fontSize: '0.9rem', color: '#f8f8f8' }}>⚡ 2-5 Min Refresh Rate</li>
        <li style={{ fontSize: '0.9rem', color: '#f8f8f8' }}>🏷️ Role & Genre Filtering</li>
        <li style={{ fontSize: '0.9rem', color: '#f8f8f8' }}>🤖 Priority Support</li>
      </ul>

      <button className="btn" style={{ width: '100%', marginTop: 'auto' }}>
        Select Plan
      </button>
    </div>
  );
}
