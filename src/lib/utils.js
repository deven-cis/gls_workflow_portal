// Helper utilities extracted from task-details page

export const createAttorneySection = (title) => ({
  id: `${title.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 9)}`,
  title,
  fields: {
    attorneyName: '',
    firmName: '',
    notes: '',
    orderDetails: ''
  },
  documents: []
});

export const getInitials = (name = '') => {
  const [first = '', second = ''] = name.split(' ');
  return `${first.charAt(0)}${second.charAt(0)}`.trim().toUpperCase() || first.charAt(0).toUpperCase();
};

/**
 * Convert 24-hour time format (HH:MM) to 12-hour AM/PM format
 * @param {string} time24 - Time in 24-hour format (e.g., "15:00", "09:30")
 * @returns {string} Time in 12-hour AM/PM format (e.g., "3:00 PM", "9:30 AM")
 */
export const formatTime12Hour = (time24) => {
  if (!time24) return '';
  
  // Handle different time formats
  const timeStr = String(time24).trim();
  if (!timeStr) return '';
  
  // Extract hours and minutes
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Handle invalid time
  if (isNaN(hours) || isNaN(minutes)) {
    // Try to extract just the time part if it's in a different format
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      return formatTime12Hour(`${h}:${m}`);
    }
    return timeStr; // Return original if can't parse
  }
  
  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight
  const minutesStr = minutes.toString().padStart(2, '0');
  
  return `${hours12}:${minutesStr} ${period}`;
};

export default {
  createAttorneySection,
  getInitials,
  formatTime12Hour
};
