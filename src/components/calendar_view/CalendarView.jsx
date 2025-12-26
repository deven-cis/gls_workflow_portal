"use client";
import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { calendarAPI } from '@/services/calendar_apis';

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
function EventCard({ event, formatTime, getTimeRemaining, variant = 'default' }) {
  const isPending = event.status === 'pending';
  const timeRemaining = event.deadline ? getTimeRemaining(event.deadline) : null;
  const isCompact = variant === 'compact';

  return (
    <div
      className={`rounded-md overflow-hidden ${isCompact ? 'mb-1' : 'mb-1'} cursor-pointer hover:opacity-90 transition-opacity`}
    >
      {/* Blue header bar with time */}
      <div className="bg-blue-600 text-white px-2 py-1 flex items-center">
        <div className="w-0.5 h-3 bg-white mr-2"></div>
        <div className="text-xs font-semibold">
          {formatTime(event.startTime)} - {formatTime(event.endTime)}
        </div>
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

        {/* Video indicator */}
        {event.hasVideo && !isPending && (
          <div className={`text-gray-600 text-[10px] leading-tight`}>
            Video
          </div>
        )}

        {/* Pending status */}
        {isPending && (
          <div className="space-y-0.5 mt-1">
            {/* Videos Pending pill - red with white text */}
            <div className="inline-block bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight">
              Videos Pending
            </div>
            
            {/* Video upload progress - gray text */}
            <div className="text-gray-600 text-[10px] leading-tight">
              {event.videosUploaded}/{event.totalVideos} videos uploaded
            </div>
            
            {/* Deadline - red with clock icon */}
            {timeRemaining && (
              <div className="flex items-center gap-1 text-red-600 text-[10px] font-medium leading-tight">
                <Clock className="w-3 h-3" />
                <span>
                  Deadline: {timeRemaining.hours}hrs {timeRemaining.minutes} min
                </span>
              </div>
            )}
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
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          // Fetch month events
          fetchedEvents = await calendarAPI.getMonthEvents(year, month);
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

  // Navigate months/weeks
  const navigateDate = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        newDate.setMonth(prev.getMonth() + direction);
      } else {
        newDate.setDate(prev.getDate() + (direction * 7));
      }
      return newDate;
    });
  };

  // Get week dates
  const weekDates = useMemo(() => {
    const dates = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0); // Normalize to midnight

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      date.setHours(0, 0, 0, 0); // Normalize to midnight
      dates.push(date);
    }
    
    return dates;
  }, [currentDate, viewMode, events]);

  // Get month calendar grid
  const monthCalendar = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendar = [];
    let currentWeek = [];

    // Add previous month's trailing days
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      currentWeek.push(new Date(year, month - 1, daysInPrevMonth - i));
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(new Date(year, month, day));
      if (currentWeek.length === 7) {
        calendar.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add next month's leading days
    if (currentWeek.length > 0) {
      const remainingDays = 7 - currentWeek.length;
      for (let day = 1; day <= remainingDays; day++) {
        currentWeek.push(new Date(year, month + 1, day));
      }
      calendar.push(currentWeek);
    }

    return calendar;
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
            {MONTH_NAMES[currentDate.getMonth()]} - {currentDate.getFullYear()}
          </h3>
          <button
            onClick={() => navigateDate(1)}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
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
            />
          ) : (
            <MonthView 
              monthCalendar={monthCalendar}
              currentDate={currentDate}
              getEventsForDate={getEventsForDate}
              formatTime={formatTime}
              getTimeRemaining={getTimeRemaining}
              dayNames={DAY_NAMES}
            />
          )}
        </>
      )}
    </div>
  );
}

// Week View Component
function WeekView({ weekDates, timeSlots, getEventsForDate, formatTime, getTimeRemaining, dayNames }) {
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
        {weekDates.map((date, index) => (
          <div key={index} className="p-3 text-center border-r border-gray-200 last:border-r-0 bg-white">
            <div className="text-xs font-semibold text-gray-600 uppercase">
              {dayNames[date.getDay()]}
            </div>
            <div className="text-sm font-semibold text-gray-900 mt-1">
              {date.getDate()}
            </div>
          </div>
        ))}
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
                    slotEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        formatTime={formatTime}
                        getTimeRemaining={getTimeRemaining}
                        variant="default"
                      />
                    ))
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

// Month View Component
function MonthView({ monthCalendar, currentDate, getEventsForDate, formatTime, getTimeRemaining, dayNames }) {
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
              const isToday = isSameDate(date, new Date());
              const events = getEventsForDate(date);

              return (
                <div
                  key={dayIndex}
                  className={`min-h-[100px] p-2 border-r border-gray-200 last:border-r-0 ${
                    !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    !isCurrentMonth 
                      ? 'text-gray-300' 
                      : isToday 
                        ? 'text-blue-600 font-bold' 
                        : 'text-gray-900'
                  }`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {events.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        formatTime={formatTime}
                        getTimeRemaining={getTimeRemaining}
                        variant="compact"
                      />
                    ))}
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
