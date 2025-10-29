/**
 * Firebase Authentication Middleware
 * 
 * Verifies Firebase ID tokens for protected routes
 */

const admin = require('firebase-admin');

/**
 * Verify Firebase authentication token
 * 
 * Extracts and verifies the Bearer token from the Authorization header.
 * Attaches user info to req.user for downstream use.
 */
async function verifyFirebaseToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ No authorization token provided');
        return res.status(401).json({ 
            error: 'Unauthorized',
            message: 'No authentication token provided. Please sign in.' 
        });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified
        };
        
        console.log(`✅ Authenticated user: ${req.user.email}`);
        next();
    } catch (error) {
        console.error('❌ Token verification failed:', error.message);
        return res.status(401).json({ 
            error: 'Unauthorized',
            message: 'Invalid or expired token. Please sign in again.' 
        });
    }
}

module.exports = {
    verifyFirebaseToken
};
