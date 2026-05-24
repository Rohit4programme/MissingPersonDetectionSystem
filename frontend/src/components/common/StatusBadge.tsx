import React from 'react';
import Badge from './Badge';

type CaseStatus = 'missing' | 'investigating' | 'detected' | 'found' | 'closed';

interface StatusBadgeProps {
  status: CaseStatus;
  size?: 'sm' | 'md';
  dot?: boolean;
}

const statusConfig: Record<CaseStatus, { label: string; variant: 'danger' | 'warning' | 'cyan' | 'success' | 'default' }> = {
  missing: { label: 'Missing', variant: 'danger' },
  investigating: { label: 'Investigating', variant: 'warning' },
  detected: { label: 'Detected', variant: 'cyan' },
  found: { label: 'Found', variant: 'success' },
  closed: { label: 'Closed', variant: 'default' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', dot = true }) => {
  const config = statusConfig[status] || statusConfig.missing;

  return (
    <Badge variant={config.variant} size={size} dot={dot}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
