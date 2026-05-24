import React from 'react';
import { format } from 'date-fns';
import { FiCheck, FiX, FiMapPin, FiClock } from 'react-icons/fi';
import clsx from 'clsx';
import Button from './Button';
import Card from './Card';

interface FaceMatchCardProps {
  missingPersonImage?: string;
  detectionImage?: string;
  missingPersonName?: string;
  personName?: string;
  personPhoto?: string;
  capturedPhoto?: string;
  confidence: number;
  timestamp: string;
  location?: string;
  status?: 'pending' | 'verified' | 'rejected' | 'false_positive' | string;
  cameraName?: string;
  onVerify?: () => void;
  onReject?: () => void;
  isVerifying?: boolean;
  className?: string;
  [key: string]: any;
}

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 90) return 'bg-accent-green';
  if (confidence >= 75) return 'bg-accent-cyan';
  if (confidence >= 60) return 'bg-warning';
  return 'bg-danger';
};

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 90) return 'Very High';
  if (confidence >= 75) return 'High';
  if (confidence >= 60) return 'Moderate';
  return 'Low';
};

const statusColors = {
  pending: 'text-warning',
  verified: 'text-accent-green',
  rejected: 'text-danger',
  false_positive: 'text-gray-500',
};

const FaceMatchCard: React.FC<FaceMatchCardProps> = ({
  missingPersonImage,
  detectionImage,
  missingPersonName,
  confidence,
  timestamp,
  location,
  status,
  cameraName,
  onVerify,
  onReject,
  isVerifying = false,
  className,
}) => {
  const confidenceColor = getConfidenceColor(confidence);

  return (
    <Card className={clsx('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white">{missingPersonName}</h4>
        <span className={clsx('text-xs font-medium capitalize', statusColors[status])}>
          {status.replace('_', ' ')}
        </span>
      </div>

      {/* Side by side images */}
      <div className="flex gap-3 mb-4">
        {/* Missing person photo */}
        <div className="flex-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Missing Person</p>
          <div className="aspect-square rounded-lg overflow-hidden border border-primary-600/30 bg-primary-800/40">
            <img
              src={missingPersonImage}
              alt="Missing person"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Detection snapshot */}
        <div className="flex-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Detection</p>
          <div className="aspect-square rounded-lg overflow-hidden border border-accent-cyan/20 bg-primary-800/40 relative">
            <img
              src={detectionImage}
              alt="Detection"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Confidence overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-300">Match</span>
                <span className={clsx('text-xs font-bold', {
                  'text-accent-green': confidence >= 90,
                  'text-accent-cyan': confidence >= 75 && confidence < 90,
                  'text-warning': confidence >= 60 && confidence < 75,
                  'text-danger': confidence < 60,
                })}>
                  {confidence.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">Confidence Score</span>
          <span className="text-xs text-gray-400">{getConfidenceLabel(confidence)}</span>
        </div>
        <div className="w-full h-2 bg-primary-800/60 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-500', confidenceColor)}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <FiClock size={12} />
          <span>{format(new Date(timestamp), 'MMM d, yyyy HH:mm')}</span>
        </div>
        {location && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <FiMapPin size={12} />
            <span>{location}</span>
          </div>
        )}
        {cameraName && (
          <div className="text-xs text-gray-500">
            Camera: {cameraName}
          </div>
        )}
      </div>

      {/* Actions */}
      {status === 'pending' && (onVerify || onReject) && (
        <div className="flex gap-2 pt-3 border-t border-primary-700/30">
          {onVerify && (
            <Button
              variant="success"
              size="sm"
              fullWidth
              icon={<FiCheck size={14} />}
              onClick={onVerify}
              loading={isVerifying}
            >
              Verify Match
            </Button>
          )}
          {onReject && (
            <Button
              variant="danger"
              size="sm"
              fullWidth
              icon={<FiX size={14} />}
              onClick={onReject}
              disabled={isVerifying}
            >
              Reject
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default FaceMatchCard;
