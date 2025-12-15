import { galloInstance } from './galloInstance.js';

const GALLo_URL = 'http://127.0.0.1:8000'; 
let API_BASE_URL = GALLo_URL;

const mapJobToTask = (job) => {
  const jobDate = new Date(job.job_date);
  const dateStr = jobDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = job.start_time ? job.start_time.substring(0, 5) : '00:00';
  
  return {
    id: job.job_no,
    jobId: `Job${job.job_no}`,
    date: dateStr,
    time: `${timeStr}`,
    title: job.case?.case_short_name || `Job #${job.job_no}`,
    location: job.zoom_meeting_id ? 'Virtual - Zoom' : `${job.job_loc_name || ''}, ${job.job_loc_city || ''}`,
    status: job.computed_status || job.status,
    caseNo: job.case_no,
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

export const taskAPI = {
  // Get all tasks
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return galloInstance(`/tasks${params ? `?${params}` : ''}`);
  },

  // Get task by ID
  getCaseById: async (caseId) => {
    const data = await galloInstance(`/case/get/${caseId}`);
    console.log('Case data:', data);
    return data;
  },

  editCase: async (caseId, caseData) => {
    const data = await galloInstance(`/case/edit/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(caseData),
    });
    console.log('Edited case data:', data);
    return data;
  },

  // Get pending tasks from backendx`
  getPendingTasks: async () => {
    const response = await galloInstance('/jobs/pending/');
    return Array.isArray(response) ? response.map(mapJobToTask) : [];
  },

  // Get upcoming tasks from backend
  getUpcomingTasks: async () => {
    const response = await galloInstance('/jobs/upcoming/');
    // Map backend response to frontend format
    return Array.isArray(response) ? response.map(mapJobToTask) : [];
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
};

/**
 * Auth API endpoints
 */
export const authAPI = {
  login: async (login_name, login_password) => {
    return galloInstance('/api/login', {
      method: 'POST',
      body: JSON.stringify({ login_name, login_password }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  logout: () => {
    // Clear tokens from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    return Promise.resolve();
  },

  getProfile: async () => {
    return galloInstance('/auth/users/me');
  },


  refreshToken: async (refreshToken) => {
    return galloInstance('/api/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
};


export default {
  taskAPI,
  authAPI
};
