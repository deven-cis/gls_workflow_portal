"use client";
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock, X, MapPin, Calendar as CalendarIcon, Lock, ExternalLink } from 'lucide-react';
import { calendarAPI } from '@/services/calendar_apis';
import { DateTime } from 'luxon';
import { getClientTimezone, convertToTimezone } from '@/lib/timezone_util';

// Format video_status object to string for tooltip
const formatVideoStatus = (videoStatus) => {
  if (!videoStatus || typeof videoStatus !== 'object') return '';
  
  return Object.entries(videoStatus)
    .map(([name, status]) => `${name} ${status}`)
    .join(', ');
};

// Video Pending badge component with hover tooltip
const VideoPendingBadge = ({ videoStatus }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const videoPendingData = formatVideoStatus(videoStatus);
  
  // Only render if videoStatus exists
  if (!videoStatus || typeof videoStatus !== 'object' || Object.keys(videoStatus).length === 0) {
    return null;
  }
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="px-2 py-0.5 bg-pink-50 text-red-600 text-[10px] font-semibold rounded-2xl cursor-pointer hover:bg-pink-100 transition-colors ring-1 ring-red-200/50 shadow-sm">
        Videos Pending
      </span>
      {showTooltip && videoPendingData && (
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-gray-100 border border-gray-300 text-gray-900 text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
          {videoPendingData}
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-100 border-r border-b border-gray-300 rotate-45"></div>
        </div>
      )}
    </div>
  );
};

// Constants
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Utility functions
const formatTime = (timeString) => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  // Return format like "10 AM" or "3 PM" (without minutes if :00)
  if (minutes === '00') {
    return `${displayHour} ${ampm}`;
  }
  return `${displayHour}:${minutes} ${ampm}`;
};

const getTimeRemaining = (deadline) => {
  if (!deadline) return null;
  const now = new Date();
  const diff = deadline - now;
  if (diff <= 0) return { hours: 0, minutes: 0 };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes };
};

// Build navigation URL for an event based on its computed_status
// - If status is "Cancelled"  -> history cancelled tab
// - If status is "Completed"  -> history completed tab (default)
// - Otherwise                 -> task details page (previous behaviour)
const buildEventLink = (event) => {
  console.log('event---------------------------:', event);
  if (!event) return null;

  const status = (event.computedStatus || '').toString().toLowerCase();
  console.log('status:', status);

  if (status === 'cancelled') {
    return '/dashboard/history?tab=cancelled';
  }

  if (status === 'completed') {
    return '/dashboard/history';
  }

  // Fallback: original behaviour – navigate to task details when we have IDs
  if (event.caseId && event.id) {
    return `/dashboard/task-details/${event.caseId}?jobId=${event.id}`;
  }

  return null;
};

// Normalize date to midnight in local timezone for accurate comparison
const normalizeDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  // Check if date is valid
  if (isNaN(d.getTime())) {
    console.error('Invalid date passed to normalizeDate:', date);
    return null;
  }
  d.setHours(0, 0, 0, 0);
  return d;
};

const isSameDate = (date1, date2) => {
  if (!date1 || !date2) return false;
  const normalized1 = normalizeDate(date1);
  const normalized2 = normalizeDate(date2);
  return normalized1.getTime() === normalized2.getTime();
};

