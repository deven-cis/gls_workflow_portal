import React from 'react';
import CheckboxOption from '@/components/task_details/task/CheckboxOption';
import IconInput from '@/components/task_details/task/IconInput';
import DocumentUpload from '@/components/task_details/task/DocumentUpload';

export default function EquipmentSection({ equipmentInfo, handleEquipmentCheckbox, handleEquipmentInputChange, handleEquipmentUpload, handleEquipmentDocumentRemove }) {
    return (
        <div className="space-y-6">
            <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div>
                    <p className="text-base font-semibold text-gray-900">Equipment & Time</p>
                    <p className="text-sm text-gray-500">Track resources used and any overtime costs.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <CheckboxOption
                        label="Laptop Used"
                        description="Select if a laptop was used on-site."
                        checked={equipmentInfo.laptopUsed}
                        onChange={() => handleEquipmentCheckbox('laptopUsed')}
                    />
                    <CheckboxOption
                        label="PIP Used"
                        description="Select if Picture-in-Picture was used."
                        checked={equipmentInfo.pipUsed}
                        onChange={() => handleEquipmentCheckbox('pipUsed')}
                    />
                    <CheckboxOption
                        label="Exhibit Tech"
                        description="Select if Exhibit Techmode was demonstrated."
                        checked={equipmentInfo.exhibitTech}
                        onChange={() => handleEquipmentCheckbox('exhibitTech')}
                    />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <IconInput
                        label="Parking Cost"
                        placeholder="Enter parking cost"
                        value={equipmentInfo.parkingCost}
                        onChange={(value) => handleEquipmentInputChange('parkingCost', value)}
                        type="number"
                        prefix="$"
                    />
                    <IconInput
                        label="Time After 5PM (hrs)"
                        placeholder="Enter hrs"
                        value={equipmentInfo.timeAfterFive}
                        onChange={(value) => handleEquipmentInputChange('timeAfterFive', value)}
                        type="number"
                    />
                </div>
            </div>

            <DocumentUpload
                title="Upload Your Parking Receipt or drag & drop"
                description="DOCX or PDF formats, up to 5MB."
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onUpload={handleEquipmentUpload}
                documents={equipmentInfo.documents}
                onRemoveDocument={handleEquipmentDocumentRemove}
            />
        </div>
    );
}
