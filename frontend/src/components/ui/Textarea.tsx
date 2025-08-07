import React from 'react';
import { formTokens, designTokens } from '../../styles/design-tokens';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  fullWidth = true,
  resize = 'vertical',
  className = '',
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  const textareaStyles: React.CSSProperties = {
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
    resize,
    minHeight: '100px',
    fontFamily: 'inherit',
  };

  const focusStyles = {
    borderColor: error ? designTokens.colors.error[500] : formTokens.input.borderFocus,
    boxShadow: `0 0 0 3px ${error ? designTokens.colors.error[100] : designTokens.colors.primary[100]}`,
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block mb-2 font-medium"
          style={{
            fontSize: designTokens.typography.sizes.sm,
            color: designTokens.colors.gray[700]
          }}
        >
          {label}
        </label>
      )}
      
      <textarea
        id={textareaId}
        style={textareaStyles}
        className="placeholder:text-gray-400 focus:ring-0 focus:outline-none"
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

export default Textarea;