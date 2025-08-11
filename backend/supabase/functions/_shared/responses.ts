import { corsHeaders } from './cors.ts';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ErrorDetails {
  code?: string;
  details?: Record<string, any>;
  hint?: string;
}

// Create success response with consistent format
export function createSuccessResponse<T>(
  data: T, 
  message?: string,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// Create error response with consistent format
export function createErrorResponse(
  error: string | Error | ErrorDetails,
  statusCode: number = 500,
  code?: string
): Response {
  let errorMessage: string;
  let errorCode: string | undefined;
  let details: Record<string, any> | undefined;

  if (typeof error === 'string') {
    errorMessage = error;
    errorCode = code;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorCode = code || 'INTERNAL_ERROR';
    details = { stack: error.stack?.split('\n').slice(0, 3) };
  } else {
    errorMessage = error.code || 'Unknown error';
    errorCode = error.code;
    details = error.details;
  }

  const response: ApiResponse = {
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString(),
    ...(errorCode && { message: `Error code: ${errorCode}` }),
    ...(details && { data: { details } })
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// Handle common HTTP methods and CORS
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

// Create validation error response
export function createValidationErrorResponse(
  field: string, 
  message: string,
  value?: any
): Response {
  return createErrorResponse(
    {
      code: 'VALIDATION_ERROR',
      details: { field, message, value }
    },
    400,
    'VALIDATION_ERROR'
  );
}

// Create authentication error response
export function createAuthErrorResponse(message: string = 'Authentication required'): Response {
  return createErrorResponse(
    {
      code: 'AUTH_ERROR',
      details: { message }
    },
    401,
    'AUTH_ERROR'
  );
}

// Create authorization error response  
export function createAuthzErrorResponse(message: string = 'Access denied'): Response {
  return createErrorResponse(
    {
      code: 'AUTHZ_ERROR',
      details: { message }
    },
    403,
    'AUTHZ_ERROR'
  );
}

// Create not found error response
export function createNotFoundResponse(resource: string, id?: string): Response {
  return createErrorResponse(
    {
      code: 'NOT_FOUND',
      details: { resource, id }
    },
    404,
    'NOT_FOUND'
  );
}

// Create rate limit error response
export function createRateLimitResponse(limit: number, resetTime?: Date): Response {
  return createErrorResponse(
    {
      code: 'RATE_LIMIT_EXCEEDED',
      details: { 
        limit, 
        resetTime: resetTime?.toISOString(),
        message: `Rate limit of ${limit} requests exceeded`
      }
    },
    429,
    'RATE_LIMIT_EXCEEDED'
  );
}