"use client";
import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { getInitials } from '@/lib/utils';

export default function ReassignmentModal({ isOpen, onClose, onConfirm, selectedAssignee, isLoading }) {
    const [reason, setReason] = useState('');
    const [showError, setShowError] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!reason.trim()) {
            setShowError(true);
            return;
        }
        onConfirm(reason.trim());
        setShowError(false);
    };

    const handleClose = () => {
        setReason('');
        setShowError(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">Confirm Reassignment</h3>
                        <p className="text-sm text-gray-600 mt-1">Please add details of reassignment.</p>
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 pb-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Reassign to</label>
                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                            {selectedAssignee?.avatar_url ? (
                                <img src={selectedAssignee.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                    <span className="text-sm font-medium text-amber-700">
                                        {getInitials(selectedAssignee?.name || '')}
                                    </span>
                                </div>
                            )}
                            <span className="text-sm font-medium text-gray-900">{selectedAssignee?.name || 'Unknown'}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (e.target.value.trim()) setShowError(false);
                            }}
                            placeholder="Enter details of reassignment"
                            rows={4}
                            className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 resize-none ${
                                showError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'
                            }`}
                        />
                        {showError && <p className="mt-1 text-sm text-red-500">Reason is required</p>}
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-700">This job will be reassigned and removed from your queue.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-center gap-3 p-6 pt-4">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="px-6 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                        {isLoading ? 'Reassigning...' : 'Reassign'}
                    </button>
                </div>
            </div>
        </div>
    );
}
