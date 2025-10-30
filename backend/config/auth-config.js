const { auth } = require('express-openid-connect');
const { createOrUpdateUser, getUserById } = require('../server/services/auth/user-service');
require('dotenv').config();

/**
 * Auth0 Configuration Middleware
 * Sets up Auth0 authentication for Express app
 */

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SESSION_SECRET || 'a-long-random-string-for-session-secret',
  baseURL: process.env.APP_URL || 'http://localhost:3000',
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  authorizationParams: {
    response_type: 'code',
    scope: 'openid profile email',
    audience: process.env.AUTH0_AUDIENCE || undefined
  },
  routes: {
    callback: '/callback',
    login: '/login',
    logout: '/logout'
  }
};

/**
 * Initialize Auth0 middleware
 * @param {Express.Application} app - Express app instance
 */
function initializeAuth(app) {
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID) {
    console.warn('⚠️  Auth0 credentials not configured. Authentication disabled.');
    console.warn('   Set AUTH0_DOMAIN and AUTH0_CLIENT_ID in .env file');
    return;
  }

  // Apply Auth0 middleware
  app.use(auth(config));

  console.log('✅ Auth0 authentication initialized');
}

/**
 * Middleware to require authentication
 * Use this to protect routes
 */
function requireAuth(req, res, next) {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource' 
    });
  }
  next();
}

/**
 * Middleware to sync Auth0 user with Firestore
 * Call this after authentication to ensure user exists in database
 */
async function syncUserMiddleware(req, res, next) {
  if (req.oidc.isAuthenticated()) {
    try {
      const auth0User = req.oidc.user;
      const user = await createOrUpdateUser(auth0User);
      req.user = user; // Attach user to request
    } catch (error) {
      console.error('Error syncing user:', error);
      // Continue anyway - don't block the request
    }
  }
  next();
}

/**
 * Get current user profile
 */
async function getCurrentUser(req, res) {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const auth0User = req.oidc.user;
    const user = await getUserById(auth0User.sub);
    
    if (!user) {
      // Create user if doesn't exist
      const newUser = await createOrUpdateUser(auth0User);
      return res.json(newUser);
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
}

module.exports = {
  initializeAuth,
  requireAuth,
  syncUserMiddleware,
  getCurrentUser,
  config
};
