import React, { useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

const Toast = ({ toast, onClose }) => {
    const { id, type, message, duration = 5000 } = toast;

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose(id);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, onClose]);

    const config = {
        success: {
            icon: CheckCircle2,
            bgColor: 'bg-green-50',
            iconColor: 'text-green-600',
            textColor: 'text-green-700',
            borderColor: 'border-green-200',
            bottomBar: 'bg-green-600',
            closeColor: 'text-green-600 hover:text-green-700'
        },
        error: {
            icon: XCircle,
            bgColor: 'bg-red-50',
            iconColor: 'text-red-600',
            textColor: 'text-red-700',
            borderColor: 'border-red-200',
            bottomBar: 'bg-red-600',
            closeColor: 'text-red-600 hover:text-red-700'
        },
        warning: {
            icon: AlertTriangle,
            bgColor: 'bg-yellow-50',
            iconColor: 'text-yellow-600',
            textColor: 'text-yellow-700',
            borderColor: 'border-yellow-200',
            bottomBar: 'bg-yellow-600',
            closeColor: 'text-yellow-600 hover:text-yellow-700'
        },
        info: {
            icon: Info,
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-600',
            textColor: 'text-blue-700',
            borderColor: 'border-blue-200',
            bottomBar: 'bg-blue-600',
            closeColor: 'text-blue-600 hover:text-blue-700'
        }
    };

    const style = config[type] || config.info;
    const Icon = style.icon;

    return (
        <div
            className={`relative flex items-center gap-3 rounded-lg border ${style.borderColor} ${style.bgColor} p-4 shadow-lg min-w-[300px] max-w-[500px]`}
        >
            <div className={`flex-shrink-0 ${style.iconColor}`}>
                <Icon className="h-5 w-5" />
            </div>
            <p className={`flex-1 text-sm font-medium ${style.textColor}`}>
                {message}
            </p>
            <button
                onClick={() => onClose(id)}
                className={`flex-shrink-0 ${style.closeColor} transition-colors`}
                aria-label="Close notification"
            >
                <X className="h-4 w-4" />
            </button>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${style.bottomBar} rounded-b-lg`}></div>
        </div>
    );
};

export default Toast;

