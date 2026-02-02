import { DateTime } from 'luxon';

// Cache for timezone to avoid repeated detection
let cachedTimezone = null;

/**
 * Check if code is running on client-side (browser)
 * @returns {boolean} True if running in browser
 */
const isClient = () => {
    return typeof window !== 'undefined';
};

/**
 * Validate if a timezone string is valid IANA timezone
 * @param {string} timezone - Timezone string to validate
 * @returns {boolean} True if valid timezone
 */
const isValidTimezone = (timezone) => {
    if (!timezone || typeof timezone !== 'string') return false;
    try {
        // Try to create a DateTime with this timezone
        const test = DateTime.now().setZone(timezone);
        return test.isValid && test.zoneName === timezone;
    } catch {
        return false;
    }
};

/**
 * Get client-side timezone from browser
 * Uses Intl.DateTimeFormat API to detect browser timezone
 * @returns {string} IANA timezone string (e.g., "America/New_York") or "EST" as fallback
 */
export const getClientTimezone = () => {
    // Return cached value if available
    if (cachedTimezone) {
        return cachedTimezone;
    }

    // Only work on client-side
    if (!isClient()) {
        cachedTimezone = 'EST';
        return cachedTimezone;
    }

    try {
        // Use native browser API to detect timezone
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserTz && isValidTimezone(browserTz)) {
            cachedTimezone = browserTz;
            return cachedTimezone;
        }
    } catch (error) {
        console.warn('Error detecting browser timezone:', error);
    }

    // Fallback to EST
    cachedTimezone = 'EST';
    return cachedTimezone;
};

/**
 * Get timezone (alias for getClientTimezone)
 * @returns {string} IANA timezone string
 */
export const getTimezone = () => {
    return getClientTimezone();
};

/**
 * Clear timezone cache (useful when user changes timezone or for testing)
 */
export const clearTimezoneCache = () => {
    cachedTimezone = null;
};

/**
 * Convert a date to a specific timezone
 * @param {Date|string|DateTime} date - Date to convert
 * @param {string} targetTimezone - Target IANA timezone string
 * @param {string} sourceTimezone - Source timezone (defaults to EST)
 * @returns {DateTime|null} Luxon DateTime object in target timezone, or null if invalid
 */
export const convertToTimezone = (date, targetTimezone, sourceTimezone = 'EST') => {
    try {
        if (!isValidTimezone(targetTimezone)) {
            console.warn(`Invalid target timezone: ${targetTimezone}`);
            return null;
        }

        let dt;
        
        // Handle different input types
        if (date instanceof DateTime) {
            dt = date.setZone(sourceTimezone).setZone(targetTimezone);
        } else if (date instanceof Date) {
            dt = DateTime.fromJSDate(date, { zone: sourceTimezone }).setZone(targetTimezone);
        } else if (typeof date === 'string') {
            dt = DateTime.fromISO(date, { zone: sourceTimezone }).setZone(targetTimezone);
        } else {
            console.warn('Invalid date input type');
            return null;
        }

        if (!dt.isValid) {
            console.warn('Invalid date:', date);
            return null;
        }

        return dt;
    } catch (error) {
        console.warn('Error converting to timezone:', error);
        return null;
    }
};

/**
 * Format a date in a specific timezone
 * @param {Date|string|DateTime} date - Date to format
 * @param {string} timezone - IANA timezone string
 * @param {string} format - Luxon format string (default: 'yyyy-MM-dd HH:mm')
 * @returns {string} Formatted date string or empty string if invalid
 */
export const formatInTimezone = (date, timezone, format = 'yyyy-MM-dd HH:mm') => {
    try {
        if (!isValidTimezone(timezone)) {
            console.warn(`Invalid timezone: ${timezone}`);
            return '';
        }

        let dt;
        
        // Handle different input types
        if (date instanceof DateTime) {
            dt = date.setZone(timezone);
        } else if (date instanceof Date) {
            dt = DateTime.fromJSDate(date).setZone(timezone);
        } else if (typeof date === 'string') {
            dt = DateTime.fromISO(date).setZone(timezone);
        } else {
            console.warn('Invalid date input type');
            return '';
        }

        if (!dt.isValid) {
            console.warn('Invalid date:', date);
            return '';
        }

        return dt.toFormat(format);
    } catch (error) {
        console.warn('Error formatting date in timezone:', error);
        return '';
    }
};

export default {
    getClientTimezone,
    getTimezone,
    convertToTimezone,
    formatInTimezone,
    clearTimezoneCache,
    isValidTimezone,
};
