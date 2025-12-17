import React, { useRef } from 'react';

export default function IconInput({ label, placeholder, value, onChange, type = 'text', icon: IconComponent, prefix, disabled = false }) {
  const inputRef = useRef(null);

  const handleIconClick = () => {
    if (type === 'time' && inputRef.current && !disabled) {
      inputRef.current.showPicker?.();
      // Fallback: trigger click on the input if showPicker is not supported
      if (!inputRef.current.showPicker) {
        inputRef.current.click();
      }
    }
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{prefix}</span>
        )}
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
            prefix ? 'pl-8' : ''
          } ${IconComponent ? 'pr-10' : ''} ${
            disabled ? 'bg-gray-50 cursor-not-allowed' : ''
          } ${type === 'time' ? '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-0' : ''}`}
        />
        {IconComponent && (
          <IconComponent 
            className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 ${
              type === 'time' && !disabled ? 'cursor-pointer hover:text-gray-600' : 'pointer-events-none'
            }`}
            onClick={handleIconClick}
          />
        )}
      </div>
    </div>
  );
}
