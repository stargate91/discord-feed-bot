"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [successOverlay, setSuccessOverlay] = useState(false);

  const addToast = useCallback((message, type = 'info', title = '') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, title };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const showSuccess = useCallback(() => {
    setSuccessOverlay(true);
    setTimeout(() => setSuccessOverlay(false), 2000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, showSuccess, toasts, successOverlay }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
