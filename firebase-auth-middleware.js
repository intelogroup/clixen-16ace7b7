const { verifyIdToken } = require('./firebase-auth-service');

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

    // Verify token
    const decodedToken = await verifyIdToken(idToken);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
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
      const decodedToken = await verifyIdToken(idToken);
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      };
    }
  } catch (error) {
    // Silent fail - continue without user
    console.log('Optional auth failed, continuing without user');
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

module.exports = {
  authenticateUser,
  optionalAuth,
  requireRole
};
