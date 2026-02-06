import React, { useState } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import ToggleOption from '@/components/task_details/task/ToggleOption';
import IconInput from '@/components/task_details/task/IconInput';
import DocumentUpload from '@/components/task_details/task/DocumentUpload';
import CameraCapture from '@/components/task_details/task/CameraCapture';
import ConfirmModal from '@/components/common/ConfirmModal';

export default function BillingInfo({ 
    billingInfo, 
    handleBillingToggle, 
    handleBillingInputChange, 
    handleBillingUpload, 
    handleBillingDocumentRemove,
    handleBillingCameraCapture,
    handleRemoveBillingCameraCapture,
    editingBilling,
    handleEditBilling,
    handleSaveBilling,
    handleCancelBilling,
    handleDeleteBilling,
    billingId
}) {
    const [confirmModal, setConfirmModal] = useState(null);

    const handleConfirmDelete = () => {
        if (handleDeleteBilling) {
            handleDeleteBilling();
        }
        setConfirmModal(null);
    };

    return (
        <div className="space-y-6">
            <ConfirmModal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={handleConfirmDelete}
                title="Are you Sure?"
                message="You want to delete the billing information? A new empty form will be created."
            />
            <div className={`space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${!editingBilling ? 'opacity-80' : ''}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-base font-semibold text-gray-900">Billing</p>
                        <p className="text-sm text-gray-500">Capture the billing scenario and any related notes.</p>
                    </div>
                    {/* Only show Edit/Delete buttons when billing exists (billingId) */}
                    {billingId && (
                        <div className="flex items-center gap-2">
                            {!editingBilling && (
                                <button
                                    onClick={handleEditBilling}
                                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                                    title="Edit billing information"
                                >
                                    <Edit3 className="w-4 h-4 text-gray-500" />
                                </button>
                            )}
                            <button
                                onClick={() => setConfirmModal({ open: true })}
                                className="p-2 hover:bg-red-50 rounded transition-colors"
                                title="Delete billing information"
                            >
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <ToggleOption
                        label="Cancel En Route"
                        description="Job canceled while en route."
                        value={billingInfo.cancelEnRoute}
                        onChange={() => handleBillingToggle('cancelEnRoute')}
                        disabled={!editingBilling}
                    />
                    <ToggleOption
                        label="Cancel Setup"
                        description="Job canceled after setup began."
                        value={billingInfo.cancelSetup}
                        onChange={() => handleBillingToggle('cancelSetup')}
                        disabled={!editingBilling}
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Billing Notes</label>
                    <textarea
                        rows={4}
                        value={billingInfo.notes}
                        onChange={(e) => handleBillingInputChange('notes', e.target.value)}
                        placeholder="Enter any billing notes"
                        disabled={!editingBilling}
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                            !editingBilling ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                    />
                </div>
                <div>
                    <p className="text-base font-semibold text-gray-900">Videographer Hours</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <IconInput
                            label="Hours videographer was present"
                            placeholder="Enter hours (e.g. 4hrs)"
                            value={billingInfo.videographerHours}
                            onChange={(value) => handleBillingInputChange('videographerHours', value)}
                            icon={undefined}
                            disabled={!editingBilling}
                        />
                        <IconInput
                            label="Hours length of files"
                            placeholder="Enter hours (e.g. 8hrs)"
                            value={billingInfo.fileLengthHours}
                            onChange={(value) => handleBillingInputChange('fileLengthHours', value)}
                            icon={undefined}
                            disabled={!editingBilling}
                        />
                    </div>
                </div>
            </div>

            <DocumentUpload
                title="Upload your additional document or drag & drop"
                description="DOCX or PDF formats, up to 5MB."
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onUpload={handleBillingUpload}
                documents={billingInfo.documents}
                onRemoveDocument={handleBillingDocumentRemove}
                disabled={!editingBilling}
                multiple={true}
                twoColumnLayout={true}
            />

            <CameraCapture
                onCapture={handleBillingCameraCapture}
                onRemove={handleRemoveBillingCameraCapture}
                capturedImage={billingInfo.cameraCapture}
                disabled={!editingBilling}
                modelName="Billing Camera Image"
            />

            {editingBilling && (
                <div className="flex justify-end gap-3 pt-2">
                    {handleCancelBilling && (
                        <button
                            type="button"
                            onClick={handleCancelBilling}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSaveBilling}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        {billingId ? 'Update' : 'Save'}
                    </button>
                </div>
            )}
        </div>
    );
}
