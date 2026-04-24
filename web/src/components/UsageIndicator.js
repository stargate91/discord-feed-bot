"use client";

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
      
      <div style={{ 
        height: '10px', 
        background: 'rgba(255, 255, 255, 0.03)', 
        borderRadius: '10px', 
        overflow: 'hidden', 
        border: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'relative'
      }}>
        <div 
          style={{ 
            height: '100%', 
            borderRadius: '10px', 
            transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
            width: `${percentage}%`,
            background: percentage >= 100 ? 'linear-gradient(90deg, #ef4444, #b91c1c)' : `linear-gradient(90deg, ${color} 0%, var(--accent-hover) 100%)`,
            boxShadow: `0 0 20px ${percentage >= 80 ? color : 'rgba(123, 44, 191, 0.4)'}`,
            position: 'relative'
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            animation: 'shimmer 1.5s infinite linear'
          }}></div>
        </div>
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
