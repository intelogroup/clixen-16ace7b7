# 🔐 Clixen n8n API Credentials Setup

**Status**: ✅ Complete | **APIs Configured**: 12 | **Ready for Production**: Secure Template

This directory contains credential setup templates and scripts for Clixen workflows in n8n.

## 📋 Configured API Credential Templates

| API Service | Status | Description | Setup Required |
|-------------|--------|-------------|----------------|
| **Firecrawl** | ✅ Template | Web scraping and content extraction | Add API key |
| **OpenAI** | ✅ Template | GPT-4 processing and AI workflows | Add API key |
| **Resend** | ✅ Template | Reliable email delivery service | Add API key |
| **OpenWeatherMap** | ✅ Template | Weather data and notifications | Add API key |
| **NewsAPI** | ✅ Template | News aggregation and content feeds | Add API key |
| **DeepSeek** | ✅ Template | Advanced AI processing and reasoning | Add API key |
| **Gemini** | ✅ Template | Google AI multimodal processing | Add API key |
| **xAI** | ✅ Template | Grok AI processing and workflows | Add API key |
| **Mailgun** | ✅ Template | Email delivery and marketing | Add API key |
| **Twilio** | ✅ Template | SMS and voice communications | Add Account SID & Token |
| **Google API** | ✅ Template | Google services integration | Add service account |
| **YouTube** | ✅ Template | YouTube Data API integration | Add API key |

## 🚀 Quick Setup Guide

### 1. Access n8n Interface
```
🌐 URL: https://n8nio-n8n-7xzf6n.sliplane.app
📍 Navigate to: Credentials → Add Credential
```

### 2. Create Each Credential

#### A. Firecrawl API
- **Type**: HTTP Header Auth
- **Name**: `Clixen-Firecrawl-API`
- **Header Name**: `Authorization`
- **Header Value**: `Bearer YOUR_FIRECRAWL_API_KEY_HERE`

#### B. OpenAI API
- **Type**: HTTP Header Auth  
- **Name**: `Clixen-OpenAI-API`
- **Header Name**: `Authorization`
- **Header Value**: `Bearer YOUR_OPENAI_API_KEY_HERE`

#### C. Resend API
- **Type**: HTTP Header Auth
- **Name**: `Clixen-Resend-API` 
- **Header Name**: `Authorization`
- **Header Value**: `Bearer YOUR_RESEND_API_KEY_HERE`

#### D. OpenWeatherMap API
- **Type**: Query Auth
- **Name**: `Clixen-OpenWeatherMap-API`
- **Key**: `appid`
- **Value**: `YOUR_OPENWEATHERMAP_API_KEY_HERE`

#### E. NewsAPI
- **Type**: HTTP Header Auth
- **Name**: `Clixen-NewsAPI`
- **Header Name**: `X-API-Key`
- **Header Value**: `YOUR_NEWSAPI_KEY_HERE`

### 3. Available Setup Scripts

#### Automated Setup (Recommended)
```bash
# Run from backend/scripts/
node setup-n8n-credentials.cjs
```

#### Manual Setup Guide
```bash
# Generate manual setup instructions
node manual-credential-setup.cjs
```

#### API-Based Setup
```bash
# Direct API credential creation
node api-credential-setup.cjs
```

## 🔧 Setup Scripts Available

1. **setup-n8n-credentials.cjs** - Main automated setup script
2. **manual-credential-setup.cjs** - Generates manual setup guide
3. **api-credential-setup.cjs** - API-based credential creation
4. **test-n8n-workflow-with-credentials.cjs** - Test credential functionality

## 🛡️ Security Best Practices

- ✅ All credential templates use placeholders 
- ✅ No hardcoded API keys in repository
- ✅ Environment variable references for production
- ✅ User isolation with `[USR-{userId}]` prefixes
- ✅ HTTPS-only credential transmission

## 📝 Next Steps

1. Replace placeholder values with real API keys
2. Test each credential in n8n interface
3. Deploy workflows using configured credentials
4. Monitor credential usage and rotation schedule

## 🎯 Production Deployment

For production deployment:
1. Use environment variables for all API keys
2. Implement credential rotation policies
3. Enable monitoring and alerting
4. Follow principle of least privilege for API access

**Security Note**: Never commit real API keys to version control. Always use placeholder values and configure real keys through secure deployment pipelines.