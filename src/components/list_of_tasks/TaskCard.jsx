"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, MoreVertical, Trash2 } from 'lucide-react';
import CancelJobModal from '@/components/common/CancelJobModal';
import { ROUTES, createNavigationHelper } from '@/lib/routes';

// Session status constants - using Sets for O(1) lookup
const SESSION_STARTED_STATUSES = new Set(['Session Started', 'SESSION_IN_PROGRESS', 'SESSION_STARTED']);
const SESSION_NOT_STARTED_STATUSES = new Set(['Session not started', 'SESSION_NOT_STARTED', 'SCHEDULED']);

// Month name map for O(1) lookup
const MONTH_MAP = new Map([
    ['jan', 0], ['feb', 1], ['mar', 2], ['apr', 3], ['may', 4], ['jun', 5],
    ['jul', 6], ['aug', 7], ['sep', 8], ['oct', 9], ['nov', 10], ['dec', 11]
]);

// Parse time string to hours and minutes
const parseTime = (timeStr) => {
    if (!timeStr || timeStr === '00:00') return null;
    
    // 12-hour format: "6:30 PM"
    const match12h = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match12h) {
        let hours = parseInt(match12h[1], 10);
        const minutes = parseInt(match12h[2], 10);
        const period = match12h[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return { hours, minutes };
    }
    
    // 24-hour format: "18:30"
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return { hours, minutes };
};

// Parse date string like "Dec 31" with year to Date object
const parseJobDate = (dateStr, year) => {
    if (!dateStr || !year) return null;
    
    try {
        const match = dateStr.match(/(\w+)\s+(\d+)/);
        if (!match) return null;
        
        const monthStr = match[1].toLowerCase();
        const day = parseInt(match[2], 10);
        const monthIndex = MONTH_MAP.get(monthStr);
        
        if (monthIndex === undefined || isNaN(day) || day < 1 || day > 31) return null;
        
        return new Date(year, monthIndex, day);
    } catch (e) {
        console.error('Error parsing job date:', e);
        return null;
    }
};

// Check if job date is today
const isJobDateToday = (dateStr, year) => {
    const jobDate = parseJobDate(dateStr, year);
    if (!jobDate) return false;
    
    const now = new Date();
    return jobDate.getDate() === now.getDate() &&
           jobDate.getMonth() === now.getMonth() &&
           jobDate.getFullYear() === now.getFullYear();
};

