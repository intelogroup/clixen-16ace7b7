# Clixen - AI-Powered Workflow Automation

Transform natural language into powerful n8n workflows instantly.

## 🚀 What is Clixen?

Clixen is a SaaS platform that uses AI to generate, deploy, and manage n8n workflow automations from simple text descriptions. Just describe what you want to automate, and Clixen builds it for you.

## ✨ Features

- **Natural Language to Workflow**: Describe your automation in plain English
- **Instant Deployment**: Workflows are automatically deployed to n8n
- **Smart Validation**: AI validates feasibility before generation
- **Real-time Testing**: Test workflows with generated sample data
- **Modern UI**: Clean, minimal interface with streaming responses
- **Secure**: Supabase auth with RLS, encrypted credentials

## 🏗️ Architecture

```
User → React Chat UI → Supabase Edge Functions → GPT-4
                    ↓
                n8n API ← MCP Server (Validation)
```

## 🎯 MVP Status (2-Week Sprint)

### Week 1 ✅
- [x] Infrastructure setup (NGINX, SSL)
- [x] n8n integration
- [x] Supabase backend
- [x] MCP validation server
- [x] GPT-4 workflow generation
- [x] Database schema

### Week 2 🚧
- [x] React/Vite frontend
- [x] Chat interface
- [x] Streaming responses
- [ ] Test data generation
- [ ] Dashboard
- [ ] Production deployment

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TailwindCSS, Framer Motion
- **Backend**: Supabase Edge Functions (Deno)
- **AI**: OpenAI GPT-4
- **Automation**: n8n (self-hosted)
- **Validation**: MCP Server (Node.js)
- **Database**: PostgreSQL (Supabase)
- **Infrastructure**: AWS EC2, NGINX, Certbot

## 📦 Project Structure

```
clixen/
├── apps/
│   ├── web/              # React frontend
│   └── edge/             # Supabase functions
├── packages/
│   ├── shared/           # Shared types
│   └── mcp-server/       # n8n validation
└── infra/                # Deployment scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker
- Supabase account
- OpenAI API key
- EC2 instance

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/clixen.git
cd clixen

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Start development
npm run dev
```

### Deployment

```bash
# Deploy to EC2
bash infra/scripts/setup-ec2.sh

# Deploy Supabase functions
npx supabase functions deploy

# Build and deploy frontend
npm run build
```

## 📝 Usage Example

1. **User**: "Create a workflow that saves email attachments to Google Drive"

2. **Clixen**: 
   - Validates feasibility
   - Generates n8n workflow
   - Deploys automatically
   - Tests with sample data
   - Returns webhook URL

3. **Result**: Working automation in under 30 seconds!

## 🔒 Security

- Supabase RLS for data isolation
- Encrypted credential storage
- API key authentication
- HTTPS everywhere
- No credential exposure to users

## 📊 Limits (Free Tier)

- 10 workflows per user
- 8 nodes per workflow
- 100 executions/day
- Basic nodes only

## 🗺️ Roadmap

### Phase 1 (Current - MVP)
- ✅ Core workflow generation
- ✅ Basic chat interface
- 🚧 Test data generation

### Phase 2 (Post-MVP)
- OAuth providers (Google, Microsoft)
- Advanced node types
- Team collaboration
- Usage analytics

### Phase 3
- Custom node builder
- Workflow marketplace
- Enterprise features
- White-label options

## 🤝 Contributing

We're not accepting contributions during the MVP phase. Check back after launch!

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

- Email: support@clixen.com
- Documentation: https://docs.clixen.com
- Status: https://status.clixen.com

---

**Built with ❤️ by the Clixen Team**

*Transforming automation, one conversation at a time.*