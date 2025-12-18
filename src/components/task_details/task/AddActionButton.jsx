import React from 'react';

export default function AddActionButton({
  label,
  onClick,
  disabled = false,
  onDisabledClick,
  className = ''
}) {
  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof onDisabledClick === 'function') onDisabledClick();
      return;
    }
    if (typeof onClick === 'function') onClick(e);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled && !onDisabledClick}
      aria-disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border border-gray-200 rounded-lg transition-colors ${
        disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
      } ${className}`}
    >
      <span className="text-lg text-blue-600">+</span>
      <span>{label}</span>
    </button>
  );
}
