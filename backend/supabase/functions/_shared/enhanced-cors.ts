// Enhanced CORS headers for Supabase Edge Functions with security improvements

// Environment-specific CORS configuration
const isDevelopment = Deno.env.get('ENVIRONMENT') !== 'production';
const allowedOrigins = isDevelopment 
  ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000']
  : ['https://clixen.ai', 'https://www.clixen.ai', 'https://app.clixen.ai'];

// Dynamic CORS headers based on origin
export const getCorsHeaders = (origin?: string): Record<string, string> => {
  // In development, allow all origins. In production, check allowlist.
  const allowOrigin = isDevelopment 
    ? origin || '*'
    : (origin && allowedOrigins.includes(origin)) ? origin : 'null';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-correlation-id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'x-ratelimit-remaining, x-ratelimit-reset, x-processing-time',
  };
};

// Enhanced security headers
export const getSecurityHeaders = (nonce?: string): Record<string, string> => {
  const cspNonce = nonce ? `'nonce-${nonce}'` : "'unsafe-inline'";
  
  return {
    // Content Security Policy - Strict policy for XSS prevention
    'Content-Security-Policy': [
      `default-src 'self'`,
      `script-src 'self' ${cspNonce} 'strict-dynamic' https://cdn.jsdelivr.net https://unpkg.com`,
      `style-src 'self' ${cspNonce} https://fonts.googleapis.com`,
      `img-src 'self' data: https: blob:`,
      `font-src 'self' https://fonts.gstatic.com`,
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `upgrade-insecure-requests`
    ].join('; '),
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // XSS Protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // HTTP Strict Transport Security (HSTS)
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    
    // Permissions Policy (formerly Feature Policy)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()'
    ].join(', '),
    
    // Prevent caching of sensitive responses
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    
    // Custom security headers
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  };
};

// Combined CORS and security headers
export const getAllSecurityHeaders = (origin?: string, nonce?: string): Record<string, string> => {
  return {
    ...getCorsHeaders(origin),
    ...getSecurityHeaders(nonce)
  };
};

// Helper to check if origin is allowed
export const isOriginAllowed = (origin: string): boolean => {
  if (isDevelopment) return true;
  return allowedOrigins.includes(origin);
};

// CSP violation reporting endpoint
export const CSP_REPORT_URI = '/api/csp-report';

// Legacy exports for backward compatibility
export const corsHeaders = getCorsHeaders();