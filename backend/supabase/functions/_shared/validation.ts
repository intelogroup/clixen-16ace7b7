// Validation utilities for API endpoints

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null; // Return error message or null
  allowedValues?: any[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

// UUID validation pattern
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Email validation pattern
export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Hex color pattern
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

// URL pattern
export const URL_PATTERN = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

// Validation function
export const validate = (data: any, rules: ValidationRule[]): ValidationResult => {
  const errors: string[] = [];
  const sanitizedData: any = {};

  for (const rule of rules) {
    const value = data[rule.field];
    const fieldName = rule.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Check if required field is missing
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${fieldName} is required`);
      continue;
    }

    // Skip validation if field is not required and not present
    if (!rule.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    if (rule.type && value !== undefined && value !== null) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (actualType !== rule.type) {
        errors.push(`${fieldName} must be of type ${rule.type}`);
        continue;
      }
    }

    // String-specific validations
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`${fieldName} must be at least ${rule.minLength} characters long`);
        continue;
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`${fieldName} must be no more than ${rule.maxLength} characters long`);
        continue;
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${fieldName} has invalid format`);
        continue;
      }

      // Sanitize string
      sanitizedData[rule.field] = value.trim();
    }

    // Number-specific validations
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${fieldName} must be at least ${rule.min}`);
        continue;
      }

      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${fieldName} must be no more than ${rule.max}`);
        continue;
      }

      sanitizedData[rule.field] = value;
    }

    // Array-specific validations
    if (rule.type === 'array' && Array.isArray(value)) {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`${fieldName} must have at least ${rule.minLength} items`);
        continue;
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`${fieldName} must have no more than ${rule.maxLength} items`);
        continue;
      }

      sanitizedData[rule.field] = value;
    }

    // Allowed values validation
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      errors.push(`${fieldName} must be one of: ${rule.allowedValues.join(', ')}`);
      continue;
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        errors.push(`${fieldName}: ${customError}`);
        continue;
      }
    }

    // Add to sanitized data if no type-specific handling occurred
    if (rule.type !== 'string' && sanitizedData[rule.field] === undefined) {
      sanitizedData[rule.field] = value;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  };
};

// Predefined validation rule sets
export const PROJECT_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'name',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 255
  },
  {
    field: 'description',
    type: 'string',
    maxLength: 2000
  },
  {
    field: 'color',
    type: 'string',
    pattern: HEX_COLOR_PATTERN,
    custom: (value) => value && !HEX_COLOR_PATTERN.test(value) ? 'must be a valid hex color (e.g., #FF0000)' : null
  }
];

export const WORKFLOW_GENERATION_RULES: ValidationRule[] = [
  {
    field: 'prompt',
    required: true,
    type: 'string',
    minLength: 10,
    maxLength: 5000
  },
  {
    field: 'project_id',
    required: true,
    type: 'string',
    pattern: UUID_PATTERN
  },
  {
    field: 'name',
    type: 'string',
    maxLength: 255
  },
  {
    field: 'description',
    type: 'string',
    maxLength: 2000
  }
];

export const CHAT_SESSION_RULES: ValidationRule[] = [
  {
    field: 'project_id',
    required: true,
    type: 'string',
    pattern: UUID_PATTERN
  },
  {
    field: 'title',
    type: 'string',
    maxLength: 255
  },
  {
    field: 'workflow_id',
    type: 'string',
    pattern: UUID_PATTERN
  }
];

export const CHAT_MESSAGE_RULES: ValidationRule[] = [
  {
    field: 'message',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 10000
  },
  {
    field: 'agent_type',
    type: 'string',
    allowedValues: ['orchestrator', 'workflow_designer', 'deployment', 'system']
  }
];

export const TELEMETRY_EVENT_RULES: ValidationRule[] = [
  {
    field: 'event_type',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100
  },
  {
    field: 'event_category',
    required: true,
    type: 'string',
    allowedValues: ['auth', 'workflow', 'deployment', 'engagement', 'error', 'performance']
  },
  {
    field: 'project_id',
    type: 'string',
    pattern: UUID_PATTERN
  },
  {
    field: 'workflow_id',
    type: 'string',
    pattern: UUID_PATTERN
  },
  {
    field: 'session_id',
    type: 'string',
    pattern: UUID_PATTERN
  },
  {
    field: 'duration_ms',
    type: 'number',
    min: 0
  },
  {
    field: 'success',
    type: 'boolean'
  },
  {
    field: 'error_message',
    type: 'string',
    maxLength: 1000
  }
];

