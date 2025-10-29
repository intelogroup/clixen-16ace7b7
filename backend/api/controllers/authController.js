/**
 * Authentication Controller
 * 
 * Handles OAuth authentication flow with Google Calendar
 */

const calendarService = require('../../server/services/calendar');

const {
    generateAuthUrl,
    handleOAuthCallback
} = calendarService;

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
 * Logout - destroy session
 */
function logout(req, res) {
    req.session.destroy(() => {});
    res.redirect('/');
}

module.exports = {
    startAuth,
    handleCallback,
    logout
};
