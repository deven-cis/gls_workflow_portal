
// FastAPI server URL - update this to your FastAPI server address
const FASTAPI_URL = 'http://127.0.0.1:8000';

let API_BASE_URL = FASTAPI_URL;


/**
 * Generic fetch wrapper with error handling
 */
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get the access token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add Authorization header if token exists
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);

    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    let body = text;
    if (contentType.includes('application/json')) {
      try {
        body = JSON.parse(text);
      } catch (err) {
        // fall through, body remains text
      }
    }

    // Handle 403 Forbidden - redirect to login
    if (response.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth/login';
      }
      return;
    }

    if (!response.ok) {
      const message = (body && body.message) || response.statusText || text || 'Unknown error';
      const err = new Error(`API Error: ${response.status} ${message}`);
      err.status = response.status;
      err.body = body;
      throw err;
    }

    // return parsed JSON when possible, otherwise raw text
    return typeof body === 'string' && contentType.includes('application/json') === false ? { data: body } : body;
  } catch (error) {
    console.error(`API Call Failed: ${endpoint}`, error);
    throw error;
  }
};

/**
 * Task API endpoints
 */
/**
 * Mapper function to convert backend job response to frontend task format
 */
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
    caseName: job.case?.case_short_name,
    caseType: job.case?.case_type,
    details: job.scheduling_notes_html || job.confirmation_notes_html || '',
    isVirtual: !!job.zoom_meeting_id,
    zoomMeetingId: job.zoom_meeting_id,
  };
};

export const taskAPI = {
  // Get all tasks
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiCall(`/tasks${params ? `?${params}` : ''}`);
  },

  // Get task by ID
  getTaskById: async (taskId) => {
    return apiCall(`/tasks/${taskId}`);
  },

  // Get pending tasks from backendx`
  getPendingTasks: async () => {
    const response = await apiCall('/jobs/pending/');
    return Array.isArray(response) ? response.map(mapJobToTask) : [];
  },

  // Get upcoming tasks from backend
  getUpcomingTasks: async () => {
    const response = await apiCall('/jobs/upcoming/');
    // Map backend response to frontend format
    return Array.isArray(response) ? response.map(mapJobToTask) : [];
  },

  // Create new task
  createTask: async (taskData) => {
    return apiCall('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  // Update task
  updateTask: async (taskId, taskData) => {
    return apiCall(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  },

  // Delete task
  deleteTask: async (taskId) => {
    return apiCall(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // Upload video
  uploadVideo: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    return fetch(`${API_BASE_URL}/tasks/${taskId}/upload-video`, {
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
    return apiCall('/api/login', {
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
    return apiCall('/auth/users/me');
  },

  refreshToken: async (refreshToken) => {
    return apiCall('/auth/token/refresh', {
      method: 'POST',
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },
};

export default {
  taskAPI,
  authAPI,
};
