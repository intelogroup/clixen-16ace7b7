/**
 * Authentication Routes
 * 
 * OAuth flow for Google Calendar integration
 */

const express = require('express');
const router = express.Router();
const protectedRouter = express.Router();
const authController = require('../controllers/authController');

// Public routes
// Start OAuth flow
router.get('/auth', authController.startAuth);

// OAuth callback from Google
router.get('/api/auth/callback/google', authController.handleCallback);

// Logout
router.get('/logout', authController.logout);

// Protected routes (require Firebase auth)
const { requireVerifiedEmail } = require('../../server/middleware/firebase-auth-middleware');

// Sync calendar tokens from Firebase sign-in (requires email verification)
protectedRouter.post('/api/auth/sync-calendar', requireVerifiedEmail, authController.syncCalendarTokens);

module.exports = { 
    authRoutes: router,
    protectedAuthRoutes: protectedRouter
};
