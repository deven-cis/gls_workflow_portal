"use client";
import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Video, MoreVertical, ChevronDown, Menu, Calendar, ChevronLeft, ChevronRight, X, Download, Clock, Pencil } from 'lucide-react';
import AvatarMenu from '@/components/AvatarMenu';

const sampleHistory = [
    {
        id: 'Job001',
        date: '7 Jun',
        time: '6:00 PM',
        title: 'Federal Deposition - Daniels v. IRS',
        location: '123 Oak St NE, Atlanta, GA',
        isVirtual: false,
        status: 'Completed',
        details: {
            jobTitle: 'Federal Deposition - Daniels v. IRS',
            location: '123 Oak St NE, Atlanta, GA',
            time: '7 Jun, 6:00 PM',
            caseName: 'Federal Deposition - Daniels v. IRS',
            caseNumber: '72364',
            plaintiffAttorney: 'John Smith',
            defenseAttorney: 'Sarah Johnson',
            witnesses: [
                { name: 'Arlene McCoy' },
                { name: 'Kathryn Murphy' },
                { name: 'Darlene Robertson' }
            ],
            recordings: [
                { name: 'Arlene McCoy', fileName: 'Recording 1.mpeg', size: '3.8MB' },
                { name: 'Kathryn Murphy', fileName: 'Recording 2.mpeg', size: '4.2MB' },
                { name: 'Darlene Robertson', fileName: 'Recording 3.mpeg', size: '3.5MB' }
            ]
        }
    },
    {
        id: 'Job002',
        date: '7 Jun',
        time: '6:00 PM',
        title: 'Johnson vs. Smith Deposition',
        location: '123 Legal Ave, Room 302',
        isVirtual: false,
        status: 'Completed',
        details: {
            jobTitle: 'Johnson vs. Smith Deposition',
            location: '123 Legal Ave, Room 302',
            time: 'Today, 10:00 AM',
            caseName: 'Johnson vs. Smith Deposition',
            caseNumber: '72364',
            plaintiffAttorney: 'Johnson vs. Smith Deposition',
            defenseAttorney: '72364',
            witnesses: [
                { name: 'Arlene McCoy' },
                { name: 'Kathryn Murphy' }
            ],
            recordings: [
                { name: 'Arlene McCoy', fileName: 'Recording 1.mpeg', size: '4.2MB' },
                { name: 'Kathryn Murphy', fileName: 'Recording 2.mpeg', size: '3.8MB' },
                { name: 'Darlene Robertson', fileName: 'Recording 3.mpeg', size: '4.2MB' }
            ]
        }
    },
    {
        id: 'Job003',
        date: '8 Jun',
        time: '6:00 PM',
        title: 'Federal Deposition - Daniels v. IRS',
        location: '123 Oak St NE, Atlanta, GA',
        isVirtual: false,
        status: 'Completed',
        details: {
            jobTitle: 'Federal Deposition - Daniels v. IRS',
            location: '123 Oak St NE, Atlanta, GA',
            time: '8 Jun, 6:00 PM',
            caseName: 'Federal Deposition - Daniels v. IRS',
            caseNumber: '82345',
            plaintiffAttorney: 'Michael Brown',
            defenseAttorney: 'Emily Davis',
            witnesses: [
                { name: 'Robert Wilson' },
                { name: 'Jessica Taylor' }
            ],
            recordings: [
                { name: 'Robert Wilson', fileName: 'Recording 1.mpeg', size: '5.1MB' },
                { name: 'Jessica Taylor', fileName: 'Recording 2.mpeg', size: '4.7MB' }
            ]
        }
    },
    {
        id: 'Job004',
        date: '9 Jun',
        time: '6:00 PM',
        title: 'Federal Deposition - Daniels v. IRS',
        isVirtual: true,
        status: 'Completed',
        details: {
            jobTitle: 'Federal Deposition - Daniels v. IRS',
            location: 'Virtual - Zoom',
            time: '9 Jun, 6:00 PM',
            caseName: 'Federal Deposition - Daniels v. IRS',
            caseNumber: '92346',
            plaintiffAttorney: 'David Miller',
            defenseAttorney: 'Lisa Anderson',
            witnesses: [
                { name: 'James Thomas' }
            ],
            recordings: [
                { name: 'James Thomas', fileName: 'Recording 1.mpeg', size: '6.2MB' }
            ]
        }
    },
    {
        id: 'Job005',
        date: '10 Jun',
        time: '6:00 PM',
        title: 'Federal Deposition - Daniels v. IRS',
        isVirtual: true,
        status: 'Completed',
        details: {
            jobTitle: 'Federal Deposition - Daniels v. IRS',
            location: 'Virtual - Zoom',
            time: '10 Jun, 6:00 PM',
            caseName: 'Federal Deposition - Daniels v. IRS',
            caseNumber: '102347',
            plaintiffAttorney: 'Christopher Martin',
            defenseAttorney: 'Amanda White',
            witnesses: [
                { name: 'Patricia Jackson' },
                { name: 'Daniel Harris' }
            ],
            recordings: [
                { name: 'Patricia Jackson', fileName: 'Recording 1.mpeg', size: '4.8MB' },
                { name: 'Daniel Harris', fileName: 'Recording 2.mpeg', size: '5.3MB' }
            ]
        }
    }
];

