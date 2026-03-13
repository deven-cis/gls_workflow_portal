"use client";
import CalendarView from '@/components/calendar_view/CalendarView';
import { getUser } from '@/lib/auth';
import { useState, useEffect, Suspense } from 'react';
import { Menu, Calendar } from 'lucide-react';
import EmptyState from '@/components/empty_state/EmptyState';

export default function CalendarPage() {
  const [userName, setUserName] = useState('User');
  const [activeView, setActiveView] = useState('calendar'); // Default to calendar view

  useEffect(() => {
    const user = getUser();
    const name = user?.rsrc_name || 'User';
    setUserName(name);
  }, []);


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6">
        {/* Welcome Banner */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl md:text-3xl">👋</span>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                Hi {userName}
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
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeView === 'list'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">List View</span>
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeView === 'calendar'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>
        </div>

        {/* Conditional Rendering: List View or Calendar View */}
        {activeView === 'calendar' ? (
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          }>
            <CalendarView userName={userName} showHero={false} />
          </Suspense>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
