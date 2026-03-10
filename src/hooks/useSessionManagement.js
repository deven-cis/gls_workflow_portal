import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { sessionAPI } from '@/services/session_button';
import { DateTime } from 'luxon';
import { getClientTimezone, convertToTimezone, BACKEND_TIMEZONE } from '@/lib/timezone_util';

/**
 * Custom hook to manage all session-related state and operations
 * @param {Function} toast - Toast notification function
 * @param {boolean} isUpcomingTask - Whether the task is an upcoming task (prevents editing)
 * @param {Function} onStatusChange - Optional callback when session status changes (for updating task status)
 * @returns {Object} Session management state and handlers
 */
export const useSessionManagement = (toast, isUpcomingTask = false, onStatusChange = null, initialTaskStatus = null) => {
    const params = useParams();
    const searchParams = useSearchParams();
    const selectedJobId = searchParams.get('jobId');
    const lastFetchedJobRef = useRef(null);
    const loadingTimeoutRef = useRef(null);

    // Initialize sessionStarted from task status if available
    const getInitialSessionState = () => {
        if (!initialTaskStatus) return false;
        const normalized = initialTaskStatus.toLowerCase().trim().replace(/[_-]/g, ' ');
        return normalized === 'session started';
    };

    // Session state
    const [sessionStarted, setSessionStarted] = useState(getInitialSessionState);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [sessionDuration, setSessionDuration] = useState('00:00:00');
    const [showEndSessionModal, setShowEndSessionModal] = useState(false);
    // Initialize isFetchingSession to true if status is "Session Started" to prevent flash
    const [isFetchingSession, setIsFetchingSession] = useState(() => {
        if (!initialTaskStatus) return false;
        const normalized = initialTaskStatus.toLowerCase().trim().replace(/[_-]/g, ' ');
        return normalized === 'session started';
    });

    // Convert backend time to client timezone.
    // Backend historically stored naive timestamps; intended source is EST, but some environments produce UTC-like values.
    // Strategy:
    // - If ISO has offset/Z: trust it.
    // - If naive: interpret as EST first; if that results in a future time vs client "now", fall back to UTC.
    const convertToClientTimezone = useCallback((timeString) => {
        if (!timeString) return null;
        
        try {
            const clientTimezone = getClientTimezone();
            const timeStr = String(timeString);
            const hasExplicitOffset = /([zZ]|[+\-]\d{2}:\d{2})$/.test(timeStr);

            // Backend time is persisted in EST with no offset in ISO string.
            // If the string already has an offset/Z, trust it and just convert to client timezone.
            if (hasExplicitOffset) {
                const converted = DateTime.fromISO(timeStr).setZone(clientTimezone);
                return converted.isValid ? converted.toISO() : timeStr;
            }

            const nowClient = DateTime.now().setZone(clientTimezone);
            const estAsClient = convertToTimezone(timeStr, clientTimezone, BACKEND_TIMEZONE); // intended path (DST-aware ET)

            // If interpreting as EST yields a time in the future, fall back to UTC interpretation.
            const shouldFallbackToUtc =
                estAsClient?.isValid &&
                nowClient.isValid &&
                estAsClient.toMillis() > nowClient.plus({ minutes: 1 }).toMillis();

            const converted = shouldFallbackToUtc
                ? convertToTimezone(timeStr, clientTimezone, 'UTC')
                : estAsClient;
            return converted ? converted.toISO() : timeString;
        } catch (error) {
            console.warn('Error converting time to client timezone:', error);
            return timeString; // Return original if conversion fails
        }
    }, []);

    // Format duration as HH:MM:SS based on client timezone
    const formatDuration = useCallback((startTime) => {
        if (!startTime) return '00:00:00';

        const fallbackDuration = () => {
            const now = new Date();
            const start = new Date(startTime);
            const diffMs = now - start;

            if (Number.isNaN(diffMs) || diffMs < 0) {
                return '00:00:00';
            }

            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };

        try {
            // Get client timezone
            const clientTimezone = getClientTimezone();

            // Parse start time and convert to client timezone.
            // - If it already has an offset/Z, trust that and just convert.
            // - If it's naive (no offset), interpret it as EST from backend and convert.
            const startStr = String(startTime);
            const hasExplicitOffset = /([zZ]|[+\-]\d{2}:\d{2})$/.test(startStr);
            let startDt;
            if (hasExplicitOffset) {
                startDt = DateTime.fromISO(startStr).setZone(clientTimezone);
            } else {
                // Intended: EST -> client. If that yields a future start time, fall back to UTC -> client.
                const nowClient = DateTime.now().setZone(clientTimezone);
                const estStart = DateTime.fromISO(startStr, { zone: BACKEND_TIMEZONE }).setZone(clientTimezone);
                const useUtcFallback =
                    estStart.isValid &&
                    nowClient.isValid &&
                    estStart.toMillis() > nowClient.plus({ minutes: 1 }).toMillis();

                startDt = useUtcFallback
                    ? DateTime.fromISO(startStr, { zone: 'UTC' }).setZone(clientTimezone)
                    : estStart;
            }

            if (!startDt.isValid) {
                return fallbackDuration();
            }

            // Get current time in client timezone
            const nowDt = DateTime.now().setZone(clientTimezone);

            if (!startDt.isValid || !nowDt.isValid) {
                return fallbackDuration();
            }

            // Calculate duration difference in milliseconds
            const diffMs = nowDt.toMillis() - startDt.toMillis();

            if (diffMs < 0) {
                return fallbackDuration();
            }

            // Calculate hours, minutes, seconds from milliseconds
            const totalSeconds = Math.floor(diffMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } catch (error) {
            console.warn('Error calculating duration with timezone:', error);
            return fallbackDuration();
        }
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
            const backendStartTime = result?.start_time || new Date().toISOString();
            
            // Convert to client timezone
            const clientStartTime = convertToClientTimezone(backendStartTime) || backendStartTime;
            
            setSessionStarted(true);
            setSessionStartTime(clientStartTime);
            setSessionDuration(formatDuration(clientStartTime));
            
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
    }, [isUpcomingTask, sessionStarted, searchParams, params, selectedJobId, toast, onStatusChange, convertToClientTimezone, formatDuration]);

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
        if (!task) {
            setIsFetchingSession(false);
            return;
        }

        const jobIdParam = searchParams.get('jobId');
        const jobNo = Number(jobIdParam ?? params?.id ?? selectedJobId);
        
        if (!jobNo || Number.isNaN(jobNo)) {
            setIsFetchingSession(false);
            return;
        }

        // Reset ref if job number changed (new job loaded)
        if (lastFetchedJobRef.current !== null && lastFetchedJobRef.current !== jobNo) {
            lastFetchedJobRef.current = null;
        }
        
        // Prevent re-fetching if we've already fetched for this job
        // But allow fetch if we don't have sessionStartTime yet (needed for timer)
        if (lastFetchedJobRef.current === jobNo && sessionStartTime) {
            setIsFetchingSession(false);
            return;
        }

        // Mark this job as fetched
        lastFetchedJobRef.current = jobNo;
        setIsFetchingSession(true);

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
                    setIsFetchingSession(false);
                    // Notify parent component of status change
                    if (onStatusChange) {
                        onStatusChange('Completed');
                    }
                    return;
                }
                
                // Handle SESSION_IN_PROGRESS status - JobStatusEnum.SESSION_IN_PROGRESS = "Session Started"
                if (apiStatus === 'Session Started') {
                    if (result.result && typeof result.result === 'string') {
                        // Clear any existing timeout
                        if (loadingTimeoutRef.current) {
                            clearTimeout(loadingTimeoutRef.current);
                        }
                        // Convert to client timezone
                        const backendStartTime = result.result;
                        const clientStartTime = convertToClientTimezone(backendStartTime) || backendStartTime;
                        
                        setSessionStarted(true);
                        setSessionStartTime(clientStartTime);
                        // Calculate duration immediately based on client timezone
                        const calculatedDuration = formatDuration(clientStartTime);
                        setSessionDuration(calculatedDuration);
                        // Keep loading for 2 seconds for smooth transition
                        loadingTimeoutRef.current = setTimeout(() => {
                            setIsFetchingSession(false);
                            loadingTimeoutRef.current = null;
                        }, 2000); // 2 seconds delay
                        // Notify parent component of status change
                        if (onStatusChange) {
                            onStatusChange('Session Started');
                        }
                    } else {
                        setSessionStarted(false);
                        setSessionStartTime(null);
                        setIsFetchingSession(false);
                    }
                    return;
                }
                
                // Handle SESSION_NOT_STARTED status - JobStatusEnum.SESSION_NOT_STARTED = "Session not started"
                if (apiStatus === 'Session not started') {
                    setSessionStarted(false);
                    setSessionStartTime(null);
                    setSessionDuration('00:00:00');
                    setIsFetchingSession(false);
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
                    setIsFetchingSession(false);
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
                setIsFetchingSession(false);
            }
        } catch (err) {
            console.error('Failed to fetch session status:', err);
            setSessionStarted(false);
            setSessionStartTime(null);
            setIsFetchingSession(false);
        }
    }, [searchParams, params, selectedJobId, sessionStartTime, onStatusChange, isFetchingSession, formatDuration, convertToClientTimezone]);

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
        isFetchingSession,
        
        // Setters
        setShowEndSessionModal,
        
        // Handlers
        handleStartSession,
        handleConfirmEndSession,
        
        // Data fetching
        fetchSessionStatus,
    };
};

