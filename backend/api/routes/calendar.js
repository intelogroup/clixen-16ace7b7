/**
 * Calendar Routes
 * 
 * Calendar status and configuration
 */

const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

// Check calendar connection status (PROTECTED)
router.get('/api/calendar-status', calendarController.getCalendarStatus);

module.exports = router;
