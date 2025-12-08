import React from 'react';
import DocumentUpload from '@/components/task/DocumentUpload';
import { Trash2 } from 'lucide-react';

export default function AttorneyOrders({
    attorneySections,
    handleAddAttorneySection,
    handleRemoveAttorneySection,
    handleAttorneyFieldChange,
    handleAttorneyUpload,
    handleRemoveAttorneyDocument
}) {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h4 className="text-lg font-semibold text-gray-900">Attorney Orders</h4>
                    <p className="text-sm text-gray-500">Document instructions for every attorney involved.</p>
                </div>
                <button
                    type="button"
                    onClick={handleAddAttorneySection}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                    <span className="text-lg leading-none">+</span>
                    Add Another Attorney
                </button>
            </div>

            <div className="space-y-6">
                {attorneySections.map((section, index) => (
                    <div key={section.id} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-base font-semibold text-gray-900">{section.title}</p>
                                <p className="text-sm text-gray-500">Provide the attorney’s information and special orders.</p>
                            </div>
                            {index > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveAttorneySection(section.id)}
                                    className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Attorney Name</label>
                                <input
                                    type="text"
                                    value={section.fields.attorneyName}
                                    onChange={(e) => handleAttorneyFieldChange(section.id, 'attorneyName', e.target.value)}
                                    placeholder="Enter attorney name"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Firm Name</label>
                                <input
                                    type="text"
                                    value={section.fields.firmName}
                                    onChange={(e) => handleAttorneyFieldChange(section.id, 'firmName', e.target.value)}
                                    placeholder="Enter firm name"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Notes</label>
                                <textarea
                                    rows={3}
                                    value={section.fields.notes}
                                    onChange={(e) => handleAttorneyFieldChange(section.id, 'notes', e.target.value)}
                                    placeholder="Enter any notes"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Order Details</label>
                                <textarea
                                    rows={3}
                                    value={section.fields.orderDetails}
                                    onChange={(e) => handleAttorneyFieldChange(section.id, 'orderDetails', e.target.value)}
                                    placeholder="Enter order details"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
