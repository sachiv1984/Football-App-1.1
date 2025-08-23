// src/components/common/Modal/Modal.tsx
import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps } from './Modal.types';

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  closable = true,
  centered = true,
  overlayClosable = true,
  className,
  children,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closable) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closable, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && overlayClosable) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className={clsx(
          'flex min-h-full items-center justify-center p-4',
          {
            'items-center': centered,
            'items-start pt-16': !centered,
          }
        )}
        onClick={handleOverlayClick}
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        
        {/* Modal */}
        <div
          className={clsx(
            'relative w-full transform rounded-lg bg-white shadow-xl transition-all',
            sizeClasses[size],
            className
          )}
        >
          {title && (
            <Modal.Header title={title} onClose={closable ? onClose : undefined} closable={closable} />
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  onClose,
  closable = true,
  className,
  children,
}) => {
  return (
    <div className={clsx('flex items-center justify-between p-6 border-b border-gray-200', className)}>
      <div className="flex-1">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 font-heading">
            {title}
          </h3>
        )}
        {children}
      </div>
      {closable && (
        <button
          type="button"
          className="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-electric-yellow focus:ring-offset-2 rounded-md p-1"
          onClick={onClose}
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

const ModalBody: React.FC<ModalBodyProps> = ({ className, children }) => {
  return (
    <div className={clsx('p-6', className)}>
      {children}
    </div>
  );
};

const ModalFooter: React.FC<ModalFooterProps> = ({ className, children }) => {
  return (
    <div className={clsx('flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50', className)}>
      {children}
    </div>
  );
};

// Compound component pattern
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export default Modal;
