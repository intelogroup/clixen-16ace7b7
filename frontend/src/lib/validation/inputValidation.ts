/**
 * Comprehensive input validation and sanitization utilities
 */

import { z } from 'zod';

// Input sanitization functions
export const sanitize = {
  // Remove HTML tags and dangerous characters
  html: (input: string): string => {
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  },

  // Sanitize for SQL contexts (though we use parameterized queries)
  sql: (input: string): string => {
    return input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove SQL block comments
      .replace(/\*\//g, '')
      .trim();
  },

  // Basic text sanitization
  text: (input: string): string => {
    return input
      .replace(/[<>\"'&]/g, (match) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match] || match;
      })
      .trim();
  },

  // Email sanitization
  email: (input: string): string => {
    return input
      .toLowerCase()
      .replace(/[^\w@.-]/g, '') // Only allow word chars, @, ., -
      .trim();
  },

  // URL sanitization
  url: (input: string): string => {
    try {
      const url = new URL(input);
      // Only allow safe protocols
      if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  },

  // Filename sanitization
  filename: (input: string): string => {
    return input
      .replace(/[^a-zA-Z0-9.-_]/g, '_') // Replace unsafe chars with underscore
      .replace(/^[.-]/, '_') // Don't start with . or -
      .substring(0, 255) // Limit length
      .trim();
  }
};

// Zod schemas for common validation patterns
export const validationSchemas = {
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(254, 'Email is too long')
    .transform(sanitize.email),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),

  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(sanitize.text),

  url: z.string()
    .url('Invalid URL format')
    .transform(sanitize.url)
    .refine((url) => url !== '', 'Invalid or unsafe URL'),

  text: z.string()
    .max(10000, 'Text is too long')
    .transform(sanitize.text),

  workflowDescription: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description is too long')
    .transform(sanitize.text),

  apiKey: z.string()
    .min(20, 'API key is too short')
    .max(500, 'API key is too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'API key contains invalid characters'),

  phone: z.string()
    .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
    .min(10, 'Phone number is too short')
    .max(20, 'Phone number is too long'),

  integer: z.number()
    .int('Must be a whole number')
    .safe('Number is too large'),

  positiveInteger: z.number()
    .int('Must be a whole number')
    .positive('Must be a positive number')
    .safe('Number is too large'),

  boolean: z.boolean(),

  file: z.object({
    name: z.string().transform(sanitize.filename),
    size: z.number().max(10 * 1024 * 1024, 'File is too large (max 10MB)'),
    type: z.string().regex(/^[a-zA-Z0-9\/\-+]+$/, 'Invalid file type')
  })
};

// Form validation utilities
export class FormValidator {
  private schema: z.ZodSchema;
  private errors: Record<string, string[]> = {};

  constructor(schema: z.ZodSchema) {
    this.schema = schema;
  }

  validate(data: any): { isValid: boolean; data?: any; errors: Record<string, string[]> } {
    try {
      const result = this.schema.parse(data);
      this.errors = {};
      return { isValid: true, data: result, errors: {} };
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.errors = this.formatZodErrors(error);
        return { isValid: false, errors: this.errors };
      }
      
      this.errors = { general: ['Validation failed'] };
      return { isValid: false, errors: this.errors };
    }
  }

  validateField(fieldName: string, value: any): { isValid: boolean; error?: string } {
    try {
      if (this.schema instanceof z.ZodObject) {
        const fieldSchema = this.schema.shape[fieldName];
        if (fieldSchema) {
          fieldSchema.parse(value);
          return { isValid: true };
        }
      }
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return { isValid: false, error: firstError.message };
      }
      return { isValid: false, error: 'Validation failed' };
    }
  }

  private formatZodErrors(error: z.ZodError): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });

    return errors;
  }
}

// Predefined validators for common forms
export const validators = {
  auth: new FormValidator(z.object({
    email: validationSchemas.email,
    password: validationSchemas.password,
    name: validationSchemas.name.optional()
  })),

  profile: new FormValidator(z.object({
    name: validationSchemas.name,
    email: validationSchemas.email,
    phone: validationSchemas.phone.optional(),
    bio: validationSchemas.text.optional()
  })),

  workflow: new FormValidator(z.object({
    name: validationSchemas.name,
    description: validationSchemas.workflowDescription,
    category: z.enum(['automation', 'data', 'communication', 'integration', 'other']),
    priority: z.enum(['low', 'medium', 'high']).default('medium')
  })),

  apiConfig: new FormValidator(z.object({
    name: validationSchemas.name,
    apiKey: validationSchemas.apiKey,
    baseUrl: validationSchemas.url.optional(),
    description: validationSchemas.text.optional()
  })),

  contact: new FormValidator(z.object({
    name: validationSchemas.name,
    email: validationSchemas.email,
    subject: validationSchemas.text,
    message: z.string()
      .min(10, 'Message must be at least 10 characters')
      .max(2000, 'Message is too long')
      .transform(sanitize.text)
  }))
};

// Real-time validation hook
export const useFormValidation = (validator: FormValidator) => {
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [isValidating, setIsValidating] = React.useState(false);

  const validateForm = React.useCallback(async (data: any) => {
    setIsValidating(true);
    
    // Add small delay to debounce rapid changes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = validator.validate(data);
    setErrors(result.errors);
    setIsValidating(false);
    
    return result;
  }, [validator]);

  const validateField = React.useCallback((fieldName: string, value: any) => {
    const result = validator.validateField(fieldName, value);
    
    setErrors(prev => {
      const newErrors = { ...prev };
      if (result.isValid) {
        delete newErrors[fieldName];
      } else {
        newErrors[fieldName] = [result.error!];
      }
      return newErrors;
    });
    
    return result;
  }, [validator]);

  const clearErrors = React.useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = React.useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  return {
    errors,
    isValidating,
    validateForm,
    validateField,
    clearErrors,
    clearFieldError
  };
};

// Security utilities
export const security = {
  // Check for potential XSS attempts
  hasXSS: (input: string): boolean => {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  },

  // Check for SQL injection attempts
  hasSQLInjection: (input: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(UNION\s+(ALL\s+)?SELECT)/gi,
      /(\|\||&&|;|\-\-|\/\*|\*\/)/gi,
      /(0x[0-9A-Fa-f]+)/gi
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  },

  // Rate limiting helper
  createRateLimiter: (maxAttempts: number, windowMs: number) => {
    const attempts = new Map<string, number[]>();
    
    return (identifier: string): boolean => {
      const now = Date.now();
      const userAttempts = attempts.get(identifier) || [];
      
      // Remove old attempts outside the window
      const validAttempts = userAttempts.filter(time => now - time < windowMs);
      
      if (validAttempts.length >= maxAttempts) {
        return false; // Rate limited
      }
      
      validAttempts.push(now);
      attempts.set(identifier, validAttempts);
      
      return true; // Allow request
    };
  }
};

// Import React for the hook
import React from 'react';