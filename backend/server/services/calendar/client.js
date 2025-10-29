/**
 * Calendar OAuth Client Module
 * Handles OAuth2 authentication and token management for Google Calendar API
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Directory to store per-user tokens
const TOKENS_DIR = path.join(__dirname, '../../../../tokens');
if (!fs.existsSync(TOKENS_DIR)) {
    fs.mkdirSync(TOKENS_DIR, { recursive: true });
}

/**
 * Build OAuth2 client from credentials.json
 * @returns {OAuth2Client} Configured OAuth2 client
 */
function buildOauth2Client() {
    const credentialsPath = path.join(__dirname, '../../../credentials/credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

/**
 * Get authenticated Calendar client for a specific user
 * Handles token loading, validation, and auto-refresh
 * @param {string} userEmail - User email address
 * @returns {Promise<calendar_v3.Calendar>} Authenticated Calendar client
 * @throws {Error} If user not authenticated or token invalid
 */
async function getCalendarClient(userEmail) {
    try {
        if (!userEmail) {
            throw new Error('No user signed in. Please authenticate via /auth');
        }

        const tokenPath = path.join(TOKENS_DIR, `${userEmail}.json`);
        if (!fs.existsSync(tokenPath)) {
            throw new Error(`No token found for ${userEmail}. Please sign in via /auth`);
        }

        const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        const oauth2Client = buildOauth2Client();
        oauth2Client.setCredentials(token);

        // Refresh if expired
        if (token.expiry_date && token.expiry_date < Date.now()) {
            console.log('   🔄 Token expired for', userEmail, 'refreshing...');
            try {
                const { credentials: newToken } = await oauth2Client.refreshAccessToken();
                oauth2Client.setCredentials(newToken);
                fs.writeFileSync(tokenPath, JSON.stringify(newToken));
                console.log('   ✅ Token refreshed successfully for', userEmail);
            } catch (refreshError) {
                console.error('   ❌ Failed to refresh token for', userEmail, refreshError.message);
                throw new Error('Token expired and could not be refreshed. Please re-authenticate via /auth');
            }
        }

        return google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (error) {
        console.error('❌ Failed to load calendar credentials:', error.message);
        throw error;
    }
}

/**
 * Generate OAuth authorization URL for user sign-in
 * @returns {string} Authorization URL
 */
function generateAuthUrl() {
    const oauth2Client = buildOauth2Client();
    const scopes = [
        'openid',
        'profile',
        'email',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes
    });
}

/**
 * Exchange authorization code for tokens and save them
 * @param {string} code - Authorization code from OAuth callback
 * @returns {Promise<{tokens: Object, email: string}>} Tokens and user email
 */
async function handleOAuthCallback(code) {
    if (!code) {
        throw new Error('Missing authorization code');
    }

    const oauth2Client = buildOauth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get token info to extract email
    const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
    const userEmail = tokenInfo.email;
    
    if (!userEmail) {
        throw new Error('Could not determine user email from token');
    }

    // Save token for this user
    const tokenPath = path.join(TOKENS_DIR, `${userEmail}.json`);
    fs.writeFileSync(tokenPath, JSON.stringify(tokens));
    
    console.log('✅ Saved calendar token for', userEmail);

    return { tokens, email: userEmail };
}

/**
 * Check if a user has valid calendar credentials
 * @param {string} userEmail - User email address
 * @returns {boolean} True if user has valid credentials
 */
function hasCredentials(userEmail) {
    if (!userEmail) return false;
    const tokenPath = path.join(TOKENS_DIR, `${userEmail}.json`);
    return fs.existsSync(tokenPath);
}

/**
 * Revoke user's calendar access and delete token
 * @param {string} userEmail - User email address
 * @returns {Promise<void>}
 */
async function revokeAccess(userEmail) {
    const tokenPath = path.join(TOKENS_DIR, `${userEmail}.json`);
    
    if (fs.existsSync(tokenPath)) {
        try {
            const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
            const oauth2Client = buildOauth2Client();
            oauth2Client.setCredentials(token);
            
            // Revoke the token
            if (token.access_token) {
                await oauth2Client.revokeToken(token.access_token);
            }
        } catch (error) {
            console.error('Failed to revoke token:', error.message);
        }
        
        // Delete the token file regardless
        fs.unlinkSync(tokenPath);
        console.log('✅ Revoked access for', userEmail);
    }
}

module.exports = {
    buildOauth2Client,
    getCalendarClient,
    generateAuthUrl,
    handleOAuthCallback,
    hasCredentials,
    revokeAccess
};
