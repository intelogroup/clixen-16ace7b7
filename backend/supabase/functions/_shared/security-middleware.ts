/**
 * Comprehensive Security Middleware for Supabase Edge Functions
 * Handles authentication, authorization, rate limiting, and security monitoring
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getAllSecurityHeaders, isOriginAllowed } from './enhanced-cors.ts';
import { AuthUser, authenticate, verifyOwnership, logAuthEvent } from './auth.ts';
import { 
  checkRateLimit, 
  sanitizeInput, 
  validateRequestSize, 
  extractClientInfo,
  createErrorResponse,
  createSuccessResponse,
  type StandardApiResponse 
} from './middleware.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export interface SecurityConfig {
  requireAuth: boolean;
  requireTier?: 'pro' | 'enterprise';
  requireRateLimit: boolean;
  maxRequestSizeKB: number;
  requireOwnership?: {
    resourceType: 'project' | 'workflow' | 'session';
    resourceIdField: string;
    projectIdField?: string;
  };
  allowedMethods: string[];
  requireHTTPS: boolean;
  enableCSRFProtection: boolean;
  enableSecurityLogging: boolean;
}

export interface SecurityContext {
  user?: AuthUser;
  clientInfo: ReturnType<typeof extractClientInfo>;
  requestId: string;
  startTime: number;
  rateLimitInfo?: {
    remaining: number;
    reset_time: number;
    tier: string;
  };
}

export interface SecurityMiddlewareResult {
  success: boolean;
  response?: Response;
  context?: SecurityContext;
  error?: string;
}

// Rate limiting cache with Redis-like interface for future upgrade
class InMemoryCache {
  private cache = new Map<string, any>();
  private ttl = new Map<string, number>();

  set(key: string, value: any, ttlSeconds: number = 3600): void {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlSeconds * 1000);
  }

  get(key: string): any {
    const expiry = this.ttl.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return undefined;
    }
    return this.cache.get(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, expiry] of this.ttl.entries()) {
      if (now > expiry) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.ttl.delete(key);
    });
  }
}

const cache = new InMemoryCache();

// Cleanup cache periodically (10% chance on each request)
const maybeCleanupCache = () => {
  if (Math.random() < 0.1) {
    cache.cleanup();
  }
};

/**
 * Comprehensive security middleware
 */
