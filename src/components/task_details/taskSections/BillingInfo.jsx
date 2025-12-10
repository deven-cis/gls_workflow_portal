import React from 'react';
import ToggleOption from '@/components/task_details/task/ToggleOption';
import IconInput from '@/components/task_details/task/IconInput';
import DocumentUpload from '@/components/task_details/task/DocumentUpload';

export default function BillingInfo({ billingInfo, handleBillingToggle, handleBillingInputChange, handleBillingUpload, handleBillingDocumentRemove }) {
    return (
        <div className="space-y-6">
            <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div>
                    <p className="text-base font-semibold text-gray-900">Billing</p>
                    <p className="text-sm text-gray-500">Capture the billing scenario and any related notes.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <ToggleOption
                        label="Cancel En Route"
                        description="Job canceled while en route."
                        value={billingInfo.cancelEnRoute}
                        onChange={() => handleBillingToggle('cancelEnRoute')}
                    />
                    <ToggleOption
                        label="Cancel Setup"
                        description="Job canceled after setup began."
                        value={billingInfo.cancelSetup}
                        onChange={() => handleBillingToggle('cancelSetup')}
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Billing Notes</label>
                    <textarea
                        rows={4}
                        value={billingInfo.notes}
                        onChange={(e) => handleBillingInputChange('notes', e.target.value)}
                        placeholder="Enter any billing notes"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>
                <div>
                    <p className="text-base font-semibold text-gray-900">Videographer Hours</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <IconInput
                            label="Hours videographer was present"
                            placeholder="Enter hours"
                            value={billingInfo.videographerHours}
                            onChange={(value) => handleBillingInputChange('videographerHours', value)}
                            type="number"
                            icon={undefined}
                        />
                        <IconInput
                            label="Hours length of files"
                            placeholder="Enter hours"
                            value={billingInfo.fileLengthHours}
                            onChange={(value) => handleBillingInputChange('fileLengthHours', value)}
                            type="number"
                            icon={undefined}
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
            />
        </div>
    );
}
