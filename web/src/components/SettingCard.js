
export default function SettingCard({ title, description, icon: Icon, children, style }) {
  return (
    <div className="setting-card" style={style}>
      <div className="setting-card-header">
        <div className="setting-icon-wrapper">
          {Icon && <Icon size={20} />}
        </div>
        <div className="setting-text">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="setting-card-body">
        {children}
      </div>
      
      <style jsx>{`
        .setting-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(15px);
          position: relative;
        }
        
        .setting-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(123, 44, 191, 0.4);
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(123, 44, 191, 0.1);
        }
        
        .setting-card-header {
          display: flex;
          gap: 1.25rem;
          align-items: center;
        }
        
        .setting-icon-wrapper {
          background: rgba(123, 44, 191, 0.08);
          color: var(--accent-color);
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s;
          border: 1px solid rgba(123, 44, 191, 0.1);
        }

        .setting-card:hover .setting-icon-wrapper {
          background: var(--accent-color);
          color: white;
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 0 15px var(--accent-glow);
        }
        
        .setting-text h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }
        
        .setting-text p {
          margin: 4px 0 0 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
          font-weight: 500;
        }
        
        .setting-card-body {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
