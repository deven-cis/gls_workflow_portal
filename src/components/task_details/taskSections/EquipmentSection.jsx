import React from 'react';
import { Clock, Edit3, Trash2 } from 'lucide-react';
import CheckboxOption from '@/components/task_details/task/CheckboxOption';
import IconInput from '@/components/task_details/task/IconInput';
import DocumentUpload from '@/components/task_details/task/DocumentUpload';
import ConfirmModal from '@/components/common/ConfirmModal';

export default function EquipmentSection({ 
    equipmentInfo, 
    handleEquipmentCheckbox, 
    handleEquipmentInputChange, 
    handleEquipmentUpload, 
    handleEquipmentDocumentRemove,
    editingEquipment,
    handleEditEquipment,
    handleSaveEquipment,
    handleCancelEquipment,
    handleDeleteEquipment,
    equipmentTimeId
}) {
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        handleDeleteEquipment();
        setShowDeleteModal(false);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-base font-semibold text-gray-900">Equipment & Time</p>
                        <p className="text-sm text-gray-500">Track resources used and any overtime costs.</p>
                    </div>
                    {/* Only show Edit/Delete buttons when equipment exists (equipmentTimeId) */}
                    {equipmentTimeId && (
                        <div className="flex items-center gap-2">
                            {!editingEquipment && (
                                <button
                                    onClick={handleEditEquipment}
                                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                                    title="Edit equipment information"
                                >
                                    <Edit3 className="w-4 h-4 text-gray-500" />
                                </button>
                            )}
                            <button
                                onClick={handleDeleteClick}
                                className="p-2 hover:bg-red-50 rounded transition-colors"
                                title="Delete equipment information"
                            >
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <CheckboxOption
                        label="Laptop Used"
                        description="Select if a laptop was used on-site."
                        checked={equipmentInfo.laptopUsed}
                        onChange={() => handleEquipmentCheckbox('laptopUsed')}
                        disabled={!editingEquipment}
                    />
                    <CheckboxOption
                        label="PIP Used"
                        description="Select if Picture-in-Picture was used."
                        checked={equipmentInfo.pipUsed}
                        onChange={() => handleEquipmentCheckbox('pipUsed')}
                        disabled={!editingEquipment}
                    />
                    <CheckboxOption
                        label="Exhibit Tech"
                        description="Select if Exhibit Techmode was demonstrated."
                        checked={equipmentInfo.exhibitTech}
                        onChange={() => handleEquipmentCheckbox('exhibitTech')}
                        disabled={!editingEquipment}
                    />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <IconInput
                        label="Parking Cost"
                        placeholder="Enter parking cost"
                        value={equipmentInfo.parkingCost}
                        onChange={(value) => handleEquipmentInputChange('parkingCost', value)}
                        type="text"
                        prefix="$"
                        disabled={!editingEquipment}
                    />
                    <IconInput
                        label="Time After 5PM (hrs)"
                        placeholder="--:--"
                        value={equipmentInfo.timeAfterFive || ''}
                        onChange={(value) => handleEquipmentInputChange('timeAfterFive', value)}
                        type="time"
                        icon={Clock}
                        disabled={!editingEquipment}
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
                multiple={true}
                twoColumnLayout={true}
                disabled={!editingEquipment}
            />

            {editingEquipment && (
                <div className="flex justify-end gap-3 pt-2">
                    {handleCancelEquipment && (
                        <button
                            type="button"
                            onClick={handleCancelEquipment}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSaveEquipment}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        {equipmentTimeId ? 'Update' : 'Save'}
                    </button>
                </div>
            )}

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Delete Equipment Time"
                message="Are you sure you want to delete this equipment time information? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}