// Calculate remaining time until deadline
const calculateDeadline = (endTime, jobDateStr, year) => {
    // Only calculate deadline if job date is today
    if (!isJobDateToday(jobDateStr, year)) return null;
    
    const parsed = parseTime(endTime);
    if (!parsed) return null;
    
    const jobDate = parseJobDate(jobDateStr, year);
    if (!jobDate) return null;
    
    const now = Date.now();
    const deadline = new Date(jobDate);
    deadline.setHours(parsed.hours, parsed.minutes, 0, 0);
    
    const diffMs = deadline.getTime() - now;
    if (diffMs <= 0) return null;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}hrs ${minutes} min`;
};

// Status badge component (memoized for performance)
const StatusBadge = ({ status }) => {
    if (SESSION_STARTED_STATUSES.has(status)) {
        return <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded-2xl">Session Started</span>;
    }
    if (SESSION_NOT_STARTED_STATUSES.has(status)) {
        return <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-2xl">Session not Started</span>;
    }
    return null;
};

// Format video_status object to string for tooltip
const formatVideoStatus = (videoStatus) => {
    if (!videoStatus || typeof videoStatus !== 'object') return '';
    
    return Object.entries(videoStatus)
        .map(([name, status]) => `${name} ${status}`)
        .join(', ');
};

// Video Pending badge component with hover tooltip
const VideoPendingBadge = ({ isActive, videoStatus }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const videoPendingData = formatVideoStatus(videoStatus);
    
    // Only render if videoStatus exists
    if (!videoStatus || typeof videoStatus !== 'object' || Object.keys(videoStatus).length === 0) {
        return null;
    }
    
    return (
        <div 
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <span className="px-3 py-1 bg-pink-50 text-red-600 text-xs font-semibold rounded-2xl cursor-pointer hover:bg-pink-100 transition-colors ring-1 ring-red-200/50 shadow-sm">
                Videos Pending
            </span>
            {showTooltip && videoPendingData && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-gray-100 border border-gray-300 text-gray-900 text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                    {videoPendingData}
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-100 border-r border-b border-gray-300 rotate-45"></div>
                </div>
            )}
        </div>
    );
};

export default function TaskCard({ task, isHighlighted = false, isSelected = false, onSelect, isUpcoming = false, onCancelJob }) {
    const router = useRouter();
    const navigate = useMemo(() => createNavigationHelper(router), [router]);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [liveDeadline, setLiveDeadline] = useState(null);
    const menuRef = useRef(null);
    // Computed styles based on selection state
    const isActive = isHighlighted || isSelected;
    const styles = useMemo(() => ({
        text: isActive ? 'text-white' : 'text-gray-900',
        textMuted: isActive ? 'text-blue-100' : 'text-gray-600',
        textSubtle: isActive ? 'text-blue-100' : 'text-gray-500',
        badge: isActive ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-700',
        uploadBadge: isActive ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-700',
    }), [isActive]);
    
    // Check if session is started (using Set for O(1) lookup)
    const isSessionStarted = SESSION_STARTED_STATUSES.has(task.status);
    
    // Live deadline updates - only show if job date is today
    useEffect(() => {
        // Only show deadline if job date is today
        if (!isSessionStarted || !task.endTime || isUpcoming || !isJobDateToday(task.date, task.jobYear)) {
            setLiveDeadline(null);
            return;
        }
        
        const updateDeadline = () => setLiveDeadline(calculateDeadline(task.endTime, task.date, task.jobYear));
        updateDeadline();
        
        // Update every minute to keep deadline accurate
        const interval = setInterval(updateDeadline, 60000);
        return () => clearInterval(interval);
    }, [task.endTime, task.date, task.jobYear, isSessionStarted, isUpcoming]);

    // Memoize callbacks to prevent unnecessary re-renders
    const handleCardClick = useCallback((event) => {
        // Save scroll positions BEFORE state update to prevent scroll reset
        const cardElement = event?.currentTarget;
        if (cardElement) {
            // Find the scrollable container (ScrollableSection)
            let scrollContainer = cardElement.closest('[class*="max-h-"]');
            if (scrollContainer) {
                const scrollTop = scrollContainer.scrollTop;
                const sectionAttr = scrollContainer.getAttribute('data-section');
                // Store in a global ref accessible by ScrollableSection
                // window.__scrollPositionRef is the ref object, so we need to set .current
                if (window.__scrollPositionRef && sectionAttr) {
                    window.__scrollPositionRef.current[sectionAttr] = scrollTop;
                }
            }
        }
        
        onSelect?.(task.id);
        if (isSelected && task.caseInfo?.id) {
            navigate.toTaskDetails(task.caseInfo.id, { jobId: task.id });
        }
    }, [task.id, task.caseInfo?.id, isSelected, onSelect, navigate]);

    const handleMoreClick = useCallback((e) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
    }, [showMenu]);

    const handleCancelJobClick = useCallback((e) => {
        e.stopPropagation();
        setShowMenu(false);
        setShowCancelModal(true);
    }, []);

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

    const handleCancelConfirm = useCallback(async (cancelData) => {
        await onCancelJob?.(task.id, cancelData);
        setShowCancelModal(false);
    }, [task.id, onCancelJob]);

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
                            {!isUpcoming && task.video_status && SESSION_NOT_STARTED_STATUSES.has(task.status) && (
                                <VideoPendingBadge isActive={isActive} videoStatus={task.video_status} />
                            )}
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
                            <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={handleMoreClick}
                                    className={`p-1 hover:bg-gray-100/10 rounded transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`}
                                    aria-label="More options"
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                                
                                {/* Dropdown Menu */}
                                {showMenu && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setShowMenu(false)} 
                                        />
                                        <div className={`absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] ${isActive ? 'bg-white' : 'bg-white'}`}>
                                            <button
                                                onClick={handleCancelJobClick}
                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                <span>Cancel Job</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
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
