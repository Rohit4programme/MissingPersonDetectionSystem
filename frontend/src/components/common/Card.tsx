import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  noPadding?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  header,
  footer,
  loading = false,
  noPadding = false,
  hover = false,
  onClick,
}) => {
  return (
    <div
      className={clsx(
        'glass-card',
        hover && 'glass-card-hover cursor-pointer',
        loading && 'relative overflow-hidden',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Loading shimmer */}
      {loading && (
        <div className="absolute inset-0 bg-primary-800/60 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
        </div>
      )}

      {/* Header */}
      {header && (
        <div className="px-5 py-4 border-b border-primary-700/30">
          {header}
        </div>
      )}

      {/* Body */}
      <div className={clsx(!noPadding && 'p-5')}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-5 py-3 border-t border-primary-700/30 bg-primary-800/20">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
