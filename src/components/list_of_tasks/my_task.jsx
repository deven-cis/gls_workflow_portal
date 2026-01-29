"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Menu, Calendar } from 'lucide-react';
import TaskCard from '@/components/list_of_tasks/TaskCard';
import TaskSection from '@/components/list_of_tasks/TaskSection';
import EmptyState from '@/components/empty_state/EmptyState';
import CalendarView from '@/components/calendar_view/CalendarView';
import { getUser } from '@/lib/auth';
import { casesAPI } from '@/services/cases_apis';
import { useToast } from '@/contexts/ToastContext';

// Removed pagination constants - now loading all jobs at once

const VIEW_STORAGE_KEY = 'myTasks_activeView';

// Helper to get saved view from localStorage (client-side only)
const getSavedView = () => {
    if (typeof window === 'undefined') return 'list';
    try {
        const savedView = localStorage.getItem(VIEW_STORAGE_KEY);
        return savedView === 'calendar' || savedView === 'list' ? savedView : 'list';
    } catch {
        return 'list';
    }
};

// Helper to save view to localStorage (client-side only)
const saveView = (view) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch (error) {
        console.warn('Failed to save view preference:', error);
    }
};

export default function MyTasks() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Get initial view from URL, default to 'list' (like history view tabs)
    const viewFromUrl = searchParams.get('view');
    const initialView = viewFromUrl === 'calendar' ? 'calendar' : 'list';
    
    // Always start with URL-based view to avoid hydration mismatch (server-safe)
    const [activeView, setActiveView] = useState(initialView);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [pendingTasks, setPendingTasks] = useState([]);
    const [upcomingTasks, setUpcomingTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userName, setUserName] = useState('User');
    const [cancellingJobId, setCancellingJobId] = useState(null);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    
    const pathname = usePathname();
    const toast = useToast();
    const pendingScrollContainerRef = useRef(null);
    const upcomingScrollContainerRef = useRef(null);
    const scrollPositionRef = useRef({ pending: null, upcoming: null });
    
    // Expose scrollPositionRef globally so TaskCard can access it
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.__scrollPositionRef = scrollPositionRef;
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete window.__scrollPositionRef;
            }
        };
    }, []);

    // Removed pagination state and infinite scroll logic - now loading all jobs at once


    // Initial load - fetch all jobs at once (no pagination)
    useEffect(() => {
        const loadInitialTasks = async () => {
            setLoading(true);
            setError(null);
            try {
                const [pendingResult, upcomingResult] = await Promise.all([
                    casesAPI.getPendingTasks(null, null), // null = get all jobs
                    casesAPI.getUpcomingTasks(null, null), // null = get all jobs
                ]);
                
                setPendingTasks(pendingResult.tasks || []);
                setUpcomingTasks(upcomingResult.tasks || []);
                
                setTimeout(() => setInitialLoadComplete(true), 500);
            } catch (err) {
                console.error('Failed to load tasks:', err);
                setError('Failed to load tasks. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        loadInitialTasks();
    }, []);

    // Removed infinite scroll setup - all jobs are loaded at once

    useEffect(() => {
        const taskId = searchParams.get('selected');
        if (taskId) setSelectedTaskId(taskId);
    }, [searchParams]);
    
    // Save scroll positions before selectedTaskId changes
    useEffect(() => {
        // Save scroll positions before re-render
        if (pendingScrollContainerRef.current) {
            scrollPositionRef.current.pending = pendingScrollContainerRef.current.scrollTop;
        }
        if (upcomingScrollContainerRef.current) {
            scrollPositionRef.current.upcoming = upcomingScrollContainerRef.current.scrollTop;
        }
    }, [selectedTaskId]);

    // Sync view with URL parameter when it changes
    useEffect(() => {
        const viewFromUrl = searchParams.get('view');
        const newView = viewFromUrl === 'calendar' ? 'calendar' : 'list';
        if (newView !== activeView) {
            setActiveView(newView);
        }
    }, [searchParams, activeView]);

    useEffect(() => {
        const u = getUser();
        setUserName(u?.full_name || u?.fullName || u?.login_name || u?.email || 'User');
    }, []);

    // Memoized view change handlers for better performance
    // Updates URL to persist view selection (like history view tabs)
    const handleViewChange = useCallback((newView) => {
        setActiveView(newView);
        saveView(newView); // Keep localStorage as backup
        
        // Update URL to persist view selection
        const params = new URLSearchParams(searchParams.toString());
        if (newView === 'list') {
            params.delete('view'); // Remove view param for default (list)
        } else {
            params.set('view', newView);
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const handleCancelJob = async (taskId, cancelData) => {
        try {
            setCancellingJobId(taskId);
            const response = await casesAPI.cancelJob(taskId, cancelData);
            
            if (response?.success) {
                toast.success(response.message || 'Job cancelled successfully');
                setPendingTasks(prev => prev.filter(task => task.id !== taskId));
                setUpcomingTasks(prev => prev.filter(task => task.id !== taskId));
                if (selectedTaskId === taskId) setSelectedTaskId(null);
            } else {
                toast.error(response?.message || 'Failed to cancel job');
            }
        } catch (err) {
            console.error('Failed to cancel job:', err);
            toast.error(err?.body?.message || err?.message || 'Failed to cancel job. Please try again.');
        } finally {
            setCancellingJobId(null);
        }
    };

    // Scrollable section component
    const ScrollableSection = ({ containerRef, tasks, emptyMessage, children }) => {
        const innerRef = useRef(null);
        const [hasOverflow, setHasOverflow] = useState(false);
        const restoredScrollRef = useRef(null); // Track recently restored scroll position
        
        // Hide scrollbar when content doesn't overflow
        useEffect(() => {
            if (!containerRef.current || !innerRef.current) return;
            
            const container = containerRef.current;
            const inner = innerRef.current;
            
            // Determine which section this is (pending or upcoming)
            const isPending = containerRef === pendingScrollContainerRef;
            const sectionKey = isPending ? 'pending' : 'upcoming';
            
            // Restore scroll position if we have a saved one
            // window.__scrollPositionRef is the ref object, so we need to read .current
            const savedScroll = scrollPositionRef.current[sectionKey] ?? 
                               (typeof window !== 'undefined' && window.__scrollPositionRef?.current?.[sectionKey]) ?? 
                               null;
            
            if (savedScroll !== null && savedScroll > 0) {
                // Store the restored scroll position to prevent checkOverflow from resetting it
                restoredScrollRef.current = savedScroll;
                // Use multiple requestAnimationFrame calls to ensure DOM is ready
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (container.scrollTop !== savedScroll) {
                            container.scrollTop = savedScroll;
                        }
                        // Clear after restore (but keep restoredScrollRef for a bit to prevent reset)
                        scrollPositionRef.current[sectionKey] = null;
                        if (typeof window !== 'undefined' && window.__scrollPositionRef?.current) {
                            window.__scrollPositionRef.current[sectionKey] = null;
                        }
                        // Clear restoredScrollRef after a delay to allow checkOverflow to preserve it
                        setTimeout(() => {
                            restoredScrollRef.current = null;
                        }, 1000);
                    });
                });
            }
            
            const checkOverflow = () => {
                // Preserve scroll position before making any changes
                // If we recently restored scroll, use that instead of current scrollTop
                const savedScrollTop = restoredScrollRef.current !== null && restoredScrollRef.current > 0 
                    ? restoredScrollRef.current 
                    : container.scrollTop;
                
                // Check if content actually overflows the container
                // Add 5px tolerance to account for rounding and border differences
                const scrollHeight = inner.scrollHeight;
                const clientHeight = container.clientHeight;
                const overflow = scrollHeight > clientHeight + 5;
                
                setHasOverflow(overflow);
                
                const currentOverflowY = container.style.overflowY;
                if (overflow) {
                    if (currentOverflowY !== 'auto') {
                        container.style.overflowY = 'auto';
                        container.style.overflowX = 'hidden';
                        container.classList.add('custom-scrollbar');
                        // Restore scroll position after style change
                        requestAnimationFrame(() => {
                            if (container.scrollTop !== savedScrollTop) {
                                container.scrollTop = savedScrollTop;
                            }
                        });
                    }
                } else {
                    if (currentOverflowY !== 'hidden') {
                        container.style.overflowY = 'hidden';
                        container.style.overflowX = 'hidden';
                        container.classList.remove('custom-scrollbar');
                    }
                }
            };
            
            // Check immediately and after render delays (longer delay for task selection)
            checkOverflow();
            const timeoutId1 = setTimeout(checkOverflow, 50);
            const timeoutId2 = setTimeout(checkOverflow, 150);
            const timeoutId3 = setTimeout(checkOverflow, 300);
            const timeoutId4 = setTimeout(checkOverflow, 500); // Extra check for task selection changes
            
            // Check when content changes
            const resizeObserver = new ResizeObserver(() => {
                // Debounce resize checks
                setTimeout(checkOverflow, 50);
            });
            resizeObserver.observe(inner);
            resizeObserver.observe(container);
            
            return () => {
                resizeObserver.disconnect();
                clearTimeout(timeoutId1);
                clearTimeout(timeoutId2);
                clearTimeout(timeoutId3);
                clearTimeout(timeoutId4);
            };
        }, [tasks.length, selectedTaskId, containerRef, children]);
        
        return tasks.length > 0 ? (
            <div 
                ref={containerRef}
                data-section={containerRef === pendingScrollContainerRef ? 'pending' : 'upcoming'}
                className={`max-h-[450px] overflow-x-hidden ${hasOverflow ? 'pr-2 custom-scrollbar' : ''}`}
                style={hasOverflow ? { scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' } : { overflowX: 'hidden' }}
            >
                <div ref={innerRef} className="space-y-3">
                    {children}
                </div>
            </div>
        ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 md:p-16 lg:p-20 text-center min-h-[200px] md:min-h-[250px] flex items-center justify-center">
                <p className="text-gray-600 text-base md:text-lg lg:text-xl font-medium">{emptyMessage}</p>
            </div>
        );
    };

    return (
        <>
            <style jsx global>{`
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 5px;
                    border: 2px solid #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>

            <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6">
                <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-200">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl md:text-3xl">👋</span>
                            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Hi {userName}</h2>
                        </div>
                        <p className="text-gray-600 text-xs md:text-sm lg:text-base">
                            Quick overview of your scheduled jobs, pending uploads, and upcoming deadlines.
                        </p>
                    </div>

                    <div className="inline-flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                        <button
                            onClick={() => handleViewChange('list')}
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
                                activeView === 'list' ? 'bg-white text-gray-900 shadow-lg' : 'text-gray-600 hover:text-gray-900'
                            }`}
                            aria-pressed={activeView === 'list'}
                            aria-label="Switch to List View"
                        >
                            <Menu className="w-4 h-4" />
                            <span className="hidden sm:inline">List View</span>
                        </button>
                        <button
                            onClick={() => handleViewChange('calendar')}
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
                                activeView === 'calendar' ? 'bg-white text-gray-900 shadow-lg' : 'text-gray-600 hover:text-gray-900'
                            }`}
                            aria-pressed={activeView === 'calendar'}
                            aria-label="Switch to Calendar View"
                        >
                            <Calendar className="w-4 h-4" />
                            <span className="hidden sm:inline">Calendar</span>
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        <p className="font-medium">Error loading tasks</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {!loading && !error && activeView === 'calendar' ? (
                    <CalendarView userName={userName} showHero={false} />
                ) : !loading && !error && activeView === 'list' ? (
                    <div className="space-y-6">
                        <TaskSection title="Pending" count={pendingTasks.length}>
                            <ScrollableSection
                                containerRef={pendingScrollContainerRef}
                                tasks={pendingTasks}
                                emptyMessage="No pending jobs at the moment."
                            >
                                {pendingTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        isSelected={selectedTaskId === task.id}
                                        onSelect={setSelectedTaskId}
                                        onCancelJob={handleCancelJob}
                                    />
                                ))}
                            </ScrollableSection>
                        </TaskSection>

                        <TaskSection title="Upcoming" count={upcomingTasks.length}>
                            <ScrollableSection
                                containerRef={upcomingScrollContainerRef}
                                tasks={upcomingTasks}
                                emptyMessage="No upcoming jobs at the moment."
                            >
                                {upcomingTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        isSelected={selectedTaskId === task.id}
                                        onSelect={setSelectedTaskId}
                                        isUpcoming={true}
                                        onCancelJob={handleCancelJob}
                                    />
                                ))}
                            </ScrollableSection>
                        </TaskSection>
                    </div>
                ) : !loading && !error ? (
                    <EmptyState />
                ) : null}
            </div>
        </>
    );
}
