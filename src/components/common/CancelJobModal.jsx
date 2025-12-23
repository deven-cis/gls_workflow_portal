"use client";
import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

const CANCEL_REASONS = [
    'Hearing rescheduled',
    'Witness absent',
    'Attorney absent',
    'Judge Absent'
];

const DEFAULT_REASON = 'Hearing rescheduled';

export default function CancelJobModal({ isOpen, onClose, onConfirm, jobId }) {
    const [selectedReason, setSelectedReason] = useState(DEFAULT_REASON);
    const [details, setDetails] = useState('');
    const [error, setError] = useState('');
    const [detailsError, setDetailsError] = useState('');

    // Reset to default when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedReason(DEFAULT_REASON);
            setDetails('');
            setError('');
            setDetailsError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDetailsChange = (e) => {
        const value = e.target.value;
        setDetails(value);
        // Clear error when user starts typing
        if (detailsError && value.trim()) {
            setDetailsError('');
        }
        // Clear general error too
        if (error) {
            setError('');
        }
    };

    const handleConfirm = () => {
        // Validate reason
        if (!selectedReason) {
            setError('Please select a reason');
            return;
        }
        
        // Validate details
        if (!details.trim()) {
            setDetailsError('Details field is required. Please enter the cancellation details.');
            setError('Details field is required. Please enter the cancellation details.');
            return;
        }
        
        // Clear all errors
        setError('');
        setDetailsError('');
        onConfirm({ reason: selectedReason, details: details.trim() });
        // Reset form
        setSelectedReason(DEFAULT_REASON);
        setDetails('');
    };

    const handleClose = () => {
        setSelectedReason(DEFAULT_REASON);
        setDetails('');
        setError('');
        setDetailsError('');
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-600 text-lg font-bold">i</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            Cancel Job
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Are you sure you want to cancel the job? If yes please add the reason below:
                        </p>
                    </div>
                </div>

                {/* Reason Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                        Reason
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {CANCEL_REASONS.map((reason) => (
                            <button
                                key={reason}
                                onClick={() => {
                                    setSelectedReason(reason);
                                    setError('');
                                }}
                                type="button"
                                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    selectedReason === reason
                                        ? 'bg-gray-800 text-white'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {reason}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Details Input */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                        Details <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={details}
                        onChange={handleDetailsChange}
                        onBlur={() => {
                            if (!details.trim()) {
                                setDetailsError('Details field is required. Please enter the cancellation details.');
                            }
                        }}
                        placeholder="Enter"
                        rows={4}
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 resize-none text-sm text-gray-900 placeholder-gray-400 ${
                            detailsError 
                                ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                    />
                    {detailsError && (
                        <p className="text-sm text-red-600 mt-2">{detailsError}</p>
                    )}
                </div>

                {/* General Error Message */}
                {error && !detailsError && (
                    <p className="text-sm text-red-600 mb-4">{error}</p>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        type="button"
                        className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        type="button"
                        className="px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

