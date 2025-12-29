import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { sessionAPI } from '@/services/session_button';

/**
 * Custom hook to manage all session-related state and operations
 * @param {Function} toast - Toast notification function
 * @param {boolean} isUpcomingTask - Whether the task is an upcoming task (prevents editing)
 * @param {Function} onStatusChange - Optional callback when session status changes (for updating task status)
 * @returns {Object} Session management state and handlers
 */
export const useSessionManagement = (toast, isUpcomingTask = false, onStatusChange = null) => {
    const params = useParams();
    const searchParams = useSearchParams();
    const selectedJobId = searchParams.get('jobId');
    const lastFetchedJobRef = useRef(null);

    // Session state
    const [sessionStarted, setSessionStarted] = useState(false);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [sessionDuration, setSessionDuration] = useState('00:00:00');
    const [showEndSessionModal, setShowEndSessionModal] = useState(false);

    // Format duration as HH:MM:SS
    const formatDuration = useCallback((startTime) => {
        if (!startTime) return '00:00:00';
        const now = new Date();
        const start = new Date(startTime);
        const diffMs = now - start;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, []);

    // Handle start session
    const handleStartSession = useCallback(async () => {
        // Prevent session start/end for upcoming tasks
        if (isUpcomingTask) {
            return;
        }
        
        if (sessionStarted) {
            // Show confirmation modal
            setShowEndSessionModal(true);
            return;
        }

        const jobIdParam = searchParams.get('jobId');
        const jobNo = Number(jobIdParam ?? params?.id ?? selectedJobId);
        
        if (!jobNo || Number.isNaN(jobNo)) {
            toast.error('Unable to determine job number');
            return;
        }
        
        try {
            const result = await sessionAPI.startSession(jobNo);
            const startTime = result?.start_time || new Date().toISOString();
            
            setSessionStarted(true);
            setSessionStartTime(startTime);
            setSessionDuration('00:00:00');
            
            // Notify parent component of status change
            // Use 'session-started' to match original behavior
            if (onStatusChange) {
                onStatusChange('session-started');
            }
            
            toast.success('Session started successfully');
        } catch (err) {
            console.error('Failed to start session:', err);
            toast.error(err?.message || 'Failed to start session');
        }
    }, [isUpcomingTask, sessionStarted, searchParams, params, selectedJobId, toast, onStatusChange]);

    // Handle confirm end session
    const handleConfirmEndSession = useCallback(async () => {
        const jobIdParam = searchParams.get('jobId');
        const jobNo = Number(jobIdParam ?? params?.id ?? selectedJobId);
        
        if (!jobNo || Number.isNaN(jobNo)) {
            toast.error('Unable to determine job number');
            setShowEndSessionModal(false);
            return;
        }

        try {
            // Call end session API
            await sessionAPI.endSession(jobNo);
            
            // Update local state
            setSessionStarted(false);
            setSessionStartTime(null);
            setSessionDuration('00:00:00');
            setShowEndSessionModal(false);
            
            // Notify parent component of status change
            if (onStatusChange) {
                onStatusChange('Completed');
            }
            
            toast.success('Session ended successfully');
        } catch (err) {
            console.error('Failed to end session:', err);
            toast.error(err?.message || 'Failed to end session');
        }
    }, [searchParams, params, selectedJobId, toast, onStatusChange]);

    // Fetch session status from backend
    const fetchSessionStatus = useCallback(async (task) => {
        if (!task) return;

        const jobIdParam = searchParams.get('jobId');
        const jobNo = Number(jobIdParam ?? params?.id ?? selectedJobId);
        
        if (!jobNo || Number.isNaN(jobNo)) {
            return;
        }

        // Reset ref if job number changed (new job loaded)
        if (lastFetchedJobRef.current !== null && lastFetchedJobRef.current !== jobNo) {
            lastFetchedJobRef.current = null;
        }
        
        // Prevent re-fetching if we've already fetched for this job
        // But allow fetch if we don't have sessionStartTime yet (needed for timer)
        if (lastFetchedJobRef.current === jobNo && sessionStartTime) {
            return;
        }

        // Mark this job as fetched
        lastFetchedJobRef.current = jobNo;

        try {
            const result = await sessionAPI.getSessionStartTime(jobNo);
            console.log('getSessionStartTime result:', result);
            
            if (result && result.success === true) {
                const apiStatus = result.status;
                
                // Handle COMPLETED status - JobStatusEnum.COMPLETED = "Completed"
                if (apiStatus === 'Completed') {
                    setSessionStarted(false);
                    setSessionStartTime(null);
                    setSessionDuration('00:00:00');
                    // Notify parent component of status change
                    if (onStatusChange) {
                        onStatusChange('Completed');
                    }
                    return;
                }
                
                // Handle SESSION_IN_PROGRESS status - JobStatusEnum.SESSION_IN_PROGRESS = "Session Started"
                if (apiStatus === 'Session Started') {
                    if (result.result && typeof result.result === 'string') {
                        // result is ISO string of start time
                        setSessionStarted(true);
                        setSessionStartTime(result.result);
                        setSessionDuration('00:00:00'); // Initialize timer
                        // Notify parent component of status change
                        if (onStatusChange) {
                            onStatusChange('Session Started');
                        }
                    } else {
                        setSessionStarted(false);
                        setSessionStartTime(null);
                    }
                    return;
                }
                
                // Handle SESSION_NOT_STARTED status - JobStatusEnum.SESSION_NOT_STARTED = "Session not started"
                if (apiStatus === 'Session not started') {
                    setSessionStarted(false);
                    setSessionStartTime(null);
                    setSessionDuration('00:00:00');
                    // Notify parent component of status change
                    if (onStatusChange) {
                        onStatusChange('Session not started');
                    }
                    return;
                }
                
                // Handle SCHEDULED status - JobStatusEnum.SCHEDULED = "Scheduled"
                if (apiStatus === 'Scheduled') {
                    setSessionStarted(false);
                    setSessionStartTime(null);
                    setSessionDuration('00:00:00');
                    // Notify parent component of status change
                    if (onStatusChange) {
                        onStatusChange('Scheduled');
                    }
                    return;
                }
            } else if (result && result.success === false) {
                // API returned error
                setSessionStarted(false);
                setSessionStartTime(null);
                setSessionDuration('00:00:00');
            }
        } catch (err) {
            console.error('Failed to fetch session status:', err);
            setSessionStarted(false);
            setSessionStartTime(null);
        }
    }, [searchParams, params, selectedJobId, sessionStartTime, onStatusChange]);

    // Timer effect - updates duration every second when session is active
    useEffect(() => {
        if (!sessionStarted || !sessionStartTime) {
            setSessionDuration('00:00:00');
            return;
        }

        // Update immediately
        setSessionDuration(formatDuration(sessionStartTime));

        // Update every second
        const interval = setInterval(() => {
            setSessionDuration(formatDuration(sessionStartTime));
        }, 1000);

        return () => clearInterval(interval);
    }, [sessionStarted, sessionStartTime, formatDuration]);

    return {
        // State
        sessionStarted,
        sessionStartTime,
        sessionDuration,
        showEndSessionModal,
        
        // Setters
        setShowEndSessionModal,
        
        // Handlers
        handleStartSession,
        handleConfirmEndSession,
        
        // Data fetching
        fetchSessionStatus,
    };
};

