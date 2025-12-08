import React from 'react';

export default function AddActionButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors text-left"
    >
      <span className="text-lg text-blue-600">+</span>
      <span>{label}</span>
    </button>
  );
}
