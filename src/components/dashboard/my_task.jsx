"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Menu, Calendar } from 'lucide-react';
import TaskCard from '@/components/dashboard/TaskCard';
import TaskSection from '@/components/dashboard/TaskSection';
import EmptyState from '@/components/dashboard/EmptyState';
import { pendingTasks, upcomingTasks } from '@/components/dashboard/data/tasksData';

export default function MyTasks() {
    const [activeView, setActiveView] = useState('list');
    const [hasTasks, setHasTasks] = useState(true);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        const taskId = searchParams.get('selected');
        if (taskId) {
            setSelectedTaskId(taskId);
        }
    }, [searchParams]);

    const handleTaskSelect = (taskId) => {
        setSelectedTaskId(taskId);
    };

    return (
        <>
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg md:text-xl font-bold text-gray-900">
                            My Tasks
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            JK
                        </div>
                    </div>
                </div>
            </header>

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
                {activeView === 'calendar' ? (
                    <div className="flex flex-col items-center justify-center py-12 md:py-16 lg:py-24">
                        <div className="mb-6">
                            <Calendar className="w-24 h-24 text-gray-300" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 text-center">
                            Calendar View
                        </h3>
                        <p className="text-xl text-gray-500 text-center max-w-md">
                            Coming Soon
                        </p>
                        <p className="text-sm text-gray-400 text-center max-w-md mt-2">
                            We're working on bringing you a beautiful calendar view to manage your tasks.
                        </p>
                    </div>
                ) : hasTasks ? (
                    <div className="space-y-6">
                        {/* Pending Section */}
                        <TaskSection title="Pending" count={pendingTasks.length}>
                            {pendingTasks.map((task, index) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    isSelected={selectedTaskId === task.id}
                                    onSelect={handleTaskSelect}
                                />
                            ))}
                        </TaskSection>

                        {/* Upcoming Section */}
                        <TaskSection title="Upcoming" count={upcomingTasks.length}>
                            {upcomingTasks.map((task, index) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    isSelected={selectedTaskId === task.id}
                                    onSelect={handleTaskSelect}
                                />
                            ))}
                        </TaskSection>
                    </div>
                ) : (
                    <EmptyState />
                )}
            </div>
        </>
    );
}
