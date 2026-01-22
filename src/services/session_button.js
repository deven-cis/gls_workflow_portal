import { galloInstance } from './galloInstance';
import { endpoints } from '@/constants/endpoints';

export const sessionAPI = {
    /**
     * Start a session for a job
     * Backend endpoint: POST /jobs/{job_no}/session/start
     * Backend returns: { status_code, message, success, result: { job_no, start_time, computed_status } }
     */
    startSession: async (jobNo) => {
        const response = await galloInstance(endpoints.jobs.sessionStart(jobNo), {
            method: 'POST',
        });
        
        if (response && response.success === false) {
            const message = response?.message || 'Failed to start session';
            throw new Error(message);
        }
        
        return response?.result ?? response;
    },

    /**
     * Get session start time for a job
     * Backend endpoint: GET /jobs/get/{job_no}/session_start_time/
     * Backend returns: { status_code, message, success, result: "ISO format datetime string" }
     * Returns the full response object (including success: false) so caller can handle it
     */
    getSessionStartTime: async (jobNo) => {
        try {
            const response = await galloInstance(
                endpoints.jobs.sessionStartTime(jobNo)
            );
            // Return the full response object so caller can check success status
            return response;
        } catch (err) {
            return {
                success: false,
                result: {},
            };
        }
    },

    /**
     * End a session for a job
     * Backend endpoint: POST /jobs/{job_no}/session/end
     * Backend returns: { status_code, message, success, result: {} }
     */
    endSession: async (jobNo) => {
        const response = await galloInstance(endpoints.jobs.sessionEnd(jobNo), {
            method: 'POST',
        });
        
        if (response && response.success === false) {
            const message = response?.message || 'Failed to end session';
            throw new Error(message);
        }
        
        return response?.result ?? response;
    },
};