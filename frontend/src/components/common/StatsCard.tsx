import React from 'react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import clsx from 'clsx';

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  color?: 'cyan' | 'green' | 'red' | 'amber' | 'blue' | 'purple' | string;
  className?: string;
}

const colorMap = {
  cyan: {
    bg: 'bg-accent-cyan/10',
    icon: 'text-accent-cyan',
    border: 'border-accent-cyan/20',
  },
  green: {
    bg: 'bg-accent-green/10',
    icon: 'text-accent-green',
    border: 'border-accent-green/20',
  },
  red: {
    bg: 'bg-danger/10',
    icon: 'text-danger',
    border: 'border-danger/20',
  },
  amber: {
    bg: 'bg-warning/10',
    icon: 'text-warning',
    border: 'border-warning/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    icon: 'text-purple-400',
    border: 'border-purple-500/20',
  },
};

const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  label,
  value,
  trend,
  color = 'cyan',
  className,
}) => {
  const colors = colorMap[color];

  return (
    <div
      className={clsx(
        'glass-card p-5 group hover:border-opacity-40 transition-all duration-300',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.direction === 'up' ? (
                <FiTrendingUp size={14} className="text-accent-green" />
              ) : (
                <FiTrendingDown size={14} className="text-danger" />
              )}
              <span
                className={clsx(
                  'text-xs font-medium',
                  trend.direction === 'up' ? 'text-accent-green' : 'text-danger'
                )}
              >
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-xs text-gray-500">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={clsx(
            'p-3 rounded-xl border transition-colors duration-300',
            colors.bg,
            colors.border,
            'group-hover:bg-opacity-20'
          )}
        >
          <div className={colors.icon}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
