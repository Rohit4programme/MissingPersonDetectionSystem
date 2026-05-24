import React from 'react';

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
}

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  low: { color: '#6b7280', bg: 'bg-gray-500/10', label: 'Low' },
  medium: { color: '#ffaa00', bg: 'bg-amber-500/10', label: 'Medium' },
  high: { color: '#ff6b35', bg: 'bg-orange-500/10', label: 'High' },
  critical: { color: '#ff3b3b', bg: 'bg-red-500/10', label: 'Critical' },
};

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className = '' }) => {
  const config = priorityConfig[priority] || priorityConfig.low;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${className}`}
      style={{ color: config.color, border: `1px solid ${config.color}30` }}
    >
      {config.label}
    </span>
  );
};

export default PriorityBadge;
