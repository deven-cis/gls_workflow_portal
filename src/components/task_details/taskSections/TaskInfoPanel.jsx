"use client";
import { useRef, useState, useEffect } from 'react';
import { MapPin, Clock, MoreVertical, Trash2 } from 'lucide-react';
import AssigneeSection from './AssigneeSection';
import { useEffectiveJobNo } from '@/hooks/useJobContext';

// Status configuration mapping
const statusConfig = {
    'completed': {
        style: 'bg-green-100 text-green-700',
        display: 'Completed'
    },
    'session started': {
        style: 'bg-orange-50 text-orange-600',
        display: 'Session Started'
    },
    'scheduled': {
        style: 'bg-gray-100 text-gray-600',
        display: 'Scheduled'
    },
    'session not started': {
        style: 'bg-gray-100 text-gray-600',
        display: 'Session not Started'
    },
    'cancelled': {
        style: 'bg-red-100 text-red-700',
        display: 'Cancelled'
    }
};

// Normalize status key
const normalizeStatus = (status) => {
    if (!status) return 'scheduled';
    const normalized = status.toLowerCase().trim().replace(/[_-]/g, ' ');
    return normalized;
};

// Get status badge styling
const getStatusBadgeStyle = (status) => {
    const normalized = normalizeStatus(status);
    const config = statusConfig[normalized] || statusConfig.scheduled;
    return config.style;
};

// Get display text for status
const getStatusDisplayText = (status) => {
    const normalized = normalizeStatus(status);
    const config = statusConfig[normalized] || statusConfig.scheduled;
    return config.display;
};

export default function TaskInfoPanel({
    task,
    jobNo: jobNoProp,
    isUpcomingTask,
    sessionStarted,
    sessionStartTime,
    sessionDuration,
    onStartSession,
    onCancelJob,
    toast
}) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    console.log('task-------------------', task);
    // Get effective jobNo from prop, query params, or URL path
    const jobNo = useEffectiveJobNo(jobNoProp);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    // Check if task is completed
    const isCompleted = task?.status === 'Completed' || 
                       (task?.status && task.status.toLowerCase().includes('completed'));

    if (!task) {
        return (
            <div className="w-full md:w-96 bg-white border-r border-gray-200 p-6 overflow-y-auto">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full md:w-96 bg-white border-r border-gray-200 p-6 overflow-y-auto">
            {/* Status Badge & Menu */}
            <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 text-sm font-medium rounded-lg ${getStatusBadgeStyle(task.status)}`}>
                    {getStatusDisplayText(task.status)}
                </span>
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showMenu && (
                        <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]">
                            <button
                                onClick={() => {
                                    setShowMenu(false);
                                    onCancelJob?.();
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Cancel Job</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Task Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {task.type ? `${task.type}: ` : ''}{task.title}
            </h2>

            {/* Location and Time */}
            <div className="space-y-3 mb-6">
                {task.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-5 h-5" />
                        <span className="text-sm">{task.location}</span>
                    </div>
                )}
                {task.platform && (
                    <div className="flex items-center gap-2 text-blue-600">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.47l-5.894 3.4-5.894-3.4V9.53l5.894-3.4 5.894 3.4v4.94z" />
                        </svg>
                        <span className="text-sm">{task.platform}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm">
                        {task.date ? `${task.date}, ` : ''}{task.time || 'Time not specified'}
                    </span>
                </div>
            </div>

            {/* Session Button */}
            {isCompleted ? (
                <button 
                    disabled
                    className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg mb-6 cursor-not-allowed opacity-100"
                >
                    Completed
                </button>
            ) : sessionStarted ? (
                <button 
                    onClick={onStartSession}
                    disabled={isUpcomingTask}
                    className={`w-full font-semibold py-3 rounded-lg transition-colors mb-6 ${
                        isUpcomingTask
                            ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                >
                    End Session ({sessionDuration})
                </button>
            ) : (
                <button 
                    onClick={onStartSession}
                    disabled={isUpcomingTask}
                    className={`w-full font-semibold py-3 rounded-lg transition-colors mb-6 ${
                        isUpcomingTask
                            ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    Start Session
                </button>
            )}

            {/* Assignee Section */}
            <AssigneeSection
                jobNo={jobNo}
                toast={toast}
                isUpcomingTask={isUpcomingTask}
                sessionStartTime={sessionStartTime}
            />
        </div>
    );
}

