import React from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'danger' | 'outline' | 'ghost' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent-cyan/20 border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/30 hover:border-accent-cyan/50 hover:shadow-accent-cyan/20 hover:shadow-md',
  danger: 'bg-danger/20 border-danger/30 text-danger hover:bg-danger/30 hover:border-danger/50',
  success: 'bg-accent-green/20 border-accent-green/30 text-accent-green hover:bg-accent-green/30 hover:border-accent-green/50',
  warning: 'bg-warning/20 border-warning/30 text-warning hover:bg-warning/30 hover:border-warning/50',
  outline: 'bg-transparent border-primary-600/50 text-gray-300 hover:bg-primary-800/50 hover:border-primary-500/50 hover:text-white',
  ghost: 'bg-transparent border-transparent text-gray-400 hover:bg-primary-800/40 hover:text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  disabled,
  children,
  className,
  ...props
}) => {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg border backdrop-blur-sm',
        'transition-all duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-accent-cyan/30 focus:ring-offset-2 focus:ring-offset-primary-900',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className={clsx(
          'border-2 border-current/30 border-t-current rounded-full animate-spin',
          size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
        )} />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="flex-shrink-0">{iconRight}</span>
      )}
    </button>
  );
};

export default Button;
