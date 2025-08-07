import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { validationSchemas, sanitize, security } from '../lib/validation/inputValidation';
import { z } from 'zod';
import { Input } from './ui';

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

  // No need for custom classes anymore - using design system Input component

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={`${containerClassName}`}>
      <Input
        {...props}
        type={inputType}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        label={label ? `${label}${props.required ? ' *' : ''}` : undefined}
        error={showValidation && error ? error : undefined}
        helperText={!error ? helperText : undefined}
        rightIcon={
          type === 'password' ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : showValidation && isValid !== null ? (
            isValid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />
          ) : undefined
        }
        className={className}
      />
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