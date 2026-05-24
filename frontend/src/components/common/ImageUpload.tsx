import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiX, FiImage } from 'react-icons/fi';
import clsx from 'clsx';

interface ImageUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  multiple?: boolean;
  className?: string;
  error?: string;
  label?: string;
  existingImages?: string[];
  onRemoveExisting?: (index: number) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onFilesSelected,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
  className,
  error,
  label,
  existingImages = [],
  onRemoveExisting,
}) => {
  const [previews, setPreviews] = useState<Array<{ file: File; preview: string }>>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newPreviews = acceptedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setPreviews((prev) => [...prev, ...newPreviews]);
      onFilesSelected([...previews.map((p) => p.file), ...acceptedFiles]);
    },
    [onFilesSelected, previews]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: multiple ? maxFiles : 1,
    maxSize,
    multiple,
  });

  const removePreview = (index: number) => {
    URL.revokeObjectURL(previews[index].preview);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onFilesSelected(newPreviews.map((p) => p.file));
  };

  return (
    <div className={clsx('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-accent-cyan/60 bg-accent-cyan/5'
            : 'border-primary-600/40 hover:border-primary-500/50 hover:bg-primary-800/20',
          error && 'border-danger/50'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className={clsx(
              'p-3 rounded-xl',
              isDragActive ? 'bg-accent-cyan/10 text-accent-cyan' : 'bg-primary-800/40 text-gray-500'
            )}
          >
            <FiUploadCloud size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-300">
              {isDragActive ? 'Drop images here' : 'Drag and drop images here'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              or click to browse. {multiple ? `Max ${maxFiles} files.` : 'Single file.'} Max {(maxSize / 1024 / 1024).toFixed(0)}MB each.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-danger" />
          {error}
        </p>
      )}

      {/* Preview grid */}
      {(previews.length > 0 || existingImages.length > 0) && (
        <div className="flex flex-wrap gap-3 mt-3">
          {/* Existing images */}
          {existingImages.map((url, index) => (
            <div
              key={`existing-${index}`}
              className="relative w-20 h-20 rounded-lg overflow-hidden border border-primary-600/30 group"
            >
              <img
                src={url}
                alt={`Existing ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {onRemoveExisting && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveExisting(index);
                  }}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-danger/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
          ))}

          {/* New previews */}
          {previews.map((item, index) => (
            <div
              key={`preview-${index}`}
              className="relative w-20 h-20 rounded-lg overflow-hidden border border-accent-cyan/30 group"
            >
              <img
                src={item.preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePreview(index);
                }}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-danger/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FiX size={12} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                <p className="text-[9px] text-white truncate">{item.file.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
