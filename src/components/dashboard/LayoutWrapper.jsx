"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from './Sidebar';

export default function LayoutWrapper({ children }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const pathname = usePathname();

    // Hide sidebar on login and auth pages
    const hideSidebar = pathname === '/' || pathname.startsWith('/auth');

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            {!hideSidebar && (
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
                {children}
            </main>
        </div>
    );
}
