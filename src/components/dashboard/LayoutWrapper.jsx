"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import Header from '@/components/Header';

// Dynamically import Sidebar with SSR disabled
const Sidebar = dynamic(() => import('./Sidebar'), { ssr: false });

export default function LayoutWrapper({ children }) {
    const [isMounted, setIsMounted] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // Set mounted state after component mounts (client-side only)
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Redirect unauthenticated users away from protected routes
    useEffect(() => {
        if (!isMounted) return;
        const publicRoutes = ['/', '/auth', '/auth/login'];
        const isPublic = publicRoutes.some((r) => pathname === r || pathname?.startsWith(r));
        try {
            // Lazy import to avoid circular imports at module evaluation time
            const { isAuthenticated } = require('@/lib/auth');
            if (!isPublic && !isAuthenticated()) {
                router.push('/auth/login');
            }
        } catch (e) {
            // If import fails, don't block rendering — fail open.
            console.warn('Auth check failed', e);
        }
    }, [isMounted, pathname, router]);

    // Hide sidebar on login and auth pages
    const hideSidebar = pathname === '/' || pathname.startsWith('/auth');

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            {isMounted && !hideSidebar && (
                <Sidebar
                    isSidebarCollapsed={isSidebarCollapsed}
                    setIsSidebarCollapsed={setIsSidebarCollapsed}
                />
            )}

            <main className={`flex-1 overflow-auto transition-all duration-300 ${
                !hideSidebar && !isSidebarCollapsed 
                    ? 'md:ml-64'
                    : !hideSidebar && isSidebarCollapsed
                    ? 'md:ml-20'
                    : ''
            }`}>
                <Header />
                {children}
            </main>
        </div>
    );
}
