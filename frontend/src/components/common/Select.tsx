import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { FiChevronDown } from 'react-icons/fi';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, containerClassName, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={clsx('space-y-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-300"
          >
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              'w-full appearance-none bg-primary-900/50 border rounded-lg text-gray-100',
              'transition-all duration-200 px-3 py-2.5 pr-10 text-sm',
              'focus:outline-none focus:ring-1',
              error
                ? 'border-danger/50 focus:border-danger focus:ring-danger/20'
                : 'border-primary-600/40 focus:border-accent-cyan/50 focus:ring-accent-cyan/20',
              props.disabled && 'opacity-50 cursor-not-allowed bg-primary-800/30',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="bg-primary-800 text-gray-100"
              >
                {option.label}
              </option>
            ))}
          </select>
          <FiChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
        </div>
        {error && (
          <p className="text-xs text-danger flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-danger" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
