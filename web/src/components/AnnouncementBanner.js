"use client";

import { useState, useEffect } from "react";
import { Info, AlertTriangle, AlertCircle, X, Megaphone } from "lucide-react";

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [closedIds, setClosedIds] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) return;
        
        const data = await res.json();
        if (Array.isArray(data)) setAnnouncements(data);
      } catch (error) {
        console.error("Failed to fetch announcements:", error);
      }
    };
    fetchAnnouncements();
  }, []);

  const closeAnnouncement = (id) => {
    setClosedIds([...closedIds, id]);
  };

  const activeAnnouncements = announcements.filter(a => !closedIds.includes(a.id));

  if (activeAnnouncements.length === 0) return null;

  return (
    <div className="announcements-container">
      {activeAnnouncements.map((a) => (
        <div key={a.id} className={`announcement-banner ${a.type}`}>
          <div className="banner-content">
            <div className="icon-wrapper">
              {a.type === 'danger' && <AlertCircle size={20} />}
              {a.type === 'warning' && <AlertTriangle size={20} />}
              {a.type === 'info' && <Megaphone size={20} />}
            </div>
            <div className="text-wrapper">
              <span className="banner-title">{a.title}</span>
              <p className="banner-text">{a.content}</p>
            </div>
          </div>
          <button className="close-btn" onClick={() => closeAnnouncement(a.id)}>
            <X size={18} />
          </button>
        </div>
      ))}

      <style jsx>{`
        .announcements-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 2rem;
          width: 100%;
          animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .announcement-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-radius: 16px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
        }

        .announcement-banner.info {
          background: rgba(30, 58, 138, 0.9);
          border-color: #3b82f6;
          color: #dbeafe;
        }

        .announcement-banner.warning {
          background: rgba(120, 53, 15, 0.9);
          border-color: #f59e0b;
          color: #fef3c7;
        }

        .announcement-banner.danger {
          background: rgba(153, 27, 27, 0.9);
          border-color: #ef4444;
          color: #fee2e2;
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 15px;
          flex: 1;
        }

        .icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
        }

        .text-wrapper {
          display: flex;
          flex-direction: column;
        }

        .banner-title {
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .banner-text {
          margin: 4px 0 0 0;
          font-size: 0.9rem;
          opacity: 0.8;
          line-height: 1.4;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: currentColor;
          opacity: 0.5;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          opacity: 1;
          background: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}
