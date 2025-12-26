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
  // startDate: Date object (optional)
  // endDate: Date object (optional)
  getJobsByType: async (type, startDate = null, endDate = null) => {
    try {
      // Format dates to YYYY-MM-DD for API
      const formatDateForAPI = (date) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) {
        params.append('start_date', formatDateForAPI(startDate));
      }
      if (endDate) {
        params.append('end_date', formatDateForAPI(endDate));
      }

      // Build URL with query parameters
      const queryString = params.toString();
      const url = `/jobs/cancelled_and_completed_jobs/${type}${queryString ? `?${queryString}` : ''}`;
      
      // Backend expects type as path parameter: /jobs/cancelled_and_completed_jobs/{type}
      const response = await galloInstance(url);
      
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

  
  downloadVideo: async (filePath, fileName) => {
    try {
      // Get the access token for authentication
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const API_BASE_URL = 'http://127.0.0.1:8000';
      
      // Construct the full download URL
      const downloadUrl = `${API_BASE_URL}/${filePath}`;
      
      // Fetch the file with authentication
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      // Get the blob data
      const blob = await response.blob();
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (err) {
      console.error('Failed to download video:', err);
      throw err;
    }
  },

  // Download all videos merged into one file
  // Backend endpoint: GET /jobs/get/{job_no}/completed_details?download_all=true
  // Returns FileResponse (merged video file)
  downloadAllVideos: async (jobNo) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const API_BASE_URL = 'http://127.0.0.1:8000';
      
      // Construct the download URL with download_all=true parameter
      const downloadUrl = `${API_BASE_URL}/jobs/get/${jobNo}/completed_details?download_all=true`;
      
      // Fetch the merged video file with authentication
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download merged video: ${response.statusText}`);
      }
      
      // Get the blob data
      const blob = await response.blob();
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = 'all_videos_merged.mp4';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (err) {
      console.error('Failed to download all videos:', err);
      throw err;
    }
  },
};

