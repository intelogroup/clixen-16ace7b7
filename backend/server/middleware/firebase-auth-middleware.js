const { verifyIdToken } = require('../services/auth/firebase-auth-service');

/**
 * Firebase Auth Middleware for Express
 * Protects routes by verifying Firebase ID tokens
 */

/**
 * Middleware to verify Firebase ID token
 * Expects token in Authorization header: "Bearer <token>"
 */
async function authenticateUser(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided. Include token in Authorization header as "Bearer <token>"'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify token with revocation check enabled
    const decodedToken = await verifyIdToken(idToken, true);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Handle specific error cases
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has been revoked. Please sign in again.',
        code: 'TOKEN_REVOKED'
      });
    }
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Optional authentication middleware
 * Continues even if token is invalid, but attaches user if valid
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await verifyIdToken(idToken, true);
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      };
    }
  } catch (error) {
    // Silent fail - continue without user
    console.log('Optional auth failed, continuing without user:', error.code || error.message);
  }
  
  next();
}

/**
 * Middleware to check if user has specific role
 * Must be used after authenticateUser middleware
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!req.user[role]) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${role}' required`
      });
    }

    next();
  };
}

/**
 * Middleware to require verified email
 * Must be used after authenticateUser middleware
 * Use this for sensitive operations like calendar access, payments, etc.
 */
function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Email verification required. Please verify your email address to access this feature.',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
}

module.exports = {
  authenticateUser,
  optionalAuth,
  requireRole,
  requireVerifiedEmail
};
