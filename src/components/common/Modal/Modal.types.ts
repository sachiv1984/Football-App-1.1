// src/components/common/Modal/Modal.types.ts
export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  closable?: boolean;
  centered?: boolean;
  overlayClosable?: boolean;
  className?: string;
  children: React.ReactNode;
}

export interface ModalHeaderProps {
  title?: string;
  onClose?: () => void;
  closable?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export interface ModalBodyProps {
  className?: string;
  children: React.ReactNode;
}

export interface ModalFooterProps {
  className?: string;
  children: React.ReactNode;
}
