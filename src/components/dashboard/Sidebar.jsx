"use client";
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, History, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Sidebar({ isSidebarCollapsed, setIsSidebarCollapsed }) {
    const pathname = usePathname();
    const isMyTasksActive = pathname === '/dashboard/my-tasks' || pathname.startsWith('/dashboard/task_details');

    return (
        <>
            <aside
                className={`${isSidebarCollapsed ? 'w-16 md:w-20' : 'w-64'
                    } bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-full z-40`}
            >
                {/* Logo */}
                <div className="h-14 md:h-16 flex items-center justify-between px-4 border-gray-100">
                    <div className="flex items-center gap-3">
                        {!isSidebarCollapsed ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-800 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                    GLS
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-red-800 font-bold text-xs leading-tight">GALLO</span>
                                    <span className="text-red-800 font-bold text-xs leading-tight">LEGAL</span>
                                    <span className="text-gray-600 font-semibold text-xs leading-tight">SERVICES</span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-10 h-10 bg-red-800 rounded-lg flex items-center justify-center text-white font-bold text-sm mx-auto">
                                GLS
                            </div>
                        )}
                    </div>

                    {/* Toggle Button */}
                    {!isSidebarCollapsed && (
                        <button
                            onClick={() => setIsSidebarCollapsed(true)}
                            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    <Link href="/dashboard/my-tasks">
                        <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                            isMyTasksActive 
                                ? 'text-red-800 bg-red-50' 
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}>
                            <Menu className="w-5 h-5 flex-shrink-0" />
                            {!isSidebarCollapsed && (
                                <span className="text-sm">My Tasks</span>
                            )}
                        </button>
                    </Link>

                    <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <History className="w-5 h-5 flex-shrink-0" />
                        {!isSidebarCollapsed && (
                            <span className="text-sm">History</span>
                        )}
                    </button>
                </nav>

                {/* Settings */}
                <div className="border-t border-gray-100 p-3">
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <Settings className="w-5 h-5 flex-shrink-0" />
                        {!isSidebarCollapsed && (
                            <span className="text-sm">Settings</span>
                        )}
                    </button>
                </div>

                {/* Expand Button (when collapsed) */}
                {isSidebarCollapsed && (
                    <button
                        onClick={() => setIsSidebarCollapsed(false)}
                        className="absolute top-4 -right-3 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 z-50"
                    >
                        <ChevronRight className="w-3 h-3 text-gray-600" />
                    </button>
                )}
            </aside>

            {/* Mobile Overlay */}
            {!isSidebarCollapsed && (
                <div
                    className="fixed inset-0 bg-transparent bg-opacity-50 z-30 md:hidden"
                    onClick={() => setIsSidebarCollapsed(true)}
                />
            )}
        </>
    );
}
