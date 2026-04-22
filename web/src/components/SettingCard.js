
export default function SettingCard({ title, description, icon: Icon, children }) {
  return (
    <div className="setting-card">
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
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        
        .setting-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(123, 44, 191, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        .setting-card-header {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        
        .setting-icon-wrapper {
          background: rgba(123, 44, 191, 0.1);
          color: var(--accent-color);
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .setting-text h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
        }
        
        .setting-text p {
          margin: 0.25rem 0 0 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        
        .setting-card-body {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
