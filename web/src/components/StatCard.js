import Link from "next/link";

export default function StatCard({ title, value, description, valueColor, actionButton, actionHref, compact, icon: Icon }) {
  const ButtonContent = (
    <button className="btn" style={{ marginTop: "1rem", width: '100%' }}>
      {actionButton}
    </button>
  );

  return (
    <div className={`card stat-card ${compact ? 'compact' : ''}`}>
      <div className="card-glow"></div>
      <div className="card-header">
        <div className="card-title-group">
          {Icon && <div className="card-icon"><Icon size={16} /></div>}
          <span>{title}</span>
        </div>
        {compact && <div className="status-indicator"></div>}
      </div>
      <div className={`card-value ${compact ? 'compact-value' : ''}`} style={valueColor ? { color: valueColor } : {}}>
        {value}
      </div>
      <div className="card-desc">
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
