"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { assigneeAPI } from '@/services/assignee_apis';
import { useEffectiveJobNo } from '@/hooks/useJobContext';
import ReassignmentModal from './ReassignmentModal';
import { ROUTES } from '@/lib/routes';
import { formatInTimezone, getClientTimezone, convertToTimezone, BACKEND_TIMEZONE } from '@/lib/timezone_util';

// Format date and time as "MMM DD, h:mm am/pm" with capitalized month
const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
        const timezone = getClientTimezone();
        // Convert to client timezone
        const converted = convertToTimezone(dateString, timezone, BACKEND_TIMEZONE);
        if (converted) {
            const formatted = converted.toFormat('MMM dd, h:mm a');
            // Split by comma to separate date and time
            const parts = formatted.split(', ');
            if (parts.length === 2) {
                // Keep month capitalized, lowercase time
                return `${parts[0]}, ${parts[1].toLowerCase()}`;
            }
            return formatted;
        }
        // Fallback if conversion fails
        const formatted = formatInTimezone(dateString, timezone, 'MMM dd, h:mm a');
        const parts = formatted.split(', ');
        if (parts.length === 2) {
            return `${parts[0]}, ${parts[1].toLowerCase()}`;
        }
        return formatted;
    } catch (error) {
        // Fallback to basic formatting
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        }).toLowerCase();
        return `${dateStr}, ${timeStr}`;
    }
};

export default function AssigneeSection({ jobNo: jobNoProp, toast, isUpcomingTask = false, sessionStartTime }) {
    const router = useRouter();
    const jobNo = useEffectiveJobNo(jobNoProp);
    const dropdownRef = useRef(null);
    
    const [currentUser, setCurrentUser] = useState(null);
    const [assignees, setAssignees] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAssignee, setSelectedAssignee] = useState(null);
    const [isReassigning, setIsReassigning] = useState(false);

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const data = await assigneeAPI.getAvailableAssignees();
                const current = data.find(u => u.is_current_resource);
                setCurrentUser(current || data[0] || null);
                setAssignees(data);
            } catch (err) {
                console.error('Failed to fetch assignees:', err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (!isDropdownOpen) return;
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    const otherAssignees = assignees
        .filter(a => !a.is_current_resource)
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleSelect = (assignee) => {
        setSelectedAssignee(assignee);
        setIsDropdownOpen(false);
    };

    const handleReassign = async (reason) => {
        if (!selectedAssignee || !jobNo) {
            toast?.error('Missing job or assignee information');
            return;
        }
        setIsReassigning(true);
        try {
            const response = await assigneeAPI.reassignJob(jobNo, selectedAssignee.rsrc_no, reason);
            console.log('response', response);
            if (response.success) {
                toast?.success(`Job reassigned to ${selectedAssignee.name}`);
                setSelectedAssignee(null);
                router.push(ROUTES.DASHBOARD.LIST_OF_TASKS);
            } else {
                toast?.error('Failed to reassign job');
            }
        } catch (err) {
            toast?.error('Failed to reassign job');
        } finally {
            setIsReassigning(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
                <div className="h-12 bg-gray-200 rounded" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Assignee</h4>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => !isUpcomingTask && setIsDropdownOpen(!isDropdownOpen)}
                        disabled={isUpcomingTask}
                        className={`w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg ${
                            isUpcomingTask ? 'opacity-60 cursor-not-allowed' : 'hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            {currentUser?.avatar_url ? (
                                <img src={currentUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-700">
                                        {getInitials(currentUser?.name || 'NA')}
                                    </span>
                                </div>
                            )}
                            <span className="text-sm font-medium text-gray-900">
                                {currentUser?.name || 'No assignee'}
                                {currentUser?.is_current_user && ' (me)'}
                            </span>
                        </div>
                        <Search className="w-4 h-4 text-gray-400" />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
                                Select Assignee
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {otherAssignees.length > 0 ? (
                                otherAssignees.map((assignee, index) => {
                                    const safeKey = assignee.rsrc_no || assignee.name || `assignee-${index}`;
                                    return (
                                        <button
                                            key={safeKey}
                                            onClick={() => handleSelect(assignee)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left"
                                        >
                                            {assignee.avatar_url ? (
                                                <img src={assignee.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-amber-700">
                                                        {getInitials(assignee.name)}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="text-sm font-medium text-gray-900">{assignee.name}</span>
                                        </button>
                                    );
                                })
                                ) : (
                                    <div className="px-3 py-4 text-sm text-gray-500 text-center">No assignees found</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Activity</h4>
                    {sessionStartTime ? (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Session start time</span>
                            <span className="text-sm text-gray-900 font-medium">{formatTime(sessionStartTime)}</span>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">No activity yet</p>
                    )}
                </div>
            </div>

            <ReassignmentModal
                isOpen={!!selectedAssignee}
                onClose={() => setSelectedAssignee(null)}
                onConfirm={handleReassign}
                selectedAssignee={selectedAssignee}
                isLoading={isReassigning}
            />
        </>
    );
}
