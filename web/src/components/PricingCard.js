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
    <div className={`ui-pricing-card ${isPopular ? 'ui-popular' : ''}`}>
      {isPopular && (
        <div style={{
          position: 'absolute', top: '-14px', background: 'linear-gradient(90deg, var(--accent-color), var(--accent-hover))',
          color: 'white', padding: '6px 20px', borderRadius: '20px', fontSize: '0.75rem',
          fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.2px', boxShadow: '0 10px 20px var(--accent-glow)'
        }}>
          Most Popular
        </div>
      )}

      <div className="ui-pricing-title">{title}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: '500', textAlign: 'center', minHeight: '1.5rem' }}>{description}</div>

      <div className="ui-pricing-price">
        <div className="ui-pricing-price-value" key={`${price}-${interval}`}>
          {!isFree && <span style={{ fontSize: '1.4rem', fontWeight: '700', opacity: 0.8 }}>€</span>}
          <span>{price}</span>
          {!isFree && <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>/{interval}</span>}
        </div>
      </div>

      <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', marginBottom: '1.5rem' }}></div>

      <ul className="ui-pricing-feature-list">
        {features.map((feature, idx) => (
          <li key={idx} className={`ui-pricing-feature ${feature.disabled ? 'ui-disabled' : ''} ${feature.highlight ? 'ui-highlight' : ''}`}>
            <Check size={18} style={{ color: feature.disabled ? '#333' : feature.highlight ? 'var(--accent-hover)' : 'var(--accent-color)', flexShrink: 0 }} />
            <span>{feature.text}</span>
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
        <button className="ui-btn" style={{
          width: '100%', padding: '1.1rem', borderRadius: '16px',
          background: isMaster ? 'rgba(255,255,255,0.05)' : isPopular ? 'var(--accent-color)' : isCurrentPlan ? 'rgba(255,255,255,0.08)' : isFree ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
          border: isPopular ? 'none' : '1px solid rgba(255,255,255,0.1)',
          color: (isFree || isMaster || isCurrentPlan) ? 'var(--text-secondary)' : 'white',
          fontWeight: '700',
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.2s ease',
          boxShadow: (isPopular && !isCurrentPlan) ? '0 10px 20px var(--accent-glow)' : 'none',
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
    </div>
  );
}
