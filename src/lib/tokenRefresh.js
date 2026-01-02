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
        console.error('Token refresh failed:', error);
        // If refresh fails, clear all tokens and logout
        logout();
        throw error;
    }
}

/**
 * Main token refresh handler with concurrency control
 */
export async function handleTokenRefresh() {
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
        console.log('Token will expire soon, refreshing...');
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
        const response = await fetch(url, {
            ...originalOptions,
            headers,
        });
        
        // If we get a 401, try to refresh and retry once
        if (response.status === 401) {
            console.log('Received 401, attempting token refresh...');
            
            try {
                await handleTokenRefresh();
                
                // Retry the original request with new token
                const newToken = getToken();
                const retryHeaders = {
                    ...originalOptions.headers,
                    'Authorization': `Bearer ${newToken}`,
                };
                
                const retryResponse = await fetch(url, {
                    ...originalOptions,
                    headers: retryHeaders,
                });
                
                if (!retryResponse.ok) {
                    throw new Error(`Request failed after token refresh: ${retryResponse.status}`);
                }
                
                return retryResponse;
            } catch (refreshError) {
                console.error('Token refresh failed during retry:', refreshError);
                // If refresh fails, redirect to login
                if (typeof window !== 'undefined') {
                    window.location.href = '/auth/login';
                }
                throw refreshError;
            }
        }
        
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        console.error('Authenticated fetch failed:', error);
        
        // If it's a network error or other error (not 401), throw it
        if (!error.message.includes('401')) {
            throw error;
        }
        
        throw error;
    }
}
