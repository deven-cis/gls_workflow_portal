// Enhanced auth helpers with refresh token support
export const AUTH_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

export function getToken() {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getRefreshToken() {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token) {
    if (typeof window === 'undefined') return;
    if (token) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
}

export function setToken(token) {
    if (typeof window === 'undefined') return;
    if (token) {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
}

export function isAuthenticated() {
    return !!getToken();
}

export function logout() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// JWT token decoding utility
export function decodeJWT(token) {
    try {
        if (!token) return null;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

// Check if token is expired
export function isTokenExpired(token) {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
}

// Get time until token expires (in seconds)
export function getTokenTimeUntilExpiry(token) {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return 0;
    
    const currentTime = Date.now() / 1000;
    return Math.max(0, decoded.exp - currentTime);
}
