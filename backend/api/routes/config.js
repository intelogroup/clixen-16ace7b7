/**
 * Configuration API Routes
 * Serves client-side configuration from environment variables
 * NEVER expose sensitive server-side keys
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/config/firebase
 * Returns Firebase configuration for client-side use
 * Firebase API keys for web are designed to be public
 */
router.get('/firebase', (req, res) => {
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };

    // Validate that required fields are present
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        return res.status(500).json({
            error: 'Firebase configuration incomplete. Check server environment variables.'
        });
    }

    res.json(firebaseConfig);
});

/**
 * GET /api/config/app
 * Returns general application configuration
 */
router.get('/app', (req, res) => {
    res.json({
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        features: {
            voiceEnabled: true,
            calendarEnabled: true,
            aiEnabled: !!process.env.GEMINI_API_KEY
        }
    });
});

module.exports = router;
