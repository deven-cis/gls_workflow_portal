import { authAPI } from '@/services/api';
import { getRefreshToken, setToken, setRefreshToken, isTokenExpired, getToken, logout, getTokenTimeUntilExpiry } from './auth.js';

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
        const response = await authAPI.refreshToken(refreshToken);
        
        // Backend returns: { success, result: { access_token, refresh_token, ... } }
        // Extract the actual token data from result if present
        const tokenData = response?.result || response;
        
        if (tokenData.access_token) {
            console.log('Token refreshed successfully');
            setToken(tokenData.access_token);
            
            // Update refresh token if a new one is provided
            if (tokenData.refresh_token) {
                setRefreshToken(tokenData.refresh_token);
            }
            
            return tokenData;
        } else {
            throw new Error('No access token in refresh response');
        }
    } catch (error) {
        // Extract status code if available
        const status = error?.response?.status || error?.status;
        
        if (status === 429) {
            // 429: Too Many Requests - another refresh is in progress
            console.warn('Token refresh in progress (429 - Too Many Requests)');
            console.warn('Retrying after delay...');
            
            // Wait 100ms and retry
            await new Promise(r => setTimeout(r, 100));
            
            // Recursive retry (will be caught by outer handler if fails again)
            return refreshAccessToken();
        } else if (status === 401) {
            // 401: Unauthorized - refresh token is invalid/expired
            console.error('Refresh token invalid or expired (401)');
            logout();
            throw new Error('Refresh token expired - please login again');
        } else if (status === 500) {
            // 500: Server error
            console.error('Server error during token refresh (500)', error);
            throw new Error('Server error during token refresh');
        } else {
            // Other errors
            console.error('Token refresh failed:', error?.message || error);
            logout();
            throw error;
        }
    }
}

/**
 * Main token refresh handler with concurrency control
 */
export async function handleTokenRefresh() {
    if (isRefreshing) {
        // If already refreshing, wait for the current refresh to complete
        console.log('Token refresh in progress, queueing request...');
        return new Promise((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
        });
    }

    isRefreshing = true;

    try {
        const newTokenData = await refreshAccessToken();
        console.log('Processing queued refresh requests...');
        processQueue(null, newTokenData.access_token);
        return newTokenData;
    } catch (error) {
        console.error('Token refresh failed, rejecting queued requests');
        processQueue(error, null);
        throw error;
    } finally {
        isRefreshing = false;
    }
}

/**
 * Check if token needs refresh and refresh if necessary
 */
export async function ensureValidToken() {
    const currentToken = getToken();
    
    if (!currentToken) {
        throw new Error('No access token available');
    }

    // If token is expired or will expire soon (within 5 minutes), refresh it
    const timeUntilExpiry = getTokenTimeUntilExpiry(currentToken);
    
    if (timeUntilExpiry <= 300) { // 5 minutes
        console.log(`Token expiring in ${timeUntilExpiry}s, refreshing now...`);
        return await handleTokenRefresh();
    }

    return { access_token: currentToken };
}

/**
 * Wrapper for fetch that handles token refresh automatically
 */
export async function authenticatedFetch(url, options = {}) {
    const originalOptions = { ...options };
    
    try {
        // Ensure we have a valid token
        await ensureValidToken();
        
        // Add the current token to headers
        const token = getToken();
        const headers = {
            ...originalOptions.headers,
            'Authorization': `Bearer ${token}`,
        };
        
        // Make the request with updated headers
        let response = await fetch(url, {
            ...originalOptions,
            headers,
        });
        
        // If we get a 401, try to refresh and retry once
        if (response.status === 401) {
            console.warn('Got 401 Unauthorized, attempting token refresh...');
            
            try {
                await handleTokenRefresh();
                
                // Retry the original request with new token
                const newToken = getToken();
                const retryHeaders = {
                    ...originalOptions.headers,
                    'Authorization': `Bearer ${newToken}`,
                };
                
                console.log('Retrying request with new token...');
                response = await fetch(url, {
                    ...originalOptions,
                    headers: retryHeaders,
                });
                
                if (!response.ok) {
                    console.error(`Request failed after refresh: ${response.status} ${response.statusText}`);
                    throw new Error(`Request failed after token refresh: ${response.status}`);
                }
                
                console.log('✅ Request succeeded after token refresh');
                return response;
            } catch (refreshError) {
                console.error('Token refresh failed during retry:', refreshError);
                // If refresh fails, redirect to login
                if (typeof window !== 'undefined') {
                    console.log('Redirecting to login...');
                    window.location.href = '/auth/login';
                }
                throw refreshError;
            }
        }
        
        if (!response.ok) {
            console.error(`Request failed: ${response.status} ${response.statusText}`);
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }
        
        console.log(`Request succeeded: ${response.status}`);
        return response;
    } catch (error) {
        console.error('Token refresh failed:', error?.message || error);
        throw error;
    }
}