// Reusable EventCard Component
function EventCard({ event, formatTime, getTimeRemaining, variant = 'default', onClick, onNavigate }) {
  console.log('event=============:', event);
  const isPending = event.status === 'pending';
  const timeRemaining = event.deadline ? getTimeRemaining(event.deadline) : null;
  const isCompact = variant === 'compact';
  
  // Build navigation URL based on event status / IDs
  const linkUrl = buildEventLink(event);
  const hasValidLink = !!linkUrl;
  
  const handleLinkClick = (e) => {
    e.stopPropagation(); // Prevent triggering the card's onClick
    if (hasValidLink && onNavigate) {
      onNavigate(linkUrl);
    }
  };

  return (
    <div
      className={`rounded-md overflow-hidden ${isCompact ? 'mb-1' : 'mb-1'} cursor-pointer hover:opacity-90 transition-opacity`}
      onClick={onClick}
    >
      {/* Blue header bar with time and link icon */}
      <div className="bg-blue-600 text-white px-2 py-1 flex items-center justify-between">
        <div className="flex items-center flex-1 min-w-0">
          <div className="w-0.5 h-3 bg-white mr-2 flex-shrink-0"></div>
          <div className="text-xs font-semibold truncate">
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </div>
        </div>
        {/* Link icon to navigate to task details */}
        {hasValidLink && (
          <button
            onClick={handleLinkClick}
            className="ml-1 p-0.5 hover:bg-white/20 rounded transition-colors flex-shrink-0"
            title="Open task details"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Light blue-gray card body */}
      <div className={`bg-blue-50 ${isCompact ? 'p-1.5' : 'p-2'}`}>
        {/* Event title - dark blue */}
        <div className={`text-blue-900 font-medium ${isCompact ? 'truncate text-[10px] leading-tight mb-1' : 'text-xs leading-tight mb-1'}`}>
          {isCompact ? (
            event.title.length > 28 ? `${event.title.substring(0, 28)}...` : event.title
          ) : (
            event.title.length > 32 ? `${event.title.substring(0, 32)}...` : event.title
          )}
        </div>
        
        {/* Videos Pending Badge */}
        {event.witnessVideosStatus && (
          <div className="mb-1">
            <VideoPendingBadge videoStatus={event.witnessVideosStatus} />
          </div>
        )}
        
        {timeRemaining && (
          <div className="flex items-center gap-1 text-red-600 text-[10px] font-medium leading-tight">
            <Clock className="w-3 h-3" />
            <span>
              Deadline: {timeRemaining.hours}hrs {timeRemaining.minutes} min
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable ViewToggle Component
function ViewToggle({ viewMode, onViewChange }) {
  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-1 border border-gray-200">
      <button
        onClick={() => onViewChange('week')}
        className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
          viewMode === 'week'
            ? 'bg-white text-gray-900 shadow-lg'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        aria-pressed={viewMode === 'week'}
        aria-label="Switch to Week View"
      >
        Week
      </button>
      <button
        onClick={() => onViewChange('month')}
        className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
          viewMode === 'month'
            ? 'bg-white text-gray-900 shadow-lg'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        aria-pressed={viewMode === 'month'}
        aria-label="Switch to Month View"
      >
        Month
      </button>
    </div>
  );
}

// Main CalendarView Component
export default function CalendarView({ 
  userName = "Jakir", 
  showHero = true,
  initialDate = null,
  initialViewMode = 'month'
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial viewMode from URL, default to 'month' (like history view tabs)
  const viewModeFromUrl = searchParams.get('calendarView');
  const initialView = viewModeFromUrl === 'week' ? 'week' : 'month';
  
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState(initialView);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigate to task details page
  const handleNavigateToTask = useCallback((url) => {
    router.push(url);
  }, [router]);

  // Sync viewMode with URL parameter when it changes
  useEffect(() => {
    const viewModeFromUrl = searchParams.get('calendarView');
    const newView = viewModeFromUrl === 'week' ? 'week' : 'month';
    if (newView !== viewMode) {
      setViewMode(newView);
    }
  }, [searchParams, viewMode]);

  // Handle view mode change with URL update
  const handleViewModeChange = useCallback((newViewMode) => {
    setViewMode(newViewMode);
    
    // Update URL to persist view selection (like history view tabs)
    const params = new URLSearchParams(searchParams.toString());
    if (newViewMode === 'month') {
      params.delete('calendarView'); // Remove param for default (month)
    } else {
      params.set('calendarView', newViewMode);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Fetch events from API
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed, API expects 1-12
        const day = currentDate.getDate();
        
        let fetchedEvents = [];
        
        if (viewMode === 'week') {
          // Fetch week events
          fetchedEvents = await calendarAPI.getWeekEvents(year, month, day);
        } else {
          // For month view, calculate the date range that includes:
          // - Previous month's trailing days (shown in calendar grid)
          // - Current month's days
          // - Next month's leading days (shown in calendar grid)
          
          const jsMonth = currentDate.getMonth(); // 0-indexed
          const jsYear = currentDate.getFullYear();
          
          // Get first day of current month
          const firstDay = new Date(jsYear, jsMonth, 1);
          const startingDayOfWeek = firstDay.getDay();
          
          // Calculate previous month's trailing days
          const prevMonth = new Date(jsYear, jsMonth, 0);
          const daysInPrevMonth = prevMonth.getDate();
          const trailingDays = startingDayOfWeek; // Number of trailing days from previous month
          
          // Get last day of current month
          const lastDay = new Date(jsYear, jsMonth + 1, 0);
          const lastDayOfWeek = lastDay.getDay();
          const leadingDays = lastDayOfWeek === 6 ? 0 : 6 - lastDayOfWeek; // Number of leading days from next month
          
          // Calculate start date (first trailing day from previous month)
          // If trailingDays = 0, start from first day of current month
          const startDate = trailingDays > 0 
            ? new Date(jsYear, jsMonth - 1, daysInPrevMonth - trailingDays + 1)
            : new Date(jsYear, jsMonth, 1);
          startDate.setHours(0, 0, 0, 0);
          
          // Calculate end date (last leading day from next month)
          // If leadingDays = 0, end on last day of current month
          const endDate = leadingDays > 0
            ? new Date(jsYear, jsMonth + 1, leadingDays)
            : new Date(jsYear, jsMonth + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          
          // Fetch events for the entire calendar grid range
          fetchedEvents = await calendarAPI.getCustomRangeEvents(startDate, endDate);
        }
        
        // Ensure fetchedEvents is an array
        setEvents(Array.isArray(fetchedEvents) ? fetchedEvents : []);
      } catch (err) {
        setError(err?.message || 'Failed to load calendar events. Please try again.');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentDate, viewMode]);

  // Get events for a specific date
  const getEventsForDate = useMemo(() => {
    return (date) => {
      if (!date || !events || events.length === 0) return [];
      
      // Normalize the target date to midnight
      const targetDate = normalizeDate(date);
      if (!targetDate) return [];
      
      return events.filter(event => {
        if (!event || !event.date) return false;
        
        // event.date should already be a Date object from mapCalendarEvent
        // But handle edge cases where it might be a string or other format
        let eventDate;
        if (event.date instanceof Date) {
          // Already a Date object - use it directly
          eventDate = event.date;
        } else if (typeof event.date === 'string') {
          // Parse string date (format: '2025-12-23T00:00:00' or '2025-12-23')
          const dateStr = event.date.split('T')[0];
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            // Create date in local timezone to avoid timezone issues
            eventDate = new Date(year, month - 1, day);
          } else {
            eventDate = new Date(event.date);
          }
        } else {
          eventDate = new Date(event.date);
        }
        
        // Use isSameDate for consistent comparison
        // This normalizes both dates and compares them
        return isSameDate(eventDate, targetDate);
      });
    };
  }, [events]);

  // Navigate months/weeks - using client timezone
  const navigateDate = (direction) => {
    setCurrentDate(prev => {
      try {
        const clientTimezone = getClientTimezone();
        
        // Convert current date to client timezone
        const prevDt = DateTime.fromJSDate(prev, { zone: 'UTC' }).setZone(clientTimezone);
        
        let newDt;
        if (viewMode === 'month') {
          // Navigate by month in client timezone
          newDt = prevDt.plus({ months: direction });
        } else {
          // Navigate by week (7 days) in client timezone
          newDt = prevDt.plus({ days: direction * 7 });
        }
        
        return newDt.toJSDate();
      } catch (error) {
        console.warn('Error navigating date with timezone:', error);
        // Fallback to basic navigation
        const newDate = new Date(prev);
        if (viewMode === 'month') {
          newDate.setMonth(prev.getMonth() + direction);
        } else {
          newDate.setDate(prev.getDate() + (direction * 7));
        }
        return newDate;
      }
    });
  };

  // Get week dates - week starts on Monday, calculated in client timezone
  const weekDates = useMemo(() => {
    const dates = [];
    
    try {
      const clientTimezone = getClientTimezone();
      
      // Convert currentDate to client timezone
      const currentDt = DateTime.fromJSDate(currentDate, { zone: 'UTC' }).setZone(clientTimezone);
      const current = currentDt.startOf('day').toJSDate();
      
      // Get day of week (0=Sun, 1=Mon, ..., 6=Sat)
      const dayOfWeek = current.getDay();
      
      // Calculate days to subtract to get to Monday
      // Monday = 1, so we go back (dayOfWeek - 1) days
      // Special case: Sunday (0) means go back 6 days to previous Monday
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      // Calculate Monday's date by subtracting days in client timezone
      const mondayDt = currentDt.minus({ days: daysFromMonday });
      const monday = mondayDt.startOf('day').toJSDate();
      
      // Generate 7 days starting from Monday in client timezone
      for (let i = 0; i < 7; i++) {
        const dateDt = mondayDt.plus({ days: i });
        dates.push(dateDt.startOf('day').toJSDate());
      }
    } catch (error) {
      console.warn('Error calculating week dates with timezone:', error);
      // Fallback to basic calculation
      const current = new Date(currentDate);
      current.setHours(0, 0, 0, 0);
      const dayOfWeek = current.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(current);
      monday.setDate(current.getDate() - daysFromMonday);
      monday.setHours(0, 0, 0, 0);
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        date.setHours(0, 0, 0, 0);
        dates.push(date);
      }
    }
    
    return dates;
  }, [currentDate]);

  // Get month calendar grid - calculated in client timezone
  const monthCalendar = useMemo(() => {
    try {
      const clientTimezone = getClientTimezone();
      
      // Convert currentDate to client timezone
      const currentDt = DateTime.fromJSDate(currentDate, { zone: 'UTC' }).setZone(clientTimezone);
      const year = currentDt.year;
      const month = currentDt.month; // 1-12
      
      const firstDay = currentDt.startOf('month');
      const lastDay = currentDt.endOf('month');
      const daysInMonth = lastDay.day; // Day of month (1-31)
      const startingDayOfWeek = firstDay.weekday === 7 ? 0 : firstDay.weekday; // Convert Sunday from 7 to 0

      const calendar = [];
      let currentWeek = [];

      // Add previous month's trailing days
      const prevMonth = firstDay.minus({ days: 1 });
      const daysInPrevMonth = prevMonth.day;
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const dateDt = prevMonth.minus({ days: i });
        currentWeek.push(dateDt.startOf('day').toJSDate());
      }

      // Add current month's days
      for (let day = 1; day <= daysInMonth; day++) {
        const dateDt = currentDt.set({ day });
        currentWeek.push(dateDt.startOf('day').toJSDate());
        if (currentWeek.length === 7) {
          calendar.push(currentWeek);
          currentWeek = [];
        }
      }

      // Add next month's leading days
      if (currentWeek.length > 0) {
        const remainingDays = 7 - currentWeek.length;
        const nextMonth = lastDay.plus({ days: 1 });
        for (let day = 1; day <= remainingDays; day++) {
          const dateDt = nextMonth.set({ day });
          currentWeek.push(dateDt.startOf('day').toJSDate());
        }
        calendar.push(currentWeek);
      }

      return calendar;
    } catch (error) {
      console.warn('Error calculating month calendar with timezone:', error);
      // Fallback to basic calculation
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const calendar = [];
      let currentWeek = [];

      const prevMonth = new Date(year, month, 0);
      const daysInPrevMonth = prevMonth.getDate();
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        currentWeek.push(new Date(year, month - 1, daysInPrevMonth - i));
      }

      for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push(new Date(year, month, day));
        if (currentWeek.length === 7) {
          calendar.push(currentWeek);
          currentWeek = [];
        }
      }

      if (currentWeek.length > 0) {
        const remainingDays = 7 - currentWeek.length;
        for (let day = 1; day <= remainingDays; day++) {
          currentWeek.push(new Date(year, month + 1, day));
        }
        calendar.push(currentWeek);
      }

      return calendar;
    }
  }, [currentDate]);

  // Generate time slots for week view (8 AM to 11 PM)
  const timeSlots = useMemo(() => {
    const slots = ['all-day'];
    
    // Morning slots: 8 AM - 11 AM
    for (let hour = 8; hour <= 11; hour++) {
      slots.push(`${hour} AM`);
    }
    
    // Noon
    slots.push('12 PM');
    
    // Afternoon/Evening slots: 1 PM - 11 PM
    for (let hour = 1; hour <= 11; hour++) {
      slots.push(`${hour} PM`);
    }
    
    return slots;
  }, []);

  // Popover state for event details
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null); // Track which specific event was clicked
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [clickedElement, setClickedElement] = useState(null);

  // Handle date/event click
  // If a specific event is provided, show only that event. Otherwise show all events for the date.
  const handleDateClick = (date, events, event, clickedEvent = null) => {
    // Get the clicked element position
    if (event && event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Position popover very close to the clicked element (minimal gap like Google Calendar)
      // Position to the right with tiny gap (2px)
      let left = rect.right + scrollLeft + 2;
      let top = rect.top + scrollTop;
      
      // Adjust if too close to right edge - show on left side instead
      if (left + 320 > window.innerWidth + scrollLeft) {
        left = rect.left + scrollLeft - 322; // Show on left side with minimal gap
      }
      
      // Adjust if too close to bottom edge - move up to keep in viewport
      if (top + 350 > window.innerHeight + scrollTop) {
        top = window.innerHeight + scrollTop - 350; // Keep within viewport
      }
      
      // Ensure popover doesn't go off top of screen
      if (top < scrollTop) {
        top = scrollTop + 5;
      }
      
      setPopoverPosition({ top, left });
      setClickedElement(event.currentTarget);
    }
    
    setSelectedDate(date);
    // If a specific event was clicked, show only that event. Otherwise show all events.
    if (clickedEvent) {
      setSelectedDateEvents([clickedEvent]);
      setSelectedEvent(clickedEvent);
    } else {
      setSelectedDateEvents(events || []);
      setSelectedEvent(null);
    }
  };

  // Close popover
  const handleClosePopover = () => {
    setSelectedDate(null);
    setSelectedDateEvents([]);
    setSelectedEvent(null);
    setClickedElement(null);
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectedDate && clickedElement && !clickedElement.contains(e.target)) {
        // Check if click is outside the popover
        const popover = document.getElementById('event-popover');
        if (popover && !popover.contains(e.target)) {
          handleClosePopover();
        }
      }
    };

    if (selectedDate) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [selectedDate, clickedElement]);

  return (
    <div className="w-full">
      {/* Header Section */}
      {showHero && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl md:text-3xl">👋</span>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
              Hi {userName}
            </h2>
          </div>
          <p className="text-gray-600 text-xs md:text-sm lg:text-base">
            Quick overview of your scheduled jobs, pending uploads, and upcoming deadlines.
          </p>
        </div>
      )}

      {/* Navigation and View Toggle */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateDate(-1)}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 min-w-[140px] text-center">
            {(() => {
              try {
                const clientTimezone = getClientTimezone();
                const currentDt = DateTime.fromJSDate(currentDate, { zone: 'UTC' }).setZone(clientTimezone);
                return `${MONTH_NAMES[currentDt.month - 1]} - ${currentDt.year}`;
              } catch (error) {
                return `${MONTH_NAMES[currentDate.getMonth()]} - ${currentDate.getFullYear()}`;
              }
            })()}
          </h3>
          <button
            onClick={() => navigateDate(1)}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <ViewToggle viewMode={viewMode} onViewChange={handleViewModeChange} />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading calendar</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Calendar Content */}
      {!loading && !error && (
        <>
          {viewMode === 'week' ? (
            <WeekView 
              weekDates={weekDates} 
              timeSlots={timeSlots}
              getEventsForDate={getEventsForDate}
              formatTime={formatTime}
              getTimeRemaining={getTimeRemaining}
              dayNames={DAY_NAMES}
              onDateClick={handleDateClick}
              onNavigate={handleNavigateToTask}
            />
          ) : (
            <MonthView 
              monthCalendar={monthCalendar}
              currentDate={currentDate}
              getEventsForDate={getEventsForDate}
              formatTime={formatTime}
              getTimeRemaining={getTimeRemaining}
              dayNames={DAY_NAMES}
              onDateClick={handleDateClick}
              onNavigate={handleNavigateToTask}
            />
          )}
        </>
      )}

      {/* Event Details Popover - Google Calendar style */}
      <EventDetailsPopover
        isOpen={selectedDate !== null}
        onClose={handleClosePopover}
        date={selectedDate}
        events={selectedDateEvents}
        formatTime={formatTime}
        getTimeRemaining={getTimeRemaining}
        position={popoverPosition}
        onNavigate={handleNavigateToTask}
      />
    </div>
  );
}

