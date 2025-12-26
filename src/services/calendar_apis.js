import { galloInstance } from './galloInstance';

/**
 * Map backend calendar event (CalendarEventSchema) to frontend event format
 * Backend returns: job_to_calendar_event(job, db) which is CalendarEventSchema
 */
const mapCalendarEvent = (apiEvent) => {
  // Parse date field (could be 'date' or 'job_date') to Date object
  // Normalize to local date to avoid timezone issues
  // Backend returns: date=job.job_date (Python date object serialized as string)
  let jobDate;
  const dateValue = apiEvent.date || apiEvent.job_date;
  
  if (dateValue) {
    let dateStr;
    if (dateValue instanceof Date) {
      dateStr = dateValue.toISOString().split('T')[0];
    } else if (typeof dateValue === 'string') {
      // Handle formats like '2025-12-23T00:00:00', '2025-12-23', or '2025-12-23 00:00:00'
      // Extract just the date part (YYYY-MM-DD)
      dateStr = dateValue.split('T')[0].split(' ')[0]; // Get YYYY-MM-DD part only
    } else {
      dateStr = null;
    }
    
    if (dateStr) {
      // Create date from YYYY-MM-DD string to avoid timezone conversion issues
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        
        // Validate parsed values
        if (!isNaN(year) && !isNaN(month) && !isNaN(day) && 
            year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          jobDate = new Date(year, month - 1, day); // month is 0-indexed in JS
          jobDate.setHours(0, 0, 0, 0); // Normalize to midnight
        } else {
          jobDate = new Date();
          jobDate.setHours(0, 0, 0, 0);
        }
      } else {
        jobDate = new Date();
        jobDate.setHours(0, 0, 0, 0);
      }
    } else {
      jobDate = new Date();
      jobDate.setHours(0, 0, 0, 0);
    }
  } else {
    jobDate = new Date();
    jobDate.setHours(0, 0, 0, 0);
  }
  
  // Extract time strings (format: "HH:MM:SS" or "HH:MM" or just time string)
  // API returns startTime/endTime (camelCase) or start_time/end_time (snake_case)
  const startTimeValue = apiEvent.startTime || apiEvent.start_time || null;
  const endTimeValue = apiEvent.endTime || apiEvent.end_time || null;
  
  // Parse time string to HH:MM format
  const parseTime = (timeValue) => {
    if (!timeValue) return null;
    if (typeof timeValue === 'string') {
      // Handle formats like "13:10", "13:10:00", "13:10:00.000"
      const timeParts = timeValue.split(':');
      if (timeParts.length >= 2) {
        const hours = timeParts[0].padStart(2, '0');
        const minutes = timeParts[1].padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    }
    return null;
  };
  
  const startTime = parseTime(startTimeValue) || '00:00';
  const endTime = parseTime(endTimeValue) || '23:59';
  
  // Determine if pending based on computed_status or video upload status
  // Backend uses JobStatusEnum values like 'SESSION_NOT_STARTED', 'SESSION_IN_PROGRESS', etc.
  // Also check explicit 'pending' status from API
  const computedStatus = apiEvent.computed_status || apiEvent.status || '';
  const explicitPending = apiEvent.status === 'pending' || apiEvent.status === 'Pending';
  const isPending = explicitPending ||
                   computedStatus === 'SESSION_NOT_STARTED' || 
                   computedStatus === 'SESSION_IN_PROGRESS' ||
                   (apiEvent.videos_uploaded !== undefined && 
                    apiEvent.videos_uploaded !== null &&
                    apiEvent.total_videos !== undefined &&
                    apiEvent.total_videos !== null &&
                    apiEvent.videos_uploaded < apiEvent.total_videos);
  
  // Calculate deadline if provided (could be upload_deadline or deadline field)
  let deadline = null;
  if (apiEvent.upload_deadline) {
    deadline = apiEvent.upload_deadline instanceof Date 
      ? apiEvent.upload_deadline 
      : new Date(apiEvent.upload_deadline);
  } else if (apiEvent.deadline) {
    deadline = apiEvent.deadline instanceof Date 
      ? apiEvent.deadline 
      : new Date(apiEvent.deadline);
  }
  
  // Determine final status
  let finalStatus = 'scheduled';
  if (apiEvent.status === 'pending' || isPending) {
    finalStatus = 'pending';
  }
  
  const mappedEvent = {
    id: apiEvent.job_no || apiEvent.id,
    title: apiEvent.case?.case_short_name || apiEvent.title || apiEvent.case_short_name || `Job #${apiEvent.job_no}`,
    date: jobDate, // This is already a normalized Date object
    startTime: startTime,
    endTime: endTime,
    status: finalStatus,
    videosUploaded: apiEvent.videos_uploaded !== undefined && apiEvent.videos_uploaded !== null 
      ? apiEvent.videos_uploaded 
      : (apiEvent.videosUploaded !== undefined && apiEvent.videosUploaded !== null ? apiEvent.videosUploaded : 0),
    totalVideos: apiEvent.total_videos !== undefined && apiEvent.total_videos !== null
      ? apiEvent.total_videos
      : (apiEvent.totalVideos !== undefined && apiEvent.totalVideos !== null ? apiEvent.totalVideos : 0),
    deadline: deadline,
    hasVideo: apiEvent.has_video || apiEvent.hasVideo || (apiEvent.total_videos > 0) || (apiEvent.totalVideos > 0),
    type: apiEvent.case?.case_type || apiEvent.type || apiEvent.case_type || 'deposition',
    location: apiEvent.job_loc_name || apiEvent.location || '',
    caseNo: apiEvent.case_no || apiEvent.caseNo,
    jobNo: apiEvent.job_no,
    computedStatus: computedStatus,
  };
  
  return mappedEvent;
};

