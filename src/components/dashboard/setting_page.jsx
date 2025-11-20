"use client";

export default function SettingPage() { 
    return (
        <>
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg md:text-xl font-bold text-gray-900">
                            Settings
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            JK
                        </div>
                    </div>
                </div>
            </header>

        </>
    );
}   