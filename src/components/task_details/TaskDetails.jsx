"use client";
import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter , useSearchParams} from 'next/navigation';
import { MapPin, Clock, MoreVertical, ChevronDown, ChevronUp, Trash2, Clock as ClockIcon, Check, Search, Info } from 'lucide-react';
import AvatarMenu from '@/components/layouts/AvatarMenu';
import { 
    getInitials, 
    formatTime12Hour,
    validateCaseDetails,
    validateWitnesses,
    validateAttorneys,
    validateBillings,
    validateEquipmentTime
} from '@/lib/utils';
import TimeInput from '@/components/task_details/task/TimeInput';
import AddActionButton from '@/components/task_details/task/AddActionButton';
import ToggleOption from '@/components/task_details/task/ToggleOption';
import DocumentUpload from '@/components/task_details/task/DocumentUpload';
import CheckboxOption from '@/components/task_details/task/CheckboxOption';
import IconInput from '@/components/task_details/task/IconInput';
import CaseDetails from '@/components/task_details/taskSections/CaseDetails';
import WitnessManagement from '@/components/task_details/taskSections/WitnessManagement';
import AttorneyOrders from '@/components/task_details/taskSections/AttorneyOrders';
import BillingInfo from '@/components/task_details/taskSections/BillingInfo';
import EquipmentSection from '@/components/task_details/taskSections/EquipmentSection';
import { witnessesAPI } from '@/services/witnesses_apis';
import { useToast } from '@/contexts/ToastContext';
import { casesAPI } from '@/services/cases_apis';
import CancelJobModal from '@/components/common/CancelJobModal';
import { useCaseManagement } from '@/hooks/useCaseManagement';
import { useWitnessManagement } from '@/hooks/useWitnessManagement';
import { useAttorneyManagement } from '@/hooks/useAttorneyManagement';
import { useBillingManagement } from '@/hooks/useBillingManagement';
import { useEquipmentManagement } from '@/hooks/useEquipmentManagement';
import { useSessionManagement } from '@/hooks/useSessionManagement';

