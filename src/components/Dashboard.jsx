"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Menu, Calendar } from 'lucide-react';
import AvatarMenu from '@/components/AvatarMenu';
import { useTasks } from '@/hooks/useTasks';

/**
 * Consolidated Dashboard Component
 * - Manages all task views (list, calendar)
 * - Handles task selection and navigation
 * - Supports multiple views with easy switching
 */
export default function Dashboard() {
  const [activeView, setActiveView] = useState('list');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const searchParams = useSearchParams();

  // Fetch tasks from API
  const { tasks, loading, error } = useTasks();

  useEffect(() => {
    const taskId = searchParams.get('selected');
    if (taskId) {
      setSelectedTaskId(taskId);
    }
  }, [searchParams]);

  // Separate pending and upcoming tasks
  const pendingTasks = tasks.filter(t => t.status?.includes('pending') || t.status === 'videos-pending' || t.status === 'session-started');
  const upcomingTasks = tasks.filter(t => !t.status || t.status === 'upcoming');

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
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Hi Jakir</h2>
            </div>
            <p className="text-gray-600 text-xs md:text-sm lg:text-base">
              Quick overview of your scheduled jobs, pending uploads, and upcoming deadlines.
            </p>
          </div>

          {/* View Toggle */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setActiveView('list')}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeView === 'list' ? 'bg-white text-gray-900 shadow-lg' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">List View</span>
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeView === 'calendar' ? 'bg-white text-gray-900 shadow-lg' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading tasks</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-gray-600 font-medium">No tasks found</h3>
            <p className="text-gray-400 text-sm">Start by creating your first task</p>
          </div>
        )}

        {/* List View */}
        {!loading && !error && activeView === 'list' && tasks.length > 0 && (
          <div className="space-y-6">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Pending ({pendingTasks.length})
                </h3>
                <div className="space-y-3">
                  {pendingTasks.map(task => (
                    <TaskCardComponent
                      key={task.id}
                      task={task}
                      isSelected={selectedTaskId === task.id}
                      onSelect={setSelectedTaskId}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Tasks */}
            {upcomingTasks.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Upcoming ({upcomingTasks.length})
                </h3>
                <div className="space-y-3">
                  {upcomingTasks.map(task => (
                    <TaskCardComponent
                      key={task.id}
                      task={task}
                      isSelected={selectedTaskId === task.id}
                      onSelect={setSelectedTaskId}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Calendar View */}
        {activeView === 'calendar' && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <p className="text-gray-600">Calendar view coming soon...</p>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Task Card Sub-component
 * Displays individual task with status and actions
 */
function TaskCardComponent({ task, isSelected, onSelect }) {
  const router = useRouter();
  const getStatusBadge = () => {
    switch (task.status) {
      case 'videos-pending':
        return <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-2xl">Videos Pending</span>;
      case 'session-started':
        return <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded-2xl">Session Started</span>;
      case 'session-not-started':
        return <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-2xl">Not Started</span>;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={() => {
        onSelect(task.id);
        // navigate to task details page
        try {
          router.push(`/dashboard/task-details/${task.id}`);
        } catch (err) {
          // router may not be available in some contexts; fallback is just selection
          console.warn('Navigation failed', err);
        }
      }}
      className={`
        rounded-lg p-4 md:p-5 shadow-sm border cursor-pointer transition-all
        ${
          isSelected
            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300 scale-[1.01]'
            : 'bg-white border-gray-200 hover:shadow-md'
        }
      `}
    >
      <div className="flex flex-col gap-3">
        {/* Header: Date, Title, and Status */}
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div>
              <div className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                {task.date} {task.time}
              </div>
              <div className={`text-sm font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                {task.title}
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </div>

        {/* Location/Details */}
        {task.location && (
          <div className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
            📍 {task.location}
          </div>
        )}

        {/* Deadline or Progress */}
        {task.deadline && (
          <div className={`text-sm font-medium ${task.deadlineColor || 'text-gray-600'}`}>
            ⏱️ {task.deadline}
          </div>
        )}

        {/* Upload Progress */}
        {task.uploadProgress && (
          <div className="text-sm text-gray-600">
            📹 {task.uploadProgress}
          </div>
        )}
      </div>
    </div>
  );
}
