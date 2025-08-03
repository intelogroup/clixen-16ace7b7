# Clixen Deployment Guide

## Prerequisites
- EC2 instance at 18.221.12.50 with n8n running
- Supabase project with keys
- OpenAI API key with GPT-4 access
- Domain: clixen.com configured

## Quick Start (2-Week MVP)

### Step 1: Configure Environment (5 minutes)

```bash
# SSH to your EC2
ssh ubuntu@18.221.12.50

# Clone the repository
git clone https://github.com/yourusername/clixen.git
cd clixen

# Create environment file
cat > .env << EOF
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# n8n
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your-n8n-api-key

# Frontend
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
EOF
```

### Step 2: Setup Infrastructure (10 minutes)

```bash
# Run the EC2 setup script
sudo bash infra/scripts/setup-ec2.sh

# This will:
# - Install NGINX
# - Configure SSL with Certbot
# - Setup n8n reverse proxy
# - Configure auto-renewal
```

### Step 3: Deploy Supabase (5 minutes)

```bash
# Apply database migrations
npx supabase db push --db-url "your-database-url"

# Deploy edge functions
npx supabase functions deploy generate-workflow
```

### Step 4: Start MCP Server (2 minutes)

```bash
# Install dependencies
cd packages/mcp-server
npm install
npm run build

# Start MCP server
npm start &
```

### Step 5: Deploy Frontend (5 minutes)

```bash
# Build frontend
cd apps/web
npm install
npm run build

# Serve with NGINX
sudo cp -r dist/* /var/www/html/
```

### Step 6: Configure n8n API Access

1. Open n8n at https://n8n.clixen.com
2. Go to Settings → API
3. Generate API key
4. Update `.env` with the key

## Testing the MVP

### 1. Test n8n Connection
```bash
curl https://n8n.clixen.com/healthz
# Should return: {"status":"ok"}
```

### 2. Test MCP Server
```bash
curl http://localhost:3000/health
# Should return validation capabilities
```

### 3. Test Workflow Generation
```bash
# Use the frontend at https://clixen.com
# Or test via API:
curl -X POST https://your-project.supabase.co/functions/v1/generate-workflow \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "intent": "Send email when webhook is called"
  }'
```

## Production Checklist

### Week 1 Tasks
- [x] NGINX + SSL setup
- [x] n8n configuration
- [x] Supabase schema
- [x] MCP server
- [x] GPT integration
- [x] Edge functions

### Week 2 Tasks
- [x] React frontend
- [x] Chat interface
- [ ] Test data generation
- [ ] Error handling
- [ ] Dashboard
- [ ] Production testing

## Monitoring

### Check Logs
```bash
# n8n logs
docker logs n8n

# NGINX logs
tail -f /var/log/nginx/access.log

# MCP server logs
tail -f packages/mcp-server/mcp-server.log
```

### Health Endpoints
- n8n: https://n8n.clixen.com/healthz
- Frontend: https://clixen.com
- Supabase: Check dashboard

## Troubleshooting

### n8n not accessible
```bash
# Check Docker
docker ps | grep n8n

# Restart n8n
docker restart n8n

# Check NGINX
sudo nginx -t
sudo systemctl reload nginx
```

### SSL issues
```bash
# Renew certificate
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Frontend not loading
```bash
# Check build
cd apps/web
npm run build

# Check NGINX config
sudo nginx -t
```

## Security Notes

1. **Never commit .env files**
2. **Rotate API keys regularly**
3. **Use RLS in Supabase**
4. **Monitor usage and costs**
5. **Set up alerts for errors**

## Next Steps After MVP

1. Add OAuth providers
2. Implement queue mode (when bug fixed)
3. Add more n8n node types
4. Build analytics dashboard
5. Add team collaboration
6. Implement usage billing

---

**Support**: admin@clixen.com
**Documentation**: https://docs.clixen.com