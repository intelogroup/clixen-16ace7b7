import { useState, useCallback } from 'react';

export interface FormField {
  value: string;
  error?: string;
  touched?: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | undefined;
}

export interface FormConfig {
  [key: string]: {
    initialValue: string;
    validation?: ValidationRule;
  };
}

export interface UseFormReturn {
  values: { [key: string]: string };
  errors: { [key: string]: string | undefined };
  touched: { [key: string]: boolean };
  isValid: boolean;
  isSubmitting: boolean;
  setValue: (field: string, value: string) => void;
  setError: (field: string, error: string | undefined) => void;
  setTouched: (field: string, touched: boolean) => void;
  validateField: (field: string) => string | undefined;
  validateForm: () => boolean;
  reset: () => void;
  handleSubmit: (onSubmit: (values: { [key: string]: string }) => Promise<void> | void) => (e?: React.FormEvent) => Promise<void>;
}

export function useForm(config: FormConfig): UseFormReturn {
  // Initialize form state
  const initialState: FormState = {};
  Object.keys(config).forEach(key => {
    initialState[key] = {
      value: config[key].initialValue,
      error: undefined,
      touched: false,
    };
  });

  const [formState, setFormState] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation function for a single field
  const validateField = useCallback((field: string): string | undefined => {
    const fieldConfig = config[field];
    const fieldState = formState[field];
    
    if (!fieldConfig || !fieldState) return undefined;

    const { value } = fieldState;
    const { validation } = fieldConfig;

    if (!validation) return undefined;

    // Required validation
    if (validation.required && (!value || value.trim().length === 0)) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }

    // Skip other validations if empty and not required
    if (!value || value.trim().length === 0) return undefined;

    // Min length validation
    if (validation.minLength && value.length < validation.minLength) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${validation.minLength} characters`;
    }

    // Max length validation
    if (validation.maxLength && value.length > validation.maxLength) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} must be no more than ${validation.maxLength} characters`;
    }

    // Pattern validation
    if (validation.pattern && !validation.pattern.test(value)) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} format is invalid`;
    }

    // Custom validation
    if (validation.custom) {
      return validation.custom(value);
    }

    return undefined;
  }, [config, formState]);

  // Set field value
  const setValue = useCallback((field: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value,
        error: undefined, // Clear error when value changes
      },
    }));
  }, []);

  // Set field error
  const setError = useCallback((field: string, error: string | undefined) => {
    setFormState(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        error,
      },
    }));
  }, []);

  // Set field touched
  const setTouched = useCallback((field: string, touched: boolean = true) => {
    setFormState(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        touched,
      },
    }));
  }, []);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    let isValid = true;
    const newState = { ...formState };

    Object.keys(config).forEach(field => {
      const error = validateField(field);
      newState[field] = {
        ...newState[field],
        error,
        touched: true,
      };
      if (error) isValid = false;
    });

    setFormState(newState);
    return isValid;
  }, [config, formState, validateField]);

  // Reset form
  const reset = useCallback(() => {
    setFormState(initialState);
    setIsSubmitting(false);
  }, [initialState]);

  // Handle form submission
  const handleSubmit = useCallback(
    (onSubmit: (values: { [key: string]: string }) => Promise<void> | void) =>
      async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (isSubmitting) return;

        setIsSubmitting(true);

        try {
          const isValid = validateForm();
          if (!isValid) return;

          const values: { [key: string]: string } = {};
          Object.keys(formState).forEach(key => {
            values[key] = formState[key].value;
          });

          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      },
    [formState, isSubmitting, validateForm]
  );

  // Compute derived values
  const values: { [key: string]: string } = {};
  const errors: { [key: string]: string | undefined } = {};
  const touched: { [key: string]: boolean } = {};

  Object.keys(formState).forEach(key => {
    values[key] = formState[key].value;
    errors[key] = formState[key].error;
    touched[key] = formState[key].touched || false;
  });

  const isValid = Object.keys(formState).every(key => !formState[key].error);

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    setValue,
    setError,
    setTouched,
    validateField,
    validateForm,
    reset,
    handleSubmit,
  };
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
} as const;

// Common validation rules
export const CommonValidations = {
  required: { required: true },
  email: { 
    required: true, 
    pattern: ValidationPatterns.email,
    custom: (value: string) => {
      if (!ValidationPatterns.email.test(value)) {
        return 'Please enter a valid email address';
      }
    }
  },
  password: {
    required: true,
    minLength: 8,
    custom: (value: string) => {
      if (!ValidationPatterns.password.test(value)) {
        return 'Password must contain at least 8 characters with uppercase, lowercase, and number';
      }
    }
  },
  confirmPassword: (passwordField: string) => ({
    required: true,
    custom: (value: string) => {
      // This would need access to other form values - implement in specific form
      return undefined;
    }
  }),
  projectName: {
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  workflowName: {
    required: true,
    minLength: 1,
    maxLength: 255,
  },
} as const;