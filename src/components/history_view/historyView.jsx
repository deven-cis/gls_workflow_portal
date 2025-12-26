"use client";
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import AvatarMenu from '@/components/layouts/AvatarMenu';
import { historyAPI } from '@/services/history_apis';
import { useToast } from '@/contexts/ToastContext';
import HistoryDateRangePicker from '@/components/history_view/DateRangePicker';
import JobCompletedDetails from '@/components/history_view/JobCompletedDetails';
import JobCancelDetails from '@/components/history_view/JobCancelDetails';
import HistoryCard from '@/components/history_view/HistoryCard';


export default function HistoryView() {
    const [activeTab, setActiveTab] = useState('completed');
    const [activeView, setActiveView] = useState('History');
    const [showCalendar, setShowCalendar] = useState(false);
    const [startDate, setStartDate] = useState(null); // No filter by default
    const [endDate, setEndDate] = useState(null); // No filter by default
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

    // Ensure default tab is always "Completed" when History view is opened
    useEffect(() => {
        setActiveTab('completed');
    }, []);

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

    // Fetch jobs based on active tab and date range
    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true);
            try {
                const type = activeTab === 'completed' ? 'Completed' : 'Cancelled';
                const jobs = await historyAPI.getJobsByType(type, startDate, endDate);
                
                if (activeTab === 'cancelled') {
                    setCancelledJobs(jobs || []);
                } else {
                    setCompletedJobs(jobs || []);
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
    }, [activeTab, startDate, endDate]);

    const handleViewChange = (view) => {
        setActiveView(view);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const handleDateChange = (start, end) => {
        // If both dates are provided, set them. Otherwise reset to null (no filter)
        if (start && end) {
            setStartDate(start);
            setEndDate(end);
        } else {
            setStartDate(null);
            setEndDate(null);
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
                
                // Flatten witness videos into recordings array
                const recordings = [];
                witnesses.forEach((witness) => {
                    const witnessVideos = witness.witness_videos || [];
                    witnessVideos.forEach((video) => {
                        recordings.push({
                            name: witness.witness_name,
                            fileName: video.file_name,
                            filePath: video.file_path,
                            startTime: video.start_time,
                            endTime: video.end_time,
                            size: 'N/A' // Size not provided in API, could be calculated from file if needed
                        });
                    });
                });
                
                const jobDetails = {
                    jobNo: jobNo, // Add job number for download all functionality
                    jobTitle: item.title,
                    location: item.location,
                    time: `${item.date} ${item.time}`,
                    caseName: item.caseInfo?.name || item.title,
                    caseNumber: item.caseInfo?.caseNumber || '',
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
            return 'Select Date Range';
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
                            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium text-sm md:text-base"
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

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : hasHistory ? (
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

