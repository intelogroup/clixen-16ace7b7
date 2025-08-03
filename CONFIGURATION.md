# Clixen Configuration Guide

## 🔐 Environment Setup

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Configure Required Services

#### OpenAI Configuration
1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Update `OPENAI_API_KEY` in `.env`

#### Supabase Configuration
1. Create a project at [Supabase](https://supabase.com)
2. Go to Project Settings → API
3. Update these values in `.env`:
   - `SUPABASE_URL`: Your project URL
   - `SUPABASE_ANON_KEY`: Your anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
   - `VITE_SUPABASE_URL`: Same as SUPABASE_URL
   - `VITE_SUPABASE_ANON_KEY`: Same as SUPABASE_ANON_KEY

#### n8n Configuration
1. Set up your n8n instance
2. Generate an API key in n8n settings
3. Update these values in `.env`:
   - `N8N_API_URL`: Your n8n API URL (e.g., https://your-n8n.com/api/v1)
   - `N8N_API_KEY`: Your n8n API key

#### MCP Server Configuration (Optional)
1. Generate GitHub personal access token
2. Get Docker Hub access token (if needed)
3. Update in `.env`:
   - `MCP_GITHUB_TOKEN`: Your GitHub token
   - `MCP_DOCKER_HUB_TOKEN`: Your Docker Hub token

## 📋 Database Setup

### 1. Run Supabase Migration
```bash
cd clixen/apps/edge/supabase
supabase db reset
```

### 2. Deploy Edge Functions
```bash
supabase functions deploy
```

## 🚀 Development Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Development Server
```bash
pnpm run dev
```

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use `.env.local` for local development overrides
- Store production secrets in your deployment platform's secret management
- The `.env` file in this repo contains only placeholder values

## 📝 Production Deployment

### Environment Variables for Production
Set these in your deployment platform:
- All values from `.env.example`
- Additional platform-specific variables

### Database
- Supabase handles production database automatically
- Ensure Row Level Security policies are enabled

### Frontend
- Build with `pnpm run build`
- Deploy `dist/` folder to your hosting provider
- Set environment variables in your hosting platform

### Backend
- Supabase Edge Functions are automatically deployed
- Configure environment variables in Supabase dashboard