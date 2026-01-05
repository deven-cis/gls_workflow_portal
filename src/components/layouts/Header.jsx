"use client";

import { useMemo, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import AvatarMenu from '@/components/layouts/AvatarMenu';
import { getUser } from '@/lib/auth';
import { userSettingsAPI } from '@/services/user_setting';

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
    const [userName, setUserName] = useState('User');
    const [avatarSrc, setAvatarSrc] = useState(null);

    const API_BASE_URL = 'http://127.0.0.1:8000';
    const resolveUrl = (pathOrUrl) => {
        if (!pathOrUrl) return null;
        const s = String(pathOrUrl);
        if (s.startsWith('http://') || s.startsWith('https://')) return s;
        if (s.startsWith('/')) return `${API_BASE_URL}${s}`;
        return `${API_BASE_URL}/${s}`;
    };

    const safeTail = (s) => {
        if (!s) return null;
        try {
            const parts = String(s).split('/');
            return parts[parts.length - 1]?.slice(0, 40) || null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setDateStr(now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
            setTimeStr(now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }));
        };
        update();
        // Update time every second to stay in sync with system time
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const u = getUser();
        const name = u?.full_name || u?.fullName || u?.login_name || u?.email || 'User';
        setUserName(name);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadAvatar = async (source) => {
            try {
                const profile = await userSettingsAPI.getCurrentUser();
                const raw = profile?.profile_image_url || null;
                const url = resolveUrl(raw);
                // bust cache after change/remove
                const withCacheBust = url ? `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}` : null;
                if (cancelled) return;
                setAvatarSrc(withCacheBust);
            } catch (e) {
                if (cancelled) return;
                setAvatarSrc(null);
            }
        };

        loadAvatar('mount');
        const handler = () => loadAvatar('event');
        window.addEventListener('gls:profile-picture-updated', handler);
        return () => {
            cancelled = true;
            window.removeEventListener('gls:profile-picture-updated', handler);
        };
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
                    {/* If no profile photo, show placeholder icon (not initials) */}
                    <AvatarMenu name={userName} avatarSrc={avatarSrc} fallback="icon" />
                </div>
            </div>
        </header>
    );
}
