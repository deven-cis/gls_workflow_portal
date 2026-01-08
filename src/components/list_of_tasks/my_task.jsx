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

const PAGE_SIZE = 4;
const SCROLL_THRESHOLD = 100;
const SCROLL_DEBOUNCE = 200;

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
    const pendingPaginationRef = useRef(null);
    const upcomingPaginationRef = useRef(null);
    const loadMorePendingRef = useRef(null);
    const loadMoreUpcomingRef = useRef(null);
    const loadingPendingRef = useRef(false);
    const loadingUpcomingRef = useRef(false);
    const pendingScrollHandlerRef = useRef(null);
    const upcomingScrollHandlerRef = useRef(null);

    // Pagination state
    const [pendingPagination, setPendingPagination] = useState({
        page: 1,
        pageSize: PAGE_SIZE,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false
    });
    const [upcomingPagination, setUpcomingPagination] = useState({
        page: 1,
        pageSize: PAGE_SIZE,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false
    });

    const [loadingPending, setLoadingPending] = useState(false);
    const [loadingUpcoming, setLoadingUpcoming] = useState(false);
    
    // Keep refs in sync with state
    useEffect(() => {
        loadingPendingRef.current = loadingPending;
        loadingUpcomingRef.current = loadingUpcoming;
        pendingPaginationRef.current = pendingPagination;
        upcomingPaginationRef.current = upcomingPagination;
    }, [loadingPending, loadingUpcoming, pendingPagination, upcomingPagination]);

    // Load more pending tasks
    const loadMorePending = useCallback(async () => {
        if (loadingPending || !pendingPagination.hasNext) return Promise.resolve();
        
        setLoadingPending(true);
        try {
            const nextPage = pendingPagination.page + 1;
            const result = await casesAPI.getPendingTasks(nextPage, PAGE_SIZE);
            const newTasks = result.tasks || [];
            setPendingTasks(prev => [...prev, ...newTasks]);
            setPendingPagination(result.pagination || pendingPagination);
            return Promise.resolve();
        } catch (err) {
            console.error('Failed to load more pending tasks:', err);
            return Promise.reject(err);
        } finally {
            setLoadingPending(false);
        }
    }, [pendingPagination, loadingPending]);

    // Load more upcoming tasks
    const loadMoreUpcoming = useCallback(async () => {
        if (loadingUpcoming || !upcomingPagination.hasNext) return Promise.resolve();
        
        setLoadingUpcoming(true);
        try {
            const nextPage = upcomingPagination.page + 1;
            const result = await casesAPI.getUpcomingTasks(nextPage, PAGE_SIZE);
            const newTasks = result.tasks || [];
            setUpcomingTasks(prev => [...prev, ...newTasks]);
            setUpcomingPagination(result.pagination || upcomingPagination);
            return Promise.resolve();
        } catch (err) {
            console.error('Failed to load more upcoming tasks:', err);
            return Promise.reject(err);
        } finally {
            setLoadingUpcoming(false);
        }
    }, [upcomingPagination, loadingUpcoming]);

    // Keep load functions in refs for stable access
    useEffect(() => {
        loadMorePendingRef.current = loadMorePending;
        loadMoreUpcomingRef.current = loadMoreUpcoming;
    }, [loadMorePending, loadMoreUpcoming]);

    // Helper function to set up infinite scroll
    const setupInfiniteScroll = useCallback(({
        containerRef,
        paginationRef,
        loadingRef,
        loadMoreRef,
        handlerRef,
        sectionName
    }) => {
        if (!initialLoadComplete) return () => {};
        
        let cleanupFn = null;
        let scrollTimeout = null;
        
        const setupTimeout = setTimeout(() => {
            const container = containerRef.current;
            if (!container) {
                console.log(`${sectionName}: Container ref not available`);
                return;
            }

            console.log(`${sectionName}: Setting up scroll handler`);
            const stateRef = { isLoading: false, hasUserScrolled: false };

            const checkAndLoadMore = () => {
                const currentContainer = containerRef.current;
                if (!currentContainer) return;
                if (stateRef.isLoading) return;
                
                const currentPagination = paginationRef.current;
                if (!currentPagination || !currentPagination.hasNext) return;
                if (loadingRef.current || loading) return;
                
                const scrollTop = currentContainer.scrollTop;
                if (scrollTop === 0 && !stateRef.hasUserScrolled) return;
                
                stateRef.hasUserScrolled = true;
                const distanceFromBottom = currentContainer.scrollHeight - scrollTop - currentContainer.clientHeight;

                if (distanceFromBottom < SCROLL_THRESHOLD) {
                    stateRef.isLoading = true;
                    console.log(`${sectionName}: Loading more tasks via scroll...`, { distanceFromBottom, hasNext: currentPagination.hasNext });
                    const loadFn = loadMoreRef.current;
                    if (loadFn) {
                        loadFn().finally(() => {
                            setTimeout(() => { stateRef.isLoading = false; }, 1000);
                        });
                    } else {
                        console.error(`${sectionName}: load function not available`);
                        stateRef.isLoading = false;
                    }
                }
            };

            const handleScroll = () => {
                const currentContainer = containerRef.current;
                if (!currentContainer) return;
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(checkAndLoadMore, SCROLL_DEBOUNCE);
            };

            handlerRef.current = handleScroll;
            container.addEventListener('scroll', handleScroll, { passive: true });
            console.log(`${sectionName}: Scroll handler attached`);
            
            cleanupFn = () => {
                clearTimeout(scrollTimeout);
                if (container && handlerRef.current) {
                    container.removeEventListener('scroll', handlerRef.current);
                }
                handlerRef.current = null;
                console.log(`${sectionName}: Scroll handler removed`);
            };
        }, 300);

        return () => {
            clearTimeout(setupTimeout);
            if (cleanupFn) cleanupFn();
        };
    }, [initialLoadComplete, loading]);


    // Initial load
    useEffect(() => {
        const loadInitialTasks = async () => {
            setLoading(true);
            setError(null);
            try {
                const [pendingResult, upcomingResult] = await Promise.all([
                    casesAPI.getPendingTasks(1, PAGE_SIZE),
                    casesAPI.getUpcomingTasks(1, PAGE_SIZE),
                ]);
                
                setPendingTasks((pendingResult.tasks || []).slice(0, PAGE_SIZE));
                setPendingPagination(pendingResult.pagination || pendingPagination);
                setUpcomingTasks((upcomingResult.tasks || []).slice(0, PAGE_SIZE));
                setUpcomingPagination(upcomingResult.pagination || upcomingPagination);
                
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

    // Set up infinite scroll for pending section
    useEffect(() => {
        return setupInfiniteScroll({
            containerRef: pendingScrollContainerRef,
            paginationRef: pendingPaginationRef,
            loadingRef: loadingPendingRef,
            loadMoreRef: loadMorePendingRef,
            handlerRef: pendingScrollHandlerRef,
            sectionName: 'Pending'
        });
    }, [setupInfiniteScroll]);

    // Set up infinite scroll for upcoming section
    useEffect(() => {
        return setupInfiniteScroll({
            containerRef: upcomingScrollContainerRef,
            paginationRef: upcomingPaginationRef,
            loadingRef: loadingUpcomingRef,
            loadMoreRef: loadMoreUpcomingRef,
            handlerRef: upcomingScrollHandlerRef,
            sectionName: 'Upcoming'
        });
    }, [setupInfiniteScroll]);

    // Re-attach handlers after state updates to ensure they persist through re-renders
    useEffect(() => {
        if (!initialLoadComplete) return;
        
        const reattachHandler = (containerRef, handlerRef) => {
            const container = containerRef.current;
            if (container && handlerRef.current) {
                const oldHandler = handlerRef.current;
                container.removeEventListener('scroll', oldHandler);
                container.addEventListener('scroll', oldHandler, { passive: true });
            }
        };
        
        reattachHandler(pendingScrollContainerRef, pendingScrollHandlerRef);
        reattachHandler(upcomingScrollContainerRef, upcomingScrollHandlerRef);
    }, [pendingTasks.length, upcomingTasks.length, initialLoadComplete]);

    useEffect(() => {
        const taskId = searchParams.get('selected');
        if (taskId) setSelectedTaskId(taskId);
    }, [searchParams]);

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
    const ScrollableSection = ({ containerRef, tasks, pagination, loadMore, loadingState, emptyMessage, children }) => {
        const innerRef = useRef(null);
        const [hasOverflow, setHasOverflow] = useState(false);
        
        // Hide scrollbar when content doesn't overflow
        useEffect(() => {
            if (!containerRef.current || !innerRef.current) return;
            
            const container = containerRef.current;
            const inner = innerRef.current;
            
            const checkOverflow = () => {
                // Check if content actually overflows the container
                // Add 5px tolerance to account for rounding and border differences
                const scrollHeight = inner.scrollHeight;
                const clientHeight = container.clientHeight;
                const overflow = scrollHeight > clientHeight + 5;
                
                setHasOverflow(overflow);
                
                if (overflow) {
                    container.style.overflowY = 'auto';
                    container.style.overflowX = 'hidden';
                    container.classList.add('custom-scrollbar');
                } else {
                    container.style.overflowY = 'hidden';
                    container.style.overflowX = 'hidden';
                    container.classList.remove('custom-scrollbar');
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
        }, [tasks.length, selectedTaskId, loadingState, containerRef, children]);
        
        return tasks.length > 0 ? (
            <div 
                ref={containerRef}
                className={`max-h-[450px] overflow-x-hidden ${hasOverflow ? 'pr-2 custom-scrollbar' : ''}`}
                style={hasOverflow ? { scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' } : { overflowX: 'hidden' }}
            >
                <div ref={innerRef} className="space-y-3">
                    {children}
                    {pagination.hasNext && (
                        <div className="py-4 flex justify-center min-h-[50px]">
                            {loadingState && (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            )}
                        </div>
                    )}
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
                        <TaskSection title="Pending" count={pendingPagination.total || pendingTasks.length}>
                            <ScrollableSection
                                containerRef={pendingScrollContainerRef}
                                tasks={pendingTasks}
                                pagination={pendingPagination}
                                loadingState={loadingPending}
                                emptyMessage="No pending jobs at the moment."
                            >
                                {pendingTasks.map((task, index) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        isSelected={selectedTaskId === task.id}
                                        onSelect={setSelectedTaskId}
                                        onCancelJob={handleCancelJob}
                                        showVideoPending={index === 0}
                                    />
                                ))}
                            </ScrollableSection>
                        </TaskSection>

                        <TaskSection title="Upcoming" count={upcomingPagination.total || upcomingTasks.length}>
                            <ScrollableSection
                                containerRef={upcomingScrollContainerRef}
                                tasks={upcomingTasks}
                                pagination={upcomingPagination}
                                loadingState={loadingUpcoming}
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
