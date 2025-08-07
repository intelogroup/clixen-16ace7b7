import { corsHeaders } from './cors.ts';
import { AuthUser } from './auth.ts';

// Rate limiting configuration per user tier
export interface RateLimitConfig {
  requests_per_minute: number;
  requests_per_hour: number;
  burst_limit: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    requests_per_minute: 30,
    requests_per_hour: 500,
    burst_limit: 50,
  },
  pro: {
    requests_per_minute: 100,
    requests_per_hour: 2000,
    burst_limit: 150,
  },
  enterprise: {
    requests_per_minute: 300,
    requests_per_hour: 10000,
    burst_limit: 500,
  },
};

// In-memory rate limiting cache (upgrade to Redis for production scaling)
const rateLimitCache = new Map<string, { 
  count: number; 
  hourlyCount: number;
  resetTime: number; 
  hourlyResetTime: number;
  burst: number; 
}>();

// Clean up expired rate limit entries
const cleanupRateLimitCache = (): void => {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  for (const [key, value] of rateLimitCache.entries()) {
    if (now >= value.resetTime && now >= value.hourlyResetTime) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => rateLimitCache.delete(key));
  
  if (expiredKeys.length > 0) {
    console.log(`🧹 [RATE-LIMIT] Cleaned up ${expiredKeys.length} expired entries`);
  }
};

// Check rate limits for user
export const checkRateLimit = (
  userId: string, 
  tier: string = 'free'
): { 
  allowed: boolean; 
  resetTime: number; 
  remaining: number;
  limits: RateLimitConfig;
} => {
  const limits = RATE_LIMITS[tier] || RATE_LIMITS.free;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const hourlyWindowMs = 60 * 60 * 1000; // 1 hour window
  
  const minuteKey = `${userId}:${Math.floor(now / windowMs)}`;
  const hourKey = `${userId}:${Math.floor(now / hourlyWindowMs)}`;
  
  // Cleanup periodically (10% chance)
  if (Math.random() < 0.1) {
    cleanupRateLimitCache();
  }
  
  const current = rateLimitCache.get(minuteKey) || {
    count: 0,
    hourlyCount: 0,
    resetTime: now + windowMs,
    hourlyResetTime: now + hourlyWindowMs,
    burst: 0
  };
  
  // Get hourly count from separate tracking
  const hourlyData = rateLimitCache.get(hourKey);
  if (hourlyData) {
    current.hourlyCount = hourlyData.hourlyCount;
  }
  
  // Check minute limits
  const minuteLimitExceeded = current.count >= limits.requests_per_minute;
  const hourlyLimitExceeded = current.hourlyCount >= limits.requests_per_hour;
  const burstLimitExceeded = current.burst >= limits.burst_limit;
  
  if ((minuteLimitExceeded && burstLimitExceeded) || hourlyLimitExceeded) {
    return { 
      allowed: false, 
      resetTime: hourlyLimitExceeded ? current.hourlyResetTime : current.resetTime,
      remaining: 0,
      limits
    };
  }
  
  // Update counters
  current.count++;
  current.hourlyCount++;
  
  if (current.count > limits.requests_per_minute) {
    current.burst++;
  }
  
  rateLimitCache.set(minuteKey, current);
  rateLimitCache.set(hourKey, { ...current, count: 0, resetTime: now + windowMs });
  
  const remaining = Math.max(0, limits.requests_per_minute - current.count);
  
  return { 
    allowed: true, 
    resetTime: current.resetTime,
    remaining,
    limits
  };
};

// Security headers for production
export const getSecurityHeaders = (): Record<string, string> => ({
  ...corsHeaders,
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
});

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove basic HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
};

// Validate request body size
export const validateRequestSize = (body: string, maxSizeKB: number = 100): boolean => {
  const sizeKB = new Blob([body]).size / 1024;
  return sizeKB <= maxSizeKB;
};

// Request validation middleware
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateCommonFields = (data: any): ValidationResult => {
  const errors: string[] = [];
  
  // Check for required fields based on context
  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      errors.push('Name must be a string');
    } else if (data.name.length === 0) {
      errors.push('Name cannot be empty');
    } else if (data.name.length > 255) {
      errors.push('Name must be 255 characters or less');
    }
  }
  
  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      errors.push('Description must be a string');
    } else if (data.description.length > 2000) {
      errors.push('Description must be 2000 characters or less');
    }
  }
  
  if (data.project_id !== undefined) {
    if (typeof data.project_id !== 'string') {
      errors.push('Project ID must be a string');
    } else if (!data.project_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      errors.push('Project ID must be a valid UUID');
    }
  }
  
  if (data.workflow_id !== undefined) {
    if (typeof data.workflow_id !== 'string') {
      errors.push('Workflow ID must be a string');
    } else if (!data.workflow_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      errors.push('Workflow ID must be a valid UUID');
    }
  }
  
  if (data.session_id !== undefined) {
    if (typeof data.session_id !== 'string') {
      errors.push('Session ID must be a string');
    } else if (!data.session_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      errors.push('Session ID must be a valid UUID');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Extract client information for logging
export const extractClientInfo = (req: Request): {
  user_agent?: string;
  ip_address?: string;
  referer?: string;
  country?: string;
} => ({
  user_agent: req.headers.get('user-agent') || undefined,
  ip_address: req.headers.get('cf-connecting-ip') || 
              req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
              req.headers.get('x-real-ip') || 
              undefined,
  referer: req.headers.get('referer') || undefined,
  country: req.headers.get('cf-ipcountry') || undefined,
});

// API response helper
export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  metadata?: {
    processing_time?: number;
    rate_limit?: {
      remaining: number;
      reset_time: number;
      tier: string;
    };
  };
}

export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string,
  metadata?: any
): StandardApiResponse<T> => ({
  success,
  data,
  message,
  error,
  timestamp: new Date().toISOString(),
  metadata
});

