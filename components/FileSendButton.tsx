// 文件发送按钮组件
import React, { useRef, useState } from 'react';

interface FileSendButtonProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const FileSendButton: React.FC<FileSendButtonProps> = ({
  onFileSelect,
  disabled = false,
  className = '',
  size = 'md'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
      // 清空input，允许选择同一个文件
      event.target.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-1 text-sm';
      case 'lg':
        return 'p-3 text-lg';
      default:
        return 'p-2 text-base';
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="*/*"
      />
      
      <button
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200
          ${getSizeClasses()}
          ${disabled 
            ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
            : isDragOver
              ? 'bg-sky-500 text-white shadow-lg scale-105'
              : 'bg-slate-700 text-slate-300 hover:bg-sky-600 hover:text-white hover:shadow-md'
          }
          ${className}
        `}
        title={disabled ? 'Cannot send file' : 'Click to select file or drag file here'}
      >
        <span className="text-lg mr-1">📎</span>
        {size !== 'sm' && <span>Send File</span>}
      </button>
      
      {isDragOver && (
        <div className="absolute inset-0 border-2 border-dashed border-sky-400 rounded-lg bg-sky-400 bg-opacity-10 flex items-center justify-center">
          <span className="text-sky-400 font-medium">Drop file</span>
        </div>
      )}
    </div>
  );
};