import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

const Toast = ({ toast, onClose }) => {
    const { id, type, message, duration = 5000 } = toast;
    const [isHovered, setIsHovered] = useState(false);
    const [progress, setProgress] = useState(100);
    const timerRef = useRef(null);
    const progressRef = useRef(null);
    const startTimeRef = useRef(Date.now());
    const remainingTimeRef = useRef(duration);
    const isHoveredRef = useRef(false);

    useEffect(() => {
        if (duration > 0) {
            startTimer();
            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
                if (progressRef.current) clearInterval(progressRef.current);
            };
        }
    }, [id, duration, onClose]);

    const startTimer = () => {
        // Clear any existing timers
        if (timerRef.current) clearTimeout(timerRef.current);
        if (progressRef.current) clearInterval(progressRef.current);

        // Reset progress
        setProgress(100);
        startTimeRef.current = Date.now();
        remainingTimeRef.current = duration;

        // Update progress bar every 50ms for smooth animation
        progressRef.current = setInterval(() => {
            if (!isHoveredRef.current) {
                const elapsed = Date.now() - startTimeRef.current;
                const remaining = Math.max(0, remainingTimeRef.current - elapsed);
                const progressPercent = (remaining / duration) * 100;
                setProgress(progressPercent);

                if (remaining <= 0) {
                    onClose(id);
                }
            }
        }, 50);

        // Set timeout to close toast
        timerRef.current = setTimeout(() => {
            if (!isHoveredRef.current) {
                onClose(id);
            }
        }, remainingTimeRef.current);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        isHoveredRef.current = true;
        // Pause the timer by clearing it
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            // Calculate remaining time
            const elapsed = Date.now() - startTimeRef.current;
            remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        isHoveredRef.current = false;
        // Resume the timer with remaining time
        startTimeRef.current = Date.now();
        if (remainingTimeRef.current > 0) {
            timerRef.current = setTimeout(() => {
                if (!isHoveredRef.current) {
                    onClose(id);
                }
            }, remainingTimeRef.current);
        }
    };

    const config = {
        success: {
            icon: CheckCircle2,
            bgColor: 'bg-green-50',
            iconBgColor: 'bg-green-600',
            iconColor: 'text-white',
            textColor: 'text-gray-800',
            borderColor: 'border-green-200',
            progressBar: 'bg-green-600',
            closeColor: 'text-gray-400 hover:text-gray-600'
        },
        error: {
            icon: XCircle,
            bgColor: 'bg-red-50',
            iconBgColor: 'bg-red-600',
            iconColor: 'text-white',
            textColor: 'text-gray-800',
            borderColor: 'border-red-200',
            progressBar: 'bg-red-600',
            closeColor: 'text-gray-400 hover:text-gray-600'
        },
        warning: {
            icon: AlertTriangle,
            bgColor: 'bg-yellow-50',
            iconBgColor: 'bg-yellow-600',
            iconColor: 'text-white',
            textColor: 'text-gray-800',
            borderColor: 'border-yellow-200',
            progressBar: 'bg-yellow-600',
            closeColor: 'text-gray-400 hover:text-gray-600'
        },
        info: {
            icon: Info,
            bgColor: 'bg-blue-50',
            iconBgColor: 'bg-blue-600',
            iconColor: 'text-white',
            textColor: 'text-gray-800',
            borderColor: 'border-blue-200',
            progressBar: 'bg-blue-600',
            closeColor: 'text-gray-400 hover:text-gray-600'
        }
    };

    const style = config[type] || config.info;
    const Icon = style.icon;

    return (
        <div
            className={`relative flex items-start gap-3 rounded-lg border ${style.borderColor} ${style.bgColor} p-4 shadow-lg min-w-[350px] max-w-[550px] transition-all`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Content area with text and progress bar */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm ${style.textColor} mb-2`}>
                    {message}
                </p>
                {/* Progress bar showing remaining time */}
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${style.progressBar} transition-all ease-linear`}
                        style={{
                            width: `${progress}%`,
                            transitionDuration: isHovered ? '0ms' : '50ms'
                        }}
                    />
                </div>
            </div>
            
            {/* Close button */}
            <button
                onClick={() => onClose(id)}
                className={`flex-shrink-0 ${style.closeColor} transition-colors mt-0.5`}
                aria-label="Close notification"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};

export default Toast;

