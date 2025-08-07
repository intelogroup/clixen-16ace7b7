/**
 * Comprehensive Input Validation and Sanitization for Clixen Frontend
 * Prevents XSS, injection attacks, and validates user input
 */

import DOMPurify from 'isomorphic-dompurify';

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'password' | 'url' | 'uuid' | 'json';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  allowedValues?: any[];
  custom?: (value: any) => string | null; // Return error message or null
  sanitize?: boolean;
  preventXSS?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  value: any;
  errors: string[];
  warnings: string[];
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

// Common regex patterns
export const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  hexColor: /^#[0-9A-Fa-f]{6}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_\.]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  safeFilename: /^[a-zA-Z0-9\-_\.]+$/,
  positiveInteger: /^\d+$/,
  phoneNumber: /^[\+]?[1-9][\d]{0,15}$/
};

// Dangerous patterns to detect
const DANGEROUS_PATTERNS = [
  // Script injection
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:(?!image\/)[^;]*;/gi,
  
  // Event handlers
  /on\w+\s*=/gi,
  /onload/gi,
  /onerror/gi,
  /onclick/gi,
  /onmouseover/gi,
  
  // SQL injection patterns
  /('|(\\')|(;|\s|^)(delete|drop|insert|update|create|alter|exec|execute|union|select)\s/gi,
  /(union\s+(all\s+)?select)|(\s+or\s+.+\s*=)|(\s+and\s+.+\s*=)/gi,
  
  // Path traversal
  /\.\.\//g,
  /\.\.\\/g,
  
  // Command injection
  /[;&|`$(){}[\]]/g
];

class InputValidator {
  private static instance: InputValidator;
  
  private constructor() {}
  
  public static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }

  /**
   * Sanitize HTML content using DOMPurify
   */
  public sanitizeHTML(input: string, options: {
    allowedTags?: string[];
    allowedAttributes?: string[];
    stripTags?: boolean;
  } = {}): string {
    if (typeof input !== 'string') return '';

    const { allowedTags = [], allowedAttributes = [], stripTags = false } = options;

    if (stripTags) {
      // Strip all HTML tags
      return DOMPurify.sanitize(input, { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [] 
      });
    }

    // Configure DOMPurify
    const config = {
      ALLOWED_TAGS: allowedTags.length > 0 ? allowedTags : [
        'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'
      ],
      ALLOWED_ATTR: allowedAttributes.length > 0 ? allowedAttributes : [
        'href', 'target', 'rel'
      ],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
      ADD_ATTR: ['target'],
      ADD_TAGS: [],
      FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
      FORBID_TAGS: ['script', 'object', 'embed', 'base', 'link', 'meta']
    };

    return DOMPurify.sanitize(input, config);
  }

  /**
   * Sanitize plain text input
   */
  public sanitizeText(input: string, options: {
    maxLength?: number;
    allowUnicode?: boolean;
    preserveLineBreaks?: boolean;
  } = {}): string {
    if (typeof input !== 'string') return '';

    const { maxLength = 10000, allowUnicode = true, preserveLineBreaks = false } = options;

    let sanitized = input.trim();

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove dangerous patterns
    DANGEROUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Handle unicode
    if (!allowUnicode) {
      sanitized = sanitized.replace(/[^\x00-\x7F]/g, ''); // ASCII only
    }

    // Handle line breaks
    if (!preserveLineBreaks) {
      sanitized = sanitized.replace(/[\r\n]+/g, ' ');
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
  }

  /**
   * Validate a single field
   */
  public validateField(value: any, rule: ValidationRule): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = value;

    // Handle null/undefined
    if (value === null || value === undefined || value === '') {
      if (rule.required) {
        errors.push('This field is required');
      }
      return {
        isValid: errors.length === 0,
        value: '',
        errors,
        warnings
      };
    }

    // Type conversion and validation
    switch (rule.type) {
      case 'string':
        sanitizedValue = String(value);
        if (rule.sanitize !== false) {
          sanitizedValue = this.sanitizeText(sanitizedValue, {
            maxLength: rule.maxLength,
            preserveLineBreaks: true
          });
        }
        break;

      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push('Must be a valid number');
          break;
        }
        sanitizedValue = numValue;
        break;

      case 'email':
        sanitizedValue = this.sanitizeText(String(value).toLowerCase(), { maxLength: 320 });
        if (!VALIDATION_PATTERNS.email.test(sanitizedValue)) {
          errors.push('Must be a valid email address');
        }
        break;

      case 'password':
        sanitizedValue = String(value); // Don't sanitize passwords
        if (rule.preventXSS !== false) {
          // Check for dangerous patterns in passwords
          const hasDangerousPattern = DANGEROUS_PATTERNS.some(pattern => 
            pattern.test(sanitizedValue)
          );
          if (hasDangerousPattern) {
            errors.push('Password contains invalid characters');
          }
        }
        break;

      case 'url':
        sanitizedValue = this.sanitizeText(String(value), { maxLength: 2000 });
        if (!VALIDATION_PATTERNS.url.test(sanitizedValue)) {
          errors.push('Must be a valid URL');
        }
        break;

      case 'uuid':
        sanitizedValue = this.sanitizeText(String(value), { maxLength: 36 });
        if (!VALIDATION_PATTERNS.uuid.test(sanitizedValue)) {
          errors.push('Must be a valid UUID');
        }
        break;

      case 'json':
        if (typeof value === 'string') {
          try {
            sanitizedValue = JSON.parse(value);
          } catch {
            errors.push('Must be valid JSON');
          }
        } else {
          sanitizedValue = value;
        }
        break;

      default:
        if (rule.sanitize !== false && typeof value === 'string') {
          sanitizedValue = this.sanitizeText(value);
        }
    }

    // Length validation for strings
    if (typeof sanitizedValue === 'string') {
      if (rule.minLength !== undefined && sanitizedValue.length < rule.minLength) {
        errors.push(`Must be at least ${rule.minLength} characters long`);
      }
      if (rule.maxLength !== undefined && sanitizedValue.length > rule.maxLength) {
        errors.push(`Must be no more than ${rule.maxLength} characters long`);
      }
    }

    // Number range validation
    if (typeof sanitizedValue === 'number') {
      if (rule.min !== undefined && sanitizedValue < rule.min) {
        errors.push(`Must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && sanitizedValue > rule.max) {
        errors.push(`Must be no more than ${rule.max}`);
      }
    }

    // Pattern validation
    if (rule.pattern && typeof sanitizedValue === 'string') {
      if (!rule.pattern.test(sanitizedValue)) {
        errors.push('Invalid format');
      }
    }

    // Allowed values validation
    if (rule.allowedValues && !rule.allowedValues.includes(sanitizedValue)) {
      errors.push(`Must be one of: ${rule.allowedValues.join(', ')}`);
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(sanitizedValue);
      if (customError) {
        errors.push(customError);
      }
    }

    // XSS detection warnings
    if (rule.preventXSS !== false && typeof value === 'string') {
      const hasSuspiciousContent = DANGEROUS_PATTERNS.some(pattern => pattern.test(value));
      if (hasSuspiciousContent && value !== sanitizedValue) {
        warnings.push('Input was sanitized to remove potentially dangerous content');
      }
    }

    return {
      isValid: errors.length === 0,
      value: sanitizedValue,
      errors,
      warnings
    };
  }

  /**
   * Validate an object against a schema
   */
  public validateObject(data: any, schema: ValidationSchema): {
    isValid: boolean;
    data: any;
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
    fieldResults: Record<string, ValidationResult>;
  } {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};
    const sanitizedData: any = {};
    const fieldResults: Record<string, ValidationResult> = {};

    for (const [fieldName, rule] of Object.entries(schema)) {
      const value = data?.[fieldName];
      const result = this.validateField(value, rule);
      
      fieldResults[fieldName] = result;
      sanitizedData[fieldName] = result.value;
      
      if (result.errors.length > 0) {
        errors[fieldName] = result.errors;
      }
      
      if (result.warnings.length > 0) {
        warnings[fieldName] = result.warnings;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      data: sanitizedData,
      errors,
      warnings,
      fieldResults
    };
  }

  /**
   * Validate password strength
   */
  public validatePassword(password: string): {
    isValid: boolean;
    strength: 'very_weak' | 'weak' | 'medium' | 'strong' | 'very_strong';
    score: number;
    feedback: string[];
    requirements: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      numbers: boolean;
      symbols: boolean;
      noCommon: boolean;
    };
  } {
    const feedback: string[] = [];
    let score = 0;
    
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noCommon: true
    };

    // Check requirements
    if (requirements.length) score += 2;
    else feedback.push('Use at least 8 characters');

    if (requirements.uppercase) score += 1;
    else feedback.push('Include uppercase letters');

    if (requirements.lowercase) score += 1;
    else feedback.push('Include lowercase letters');

    if (requirements.numbers) score += 1;
    else feedback.push('Include numbers');

    if (requirements.symbols) score += 2;
    else feedback.push('Include special characters');

    // Check for common patterns
    const commonPasswords = [
      'password', '123456', 'qwerty', 'abc123', 'letmein', 'welcome',
      'monkey', '1234567890', 'admin', 'user', 'guest', 'test'
    ];

    const lowerPassword = password.toLowerCase();
    const hasCommonPattern = commonPasswords.some(common => 
      lowerPassword.includes(common)
    );

    if (hasCommonPattern) {
      requirements.noCommon = false;
      feedback.push('Avoid common passwords');
      score = Math.max(0, score - 3);
    }

    // Check for sequential characters
    if (/123456|abcdef|qwerty/i.test(password)) {
      feedback.push('Avoid sequential characters');
      score = Math.max(0, score - 1);
    }

    // Check for repeated characters
    if (/(.)\1{3,}/.test(password)) {
      feedback.push('Avoid repeated characters');
      score = Math.max(0, score - 1);
    }

    // Bonus points for length
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Determine strength
    let strength: 'very_weak' | 'weak' | 'medium' | 'strong' | 'very_strong';
    if (score <= 2) strength = 'very_weak';
    else if (score <= 4) strength = 'weak';
    else if (score <= 6) strength = 'medium';
    else if (score <= 8) strength = 'strong';
    else strength = 'very_strong';

    return {
      isValid: score >= 4 && Object.values(requirements).every(Boolean),
      strength,
      score,
      feedback,
      requirements
    };
  }

  /**
   * Detect potentially malicious input
   */
  public detectMaliciousInput(input: string): {
    isMalicious: boolean;
    threats: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const threats: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (typeof input !== 'string') {
      return { isMalicious: false, threats, riskLevel };
    }

    // Script injection
    if (/<script/i.test(input) || /javascript:/i.test(input)) {
      threats.push('Script injection attempt');
      riskLevel = 'critical';
    }

    // SQL injection
    if (/('|(\\')|(;|\s|^)(delete|drop|insert|update|create|alter|exec|execute|union|select)\s/gi.test(input)) {
      threats.push('SQL injection attempt');
      riskLevel = 'high';
    }

    // Path traversal
    if (/\.\.\//g.test(input) || /\.\.\\/g.test(input)) {
      threats.push('Path traversal attempt');
      riskLevel = 'high';
    }

    // Command injection
    if (/[;&|`$(){}[\]]/g.test(input)) {
      threats.push('Command injection attempt');
      riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
    }

    // XSS patterns
    if (/on\w+\s*=/gi.test(input) || /<iframe/i.test(input)) {
      threats.push('Cross-site scripting (XSS) attempt');
      riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
    }

    // Data URI with potential scripts
    if (/data:(?!image\/)[^;]*;/gi.test(input)) {
      threats.push('Suspicious data URI');
      riskLevel = riskLevel === 'critical' ? 'critical' : 'medium';
    }

    return {
      isMalicious: threats.length > 0,
      threats,
      riskLevel
    };
  }

  /**
   * Create validation schema for common use cases
   */
  public createSchema(schemaType: 'user' | 'project' | 'workflow' | 'message'): ValidationSchema {
    switch (schemaType) {
      case 'user':
        return {
          name: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 100,
            pattern: VALIDATION_PATTERNS.alphanumericWithSpaces
          },
          email: {
            required: true,
            type: 'email',
            maxLength: 320
          },
          password: {
            required: true,
            type: 'password',
            minLength: 8,
            maxLength: 128,
            custom: (value) => {
              const result = this.validatePassword(value);
              return result.isValid ? null : 'Password does not meet security requirements';
            }
          }
        };

      case 'project':
        return {
          name: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 255,
            pattern: VALIDATION_PATTERNS.noSpecialChars
          },
          description: {
            type: 'string',
            maxLength: 2000
          },
          color: {
            type: 'string',
            pattern: VALIDATION_PATTERNS.hexColor
          }
        };

      case 'workflow':
        return {
          name: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 255
          },
          description: {
            type: 'string',
            maxLength: 2000
          },
          prompt: {
            required: true,
            type: 'string',
            minLength: 10,
            maxLength: 5000
          },
          project_id: {
            required: true,
            type: 'uuid'
          }
        };

      case 'message':
        return {
          message: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 10000
          },
          session_id: {
            type: 'uuid'
          },
          agent_type: {
            type: 'string',
            allowedValues: ['orchestrator', 'workflow_designer', 'deployment', 'system']
          }
        };

      default:
        return {};
    }
  }
}

// Export singleton instance
export const inputValidator = InputValidator.getInstance();

// Export validation schemas for common use cases
export const VALIDATION_SCHEMAS = {
  USER: inputValidator.createSchema('user'),
  PROJECT: inputValidator.createSchema('project'),
  WORKFLOW: inputValidator.createSchema('workflow'),
  MESSAGE: inputValidator.createSchema('message')
};

export default inputValidator;