"use client";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Menu, History, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUserRole } from '@/lib/auth';
import { useState, useEffect } from 'react';

// Dynamic navigation URLs
const NAV_URLS = {
    MY_TASKS: '/dashboard/list_of_tasks',
    HISTORY: '/dashboard/history',
    SETTINGS: '/dashboard/settings',
};

const ADMIN_ROLES = [
    "1b. Staff: Videographers Georgia",
    "9c. Admin"
];

const ADMIN_MODE_STORAGE_KEY = 'showAllHistory';

export default function Sidebar({ isSidebarCollapsed, setIsSidebarCollapsed }) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const userRole = getUserRole();
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const isStaff = ADMIN_ROLES.includes(userRole?.trim());

    // Initialize from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === 'true';
            setShowAllHistory(stored);
            setIsHydrated(true);
        }
    }, []);

    // Sync showAllHistory state with URL admin parameter only when on History page
    useEffect(() => {
        if (!isHydrated || pathname !== NAV_URLS.HISTORY) return;
        const adminParam = searchParams.get('admin') === 'true';
        setShowAllHistory(adminParam);
    }, [searchParams, pathname, isHydrated]);

    const handleToggleAllHistory = (newState) => {
        setShowAllHistory(newState);
        // Save to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem(ADMIN_MODE_STORAGE_KEY, newState ? 'true' : 'false');
        }
        // Preserve the current tab parameter when toggling admin mode
        const params = new URLSearchParams(searchParams.toString());
        if (newState) {
            params.set('admin', 'true');
        } else {
            params.delete('admin');
        }
        const url = params.toString() ? `${NAV_URLS.HISTORY}?${params.toString()}` : NAV_URLS.HISTORY;
        router.push(url);
    };
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
                    <Link href={NAV_URLS.MY_TASKS}>
                        <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                            pathname === NAV_URLS.MY_TASKS || pathname.startsWith('/dashboard/task-details')
                                ? 'text-red-800 bg-red-50' 
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}>
                            <Menu className="w-5 h-5 flex-shrink-0" />
                            {!isSidebarCollapsed && (
                                <span className="text-sm">My Tasks</span>
                            )}
                        </button>
                    </Link>

                    <div className={`flex items-center gap-0 px-3 rounded-lg transition-colors ${
                        pathname === NAV_URLS.HISTORY
                            ? 'bg-red-50' 
                            : 'hover:bg-gray-50'
                    }`}>
                        <Link href={showAllHistory ? `${NAV_URLS.HISTORY}?admin=true` : NAV_URLS.HISTORY} className="flex-1">
                            <button className={`w-full flex items-center gap-3 px-1 py-3 rounded-lg transition-colors font-medium ${
                                pathname === NAV_URLS.HISTORY
                                    ? 'text-red-800' 
                                    : 'text-gray-600'
                            }`}>
                                <History className="w-5 h-5 flex-shrink-0" />
                                {!isSidebarCollapsed && (
                                    <span className="text-sm">{showAllHistory && isStaff ? 'All History' : 'History'}</span>
                                )}
                            </button>
                        </Link>
                        {isStaff && !isSidebarCollapsed && (
                            <div
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleToggleAllHistory(!showAllHistory);
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                                    showAllHistory ? 'bg-red-800' : 'bg-gray-300'
                                }`}
                                role="switch"
                                aria-checked={showAllHistory}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        showAllHistory ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </div>
                        )}
                    </div>
                </nav>

                {/* Settings */}
                <div className="border-t border-gray-100 p-3">
                <Link href={NAV_URLS.SETTINGS}>   
                    <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                        pathname === NAV_URLS.SETTINGS
                            ? 'text-red-800 bg-red-50' 
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                        <Settings className="w-5 h-5 flex-shrink-0" />
                        {!isSidebarCollapsed && (
                            <span className="text-sm">Settings</span>
                        )}
                    </button>
                </Link>
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
