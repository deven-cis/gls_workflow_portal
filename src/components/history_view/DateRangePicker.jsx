"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Reusable date range picker for history filters (completed / cancelled jobs)
export default function HistoryDateRangePicker({
  startDate,
  endDate,
  onDateChange,
  onClose,
}) {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(startDate || new Date())
  );
  const [hoveredDate, setHoveredDate] = useState(null);
  const [selectingStart, setSelectingStart] = useState(true);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const shortMonthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days to fill the grid (6 weeks view)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isInRange = (date) => {
    if (!tempStartDate || !tempEndDate || !date) return false;
    const start = new Date(tempStartDate);
    const end = new Date(tempEndDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const current = new Date(date);
    current.setHours(0, 0, 0, 0);
    return current >= start && current <= end;
  };

  const isInHoverRange = (date) => {
    if (!tempStartDate || !hoveredDate || !date || tempEndDate) return false;
    const start = new Date(tempStartDate);
    const hover = new Date(hoveredDate);
    start.setHours(0, 0, 0, 0);
    hover.setHours(0, 0, 0, 0);
    const current = new Date(date);
    current.setHours(0, 0, 0, 0);

    if (hover < start) {
      return current >= hover && current <= start;
    }
    return current >= start && current <= hover;
  };

  const handleDateClick = (date) => {
    if (!date) return;

    if (selectingStart || !tempStartDate) {
      setTempStartDate(date);
      setTempEndDate(null);
      setSelectingStart(false);
    } else {
      if (date < tempStartDate) {
        setTempEndDate(tempStartDate);
        setTempStartDate(date);
      } else {
        setTempEndDate(date);
      }
      setSelectingStart(true);
    }
  };

  const handleApply = () => {
    if (tempStartDate && tempEndDate) {
      onDateChange?.(tempStartDate, tempEndDate);
      onClose?.();
    }
  };

  const handleCancel = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    onClose?.();
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const formatDateDisplay = (date) => {
    if (!date) return "";
    const day = date.getDate();
    const month = shortMonthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[360px] md:max-w-[380px] overflow-hidden">
      {/* Calendar Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <button
            type="button"
            onClick={previousMonth}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <h3 className="text-base font-semibold text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((dayObj, index) => {
            const { date, isCurrentMonth } = dayObj;
            const isStart = date && isSameDay(date, tempStartDate);
            const isEnd = date && isSameDay(date, tempEndDate);
            const inRange = date && isInRange(date);
            const inHover = date && isInHoverRange(date);
            const isToday = date && isSameDay(date, new Date());

            return (
              <div
                key={index}
                className="relative flex items-center justify-center"
              >
                <button
                  type="button"
                  onClick={() => handleDateClick(date)}
                  onMouseEnter={() => setHoveredDate(date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  className={`
                    relative w-9 h-9 flex items-center justify-center text-sm font-medium rounded-full transition-all z-10
                    ${!isCurrentMonth ? "text-gray-300" : ""}
                    ${
                      isStart || isEnd
                        ? "bg-red-700 text-white shadow-md hover:bg-red-800"
                        : inRange
                        ? "bg-red-50 text-red-900"
                        : inHover
                        ? "bg-red-50 text-red-900"
                        : isCurrentMonth
                        ? "text-gray-700 hover:bg-gray-100"
                        : "text-gray-300 hover:bg-gray-50"
                    }
                    ${
                      isToday && !isStart && !isEnd && isCurrentMonth
                        ? "ring-2 ring-red-700 ring-offset-1"
                        : ""
                    }
                  `}
                >
                  {date && date.getDate()}
                  {(isStart || isEnd) && (
                    <div className="absolute -bottom-0.5 w-1 h-1 bg-white rounded-full" />
                  )}
                </button>

                {(inRange || inHover) && !isStart && !isEnd && (
                  <div className="absolute inset-0 mx-auto h-8 bg-red-50 rounded-full -z-10" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="px-5 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
        <div className="text-xs text-gray-500">
          {tempStartDate && tempEndDate ? (
            <span>
              {formatDateDisplay(tempStartDate)} -{" "}
              {formatDateDisplay(tempEndDate)}
            </span>
          ) : (
            <span>Select a date range</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