const cancelledHistory = [
    {
        id: 'Job006',
        date: '11 Jun',
        time: '6:00 PM',
        title: 'State Court Hearing - Smith v. Johnson',
        location: '456 Elm St SW, Atlanta, GA',
        isVirtual: false,
        status: 'Cancelled'
    },
    {
        id: 'Job007',
        date: '12 Jun',
        time: '6:00 PM',
        title: 'Arbitration - Brown v. Davis',
        isVirtual: true,
        status: 'Cancelled'
    },
    {
        id: 'Job008',
        date: '13 Jun',
        time: '6:00 PM',
        title: 'Mediation - Wilson v. Martinez',
        location: '789 Oak Ave NW, Atlanta, GA',
        isVirtual: false,
        status: 'Cancelled'
    }
];

const EmptyState = () => {
    return (
        <div className="flex flex-col items-center justify-center py-12 md:py-16 lg:py-24">
            <div className="mb-6 md:mb-8 w-48 md:w-64 lg:w-80">
                <img src="/not_found.png" alt="No tasks" className="w-full h-auto" />
            </div>
            <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-2 text-center px-4">
                No History Right Now
            </h3>
            <p className="text-gray-600 text-center text-xs md:text-sm lg:text-base max-w-md px-4">
                All completed court recordings and remote depositions will appear in this section.
            </p>
        </div>
    );
};

