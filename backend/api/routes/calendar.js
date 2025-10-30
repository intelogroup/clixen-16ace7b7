/**
 * Calendar Routes
 * 
 * Calendar status and configuration
 * Requires email verification for sensitive operations
 */

const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { requireVerifiedEmail } = require('../../server/middleware/firebase-auth-middleware');

// Check calendar connection status (PROTECTED + EMAIL VERIFIED)
// Requires email verification to prevent abuse from unverified accounts
router.get('/api/calendar-status', requireVerifiedEmail, calendarController.getCalendarStatus);

module.exports = router;
