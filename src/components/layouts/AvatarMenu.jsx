"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import { LogOut } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { ROUTES } from '@/lib/routes';

export default function AvatarMenu({
    name = 'Jakir Hossen',
    avatarSrc = null,
    fallback = 'initials', // 'initials' | 'icon'
    className = ''
}) {
    const [open, setOpen] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const router = useRouter();

    const initials = getInitials(name) || 'JK';
    const hasUsableAvatar = Boolean(avatarSrc) && !imageFailed;
    const useIconFallback = !hasUsableAvatar && fallback === 'icon';

    useEffect(() => {
        setImageFailed(false);
    }, [avatarSrc]);

    const handleLogout = () => {
        setOpen(false);
        logout();
        router.push(ROUTES.AUTH.LOGIN);
    };

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
                onClick={() => setOpen(!open)}
                className={`w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden flex items-center justify-center font-semibold text-sm hover:shadow-lg transition-shadow ${
                    useIconFallback ? 'bg-gray-200 text-gray-500' : 'bg-gradient-to-br from-blue-400 to-purple-500 text-white'
                } ${className}`}
                aria-label="User menu"
            >
                {hasUsableAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={avatarSrc}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={() => setImageFailed(true)}
                    />
                ) : useIconFallback ? (
                    // Placeholder icon (matches Settings)
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                ) : (
                    initials
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            <LogOut className="w-4 h-4 text-red-600" />
                            <span className="text-red-600">Logout</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
