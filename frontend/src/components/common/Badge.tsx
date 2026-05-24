import React from 'react';
import clsx from 'clsx';

type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'cyan' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  success: 'bg-accent-green/20 text-accent-green border-accent-green/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  danger: 'bg-danger/20 text-danger border-danger/30',
  cyan: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            variant === 'success' && 'bg-accent-green',
            variant === 'danger' && 'bg-danger',
            variant === 'warning' && 'bg-warning',
            variant === 'info' && 'bg-blue-400',
            variant === 'cyan' && 'bg-accent-cyan',
            variant === 'purple' && 'bg-purple-400',
            variant === 'default' && 'bg-gray-400'
          )}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
