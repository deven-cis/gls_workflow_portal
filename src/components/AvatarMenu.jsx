"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import { LogOut } from 'lucide-react';
import { getInitials } from '@/lib/utils';

export default function AvatarMenu({ name = 'Jakir Hossen', className = '' }) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const initials = getInitials(name) || 'JK';

    const handleLogout = () => {
        setOpen(false);
        logout();
        router.push('/auth/login');
    };

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
                onClick={() => setOpen(!open)}
                className={`w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm hover:shadow-lg transition-shadow ${className}`}
                aria-label="User menu"
            >
                {initials}
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
