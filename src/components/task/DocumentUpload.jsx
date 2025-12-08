import React from 'react';
import { Trash2 } from 'lucide-react';

export default function DocumentUpload({
  title,
  description,
  buttonLabel = 'Upload',
  accept,
  onUpload,
  documents = [],
  onRemoveDocument
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
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
        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white">
          {buttonLabel}
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
        </label>
      </div>
      {documents.length > 0 && (
        <div className="mt-4 space-y-3">
          {documents.map((document) => {
            const extension = document.name.split('.').pop()?.toUpperCase() || 'DOC';
            return (
              <div key={document.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-sm font-semibold text-red-600">
                  {extension}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{document.name}</p>
                  <p className="text-xs text-gray-500">{(document.size / (1024 * 1024)).toFixed(1)} MB · Complete</p>
                </div>
                {onRemoveDocument && (
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
