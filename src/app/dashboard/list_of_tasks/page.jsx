import { Suspense } from 'react';
import MyTasks from '@/components/list_of_tasks/my_task.jsx';

export default function MyTasksPage() {
        return (
            <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            }>
                <MyTasks />
            </Suspense>
        );
}

