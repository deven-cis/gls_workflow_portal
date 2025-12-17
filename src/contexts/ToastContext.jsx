"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '@/components/common/Toast';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((type, message, duration = 5000) => {
        const id = Date.now() + Math.random();
        const newToast = { id, type, message, duration };
        setToasts((prev) => [...prev, newToast]);
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const success = useCallback((message, duration) => showToast('success', message, duration), [showToast]);
    const error = useCallback((message, duration) => showToast('error', message, duration), [showToast]);
    const warning = useCallback((message, duration) => showToast('warning', message, duration), [showToast]);
    const info = useCallback((message, duration) => showToast('info', message, duration), [showToast]);

    return (
        <ToastContext.Provider value={{ success, error, warning, info }}>
            {children}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
                {toasts.map((toast) => (
                    <Toast key={toast.id} toast={toast} onClose={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

