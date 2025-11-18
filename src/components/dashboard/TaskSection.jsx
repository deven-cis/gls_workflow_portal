"use client";
import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function TaskSection({ title, count, children, defaultExpanded = true }) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="mb-6">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between mb-4 group"
            >
                <div className="flex items-center gap-3">
                    <h2 className="text-sm md:text-xl text-gray-900">{title}</h2>
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                        {count}
                    </span>
                </div>
                <div className="p-1 hover:bg-gray-100 rounded transition-colors">
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                </div>
            </button>
            {isExpanded && (
                <div className="space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
}
