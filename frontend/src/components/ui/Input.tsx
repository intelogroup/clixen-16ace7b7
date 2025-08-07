import React from 'react';
import { formTokens, designTokens } from '../../styles/design-tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const inputStyles: React.CSSProperties = {
    backgroundColor: formTokens.input.bg,
    borderColor: error ? designTokens.colors.error[500] : formTokens.input.border,
    color: formTokens.input.text,
    padding: formTokens.input.padding,
    borderRadius: formTokens.input.radius,
    border: '1px solid',
    fontSize: designTokens.typography.sizes.base,
    width: fullWidth ? '100%' : 'auto',
    outline: 'none',
    transition: 'all 0.2s ease-in-out',
  };

  const focusStyles = {
    borderColor: error ? designTokens.colors.error[500] : formTokens.input.borderFocus,
    boxShadow: `0 0 0 3px ${error ? designTokens.colors.error[100] : designTokens.colors.primary[100]}`,
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-2 font-medium"
          style={{
            fontSize: designTokens.typography.sizes.sm,
            color: designTokens.colors.gray[700]
          }}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div
            className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
            style={{ color: designTokens.colors.gray[400] }}
          >
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          style={inputStyles}
          className={`
            placeholder:text-gray-400 focus:ring-0 focus:outline-none
            ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''}
          `}
          onFocus={(e) => {
            Object.assign(e.target.style, focusStyles);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? designTokens.colors.error[500] : formTokens.input.border;
            e.target.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
          {...props}
        />
        
        {rightIcon && (
          <div
            className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
            style={{ color: designTokens.colors.gray[400] }}
          >
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p
          className="mt-1"
          style={{
            fontSize: designTokens.typography.sizes.sm,
            color: designTokens.colors.error[500]
          }}
        >
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p
          className="mt-1"
          style={{
            fontSize: designTokens.typography.sizes.sm,
            color: designTokens.colors.gray[500]
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Input;