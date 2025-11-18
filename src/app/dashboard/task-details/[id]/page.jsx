"use client";
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, MoreVertical, ChevronDown } from 'lucide-react';
import { pendingTasks, upcomingTasks } from '@/components/dashboard/data/tasksData';

export default function TaskDetails() {
    const params = useParams();
    const router = useRouter();
    const taskId = params.id;

    // Find the task from both arrays
    const allTasks = [...pendingTasks, ...upcomingTasks];
    const task = allTasks.find(t => t.id === taskId);

    const handleBack = () => {
        router.push(`/dashboard/my_tasks`);
    };

    if (!task) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Task not found</p>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h1 className="text-lg md:text-xl font-bold text-gray-900">
                            Task Details
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">Sep 24, 2025</span>
                        <span className="text-sm font-medium text-gray-900">10:00 AM</span>
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            JK
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex h-[calc(100vh-73px)]">
                {/* Left Panel - Task Info */}
                <div className="w-full md:w-96 bg-white border-r border-gray-200 p-6 overflow-y-auto">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg">
                            Scheduled
                        </span>
                        <button className="p-1 hover:bg-gray-100 rounded">
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Task Title */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {task.title}
                    </h2>

                    {/* Location and Time */}
                    <div className="space-y-3 mb-6">
                        {task.location && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="w-5 h-5" />
                                <span className="text-sm">{task.location}</span>
                            </div>
                        )}
                        {task.platform && (
                            <div className="flex items-center gap-2 text-blue-600">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.47l-5.894 3.4-5.894-3.4V9.53l5.894-3.4 5.894 3.4v4.94z" />
                                </svg>
                                <span className="text-sm">{task.platform}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-5 h-5" />
                            <span className="text-sm">Today, {task.time}</span>
                        </div>
                    </div>

                    {/* Start Session Button */}
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors mb-6">
                        Start Session
                    </button>

                    {/* Assignee */}
                    <div className="mb-6">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Assignee
                        </label>
                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                                JH
                            </div>
                            <span className="text-sm text-gray-900">Jakir Hossen (me)</span>
                        </div>
                    </div>

                    {/* Activity */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Activity</h3>
                        <p className="text-sm text-gray-500">No activity yet</p>
                    </div>
                </div>

                {/* Right Panel - Case Progress */}
                <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
                    {/* Progress Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Case Progress</h3>
                        <span className="text-sm font-medium text-gray-600">10%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                    </div>

                    {/* Case Steps */}
                    <div className="space-y-3">
                        {[
                            { number: 1, title: 'Case Details', done: false },
                            { number: 2, title: 'Witness Management', done: false },
                            { number: 3, title: 'Attorney Orders', done: false },
                            { number: 4, title: 'Billing Information', done: false },
                            { number: 5, title: 'Equipment & Time', done: false }
                        ].map((step) => (
                            <div
                                key={step.number}
                                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="text-base font-medium text-gray-900">
                                        {step.number}. {step.title}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-3 py-1 rounded-md">
                                            Mark as Done
                                        </button>
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
