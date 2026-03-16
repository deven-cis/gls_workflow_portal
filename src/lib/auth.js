// Enhanced auth helpers with refresh token support
export const AUTH_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'resource';

// JWT claim keys
export const LOGIN_NAME_KEY = 'login_name';
export const RSRC_NO_KEY = 'rsrc_no';
export const RSRC_NAME_KEY = 'rsrc_name';
export const RSRC_ROLE_KEY = 'rsrc_role';
export const EXP_KEY = 'exp';
export const TYPE_KEY = 'type';
export const AUTH_SCHEME_KEY = 'auth_scheme';

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
        // Decode and store claims from token
        const claims = decodeJWT(token);
        if (claims) {
            window.localStorage.setItem(USER_KEY, JSON.stringify(claims));
        }
    } else {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
    }
}

export function getUser() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(USER_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.warn('Failed to parse stored user', e);
        return null;
    }
}


export function isAuthenticated() {
    return !!getToken();
}

export function logout() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem('showAllHistory');
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


// Get specific claim from stored user
export function getUserClaim(claimKey) {
    const user = getUser();
    return user ? user[claimKey] : null;
}

// Get role from token claims
export function getUserRole() {
    return getUserClaim(RSRC_ROLE_KEY);
}

// Check if user has specific role
export function hasRole(role) {
    const userRole = getUserRole();
    return userRole === role;
}

// Check if user has any of the given roles
export function hasAnyRole(roles) {
    const userRole = getUserRole();
    return roles.includes(userRole);
}

// Get resource number
export function getResourceNo() {
    return getUserClaim(RSRC_NO_KEY);
}

// Get resource name
export function getResourceName() {
    return getUserClaim(RSRC_NAME_KEY);
}

// Get login name
export function getLoginName() {
    return getUserClaim(LOGIN_NAME_KEY);
}
