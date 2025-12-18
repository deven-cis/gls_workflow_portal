"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import Header from '@/components/layouts/Header';
import { ToastProvider } from '@/contexts/ToastContext';

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
        // Public routes (no auth required)
        // NOTE: do NOT use startsWith('/') because it would match every route.
        const isPublic =
            pathname === '/' ||
            pathname === '/auth' ||
            pathname === '/auth/login' ||
            pathname?.startsWith('/auth/');
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
    const hideChrome = pathname === '/' || pathname.startsWith('/auth');

    return (
        <ToastProvider>
            <div className="flex h-screen overflow-hidden bg-white">
                {isMounted && !hideChrome && (
                    <Sidebar
                        isSidebarCollapsed={isSidebarCollapsed}
                        setIsSidebarCollapsed={setIsSidebarCollapsed}
                    />
                )}

                <main className={`flex-1 overflow-auto transition-all duration-300 ${
                    !hideChrome && !isSidebarCollapsed 
                        ? 'md:ml-64'
                        : !hideChrome && isSidebarCollapsed
                        ? 'md:ml-20'
                        : ''
                }`}>
                    {!hideChrome && <Header />}
                    {children}
                </main>
            </div>
        </ToastProvider>
    );
}
