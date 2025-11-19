"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { calendarEvents } from "./data/calendarEvents";

const STATUS_STYLES = {
    "videos-pending": {
        base: "border border-red-100 bg-red-50 text-red-700",
        pill: "bg-red-100 text-red-700"
    },
    standard: {
        base: "border border-blue-100 bg-blue-50 text-blue-700",
        pill: "bg-blue-100 text-blue-700"
    }
};

const formatMonthLabel = (date) =>
    date.toLocaleString("default", { month: "long", year: "numeric" });

const buildMonthMatrix = (currentDate) => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const totalDays = endOfMonth.getDate();

    const days = [];
    let week = [];

    for (let i = 0; i < startDay; i += 1) {
        week.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
        week.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
        if (week.length === 7) {
            days.push(week);
            week = [];
        }
    }

    if (week.length) {
        while (week.length < 7) {
            week.push(null);
        }
        days.push(week);
    }

    return days;
};

const getDateKey = (date) =>
    date.toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });

const eventsByDate = calendarEvents.reduce((acc, event) => {
    acc[event.date] = acc[event.date] ? [...acc[event.date], event] : [event];
    return acc;
}, {});

const CalendarDay = ({ date, isMuted, events = [] }) => (
    <div className={`min-h-[110px] rounded-xl border border-transparent px-3 py-2 ${isMuted ? "bg-transparent text-gray-300" : "bg-white text-gray-900"}`}>
        <p className="text-xs font-medium">{date ? date.getDate() : ""}</p>
        <div className="mt-2 space-y-2">
            {events.map((event) => {
                const styles = STATUS_STYLES[event.status] ?? STATUS_STYLES.standard;
                return (
                    <div
                        key={event.id}
                        className={`rounded-xl px-3 py-2 text-xs shadow-sm ${styles.base}`}
                    >
                        <p className="font-semibold text-[11px]">
                            {event.startTime} - {event.endTime}
                        </p>
                        <p className="mt-1 text-[11px] leading-4 line-clamp-2">{event.title}</p>
                        {event.status === "videos-pending" && (
                            <div className="mt-2 space-y-1 text-[10px]">
                                <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${styles.pill}`}>
                                    Videos Pending
                                </span>
                                {event.uploads && <p className="text-gray-600">{event.uploads}</p>}
                                {event.deadline && <p className="text-red-500">{event.deadline}</p>}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

export function CalendarView({
    variant = "page",
    initialViewFilter = "month",
    enableWeekToggle = true,
    showHero = true
} = {}) {
    const isPageVariant = variant === "page";
    const [referenceDate, setReferenceDate] = useState(new Date("2025-05-01"));
    const [viewFilter, setViewFilter] = useState(initialViewFilter);

    const monthMatrix = useMemo(() => buildMonthMatrix(referenceDate), [referenceDate]);
    const displayedWeeks = viewFilter === "week" ? [monthMatrix[0]] : monthMatrix;

    const handleMonthChange = (direction) => {
        setReferenceDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    const filterOptions = enableWeekToggle ? ["week", "month"] : ["month"];

    return (
        <div className={isPageVariant ? "min-h-screen bg-blue-50 px-4 py-6 sm:px-8" : ""}>
            <div className={`${isPageVariant ? "mx-auto max-w-6xl" : ""} rounded-3xl border border-blue-100 bg-white shadow-sm`}>
                {showHero && (
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-50 px-6 py-5">
                        <div>
                            <p className="text-sm text-blue-600">Task Details</p>
                            <div className="mt-1 flex items-center gap-3">
                                <span className="text-2xl">👋</span>
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900">Hi Jakir</h1>
                                    <p className="text-sm text-gray-500">
                                        Quick overview of your scheduled jobs, pending uploads, and upcoming deadlines.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/dashboard/my_tasks"
                                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                List View
                            </Link>
                            <button
                                type="button"
                                className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600"
                            >
                                Calendar
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-4 text-gray-700">
                        <button
                            type="button"
                            onClick={() => handleMonthChange(-1)}
                            className="text-2xl font-semibold text-gray-400 hover:text-gray-600"
                            aria-label="Previous month"
                        >
                            ‹
                        </button>
                        <p className="text-lg font-semibold">{formatMonthLabel(referenceDate)}</p>
                        <button
                            type="button"
                            onClick={() => handleMonthChange(1)}
                            className="text-2xl font-semibold text-gray-400 hover:text-gray-600"
                            aria-label="Next month"
                        >
                            ›
                        </button>
                    </div>
                    <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 text-sm font-medium text-gray-600">
                        {filterOptions.map((filter) => (
                            <button
                                key={filter}
                                type="button"
                                onClick={() => setViewFilter(filter)}
                                className={`rounded-full px-4 py-1.5 capitalize transition ${
                                    viewFilter === filter ? "bg-white text-blue-600 shadow-sm" : ""
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-6 pb-6">
                    <div className="grid grid-cols-7 gap-3 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <p key={day} className="text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                                {day}
                            </p>
                        ))}
                        {displayedWeeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="contents">
                                {week.map((date, dayIndex) => {
                                    const key = date ? getDateKey(date) : "";
                                    const dayEvents = date ? eventsByDate[key] : [];
                                    return (
                                        <CalendarDay
                                            key={`${weekIndex}-${dayIndex}-${key}`}
                                            date={date}
                                            events={dayEvents}
                                            isMuted={!date || date.getMonth() !== referenceDate.getMonth()}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

