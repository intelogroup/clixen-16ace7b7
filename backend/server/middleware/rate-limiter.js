/**
 * Rate Limiting Middleware
 * 
 * Implements rate limiting for API endpoints to prevent abuse and brute-force attacks.
 * Uses express-rate-limit and express-slow-down for tiered protection.
 * 
 * @module middleware/rate-limiter
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

/**
 * General API Rate Limiter
 * 
 * Applied to all API routes for general protection.
 * Limits: 100 requests per 15 minutes per IP
 * 
 * @constant {Object}
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip successful requests that are below limit
  skipSuccessfulRequests: false,
  // Skip failed requests (4xx, 5xx) - optional, set to true to only count successful requests
  skipFailedRequests: false,
  // Custom handler for when limit is exceeded
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });
  }
});

/**
 * Authentication Rate Limiter
 * 
 * Stricter limits for authentication endpoints to prevent brute-force attacks.
 * Limits: 5 requests per 15 minutes per IP
 * 
 * Use this for:
 * - Login attempts
 * - Registration
 * - Password reset
 * - Token refresh (if exposed as endpoint)
 * 
 * @constant {Object}
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (req, res) => {
    console.warn(`Auth rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'You have been temporarily locked out due to too many failed attempts. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });
  }
});

/**
 * Speed Limiter (Progressive Delay)
 * 
 * Slows down requests instead of blocking them entirely.
 * Applies progressive delays after threshold is reached.
 * 
 * Use this for less critical endpoints where you want to slow down
 * heavy users without blocking them completely.
 * 
 * @constant {Object}
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: (used, req) => {
    // Progressive delay: 100ms * requests over threshold
    const delayMultiplier = used - 50;
    return delayMultiplier * 100;
  },
  maxDelayMs: 5000 // Maximum delay of 5 seconds
});

/**
 * WebSocket Connection Rate Limiter
 * 
 * Limits WebSocket connection attempts to prevent connection flooding.
 * Limits: 10 connection attempts per 5 minutes per IP
 * 
 * @constant {Object}
 */
const wsConnectionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 connection attempts per windowMs
  message: {
    error: 'Too many connection attempts, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`WebSocket connection rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many connection attempts',
      message: 'You have exceeded the connection rate limit. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });
  }
});

/**
 * Calendar API Rate Limiter
 * 
 * Moderate limits for calendar operations to prevent excessive Google Calendar API usage.
 * Limits: 30 requests per 15 minutes per IP
 * 
 * @constant {Object}
 */
const calendarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 calendar operations per windowMs
  message: {
    error: 'Too many calendar requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Calendar rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many calendar requests',
      message: 'You have exceeded the calendar operation rate limit. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });
  }
});

/**
 * AI Chat Rate Limiter
 * 
 * Limits for AI conversation endpoints to control Gemini API usage and costs.
 * Limits: 50 messages per 15 minutes per IP
 * 
 * @constant {Object}
 */
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 chat messages per windowMs
  message: {
    error: 'Too many chat messages, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Chat rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many chat messages',
      message: 'You have exceeded the chat message rate limit. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  speedLimiter,
  wsConnectionLimiter,
  calendarLimiter,
  chatLimiter
};
