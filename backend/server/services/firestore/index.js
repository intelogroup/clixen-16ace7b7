/**
 * Firestore Services Index
 * Central export for all Firestore data persistence services
 */

const userSettings = require('./userSettings');
const conversationHistory = require('./conversationHistory');

module.exports = {
    userSettings,
    conversationHistory
};
