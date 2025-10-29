# Security Policy

## 🔒 Reporting Security Vulnerabilities

If you discover a security vulnerability in Clixen, please report it responsibly:

**DO NOT** open a public GitHub issue for security vulnerabilities.

### How to Report

1. **Email:** security@clixen.app
2. **Subject Line:** "Security Vulnerability Report - [Brief Description]"
3. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to respond within **48 hours** and provide a fix within **7 days** for critical issues.

---

## 🛡️ Security Best Practices

### API Keys & Credentials

**NEVER commit the following to the repository:**

- ❌ `.env` files with real credentials
- ❌ `credentials.json` (Google OAuth credentials)
- ❌ `firebase-service-account.json` (Firebase admin SDK keys)
- ❌ `token.json` (OAuth tokens)
- ❌ User-specific tokens in `/tokens` directory
- ❌ Any file containing API keys, secrets, or passwords

### What's Safe to Commit

✅ `.env.example` - Template with placeholder values  
✅ Code that reads from `process.env.*`  
✅ Public documentation  
✅ Client-side Firebase config (Firebase web API keys are designed to be public when properly secured with Firebase Security Rules)

---

## 🔑 Environment Variables

All sensitive data MUST be stored in environment variables:

```bash
# Required Environment Variables
GOOGLE_API_KEY=           # Google Cloud API key
GEMINI_API_KEY=           # Gemini AI API key  
FIREBASE_API_KEY=         # Firebase web API key (public, but protected by Firebase rules)
FIREBASE_PROJECT_ID=      # Firebase project ID
GOOGLE_CLIENT_ID=         # OAuth 2.0 client ID
GOOGLE_CLIENT_SECRET=     # OAuth 2.0 client secret (SENSITIVE)
```

### Development Setup

1. Copy `.env.example` to `.env`
2. Fill in your actual values
3. NEVER commit `.env` to version control

### Production Deployment

Use your hosting provider's environment variable management:
- **Vercel:** Project Settings > Environment Variables
- **Heroku:** `heroku config:set KEY=value`
- **Google Cloud Run:** `gcloud run services update --set-env-vars`
- **AWS:** Systems Manager Parameter Store or Secrets Manager

---

## 🔐 Authentication & Authorization

### OAuth 2.0 Security

1. **Token Storage:**
   - Tokens stored server-side only
   - Encrypted at rest (AES-256)
   - Per-user isolation
   - Automatic expiration and refresh

2. **OAuth Scopes:**
   - Request minimum necessary scopes
   - Current scopes: `calendar.events`, `calendar` (full), `profile`, `email`
   - Users can revoke access anytime

3. **Redirect URI Validation:**
   - Only whitelisted redirect URIs in Google Cloud Console
   - Production: `https://clixen.app/api/auth/callback/google`
   - Development: `http://localhost:3000/api/auth/callback/google`

### Firebase Authentication

1. **Client-Side:**
   - Firebase web API key can be public (protected by Firebase Security Rules)
   - Always verify tokens server-side

2. **Server-Side:**
   - Firebase Admin SDK uses service account (MUST be secret)
   - All API routes protected with `verifyFirebaseToken` middleware
   - Token verification on every request

---

## 🌐 API Security

### Rate Limiting

Implement rate limiting on all API endpoints:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Input Validation

- Validate all user inputs
- Sanitize data before processing
- Use parameterized queries
- Implement CSRF protection

### HTTPS Only

- **Production MUST use HTTPS**
- Redirect HTTP to HTTPS
- Set secure cookies: `secure: true, httpOnly: true, sameSite: 'strict'`

---

## 📊 Data Protection

### User Data Handling

1. **Calendar Data:**
   - Cached temporarily (max 24 hours)
   - Automatically deleted after conversation ends
   - Never stored permanently
   - Not used for training or analytics

2. **Voice Recordings:**
   - Processed immediately
   - Deleted within 24 hours
   - Not shared with third parties

3. **Conversation History:**
   - Retained for 90 days max
   - User-deletable at any time
   - Encrypted at rest

### Compliance

- **GDPR** (EU): Right to access, delete, and export data
- **CCPA** (California): Right to know and delete
- **Google API Services User Data Policy**: Limited Use requirements

---

## 🚨 Known Security Considerations

### 1. Firebase Web API Keys

Firebase web API keys in client-side code are **intentionally public** when:
- ✅ Firebase Security Rules are properly configured
- ✅ API restrictions are set in Google Cloud Console
- ✅ Token verification happens server-side

**Mitigation:**
- Restrict Firebase API key to specific domains (clixen.app)
- Enforce authentication rules in Firestore and Firebase Auth
- Validate all tokens server-side

### 2. Calendar API Scopes

We request `calendar` (full access) for multi-calendar features.

**Mitigation:**
- Clear disclosure in consent screen
- Users can revoke access anytime
- Least privilege principle applied
- Data not shared with third parties

### 3. AI-Generated Content

Gemini AI may produce unexpected or incorrect responses.

**Mitigation:**
- User confirmation for destructive actions (event deletion)
- Audit log of all calendar modifications
- Clear disclaimers about AI limitations
- Content filtering for inappropriate responses

---

## 🔍 Security Audit Checklist

Before deploying to production:

- [ ] All API keys in environment variables
- [ ] No `.env` file committed to repo
- [ ] `.gitignore` includes all sensitive files
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Firebase Security Rules deployed
- [ ] OAuth redirect URIs whitelisted
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers set (helmet.js)
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Logging excludes sensitive data
- [ ] Dependencies audited (`npm audit`)
- [ ] OAuth app verified by Google
- [ ] Privacy Policy published
- [ ] Terms of Service published

---

## 📝 Security Headers

Implement security headers using `helmet`:

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://firebaseapp.com", "wss://clixen.app"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 🔄 Dependency Security

### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Update dependencies
npm update

# Check outdated packages
npm outdated
```

### Automated Scanning

Enable GitHub Dependabot:
1. Go to repository Settings > Security & Analysis
2. Enable "Dependency graph"
3. Enable "Dependabot alerts"
4. Enable "Dependabot security updates"

---

## 📞 Security Contacts

- **General Security:** security@clixen.app
- **Data Privacy:** privacy@clixen.app
- **Legal:** legal@clixen.app

---

## 📜 Security Update Log

| Date | Issue | Severity | Status |
|------|-------|----------|--------|
| 2025-10-29 | Removed hardcoded API keys from codebase | Critical | ✅ Fixed |
| 2025-10-29 | Added `/api/config` endpoint for Firebase config | Low | ✅ Implemented |
| 2025-10-29 | Updated .gitignore for sensitive files | Medium | ✅ Fixed |

---

**Last Updated:** October 29, 2025  
**Version:** 1.0.0
