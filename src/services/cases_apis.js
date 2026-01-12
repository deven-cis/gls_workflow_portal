import { galloInstance } from './galloInstance';
import { formatTime12Hour } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/config';

const mapJobToTask = (job) => {
  const jobDate = new Date(job.job_date);
  const jobYear = jobDate.getFullYear();
  const dateStr = jobDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric'});
  const start_time = job.start_time ? job.start_time.substring(0, 5) : '00:00';
  const end_time = job.end_time ? job.end_time.substring(0, 5) : '00:00';
  const startTimeStr = formatTime12Hour(start_time);
  const endTimeStr = formatTime12Hour(end_time);
  
  return {
    id: job.job_no,
    jobId: `Job${job.job_no}`,
    date: dateStr,
    jobYear: jobYear,
    startTime: startTimeStr,
    endTime: endTimeStr,
    title: job.case?.case_short_name || `Job #${job.job_no}`,
    location: job.zoom_meeting_id ? 'Virtual - Zoom' : `${job.job_loc_name || ''}, ${job.job_loc_city || ''}`,
    status: job.computed_status,
    caseNo: job.case_no,
    video_status: job.witness_videos_status,
    caseInfo: {
      id: job.case?.id,
      name: job.case?.case_short_name,
      caseNumber: job.case?.case_number,
    },
    type: job.case?.case_type,
    details: job.scheduling_notes_html || job.confirmation_notes_html || '',
    isVirtual: !!job.zoom_meeting_id,
    zoomMeetingId: job.zoom_meeting_id,
  };
};


