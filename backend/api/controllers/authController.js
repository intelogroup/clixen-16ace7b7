/**
 * Authentication Controller
 * 
 * Handles OAuth authentication flow with Google Calendar
 */

const calendarService = require('../../server/services/calendar');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const {
    generateAuthUrl,
    handleOAuthCallback,
    buildOauth2Client
} = calendarService;

const TOKENS_DIR = path.join(__dirname, '../../../tokens');

/**
 * Initiate OAuth flow - redirect to Google consent screen
 */
async function startAuth(req, res) {
    try {
        const authUrl = generateAuthUrl();
        res.redirect(authUrl);
    } catch (err) {
        console.error('Auth start error:', err.message);
        res.status(500).send('Failed to start auth flow');
    }
}

/**
 * Handle OAuth callback from Google
 */
async function handleCallback(req, res) {
    try {
        const code = req.query.code;
        if (!code) {
            return res.status(400).send('Missing code');
        }

        const { tokens, email: userEmail } = await handleOAuthCallback(code);
        req.session.userEmail = userEmail;

        console.log('✅ Saved calendar token for', userEmail);

        // Redirect with success message
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Calendar Connected</title>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
                    .success { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
                    .success h1 { color: #4CAF50; margin: 0 0 20px 0; }
                    .success p { color: #666; margin: 10px 0; }
                    .success button { padding: 12px 24px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-top: 20px; }
                    .success button:hover { background: #357ae8; }
                </style>
            </head>
            <body>
                <div class="success">
                    <h1>✅ Calendar Connected!</h1>
                    <p>Your Google Calendar has been successfully connected.</p>
                    <p>Email: <strong>${userEmail}</strong></p>
                    <button onclick="window.location.href='/'">Return to App</button>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('OAuth callback error:', err.message);
        res.status(500).send('Auth callback failed: ' + err.message);
    }
}

/**
 * Sync calendar tokens from Firebase Google sign-in
 * This allows Firebase auth to also grant calendar access
 */
async function syncCalendarTokens(req, res) {
    try {
        const { accessToken, userEmail } = req.body;
        
        if (!accessToken || !userEmail) {
            return res.status(400).json({ error: 'Missing accessToken or userEmail' });
        }
        
        console.log('📅 Syncing calendar tokens for', userEmail);
        
        // Create OAuth2 client and set credentials
        const oauth2Client = buildOauth2Client();
        oauth2Client.setCredentials({
            access_token: accessToken,
            token_type: 'Bearer',
            scope: 'openid profile email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar'
        });
        
        // Try to get a refresh token by exchanging the access token
        // Note: Firebase doesn't provide refresh tokens, so we'll need the user
        // to use the "Connect Calendar" button for full offline access
        try {
            // Verify the token works by making a test calendar request
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            await calendar.calendarList.list({ maxResults: 1 });
            
            // Save the token (without refresh token - limited lifetime)
            const tokenPath = path.join(TOKENS_DIR, `${userEmail}.json`);
            if (!fs.existsSync(TOKENS_DIR)) {
                fs.mkdirSync(TOKENS_DIR, { recursive: true });
            }
            
            const tokenData = {
                access_token: accessToken,
                token_type: 'Bearer',
                scope: 'openid profile email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar',
                expiry_date: Date.now() + (3600 * 1000) // 1 hour from now (typical Google token lifetime)
            };
            
            fs.writeFileSync(tokenPath, JSON.stringify(tokenData));
            
            console.log('✅ Calendar tokens synced for', userEmail);
            console.log('   ⚠️  Note: No refresh token - will expire in ~1 hour');
            console.log('   💡 User should click "Connect Calendar" for permanent access');
            
            res.json({ 
                success: true, 
                message: 'Calendar tokens synced (temporary)',
                requiresFullAuth: true // Flag to indicate user should do full OAuth flow
            });
        } catch (calendarError) {
            console.error('❌ Calendar API test failed:', calendarError.message);
            res.status(400).json({ 
                error: 'Calendar access verification failed',
                details: calendarError.message,
                requiresFullAuth: true
            });
        }
    } catch (error) {
        console.error('❌ Token sync error:', error.message);
        res.status(500).json({ error: 'Failed to sync calendar tokens' });
    }
}

/**
 * Logout - destroy session
 */
function logout(req, res) {
    req.session.destroy(() => {});
    res.redirect('/');
}

module.exports = {
    startAuth,
    handleCallback,
    syncCalendarTokens,
    logout
};
