"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, MoreVertical } from 'lucide-react';
import CancelJobModal from '@/components/common/CancelJobModal';

// Session status constants
const SESSION_STARTED_STATUSES = ['Session Started', 'SESSION_IN_PROGRESS', 'SESSION_STARTED'];
const SESSION_NOT_STARTED_STATUSES = ['Session not started', 'SESSION_NOT_STARTED', 'SCHEDULED'];

// Parse time string to hours and minutes
const parseTime = (timeStr) => {
    if (!timeStr || timeStr === '00:00') return null;
    
    // 12-hour format: "6:30 PM"
    const match12h = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match12h) {
        let hours = parseInt(match12h[1]);
        const minutes = parseInt(match12h[2]);
        const period = match12h[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return { hours, minutes };
    }
    
    // 24-hour format: "18:30"
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
};

// Calculate remaining time until deadline
const calculateDeadline = (endTime) => {
    const parsed = parseTime(endTime);
    if (!parsed) return null;
    
    const now = new Date();
    const deadline = new Date();
    deadline.setHours(parsed.hours, parsed.minutes, 0, 0);
    
    const diffMs = deadline - now;
    if (diffMs <= 0) return null;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}hrs ${minutes} min`;
};

// Status badge component
const StatusBadge = ({ status }) => {
    if (SESSION_STARTED_STATUSES.includes(status)) {
        return <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded-2xl">Session Started</span>;
    }
    if (SESSION_NOT_STARTED_STATUSES.includes(status)) {
        return <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-2xl">Session not Started</span>;
    }
    return null;
};

export default function TaskCard({ task, isHighlighted = false, isSelected = false, onSelect, isUpcoming = false, onCancelJob }) {
    const router = useRouter();
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [liveDeadline, setLiveDeadline] = useState(null);
    
    // Computed styles based on selection state
    const isActive = isHighlighted || isSelected;
    const styles = useMemo(() => ({
        text: isActive ? 'text-white' : 'text-gray-900',
        textMuted: isActive ? 'text-blue-100' : 'text-gray-600',
        textSubtle: isActive ? 'text-blue-100' : 'text-gray-500',
        badge: isActive ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-700',
        uploadBadge: isActive ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-700',
    }), [isActive]);
    
    // Check if session is started
    const isSessionStarted = SESSION_STARTED_STATUSES.includes(task.status);
    
    // Live deadline updates
    useEffect(() => {
        if (!isSessionStarted || !task.endTime || isUpcoming) {
            setLiveDeadline(null);
            return;
        }
        
        const updateDeadline = () => setLiveDeadline(calculateDeadline(task.endTime));
        updateDeadline();
        
        const interval = setInterval(updateDeadline, 60000);
        return () => clearInterval(interval);
    }, [task.endTime, isSessionStarted, isUpcoming]);

    const handleCardClick = () => {
        onSelect?.(task.id);
        if (isSelected) {
            router.push(`/dashboard/task-details/${task.caseInfo?.id}?jobId=${task.id}`);
        }
    };

    const handleMoreClick = (e) => {
        e.stopPropagation();
        setShowCancelModal(true);
    };

    const handleCancelConfirm = async (cancelData) => {
        await onCancelJob?.(task.id, cancelData);
        setShowCancelModal(false);
    };

    return (
        <>
            <div
                onClick={handleCardClick}
                className={`
                    ${isActive ? 'bg-blue-500 text-white border-blue-600' : 'bg-white border-gray-200'} 
                    ${isSelected ? 'ring-2 ring-blue-600 scale-[1.01]' : ''} 
                    rounded-lg p-4 md:p-5 shadow-sm border hover:shadow-md transition-all cursor-pointer
                `}
            >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Date/Time */}
                    <div className={`flex-shrink-0 ${styles.text} ${isSelected ? 'text-base font-semibold' : ''}`}>
                        <div className={`${isSelected ? 'text-base' : 'text-sm'} font-medium`}>{task.date}</div>
                        <div className={`${isSelected ? 'text-base' : 'text-sm'} font-medium`}>{task.startTime}</div>
                    </div>

                    {/* Task Details */}
                    <div className="flex-1 min-w-0">
                        <h3 className={`${isSelected ? 'text-xl md:text-2xl' : 'text-base md:text-lg'} font-bold mb-2 ${styles.text}`}>
                            {task.type}: {task.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                            {task.location && (
                                <div className={`flex items-center gap-1 ${styles.textMuted}`}>
                                    <MapPin className="w-4 h-4 flex-shrink-0" />
                                    <span>{task.location}</span>
                                </div>
                            )}
                            {task.platform && (
                                <div className={`flex items-center gap-1 ${isActive ? 'text-blue-100' : 'text-blue-600'}`}>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.47l-5.894 3.4-5.894-3.4V9.53l5.894-3.4 5.894 3.4v4.94z" />
                                    </svg>
                                    <span>{task.platform}</span>
                                </div>
                            )}
                            {task.jobId && (
                                <span className={`${styles.badge} px-2 py-1 rounded-2xl text-xs`}>
                                    {task.jobId}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-3">
                            {!isUpcoming && task.status && <StatusBadge status={task.status} />}
                            {task.uploadProgress && (
                                <span className={`text-xs ${styles.uploadBadge} px-2 py-1 rounded-2xl`}>
                                    {task.uploadProgress}
                                </span>
                            )}
                            {task.jobId && (
                                <span className={`text-xs md:text-sm ${styles.textSubtle} hidden md:inline`}>
                                    {task.jobId}
                                </span>
                            )}
                            <button
                                onClick={handleMoreClick}
                                className={`p-1 hover:bg-gray-100/10 rounded transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`}
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>
                        {liveDeadline && (
                            <div className={`flex items-center gap-1 text-xs ${styles.textSubtle}`}>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Deadline: <span className={isActive ? 'text-blue-100' : 'text-red-500'}>{liveDeadline}</span></span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <CancelJobModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleCancelConfirm}
                jobId={task.jobId}
            />
        </>
    );
}
