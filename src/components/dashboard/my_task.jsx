"use client"
import { useState } from 'react';
import { Menu, Calendar, History, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MyTasks() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeView, setActiveView] = useState('list');

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            {/* Sidebar */}
            <aside
                className={`${isSidebarCollapsed ? 'w-16 md:w-20' : 'w-64'
                    } bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col fixed md:relative h-full z-40`}
            >
                {/* Logo */}
                <div className="h-14 md:h-16 flex items-center justify-between px-4">
                    <div className="flex items-center gap-3 mt-2">
                        {!isSidebarCollapsed ? (
                            <div className="flex items-center gap-3">
                                <div onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-10 h-10 bg-red-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    GLS
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-red-800 font-bold text-xsm leading-tight">GALLO</span>
                                    <span className="text-red-800 font-bold text-xsm leading-tight">LEGAL</span>
                                    <span className="text-gray-600 font-bold text-xs leading-tight">SERVICES</span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-10 h-10 bg-red-800 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto">
                                GLS
                            </div>
                        )}
                    </div>

                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={`p-1 hover:bg-gray-100 rounded transition-colors ${isSidebarCollapsed ? 'hidden' : 'block'}`}
                    >
                        <div className="w-5 h-5 border-2 border-gray-400 rounded flex items-center justify-center">
                            <ChevronLeft className="w-3 h-3 text-gray-600" />
                        </div>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-red-800 bg-red-50 rounded-lg transition-colors">
                        <Menu className="w-5 h-5 flex-shrink-0" />
                        {!isSidebarCollapsed && (
                            <span className="text-sm font-medium">My Tasks</span>
                        )}
                    </button>

                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <History className="w-5 h-5 flex-shrink-0" />
                        {!isSidebarCollapsed && (
                            <span className="text-sm font-medium">History</span>
                        )}
                    </button>
                </nav>

                {/* Settings */}
                <div className="border-t border-gray-200 p-3">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <Settings className="w-5 h-5 flex-shrink-0" />
                        {!isSidebarCollapsed && (
                            <span className="text-sm font-medium">Settings</span>
                        )}
                    </button>
                </div>

                {/* Expand Button (when collapsed) */}
                {isSidebarCollapsed && (
                    <button
                        onClick={() => setIsSidebarCollapsed(false)}
                        className="absolute top-4 -right-3 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50"
                    >
                        <ChevronRight className="w-3 h-3 text-gray-600" />
                    </button>
                )}
            </aside>

            {/* Main Content */}
            <main className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-0' : 'ml-64 md:ml-0'}`}>
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                    <div className="px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <Menu className="w-5 h-5 text-gray-600" />
                            </button>
                            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900">
                                My Tasks
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <img src="/avatar.png" alt="Avatar" width={40} height={40} />
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6">
                    {/* Welcome Banner */}
                    <div className="mb-4 md:mb-6 flex items-center justify-between border-b border-gray-200 pb-6">
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
                        <div className="inline-flex bg-gray-100 rounded-lg p-2 border border-gray-200 shadow-sm">
                            <button
                                onClick={() => setActiveView('list')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${activeView === 'list'
                                    ? 'bg-white text-gray-900 shadow-lg'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Menu className="w-4 h-4" />
                                <span>List View</span>
                            </button>
                            <button
                                onClick={() => setActiveView('calendar')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${activeView === 'calendar'
                                    ? 'bg-white text-gray-900 shadow-lg'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Calendar className="w-4 h-4" />
                                <span>Calendar</span>
                            </button>
                        </div>

                    </div>

                    {/* Empty State */}
                    <div className="flex flex-col items-center justify-center py-12 md:py-16 lg:py-24">
                        <div className="mb-6 md:mb-8">
                            <img src="/not_found.png" alt="Empty State" className="w-full h-auto" />
                        </div>

                        <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-2 text-center px-4">
                            No Jobs Right Now
                        </h3>
                        <p className="text-gray-600 text-center text-xs md:text-sm lg:text-base max-w-md px-4">
                            There are currently no depositions, hearings, or remote sessions assigned to you.
                        </p>
                    </div>
                </div>
            </main>

            {/* Mobile Overlay */}
            {!isSidebarCollapsed && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    onClick={() => setIsSidebarCollapsed(true)}
                />
            )}
        </div>
    );
}