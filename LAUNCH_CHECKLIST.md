# 🚀 OAuth Verification & Production Launch Checklist

**Application:** Clixen  
**Domain:** clixen.app  
**GitHub:** https://github.com/intelogroup/clixen-16ace7b7  
**Status:** Pre-Launch Preparation

---

## ✅ COMPLETED

### 🔐 Security & Compliance

- [x] **Removed all hardcoded API keys** from codebase
- [x] **Created comprehensive `.gitignore`** for sensitive files
- [x] **Environment variables configured** (see `.env.example`)
- [x] **Privacy Policy created** (`PRIVACY_POLICY.md`)
- [x] **Terms of Service created** (`TERMS_OF_SERVICE.md`)
- [x] **Security policy documented** (`SECURITY.md`)
- [x] **OAuth scopes audited** and documented
- [x] **Gemini safety compliance documented** (`docs/GEMINI_SAFETY_COMPLIANCE.md`)
- [x] **Production quotas guide created** (`docs/PRODUCTION_QUOTAS_BILLING.md`)

### 📝 OAuth Verification Package

- [x] **Scope justifications prepared** (see `docs/OAUTH_VERIFICATION_PACKAGE.md`)
- [x] **Demo video script written**
- [x] **Verification checklist created**
- [x] **Documentation links compiled**

---

## 🔄 IN PROGRESS / TODO

### 1️⃣ Domain & DNS Setup

- [ ] **Register domain:** clixen.app (if not already registered)
- [ ] **Configure DNS** records
  - [ ] A record → Your hosting IP
  - [ ] CNAME www → clixen.app
  - [ ] TXT record for domain verification (Google Search Console)
