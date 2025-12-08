// API Service Layer for FastAPI Backend Integration
// All API calls go through this service for easy backend integration

// Resolve API base URL:
// - If NEXT_PUBLIC_API_URL provided, ensure it points to the API root (append `/api` if missing)
// - Otherwise default to relative `/api` so the built-in Next.js mock routes are used during dev
let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
if (API_BASE_URL) {
  // strip trailing slashes
  API_BASE_URL = API_BASE_URL.replace(/\/+$/, '');
  // append `/api` if it's not already present
  if (!API_BASE_URL.endsWith('/api')) {
    API_BASE_URL = `${API_BASE_URL}/api`;
  }
} else {
  API_BASE_URL = '/api';
}

/**
 * Generic fetch wrapper with error handling
 */
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

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

  // Get pending tasks
  getPendingTasks: async () => {
    return apiCall('/tasks?status=pending');
  },

  // Get upcoming tasks
  getUpcomingTasks: async () => {
    return apiCall('/tasks?status=upcoming');
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
  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async () => {
    return apiCall('/auth/logout', {
      method: 'POST',
    });
  },

  getProfile: async () => {
    return apiCall('/auth/profile');
  },
};

export default {
  taskAPI,
  authAPI,
};
