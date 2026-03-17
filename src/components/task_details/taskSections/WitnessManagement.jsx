import React, { useMemo, useState } from 'react';
import TimeInput from '@/components/task_details/task/TimeInput';
import AddActionButton from '@/components/task_details/task/AddActionButton';
import { Trash2, Edit3, ChevronDown, ChevronUp, Clock, Download } from 'lucide-react';
import { witnessesAPI } from '@/services/witnesses_apis';

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
    onCancelWitness,
    handleCancelWitness,
    savingWitnessIds,
    loadingWitnessIds,
    isLoadingWitnessData,
    toast,
    jobId
}) {
    const [pendingRename, setPendingRename] = useState({});
    const [confirmModal, setConfirmModal] = useState(null); // { type: 'witness'|'record', witnessId, recordId }
    const [templateOpen, setTemplateOpen] = useState({});
    const [downloadingCompleteVideo, setDownloadingCompleteVideo] = useState({}); // Track downloading state per witness: { witnessId: boolean }
    const handleCancel = onCancelWitnesses || (() => {});
    const handleSave = onSaveWitnesses || (() => {});
    const handleSaveSingle = onSaveWitness || (() => {});
    const handleCancelSingle = onCancelWitness || (() => {});
    

    console.log("witnessRecords------", witnessRecords)

    const handleDownloadCompleteVideo = async (e, witnessId, witnessName) => {
        e.preventDefault();
        e.stopPropagation();
        if (!jobId) {
            toast?.error?.('Job ID not available');
            return;
        }
        if (!witnessId) {
            toast?.error?.('Witness ID not available');
            return;
        }
        try {
            setDownloadingCompleteVideo((prev) => ({ ...prev, [witnessId]: true }));
            await witnessesAPI.downloadWitnessesCompleteVideo(Number(jobId), Number(witnessId), witnessName);
            // Wait a bit to ensure the browser download dialog appears before showing success message
            await new Promise(resolve => setTimeout(resolve, 300));
            toast?.success?.('Complete video downloaded successfully');
        } catch (err) {
            console.error('Failed to download complete video:', err);
            toast?.error?.(err?.message || 'Failed to download complete video. Please try again.');
        } finally {
            setDownloadingCompleteVideo((prev) => ({ ...prev, [witnessId]: false }));
        }
    };

    const notifyError = (message) => {
        if (toast?.error) toast.error(message);
        else console.error(message);
    };

    const formatMB = (bytes) => {
        if (bytes == null) return '';
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        try {
            const date = new Date(iso);
            // Format as "YYYY-MM-DD HH:MM"
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return '';
        }
    };

    const formatDuration = (seconds) => {
        if (!Number.isFinite(seconds) || seconds <= 0) return '';
        const total = Math.floor(seconds);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    const validateTemplate = (witnessId, witnessName) => {
        const t = witnessTemplates[witnessId] || {};
        const checks = [
            { key: 'readOnText', label: 'Read on text', value: t.readOnText },
            { key: 'readOnTime', label: 'Read on time', value: t.readOnTime },
            { key: 'readOffText', label: 'Read off text', value: t.readOffText },
            { key: 'readOffTime', label: 'Read off time', value: t.readOffTime },
        ];
        for (const c of checks) {
            const v = (c.value ?? '').toString().trim();
            if (!v) {
                notifyError(`${witnessName}: ${c.label} is required`);
                return false;
            }
        }
        return true;
    };

    const validateRecords = (witnessId, witnessName) => {
        const records = witnessRecords[witnessId] || [];
        for (let idx = 0; idx < records.length; idx++) {
            const r = records[idx] || {};
            const partLabel = `${witnessName} - Part ${idx + 1}`;
            
            // Skip records marked for deletion
            if (r._markedForDeletion) continue;
            
            // Check if video exists - must be truthy and have at least one of: file, name, or filePath
            const hasVideo = !!(r.video && (r.video.file || r.video.name || r.video.filePath));
            const startTime = (r.startTime ?? '').toString().trim();
            const endTime = (r.endTime ?? '').toString().trim();
            const hasTimes = !!(startTime && endTime && startTime !== '--:--' && endTime !== '--:--');
            
            // If record has no video and no times, it's an empty record - prevent saving
            if (!hasVideo && !hasTimes) {
                notifyError(`${partLabel}: Either add a video with times, or remove this record`);
                return false;
            }
            
            // If video exists, times are required (and must not be placeholder)
            if (hasVideo) {
                if (!startTime || startTime === '--:--') {
                    notifyError(`${partLabel}: Start Time is required when video is added`);
                    return false;
                }
                if (!endTime || endTime === '--:--') {
                    notifyError(`${partLabel}: End Time is required when video is added`);
                return false;
                }
            }
        }
        return true;
    };

    const collapseTemplate = (id) => {
        setTemplateOpen((prev) => ({ ...prev, [id]: false }));
        setExpandedWitness((prev) => (prev === id ? null : prev));
    };

    const toggleModal = (payload) => setConfirmModal(payload);

    const confirmDelete = async () => {
        if (!confirmModal) return;
        if (confirmModal.type === 'witness') {
            await handleDeleteWitness(confirmModal.witnessId);
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
            
            {isLoadingWitnessData && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-gray-700">Loading witness data...</span>
                    </div>
                </div>
            )}
            
            {addingWitness ? (
                <div className="border border-blue-500 rounded-lg px-3 py-2 bg-white flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                        type="text"
                        value={newWitnessName}
                        onChange={(e) => setNewWitnessName(e.target.value)}
                        placeholder="Witness name"
                        className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 shrink-0">
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

            {witnesses.length > 0 && (
                <div className="space-y-3">
                    {witnesses.map((witness) => (
                        <div key={witness.id} className="border border-gray-300 rounded-lg overflow-hidden bg-white relative">
                            {loadingWitnessIds?.has?.(witness.id) && (
                                <div className="absolute inset-0 bg-black/5 flex items-center justify-center rounded-lg z-10 pointer-events-none">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-medium text-gray-700">Loading videos...</span>
                                    </div>
                                </div>
                            )}
                            {savingWitnessIds?.has?.(witness.id) && (
                                <div className="absolute inset-0 bg-black/5 flex items-center justify-center rounded-lg z-10 pointer-events-auto">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-medium text-gray-700">Saving...</span>
                                    </div>
                                </div>
                            )}
                            <div
                                className={`px-4 py-3 flex items-center justify-between transition-colors ${loadingWitnessIds?.has?.(witness.id) || savingWitnessIds?.has?.(witness.id) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'}`}
                                onClick={(e) => {
                                    // Don't allow expanding while loading or saving
                                    if (loadingWitnessIds?.has?.(witness.id) || savingWitnessIds?.has?.(witness.id)) {
                                        return;
                                    }
                                    // Ignore clicks on buttons and interactive elements
                                    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) {
                                        return;
                                    }
                                    const next = expandedWitness === witness.id ? null : witness.id;
                                    setExpandedWitness(next);
                                    if (next) {
                                        setTemplateOpen((prev) => ({ ...prev, [witness.id]: prev[witness.id] ?? true }));
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2 min-w-0">
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
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const ok = await handleRenameWitness(
                                                        witness.id,
                                                        pendingRename[witness.id]?.value ?? ''
                                                    );
                                                    if (!ok) return;
                                                    setPendingRename((prev) => ({
                                                        ...prev,
                                                        [witness.id]: { editing: false, value: witness.name }
                                                    }));
                                                }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm font-semibold text-gray-900 truncate">{witness.name}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPendingRename((prev) => ({
                                                        ...prev,
                                                        [witness.id]: { editing: true, value: witness.name }
                                                    }));
                                                }}
                                                className="p-1 hover:bg-gray-100 rounded"
                                                aria-label="Edit witness name"
                                            >
                                                <Edit3 className="w-4 h-4 text-gray-500" />
                                            </button>
                                            {(() => {
                                                const uploadedCount = (witnessRecords[witness.id] || []).filter(r => r.video).length;
                                                const label =
                                                    uploadedCount === 0
                                                        ? '0 Recordings Uploaded'
                                                        : `${uploadedCount}/5 Recordings Uploaded`;
                                                const isFull = uploadedCount >= 5;
                                                return (
                                                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 whitespace-nowrap">
                                                        {isFull && <span className="w-2 h-2 rounded-full bg-green-500" />}
                                                        {label}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {(() => {
                                        const allRecords = (witnessRecords[witness.id] || []);
                                        const isProcessing = savingWitnessIds?.has?.(witness.id) || loadingWitnessIds?.has?.(witness.id);
                                        
                                        const videoRecords = allRecords.filter(r => r.video);
                                        
                                        const allVideosSaved = videoRecords.length === 5 && 
                                            videoRecords.every(r => !!r.backendId && !r.video?.file);
                                        
                                        if (!allVideosSaved || isProcessing) return null;
                                        
                                        return (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleDownloadCompleteVideo(e, witness.id, witness.name);
                                                }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                disabled={downloadingCompleteVideo[witness.id]}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Download className="w-4 h-4 text-gray-500" />
                                                {downloadingCompleteVideo[witness.id] ? 'Downloading...' : 'Download complete video'}
                                            </button>
                                        );
                                    })()}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleModal({ type: 'witness', witnessId: witness.id });
                                        }}
                                        disabled={loadingWitnessIds?.has?.(witness.id) || savingWitnessIds?.has?.(witness.id)}
                                        className="p-1.5 rounded-md border border-red-100 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Delete witness"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                    {expandedWitness === witness.id ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {expandedWitness === witness.id && (
                                <div className={`border-t border-gray-200 p-4 bg-gray-50 space-y-6 ${savingWitnessIds?.has?.(witness.id) ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                        <button
                                            type="button"
                                            disabled={savingWitnessIds?.has?.(witness.id)}
                                            className="w-full grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={() =>
                                                setTemplateOpen((prev) => ({
                                                    ...prev,
                                                    [witness.id]: !(prev[witness.id] ?? true)
                                                }))
                                            }
                                        >
                                            <span aria-hidden="true" />
                                            <span className="justify-self-center">Read on/off Template</span>
                                            <span className="justify-self-end">
                                                {(templateOpen[witness.id] ?? true) ? (
                                                    <ChevronUp className="w-4 h-4 text-gray-500" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                                )}
                                            </span>
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
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <h5 className="text-sm font-semibold text-gray-900 truncate">
                                                        {witness.name} - Part {idx + 1}
                                                    </h5>
                                                    {/* Show special badge for large files with duration, otherwise show duration badge for small files */}
                                                    {record?.video?.isLargeFile && !!record?.video?.durationSeconds ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 whitespace-nowrap">
                                                            <Clock className="w-3 h-3 text-yellow-600" />
                                                            {formatDuration(record.video.durationSeconds)}
                                                        </span>
                                                    ) : !!record?.video?.durationSeconds && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 whitespace-nowrap">
                                                            <Clock className="w-3 h-3 text-gray-500" />
                                                            {formatDuration(record.video.durationSeconds)}
                                                        </span>
                                                    )}
                                                </div>
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

                                            {record.video ? (
                                                <div className="flex items-center justify-between gap-4 border border-gray-200 rounded-lg px-4 py-3 mb-4">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">{record.video.name}</p>
                                                            {/* Only show size for small files, not for large files */}
                                                            {!record?.video?.isLargeFile && (
                                                                <p className="text-xs text-gray-500">
                                                                    {formatMB(record.video.size)} {record.video.uploadedAt ? `• ${formatDate(record.video.uploadedAt)}` : ''}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                                        onClick={() => handleUploadVideo(witness.id, record.id, null)}
                                                        aria-label="Remove uploaded video"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="border border-gray-200 rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-700">Upload Video</p>
                                                        <p className="text-xs text-gray-500">MPEG, MP4, or MKV formats.</p>
                                                        </div>
                                                    </div>
                                                    <label className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                                                        Upload
                                                        <input
                                                            type="file"
                                                            accept="video/mpeg,video/mp4,video/x-matroska,.mp4,.mpeg,.mpg,.mkv"
                                                            className="hidden"
                                                            onChange={(e) => handleUploadVideo(witness.id, record.id, e.target.files?.[0])}
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <div className="flex justify-center">
                                        <AddActionButton
                                            label="Add Video"
                                            onClick={() => handleAddRecord(witness.id)}
                                            disabled={(witnessRecords[witness.id] || []).length >= 5 || savingWitnessIds?.has?.(witness.id)}
                                            onDisabledClick={() => {
                                                if (savingWitnessIds?.has?.(witness.id)) {
                                                    notifyError(`${witness.name}: Cannot add videos while saving.`);
                                                } else {
                                                    notifyError(`${witness.name}: You can add maximum 5 videos (no more than 5).`);
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Restore deleted videos on cancel
                                                if (handleCancelWitness) {
                                                    handleCancelWitness(witness.id);
                                                }
                                                collapseTemplate(witness.id);
                                                handleCancelSingle(witness.id);
                                            }}
                                            disabled={savingWitnessIds?.has?.(witness.id)}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const okTemplate = validateTemplate(witness.id, witness.name);
                                                if (!okTemplate) return;
                                                const okRecords = validateRecords(witness.id, witness.name);
                                                if (!okRecords) return;

                                                collapseTemplate(witness.id);
                                                handleSaveSingle(witness.id, {
                                                    template: witnessTemplates[witness.id],
                                                    records: witnessRecords[witness.id] || []
                                                });
                                            }}
                                            disabled={savingWitnessIds?.has?.(witness.id)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {savingWitnessIds?.has?.(witness.id) ? (
                                                <>
                                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                    Saving...
                                                </>
                                            ) : (
                                                'Save'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
