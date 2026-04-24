import { Zap, Clock, Shield, ChevronRight, Check } from "lucide-react";

export default function PricingCard({
  title,
  price,
  interval = 'mo',
  features = [],
  isPopular = false,
  tier = 0,
  currentTier = 0,
  isMaster = false,
  description = "",
  onPurchaseClick = () => { },
  isLoading = false
}) {
  const isCurrentPlan = tier === currentTier && !isMaster;
  const isFree = tier === 0;
  const isUpgrade = tier > currentTier && !isMaster;
  const isDowngrade = tier < currentTier && !isMaster;

  return (
    <div className={`pricing-card ${isPopular ? 'popular' : ''}`} style={{
      background: isPopular ? 'rgba(123, 44, 191, 0.06)' : 'rgba(255, 255, 255, 0.02)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${isPopular ? 'rgba(123, 44, 191, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
      borderRadius: '28px',
      padding: '3rem 2rem 2.5rem 2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      width: '100%',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      boxShadow: isPopular ? '0 25px 50px -12px rgba(123, 44, 191, 0.3)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      cursor: 'default'
    }}>
      {isPopular && (
        <div style={{
          position: 'absolute', top: '-14px', background: 'linear-gradient(90deg, #7b2cbf, #9d4edd)',
          color: 'white', padding: '6px 20px', borderRadius: '20px', fontSize: '0.75rem',
          fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.2px', boxShadow: '0 10px 20px rgba(123, 44, 191, 0.4)'
        }}>
          Most Popular
        </div>
      )}

      <div style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', color: 'white', letterSpacing: '-0.5px' }}>{title}</div>
      <div style={{ fontSize: '0.85rem', color: '#a0a0b0', marginBottom: '2rem', fontWeight: '500', textAlign: 'center' }}>{description}</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '2.5rem' }}>
        {!isFree && <span style={{ fontSize: '1.4rem', fontWeight: '700', color: isPopular ? 'white' : 'var(--accent-color)', opacity: 0.8 }}>€</span>}
        <span style={{ fontSize: '3.8rem', fontWeight: '900', color: 'white', lineHeight: 1, letterSpacing: '-2px' }}>{price}</span>
        {!isFree && <span style={{ fontSize: '1rem', color: '#a0a0b0', fontWeight: '600' }}>/{interval}</span>}
      </div>

      <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', marginBottom: '2rem' }}></div>

      <ul style={{ listStyle: 'none', width: '100%', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '16px', padding: 0 }}>
        {features.map((feature, idx) => (
          <li key={idx} style={{ 
            fontSize: '0.92rem', 
            color: feature.disabled ? '#555' : feature.highlight ? 'white' : '#e0e0e0', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            fontWeight: feature.highlight ? '800' : '500'
          }}>
            <Check size={18} style={{ color: feature.disabled ? '#333' : feature.highlight ? '#9d4edd' : 'var(--accent-color)', flexShrink: 0 }} />
            <span style={{ 
              textDecoration: feature.disabled ? 'line-through' : 'none',
              color: feature.highlight ? 'var(--accent-hover)' : 'inherit'
            }}>{feature.text}</span>
          </li>
        ))}
      </ul>

      <div
        style={{ width: '100%', textDecoration: 'none', marginTop: 'auto' }}
        onClick={(e) => {
          if (isFree || isCurrentPlan || isMaster) return;
          e.preventDefault();
          onPurchaseClick();
        }}
      >
        <button className="btn" style={{
          width: '100%', padding: '1.1rem', borderRadius: '16px',
          background: isMaster ? 'rgba(255,255,255,0.05)' : isPopular ? 'var(--accent-color)' : isCurrentPlan ? 'rgba(255,255,255,0.08)' : isFree ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
          border: isPopular ? 'none' : '1px solid rgba(255,255,255,0.1)',
          color: (isFree || isMaster || isCurrentPlan) ? '#a0a0b0' : 'white',
          fontWeight: '700',
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.2s ease',
          boxShadow: (isPopular && !isCurrentPlan) ? '0 10px 20px rgba(123, 44, 191, 0.2)' : 'none',
          pointerEvents: (isFree || isCurrentPlan || isMaster) ? 'none' : 'auto',
          opacity: (isFree || isMaster || isCurrentPlan) ? 0.8 : 1,
          cursor: (isFree || isCurrentPlan || isMaster) ? 'default' : 'pointer'
        }}>
          <span>
            {isLoading ? 'Processing...' :
              isMaster ? 'Master Access' :
              isCurrentPlan ? 'Current Plan' :
                isUpgrade ? 'Upgrade Now' :
                  isDowngrade ? 'Switch Plan' :
                    isFree ? 'Current Plan' : 'Get Started'}
          </span>
          {(!isFree && !isCurrentPlan && !isMaster && !isLoading) && <ChevronRight size={18} />}
        </button>
      </div>

      <style jsx>{`
        .pricing-card:hover {
          transform: translateY(-10px);
          border-color: rgba(123, 44, 191, 0.6) !important;
          background: rgba(123, 44, 191, 0.08) !important;
        }
        .pricing-card.popular:hover {
           background: rgba(123, 44, 191, 0.12) !important;
        }
      `}</style>
    </div>
  );
}
