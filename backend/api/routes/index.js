/**
 * API Routes Index
 * 
 * Central export point for all route modules
 */

const { authRoutes, protectedAuthRoutes } = require('./auth');
const calendarRoutes = require('./calendar');
const chatRoutes = require('./chat');
const audioRoutes = require('./audio');
const configRoutes = require('./config');

module.exports = {
    authRoutes,
    protectedAuthRoutes,
    calendarRoutes,
    chatRoutes,
    audioRoutes,
    configRoutes
};
