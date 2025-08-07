import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { validationSchemas, sanitize, security } from '../lib/validation/inputValidation';
import { z } from 'zod';

export interface ValidatedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  validation?: z.ZodSchema;
  validationType?: keyof typeof validationSchemas;
  onValidatedChange?: (value: string, isValid: boolean, error?: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  showValidation?: boolean;
  sanitizeInput?: boolean;
  securityCheck?: boolean;
  helperText?: string;
  containerClassName?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
  minHeight?: string;
  autoResize?: boolean;
}

export const ValidatedTextarea: React.FC<ValidatedTextareaProps> = ({
  label,
  validation,
  validationType,
  onValidatedChange,
  onChange,
  showValidation = true,
  sanitizeInput = true,
  securityCheck = true,
  helperText,
  containerClassName = '',
  className = '',
  showCharacterCount = false,
  maxLength,
  minHeight = '100px',
  autoResize = false,
  ...props
}) => {
  const [value, setValue] = useState(props.value || '');
  const [error, setError] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Get validation schema
  const schema = useMemo(() => {
    if (validation) return validation;
    if (validationType && validationSchemas[validationType]) {
      return validationSchemas[validationType];
    }
    return null;
  }, [validation, validationType]);

  // Validation function
  const validateValue = useCallback((inputValue: string) => {
    if (!schema) {
      setIsValid(null);
      setError('');
      return true;
    }

    try {
      // Security checks
      if (securityCheck) {
        if (security.hasXSS(inputValue)) {
          setError('Input contains potentially dangerous content');
          setIsValid(false);
          return false;
        }
        
        if (security.hasSQLInjection(inputValue)) {
          setError('Input contains potentially dangerous SQL patterns');
          setIsValid(false);
          return false;
        }
      }

      // Validate with schema
      schema.parse(inputValue);
      setError('');
      setIsValid(true);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const firstError = err.errors[0];
        setError(firstError.message);
      } else {
        setError('Invalid input');
      }
      setIsValid(false);
      return false;
    }
  }, [schema, securityCheck]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    // Apply max length if specified
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
    }
    
    // Sanitize input if enabled
    if (sanitizeInput) {
      newValue = sanitize.text(newValue);
    }

    setValue(newValue);
    
    // Auto-resize if enabled
    if (autoResize) {
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.max(parseInt(minHeight), e.target.scrollHeight)}px`;
    }
    
    // Validate
    const valid = validateValue(newValue);
    
    // Call callbacks
    const modifiedEvent = { ...e, target: { ...e.target, value: newValue } };
    onChange?.(modifiedEvent);
    onValidatedChange?.(newValue, valid, error);
  }, [sanitizeInput, maxLength, autoResize, minHeight, validateValue, onChange, onValidatedChange, error]);

  // Get textarea classes based on validation state
  const getTextareaClasses = () => {
    const baseClasses = `
      w-full px-4 py-3 border rounded-lg transition-all duration-200 resize-none
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    if (!showValidation || isValid === null) {
      return `${baseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${className}`;
    }

    if (isValid) {
      return `${baseClasses} border-green-300 focus:border-green-500 focus:ring-green-500 ${className}`;
    } else {
      return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-500 ${className}`;
    }
  };

  const characterCount = String(value).length;
  const isNearLimit = maxLength && characterCount >= maxLength * 0.9;

  return (
    <div className={`space-y-2 ${containerClassName}`}>
      {/* Label and Character Count */}
      <div className="flex justify-between items-center">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        {showCharacterCount && maxLength && (
          <span className={`text-xs ${isNearLimit ? 'text-orange-600' : 'text-gray-500'}`}>
            {characterCount}/{maxLength}
          </span>
        )}
      </div>

      {/* Textarea Container */}
      <div className="relative">
        <textarea
          {...props}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={getTextareaClasses()}
          style={{
            minHeight: autoResize ? minHeight : props.style?.minHeight || minHeight,
            ...props.style
          }}
          maxLength={maxLength}
        />

        {/* Validation Icon */}
        {showValidation && isValid !== null && (
          <div className="absolute right-3 top-3">
            {isValid ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Helper Text / Error Message */}
      <AnimatePresence mode="wait">
        {error && showValidation ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-sm text-red-600"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        ) : helperText ? (
          <motion.div
            key="helper"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-gray-600"
          >
            {helperText}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Character count warning */}
      {showCharacterCount && isNearLimit && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-orange-600"
        >
          Approaching character limit
        </motion.div>
      )}

      {/* Focus Ring Animation */}
      {isFocused && (
        <motion.div
          layoutId="focusRing"
          className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 0.3, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        />
      )}
    </div>
  );
};

// Specialized validated textareas for common use cases
export const ValidatedWorkflowDescription: React.FC<Omit<ValidatedTextareaProps, 'validationType'>> = (props) => (
  <ValidatedTextarea
    {...props}
    validationType="workflowDescription"
    showCharacterCount={true}
    maxLength={5000}
    autoResize={true}
    helperText={props.helperText || "Describe what you want your workflow to do (minimum 10 characters)"}
  />
);

export const ValidatedMessage: React.FC<Omit<ValidatedTextareaProps, 'validationType'>> = (props) => (
  <ValidatedTextarea
    {...props}
    validationType="text"
    showCharacterCount={true}
    maxLength={2000}
    autoResize={true}
    helperText={props.helperText || "Enter your message"}
  />
);

export default ValidatedTextarea;