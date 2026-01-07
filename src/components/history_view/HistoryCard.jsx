"use client";
import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Video, MoreVertical, Pencil } from 'lucide-react';

const HistoryCard = ({ item, onClick, activeTab }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    // Show menu for both completed and cancelled jobs
    const showMenuButton = activeTab === 'completed' || activeTab === 'cancelled';

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-4">
                {/* Left: Date & Time */}
                <div className="flex-shrink-0 text-sm">
                    <div className="text-gray-600">{item.date}</div>
                    <div className="text-gray-900 font-medium">{item.time}</div>
                </div>

                {/* Center: Details */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 font-semibold mb-2">
                        {item.title}
                    </h3>
                    {item.isVirtual ? (
                        <div className="flex items-center gap-1.5 text-blue-600 text-sm">
                            <Video size={16} />
                            <span>Zoom</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                            <MapPin size={16} />
                            <span>{item.location}</span>
                        </div>
                    )}
                </div>

                {/* Right: Status & Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-gray-400 text-sm px-3 py-1 bg-gray-100 rounded-full">{item.jobId}</span>
                    <div className={`text-xs px-3 py-1 rounded-full font-medium ${item.status === 'Completed'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                        }`}>
                        {item.status}
                    </div>
                    {showMenuButton && (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                            >
                                <MoreVertical size={20} />
                            </button>

                            {/* Dropdown Menu */}
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowMenu(false);
                                            onClick(item);
                                        }}
                                        className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                    >
                                        <Pencil size={16} />
                                        View
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryCard;