export const calendarAPI = {
  /**
   * Get calendar events for a month
   * @param {number} year - Year (e.g., 2025)
   * @param {number} month - Month (1-12)
   * @returns {Promise<Array>} Array of calendar events
   */
  getMonthEvents: async (year, month) => {
    try {
      const params = new URLSearchParams({ year: year.toString(), month: month.toString() });
      const response = await galloInstance(`/jobs/calendar/events?${params.toString()}`);
      if (response?.success && response?.result) {
        return response.result.map(mapCalendarEvent);
      }
      
      // Handle error response structure
      if (response && !response.success) {
        console.warn('Calendar API error:', response.message || 'Unknown error');
        return [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching month events:', error);
      return [];
    }
  },

  /**
   * Get calendar events for a week
   * @param {number} year - Year (e.g., 2025)
   * @param {number} month - Month (1-12)
   * @param {number} day - Day (1-31)
   * @returns {Promise<Array>} Array of calendar events
   */
  getWeekEvents: async (year, month, day) => {
    try {
      const params = new URLSearchParams({ 
        year: year.toString(), 
        month: month.toString(),
        day: day.toString()
      });
      const response = await galloInstance(`/jobs/calendar/events?${params.toString()}`);
      if (response?.success && response?.result) {
        return response.result.map(mapCalendarEvent);
      }
      
      // Handle error response structure
      if (response && !response.success) {
        return [];
      }
      
      return [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get calendar events for a custom date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of calendar events
   */
  getCustomRangeEvents: async (startDate, endDate) => {
    try {
      // Format dates to YYYY-MM-DD
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const params = new URLSearchParams({
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      });
      const response = await galloInstance(`/jobs/calendar/events?${params.toString()}`);

      if (response?.success && response?.result) {
        return response.result.map(mapCalendarEvent);
      }
      
      // Handle error response structure
      if (response && !response.success) {
        console.warn('Calendar API error:', response.message || 'Unknown error');
        return [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching custom range events:', error);
      return [];
    }
  },
};

