import React from 'react';

export default function ToggleOption({ label, description, value, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
        value ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <span
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
          value ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            value ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </button>
  );
}
