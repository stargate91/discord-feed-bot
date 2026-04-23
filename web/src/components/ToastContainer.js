"use client";

import React from 'react';
import { useToast } from '@/context/ToastContext';
import { X, CheckCircle, AlertCircle, Info, Bell } from 'lucide-react';

const ToastItem = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle className="toast-icon success" size={20} />;
      case 'error': return <AlertCircle className="toast-icon error" size={20} />;
      case 'warning': return <AlertCircle className="toast-icon warning" size={20} />;
      case 'activity': return <Bell className="toast-icon activity" size={20} />;
      default: return <Info className="toast-icon info" size={20} />;
    }
  };

  return (
    <div className={`toast-card ${toast.type}`}>
      <div className="toast-content">
        {getIcon()}
        <div className="toast-text">
          {toast.title && <div className="toast-title">{toast.title}</div>}
          <div className="toast-message">{toast.message}</div>
        </div>
      </div>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>
        <X size={16} />
      </button>
      <div className="toast-progress"></div>
    </div>
  );
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}

      <style jsx global>{`
        .toast-container {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          z-index: 10000;
          pointer-events: none;
        }

        .toast-card {
          pointer-events: auto;
          min-width: 320px;
          max-width: 420px;
          background: rgba(15, 15, 25, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          animation: toastSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        @keyframes toastSlideIn {
          from { transform: translateX(100%) scale(0.9); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }

        .toast-content {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .toast-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .toast-icon.success { color: #10b981; }
        .toast-icon.error { color: #ef4444; }
        .toast-icon.warning { color: #f59e0b; }
        .toast-icon.info { color: #3b82f6; }
        .toast-icon.activity { color: var(--accent-color); }

        .toast-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .toast-title {
          font-weight: 800;
          font-size: 0.95rem;
          color: white;
          letter-spacing: 0.3px;
        }

        .toast-message {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .toast-close {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .toast-close:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          width: 100%;
        }

        .toast-card::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: var(--accent-color);
          width: 100%;
          animation: toastProgress 5s linear forwards;
          transform-origin: left;
        }

        .toast-card.success::after { background: #10b981; }
        .toast-card.error::after { background: #ef4444; }

        @keyframes toastProgress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
