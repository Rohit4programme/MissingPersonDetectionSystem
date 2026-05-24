import React from 'react';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'cyan' | 'green' | 'white';
  className?: string;
  label?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-[3px]',
  xl: 'w-16 h-16 border-[3px]',
};

const colorStyles = {
  cyan: 'border-accent-cyan/20 border-t-accent-cyan',
  green: 'border-accent-green/20 border-t-accent-green',
  white: 'border-white/20 border-t-white',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'cyan',
  className,
  label,
}) => {
  return (
    <div className={clsx('flex flex-col items-center gap-3', className)}>
      <div
        className={clsx(
          'rounded-full animate-spin',
          sizeStyles[size],
          colorStyles[color]
        )}
      />
      {label && (
        <p className="text-sm text-gray-400 animate-pulse">{label}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
