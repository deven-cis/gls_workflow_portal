import React, { useMemo, useState } from 'react';
import TimeInput from '@/components/task_details/task/TimeInput';
import AddActionButton from '@/components/task_details/task/AddActionButton';
import { Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';

export default function WitnessManagement({
    witnesses,
    addingWitness,
    newWitnessName,
    setAddingWitness,
    setNewWitnessName,
    expandedWitness,
    setExpandedWitness,
    witnessRecords,
    witnessTemplates,
    handleAddWitness,
    handleDeleteWitness,
    handleAddRecord,
    handleUpdateRecord,
    handleUploadVideo,
    handleDeleteRecord,
    handleUpdateTemplate,
    handleRenameWitness,
    onSaveWitnesses,
    onCancelWitnesses,
    onSaveWitness,
    onCancelWitness
}) {
    const [pendingRename, setPendingRename] = useState({});
    const [confirmModal, setConfirmModal] = useState(null); // { type: 'witness'|'record', witnessId, recordId }
    const [templateOpen, setTemplateOpen] = useState({});
    const handleCancel = onCancelWitnesses || (() => {});
    const handleSave = onSaveWitnesses || (() => {});
    const handleSaveSingle = onSaveWitness || (() => {});
    const handleCancelSingle = onCancelWitness || (() => {});

    const collapseTemplate = (id) => {
        setTemplateOpen((prev) => ({ ...prev, [id]: false }));
        setExpandedWitness((prev) => (prev === id ? null : prev));
    };

    const toggleModal = (payload) => setConfirmModal(payload);

    const confirmDelete = () => {
        if (!confirmModal) return;
        if (confirmModal.type === 'witness') {
            handleDeleteWitness(confirmModal.witnessId);
        } else if (confirmModal.type === 'record') {
            handleDeleteRecord(confirmModal.witnessId, confirmModal.recordId);
        }
        setConfirmModal(null);
    };

    const renderConfirmModal = () => {
        if (!confirmModal) return null;
        const isWitness = confirmModal.type === 'witness';
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                            <span className="text-red-600 text-lg">!</span>
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-gray-900">
                                {isWitness ? 'Delete Witness?' : 'Delete Recording?'}
                            </h4>
                            <p className="text-sm text-gray-600">
                                {isWitness
                                    ? 'You want to delete this witness?'
                                    : 'You want to delete this recording?'}
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            className="px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            onClick={() => setConfirmModal(null)}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                            onClick={confirmDelete}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 relative">
            {renderConfirmModal()}
            {witnesses.length > 0 && (
                <div className="space-y-3">
                    {witnesses.map((witness) => (
                        <div key={witness.id} className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                            <div
                                className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                    const next = expandedWitness === witness.id ? null : witness.id;
                                    setExpandedWitness(next);
                                    if (next) {
                                        setTemplateOpen((prev) => ({ ...prev, [witness.id]: prev[witness.id] ?? true }));
                                    }
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    {pendingRename[witness.id]?.editing ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                className="text-sm px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                                                value={pendingRename[witness.id]?.value || ''}
                                                onChange={(e) =>
                                                    setPendingRename((prev) => ({
                                                        ...prev,
                                                        [witness.id]: { editing: true, value: e.target.value }
                                                    }))
                                                }
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPendingRename((prev) => ({ ...prev, [witness.id]: { editing: false, value: witness.name } }));
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="text-xs text-blue-600 font-semibold hover:text-blue-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRenameWitness(witness.id, pendingRename[witness.id]?.value || witness.name);
                                                    setPendingRename((prev) => ({ ...prev, [witness.id]: { editing: false, value: witness.name } }));
                                                }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-sm font-semibold text-gray-900">{witness.name}</span>
                                            <span className="text-xs text-gray-500">
                                                {`${(witnessRecords[witness.id] || []).filter(r => r.video).length}/${(witnessRecords[witness.id] || []).length || 0} Recordings Uploaded`}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingRename((prev) => ({
                                                ...prev,
                                                [witness.id]: { editing: true, value: witness.name }
                                            }));
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded"
                                    >
                                        <Edit3 className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleModal({ type: 'witness', witnessId: witness.id });
                                        }}
                                        className="p-1 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                    <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">Download complete video</button>
                                    {expandedWitness === witness.id ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {expandedWitness === witness.id && (
                                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-6">
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                                            onClick={() =>
                                                setTemplateOpen((prev) => ({
                                                    ...prev,
                                                    [witness.id]: !(prev[witness.id] ?? true)
                                                }))
                                            }
                                        >
                                            <span>Read on/off Template</span>
                                            {(templateOpen[witness.id] ?? true) ? (
                                                <ChevronUp className="w-4 h-4 text-gray-500" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-500" />
                                            )}
                                        </button>
                                        {(templateOpen[witness.id] ?? true) && (
                                            <div className="p-4 space-y-4 border-t border-gray-200">
                                                <div className="mb-4">
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                        Read on text <span className="text-red-600">*</span>
                                                    </label>
                                                    <textarea
                                                        value={witnessTemplates[witness.id]?.readOnText || ''}
                                                        onChange={(e) => handleUpdateTemplate(witness.id, 'readOnText', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        rows="3"
                                                    />
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                        Read on time <span className="text-red-600">*</span>
                                                    </label>
                                                    <TimeInput
                                                        value={witnessTemplates[witness.id]?.readOnTime}
                                                        onChange={(newValue) => handleUpdateTemplate(witness.id, 'readOnTime', newValue)}
                                                    />
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                        Read off text <span className="text-red-600">*</span>
                                                    </label>
                                                    <textarea
                                                        value={witnessTemplates[witness.id]?.readOffText || ''}
                                                        onChange={(e) => handleUpdateTemplate(witness.id, 'readOffText', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        rows="3"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                        Read off time <span className="text-red-600">*</span>
                                                    </label>
                                                    <TimeInput
                                                        value={witnessTemplates[witness.id]?.readOffTime}
                                                        onChange={(newValue) => handleUpdateTemplate(witness.id, 'readOffTime', newValue)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {witnessRecords[witness.id]?.map((record, idx) => (
                                        <div key={record.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                            <div className="flex items-center justify-between mb-4">
                                                <h5 className="text-sm font-semibold text-gray-900">
                                                    {witness.name} - Part {idx + 1}
                                                </h5>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleModal({ type: 'record', witnessId: witness.id, recordId: record.id })}
                                                    className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                        Start Time <span className="text-red-600">*</span>
                                                    </label>
                                                    <TimeInput
                                                        value={record.startTime}
                                                        onChange={(newValue) => handleUpdateRecord(witness.id, record.id, 'startTime', newValue)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                        End Time <span className="text-red-600">*</span>
                                                    </label>
                                                    <TimeInput
                                                        value={record.endTime}
                                                        onChange={(newValue) => handleUpdateRecord(witness.id, record.id, 'endTime', newValue)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Upload Video</p>
                                                        <p className="text-xs text-gray-500">MPEG or MP4 formats.</p>
                                                        {record.video && (
                                                            <p className="text-xs text-gray-600 mt-1">{record.video.name}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <label className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                                                    Upload
                                                    <input
                                                        type="file"
                                                        accept="video/mpeg,video/mp4"
                                                        className="hidden"
                                                        onChange={(e) => handleUploadVideo(witness.id, record.id, e.target.files?.[0])}
                                                    />
                                                </label>
                                            </div>

                                            {record.video && (
                                                <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4">
                                                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm10 12H4v-2h10v2z" />
                                                    </svg>
                                                    <span className="text-sm text-gray-700">{record.video.name} ({(record.video.size / (1024 * 1024)).toFixed(1)} MB)</span>
                                                    <span className="text-xs text-green-600 ml-auto">Ready</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <AddActionButton
                                        label="Add Video"
                                        onClick={() => handleAddRecord(witness.id)}
                                        disabled={(witnessRecords[witness.id] || []).length >= 5}
                                    />

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                collapseTemplate(witness.id);
                                                handleCancelSingle(witness.id);
                                            }}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                collapseTemplate(witness.id);
                                                handleSaveSingle(witness.id, {
                                                    template: witnessTemplates[witness.id],
                                                    records: witnessRecords[witness.id] || []
                                                });
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {addingWitness ? (
                <div className="border border-blue-400 rounded-lg p-4 bg-blue-50">
                    <input
                        type="text"
                        value={newWitnessName}
                        onChange={(e) => setNewWitnessName(e.target.value)}
                        placeholder="Enter witness name"
                        className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setAddingWitness(false);
                                setNewWitnessName('');
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleAddWitness}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <AddActionButton label="Add Witness" onClick={() => setAddingWitness(true)} />
            )}

        </div>
    );
}
