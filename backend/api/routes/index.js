/**
 * API Routes Index
 * 
 * Central export point for all route modules
 */

const authRoutes = require('./auth');
const calendarRoutes = require('./calendar');
const chatRoutes = require('./chat');
const audioRoutes = require('./audio');

module.exports = {
    authRoutes,
    calendarRoutes,
    chatRoutes,
    audioRoutes
};
