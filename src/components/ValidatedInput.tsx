import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { validationSchemas, sanitize, security } from '../lib/validation/inputValidation';
import { z } from 'zod';

export interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  validation?: z.ZodSchema;
  validationType?: keyof typeof validationSchemas;
  onValidatedChange?: (value: string, isValid: boolean, error?: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showValidation?: boolean;
  sanitizeInput?: boolean;
  securityCheck?: boolean;
  helperText?: string;
  containerClassName?: string;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
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
  type = 'text',
  ...props
}) => {
  const [value, setValue] = useState(props.value || '');
  const [error, setError] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Sanitize input if enabled
    if (sanitizeInput) {
      switch (type) {
        case 'email':
          newValue = sanitize.email(newValue);
          break;
        case 'url':
          newValue = sanitize.url(newValue);
          break;
        default:
          newValue = sanitize.text(newValue);
          break;
      }
    }

    setValue(newValue);
    
    // Validate
    const valid = validateValue(newValue);
    
    // Call callbacks
    onChange?.(e);
    onValidatedChange?.(newValue, valid, error);
  }, [sanitizeInput, type, validateValue, onChange, onValidatedChange, error]);

  // Get input classes based on validation state
  const getInputClasses = () => {
    const baseClasses = `
      w-full px-4 py-2 border rounded-lg transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${type === 'password' ? 'pr-12' : ''}
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

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={`space-y-2 ${containerClassName}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <input
          {...props}
          type={inputType}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={getInputClasses()}
        />

        {/* Password Toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Validation Icon */}
        {showValidation && isValid !== null && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
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

// Specialized validated inputs for common use cases
export const ValidatedEmailInput: React.FC<Omit<ValidatedInputProps, 'validationType' | 'type'>> = (props) => (
  <ValidatedInput
    {...props}
    type="email"
    validationType="email"
    helperText={props.helperText || "We'll never share your email with anyone"}
  />
);

export const ValidatedPasswordInput: React.FC<Omit<ValidatedInputProps, 'validationType' | 'type'>> = (props) => (
  <ValidatedInput
    {...props}
    type="password"
    validationType="password"
    helperText={props.helperText || "Must contain uppercase, lowercase, number, and special character"}
  />
);

export const ValidatedNameInput: React.FC<Omit<ValidatedInputProps, 'validationType'>> = (props) => (
  <ValidatedInput
    {...props}
    validationType="name"
    helperText={props.helperText || "Enter your full name"}
  />
);

export const ValidatedUrlInput: React.FC<Omit<ValidatedInputProps, 'validationType' | 'type'>> = (props) => (
  <ValidatedInput
    {...props}
    type="url"
    validationType="url"
    helperText={props.helperText || "Enter a valid URL (https://example.com)"}
  />
);

export default ValidatedInput;