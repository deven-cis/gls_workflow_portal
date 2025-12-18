import React, { useState, useEffect } from 'react';
import { Edit3 } from 'lucide-react';

export default function CaseDetails({ 
    formData, 
    editingCase, 
    handleEditCase, 
    handleSaveCase, 
    handleCancelCase 
}) {
    const [localFormData, setLocalFormData] = useState({
        caseName: formData.caseName || '',
        caseNumber: formData.caseNumber || ''
    });

    // Update local state when formData prop changes (e.g., after cancel)
    useEffect(() => {
        setLocalFormData({
            caseName: formData.caseName || '',
            caseNumber: formData.caseNumber || ''
        });
    }, [formData]);

    const handleInputChange = (field, value) => {
        setLocalFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        handleSaveCase(localFormData);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end">
                {!editingCase && (
                    <button
                        onClick={handleEditCase}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Edit case details"
                    >
                        <Edit3 className="w-4 h-4 text-gray-500" />
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Case Name <span className="text-red-600">*</span>
                    </label>
                    <input
                        type="text"
                        value={localFormData.caseName}
                        onChange={(e) => handleInputChange('caseName', e.target.value)}
                        disabled={!editingCase}
                        className={`w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:border-gray-300 outline-none ${
                            !editingCase ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                        placeholder=""
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Case Number <span className="text-red-600">*</span>
                    </label>
                    <input
                        type="number"
                        value={localFormData.caseNumber}
                        onChange={(e) => handleInputChange('caseNumber', e.target.value)}
                        disabled={!editingCase}
                        className={`w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:border-gray-300 outline-none ${
                            !editingCase ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                        placeholder=""
                    />
                </div>
            </div>
            {editingCase && (
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleCancelCase}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        Update
                    </button>
                </div>
            )}
        </div>
    );
}
