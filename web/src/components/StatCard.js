export default function StatCard({ title, value, description, valueColor, actionButton }) {
  return (
    <div className="card">
      <div className="card-header">
        <span>{title}</span>
      </div>
      <div className="card-value" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </div>
      <div className="card-desc">
        {description}
      </div>
      {actionButton && (
        <button className="btn" style={{ marginTop: "1rem" }}>
          {actionButton}
        </button>
      )}
    </div>
  );
}
