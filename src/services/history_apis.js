import { galloInstance } from './galloInstance';
import { formatTime12Hour } from '@/lib/utils';

const mapJobToHistory = (job) => {
  const jobDate = new Date(job.job_date);
  const dateStr = jobDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time24 = job.start_time ? job.start_time.substring(0, 5) : '00:00';
  const timeStr = formatTime12Hour(time24);
  
  return {
    id: job.job_no,
    jobId: `Job${job.job_no}`,
    date: dateStr,
    time: timeStr,
    title: job.case?.case_short_name || `Job #${job.job_no}`,
    location: job.zoom_meeting_id ? 'Virtual - Zoom' : `${job.job_loc_name || ''}, ${job.job_loc_city || ''}`,
    isVirtual: !!job.zoom_meeting_id,
    status: job.computed_status || 'Completed',
    cancelReason: job.cancel_reason || null,
    cancelDetails: job.cancel_details || null,
    cancelDate: job.cancel_date || null,
    caseNo: job.case_no,
    caseInfo: {
      id: job.case?.id,
      name: job.case?.case_short_name,
      caseNumber: job.case?.case_number,
    },
    type: job.case?.case_type,
  };
};

export const historyAPI = {
  // Get cancelled or completed jobs list
  // type: 'Cancelled' or 'Completed'
  getJobsByType: async (type) => {
    try {
      // Backend expects type as path parameter: /jobs/cancelled_and_completed_jobs/{type}
      const response = await galloInstance(`/jobs/cancelled_and_completed_jobs/${type}`);
      
      // Handle error response (backend errors, 500, etc.)
      if (!response || response.success === false) {
        // Log to console only, don't throw
        console.log(`No ${type} jobs found or backend error:`, response?.message || 'Unknown error');
        return [];
      }
      
      // Handle empty result
      if (!response.result) {
        return [];
      }
      
      // Map jobs to history format
      const jobs = Array.isArray(response.result) ? response.result : Array.isArray(response) ? response : [];
      return jobs.map(mapJobToHistory);
    } catch (err) {
      // Catch any unexpected errors - log to console only
      console.error(`Failed to fetch ${type} jobs:`, err);
      return [];
    }
  },

  // Get completed job details with witnesses, videos, and attorneys
  // Backend endpoint: GET /jobs/get/{job_no}/completed_details
  getCompletedJobDetails: async (jobNo) => {
    try {
      const response = await galloInstance(`/jobs/get/${jobNo}/completed_details`);
      
      // Handle error response
      if (!response || response.success === false || !response.result) {
        console.log(`No job details found for job ${jobNo}:`, response?.message || 'Unknown error');
        return null;
      }
      
      return response.result;
    } catch (err) {
      console.error(`Failed to fetch job details for job ${jobNo}:`, err);
      return null;
    }
  },

  // Get cancelled job details
  // Backend endpoint: GET /jobs/get/{job_no}/cancelled_details
  getCancelledJobDetails: async (jobNo) => {
    try {
      const response = await galloInstance(`/jobs/get/${jobNo}/cancelled_details`);
      
      // Handle error response
      if (!response || response.success === false || !response.result) {
        console.log(`No cancelled job details found for job ${jobNo}:`, response?.message || 'Unknown error');
        return null;
      }
      
      return response.result;
    } catch (err) {
      console.error(`Failed to fetch cancelled job details for job ${jobNo}:`, err);
      return null;
    }
  },
};