export const casesAPI = {
    // Get all tasks
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return galloInstance(`/tasks${params ? `?${params}` : ''}`);
  },

  // Get case by ID
  // Backend endpoint: GET /case/get/{case_id}
  // Returns null if case doesn't exist (404) - this is not an error, just means case not found
  getCaseById: async (caseId) => {
    try {
      const response = await galloInstance(`/case/get/${caseId}`);
      
      // Backend returns: { status_code, message, success, result }
      if (response && response.success && response.result) {
        return response.result;
      }
      
      // If response structure is different, return the whole response
      return response;
    } catch (err) {
      // Handle 404 as "no case found" - not an error, just means case doesn't exist
      if (err?.status === 404 || 
          err?.message?.includes('404') || 
          err?.message?.includes('not found') ||
          err?.message?.includes('Case')) {
        console.log(`No case found for case_id ${caseId} - this is expected if case doesn't exist`);
        return null;
      }
      // Re-throw other errors
      throw err;
    }
  },

  editCase: async (caseId, caseData) => {
    const data = await galloInstance(`/case/edit/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(caseData),
    });
    console.log('Edited case data:', data);
    return data;
  },

  // Get pending tasks from backend with pagination
  // page: page number (default: 1)
  // pageSize: items per page (default: 5)
  getPendingTasks: async (page = 1, pageSize = 5) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      
      const response = await galloInstance(`/jobs/pending/?${params.toString()}`);
      
      // Handle error response
      if (!response || response.success === false) {
        console.log('No pending tasks found or backend error:', response?.message || 'Unknown error');
        return {
          tasks: [],
          pagination: {
            page: 1,
            pageSize: pageSize,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
          }
        };
      }
      
      // Map pagination from backend (snake_case) to frontend (camelCase)
      const backendPagination = response.pagination || {};
      const pagination = {
        page: backendPagination.page || page,
        pageSize: backendPagination.page_size || pageSize,
        total: backendPagination.total || 0,
        totalPages: backendPagination.total_pages || 0,
        hasNext: backendPagination.has_next || false,
        hasPrevious: backendPagination.has_previous || false
      };
      
      // Map jobs to task format
      const jobs = Array.isArray(response.result) ? response.result : [];
      const tasks = jobs.map(mapJobToTask);
      console.log("tasks---------------------------",tasks);
      
      return {
        tasks: tasks,
        pagination: pagination
      };
    } catch (err) {
      console.error('Failed to fetch pending tasks:', err);
      return {
        tasks: [],
        pagination: {
          page: 1,
          pageSize: pageSize,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false
        }
      };
    }
  },

  // Get job details with mark_is_done status
  // Backend endpoint: GET /jobs/get/{job_no}
  getJobMarkIsDoneDetails: async (jobNo,caseId ) => {
    try {
      const response = await galloInstance(`/jobs/get/${jobNo}/${caseId}`);
      return response;
    } catch (err) {
      // Handle 404 as "no job found"
      if (err?.status === 404 || 
          err?.message?.includes('404') || 
          err?.message?.includes('not found')) {
        console.log(`No job found for job_no ${jobNo}`);
        return null;
      }
      // Re-throw other errors
      throw err;
    }
  },

  // Get upcoming tasks from backend with pagination
  // page: page number (default: 1)
  // pageSize: items per page (default: 5)
  getUpcomingTasks: async (page = 1, pageSize = 5) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      
      const response = await galloInstance(`/jobs/upcoming/?${params.toString()}`);
      
      // Handle error response
      if (!response || response.success === false) {
        console.log('No upcoming tasks found or backend error:', response?.message || 'Unknown error');
        return {
          tasks: [],
          pagination: {
            page: 1,
            pageSize: pageSize,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
          }
        };
      }
      
      // Map pagination from backend (snake_case) to frontend (camelCase)
      const backendPagination = response.pagination || {};
      const pagination = {
        page: backendPagination.page || page,
        pageSize: backendPagination.page_size || pageSize,
        total: backendPagination.total || 0,
        totalPages: backendPagination.total_pages || 0,
        hasNext: backendPagination.has_next || false,
        hasPrevious: backendPagination.has_previous || false
      };
      
      // Map jobs to task format
      const jobs = Array.isArray(response.result) ? response.result : [];
      const tasks = jobs.map(mapJobToTask);
      
      return {
        tasks: tasks,
        pagination: pagination
      };
    } catch (err) {
      console.error('Failed to fetch upcoming tasks:', err);
      return {
        tasks: [],
        pagination: {
          page: 1,
          pageSize: pageSize,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false
        }
      };
    }
  },


  // Cancel a job
  // cancelData should contain: { reason: string, details: string }
  cancelJob: async (jobNo, cancelData) => {
    try {
      const payload = {
        cancel_reason: cancelData.reason,
        cancel_details: cancelData.details,
      };
      console.log('cancelJob payload', payload);
      const response = await galloInstance(`/jobs/${jobNo}/cancel`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      // Handle error response (422, 404, etc.)
      if (response && response.success === false) {
        const error = new Error(response.message || 'Failed to cancel job');
        error.status = response.status_code;
        error.body = response;
        throw error;
      }
      
      // Backend returns: { status_code, message, success, result }
      if (response && response.success) {
        return response;
      }
      
      // If response structure is different, return as is
      return response;
    } catch (err) {
      // Re-throw with more context
      const error = new Error(err.message || 'Failed to cancel job');
      error.status = err.status;
      error.body = err.body;
      throw error;
    }
  },

  // Create new task
  createTask: async (taskData) => {
    return galloInstance('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  // Update task
  updateTask: async (taskId, taskData) => {
    return galloInstance(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  },

  // Delete task
  deleteTask: async (taskId) => {
    return galloInstance(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // Upload video
  uploadVideo: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    return galloInstance(`/tasks/${taskId}/upload-video`, {
      method: 'POST',
      body: formData,
    }).then(res => {
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      return res.json();
    });
  },

  // Mark job section as done/undone
  markJobAsDone: async (jobNo, type, isDone) => {
    try {
      const response = await galloInstance(`/jobs/${jobNo}/mark_as_done/${type}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_done: isDone }),
      });
      
      if (response && response.success) {
        return response;
      }
      
      return response;
    } catch (err) {
      const error = new Error(err.message || `Failed to update ${type} done status`);
      error.status = err.status;
      error.body = err.body;
      throw error;
    }
  },
};