const JobDetailsModal = ({ isOpen, onClose, jobDetails }) => {
    if (!isOpen || !jobDetails) return null;

    return (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-end p-4">
            <div className="bg-white shadow-xl rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base text-gray-900">Job Details</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-6">
                    {/* Job Title */}
                    <div>
                        <p className="text-xl font-semibold text-gray-900">{jobDetails.jobTitle}</p>
                    </div>

                    {/* Location and Time */}
                    <div className="grid grid-rows-1 md:grid-rows-2 gap-2 border-b border-gray-200 pb-4">
                        <div className="flex gap-2 text-sm">
                            <MapPin size={16} />
                            <p className="text-gray-700">{jobDetails.location}</p>
                        </div>
                        <div className="flex gap-2 text-sm">
                            <Clock size={16} />
                            <p className="text-gray-700">{jobDetails.time}</p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                        {/* Basic Details */}
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Basic Details</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-xs">Case Name</span>
                                    <span className="text-gray-700 text-xs font-medium">{jobDetails.caseName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-xs">Case Number</span>
                                    <span className="text-gray-700 text-xs font-medium">{jobDetails.caseNumber}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attorneys */}
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Attorneys</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-xs">Plaintiff Attorney</span>
                                    <span className="text-gray-700 text-xs font-medium">{jobDetails.plaintiffAttorney}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-xs">Defense Attorney</span>
                                    <span className="text-gray-700 text-xs font-medium">{jobDetails.defenseAttorney}</span>
                                </div>
                            </div>
                        </div>

                        {/* Witnesses */}
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Witnesses</h3>
                            <div className="space-y-2">
                                {jobDetails.witnesses.map((witness, index) => (
                                    <div key={index} className="flex justify-between">
                                        <span className="text-gray-500 text-xs">Name</span>
                                        <span className="text-gray-700 text-xs font-medium">{witness.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recordings */}
                    <div>
                        <div className="flex justify-between mb-3">
                            <div className="flex items-center">
                                <h3 className="text-lg font-semibold text-gray-900">Recordings</h3>
                                <span className="text-sm text-gray-500 ml-4 bg-gray-200 px-2 py-1 rounded-xl">{jobDetails.recordings.length}</span>
                            </div>
                            <button className="flex items-center gap-2 bg-gray-200 hover:bg-gray-500 text-gray-800 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm cursor-pointer">
                                <Download size={16} />
                                Download All
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Individual Recordings */}
                            {jobDetails.recordings.map((recording, index) => (
                                <div key={index} className="space-y-2">
                                    <h4 className="text-gray-900 font-semibold">{recording.name}</h4>
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 font-semibold">
                                        <div className="flex items-center gap-3">
                                            <Video size={30} className="text-gray-500" />
                                            <div>
                                                <p className="text-gray-700 text-sm">{recording.fileName}</p>
                                                <p className="text-gray-500 text-xs">{recording.size}</p>
                                            </div>
                                        </div>
                                        <button className="flex items-center gap-1.5 text-gray-600 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer">
                                            <Download size={16} />
                                            Download
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HistoryCard = ({ item, onClick }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-4">
                {/* Left: Date & Time */}
                <div className="flex-shrink-0 text-sm">
                    <div className="text-gray-600">{item.date}</div>
                    <div className="text-gray-900 font-medium">{item.time}</div>
                </div>

                {/* Center: Details */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 font-semibold mb-2">
                        {item.title}
                    </h3>
                    {item.isVirtual ? (
                        <div className="flex items-center gap-1.5 text-blue-600 text-sm">
                            <Video size={16} />
                            <span>Zoom</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                            <MapPin size={16} />
                            <span>{item.location}</span>
                        </div>
                    )}
                </div>

                {/* Right: Status & Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-gray-400 text-sm px-3 py-1 bg-gray-100 rounded-full">{item.id}</span>
                    <div className={`text-xs px-3 py-1 rounded-full font-medium ${item.status === 'Completed'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                        }`}>
                        {item.status}
                    </div>
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(false);
                                        onClick(item);
                                    }}
                                    className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                    <Pencil size={16} />
                                    Edit
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DateRangePicker = ({ startDate, endDate, onDateChange, onClose }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date(startDate || new Date()));
    const [hoveredDate, setHoveredDate] = useState(null);
    const [selectingStart, setSelectingStart] = useState(true);
    const [tempStartDate, setTempStartDate] = useState(startDate);
    const [tempEndDate, setTempEndDate] = useState(endDate);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month days to fill the grid
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    };

    const isSameDay = (date1, date2) => {
        if (!date1 || !date2) return false;
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
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
            onDateChange(tempStartDate, tempEndDate);
            onClose();
        }
    };

    const handleCancel = () => {
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        onClose();
    };

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const formatDateDisplay = (date) => {
        if (!date) return '';
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
                        onClick={previousMonth}
                        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <h3 className="text-base font-semibold text-gray-900">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                    <button
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
                    {dayNames.map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
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
                            <div key={index} className="relative flex items-center justify-center">
                                <button
                                    onClick={() => handleDateClick(date)}
                                    onMouseEnter={() => setHoveredDate(date)}
                                    onMouseLeave={() => setHoveredDate(null)}
                                    className={`
                                        relative w-9 h-9 flex items-center justify-center text-sm font-medium rounded-full transition-all z-10
                                        ${!isCurrentMonth ? 'text-gray-300' : ''}
                                        ${isStart || isEnd
                                            ? 'bg-red-700 text-white shadow-md hover:bg-red-800'
                                            : inRange
                                                ? 'bg-red-50 text-red-900'
                                                : inHover
                                                    ? 'bg-red-50 text-red-900'
                                                    : isCurrentMonth
                                                        ? 'text-gray-700 hover:bg-gray-100'
                                                        : 'text-gray-300 hover:bg-gray-50'
                                        }
                                        ${isToday && !isStart && !isEnd && isCurrentMonth ? 'ring-2 ring-red-700 ring-offset-1' : ''}
                                    `}
                                >
                                    {date && date.getDate()}
                                    {(isStart || isEnd) && (
                                        <div className="absolute -bottom-0.5 w-1 h-1 bg-white rounded-full"></div>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Date Range Display */}
            {tempStartDate && tempEndDate && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="font-medium text-gray-900">{formatDateDisplay(tempStartDate)}</span>
                        <span className="text-gray-500">To</span>
                        <span className="font-medium text-gray-900">{formatDateDisplay(tempEndDate)}</span>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="px-5 py-4 flex items-center justify-between gap-3 border-t border-gray-100">
                <button
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                    Cancel
                </button>
                <button
                    onClick={handleApply}
                    disabled={!tempStartDate || !tempEndDate}
                    className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${tempStartDate && tempEndDate
                        ? 'bg-red-700 text-white hover:bg-red-800 shadow-md'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    Apply
                </button>
            </div>
        </div>
    );
};

export default function HistoryView() {
    const [activeTab, setActiveTab] = useState('completed');
    const [activeView, setActiveView] = useState('History');
    const [showCalendar, setShowCalendar] = useState(false);
    const [startDate, setStartDate] = useState(new Date(2025, 9, 1)); // Oct 1, 2025
    const [endDate, setEndDate] = useState(new Date(2025, 9, 24)); // Oct 24, 2025
    const [selectedJob, setSelectedJob] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const calendarRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setShowCalendar(false);
            }
        };

        if (showCalendar) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showCalendar]);

    const handleViewChange = (view) => {
        setActiveView(view);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const handleDateChange = (start, end) => {
        setStartDate(start);
        setEndDate(end);
    };

    const handleJobClick = (item) => {
        setSelectedJob(item.details);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedJob(null);
    };

    const formatDateRange = () => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startMonth = monthNames[startDate.getMonth()];
        const endMonth = monthNames[endDate.getMonth()];
        const startDay = startDate.getDate();
        const endDay = endDate.getDate();
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
    };

    const historyData = activeTab === 'completed' ? sampleHistory : cancelledHistory;
    const hasHistory = historyData && historyData.length > 0;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header is provided globally via `Header` in `LayoutWrapper` */}

            {/* Content Area */}
            <div className="px-4 md:px-6 lg:px-8 py-6">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Status Tabs */}
                    <div className="inline-flex bg-gray-100 rounded-2xl p-1.5 border border-gray-200">
                        <button
                            onClick={() => handleTabChange('completed')}
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${activeTab === 'completed'
                                ? 'bg-white text-gray-900 shadow-lg'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <span>Completed</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('cancelled')}
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${activeTab === 'cancelled'
                                ? 'bg-white text-gray-900 shadow-lg'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <span>Cancelled</span>
                        </button>
                    </div>

                    {hasHistory && (
                        <div className="relative" ref={calendarRef}>
                            <button
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium text-sm md:text-base"
                            >
                                {formatDateRange()}
                                <ChevronDown size={16} />
                            </button>

                            {showCalendar && (
                                <div className="absolute right-0 top-full mt-2 z-50 w-[340px] md:w-[360px]">
                                    <DateRangePicker
                                        startDate={startDate}
                                        endDate={endDate}
                                        onDateChange={handleDateChange}
                                        onClose={() => setShowCalendar(false)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {hasHistory ? (
                    <div className="space-y-3">
                        {historyData.map((item) => (
                            <HistoryCard key={item.id} item={item} onClick={handleJobClick} />
                        ))}
                    </div>
                ) : (
                    <EmptyState />
                )}

                {/* Job Details Modal */}
                <JobDetailsModal
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    jobDetails={selectedJob}
                />
            </div>
        </div>
    );
}