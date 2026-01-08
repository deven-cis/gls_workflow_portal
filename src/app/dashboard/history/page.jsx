import { Suspense } from 'react';
import HistoryView from '@/components/history_view/historyView.jsx';

export default async function HistoryPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        }>
            <HistoryView />
        </Suspense>
    );
}
