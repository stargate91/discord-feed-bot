export default function UsageIndicator({ label, current, max, unit = "" }) {
  const percentage = Math.min(Math.round((current / max) * 100), 100);
  
  let color = "#7b2cbf"; // Standard accent
  if (percentage >= 100) color = "#ef4444";
  else if (percentage >= 80) color = "#f59e0b";

  return (
    <div style={{ marginBottom: '1.5rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600' }}>
        <span style={{ color: '#a0a0b0' }}>{label}</span>
        <span style={{ color: '#f8f8f8' }}>
          {current} / {max} {unit}
        </span>
      </div>
      
      <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div 
          style={{ 
            height: '100%', 
            borderRadius: '4px', 
            transition: 'width 0.5s ease',
            width: `${percentage}%`,
            background: color,
            boxShadow: `0 0 10px ${percentage >= 80 ? color : 'transparent'}`
          }}
        ></div>
      </div>
    </div>
  );
}