- [ ] **SSL certificate** set up (Let's Encrypt or Cloudflare)
- [ ] **Verify domain ownership** in Google Search Console
  - Visit: https://search.google.com/search-console
  - Add property: clixen.app
  - Verify via DNS TXT record or HTML file

### 2️⃣ Google Cloud Console Setup

#### a) OAuth Consent Screen

- [ ] Go to: https://console.cloud.google.com/apis/credentials/consent
- [ ] **User Type:** External
- [ ] **App Information:**
  - [ ] App name: `Clixen`
  - [ ] User support email: `support@clixen.app`
  - [ ] App logo: Upload 120x120px logo
  - [ ] App domain: `clixen.app`
  - [ ] Authorized domains: `clixen.app`
  - [ ] Developer contact: `dev@clixen.app`
- [ ] **Scopes:**
  - [ ] `openid`
  - [ ] `profile`
  - [ ] `email`
  - [ ] `https://www.googleapis.com/auth/calendar.events`
  - [ ] `https://www.googleapis.com/auth/calendar`
- [ ] **Links:**
  - [ ] Privacy Policy: `https://clixen.app/privacy`
  - [ ] Terms of Service: `https://clixen.app/terms`
  - [ ] Homepage: `https://clixen.app`

#### b) OAuth Credentials

- [ ] Create OAuth 2.0 Client ID
  - [ ] Application type: Web application
  - [ ] Name: `Clixen Production`
  - [ ] Authorized JavaScript origins:
    - `https://clixen.app`
    - `http://localhost:3000` (for testing)
  - [ ] Authorized redirect URIs:
    - `https://clixen.app/api/auth/callback/google`
    - `http://localhost:3000/api/auth/callback/google` (for testing)
- [ ] Download credentials.json
- [ ] Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to environment variables

#### c) Enable APIs

- [ ] **Google Calendar API**
- [ ] **Cloud Speech-to-Text API**
- [ ] **Cloud Text-to-Speech API**
- [ ] **Vertex AI API** (for Gemini)
- [ ] **Firebase Authentication API**
- [ ] **Cloud Firestore API**

#### d) API Keys

- [ ] Create API key for Google Cloud services
  - [ ] Restrict to specific APIs (Calendar, Speech, TTS)
  - [ ] Restrict to clixen.app domain
  - [ ] Set application restrictions
- [ ] Create Gemini API key
  - [ ] Go to: https://makersuite.google.com/app/apikey
  - [ ] Or use Vertex AI credentials
- [ ] Store keys in environment variables

### 3️⃣ Firebase Setup

- [ ] **Create Firebase project** (or use existing)
  - Visit: https://console.firebase.google.com/
  - [ ] Project name: `Clixen`
  - [ ] Enable Google Analytics (optional)
- [ ] **Enable Authentication:**
  - [ ] Google sign-in method enabled
  - [ ] Authorized domains: Add `clixen.app`
- [ ] **Create Firestore database:**
  - [ ] Mode: Production
  - [ ] Location: Choose closest to users
  - [ ] Security rules configured (see below)
- [ ] **Get Firebase config:**
  - [ ] Project Settings → General → Your apps
  - [ ] Add web app if needed
  - [ ] Copy config values to environment variables
- [ ] **Create service account:**
  - [ ] Project Settings → Service Accounts
  - [ ] Generate new private key
  - [ ] Save as `firebase-service-account.json` (DO NOT COMMIT)
  - [ ] Store securely on server (or use Secret Manager)

**Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User settings - only owner can read/write
    match /users/{userId}/settings/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Conversation history - only owner can read/write
    match /users/{userId}/conversations/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4️⃣ OAuth Verification Submission

- [ ] **Create demo video** (2-3 minutes):
  - [ ] Record full OAuth consent flow
  - [ ] Show app name and client ID in browser
  - [ ] Demonstrate all requested scopes in action
  - [ ] Show event creation, reading, updating, deletion
  - [ ] Show multi-calendar features
  - [ ] Upload to YouTube as UNLISTED
  - [ ] Get shareable link
- [ ] **Prepare documentation:**
  - [ ] Scope justifications (already prepared)
  - [ ] Screenshots of app functionality
  - [ ] Privacy Policy published at clixen.app/privacy
  - [ ] Terms of Service published at clixen.app/terms
- [ ] **Submit for verification:**
  - [ ] Go to Google Cloud Console → OAuth consent screen
  - [ ] Click "Submit for Verification"
  - [ ] Fill out all required fields
  - [ ] Paste YouTube video link
  - [ ] Provide scope justifications
  - [ ] Submit application
- [ ] **Monitor email** for Google Trust & Safety team requests
- [ ] **Respond promptly** to any clarification requests (within 5 business days)

**Estimated Timeline:** 3-5 business days (up to 2 weeks if clarifications needed)

### 5️⃣ Production Deployment

#### a) Environment Variables

Create `.env` file on production server with:
```bash
# Google APIs
GOOGLE_API_KEY=your_production_api_key
GEMINI_API_KEY=your_production_gemini_key
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret

# Firebase
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=clixen-prod.firebaseapp.com
FIREBASE_PROJECT_ID=clixen-prod
FIREBASE_STORAGE_BUCKET=clixen-prod.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Server
NODE_ENV=production
PORT=3000
```

#### b) Hosting Options

**Option 1: Google Cloud Run (Recommended)**
```bash
# Deploy to Cloud Run
gcloud run deploy clixen \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production"
```

**Option 2: Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

**Option 3: AWS / Heroku / DigitalOcean**
- Follow platform-specific deployment guides
- Ensure environment variables are set
- Configure SSL/TLS certificates

#### c) DNS Configuration

- [ ] Point clixen.app to hosting provider
- [ ] Wait for DNS propagation (up to 48 hours)
- [ ] Test: https://clixen.app should load
- [ ] Test: SSL certificate valid

#### d) Post-Deployment Testing

- [ ] **Landing page loads** (https://clixen.app)
- [ ] **OAuth flow works** (Sign in with Google)
- [ ] **Calendar connection successful**
- [ ] **Voice commands work**
- [ ] **AI responses generated**
- [ ] **Events created/modified/deleted correctly**
- [ ] **Multi-calendar features functional**
- [ ] **Privacy Policy accessible** (/privacy)
- [ ] **Terms of Service accessible** (/terms)
- [ ] **Firebase config endpoint works** (/api/config/firebase)

### 6️⃣ Monitoring & Alerts

- [ ] **Set up Google Cloud Monitoring:**
  - [ ] Create dashboard for API usage
  - [ ] Monitor Calendar API requests
  - [ ] Monitor Gemini API requests
  - [ ] Monitor Speech API usage
  - [ ] Track error rates
- [ ] **Configure billing alerts:**
  - [ ] 50% budget threshold
  - [ ] 75% budget threshold
  - [ ] 90% budget threshold
  - [ ] 100% budget threshold
- [ ] **Set up error tracking:**
  - [ ] Sentry or Google Cloud Error Reporting
  - [ ] Alert on critical errors
  - [ ] Log aggregation (Cloud Logging)
- [ ] **Health check endpoint:**
  - [ ] `/api/health` returns 200 OK
  - [ ] Monitor uptime (UptimeRobot or Cloud Monitoring)

### 7️⃣ Legal & Marketing Pages

- [ ] **Publish Privacy Policy:**
  - [ ] Host at: https://clixen.app/privacy
  - [ ] Create HTML version of `PRIVACY_POLICY.md`
  - [ ] Include contact information
  - [ ] Add "Last Updated" date
- [ ] **Publish Terms of Service:**
  - [ ] Host at: https://clixen.app/terms
  - [ ] Create HTML version of `TERMS_OF_SERVICE.md`
  - [ ] Include contact information
- [ ] **Create landing page:**
  - [ ] Clear value proposition
  - [ ] Demo video or screenshots
  - [ ] "Sign in with Google" button
  - [ ] Links to Privacy/ToS
  - [ ] Contact/support information

### 8️⃣ Google for Startups Credits (Optional)

- [ ] **Check eligibility:**
  - [ ] AI-first startup using Gemini/Vertex AI
  - [ ] Seed to Series A funding (or early-stage)
  - [ ] Founded within last 10 years
  - [ ] < $5,000 in prior Google Cloud credits
- [ ] **Prepare application:**
  - [ ] Company overview
  - [ ] Product description
  - [ ] Architecture diagram
  - [ ] Usage projections
  - [ ] Funding details (if applicable)
- [ ] **Submit application:**
  - [ ] Visit: https://cloud.google.com/startup/ai
  - [ ] Complete form
  - [ ] Or request referral from VC partner
- [ ] **Await approval** (typically 1-2 weeks)

---

## 📊 Launch Day Checklist

### Morning of Launch

- [ ] **Final code review** and testing
- [ ] **Backup database** (if any data exists)
- [ ] **Verify all environment variables** set correctly
- [ ] **Test OAuth flow** end-to-end
- [ ] **Verify SSL certificate** valid
- [ ] **Check monitoring dashboards** operational
- [ ] **Alert team** to be on standby

### During Launch

- [ ] **Announce on social media** (if applicable)
- [ ] **Monitor error logs** in real-time
- [ ] **Watch API usage** dashboards
- [ ] **Respond to user feedback** quickly
- [ ] **Track signups** and engagement

### End of Day

- [ ] **Review metrics:**
  - [ ] Total signups
  - [ ] Active users
  - [ ] API usage vs. estimates
  - [ ] Error rates
  - [ ] Cost vs. budget
- [ ] **Address any issues** discovered
- [ ] **Document lessons learned**
- [ ] **Plan next-day improvements**

---

## 🔄 Post-Launch (Week 1)

- [ ] **Daily monitoring** of usage and costs
- [ ] **Respond to OAuth verification requests** (if any)
- [ ] **Collect user feedback**
- [ ] **Fix critical bugs** immediately
- [ ] **Optimize performance** bottlenecks
- [ ] **Adjust rate limits** if needed
- [ ] **Update documentation** based on real usage

---

## 📞 Important Contacts

**Development:**
- dev@clixen.app

**Support:**
- support@clixen.app

**Security:**
- security@clixen.app

**Privacy:**
- privacy@clixen.app

**Legal:**
- legal@clixen.app

**Google Cloud Support:**
- console.cloud.google.com/support

**Firebase Support:**
- firebase.google.com/support

---

## 📚 Key Resources

- **OAuth Verification Guide:** `docs/OAUTH_VERIFICATION_PACKAGE.md`
- **Security Policy:** `SECURITY.md`
- **Privacy Policy:** `PRIVACY_POLICY.md`
- **Terms of Service:** `TERMS_OF_SERVICE.md`
- **Gemini Safety:** `docs/GEMINI_SAFETY_COMPLIANCE.md`
- **Quotas & Billing:** `docs/PRODUCTION_QUOTAS_BILLING.md`
- **Environment Variables:** `.env.example`

---

**Status:** Ready for production deployment pending OAuth verification  
**Estimated Launch:** 1-2 weeks (after OAuth approval)  
**Last Updated:** October 29, 2025