export default function TaskDetails({ caseId, caseInfo, witnessesData}) {
    const params = useParams();
    const router = useRouter();
    const [expandedStep, setExpandedStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState([]);
    const searchParams = useSearchParams();
    const selectedJobId = searchParams.get('jobId');
    const toast = useToast();
    
    // Use custom hook for case management (must be after toast initialization)
    const {
        formData,
        isCaseEdited,
        editingCase,
        pendingCaseChanges,
        handleEditCase,
        handleSaveCase,
        handleCancelCase
    } = useCaseManagement(caseId, caseInfo, toast);
    
    // Use custom hook for witness management (must be after toast initialization)
    const {
        witnesses,
        addingWitness,
        newWitnessName,
        expandedWitness,
        witnessRecords,
        witnessTemplates,
        deletedWitnessVideoIds,
        setAddingWitness,
        setNewWitnessName,
        setExpandedWitness,
        handleAddWitness,
        handleRenameWitness,
        handleDeleteWitness,
        handleAddRecord,
        handleUpdateRecord,
        handleUploadVideo,
        handleDeleteRecord,
        handleUpdateTemplate,
        handleSaveWitness
    } = useWitnessManagement(witnessesData, toast);
    
    // Use custom hook for attorney management (must be after toast initialization)
    const {
        attorneySections,
        expandedAttorney,
        editingAttorney,
        setExpandedAttorney,
        setEditingAttorney,
        handleAddAttorneySection,
        handleRemoveAttorneySection,
        handleAttorneyFieldChange,
        handleAttorneyUpload,
        handleRemoveAttorneyDocument,
        handleSaveAttorney,
        handleCancelAttorney
    } = useAttorneyManagement(toast);
    const [jobData, setJobData] = useState(null);
    const [task, setTask] = useState(null);
    const [isUpcomingTask, setIsUpcomingTask] = useState(false); // Track if task is from upcoming tasks
    
    // Use custom hook for session management (must be after toast and isUpcomingTask initialization)
    const {
        sessionStarted,
        sessionStartTime,
        sessionDuration,
        showEndSessionModal,
        setShowEndSessionModal,
        handleStartSession,
        handleConfirmEndSession,
        fetchSessionStatus
    } = useSessionManagement(toast, isUpcomingTask, (status) => {
        // Callback to update task status when session status changes
        // Only update if status is different to prevent infinite loops
        setTask(prev => {
            if (!prev) return null;
            if (prev.status === status) return prev;
            return { ...prev, status };
        });
    });
    const [showMenu, setShowMenu] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const menuRef = useRef(null);

    // Case management is now handled by useCaseManagement hook
    // Wrapper to prevent editing for upcoming tasks
    const handleEditCaseWrapper = () => {
        if (isUpcomingTask) {
            return;
        }
        handleEditCase();
    };

    // Use custom hook for billing management (must be after toast and isUpcomingTask initialization)
    const {
        billingInfo,
        editingBilling,
        pendingBillingChanges,
        billingHasBeenSaved,
        billingId,
        handleBillingToggle,
        handleBillingInputChange,
        handleBillingUpload,
        handleBillingDocumentRemove,
        handleEditBilling,
        handleSaveBilling,
        handleCancelBilling,
        handleDeleteBilling,
        fetchBillingData
    } = useBillingManagement(toast, isUpcomingTask, () => {
        // Callback to collapse billing section when canceling new billing
        setExpandedStep(expandedStep === 4 ? null : expandedStep);
    });
    
    // Use custom hook for equipment management (must be after toast and isUpcomingTask initialization)
    const {
        equipmentInfo,
        editingEquipment,
        pendingEquipmentChanges,
        equipmentHasBeenSaved,
        equipmentTimeId,
        handleEquipmentCheckbox,
        handleEquipmentInputChange,
        handleEquipmentUpload,
        handleEquipmentDocumentRemove,
        handleEditEquipment,
        handleSaveEquipment,
        handleCancelEquipment,
        handleDeleteEquipment,
        fetchEquipmentData,
        enableEditModeForNewEquipment
    } = useEquipmentManagement(toast, isUpcomingTask, () => {
        // Callback to collapse equipment section when canceling new equipment
        setExpandedStep(expandedStep === 5 ? null : expandedStep);
    });

    // Presentational components are implemented in `src/components/task/` to keep the page file focused on state and layout.

    // Map step numbers to backend types and field names
    const stepTypeMap = {
        1: { type: 'case', field: 'mark_is_done_case' },
        2: { type: 'witnesses', field: 'mark_is_done_witnesses' },
        3: { type: 'attorneys', field: 'mark_is_done_attorneys' },
        4: { type: 'billings', field: 'mark_is_done_billings' },
        5: { type: 'equipment_time', field: 'mark_is_done_equipment_time' }
    };

    // Function to sync mark_is_done status from backend
    const syncMarkIsDoneStatus = useCallback(async (jobNo) => {
        if (!jobNo || Number.isNaN(Number(jobNo)) || !caseId) {
            console.log('Skipping sync: missing jobNo or caseId', { jobNo, caseId });
            return;
        }
        
        try {
            console.log(`Syncing mark_is_done status for caseId: ${caseId}, jobNo: ${jobNo}`);
            const response = await casesAPI.getJobMarkIsDoneDetails(Number(jobNo), Number(caseId));
            
            // Extract result from response if it exists
            const jobDetails = response?.result || response;
            
            if (jobDetails) {
                console.log('Job details received:', jobDetails);
                // Dynamically build completedSteps array based on backend values
                const completedStepsFromBackend = Object.keys(stepTypeMap)
                    .map(stepNum => {
                        const stepInfo = stepTypeMap[Number(stepNum)];
                        // Check if the field exists and is true
                        const isDone = jobDetails[stepInfo.field] === true;
                        if (isDone) {
                            console.log(`Step ${stepNum} (${stepInfo.type}) is marked as done`);
                        }
                        return isDone ? Number(stepNum) : null;
                    })
                    .filter(stepNum => stepNum !== null);
                
                console.log('Completed steps from backend:', completedStepsFromBackend);
                setCompletedSteps(completedStepsFromBackend);
            } else {
                console.log('No job details returned, keeping current state');
            }
        } catch (err) {
            console.warn('Failed to sync mark_is_done status:', err);
            // Don't throw - just log the error, UI will work without sync
        }
    }, [caseId]);

    // Fetch job data to populate task info
    useEffect(() => {
        const fetchJobData = async () => {
            if (!selectedJobId) {
                // If no jobId, try to construct from caseInfo
                if (caseInfo) {
                    const constructedTask = {
                        id: caseId,
                        title: caseInfo.case_short_name || caseInfo.case_name || 'Case Details',
                        location: caseInfo.location || 'Location not specified',
                        time: 'Time not specified',
                        date: 'Date not specified',
                        status: 'scheduled',
                        platform: caseInfo.platform || null,
                    };
                    setTask(constructedTask);
                }
                return;
            }

            try {
                // Try to get job from pending tasks first
                const pendingTasks = await casesAPI.getPendingTasks();
                const foundJob = pendingTasks.find(t => t.id === selectedJobId || t.jobId === `Job${selectedJobId}`);
                
                if (foundJob) {
                    setTask(foundJob);
                    setIsUpcomingTask(false); // It's a pending task
                    
                    // Sync mark_is_done status from backend
                    const jobNo = Number(selectedJobId);
                    if (jobNo && !Number.isNaN(jobNo)) {
                        await syncMarkIsDoneStatus(jobNo);
                    }
                    return;
                }

                // If not found in pending, try upcoming tasks
                const upcomingTasks = await casesAPI.getUpcomingTasks();
                const foundUpcomingJob = upcomingTasks.find(t => t.id === selectedJobId || t.jobId === `Job${selectedJobId}`);
                
                if (foundUpcomingJob) {
                    setTask(foundUpcomingJob);
                    setIsUpcomingTask(true); // It's an upcoming task - disable all sections
                    
                    // Sync mark_is_done status from backend
                    const jobNo = Number(selectedJobId);
                    if (jobNo && !Number.isNaN(jobNo)) {
                        await syncMarkIsDoneStatus(jobNo);
                    }
                    return;
                }

                // If still not found, construct from caseInfo
                if (caseInfo) {
                    const constructedTask = {
                        id: selectedJobId,
                        jobId: `Job${selectedJobId}`,
                        title: caseInfo.case_short_name || caseInfo.case_name || 'Case Details',
                        location: caseInfo.location || 'Location not specified',
                        time: 'Time not specified',
                        date: 'Date not specified',
                        status: 'scheduled',
                        platform: caseInfo.platform || null,
                    };
                    setTask(constructedTask);
                }
            } catch (error) {
                console.error('Failed to fetch job data:', error);
                // Fallback to caseInfo
                if (caseInfo) {
                    const constructedTask = {
                        id: selectedJobId || caseId,
                        title: caseInfo.case_short_name || caseInfo.case_name || 'Case Details',
                        location: caseInfo.location || 'Location not specified',
                        time: 'Time not specified',
                        date: 'Date not specified',
                        status: 'scheduled',
                        platform: caseInfo.platform || null,
                    };
                    setTask(constructedTask);
                }
            }
        };

        fetchJobData();
    }, [selectedJobId, caseInfo, caseId]);

    const steps = [
        { number: 1, title: 'Case Details', done: false },
        { number: 2, title: 'Witness Management', done: false },
        { number: 3, title: 'Attorney Orders', done: false },
        { number: 4, title: 'Billing Information', done: false },
        { number: 5, title: 'Equipment & Time', done: false }
    ];


    const toggleStep = (stepNumber) => {
        // Disable section toggling for upcoming tasks
        if (isUpcomingTask) {
            return;
        }
        
        const isExpanding = expandedStep !== stepNumber;
        setExpandedStep(expandedStep === stepNumber ? null : stepNumber);
        
        // Auto-expand first attorney when Attorney Orders section is opened for the first time
        if (stepNumber === 3 && isExpanding && !expandedAttorney && attorneySections.length > 0) {
            setExpandedAttorney(attorneySections[0].id);
        }
        
        // Fetch billing data when Billing section is opened (if not already loaded)
        // This will set the appropriate state (edit mode for new, view mode for existing)
        if (stepNumber === 4 && isExpanding && selectedJobId && !billingId) {
            // Fetch billing data - it will set edit mode if no billing exists
            fetchBillingData();
        } else if (stepNumber === 4 && isExpanding && !selectedJobId && !billingId) {
            // If no jobId but section is opening, show empty form with Save/Cancel
            // This is handled by the hook's fetchBillingData
            fetchBillingData();
        }
        
        // Fetch equipment data when Equipment section is opened (if not already loaded)
        // The hook's fetchEquipmentData will automatically set edit mode if no equipment exists
        if (stepNumber === 5 && isExpanding && selectedJobId && !equipmentTimeId && equipmentHasBeenSaved === false) {
            fetchEquipmentData();
        } else if (stepNumber === 5 && isExpanding && !equipmentHasBeenSaved) {
            // If no jobId or equipment not saved, enable edit mode for new equipment
            enableEditModeForNewEquipment();
        }
    };

    // Validation functions map
    const validationMap = {
        1: () => ({ isValid: true, errors: [] }), // No validation for case section
        2: () => validateWitnesses(witnesses, witnessRecords),
        3: () => validateAttorneys(attorneySections),
        4: () => validateBillings(billingInfo),
        5: () => validateEquipmentTime(equipmentInfo)
    };

    const toggleStepDone = async (stepNumber) => {
        // Disable "Mark as Done" for upcoming tasks
        if (isUpcomingTask) {
            return;
        }

        // Determine new status: true if marking as done, false if unmarking
        const isCurrentlyDone = completedSteps.includes(stepNumber);
        const newDoneStatus = !isCurrentlyDone;
        const stepInfo = stepTypeMap[stepNumber];
        const backendType = stepInfo?.type;

        // Validate only when marking as done (not when unmarking)
        if (newDoneStatus && validationMap[stepNumber]) {
            const validation = validationMap[stepNumber]();
            
            if (!validation.isValid) {
                validation.errors.forEach(error => toast.error(error));
                return;
            }
        }

        // Get job number from selectedJobId or params
        const jobIdParam = searchParams.get('jobId');
        const jobNo = Number(jobIdParam ?? params?.id);
        
        if (!jobNo || Number.isNaN(jobNo)) {
            toast.error('Unable to determine job number');
            return;
        }

        // Call backend API to update done status
        if (backendType) {
            try {
                await casesAPI.markJobAsDone(jobNo, backendType, newDoneStatus);
                toast.success(newDoneStatus 
                    ? `${stepInfo.type} marked as done successfully` 
                    : `${stepInfo.type} unmarked successfully`
                );
                
                // Sync status from backend after successful update
                await syncMarkIsDoneStatus(jobNo);
            } catch (err) {
                console.error(`Failed to update ${backendType} done status:`, err);
                toast.error(err?.message || `Failed to update ${backendType} status`);
                return; // Don't update local state if API call fails
            }
        }
    };

    // Check session status when task loads and fetch actual start time
    useEffect(() => {
        fetchSessionStatus(task);
        // Dependencies: selectedJobId (main trigger), task?.id (when task changes)
    }, [selectedJobId, task?.id, searchParams, params, fetchSessionStatus]);

    const progress = Math.round((completedSteps.length / steps.length) * 100);

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

    // Normalize status key (handles variations like 'session-started', 'session_started', 'session started')
    const normalizeStatus = (status) => {
        if (!status) return 'scheduled';
        const normalized = status.toLowerCase().trim().replace(/[_-]/g, ' ');
        return normalized;
    };

    // Get status badge styling based on task status
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

    // Handle cancel job
    const handleCancelJob = async (cancelData) => {
        try {
            if (!selectedJobId) {
                toast.error('Job ID not found');
                return;
            }

            const jobNo = parseInt(selectedJobId, 10);
            if (isNaN(jobNo)) {
                toast.error('Invalid job ID');
                return;
            }

            const response = await casesAPI.cancelJob(jobNo, cancelData);
            
            if (response && response.success) {
                toast.success(response.message || 'Job cancelled successfully');
                
                // Close modals
                setShowCancelModal(false);
                setShowMenu(false);
                
                // Redirect to tasks list after a short delay to show the toast
                setTimeout(() => {
                    router.push('/dashboard/list_of_tasks');
                }, 500);
            } else {
                const errorMessage = response?.message || 'Failed to cancel job';
                toast.error(errorMessage);
            }
        } catch (err) {
            console.error('Failed to cancel job:', err);
            const errorMessage = response?.message || 'Failed to cancel job. Please try again.';
            toast.error(errorMessage);
        }
    };

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

    return (
        <>
            {/* Header is provided globally via `Header` in `LayoutWrapper` */}

            {/* Main Content */}
            <div className="flex h-[calc(100vh-73px)]">
                {/* Left Panel - Task Info */}
                <div className="w-full md:w-96 bg-white border-r border-gray-200 p-6 overflow-y-auto">
                    {task ? (
                        <>
                            {/* Status Badge */}
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
                                                    setShowCancelModal(true);
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

                            {/* Start/End Session Button */}
                            {(() => {
                                const isCompleted = task?.status === 'Completed' || 
                                                   (task?.status && task.status.toLowerCase().includes('completed'));
                                
                                if (isCompleted) {
                                    return (
                                        <button 
                                            disabled
                                            className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg mb-6 cursor-not-allowed opacity-100"
                                        >
                                            Completed
                                        </button>
                                    );
                                } else if (sessionStarted) {
                                    return (
                                        <button 
                                            onClick={handleStartSession}
                                            disabled={isUpcomingTask}
                                            className={`w-full font-semibold py-3 rounded-lg transition-colors mb-6 ${
                                                isUpcomingTask
                                                    ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                                                    : 'bg-red-500 hover:bg-red-600 text-white'
                                            }`}
                                        >
                                            End Session ({sessionDuration})
                                        </button>
                                    );
                                } else {
                                    return (
                                        <button 
                                            onClick={handleStartSession}
                                            disabled={isUpcomingTask}
                                            className={`w-full font-semibold py-3 rounded-lg transition-colors mb-6 ${
                                                isUpcomingTask
                                                    ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                        >
                                            Start Session
                                        </button>
                                    );
                                }
                            })()}
                        </>
                    ) : (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Case Progress */}
                <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
                    {/* Progress Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Case Progress</h3>
                        <span className="text-sm font-medium text-gray-600">{progress}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                    </div>

                    {/* Case Steps */}
                    <div className="space-y-3">
                        {steps.map((step) => (
                            <div
                                key={step.number}
                                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
                            >
                                {/* Step Header */}
                                <div
                                    onClick={() => !isUpcomingTask && toggleStep(step.number)}
                                    className={`p-4 flex items-center justify-between transition-colors ${
                                        isUpcomingTask 
                                            ? 'cursor-not-allowed opacity-60' 
                                            : 'cursor-pointer hover:bg-gray-50'
                                    }`}
                                >
                                    <h4 className={`text-base font-medium ${isUpcomingTask ? 'text-gray-500' : 'text-gray-900'}`}>
                                        {step.number}. {step.title}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isUpcomingTask) {
                                                    toggleStepDone(step.number);
                                                }
                                            }}
                                            disabled={isUpcomingTask}
                                            className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                                                isUpcomingTask
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : completedSteps.includes(step.number)
                                                        ? 'bg-green-50 text-green-600'
                                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }`}
                                        >
                                            {completedSteps.includes(step.number) ? 'Done' : 'Mark as Done'}
                                        </button>
                                        {expandedStep === step.number ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Step Content - Expandable */}
                                {expandedStep === step.number && (
                                    <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                                        {step.number === 1 && (
                                            <CaseDetails 
                                                formData={formData} 
                                                editingCase={editingCase}
                                                handleEditCase={handleEditCaseWrapper}
                                                handleSaveCase={handleSaveCase}
                                                handleCancelCase={handleCancelCase}
                                            />
                                        )}
                                        {step.number === 2 && (
                                            <WitnessManagement
                                                witnesses={witnesses}
                                                addingWitness={addingWitness}
                                                newWitnessName={newWitnessName}
                                                setAddingWitness={setAddingWitness}
                                                setNewWitnessName={setNewWitnessName}
                                                expandedWitness={expandedWitness}
                                                setExpandedWitness={setExpandedWitness}
                                                witnessRecords={witnessRecords}
                                                witnessTemplates={witnessTemplates}
                                                handleAddWitness={handleAddWitness}
                                                handleDeleteWitness={handleDeleteWitness}
                                                handleAddRecord={handleAddRecord}
                                                handleUpdateRecord={handleUpdateRecord}
                                                handleUploadVideo={handleUploadVideo}
                                                handleDeleteRecord={handleDeleteRecord}
                                                handleUpdateTemplate={handleUpdateTemplate}
                                                handleRenameWitness={handleRenameWitness}
                                                toast={toast}
                                                onSaveWitness={handleSaveWitness}
                                            />
                                        )}
                                        {step.number === 3 && (
                                            <AttorneyOrders
                                                attorneySections={attorneySections}
                                                handleAddAttorneySection={handleAddAttorneySection}
                                                handleRemoveAttorneySection={handleRemoveAttorneySection}
                                                handleAttorneyFieldChange={handleAttorneyFieldChange}
                                                handleAttorneyUpload={handleAttorneyUpload}
                                                handleRemoveAttorneyDocument={handleRemoveAttorneyDocument}
                                                handleSaveAttorney={handleSaveAttorney}
                                                handleCancelAttorney={handleCancelAttorney}
                                                expandedAttorney={expandedAttorney}
                                                setExpandedAttorney={setExpandedAttorney}
                                                editingAttorney={editingAttorney}
                                                setEditingAttorney={setEditingAttorney}
                                            />
                                        )}
                                        {step.number === 4 && (
                                            <BillingInfo
                                                billingInfo={billingInfo}
                                                handleBillingToggle={handleBillingToggle}
                                                handleBillingInputChange={handleBillingInputChange}
                                                handleBillingUpload={handleBillingUpload}
                                                handleBillingDocumentRemove={handleBillingDocumentRemove}
                                                editingBilling={editingBilling}
                                                handleEditBilling={handleEditBilling}
                                                handleSaveBilling={handleSaveBilling}
                                                handleCancelBilling={handleCancelBilling}
                                                handleDeleteBilling={handleDeleteBilling}
                                                billingId={billingId}
                                            />
                                        )}
                                        {step.number === 5 && (
                                            <EquipmentSection
                                                equipmentInfo={equipmentInfo}
                                                handleEquipmentCheckbox={handleEquipmentCheckbox}
                                                handleEquipmentInputChange={handleEquipmentInputChange}
                                                handleEquipmentUpload={handleEquipmentUpload}
                                                handleEquipmentDocumentRemove={handleEquipmentDocumentRemove}
                                                editingEquipment={editingEquipment}
                                                handleEditEquipment={handleEditEquipment}
                                                handleSaveEquipment={handleSaveEquipment}
                                                handleCancelEquipment={handleCancelEquipment}
                                                handleDeleteEquipment={handleDeleteEquipment}
                                                equipmentTimeId={equipmentTimeId}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* End Session Confirmation Modal */}
            {showEndSessionModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-lg flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        {/* Modal Header with Icon */}
                        <div className="flex items-start p-6 pb-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                                <Info className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">End Session</h3>
                                <p className="text-sm text-gray-600">Are you sure you want to end session?</p>
                            </div>
                        </div>

                        {/* Modal Footer with Buttons */}
                        <div className="flex justify-end gap-3 p-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => setShowEndSessionModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmEndSession}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Job Modal */}
            <CancelJobModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleCancelJob}
                jobId={task?.jobId || `Job${selectedJobId}`}
            />
        </>
    );
}

