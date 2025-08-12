import React from 'react';
import { Input } from './Input';

export interface FormFieldProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

export function FormField({ 
  label, 
  type = "text", 
  placeholder,
  value,
  onChange,
  required = false,
  className = "",
  error,
  helperText,
  disabled = false
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        error={!!error}
        fullWidth={true}
      />
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
}

// Form container with common patterns
export interface FormContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function FormContainer({ 
  children, 
  title, 
  subtitle, 
  className = "" 
}: FormContainerProps) {
  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {title && (
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow rounded-lg">
        <form className="space-y-6">
          {children}
        </form>
      </div>
    </div>
  );
}

// Common form patterns as reusable components
export interface AuthFormProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthForm({ children, title, subtitle }: AuthFormProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <FormContainer title={title} subtitle={subtitle}>
        {children}
      </FormContainer>
    </div>
  );
}