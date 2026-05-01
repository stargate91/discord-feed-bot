"use client";

import React from 'react';
import { useToast } from '@/context/ToastContext';
import { X, CheckCircle, AlertCircle, Info, Bell } from 'lucide-react';

const ToastItem = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle className="ui-toast-icon-success" size={20} />;
      case 'error': return <AlertCircle className="ui-toast-icon-error" size={20} />;
      case 'warning': return <AlertCircle className="ui-toast-icon-warning" size={20} />;
      case 'activity': return <Bell className="ui-toast-icon-activity" size={20} />;
      default: return <Info className="ui-toast-icon-info" size={20} />;
    }
  };

  return (
    <div className={`ui-toast-card ui-toast-${toast.type}`}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0, marginTop: '2px' }}>{getIcon()}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {toast.title && <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'white', letterSpacing: '0.3px' }}>{toast.title}</div>}
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{toast.message}</div>
        </div>
      </div>
      <button 
        style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.3)', cursor: 'pointer', padding: '4px', borderRadius: '8px', transition: 'all 0.2s' }} 
        onClick={() => onRemove(toast.id)}
      >
        <X size={16} />
      </button>
      <div className="ui-toast-progress"></div>
    </div>
  );
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="ui-toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
