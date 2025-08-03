# Netlify Deployment Troubleshooting Guide

## ✅ Issues Fixed

### 1. SPA Routing Configuration
- **Problem**: "Page not found" error when accessing routes directly
- **Solution**: Added `_redirects` file with `/* /index.html 200`
- **Status**: ✅ FIXED

### 2. Build Command Updated
- **Problem**: Build command using `npm` instead of `pnpm`
- **Solution**: Updated `netlify.toml` to use `pnpm run build`
- **Status**: ✅ FIXED

### 3. Public Directory Configuration
- **Problem**: Vite not copying public files to build output
- **Solution**: Added `publicDir: 'public'` to `vite.config.ts`
- **Status**: ✅ FIXED

## 🔧 Deployment Configuration

### Current Build Settings
```toml
[build]
  command = "cd apps/web && pnpm run build"
  publish = "apps/web/dist"
  base = "."

[build.environment]
  NODE_VERSION = "20"
```

### Required Environment Variables
Set these in Netlify Dashboard → Site Settings → Environment Variables:

```bash
VITE_SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 🐛 Common Issues & Solutions

### Issue 1: "Page not found" on Route Access
**Symptoms**: 
- App works on `/` (home page)
- Direct access to `/auth`, `/dashboard`, `/chat` shows 404
- Refresh on any route shows 404

**Solution**: 
✅ Fixed with `_redirects` file in `/root/repo/clixen/apps/web/public/_redirects`

### Issue 2: Build Failures
**Symptoms**: 
- Build logs show dependency errors
- "Command failed with exit code 1"

**Solutions**:
1. Check Node.js version (should be 20)
2. Clear cache: `pnpm store prune`
3. Check build logs for specific errors

### Issue 3: Environment Variables Not Loading
**Symptoms**: 
- App loads but authentication fails
- Console errors about undefined VITE_ variables

**Solutions**:
1. Ensure variables have `VITE_` prefix
2. Set in Netlify Dashboard, not just in code
3. Check build logs for environment variable loading

### Issue 4: Assets Not Loading
**Symptoms**: 
- White screen on load
- Console errors about missing JS/CSS files

**Solutions**:
1. Check build output includes all assets
2. Verify publish directory is `apps/web/dist`
3. Check for base URL configuration issues

## 🔍 Debugging Steps

### Step 1: Verify Build Output
```bash
cd apps/web
pnpm run build
ls -la dist/
```

**Expected files**:
- `index.html`
- `_redirects`
- `assets/` directory with JS/CSS files

### Step 2: Test Local Build
```bash
cd apps/web
pnpm run preview
```

### Step 3: Check Netlify Build Logs
1. Go to Netlify Dashboard
2. Click on your site
3. Go to "Deploys" tab
4. Click on latest deploy
5. Check build logs for errors

### Step 4: Test Direct Route Access
After deployment, test these URLs directly:
- `https://your-site.netlify.app/`
- `https://your-site.netlify.app/auth`
- `https://your-site.netlify.app/dashboard`
- `https://your-site.netlify.app/chat`

### Step 5: Debug Page
Access debug information at:
`https://your-site.netlify.app/netlify-debug.html`

## 🚨 Emergency Debugging

If deployment still fails, check these in order:

1. **Build Command**: Ensure it's `cd apps/web && pnpm run build`
2. **Publish Directory**: Ensure it's `apps/web/dist`
3. **Node Version**: Ensure it's `20`
4. **Environment Variables**: Check all `VITE_` prefixed vars are set
5. **Dependencies**: Check for any missing peer dependencies

## 📞 Support Resources

- **Netlify Documentation**: https://docs.netlify.com
- **Netlify Support Forums**: https://answers.netlify.com
- **Vite SPA Deployment**: https://vitejs.dev/guide/static-deploy.html#netlify

## 🎯 Quick Fix Checklist

Before redeploying, ensure:

- [ ] `_redirects` file exists in `apps/web/public/`
- [ ] Build command uses `pnpm`
- [ ] Publish directory is `apps/web/dist`
- [ ] Environment variables are set in Netlify
- [ ] Node version is 20
- [ ] Build completes successfully locally

## 📱 Test URLs After Deployment

Test these routes directly in browser:
1. `/` - Home page
2. `/auth` - Authentication page  
3. `/dashboard` - Dashboard (requires auth)
4. `/chat` - Chat interface (requires auth)

All should load without 404 errors.