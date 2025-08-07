import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  size = 'md', 
  showCloseButton = true,
  closeOnBackdrop = true,
  className = ''
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          
          {/* Modal Content */}
          <motion.div
            className={`relative w-full ${sizeClasses[size]} max-h-[90vh] bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden ${className}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {showCloseButton && (
              <motion.button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} />
              </motion.button>
            )}
            
            <div className="overflow-y-auto max-h-[90vh]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false
}) => {
  const variants = {
    danger: {
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      buttonColor: 'bg-red-500 hover:bg-red-600'
    },
    warning: {
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      buttonColor: 'bg-yellow-500 hover:bg-yellow-600'
    },
    info: {
      icon: Info,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      buttonColor: 'bg-blue-500 hover:bg-blue-600'
    },
    success: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      buttonColor: 'bg-green-500 hover:bg-green-600'
    }
  };

  const config = variants[variant];
  const IconComponent = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" closeOnBackdrop={!loading}>
      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-xl ${config.bgColor} ${config.borderColor} border flex items-center justify-center`}>
            <IconComponent className={`w-6 h-6 ${config.color}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <motion.button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors duration-200"
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
          >
            {cancelText}
          </motion.button>
          <motion.button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 ${config.buttonColor} disabled:opacity-50 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2`}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </motion.button>
        </div>
      </div>
    </Modal>
  );
};

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  buttonText?: string;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  buttonText = 'OK'
}) => {
  const variants = {
    danger: {
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      buttonColor: 'bg-red-500 hover:bg-red-600'
    },
    warning: {
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      buttonColor: 'bg-yellow-500 hover:bg-yellow-600'
    },
    info: {
      icon: Info,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      buttonColor: 'bg-blue-500 hover:bg-blue-600'
    },
    success: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      buttonColor: 'bg-green-500 hover:bg-green-600'
    }
  };

  const config = variants[variant];
  const IconComponent = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-xl ${config.bgColor} ${config.borderColor} border flex items-center justify-center`}>
            <IconComponent className={`w-6 h-6 ${config.color}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <motion.button
            onClick={onClose}
            className={`px-6 py-2 ${config.buttonColor} text-white rounded-lg font-medium transition-colors duration-200`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {buttonText}
          </motion.button>
        </div>
      </div>
    </Modal>
  );
};

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: string;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  children,
  position = 'right',
  size = '400px',
  className = ''
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const getTransformValues = () => {
    switch (position) {
      case 'left':
        return { closed: 'translateX(-100%)', open: 'translateX(0%)' };
      case 'right':
        return { closed: 'translateX(100%)', open: 'translateX(0%)' };
      case 'top':
        return { closed: 'translateY(-100%)', open: 'translateY(0%)' };
      case 'bottom':
        return { closed: 'translateY(100%)', open: 'translateY(0%)' };
      default:
        return { closed: 'translateX(100%)', open: 'translateX(0%)' };
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return `top-0 left-0 h-full ${size.includes('px') ? `w-[${size}]` : `w-${size}`}`;
      case 'right':
        return `top-0 right-0 h-full ${size.includes('px') ? `w-[${size}]` : `w-${size}`}`;
      case 'top':
        return `top-0 left-0 w-full ${size.includes('px') ? `h-[${size}]` : `h-${size}`}`;
      case 'bottom':
        return `bottom-0 left-0 w-full ${size.includes('px') ? `h-[${size}]` : `h-${size}`}`;
      default:
        return `top-0 right-0 h-full ${size.includes('px') ? `w-[${size}]` : `w-${size}`}`;
    }
  };

  const transforms = getTransformValues();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          
          {/* Drawer Content */}
          <motion.div
            className={`fixed ${getPositionClasses()} bg-slate-900/95 backdrop-blur-xl border-white/20 shadow-2xl overflow-hidden ${
              position === 'left' ? 'border-r' : 
              position === 'right' ? 'border-l' : 
              position === 'top' ? 'border-b' : 'border-t'
            } ${className}`}
            initial={{ transform: transforms.closed }}
            animate={{ transform: transforms.open }}
            exit={{ transform: transforms.closed }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="h-full overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default {
  Modal,
  ConfirmDialog,
  AlertDialog,
  Drawer
};
