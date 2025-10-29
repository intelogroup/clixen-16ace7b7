const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const url = require('url');
const { exec } = require('child_process');

// If modifying these scopes, delete token.json.
const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar'
];

// The file token.json stores the user's access and refresh tokens
const TOKEN_PATH = path.join(__dirname, 'backend', 'credentials', 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'backend', 'credentials', 'credentials.json');

class OAuthManager {
    constructor() {
        this.oAuth2Client = null;
    }

    async loadCredentials() {
        try {
            const content = await fs.readFile(CREDENTIALS_PATH);
            return JSON.parse(content);
        } catch (error) {
            throw new Error('Error loading credentials.json. Make sure the file exists.');
        }
    }

    async loadSavedToken() {
        try {
            const token = await fs.readFile(TOKEN_PATH);
            return JSON.parse(token);
        } catch (error) {
            return null;
        }
    }

    async saveToken(token) {
        await fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2));
        console.log('✅ Token saved to', TOKEN_PATH);
    }

    async initializeOAuth2Client() {
        const credentials = await this.loadCredentials();
        const { client_secret, client_id, redirect_uris } = credentials.web;
        
        // Use the first redirect URI from credentials
        const redirectUri = redirect_uris[0];
        console.log(`📍 Using redirect URI: ${redirectUri}`);
        
        this.oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirectUri
        );

        return this.oAuth2Client;
    }

    async getAuthenticatedClient() {
        await this.initializeOAuth2Client();
        
        // Check if we have previously stored a token
        const token = await this.loadSavedToken();
        
        if (token) {
            this.oAuth2Client.setCredentials(token);
            console.log('✅ Using saved authentication token');
            
            // Check if token is expired and refresh if needed
            if (this.isTokenExpired(token)) {
                console.log('🔄 Token expired, refreshing...');
                try {
                    const newToken = await this.refreshToken();
                    await this.saveToken(newToken);
                } catch (error) {
                    console.log('⚠️  Token refresh failed, need to re-authenticate');
                    return await this.authenticate();
                }
            }
            
            return this.oAuth2Client;
        } else {
            console.log('🔑 No saved token found, starting authentication...');
            return await this.authenticate();
        }
    }

    isTokenExpired(token) {
        if (!token.expiry_date) return false;
        return Date.now() >= token.expiry_date;
    }

    async refreshToken() {
        const { credentials } = await this.oAuth2Client.refreshAccessToken();
        this.oAuth2Client.setCredentials(credentials);
        return credentials;
    }

    async authenticate() {
        return new Promise((resolve, reject) => {
            const authUrl = this.oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
                prompt: 'consent'
            });

            console.log('\n🌐 Opening browser for authentication...');
            console.log('📋 If the browser doesn\'t open, manually visit this URL:');
            console.log('\n' + authUrl + '\n');

            // Create a local server to receive the OAuth callback
            const server = http.createServer(async (req, res) => {
                try {
                    // Match the redirect URI path from credentials
                    if (req.url.includes('/api/auth/callback/google')) {
                        const queryParams = url.parse(req.url, true).query;
                        
                        if (queryParams.code) {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(`
                                <html>
                                    <body style="font-family: Arial; text-align: center; padding: 50px;">
                                        <h1 style="color: #4CAF50;">✅ Authentication Successful!</h1>
                                        <p>You can close this window and return to the terminal.</p>
                                        <script>setTimeout(() => window.close(), 3000);</script>
                                    </body>
                                </html>
                            `);

                            // Exchange the code for tokens
                            const { tokens } = await this.oAuth2Client.getToken(queryParams.code);
                            this.oAuth2Client.setCredentials(tokens);
                            
                            await this.saveToken(tokens);
                            
                            console.log('✅ Authentication successful!');
                            
                            server.close();
                            resolve(this.oAuth2Client);
                        } else {
                            res.writeHead(400, { 'Content-Type': 'text/html' });
                            res.end('<h1>❌ Authentication Failed</h1><p>No code received.</p>');
                            reject(new Error('No authorization code received'));
                        }
                    }
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end(`<h1>❌ Error</h1><p>${error.message}</p>`);
                    reject(error);
                }
            });

            server.listen(3000, () => {
                console.log('🚀 Local server started on http://localhost:3000');
                
                // Open browser using system command
                exec(`start ${authUrl}`, (error) => {
                    if (error) {
                        console.log('⚠️  Could not open browser automatically');
                        console.log('   Please manually open the URL above');
                    }
                });
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                server.close();
                reject(new Error('Authentication timeout'));
            }, 5 * 60 * 1000);
        });
    }

    async revokeToken() {
        if (!this.oAuth2Client) {
            await this.initializeOAuth2Client();
        }

        const token = await this.loadSavedToken();
        if (token) {
            await this.oAuth2Client.revokeCredentials();
            await fs.unlink(TOKEN_PATH);
            console.log('✅ Token revoked and deleted');
        } else {
            console.log('⚠️  No token found to revoke');
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const manager = new OAuthManager();

    try {
        switch (command) {
            case 'auth':
            case 'login':
                console.log('🔐 Starting OAuth authentication flow...\n');
                await manager.getAuthenticatedClient();
                console.log('\n🎉 Authentication complete! You can now use authenticated API calls.');
                break;

            case 'logout':
            case 'revoke':
                console.log('🔓 Revoking authentication...\n');
                await manager.revokeToken();
                break;

            case 'test':
                console.log('🧪 Testing authentication...\n');
                const client = await manager.getAuthenticatedClient();
                const calendar = google.calendar({ version: 'v3', auth: client });
                
                // Test: List calendars
                const calendarList = await calendar.calendarList.list();
                console.log(`✅ Successfully authenticated! Found ${calendarList.data.items?.length || 0} calendars.`);
                
                if (calendarList.data.items) {
                    console.log('\n📅 Your calendars:');
                    calendarList.data.items.forEach((cal, index) => {
                        console.log(`   ${index + 1}. ${cal.summary} (${cal.id})`);
                    });
                }
                break;

            default:
                console.log('📖 OAuth Setup Utility\n');
                console.log('Usage:');
                console.log('  node oauth-setup.js auth    - Authenticate with Google');
                console.log('  node oauth-setup.js test    - Test authentication');
                console.log('  node oauth-setup.js logout  - Revoke authentication');
                break;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = OAuthManager;