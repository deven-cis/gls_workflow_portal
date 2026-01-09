import React, { useState } from 'react';
import DocumentUpload from '@/components/task_details/task/DocumentUpload';
import { Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import ConfirmModal from '@/components/common/ConfirmModal';

export default function AttorneyOrders({
    attorneySections,
    handleAddAttorneySection,
    handleRemoveAttorneySection,
    handleAttorneyFieldChange,
    handleAttorneyUpload,
    handleRemoveAttorneyDocument,
    handleSaveAttorney,
    handleCancelAttorney,
    expandedAttorney,
    setExpandedAttorney,
    editingAttorney,
    setEditingAttorney
}) {
    const toast = useToast();
    const [pendingChanges, setPendingChanges] = useState({});
    const [confirmModal, setConfirmModal] = useState(null);

    const handleEdit = (sectionId, e) => {
        e.stopPropagation();
        setEditingAttorney(sectionId);
        setExpandedAttorney(sectionId);
        // Store current state as pending changes
        const section = attorneySections.find(s => s.id === sectionId);
        if (section) {
            setPendingChanges({
                ...pendingChanges,
                [sectionId]: {
                    fields: { ...section.fields },
                    documents: [...section.documents]
                }
            });
        }
    };

    const handleSave = (sectionId, e) => {
        e.stopPropagation();
        const section = attorneySections.find(s => s.id === sectionId);
        if (!section) return;

        // Define required fields with their display names
        const requiredFields = [
            { key: 'attorneyName', label: 'Attorney Name' },
            { key: 'firmName', label: 'Firm Name' },
            { key: 'notes', label: 'Notes' },
            { key: 'orderDetails', label: 'Order Details' }
        ];

        // Collect all missing fields
        const missingFields = requiredFields.filter(
            field => !section.fields[field.key]?.trim()
        );

        // If there are missing fields, show toast with dynamic field names
        if (missingFields.length > 0) {
            const fieldNames = missingFields.map(f => f.label).join(', ');
            const message = missingFields.length === 1 
                ? `Please fill the ${fieldNames} field`
                : `Please fill the following fields: ${fieldNames}`;
            toast.error(message);
            return;
        }

        // All fields are filled, proceed with save
        if (handleSaveAttorney) {
            handleSaveAttorney(sectionId);
        }
        setEditingAttorney(null);
        setPendingChanges((prev) => {
            const next = { ...prev };
            delete next[sectionId];
            return next;
        });
        // toast.success('Attorney information saved successfully');
    };

    const handleCancel = (sectionId, e) => {
        e.stopPropagation();
        const pending = pendingChanges[sectionId];
        if (pending) {
            // Restore original field values
            Object.keys(pending.fields).forEach(field => {
                handleAttorneyFieldChange(sectionId, field, pending.fields[field]);
            });
        }
        if (handleCancelAttorney) {
            handleCancelAttorney(sectionId);
        }
        setEditingAttorney(null);
        setPendingChanges((prev) => {
            const next = { ...prev };
            delete next[sectionId];
            return next;
        });
    };

    const toggleExpand = (sectionId) => {
        const section = attorneySections.find(s => s.id === sectionId);
        const isValid = section ? isSectionValid(section) : false;
        
        // If collapsing and all mandatory fields are filled, show complete status
        if (expandedAttorney === sectionId) {
            // Collapsing - check if section is valid
            if (isValid && editingAttorney === sectionId) {
                // All fields are complete, close edit mode to show complete status
                setEditingAttorney(null);
                setPendingChanges((prev) => {
                    const next = { ...prev };
                    delete next[sectionId];
                    return next;
                });
            } else if (editingAttorney === sectionId) {
                // Not complete, just close edit mode
                setEditingAttorney(null);
                setPendingChanges((prev) => {
                    const next = { ...prev };
                    delete next[sectionId];
                    return next;
                });
            }
        }
        setExpandedAttorney(expandedAttorney === sectionId ? null : sectionId);
    };

    const isSectionValid = (section) => {
        return (
            section.fields.attorneyName?.trim() &&
            section.fields.firmName?.trim() &&
            section.fields.notes?.trim() &&
            section.fields.orderDetails?.trim()
        );
    };

    const handleConfirmDelete = () => {
        if (confirmModal) {
            handleRemoveAttorneySection(confirmModal.sectionId);
            setConfirmModal(null);
        }
    };

    return (
        <div className="space-y-6">
            <ConfirmModal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={handleConfirmDelete}
                title="Are you Sure?"
                message={`You want to delete the ${confirmModal?.title?.toLowerCase()} order?`}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h4 className="text-lg font-semibold text-gray-900">Attorney Orders</h4>
                    <p className="text-sm text-gray-500">Document instructions for every attorney involved.</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        // Check if all existing attorneys are completed
                        if (attorneySections.length > 0) {
                            const incompleteSections = attorneySections.filter(section => !isSectionValid(section));
                            
                            if (incompleteSections.length > 0) {
                                // Get display names for incomplete sections
                                const incompleteNames = incompleteSections.map(section => {
                                    return section.fields.attorneyName?.trim() || section.title;
                                });
                                
                                const message = incompleteSections.length === 1
                                    ? `Please complete "${incompleteNames[0]}" before adding another attorney`
                                    : `Please complete all attorneys (${incompleteNames.join(', ')}) before adding another`;
                                
                                toast.warning(message);
                                return;
                            }
                        }
                        handleAddAttorneySection();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                    <span className="text-lg leading-none">+</span>
                    Add Another Attorney
                </button>
            </div>

            <div className="space-y-3">
                {attorneySections.map((section, index) => {
                    const isExpanded = expandedAttorney === section.id;
                    const isEditing = editingAttorney === section.id;
                    const isValid = isSectionValid(section);

                    return (
                        <div key={section.id} className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                            <div
                                className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors"
                                onClick={() => toggleExpand(section.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-gray-900">
                                        {isValid && section.fields.attorneyName?.trim() 
                                            ? section.fields.attorneyName 
                                            : section.title}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isEditing && (
                                        <button
                                            onClick={(e) => handleEdit(section.id, e)}
                                            className="p-1 hover:bg-gray-100 rounded"
                                        >
                                            <Edit3 className="w-4 h-4 text-gray-500" />
                                        </button>
                                    )}
                                    {!isEditing && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const displayTitle = section.fields.attorneyName?.trim() || section.title;
                                                setConfirmModal({
                                                    sectionId: section.id,
                                                    title: displayTitle
                                                });
                                            }}
                                            className="p-1 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </button>
                                    )}
                                    {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className={`border-t border-gray-200 p-4 space-y-5 ${isEditing ? 'bg-white' : 'bg-gray-50'}`}>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Attorney Name <span className="text-red-600">*</span></label>
                                            <input
                                                type="text"
                                                value={section.fields.attorneyName}
                                                onChange={(e) => handleAttorneyFieldChange(section.id, 'attorneyName', e.target.value)}
                                                placeholder="Enter attorney name"
                                                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 ${isEditing ? 'bg-white' : 'bg-gray-50'}`}
                                                disabled={!isEditing}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Firm Name <span className="text-red-600">*</span></label>
                                            <input
                                                type="text"
                                                value={section.fields.firmName}
                                                onChange={(e) => handleAttorneyFieldChange(section.id, 'firmName', e.target.value)}
                                                placeholder="Enter firm name"
                                                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 ${isEditing ? 'bg-white' : 'bg-gray-50'}`}
                                                disabled={!isEditing}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Notes <span className="text-red-600">*</span></label>
                                            <textarea
                                                rows={3}
                                                value={section.fields.notes}
                                                onChange={(e) => handleAttorneyFieldChange(section.id, 'notes', e.target.value)}
                                                placeholder="Enter any notes"
                                                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 ${isEditing ? 'bg-white' : 'bg-gray-50'}`}
                                                disabled={!isEditing}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Order Details <span className="text-red-600">*</span></label>
                                            <textarea
                                                rows={3}
                                                value={section.fields.orderDetails}
                                                onChange={(e) => handleAttorneyFieldChange(section.id, 'orderDetails', e.target.value)}
                                                placeholder="Enter order details"
                                                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 ${isEditing ? 'bg-white' : 'bg-gray-50'}`}
                                                disabled={!isEditing}
                                            />
                                        </div>
                                    </div>

                                    <DocumentUpload
                                        title="Upload your business card or drag & drop"
                                        description="DOCX or PDF formats, up to 5MB."
                                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        onUpload={(file) => handleAttorneyUpload(section.id, file)}
                                        documents={section.documents}
                                        onRemoveDocument={(documentId) => handleRemoveAttorneyDocument(section.id, documentId)}
                                        disabled={!isEditing}
                                    />

                                    {isEditing && (
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={(e) => handleCancel(section.id, e)}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleSave(section.id, e)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                            >
                                                {section?.backendId ? 'Update' : 'Save'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
