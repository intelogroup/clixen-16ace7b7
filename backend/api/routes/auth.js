/**
 * Authentication Routes
 * 
 * OAuth flow for Google Calendar integration
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Start OAuth flow
router.get('/auth', authController.startAuth);

// OAuth callback from Google
router.get('/api/auth/callback/google', authController.handleCallback);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
