import type { InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
}

export function Checkbox({ label, id, className = '', ...props }: CheckboxProps) {
  const inputId = id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <label
      htmlFor={inputId}
      className={`inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer ${className}`}
    >
      <input
        type="checkbox"
        id={inputId}
        className="rounded border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-500 focus:ring-blue-500"
        {...props}
      />
      {label}
    </label>
  );
}
