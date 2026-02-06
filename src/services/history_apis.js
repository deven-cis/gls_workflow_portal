import { galloInstance } from './galloInstance';
import { formatTime12Hour, downloadFile } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/config';
import { endpoints } from '@/constants/endpoints';

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
  // Get cancelled or completed jobs list with pagination
  // type: 'Cancelled' or 'Completed'
  // startDate: Date object (optional)
  // endDate: Date object (optional)
  // page: page number (default: 1)
  // pageSize: items per page (handled by backend default)
  // searchParams: object with optional search filters { jobNo, witnessName, caseName, caseNumber }
  getJobsByType: async (type, startDate = null, endDate = null, page = null, pageSize = null, searchParams = {}) => {
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
      params.append('page', page.toString());
      
      // Add search parameters if provided
      if (searchParams.jobNo && searchParams.jobNo.trim()) {
        params.append('job_no', searchParams.jobNo.trim());
      }
      if (searchParams.witnessName && searchParams.witnessName.trim()) {
        params.append('witness_name', searchParams.witnessName.trim());
      }
      if (searchParams.caseName && searchParams.caseName.trim()) {
        params.append('case_name', searchParams.caseName.trim());
      }
      if (searchParams.caseNumber && searchParams.caseNumber.trim()) {
        params.append('case_number', searchParams.caseNumber.trim());
      }

      // Build URL with query parameters
      const queryString = params.toString();
      const url = endpoints.jobs.cancelledAndCompletedJobs(type, queryString);
      
      // Backend expects type as path parameter: /jobs/cancelled_and_completed_jobs/{type}
      const response = await galloInstance(url);
      
      // Handle error response (backend errors, 500, etc.)
      if (!response || response.success === false) {
        // Log to console only, don't throw
        console.log(`No ${type} jobs found or backend error:`, response?.message || 'Unknown error');
        const backendPagination = response?.pagination || {};
        return {
          jobs: [],
          pagination: {
            page: backendPagination.page || 1,
            pageSize: backendPagination.page_size || pageSize,
            total: backendPagination.total || 0,
            totalPages: backendPagination.total_pages || 0,
            hasNext: backendPagination.has_next || false,
            hasPrevious: backendPagination.has_previous || false
          }
        };
      }
      
      // Handle empty result
      if (!response.result) {
        const backendPagination = response.pagination || {};
        return {
          jobs: [],
          pagination: {
            page: backendPagination.page || page,
            pageSize: backendPagination.page_size || pageSize || 10,
            total: backendPagination.total || 0,
            totalPages: backendPagination.total_pages || 0,
            hasNext: backendPagination.has_next || false,
            hasPrevious: backendPagination.has_previous || false
          }
        };
      }
      
      // Map jobs to history format
      const jobs = Array.isArray(response.result) ? response.result : [];
      
      // Map pagination from backend (snake_case) to frontend (camelCase)
      const backendPagination = response.pagination || {};
      const pagination = {
        page: backendPagination.page || page,
        pageSize: backendPagination.page_size || pageSize || 10,
        total: backendPagination.total || jobs.length,
        totalPages: backendPagination.total_pages || (jobs.length > 0 ? 1 : 0),
        hasNext: backendPagination.has_next || false,
        hasPrevious: backendPagination.has_previous || false
      };
      
      return {
        jobs: jobs.map(mapJobToHistory),
        pagination: pagination
      };
    } catch (err) {
      // Catch any unexpected errors - log to console only
      console.error(`Failed to fetch ${type} jobs:`, err);
      return {
        jobs: [],
        pagination: {
          page: page,
          pageSize: pageSize,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false
        }
      };
    }
  },

  // Get completed job details with witnesses, videos, and attorneys
  // Backend endpoint: GET /jobs/get/{job_no}/completed_details
  getCompletedJobDetails: async (jobNo) => {
    try {
      const response = await galloInstance(
        endpoints.jobs.completedDetails(jobNo)
      );
      console.log('completed job details:', response);
      
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
      const response = await galloInstance(
        endpoints.jobs.cancelledDetails(jobNo)
      );
      
      // Handle error response
      if (!response || response.success === false || !response.result) {
        console.log(`No cancelled job details found for job ${jobNo}:`, response?.message || 'Unknown error');
        return null;
      }
      console.log('cancelled job details:', response);
      
      return response.result;
    } catch (err) {
      console.error(`Failed to fetch cancelled job details for job ${jobNo}:`, err);
      return null;
    }
  },

  
  downloadVideo: async (filePath, fileName) => {
      const downloadUrl = `${API_BASE_URL}/${filePath}`;
    return downloadFile(downloadUrl, fileName || 'video.mp4');
  },

  // Download all videos merged into one file
  // Backend endpoint: GET /jobs/get/{job_no}/completed_details?download_all=true
  // Returns FileResponse (merged video file)
  downloadAllVideos: async (jobNo) => {
      const downloadUrl = `${API_BASE_URL}/jobs/get/${jobNo}/completed_details?download_all=true`;
    return downloadFile(downloadUrl, 'all_videos_merged.mp4');
  },
};

