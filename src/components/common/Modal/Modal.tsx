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
