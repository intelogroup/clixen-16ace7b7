# Netlify Deployment Guide for Clixen

## 🚀 Quick Deploy

### Method 1: Git Integration (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Migrate to Netlify deployment"
   git push origin main
   ```

2. **Connect to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Select your Clixen repository

3. **Configure Build Settings:**
   - Build command: `cd apps/web && npm run build`
   - Publish directory: `apps/web/dist`
   - Node version: `20`

### Method 2: Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login and Deploy:**
   ```bash
   netlify login
   netlify init
   netlify deploy --build
   netlify deploy --prod
   ```

## 🔐 Environment Variables

Set these in Netlify's dashboard under Site Settings → Environment variables:

### Required Variables
```bash
VITE_SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Optional Variables
```bash
OPENAI_API_KEY=your-openai-api-key
N8N_API_URL=https://your-n8n-instance.com/api/v1
N8N_API_KEY=your-n8n-api-key
```

## 📝 Build Configuration

The project includes a `netlify.toml` file with optimized settings:

```toml
[build]
  command = "cd apps/web && npm run build"
  publish = "apps/web/dist"
  base = "."

[build.environment]
  NODE_VERSION = "20"

# SPA routing
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
```

## 🎯 Features Enabled

- ✅ **Automatic deployments** from Git
- ✅ **SPA routing** with proper redirects
- ✅ **Security headers** for production
- ✅ **Asset optimization** with code splitting
- ✅ **Preview deployments** for pull requests
- ✅ **Environment-specific builds**

## 🔄 Development Workflow

1. **Local Development:**
   ```bash
   pnpm dev
   ```

2. **Preview Deploy:**
   ```bash
   netlify deploy
   ```

3. **Production Deploy:**
   ```bash
   netlify deploy --prod
   ```

## 🛠️ Project Structure for Netlify

```
clixen/
├── apps/web/              # Frontend app (deployed to Netlify)
│   ├── dist/             # Build output (auto-generated)
│   ├── src/              # React source code
│   └── package.json      # Web app dependencies
├── apps/edge/            # Supabase Edge Functions (deployed separately)
├── packages/shared/      # Shared utilities
├── netlify.toml         # Netlify configuration
└── .env.example         # Environment template
```

## 🔧 Build Process

Netlify will:

1. Clone your repository
2. Install Node.js 20
3. Run `cd apps/web && npm run build`
4. Deploy `apps/web/dist` to CDN
5. Apply redirects and headers from `netlify.toml`

## 🚨 Important Notes

### What's NOT deployed to Netlify:
- **MCP Server** (`packages/mcp-server`) - Optional for frontend
- **Supabase Edge Functions** - Deploy separately to Supabase
- **n8n instance** - Deploy separately or use cloud n8n

### Migration from AWS EC2:
- ✅ Removed `infra/` directory
- ✅ Removed `setup-https.sh` and `quick-deploy.sh`
- ✅ Updated build configuration for Netlify
- ✅ Simplified deployment process

## 🌐 Post-Deployment

After successful deployment:

1. **Custom Domain** (Optional):
   - Go to Site Settings → Domain management
   - Add your custom domain
   - Configure DNS records

2. **HTTPS** (Automatic):
   - Netlify automatically provisions SSL certificates
   - No manual configuration needed

3. **Environment Testing:**
   - Test authentication with Supabase
   - Verify API connections work
   - Check console for any configuration errors

## 📊 Performance Benefits

- **CDN Distribution**: Global edge network
- **Instant Rollbacks**: One-click deployment history
- **Branch Previews**: Test features before merging
- **Optimized Builds**: Automatic asset optimization
- **Zero Downtime**: Blue-green deployments

## 🆘 Troubleshooting

### Build Failures:
```bash
# Check build logs in Netlify dashboard
# Common issues:
# - Missing environment variables
# - Node version mismatch
# - Dependency installation failures
```

### Runtime Errors:
```bash
# Check browser console for:
# - Supabase connection errors
# - Missing environment variables (VITE_* prefix required)
# - CORS issues with external APIs
```

### Support:
- Netlify Docs: https://docs.netlify.com
- Netlify Support: https://netlify.com/support
- Project Issues: Open GitHub issue in repository

---

**🎉 Your Clixen app is now ready for modern, scalable deployment on Netlify!**