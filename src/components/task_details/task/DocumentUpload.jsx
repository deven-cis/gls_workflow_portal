import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export default function DocumentUpload({
  title,
  description,
  buttonLabel = 'Upload',
  accept,
  onUpload,
  documents = [],
  onRemoveDocument,
  disabled = false,
  multiple = false,
  twoColumnLayout = false
}) {
  const hasDocuments = documents.length > 0;
  const [isDragging, setIsDragging] = useState(false);
  const toast = useToast();

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateFile = (file) => {
    // Validate file type if accept prop is provided
    if (accept) {
      const acceptedTypes = accept.split(',').map(type => type.trim().toLowerCase());
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      const fileType = file.type.toLowerCase();
      
      const isValidType = acceptedTypes.some(acceptedType => {
        if (acceptedType.startsWith('.')) {
          return acceptedType === fileExtension;
        }
        return acceptedType === fileType;
      });

      if (!isValidType) {
        toast.error(`Invalid file type: ${file.name}. Please upload ${accept}`);
        return false;
      }
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast.error(`File size exceeds 5MB limit: ${file.name}. Please upload a file smaller than 5MB.`);
      return false;
    }

    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files && files.length > 0) {
      if (multiple) {
        // Handle multiple files
        const validFiles = files.filter(file => validateFile(file));
        validFiles.forEach(file => onUpload(file));
      } else {
        // Handle single file (only first file)
        const file = files[0];
        if (validateFile(file)) {
          onUpload(file);
        }
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (multiple) {
        // Handle multiple files
        const validFiles = files.filter(file => validateFile(file));
        validFiles.forEach(file => onUpload(file));
      } else {
        // Handle single file (only first file)
        const file = files[0];
        if (validateFile(file)) {
          onUpload(file);
        }
      }
      e.target.value = '';
    }
  };
  
  return (
    <div 
      className={`rounded-xl border-2 p-4 transition-colors ${
        isDragging && !disabled
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-gray-50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Upload area - always show for multiple, or show when no documents for single */}
      {(!hasDocuments || multiple) && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 text-blue-500">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a4 4 0 010 8h-1m-4-4v10m0 0l-3-3m3 3l3-3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </div>
          <label className={`inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition ${
            disabled 
              ? 'cursor-not-allowed bg-gray-100 text-gray-400' 
              : 'cursor-pointer text-gray-700 hover:bg-white'
          }`}>
            {buttonLabel}
            {!disabled && (
              <input
                type="file"
                accept={accept}
                multiple={multiple}
                className="hidden"
                onChange={handleFileSelect}
              />
            )}
          </label>
        </div>
      )}
      {/* Documents list - show when documents exist */}
      {hasDocuments && (
        <div className={twoColumnLayout ? 'grid gap-3 md:grid-cols-2' : 'space-y-3'}>
          {documents.map((document) => {
            const extension = document.name.split('.').pop()?.toUpperCase() || 'DOC';
            let fileDate = '';
            if (document.uploadedAt) {
              fileDate = new Date(document.uploadedAt).toISOString().split('T')[0];
            } else if (document.id && typeof document.id === 'string' && document.id.includes('-')) {
              // Try to extract date from ID if it contains timestamp
              const timestamp = parseInt(document.id.split('-').pop());
              if (!isNaN(timestamp)) {
                fileDate = new Date(timestamp).toISOString().split('T')[0];
              }
            }
            if (!fileDate) {
              fileDate = new Date().toISOString().split('T')[0];
            }
            return (
              <div key={document.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-sm font-semibold text-red-600">
                  {extension}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{document.name}</p>
                  <p className="text-xs text-gray-500">{(document.size / (1024 * 1024)).toFixed(1)}MB · {fileDate}</p>
                </div>
                {onRemoveDocument && !disabled && (
                  <button
                    type="button"
                    onClick={() => onRemoveDocument(document.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
