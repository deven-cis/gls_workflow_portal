"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Menu, Calendar } from 'lucide-react';
import AvatarMenu from '@/components/layouts/AvatarMenu';
import TaskCard from '@/components/list_of_tasks/TaskCard';
import TaskSection from '@/components/list_of_tasks/TaskSection';
import EmptyState from '@/components/empty_state/EmptyState';
import { CalendarView } from '@/components/calendar_view/CalendarView';
import { taskAPI } from '@/services/api';

export default function MyTasks() {
    const [activeView, setActiveView] = useState('list');
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [pendingTasks, setPendingTasks] = useState([]);
    const [upcomingTasks, setUpcomingTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const searchParams = useSearchParams();

    // Load tasks from backend APIs
    useEffect(() => {
        const loadTasks = async () => {
            setLoading(true);
            setError(null);
            try {
                const [pending, upcoming] = await Promise.all([
                    taskAPI.getPendingTasks(),
                    taskAPI.getUpcomingTasks(),
                ]);
                setPendingTasks(pending || []);
                setUpcomingTasks(upcoming || []);
            } catch (err) {
                console.log('Failed to load tasks:', err);
                setError('Failed to load tasks. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        loadTasks();
    }, []);

    useEffect(() => {
        const taskId = searchParams.get('selected');
        if (taskId) {
            setSelectedTaskId(taskId);
        }
    }, [searchParams]);

    const handleTaskSelect = (taskId) => {
        setSelectedTaskId(taskId);
    };

    const hasTasks = pendingTasks.length > 0 || upcomingTasks.length > 0;

    return (
        <>
            {/* Header is provided globally via `Header` in `LayoutWrapper` */}

            {/* Content Area */}
            <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6">
                {/* Welcome Banner */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-200">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl md:text-3xl">👋</span>
                            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                                Hi Jakir
                            </h2>
                        </div>
                        <p className="text-gray-600 text-xs md:text-sm lg:text-base">
                            Quick overview of your scheduled jobs, pending uploads, and upcoming deadlines.
                        </p>
                    </div>

                    {/* View Toggle */}
                    <div className="inline-flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                        <button
                            onClick={() => setActiveView('list')}
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${activeView === 'list'
                                ? 'bg-white text-gray-900 shadow-lg'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Menu className="w-4 h-4" />
                            <span className="hidden sm:inline">List View</span>
                        </button>
                        <button
                            onClick={() => setActiveView('calendar')}
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${activeView === 'calendar'
                                ? 'bg-white text-gray-900 shadow-lg'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Calendar className="w-4 h-4" />
                            <span className="hidden sm:inline">Calendar</span>
                        </button>
                    </div>
                </div>

                {/* Conditional Rendering: List View, Calendar View, or Empty State */}
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
                    // <CalendarView
                    //     variant="embed"
                    //     showHero={false}
                    //     enableWeekToggle={false}
                    //     initialViewFilter="month"
                    // /> 
                    <EmptyState />

                ) : !loading && !error && hasTasks ? (
                    <div className="space-y-6">
                        {/* Pending Section */}
                        {pendingTasks.length > 0 && (
                            <TaskSection title="Pending" count={pendingTasks.length}>
                                {pendingTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        isSelected={selectedTaskId === task.id}
                                        onSelect={handleTaskSelect}
                                    />
                                ))}
                            </TaskSection>
                        )}

                        {/* Upcoming Section */}
                        {upcomingTasks.length > 0 && (
                            <TaskSection title="Upcoming" count={upcomingTasks.length}>
                                {upcomingTasks.map((task) => (
                                    console.log('Rendering upcoming task:', task),
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        isSelected={selectedTaskId === task.id}
                                        onSelect={handleTaskSelect}
                                    />
                                ))}
                            </TaskSection>
                        )}
                    </div>
                ) : !loading && !error ? (
                    <EmptyState />
                ) : null}
            </div>
        </>
    );
}
