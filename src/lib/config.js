/**
 * Centralized API Configuration
 * Reads from environment variables with fallback to default
 * 
 * Usage:
 *   import { API_BASE_URL } from '@/lib/config';
 * 
 * Environment Variables:
 *   NEXT_PUBLIC_API_BASE_URL - Public API base URL (accessible in browser)
 *   API_BASE_URL - Server-side API base URL (fallback)
 * 
 * Default: http://127.0.0.1:8000
 */

// Get API base URL from environment variables
// In Next.js, client-side code can only access NEXT_PUBLIC_* variables
// Server-side code can access all environment variables
const getApiBaseUrl = () => {
  // Try NEXT_PUBLIC_API_BASE_URL first (works in both client and server)
  if (typeof window !== 'undefined') {
    // Client-side: only NEXT_PUBLIC_* variables are available
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
  } else {
    // Server-side: can access all environment variables
    return process.env.NEXT_PUBLIC_API_BASE_URL || 
           process.env.API_BASE_URL || 
           'http://127.0.0.1:8000';
  }
};

// Export the base URL
export const API_BASE_URL = getApiBaseUrl();

// Export GALLo_URL as an alias for backward compatibility
export const GALLo_URL = API_BASE_URL;

// Helper function to resolve image/file URLs
export const resolveFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

