import React from 'react';
import { motion, MotionProps } from 'framer-motion';

// Animation variants for common patterns
export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 }
};

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

export const slideUp = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 25 }
};

// Stagger animations for lists
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};

// Enhanced card component with hover animations
export const AnimatedCard = ({ 
  children, 
  className = "",
  hoverScale = 1.02,
  ...props 
}: {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
} & MotionProps) => (
  <motion.div
    className={`bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-white/10 rounded-xl hover:border-white/20 transition-all duration-200 ${className}`}
    whileHover={{ 
      scale: hoverScale,
      boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.3)"
    }}
    whileTap={{ scale: 0.98 }}
    variants={fadeIn}
    {...props}
  >
    {children}
  </motion.div>
);

// Floating action button with animation
export const FloatingActionButton = ({ 
  children, 
  onClick,
  className = "",
  ...props 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
} & MotionProps) => (
  <motion.button
    onClick={onClick}
    className={`fixed bottom-6 right-6 bg-white text-black p-4 rounded-full shadow-lg hover:shadow-xl z-50 ${className}`}
    whileHover={{ 
      scale: 1.1,
      boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.4)"
    }}
    whileTap={{ scale: 0.9 }}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 260, damping: 20 }}
    {...props}
  >
    {children}
  </motion.button>
);

// Enhanced button with multiple animation states
export const AnimatedButton = ({ 
  children, 
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  ...props 
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variantClasses = {
    primary: "bg-white text-black hover:bg-white/90",
    secondary: "bg-zinc-800 text-white hover:bg-zinc-700",
    ghost: "bg-transparent text-white hover:bg-white/10",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <motion.button
      className={`font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={loading}
      {...props}
    >
      <motion.div
        initial={false}
        animate={loading ? { opacity: 0.7 } : { opacity: 1 }}
        className="flex items-center justify-center space-x-2"
      >
        {loading && (
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
        <span>{children}</span>
      </motion.div>
    </motion.button>
  );
};

// Progress bar with smooth animation
export const AnimatedProgressBar = ({ 
  progress = 0, 
  className = "",
  showPercentage = true
}: {
  progress: number;
  className?: string;
  showPercentage?: boolean;
}) => (
  <div className={`w-full ${className}`}>
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm font-medium text-zinc-300">Progress</span>
      {showPercentage && (
        <span className="text-sm text-zinc-400">{Math.round(progress)}%</span>
      )}
    </div>
    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  </div>
);

// Notification toast with animation
export const AnimatedToast = ({ 
  message, 
  type = "info",
  onClose
}: {
  message: string;
  type?: "info" | "success" | "warning" | "error";
  onClose?: () => void;
}) => {
  const typeClasses = {
    info: "bg-blue-600 text-white",
    success: "bg-green-600 text-white",
    warning: "bg-yellow-600 text-black",
    error: "bg-red-600 text-white"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${typeClasses[type]}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 opacity-70 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        )}
      </div>
    </motion.div>
  );
};

// Enhanced modal with animation
export const AnimatedModal = ({ 
  isOpen, 
  onClose, 
  children,
  className = ""
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={`bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};