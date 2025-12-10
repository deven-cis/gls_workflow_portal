"use client";

import { useMemo, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import AvatarMenu from '@/components/layouts/AvatarMenu';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();

    const title = useMemo(() => {
        if (!pathname) return '';
        if (pathname.startsWith('/dashboard/task-details')) return 'Task Details';
        if (pathname === '/dashboard' || pathname === '/dashboard/list_of_tasks') return 'My Tasks';
        if (pathname.startsWith('/dashboard/history')) return 'History';
        if (pathname.startsWith('/dashboard/settings')) return 'Settings';
        if (pathname.startsWith('/auth')) return '';
        return '';
    }, [pathname]);

    const showBack = pathname && pathname.startsWith('/dashboard/task-details');

    const handleBack = () => {
        // Prefer history back, but fall back to tasks list
        try {
            router.back();
        } catch (e) {
            router.push('/dashboard/list_of_tasks');
        }
    };

    // Only render time on client to avoid hydration mismatch
    const [dateStr, setDateStr] = useState('');
    const [timeStr, setTimeStr] = useState('');

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setDateStr(now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
            setTimeStr(now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }));
        };
        update();
        // Optionally update time every minute
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {showBack && (
                        <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                    )}
                    <h1 className="text-lg md:text-xl font-bold text-gray-900">{title}</h1>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{dateStr}</span>
                    <span className="text-sm font-medium text-gray-900">{timeStr}</span>
                    <AvatarMenu name="Jakir Hossen" />
                </div>
            </div>
        </header>
    );
}
