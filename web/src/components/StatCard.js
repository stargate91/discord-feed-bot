import Link from "next/link";

export default function StatCard({ title, value, description, valueColor, actionButton, actionHref, compact }) {
  const ButtonContent = (
    <button className="btn" style={{ marginTop: "1rem", width: '100%' }}>
      {actionButton}
    </button>
  );

  return (
    <div className={`card ${compact ? 'compact' : ''}`}>
      <div className="card-header">
        <span>{title}</span>
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
