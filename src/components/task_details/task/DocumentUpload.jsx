import React from 'react';
import { Trash2 } from 'lucide-react';

export default function DocumentUpload({
  title,
  description,
  buttonLabel = 'Upload',
  accept,
  onUpload,
  documents = [],
  onRemoveDocument,
  disabled = false
}) {
  const hasDocuments = documents.length > 0;
  
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      {!hasDocuments && (
        <div className="flex flex-wrap items-center justify-between gap-4">
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
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onUpload(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />
            )}
          </label>
        </div>
      )}
      {hasDocuments && (
        <div className="space-y-3">
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
