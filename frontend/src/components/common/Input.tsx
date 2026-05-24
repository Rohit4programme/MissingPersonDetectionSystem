import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, containerClassName, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={clsx('space-y-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-300"
          >
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full bg-primary-900/50 border rounded-lg text-gray-100 placeholder-gray-500',
              'transition-all duration-200',
              'focus:outline-none focus:ring-1',
              error
                ? 'border-danger/50 focus:border-danger focus:ring-danger/20'
                : 'border-primary-600/40 focus:border-accent-cyan/50 focus:ring-accent-cyan/20',
              icon && 'pl-10',
              iconRight && 'pr-10',
              !icon && 'px-3',
              !iconRight && 'pr-3',
              'py-2.5 text-sm',
              props.disabled && 'opacity-50 cursor-not-allowed bg-primary-800/30',
              className
            )}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              {iconRight}
            </div>
          )}
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

Input.displayName = 'Input';

export default Input;