// Error response helper
export const createErrorResponse = (
  status: number,
  error: string,
  message?: string,
  processingTime?: number
): Response => {
  const body = createApiResponse(
    false,
    undefined,
    message || (status >= 500 ? 'An unexpected error occurred. Please try again.' : error),
    error,
    processingTime ? { processing_time: processingTime } : undefined
  );

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...getSecurityHeaders(),
        'Content-Type': 'application/json',
        'X-Processing-Time': (processingTime || 0).toString()
      }
    }
  );
};

// Success response helper
export const createSuccessResponse = <T>(
  data: T,
  message?: string,
  statusCode = 200,
  processingTime?: number,
  rateLimitInfo?: { remaining: number; reset_time: number; tier: string }
): Response => {
  const metadata: any = {};
  
  if (processingTime) {
    metadata.processing_time = processingTime;
  }
  
  if (rateLimitInfo) {
    metadata.rate_limit = rateLimitInfo;
  }

  const body = createApiResponse(true, data, message, undefined, metadata);

  const headers = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json',
    'X-Processing-Time': (processingTime || 0).toString()
  };

  if (rateLimitInfo) {
    headers['X-RateLimit-Remaining'] = rateLimitInfo.remaining.toString();
    headers['X-RateLimit-Reset'] = rateLimitInfo.reset_time.toString();
    headers['X-RateLimit-Tier'] = rateLimitInfo.tier;
  }

  return new Response(JSON.stringify(body), { status: statusCode, headers });
};

// Middleware composition helper
export const applyMiddleware = async (
  req: Request,
  user: AuthUser,
  options: {
    requireRateLimit?: boolean;
    maxRequestSizeKB?: number;
    requireTier?: 'pro' | 'enterprise';
  } = {}
): Promise<{
  success: boolean;
  error?: Response;
  rateLimitInfo?: { remaining: number; reset_time: number; tier: string };
}> => {
  try {
    // Check request size if body exists
    if (options.maxRequestSizeKB && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        const body = await req.clone().text();
        if (!validateRequestSize(body, options.maxRequestSizeKB)) {
          return {
            success: false,
            error: createErrorResponse(413, 'Request too large', `Request body must be ${options.maxRequestSizeKB}KB or less`)
          };
        }
      } catch (sizeError) {
        console.warn('Failed to validate request size:', sizeError);
      }
    }

    // Check tier requirements
    if (options.requireTier) {
      const tierLevels = { free: 0, pro: 1, enterprise: 2 };
      const userLevel = tierLevels[user.tier || 'free'];
      const requiredLevel = tierLevels[options.requireTier];
      
      if (userLevel < requiredLevel) {
        return {
          success: false,
          error: createErrorResponse(
            403, 
            'Insufficient tier', 
            `This feature requires ${options.requireTier} tier or higher. Please upgrade your account.`
          )
        };
      }
    }

    // Apply rate limiting
    let rateLimitInfo;
    if (options.requireRateLimit !== false) {
      const rateLimitResult = checkRateLimit(user.id, user.tier);
      
      rateLimitInfo = {
        remaining: rateLimitResult.remaining,
        reset_time: rateLimitResult.resetTime,
        tier: user.tier || 'free'
      };
      
      if (!rateLimitResult.allowed) {
        const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
        
        const headers = {
          ...getSecurityHeaders(),
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'X-RateLimit-Tier': user.tier || 'free'
        };

        return {
          success: false,
          error: new Response(
            JSON.stringify(createApiResponse(
              false,
              undefined,
              'Rate limit exceeded. Please wait before trying again.',
              'Rate limit exceeded',
              {
                retry_after: retryAfter,
                rate_limit: rateLimitInfo
              }
            )),
            { status: 429, headers }
          )
        };
      }
    }

    return { success: true, rateLimitInfo };

  } catch (error) {
    console.error('Middleware error:', error);
    return {
      success: false,
      error: createErrorResponse(500, 'Internal server error', 'Middleware processing failed')
    };
  }
};