// Week View Component
function WeekView({ weekDates, timeSlots, getEventsForDate, formatTime, getTimeRemaining, dayNames, onDateClick, onNavigate }) {
  const eventInSlot = (event, slot) => {
    if (slot === 'all-day') {
      // For 'all-day' slot, include events that span the entire day or have no specific time
      // Events with startTime '00:00' and endTime '23:59' are considered all-day
      if (!event || !event.startTime || !event.endTime) return false;
      return event.startTime === '00:00' && event.endTime === '23:59';
    }
    
    if (!event || !event.startTime) return false;
    
    // Parse event start time (format: "HH:MM")
    const timeParts = event.startTime.split(':');
    if (timeParts.length < 2) return false;
    
    const eventHours = parseInt(timeParts[0], 10);
    const eventMinutes = parseInt(timeParts[1], 10);
    
    if (isNaN(eventHours) || isNaN(eventMinutes)) return false;
    
    const eventStartHour24 = eventHours; // Already in 24-hour format
    
    // Parse slot time (format: "8 AM", "9 AM", "12 PM", etc.)
    const slotParts = slot.split(' ');
    if (slotParts.length < 2) return false;
    
    const slotHour = parseInt(slotParts[0], 10);
    const slotPeriod = slotParts[1]; // "AM" or "PM"
    
    if (isNaN(slotHour)) return false;
    
    // Convert slot to 24-hour format
    let slotHour24 = slotHour;
    if (slotPeriod === 'PM' && slotHour !== 12) {
      slotHour24 = slotHour + 12;
    } else if (slotPeriod === 'AM' && slotHour === 12) {
      slotHour24 = 0;
    }
    
    // Event appears in the slot where it starts
    // For example: event at 13:10 (1:10 PM) appears in "1 PM" slot
    return eventStartHour24 === slotHour24;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-8 border-b border-gray-200 bg-white">
        <div className="border-r border-gray-200 p-2 bg-white"></div>
        {weekDates.map((date, index) => {
          const dateEvents = getEventsForDate(date);
          return (
            <div key={index} className="p-3 text-center border-r border-gray-200 last:border-r-0 bg-white">
              <div className="text-xs font-semibold text-gray-600 uppercase">
                {dayNames[date.getDay()]}
              </div>
              <div 
                className="text-sm font-semibold text-gray-900 mt-1 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={(e) => {
                  // Clicking date number shows all events for that date
                  onDateClick && onDateClick(date, dateEvents, e, null);
                }}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="divide-y divide-gray-200">
        {timeSlots.map((slot, slotIndex) => (
          <div key={slotIndex} className="grid grid-cols-8 min-h-[80px]">
            <div className="border-r border-gray-200 p-2 text-xs text-gray-600 font-medium bg-white">
              {slot}
            </div>
            {weekDates.map((date, dayIndex) => {
              const events = getEventsForDate(date);
              const slotEvents = events.filter(event => eventInSlot(event, slot));
              
              return (
                <div 
                  key={dayIndex} 
                  className="border-r border-gray-200 last:border-r-0 p-1 relative bg-white min-h-[80px]"
                >
                  {slotEvents.length > 0 ? (
                    slotEvents.map((event) => {
                      // Get all events for this date
                      const dateEvents = getEventsForDate(date);
                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          formatTime={formatTime}
                          getTimeRemaining={getTimeRemaining}
                          variant="default"
                          onNavigate={onNavigate}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Pass the specific clicked event - popover will show only this event
                            if (onDateClick) {
                              onDateClick(date, dateEvents, e, event);
                            }
                          }}
                        />
                      );
                    })
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Event Details Popover Component - Google Calendar style
function EventDetailsPopover({ isOpen, onClose, date, events, formatTime, getTimeRemaining, position, onNavigate }) {
  if (!isOpen || !date) return null;

  const formatShortDate = (date) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };
  
  // Handle navigation based on event status / IDs (reuse same logic as EventCard)
  const handleViewDetails = (event) => {
    if (!onNavigate) return;
    const url = buildEventLink(event);
    if (url) onNavigate(url);
  };

  return (
    <div
      id="event-popover"
      className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 w-80 max-h-[500px] overflow-hidden flex flex-col"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 p-4">
        {/* Close button - top right */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Date info */}
        <div className="pr-8">
          <div className="text-white text-sm font-medium">
            {formatShortDate(date)}
          </div>
          {events && events.length > 0 && (
            <div className="text-white text-xs mt-1 opacity-90">
              {events.length} {events.length === 1 ? 'event' : 'events'}
            </div>
          )}
        </div>
      </div>

      {/* Body - Scrollable - Shows ALL events for the date */}
      <div className="p-4 overflow-y-auto flex-1 bg-white" style={{ maxHeight: '400px' }}>
        {events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                {/* Event Title with Link Icon */}
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-gray-900 text-sm font-semibold mb-1">
                        {event.title}
                      </h3>
                      {/* Link icon to navigate to task details */}
                      {event.caseId && event.id && (
                        <button
                          onClick={() => handleViewDetails(event)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                          title="Open task details"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                      )}
                    </div>
                    <div className="text-gray-600 text-xs mb-2">
                      {formatTime(event.startTime)} - {formatTime(event.endTime)}
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="space-y-1.5 text-xs text-gray-600">
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  
                  {event.type && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3 text-gray-400" />
                      <span className="capitalize">{event.type}</span>
                    </div>
                  )}
                  
                  {event.caseNo && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3 text-gray-400" />
                      <span>Case: {event.caseNo}</span>
                    </div>
                  )}
                  {/* Only show "Videos Pending" if there are actually videos pending (witnessVideosStatus exists and has data) */}
                  {event.witnessVideosStatus && 
                   typeof event.witnessVideosStatus === 'object' && 
                   Object.keys(event.witnessVideosStatus).length > 0 && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3 h-3 text-red-600" />
                        <span className="text-xs font-medium text-red-700">Videos Pending</span>
                      </div>
                      {formatVideoStatus(event.witnessVideosStatus) && (
                        <div className="text-xs text-red-600 mb-1">
                          {formatVideoStatus(event.witnessVideosStatus)}
                        </div>
                      )}
                      {event.deadline && getTimeRemaining(event.deadline) && (
                        <div className="text-xs text-red-500 mt-1">
                          {getTimeRemaining(event.deadline).hours}h {getTimeRemaining(event.deadline).minutes}m left
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">No events scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Month View Component
function MonthView({ monthCalendar, currentDate, getEventsForDate, formatTime, getTimeRemaining, dayNames, onDateClick, onNavigate }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayNames.map((day, index) => (
          <div 
            key={index} 
            className="p-3 text-center border-r border-gray-200 last:border-r-0"
          >
            <div className="text-xs font-semibold text-gray-600 uppercase">
              {day}
            </div>
          </div>
        ))}
      </div>

      <div className="divide-y divide-gray-200">
        {monthCalendar.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((date, dayIndex) => {
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              // Check if today in client timezone
              const todayInClientTz = DateTime.now().setZone(getClientTimezone()).startOf('day').toJSDate();
              const isToday = isSameDate(date, todayInClientTz);
              const events = getEventsForDate(date);

              return (
                <div
                  key={dayIndex}
                  className={`min-h-[100px] p-2 border-r border-gray-200 last:border-r-0 ${
                    !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div 
                    className={`text-sm font-medium mb-1 cursor-pointer hover:text-blue-600 transition-colors ${
                      !isCurrentMonth 
                        ? 'text-gray-300' 
                        : isToday 
                          ? 'text-blue-600 font-bold' 
                          : 'text-gray-900'
                    }`}
                    onClick={(e) => onDateClick && onDateClick(date, events, e)}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {events.map((event) => {
                      // Get all events for this date
                      const allDateEvents = getEventsForDate(date);
                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          formatTime={formatTime}
                          getTimeRemaining={getTimeRemaining}
                          variant="compact"
                          onNavigate={onNavigate}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Pass the specific clicked event - popover will show only this event
                            onDateClick && onDateClick(date, allDateEvents, e, event);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
