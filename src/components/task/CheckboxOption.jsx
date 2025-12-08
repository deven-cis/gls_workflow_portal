import React from 'react';
import { Check } from 'lucide-react';

export default function CheckboxOption({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex h-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
        checked ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded border ${
          checked ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-300 bg-white text-transparent'
        }`}
      >
        <Check className="h-3 w-3" />
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </button>
  );
}
