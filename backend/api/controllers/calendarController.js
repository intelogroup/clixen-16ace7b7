/**
 * Calendar Controller
 * 
 * Handles calendar status and configuration
 */

const path = require('path');
const fs = require('fs');

const TOKENS_DIR = path.join(__dirname, '../../../tokens');

/**
 * Check if user has calendar connected
 */
async function getCalendarStatus(req, res) {
    try {
        const userEmail = req.user.email;
        const tokenPath = path.join(TOKENS_DIR, `${userEmail}.json`);
        const connected = fs.existsSync(tokenPath);
        
        res.json({ 
            connected,
            email: userEmail,
            message: connected ? 'Calendar connected' : 'Calendar not connected. Click "Connect Calendar" to authorize.'
        });
    } catch (error) {
        console.error('Error checking calendar status:', error);
        res.status(500).json({ error: 'Failed to check calendar status' });
    }
}

module.exports = {
    getCalendarStatus
};
