"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, MoreVertical } from 'lucide-react';
import CancelJobModal from '@/components/common/CancelJobModal';

export default function TaskCard({ task, isHighlighted = false, isSelected = false, onSelect, isUpcoming = false, onCancelJob }) {
    const router = useRouter();
    const [showCancelModal, setShowCancelModal] = useState(false);

    const getStatusBadge = () => {
        // Don't show session status for upcoming tasks
        if (isUpcoming) {
            return null;
        }
        
        switch (task.status) {
            case 'Session Started':
                return <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded-2xl">Session Started</span>;
            case 'Session not Started':
                return <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-2xl">Session not Started</span>;
            default:
                return null;
        }
    };

    const handleMoreClick = (e) => {
        e.stopPropagation();
        setShowCancelModal(true);
    };

    const handleCancelConfirm = async (cancelData) => {
        if (onCancelJob) {
            await onCancelJob(task.id, cancelData);
        }
        setShowCancelModal(false);
    };

    const handleCardClick = () => {
        onSelect && onSelect(task.id);
        if (isSelected) {
            router.push(`/dashboard/task-details/${task.caseInfo?.id}?jobId=${task.id}`);
        }
    };

    return (
        <>
            <div
                onClick={handleCardClick}
                className={`
                    ${isHighlighted && !isSelected ? 'bg-blue-500 text-white' : isSelected ? 'bg-blue-500 text-white' : 'bg-white'} 
                    ${isSelected ? 'ring-2 ring-blue-600 scale-[1.01]' : ''} 
                    rounded-lg p-4 md:p-5 shadow-sm border 
                    ${isHighlighted || isSelected ? 'border-blue-600' : 'border-gray-200'} 
                    hover:shadow-md transition-all cursor-pointer
                `}
            >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Date/Time Column */}
                <div className={`flex-shrink-0 ${isHighlighted || isSelected ? 'text-white' : 'text-gray-900'} ${isSelected ? 'text-base font-semibold' : ''}`}>
                    <div className={`${isSelected ? 'text-base' : 'text-sm'} font-medium`}>{task.date}</div>
                    <div className={`${isSelected ? 'text-base' : 'text-sm'} font-medium`}>{task.time}</div>
                </div>

                {/* Task Details Column */}
                <div className="flex-1 min-w-0">
                    <h3 className={`${isSelected ? 'text-xl md:text-2xl' : 'text-base md:text-lg'} font-bold mb-2 ${isHighlighted || isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {task.type}: {task.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                        {task.location && (
                            <div className={`flex items-center gap-1 ${isHighlighted || isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span>{task.location}</span>
                            </div>
                        )}
                        {task.platform && (
                            <div className={`flex items-center gap-1 ${isHighlighted || isSelected ? 'text-blue-100' : 'text-blue-600'}`}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.47l-5.894 3.4-5.894-3.4V9.53l5.894-3.4 5.894 3.4v4.94z" />
                                </svg>
                                <span>{task.platform}</span>
                            </div>
                        )}
                        {task.jobId && (
                            <span className={`${isHighlighted || isSelected ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-700'} px-2 py-1 rounded-2xl text-xs`}>
                                {task.jobId}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status & Actions Column */}
                <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        {task.status && getStatusBadge()}
                        {task.uploadProgress && (
                            <span className={`text-xs md:text-xs ${isHighlighted || isSelected ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-700'} px-2 py-1 rounded-2xl`}>
                                {task.uploadProgress}
                            </span>
                        )}
                        {task.deadline && (
                            <div className={`flex items-center gap-1 text-xs ${task.deadlineColor && !isSelected ? task.deadlineColor : (isHighlighted || isSelected ? 'text-blue-100' : 'text-red-600')}`}>
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">
                                    {task.deadlineLabel || 'Deadline:'} {task.deadline}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {task.jobId && (
                            <span className={`text-xs md:text-sm ${isHighlighted || isSelected ? 'text-blue-100' : 'text-gray-500'} hidden md:inline`}>
                                {task.jobId}
                            </span>
                        )}
                        <button
                            onClick={handleMoreClick}
                            className={`p-1 hover:bg-opacity-10 hover:bg-gray-100 rounded transition-colors cursor-pointer ${isHighlighted || isSelected ? 'text-white' : 'text-gray-400'}`}
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
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
