import Link from "next/link";

export default function StatCard({ title, value, description, valueColor, actionButton, actionHref, compact, icon: Icon }) {
  const ButtonContent = (
    <button className="ui-btn" style={{ marginTop: "1rem", width: '100%', height: '42px', padding: 0 }}>
      {actionButton}
    </button>
  );

  return (
    <div className="ui-card">
      <div className="ui-card-glow"></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {Icon && <div className="ui-stat-icon"><Icon size={18} /></div>}
          <span className="ui-stat-label">{title}</span>
        </div>
        {compact && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>}
      </div>
      <div className={`ui-stat-value ${compact ? 'ui-compact' : ''}`} style={valueColor ? { color: valueColor } : {}}>
        {value}
      </div>
      <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.5 }}>
        {description}
      </div>
      {actionButton && (
        actionHref ? (
          <Link href={actionHref} style={{ textDecoration: 'none' }}>
            {ButtonContent}
          </Link>
        ) : ButtonContent
      )}
    </div>
  );
}