// Workflow JSON validation
export const validateWorkflowJSON = (workflowJson: any): ValidationResult => {
  const errors: string[] = [];

  if (!workflowJson || typeof workflowJson !== 'object') {
    errors.push('Workflow JSON must be a valid object');
    return { isValid: false, errors };
  }

  // Check required fields
  if (!workflowJson.name || typeof workflowJson.name !== 'string') {
    errors.push('Workflow must have a name');
  }

  if (!workflowJson.nodes || !Array.isArray(workflowJson.nodes)) {
    errors.push('Workflow must have a nodes array');
  } else if (workflowJson.nodes.length === 0) {
    errors.push('Workflow must have at least one node');
  }

  if (!workflowJson.connections || typeof workflowJson.connections !== 'object') {
    errors.push('Workflow must have a connections object');
  }

  // Validate nodes
  if (Array.isArray(workflowJson.nodes)) {
    for (let i = 0; i < workflowJson.nodes.length; i++) {
      const node = workflowJson.nodes[i];
      
      if (!node.name || typeof node.name !== 'string') {
        errors.push(`Node ${i + 1} must have a name`);
      }
      
      if (!node.type || typeof node.type !== 'string') {
        errors.push(`Node ${i + 1} must have a type`);
      }
      
      if (!node.position || typeof node.position !== 'object' || 
          typeof node.position.x !== 'number' || 
          typeof node.position.y !== 'number') {
        errors.push(`Node ${i + 1} must have valid position coordinates`);
      }
    }
  }

  // Check for trigger nodes
  if (Array.isArray(workflowJson.nodes)) {
    const hasTrigger = workflowJson.nodes.some((node: any) => 
      node.type && (
        node.type.includes('webhook') ||
        node.type.includes('cron') ||
        node.type.includes('manual') ||
        node.type.includes('start')
      )
    );
    
    if (!hasTrigger) {
      errors.push('Workflow should have at least one trigger node (webhook, cron, manual, or start)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? workflowJson : undefined
  };
};

// Generic ID validation
export const validateUUID = (id: string, fieldName: string = 'ID'): ValidationResult => {
  if (!id || typeof id !== 'string') {
    return {
      isValid: false,
      errors: [`${fieldName} is required and must be a string`]
    };
  }

  if (!UUID_PATTERN.test(id)) {
    return {
      isValid: false,
      errors: [`${fieldName} must be a valid UUID`]
    };
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: { [fieldName.toLowerCase().replace(' ', '_')]: id }
  };
};

// Pagination parameters validation
export const validatePaginationParams = (searchParams: URLSearchParams): {
  limit: number;
  offset: number;
  errors: string[];
} => {
  const errors: string[] = [];
  let limit = 20; // default
  let offset = 0; // default

  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  if (limitParam) {
    const parsedLimit = parseInt(limitParam);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      errors.push('Limit must be a positive integer');
    } else if (parsedLimit > 1000) {
      errors.push('Limit cannot exceed 1000');
    } else {
      limit = parsedLimit;
    }
  }

  if (offsetParam) {
    const parsedOffset = parseInt(offsetParam);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      errors.push('Offset must be a non-negative integer');
    } else {
      offset = parsedOffset;
    }
  }

  return { limit, offset, errors };
};

// Sanitize HTML and prevent XSS
export const sanitizeHTML = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[^\w\s\-_.@#$%&*()+={}[\]:;"'|\\?/~`!,]/g, ''); // Keep only safe characters
};

// Validate and sanitize file upload data
export const validateFileUpload = (
  data: any,
  options: {
    maxSizeBytes?: number;
    allowedTypes?: string[];
    requiredFields?: string[];
  } = {}
): ValidationResult => {
  const errors: string[] = [];
  const { maxSizeBytes = 5 * 1024 * 1024, allowedTypes = ['image/png', 'image/jpeg', 'image/gif'] } = options;

  if (!data.file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }

  if (data.file.size > maxSizeBytes) {
    errors.push(`File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
  }

  if (!allowedTypes.includes(data.file.type)) {
    errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};