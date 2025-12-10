import React from 'react';

export default function CaseDetails({ formData, onChange }) {
    

    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Case Name <span className="text-red-600">*</span>
                </label>
                <input
                    type="text"
                    value={formData.caseName}
                    onChange={(e) => onChange({ ...formData, caseName: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:border-gray-300 outline-none"
                    placeholder="Johnson vs. Smith Deposition"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Case Number <span className="text-red-600">*</span>
                </label>
                <input
                    type="text"
                    value={formData.caseNumber}
                    onChange={(e) => onChange({ ...formData, caseNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:border-gray-300 outline-none"
                    placeholder="72364"
                />
            </div>
        </div>
    );
}
