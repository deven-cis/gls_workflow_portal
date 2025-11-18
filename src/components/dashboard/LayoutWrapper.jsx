"use client";

import { useState } from "react";
import Sidebar from './Sidebar';

export default function LayoutWrapper({ children }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            <Sidebar
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
            />

            <main className={`flex-1 overflow-auto transition-all duration-300 ${
                isSidebarCollapsed 
                    ? 'md:ml-20' 
                    : 'md:ml-64'
            }`}>
                {children}
            </main>
        </div>
    );
}
