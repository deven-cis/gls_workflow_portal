"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronDown, Search, X } from 'lucide-react';
import AvatarMenu from '@/components/layouts/AvatarMenu';
import { historyAPI } from '@/services/history_apis';
import { useToast } from '@/contexts/ToastContext';
import HistoryDateRangePicker from '@/components/history_view/DateRangePicker';
import JobCompletedDetails from '@/components/history_view/JobCompletedDetails';
import JobCancelDetails from '@/components/history_view/JobCancelDetails';
import HistoryCard from '@/components/history_view/HistoryCard';
import { fetchVideoFileSize } from '@/lib/utils';


export default function HistoryView() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Get initial tab from URL, default to 'completed'
    const tabFromUrl = searchParams.get('tab');
    const initialTab = tabFromUrl === 'cancelled' ? 'cancelled' : 'completed';
    
    const [activeTab, setActiveTab] = useState(initialTab);
    const [activeView, setActiveView] = useState('History');
    const [showCalendar, setShowCalendar] = useState(false);
    // Separate date ranges for each tab
    const [completedStartDate, setCompletedStartDate] = useState(null);
    const [completedEndDate, setCompletedEndDate] = useState(null);
    const [cancelledStartDate, setCancelledStartDate] = useState(null);
    const [cancelledEndDate, setCancelledEndDate] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showEditCancelModal, setShowEditCancelModal] = useState(false);
    const [editingJobId, setEditingJobId] = useState(null);
    const [completedJobs, setCompletedJobs] = useState([]);
    const [cancelledJobs, setCancelledJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const calendarRef = useRef(null);
    const toast = useToast();
    
    // Pagination state - separate for each tab
    // Temporarily set pageSize to 1 for testing - change back to 10 when done
    const [completedPagination, setCompletedPagination] = useState({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false
    });
    const [cancelledPagination, setCancelledPagination] = useState({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false
    });
    
    // Search filters - separate for each tab
    const [completedSearchFilters, setCompletedSearchFilters] = useState({
        jobNo: '',
        witnessName: '',
        caseName: '',
        caseNumber: ''
    });
    const [cancelledSearchFilters, setCancelledSearchFilters] = useState({
        jobNo: '',
        witnessName: '',
        caseName: '',
        caseNumber: ''
    });
    const [showSearchFilters, setShowSearchFilters] = useState(false);


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

    // Get current date range based on active tab
    const startDate = activeTab === 'completed' ? completedStartDate : cancelledStartDate;
    const endDate = activeTab === 'completed' ? completedEndDate : cancelledEndDate;

    // Get current pagination based on active tab
    const currentPagination = activeTab === 'completed' ? completedPagination : cancelledPagination;

    // Get current search filters based on active tab
    const currentSearchFilters = activeTab === 'completed' ? completedSearchFilters : cancelledSearchFilters;

    // Fetch jobs based on active tab, date range, and search filters
    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true);
            try {
                const type = activeTab === 'completed' ? 'Completed' : 'Cancelled';
                const currentStartDate = activeTab === 'completed' ? completedStartDate : cancelledStartDate;
                const currentEndDate = activeTab === 'completed' ? completedEndDate : cancelledEndDate;
                const currentPage = activeTab === 'completed' ? completedPagination.page : cancelledPagination.page;
                const pageSize = activeTab === 'completed' ? completedPagination.pageSize : cancelledPagination.pageSize;
                const currentFilters = activeTab === 'completed' ? completedSearchFilters : cancelledSearchFilters;
                
                const result = await historyAPI.getJobsByType(type, currentStartDate, currentEndDate, currentPage, pageSize, currentFilters);
                
                // Debug: Log pagination data
                console.log(`${type} jobs pagination:`, result.pagination);
                
                if (activeTab === 'cancelled') {
                    setCancelledJobs(result.jobs || []);
                    setCancelledPagination(result.pagination || cancelledPagination);
                } else {
                    setCompletedJobs(result.jobs || []);
                    setCompletedPagination(result.pagination || completedPagination);
                }
            } catch (err) {
                // Log to console only - no error overlay or toast
                console.error(`Failed to load ${activeTab} jobs:`, err);
                if (activeTab === 'cancelled') {
                    setCancelledJobs([]);
                } else {
                    setCompletedJobs([]);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, [activeTab, completedStartDate, completedEndDate, cancelledStartDate, cancelledEndDate, completedPagination.page, cancelledPagination.page, completedSearchFilters, cancelledSearchFilters]);
    
    // Reset pagination to page 1 when search filters change
    useEffect(() => {
        if (activeTab === 'completed') {
            setCompletedPagination(prev => ({ ...prev, page: 1 }));
        } else {
            setCancelledPagination(prev => ({ ...prev, page: 1 }));
        }
    }, [completedSearchFilters, cancelledSearchFilters, activeTab]);

    const handleViewChange = (view) => {
        setActiveView(view);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        // Reset pagination when switching tabs
        if (tab === 'completed') {
            setCompletedPagination(prev => ({ ...prev, page: 1 }));
        } else {
            setCancelledPagination(prev => ({ ...prev, page: 1 }));
        }
        // Update URL to persist tab selection
        const params = new URLSearchParams(searchParams.toString());
        if (tab === 'completed') {
            params.delete('tab'); // Remove tab param for default (completed)
        } else {
            params.set('tab', tab);
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const handlePageChange = (newPage) => {
        if (activeTab === 'completed') {
            setCompletedPagination(prev => ({ ...prev, page: newPage }));
        } else {
            setCancelledPagination(prev => ({ ...prev, page: newPage }));
        }
        // Scroll to top when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    // Handle search filter changes
    const handleSearchFilterChange = (field, value) => {
        if (activeTab === 'completed') {
            setCompletedSearchFilters(prev => ({ ...prev, [field]: value }));
        } else {
            setCancelledSearchFilters(prev => ({ ...prev, [field]: value }));
        }
    };
    
    // Clear all search filters
    const handleClearSearchFilters = () => {
        if (activeTab === 'completed') {
            setCompletedSearchFilters({
                jobNo: '',
                witnessName: '',
                caseName: '',
                caseNumber: ''
            });
        } else {
            setCancelledSearchFilters({
                jobNo: '',
                witnessName: '',
                caseName: '',
                caseNumber: ''
            });
        }
    };
    
    // Check if any search filters are active
    const hasActiveSearchFilters = () => {
        const filters = activeTab === 'completed' ? completedSearchFilters : cancelledSearchFilters;
        return !!(filters.jobNo || filters.witnessName || filters.caseName || filters.caseNumber);
    };

    const handleDateChange = (start, end) => {
        // If both dates are provided, set them. Otherwise reset to null (no filter)
        // Apply to the currently active tab only
        if (activeTab === 'completed') {
            if (start && end) {
                setCompletedStartDate(start);
                setCompletedEndDate(end);
            } else {
                setCompletedStartDate(null);
                setCompletedEndDate(null);
            }
        } else {
            if (start && end) {
                setCancelledStartDate(start);
                setCancelledEndDate(end);
            } else {
                setCancelledStartDate(null);
                setCancelledEndDate(null);
            }
        }
    };

    const handleJobClick = async (item) => {
        try {
            setLoading(true);
            
            if (activeTab === 'completed') {
                // Handle completed jobs - show JobCompletedDetails
                const jobNo = item.id; // job_no from the API
                
                // Fetch completed job details from the new API
                const jobDetailsData = await historyAPI.getCompletedJobDetails(jobNo);
                
                if (!jobDetailsData) {
                    // Fallback to basic data if API fails
                    const jobDetails = {
                        jobNo: jobNo, // Add job number for download all functionality
                        jobTitle: item.title,
                        location: item.location,
                        time: `${item.date} ${item.time}`,
                        caseName: item.caseInfo?.name || item.title,
                        caseNumber: item.caseInfo?.caseNumber || '',
                        attorneys: [],
                        witnesses: [],
                        recordings: []
                    };
                    setSelectedJob(jobDetails);
                    setShowModal(true);
                    return;
                }
                
                // Map API response to JobCompletedDetails format
                const attorneys = jobDetailsData.attorneys || [];
                const witnesses = jobDetailsData.witnesses || [];
                
                // Flatten witness videos into recordings array - only include videos with file_name and file_path
                const recordingsPromises = [];
                witnesses.forEach((witness) => {
                    const witnessVideos = witness.witness_videos || [];
                    witnessVideos.forEach((video) => {
                        // Only process videos that have both file_name and file_path
                        if (video.file_name && video.file_path) {
                            recordingsPromises.push(
                                fetchVideoFileSize(video.file_path).then(size => ({
                                    name: witness.witness_name,
                                    fileName: video.file_name,
                                    filePath: video.file_path,
                                    startTime: video.start_time,
                                    endTime: video.end_time,
                                    size: size // Size in bytes, will be formatted in display
                                }))
                            );
                        }
                    });
                });
                
                // Wait for all size fetches to complete
                const recordings = await Promise.all(recordingsPromises);
                
                const jobDetails = {
                    jobNo: jobNo, // Add job number for download all functionality
                    jobTitle: item.title,
                    location: item.location,
                    time: `${item.date} ${item.time}`,
                    caseName: jobDetailsData.case_short_name || item.caseInfo?.name || item.title,
                    caseNumber: jobDetailsData.case_number || item.caseInfo?.caseNumber || '',
                    attorneys: attorneys.map(a => ({
                        name: a.attorney_name || 'N/A',
                        firm: a.firm_name || 'N/A'
                    })),
                    witnesses: witnesses.map(w => ({
                        name: w.witness_name || 'N/A'
                    })),
                    recordings: recordings
                };
                
                setSelectedJob(jobDetails);
                setShowModal(true);
            } else if (activeTab === 'cancelled') {
                // Handle cancelled jobs - fetch details from API
                const jobNo = item.id;
                
                // Fetch cancelled job details from the API
                const cancelledJobData = await historyAPI.getCancelledJobDetails(jobNo);
                
                if (!cancelledJobData) {
                    // Fallback to basic data if API fails
                    const jobDetails = {
                        jobTitle: item.title,
                        location: item.location,
                        time: `${item.date} ${item.time}`,
                        cancelReason: item.cancelReason || 'N/A',
                        cancelDetails: item.cancelDetails || 'N/A'
                    };
                    setSelectedJob(jobDetails);
                    setShowCancelModal(true);
                    return;
                }
                
                // Map API response to JobCancelDetails format
                const jobDetails = {
                    jobTitle: item.title,
                    location: item.location,
                    time: `${item.date} ${item.time}`,
                    cancelReason: cancelledJobData.cancel_reason || 'N/A',
                    cancelDetails: cancelledJobData.cancel_details || 'N/A'
                };
                
                setSelectedJob(jobDetails);
                setShowCancelModal(true);
            }
        } catch (err) {
            console.error('Failed to load job details:', err);
            // Still show modal with available data
            const jobNo = item.id; // Get job number from item
            const jobDetails = {
                jobNo: jobNo, // Add job number for download all functionality
                jobTitle: item.title,
                location: item.location,
                time: `${item.date} ${item.time}`,
                caseName: item.caseInfo?.name || item.title,
                caseNumber: item.caseInfo?.caseNumber || '',
            };
            
            if (activeTab === 'completed') {
                jobDetails.attorneys = [];
                jobDetails.witnesses = [];
                jobDetails.recordings = [];
                setSelectedJob(jobDetails);
        setShowModal(true);
            } else {
                jobDetails.cancelReason = 'N/A';
                jobDetails.cancelDetails = 'N/A';
                jobDetails.cancelDate = null;
                setSelectedJob(jobDetails);
                setShowCancelModal(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedJob(null);
    };

    const handleCloseCancelModal = () => {
        setShowCancelModal(false);
        setSelectedJob(null);
    };

    const formatDateRange = () => {
        if (!startDate || !endDate) {
            return 'Date';
        }
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startMonth = monthNames[startDate.getMonth()];
        const endMonth = monthNames[endDate.getMonth()];
        const startDay = startDate.getDate();
        const endDay = endDate.getDate();
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        return `${startDay} ${startMonth}, ${startYear} To ${endDay} ${endMonth}, ${endYear}`;
    };

    const historyData = activeTab === 'completed' ? completedJobs : cancelledJobs;
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

                    <div className="relative" ref={calendarRef}>
                        <button
                            onClick={() => setShowCalendar(!showCalendar)}
                            className={`flex items-center gap-2 font-medium text-sm md:text-base transition-colors rounded-lg px-3 py-2 ${
                                startDate && endDate
                                    ? 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
                                    : 'text-gray-700 hover:text-gray-900'
                            }`}
                        >
                            {formatDateRange()}
                            <ChevronDown size={16} />
                        </button>

                        {showCalendar && (
                            <div className="absolute right-0 top-full mt-2 z-50 w-[340px] md:w-[360px]">
                                <HistoryDateRangePicker
                                    startDate={startDate}
                                    endDate={endDate}
                                    onDateChange={handleDateChange}
                                    onClose={() => setShowCalendar(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Search Filters Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => setShowSearchFilters(!showSearchFilters)}
                            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium text-sm md:text-base"
                        >
                            <Search size={18} />
                            <span>Search Filters</span>
                            <ChevronDown size={16} className={showSearchFilters ? 'rotate-180' : ''} />
                        </button>
                        {hasActiveSearchFilters() && (
                            <button
                                onClick={handleClearSearchFilters}
                                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                            >
                                <X size={14} />
                                <span>Clear All</span>
                            </button>
                        )}
                    </div>
                    
                    {showSearchFilters && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Job Number Search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Job Number
                                    </label>
                                    <input
                                        type="text"
                                        value={currentSearchFilters.jobNo}
                                        onChange={(e) => handleSearchFilterChange('jobNo', e.target.value)}
                                        placeholder="Search by Job Number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Witness Name Search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Witness Name
                                    </label>
                                    <input
                                        type="text"
                                        value={currentSearchFilters.witnessName}
                                        onChange={(e) => handleSearchFilterChange('witnessName', e.target.value)}
                                        placeholder="Search by Witness Name"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Case Name Search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Case Name
                                    </label>
                                    <input
                                        type="text"
                                        value={currentSearchFilters.caseName}
                                        onChange={(e) => handleSearchFilterChange('caseName', e.target.value)}
                                        placeholder="Search by Case Name"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Case Number Search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Case Number
                                    </label>
                                    <input
                                        type="text"
                                        value={currentSearchFilters.caseNumber}
                                        onChange={(e) => handleSearchFilterChange('caseNumber', e.target.value)}
                                        placeholder="Search by Case Number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : hasHistory ? (
                    <>
                        <div className="space-y-3">
                            {historyData.map((item) => (
                                <HistoryCard 
                                    key={item.id} 
                                    item={item} 
                                    onClick={handleJobClick}
                                    activeTab={activeTab}
                                />
                            ))}
                        </div>
                        
                        {/* Pagination Controls */}
                        {currentPagination && currentPagination.total > 0 && (
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-4">
                                <div className="text-sm text-gray-600 text-center sm:text-left">
                                    {/* Showing {((currentPagination.page - 1) * currentPagination.pageSize) + 1} to {Math.min(currentPagination.page * currentPagination.pageSize, currentPagination.total)} of {currentPagination.total} results */}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(currentPagination.page - 1)}
                                        disabled={!currentPagination.hasPrevious}
                                        className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                            currentPagination.hasPrevious
                                                ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        Previous
                                    </button>
                                    <div className="text-sm text-gray-600 px-2">
                                        Page {currentPagination.page} of {currentPagination.totalPages}
                                    </div>
                                    <button
                                        onClick={() => handlePageChange(currentPagination.page + 1)}
                                        disabled={!currentPagination.hasNext}
                                        className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                            currentPagination.hasNext
                                                ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <EmptyState />
                )}

                {/* Job Details Modals */}
                <JobCompletedDetails
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    jobDetails={selectedJob}
                />
                <JobCancelDetails
                    isOpen={showCancelModal}
                    onClose={handleCloseCancelModal}
                    jobDetails={selectedJob}
                />
            </div>
        </div>
    );
}


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

