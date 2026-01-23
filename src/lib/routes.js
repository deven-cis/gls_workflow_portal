/**
 * Centralized route constants and utilities
 * Single source of truth for all application routes
 */

// Base route constants
export const ROUTES = {
  // Auth routes
  AUTH: {
    LOGIN: '/auth/login',
    ROOT: '/auth',
  },
  
  // Dashboard routes
  DASHBOARD: {
    ROOT: '/dashboard',
    LIST_OF_TASKS: '/dashboard/list_of_tasks',
    HISTORY: '/dashboard/history',
    CALENDAR: '/dashboard/calendar',
    SETTINGS: '/dashboard/settings',
    TASK_DETAILS: (caseId, params = {}) => {
      const base = `/dashboard/task-details/${caseId}`;
      const queryString = buildQueryString(params);
      return queryString ? `${base}?${queryString}` : base;
    },
  },
  
  // Root
  ROOT: '/',
};

/**
 * Build query string from params object
 * @param {Record<string, string | number | null | undefined>} params - Query parameters
 * @returns {string} Query string (without leading ?)
 */
export function buildQueryString(params) {
  if (!params || typeof params !== 'object') return '';
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
}

/**
 * Build full URL with path and query params
 * @param {string} path - Base path
 * @param {Record<string, string | number | null | undefined>} params - Query parameters
 * @returns {string} Full URL with query string
 */
export function buildRoute(path, params = {}) {
  const queryString = buildQueryString(params);
  return queryString ? `${path}?${queryString}` : path;
}

/**
 * Navigation utility hook (optional - can be used for type-safe navigation)
 * Usage: const navigate = useNavigation(); navigate.toTaskDetails(caseId, { jobId });
 */
export function createNavigationHelper(router) {
  return {
    toLogin: () => router.push(ROUTES.AUTH.LOGIN),
    toDashboard: () => router.push(ROUTES.DASHBOARD.LIST_OF_TASKS),
    toTasks: () => router.push(ROUTES.DASHBOARD.LIST_OF_TASKS),
    toHistory: () => router.push(ROUTES.DASHBOARD.HISTORY),
    toCalendar: () => router.push(ROUTES.DASHBOARD.CALENDAR),
    toSettings: () => router.push(ROUTES.DASHBOARD.SETTINGS),
    toTaskDetails: (caseId, params = {}) => {
      router.push(ROUTES.DASHBOARD.TASK_DETAILS(caseId, params));
    },
    back: () => router.back(),
    push: (path, params) => {
      router.push(buildRoute(path, params));
    },
  };
}