export async function securityMiddleware(
  request: Request,
  config: Partial<SecurityConfig> = {}
): Promise<SecurityMiddlewareResult> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  // Default configuration
  const finalConfig: SecurityConfig = {
    requireAuth: true,
    requireRateLimit: true,
    maxRequestSizeKB: 100,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    requireHTTPS: Deno.env.get('ENVIRONMENT') === 'production',
    enableCSRFProtection: true,
    enableSecurityLogging: true,
    ...config
  };

  try {
    // Periodic cache cleanup
    maybeCleanupCache();

    // Extract client information
    const clientInfo = extractClientInfo(request);
    const origin = request.headers.get('origin');
    const method = request.method;
    const url = new URL(request.url);

    // Security Context
    const context: SecurityContext = {
      clientInfo,
      requestId,
      startTime
    };

    // 1. HTTPS Enforcement
    if (finalConfig.requireHTTPS && url.protocol !== 'https:') {
      await logSecurityEvent('insecure_connection', {
        protocol: url.protocol,
        host: url.host
      }, context);
      
      return {
        success: false,
        response: createErrorResponse(
          400,
          'HTTPS required',
          'This endpoint requires a secure HTTPS connection'
        )
      };
    }

    // 2. Method Validation
    if (!finalConfig.allowedMethods.includes(method)) {
      await logSecurityEvent('method_not_allowed', {
        method,
        allowed_methods: finalConfig.allowedMethods
      }, context);
      
      return {
        success: false,
        response: new Response('Method Not Allowed', {
          status: 405,
          headers: {
            ...getAllSecurityHeaders(origin),
            'Allow': finalConfig.allowedMethods.join(', ')
          }
        })
      };
    }

    // 3. OPTIONS Pre-flight Handling
    if (method === 'OPTIONS') {
      return {
        success: true,
        response: new Response(null, {
          status: 204,
          headers: getAllSecurityHeaders(origin)
        }),
        context
      };
    }

    // 4. Origin Validation
    if (origin && !isOriginAllowed(origin)) {
      await logSecurityEvent('origin_not_allowed', {
        origin,
        allowed_origins: Deno.env.get('ENVIRONMENT') === 'production' ? 'production-only' : 'development-only'
      }, context);
      
      return {
        success: false,
        response: createErrorResponse(
          403,
          'Origin not allowed',
          'Your origin is not authorized to access this resource'
        )
      };
    }

    // 5. Request Size Validation
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const body = await request.clone().text();
        if (!validateRequestSize(body, finalConfig.maxRequestSizeKB)) {
          await logSecurityEvent('request_too_large', {
            size_kb: Math.round(new Blob([body]).size / 1024),
            max_size_kb: finalConfig.maxRequestSizeKB
          }, context);
          
          return {
            success: false,
            response: createErrorResponse(
              413,
              'Request too large',
              `Request body must be ${finalConfig.maxRequestSizeKB}KB or less`
            )
          };
        }
      } catch (sizeError) {
        console.warn('Failed to validate request size:', sizeError);
      }
    }

    // 6. CSRF Protection
    if (finalConfig.enableCSRFProtection && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfToken = request.headers.get('x-csrf-token');
      const referer = request.headers.get('referer');
      
      // Simple CSRF check - in production, use proper CSRF tokens
      if (origin && referer) {
        const originHost = new URL(origin).host;
        const refererHost = new URL(referer).host;
        
        if (originHost !== refererHost) {
          await logSecurityEvent('csrf_attempt', {
            origin_host: originHost,
            referer_host: refererHost
          }, context);
          
          return {
            success: false,
            response: createErrorResponse(
              403,
              'CSRF validation failed',
              'Cross-site request forgery detected'
            )
          };
        }
      }
    }

    // 7. Authentication
    let user: AuthUser | undefined;
    if (finalConfig.requireAuth) {
      const authResult = await authenticate(request);
      
      if (authResult.error || !authResult.user) {
        await logSecurityEvent('auth_failed', {
          error: authResult.error,
          has_auth_header: !!request.headers.get('authorization')
        }, context);
        
        return {
          success: false,
          response: createErrorResponse(
            401,
            'Authentication required',
            authResult.error || 'Please provide valid authentication credentials'
          )
        };
      }
      
      user = authResult.user;
      context.user = user;
      
      // Log successful authentication
      await logAuthEvent('auth_success', user.id, {
        tier: user.tier,
        email: user.email
      });
    }

    // 8. Tier Requirements
    if (finalConfig.requireTier && user) {
      const tierLevels = { free: 0, pro: 1, enterprise: 2 };
      const userLevel = tierLevels[user.tier || 'free'];
      const requiredLevel = tierLevels[finalConfig.requireTier];
      
      if (userLevel < requiredLevel) {
        await logSecurityEvent('insufficient_tier', {
          user_tier: user.tier,
          required_tier: finalConfig.requireTier
        }, context);
        
        return {
          success: false,
          response: createErrorResponse(
            403,
            'Insufficient tier',
            `This feature requires ${finalConfig.requireTier} tier or higher`
          )
        };
      }
    }

    // 9. Rate Limiting
    if (finalConfig.requireRateLimit && user) {
      const rateLimitResult = checkRateLimit(user.id, user.tier);
      
      context.rateLimitInfo = {
        remaining: rateLimitResult.remaining,
        reset_time: rateLimitResult.resetTime,
        tier: user.tier || 'free'
      };
      
      if (!rateLimitResult.allowed) {
        const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
        
        await logSecurityEvent('rate_limit_exceeded', {
          user_tier: user.tier,
          retry_after: retryAfter
        }, context);
        
        const headers = {
          ...getAllSecurityHeaders(origin),
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'X-RateLimit-Tier': user.tier || 'free'
        };

        return {
          success: false,
          response: new Response(
            JSON.stringify({
              success: false,
              error: 'Rate limit exceeded',
              message: 'Too many requests. Please wait before trying again.',
              metadata: {
                retry_after: retryAfter,
                rate_limit: context.rateLimitInfo
              },
              timestamp: new Date().toISOString()
            }),
            { status: 429, headers }
          )
        };
      }
    }

    // 10. Resource Ownership Verification
    if (finalConfig.requireOwnership && user) {
      const ownership = finalConfig.requireOwnership;
      let resourceId: string | undefined;
      let projectId: string | undefined;

      // Try to get resource ID from URL params or request body
      if (method === 'GET' || method === 'DELETE') {
        const pathSegments = url.pathname.split('/').filter(Boolean);
        resourceId = pathSegments[pathSegments.length - 1];
      } else {
        try {
          const body = await request.clone().json();
          resourceId = body[ownership.resourceIdField];
          if (ownership.projectIdField) {
            projectId = body[ownership.projectIdField];
          }
        } catch {
          // Body not JSON or missing fields
        }
      }

      if (resourceId) {
        const hasAccess = await verifyOwnership(
          user.id,
          ownership.resourceType,
          resourceId,
          projectId
        );

        if (!hasAccess) {
          await logSecurityEvent('unauthorized_access', {
            resource_type: ownership.resourceType,
            resource_id: resourceId,
            user_id: user.id
          }, context);
          
          return {
            success: false,
            response: createErrorResponse(
              403,
              'Access denied',
              'You do not have permission to access this resource'
            )
          };
        }
      }
    }

    // Security checks passed
    return {
      success: true,
      context
    };

  } catch (error) {
    console.error('Security middleware error:', error);
    
    return {
      success: false,
      response: createErrorResponse(
        500,
        'Security check failed',
        'An error occurred while processing security checks'
      ),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Log security events
 */
async function logSecurityEvent(
  eventType: string,
  details: Record<string, any>,
  context: SecurityContext
): Promise<void> {
  if (!Deno.env.get('ENABLE_SECURITY_LOGGING')) return;

  try {
    await supabase.from('telemetry_events').insert({
      user_id: context.user?.id || null,
      event_type: `security_${eventType}`,
      event_category: 'security',
      event_data: {
        ...details,
        request_id: context.requestId,
        client_info: context.clientInfo,
        timestamp: new Date().toISOString()
      },
      success: false // Security events are generally failures/warnings
    });
  } catch (logError) {
    console.warn('Failed to log security event:', logError);
  }
}

/**
 * Create security-aware response wrapper
 */
export function createSecurityResponse<T>(
  data: T,
  context: SecurityContext,
  statusCode = 200,
  message?: string
): Response {
  const processingTime = Date.now() - context.startTime;
  const origin = context.clientInfo.referer ? new URL(context.clientInfo.referer).origin : undefined;
  
  return createSuccessResponse(
    data,
    message,
    statusCode,
    processingTime,
    context.rateLimitInfo
  );
}

/**
 * Input sanitization middleware
 */
export function sanitizeRequestBody(body: any): any {
  if (typeof body !== 'object' || body === null) {
    return body;
  }

  const sanitized: any = Array.isArray(body) ? [] : {};

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value, {
        maxLength: 10000,
        preventScripts: true
      });
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * IP-based rate limiting for additional security
 */
export function checkIPRateLimit(ip: string, windowMinutes = 15, maxRequests = 1000): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const key = `ip_rate_limit:${ip}`;
  const windowMs = windowMinutes * 60 * 1000;
  const now = Date.now();
  
  let data = cache.get(key);
  if (!data) {
    data = { count: 0, resetTime: now + windowMs };
  }
  
  if (now >= data.resetTime) {
    data = { count: 0, resetTime: now + windowMs };
  }
  
  data.count++;
  cache.set(key, data, Math.ceil(windowMs / 1000));
  
  return {
    allowed: data.count <= maxRequests,
    remaining: Math.max(0, maxRequests - data.count),
    resetTime: data.resetTime
  };
}

// Export default configuration presets
export const SECURITY_PRESETS = {
  // Public endpoints (no auth required)
  public: {
    requireAuth: false,
    requireRateLimit: true,
    maxRequestSizeKB: 50,
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    enableSecurityLogging: true
  },
  
  // Standard authenticated endpoints
  standard: {
    requireAuth: true,
    requireRateLimit: true,
    maxRequestSizeKB: 100,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    enableSecurityLogging: true
  },
  
  // Pro tier features
  pro: {
    requireAuth: true,
    requireTier: 'pro' as const,
    requireRateLimit: true,
    maxRequestSizeKB: 500,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    enableSecurityLogging: true
  },
  
  // Enterprise features
  enterprise: {
    requireAuth: true,
    requireTier: 'enterprise' as const,
    requireRateLimit: true,
    maxRequestSizeKB: 1000,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    enableSecurityLogging: true
  }
} satisfies Record<string, Partial<SecurityConfig>>;