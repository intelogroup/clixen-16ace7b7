import React from 'react';
import { motion } from 'framer-motion';
import { buttonTokens, designTokens } from '../../styles/design-tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  as?: 'button' | 'a';
  href?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  as = 'button',
  href,
  ...props
}) => {
  const variantTokens = buttonTokens.variants[variant];
  const sizeTokens = buttonTokens.sizes[size];

  const buttonStyles: React.CSSProperties = {
    backgroundColor: variantTokens.bg,
    color: variantTokens.text,
    borderColor: variantTokens.border,
    padding: sizeTokens.padding,
    fontSize: sizeTokens.fontSize,
    borderRadius: sizeTokens.radius,
    border: '1px solid',
    fontWeight: designTokens.typography.weights.medium,
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all 0.2s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing[2],
    textDecoration: 'none',
    outline: 'none',
    width: fullWidth ? '100%' : 'auto',
  };

  const buttonClasses = `
    hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
    transition-all duration-200 ${fullWidth ? 'w-full' : ''} ${className}
  `.trim();

  const content = (
    <>
      {leftIcon && !isLoading && (
        <span className="flex items-center">{leftIcon}</span>
      )}
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span>{children}</span>
      {rightIcon && !isLoading && (
        <span className="flex items-center">{rightIcon}</span>
      )}
    </>
  );

  if (as === 'a' && href) {
    return (
      <motion.a
        href={href}
        style={buttonStyles}
        className={buttonClasses}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.95 }}
        {...(props as any)}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      style={buttonStyles}
      className={buttonClasses}
      disabled={disabled || isLoading}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.95 }}
      type="button"
      {...props}
    >
      {content}
    </motion.button>
  );
};

export default Button;