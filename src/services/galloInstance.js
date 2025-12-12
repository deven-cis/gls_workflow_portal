/**
 * Generic fetch wrapper with error handling
 */
const GALLo_URL = 'http://127.0.0.1:8000'; 

const API_BASE_URL = GALLo_URL;

export const galloInstance = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get the access token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    console.log('Token:', token);
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
  