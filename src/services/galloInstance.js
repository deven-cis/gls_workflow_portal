import { getToken, getRefreshToken, logout, setToken, setRefreshToken } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

/**
 * Generic fetch wrapper with error handling and token refresh
 */

// Flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;
// Queue of requests waiting for token refresh
let refreshQueue = [];

/**
 * Process queued requests after token refresh
 */
function processQueue(error, token = null) {
    refreshQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    refreshQueue = [];
}

/**
 * Refresh the access token using refresh token
 */
async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
   
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    try {
        console.log('Refreshing access token...');
        
        // Direct API call to refresh endpoint
        const response = await fetch(`${API_BASE_URL}/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        const text = await response.text();
        const contentType = response.headers.get('content-type') || '';
        
        let data = text;
        if (contentType.includes('application/json')) {
            try {
                data = JSON.parse(text);
            } catch (err) {
                // fall through, data remains text
            }
        }

        if (!response.ok) {
            throw new Error(`Refresh failed: ${response.status} ${response.statusText}`);
        }

        const tokenPayload = (data && typeof data === 'object' && 'result' in data) ? (data.result ?? data) : data;

        if (tokenPayload?.access_token) {
            console.log('Token refreshed successfully');
            // Store tokens using auth helpers (also decodes and stores claims)
            setToken(tokenPayload.access_token);
            if (tokenPayload.refresh_token) {
                setRefreshToken(tokenPayload.refresh_token);
            }
            return tokenPayload;
        } else {
            throw new Error('No access token in refresh response');
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, clear all tokens and logout
        logout();
        throw error;
    }
}

/**
 * Main token refresh handler with concurrency control
 */
async function handleTokenRefreshInternal() {
    if (isRefreshing) {
        // If already refreshing, wait for the current refresh to complete
        return new Promise((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
        });
    }

    isRefreshing = true;

    try {
        const newTokenData = await refreshAccessToken();
        processQueue(null, newTokenData.access_token);
        return newTokenData;
    } catch (error) {
        processQueue(error, null);
        throw error;
    } finally {
        isRefreshing = false;
    }
}

export const galloInstance = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get the access token using auth helper
    let token = typeof window !== 'undefined' ? getToken() : null;
    
    // Check if body is FormData - if so, don't set Content-Type (browser will set it with boundary)
    // Be robust: instanceof can fail across realms/polyfills
    const isFormData =
        (typeof FormData !== 'undefined' && options.body instanceof FormData) ||
        (!!options.body &&
            typeof options.body === 'object' &&
            typeof options.body.append === 'function' &&
            typeof options.body.get === 'function');
    
    const config = {
      headers: {
        // Only set Content-Type for non-FormData requests
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      ...options,
    };
    
    // Remove Content-Type if it was explicitly set to undefined (for FormData)
    if (config.headers['Content-Type'] === undefined) {
        delete config.headers['Content-Type'];
    }
  
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
  
      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401) {
        console.log('Received 401, attempting token refresh...');
        
        try {
            await handleTokenRefreshInternal();
            
            // Retry the original request with new token
            const newToken = typeof window !== 'undefined' ? getRefreshToken() : null;
            if (newToken) {
                const retryConfig = {
                    ...config,
                    headers: {
                        ...config.headers,
                        'Authorization': `Bearer ${newToken}`,
                    },
                };
                
                const retryResponse = await fetch(url, retryConfig);
                const retryText = await retryResponse.text();
                const retryContentType = retryResponse.headers.get('content-type') || '';
                
                let retryBody = retryText;
                if (retryContentType.includes('application/json')) {
                    try {
                        retryBody = JSON.parse(retryText);
                    } catch (err) {
                        // fall through, retryBody remains text
                    }
                }
                
                if (retryResponse.ok) {
                    return typeof retryBody === 'string' && !retryContentType.includes('application/json') ? { data: retryBody } : retryBody;
                } else {
                    // If retry also fails, fall through to error handling
                    body = retryBody;
                }
            }
        } catch (refreshError) {
            console.error('Token refresh failed during retry:', refreshError);
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
        err.message = message; // Store the actual message
        
        // For all errors (404, 422, 400, 500+), return structured error instead of throwing
        // This prevents error overlays - let components handle errors gracefully
        return {
          success: false,
          status_code: response.status,
          message: message,
          result: null,
          error: err
        };
      }

      // return parsed JSON when possible, otherwise raw text
      return typeof body === 'string' && !contentType.includes('application/json') ? { data: body } : body;
    } catch (error) {
      // Log all errors to console only (no error overlay)
      console.error(`API Call Failed: ${endpoint}`, error);
      
      // Return error structure instead of throwing - prevents error overlays
      return {
        success: false,
        status_code: error?.status || 500,
        message: error?.message || 'Request failed',
        result: null,
        error: error
      };
    }
  };
  