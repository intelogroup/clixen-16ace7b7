# Google Secret Manager Setup Guide

This guide explains how to set up and use Google Secret Manager for secure secret storage in Clixen.

## 📋 Overview

Google Secret Manager provides a secure and convenient way to store API keys, passwords, and other sensitive data. Clixen automatically falls back to environment variables if Secret Manager is not configured, making it optional but recommended for production.

## 🔧 Setup Instructions

### 1. Enable Secret Manager API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Library**
4. Search for "Secret Manager API"
5. Click **Enable**

### 2. Set Up Authentication

#### Option A: Using Service Account (Recommended for Production)

1. Go to **IAM & Admin** → **Service Accounts**
2. Create a new service account or use existing Firebase service account
3. Grant the following roles:
   - **Secret Manager Admin** (for creating/updating secrets)
   - **Secret Manager Secret Accessor** (for reading secrets)
4. Create and download a JSON key file
5. Set the environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```

#### Option B: Using Application Default Credentials (Development)

```bash
gcloud auth application-default login
```

### 3. Configure Environment Variables

Add to your `.env` file:

```bash
# Enable Secret Manager
USE_SECRET_MANAGER=true

# GCP Project ID (required for Secret Manager)
GCP_PROJECT_ID=your-project-id

# Or use Firebase Project ID
FIREBASE_PROJECT_ID=your-project-id

# Service Account Key (if using Option A)
GOOGLE_APPLICATION_CREDENTIALS=./credentials/firebase-service-account.json
```

### 4. Migrate Secrets to Secret Manager

#### Using the CLI:

```bash
# Create secrets from environment variables
echo -n "your-api-key" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "your-session-secret" | gcloud secrets create SESSION_SECRET --data-file=-
echo -n "your-firebase-key" | gcloud secrets create FIREBASE_API_KEY --data-file=-
```

#### Using the Node.js API:

```javascript
const { setSecret } = require('./backend/server/services/secrets');

// Create or update a secret
await setSecret('GEMINI_API_KEY', 'your-api-key-value');
await setSecret('SESSION_SECRET', 'your-session-secret');
```

## 🚀 Usage

### Automatic Secret Loading

When `USE_SECRET_MANAGER=true`, Clixen automatically loads secrets from Secret Manager during startup. The validator will:

1. Check environment variables first (fastest)
2. Fall back to Secret Manager if not found
3. Cache loaded secrets in `process.env`

### Manual Secret Access

```javascript
const { getSecret, getSecrets } = require('./backend/server/services/secrets');

// Get a single secret
const apiKey = await getSecret('GEMINI_API_KEY');

// Get multiple secrets in parallel
const secrets = await getSecrets([
    'GEMINI_API_KEY',
    'SESSION_SECRET',
    'FIREBASE_API_KEY'
]);

// Get a required secret (throws error if not found)
const required = await getSecret('SESSION_SECRET', { required: true });
```

### Managing Secrets

```javascript
const { 
    setSecret, 
    deleteSecret, 
    listSecrets 
} = require('./backend/server/services/secrets');

// Create or update a secret
await setSecret('NEW_API_KEY', 'secret-value');

// List all secrets
const secretNames = await listSecrets();
console.log('Available secrets:', secretNames);

// Delete a secret
await deleteSecret('OLD_API_KEY');
```

## 🔐 Security Best Practices

### 1. Secret Naming Convention

- Use UPPERCASE_WITH_UNDERSCORES for consistency
- Match environment variable names for easy migration
- Example: `GEMINI_API_KEY`, `SESSION_SECRET`

### 2. Access Control

- Grant minimal necessary permissions
- Use separate service accounts for different environments
- Regularly audit secret access logs

### 3. Secret Rotation

```bash
# Create a new version (old version remains accessible)
echo -n "new-api-key" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Disable old version
gcloud secrets versions disable 1 --secret="GEMINI_API_KEY"

# Destroy old version (permanent)
gcloud secrets versions destroy 1 --secret="GEMINI_API_KEY"
```

### 4. Environment Separation

Use different GCP projects or secret names for different environments:

```bash
# Development
GCP_PROJECT_ID=clixen-dev

# Production
GCP_PROJECT_ID=clixen-prod
```

## 📊 Monitoring and Auditing

### View Secret Access Logs

```bash
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret" --limit 50
```

### Set Up Alerts

1. Go to **Cloud Monitoring** → **Alerting**
2. Create alert for unusual secret access patterns
3. Configure notifications (email, Slack, etc.)

## 🔄 Migration Checklist

- [ ] Enable Secret Manager API in GCP Console
- [ ] Set up service account with proper permissions
- [ ] Download service account key
- [ ] Add `USE_SECRET_MANAGER=true` to `.env`
- [ ] Migrate all sensitive environment variables to Secret Manager
- [ ] Test secret loading with `npm run web:dev`
- [ ] Remove sensitive values from `.env` (keep as comments for reference)
- [ ] Update deployment scripts to use Secret Manager
- [ ] Set up secret rotation schedule
- [ ] Configure monitoring and alerts

## ⚙️ Configuration Reference

### Required Environment Variables (for Secret Manager)

```bash
USE_SECRET_MANAGER=true                    # Enable Secret Manager
GCP_PROJECT_ID=your-project-id             # GCP Project ID
GOOGLE_APPLICATION_CREDENTIALS=/path/key   # Service account key path
```

### Secrets to Migrate

High Priority (Production):
- `GEMINI_API_KEY` - Gemini API key
- `SESSION_SECRET` - Express session secret (32+ chars)
- `FIREBASE_API_KEY` - Firebase web API key
- `FIREBASE_SERVICE_ACCOUNT_PATH` - Path to service account JSON

Medium Priority:
- `GOOGLE_API_KEY` - Google Calendar API key (if separate)
- `CLIENT_SECRET` - OAuth client secret

Low Priority (Development):
- Can remain in environment variables

## 🆘 Troubleshooting

### Error: "Secret Manager is not configured"

**Solution:** Ensure `GCP_PROJECT_ID` or `FIREBASE_PROJECT_ID` is set.

### Error: "Permission denied"

**Solution:** Grant "Secret Manager Secret Accessor" role to service account:
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Error: "Secret not found"

**Solution:** Create the secret first:
```bash
echo -n "your-value" | gcloud secrets create SECRET_NAME --data-file=-
```

### Secrets not loading

**Solution:** Check logs for detailed error messages:
```bash
npm run web:dev
# Look for "⚠️  Failed to load ... from Secret Manager"
```

## 📚 Additional Resources

- [Google Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing)
- [Best Practices for Secret Management](https://cloud.google.com/secret-manager/docs/best-practices)
- [IAM Permissions Reference](https://cloud.google.com/secret-manager/docs/access-control)

## 🎯 Quick Start Example

```bash
# 1. Enable Secret Manager
gcloud services enable secretmanager.googleapis.com

# 2. Create secrets
echo -n "your-gemini-key" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" | \
  gcloud secrets create SESSION_SECRET --data-file=-

# 3. Grant access to service account
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 4. Enable in your app
echo "USE_SECRET_MANAGER=true" >> .env
echo "GCP_PROJECT_ID=your-project-id" >> .env

# 5. Start server
npm run web:dev
```

## 💡 Cost Considerations

Secret Manager pricing (as of 2024):
- Secret versions: $0.06 per active secret version per month
- Access operations: $0.03 per 10,000 access operations
- Typical monthly cost for Clixen: ~$0.50 - $2.00

**Note:** Costs are minimal for most use cases. The security benefits far outweigh the cost.
