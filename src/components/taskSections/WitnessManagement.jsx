import React from 'react';
import TimeInput from '@/components/task/TimeInput';
import AddActionButton from '@/components/task/AddActionButton';
import { Trash2 } from 'lucide-react';

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
    handleUpdateTemplate
}) {
    return (
        <div className="space-y-4">
            {witnesses.length > 0 && (
                <div className="space-y-3">
                    {witnesses.map((witness) => (
                        <div key={witness.id} className="border border-gray-300 rounded-lg overflow-hidden">
                            <div
                                onClick={() => setExpandedWitness(expandedWitness === witness.id ? null : witness.id)}
                                className="p-4 bg-white cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-900">{witness.name}</span>
                                    <span className="text-xs text-gray-500">02:45:00</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteWitness(witness.id);
                                        }}
                                        className="p-1 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                    <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">Download complete video</button>
                                </div>
                            </div>

                            {expandedWitness === witness.id && (
                                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-6">
                                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                                        <h5 className="text-sm font-semibold text-gray-900 mb-4">Read on/off Template</h5>
                                        <div className="mb-4">
                                            <label className="block text-xs font-medium text-gray-700 mb-2">Read on text</label>
                                            <textarea
                                                value={witnessTemplates[witness.id]?.readOnText || ''}
                                                onChange={(e) => handleUpdateTemplate(witness.id, 'readOnText', e.target.value)}
                                                className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                rows="3"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-xs font-medium text-gray-700 mb-2">Read on time</label>
                                            <TimeInput
                                                value={witnessTemplates[witness.id]?.readOnTime}
                                                onChange={(newValue) => handleUpdateTemplate(witness.id, 'readOnTime', newValue)}
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-xs font-medium text-gray-700 mb-2">Read off text</label>
                                            <textarea
                                                value={witnessTemplates[witness.id]?.readOffText || ''}
                                                onChange={(e) => handleUpdateTemplate(witness.id, 'readOffText', e.target.value)}
                                                className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                rows="3"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2">Read off time</label>
                                            <TimeInput
                                                value={witnessTemplates[witness.id]?.readOffTime}
                                                onChange={(newValue) => handleUpdateTemplate(witness.id, 'readOffTime', newValue)}
                                            />
                                        </div>
                                    </div>

                                    {witnessRecords[witness.id]?.map((record) => (
                                        <div key={record.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                            <div className="flex items-center justify-between mb-4">
                                                <h5 className="text-sm font-semibold text-gray-900">New Record</h5>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRecord(witness.id, record.id)}
                                                    className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">Start Time</label>
                                                    <TimeInput
                                                        value={record.startTime}
                                                        onChange={(newValue) => handleUpdateRecord(witness.id, record.id, 'startTime', newValue)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">End Time</label>
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

                                    <AddActionButton label="Add Record" onClick={() => handleAddRecord(witness.id)} />
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
