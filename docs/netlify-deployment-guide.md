# Netlify Deployment Guide for Clixen

## 🚀 Complete Deployment Steps

### Prerequisites
- Netlify account (free tier works for testing)
- GitHub repository connected to Netlify
- Supabase project with service role key
- n8n instance running on AWS EC2

### Step 1: Install Dependencies

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Install project dependencies
npm install

# Install Netlify Functions dependencies
npm install @netlify/functions @supabase/supabase-js
```

### Step 2: Configure Environment Variables

1. Go to Netlify Dashboard > Site Settings > Environment Variables
2. Add all variables from `.env.netlify`:

```bash
# Critical Variables (REQUIRED)
VITE_SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # For Functions only
VITE_N8N_API_URL=http://18.221.12.50:5678/api/v1
VITE_N8N_API_KEY=your-n8n-api-key
VITE_OPENAI_API_KEY=sk-...
```

### Step 3: Deploy Functions

```bash
# Test functions locally
netlify functions:serve

# Deploy to production
netlify deploy --prod
```

### Step 4: Database Migration

```bash
# Run migration on Supabase
node scripts/run-migration-direct.js

# Or use Supabase CLI
supabase db push
```

## 📁 Project Structure for Netlify

```
/root/repo/
├── netlify/
│   └── functions/           # Serverless functions
│       ├── api-proxy.ts     # Main API gateway
│       ├── webhook-background.ts  # Long-running webhooks
│       └── execution-status.ts    # Polling endpoint
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   └── netlify-client.ts  # Client API wrapper
│   │   └── services/        # Business logic
│   │       ├── WebhookGateway.ts
│   │       ├── ExecutionMonitor.ts
│   │       ├── CostAttribution.ts
│   │       └── ModelDecisionEngine.ts
│   └── pages/               # React components
├── netlify.toml            # Netlify configuration
├── package.json
└── .env.netlify            # Environment template
```

## 🔧 API Endpoints

After deployment, your API will be available at:

```
https://your-site.netlify.app/api/v1/workflows/generate
https://your-site.netlify.app/api/v1/workflows/execute
https://your-site.netlify.app/api/executions/{id}
https://your-site.netlify.app/api/v1/usage
https://your-site.netlify.app/api/v1/billing
https://your-site.netlify.app/webhook/{userId}/{workflowId}
```

## 💡 Local Development

```bash
# Start Netlify dev server (includes functions)
netlify dev

# Or run separately
npm run dev                  # Frontend
netlify functions:serve      # Functions
```

## 🎯 Testing Functions

```bash
# Test API proxy
curl -X POST https://localhost:8888/api/v1/workflows/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"request": "Create email automation"}'

# Test execution status
curl https://localhost:8888/api/executions/EXECUTION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## ⚡ Performance Optimization

### 1. Function Bundling
- Netlify uses esbuild by default (fastest)
- Keep functions under 50MB zipped
- Use `external_node_modules` for large deps

### 2. Cold Start Mitigation
- Keep functions warm with scheduled pings
- Minimize dependencies
- Use Edge Functions for simple routing

### 3. Database Connections
- Supabase handles connection pooling
- Use service role key in functions
- Cache user sessions when possible

## 🚨 Common Issues & Solutions

### Issue: Function timeout (10s limit)
**Solution**: Use background functions for long operations
```typescript
// In netlify/functions/long-task-background.ts
export const handler: BackgroundHandler = async (event) => {
  // Can run up to 15 minutes
};
```

### Issue: CORS errors
**Solution**: Add headers to all function responses
```typescript
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

### Issue: Environment variables not loading
**Solution**: Restart Netlify dev server or clear cache
```bash
netlify env:list  # Check loaded vars
netlify dev --live  # Force reload
```

### Issue: Large payload errors
**Solution**: Netlify has 6MB limit, paginate or use streaming
```typescript
// Split large responses
const chunks = splitIntoChunks(data, 5 * 1024 * 1024); // 5MB chunks
```

### Issue: Cold start performance (200ms+ delay)
**Solution**: Implement function warming
```typescript
// netlify/functions/keep-warm.ts - Schedule every 5 minutes
export const handler = async () => {
  const functions = ['/api/v1/workflows/generate'];
  await Promise.all(functions.map(fn => 
    fetch(`${process.env.URL}${fn}`, { method: 'HEAD' })
  ));
  return { statusCode: 200 };
};
```

### Issue: Rate limiting bypassed on cold starts
**Solution**: Move rate limiting to Supabase
```typescript
const checkRateLimit = async (userId: string) => {
  const { data } = await supabase.rpc('check_user_rate_limit', {
    p_user_id: userId,
    p_window_minutes: 1,
    p_max_requests: 100
  });
  return data;
};
```

### Issue: Concurrency limits at scale (1,000 concurrent functions)
**Solution**: Request AWS Lambda concurrency increase via Netlify support
```bash
# When approaching 500 daily active users:
# 1. Contact Netlify support for concurrency increase
# 2. Consider reserved concurrency for critical functions
# 3. Plan migration to dedicated infrastructure
```

### Issue: High function invocation costs
**Solution**: Optimize function calls and add intelligent caching
```typescript
// Cache expensive AI model decisions
const modelCache = new Map();
const cacheKey = `${userTier}-${complexity}`;
if (modelCache.has(cacheKey)) return modelCache.get(cacheKey);
```

## 📊 Monitoring & Analytics

### Netlify Analytics
- Enable in Netlify Dashboard
- Track function invocations
- Monitor error rates

### Custom Monitoring
```typescript
// Add to functions for custom metrics
console.log('METRIC:', {
  function: 'api-proxy',
  duration: Date.now() - startTime,
  userId,
  status: 'success'
});
```

### Real-time Monitoring
- Use Supabase Realtime for live updates
- Subscribe to execution status changes
- Display in React dashboard

## 🔒 Security Checklist

- [ ] All environment variables set in Netlify (not in code)
- [ ] Service role key only in Functions (not frontend)
- [ ] Rate limiting enabled
- [ ] HMAC validation for webhooks
- [ ] User authentication on all endpoints
- [ ] Quota checks before expensive operations
- [ ] Error messages don't leak sensitive info

## 📈 Scaling Considerations

### Current Limits (Netlify Free)
- 125k function invocations/month
- 100 GB bandwidth
- 10 second function timeout

### When to Upgrade
- Over 100k function calls/month → Pro plan
- Need longer timeouts → Background functions
- Need persistent connections → Consider AWS Lambda

### Migration Path
1. Start with Netlify Functions (current setup)
2. Move heavy processing to background functions
3. Consider AWS Lambda for complex workflows
4. Enterprise: API Gateway + Lambda + ECS

## 🎉 Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Functions deployed
- [ ] API endpoints tested
- [ ] Monitoring enabled
- [ ] Rate limiting configured
- [ ] Error handling tested
- [ ] Webhooks validated
- [ ] User quotas enforced
- [ ] Real-time updates working

## 📞 Support & Resources

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Supabase + Netlify Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-netlify)
- [n8n API Documentation](https://docs.n8n.io/api/)
- [Clixen Support](mailto:support@clixen.app)