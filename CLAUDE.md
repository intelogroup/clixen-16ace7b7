# Clixen Project - Developer Handoff

## 🎯 IMMEDIATE ACTION REQUIRED

**Before starting any work on this project, you MUST read `devhandoff.md` first.**

This file contains critical project context, architecture decisions, and implementation details that are essential for understanding the Clixen platform.

## 📋 Project Overview

Clixen is an AI-powered n8n workflow automation platform that transforms natural language into functional workflows. This is a production-ready MVP with comprehensive architecture.

## 🚀 Quick Start

1. **Read `devhandoff.md`** - Contains all project context
2. **Review the architecture** in `/clixen` directory
3. **Check deployment guide** in `DEPLOYMENT.md`
4. **Understand the stack**:
   - Frontend: React/Vite with streaming chat UI
   - Backend: Supabase Edge Functions
   - AI: GPT-4 workflow generation
   - Automation: Self-hosted n8n
   - Validation: Custom MCP server

## 🔧 MCP Servers Available

The following MCP servers are installed and configured:

### 1. GitHub MCP Server
- **Purpose**: Repository management and GitHub API integration
- **Location**: `/root/repo/mcp-servers` (official reference)
- **Status**: Installed via npm (deprecated version, use local)

### 2. Docker Hub MCP Server
- **Purpose**: Docker repository management and container discovery
- **Location**: `/root/repo/docker-hub-mcp`
- **Status**: Built and ready
- **Build Command**: `npm run build`

### 3. Clixen n8n MCP Server
- **Purpose**: n8n workflow validation and deployment
- **Location**: `/root/repo/clixen/packages/mcp-server`
- **Status**: Custom implementation for Clixen

## ⚠️ Critical Configuration

### OpenAI API Key Configured
```
OPENAI_API_KEY=your-openai-api-key-here
```

### Required Environment Setup
- Supabase project configuration
- n8n API key generation
- GitHub token for MCP server
- Docker Hub token (optional)

## 📁 Project Structure

```
/root/repo/
├── clixen/                    # Main Clixen application
│   ├── apps/web/             # React frontend
│   ├── apps/edge/            # Supabase functions
│   ├── packages/shared/      # Shared types
│   ├── packages/mcp-server/  # n8n validation
│   └── infra/                # Deployment scripts
├── mcp-servers/              # Official MCP servers
├── docker-hub-mcp/           # Docker Hub MCP server
└── devhandoff.md            # MUST READ FIRST
```

## 🎯 Current Status

**MVP Implementation**: Complete and ready for deployment
**Testing**: Requires OpenAI API key and Supabase configuration
**Deployment**: EC2 scripts ready, SSL configured
**Features**: Full workflow generation pipeline implemented

## 🚨 Important Notes

1. **Security**: OpenAI API key is configured in .env - handle with care
2. **Domain**: n8n.clixen.com needs DNS configuration
3. **Dependencies**: All MCP servers installed and built
4. **Architecture**: Production-ready with proper error handling

## 📞 Next Steps for Any Agent

1. **Read `devhandoff.md`** - Cannot emphasize this enough
2. Check current deployment status
3. Test workflow generation pipeline
4. Complete any missing configurations
5. Deploy to production environment

---

**Remember: This project has complex integrations. Always refer to `devhandoff.md` for complete context before making changes.**

## 🔗 Key Files to Reference

- `devhandoff.md` - Complete project context
- `clixen/DEPLOYMENT.md` - Deployment instructions  
- `clixen/README.md` - Technical overview
- `clixen/.env` - Environment configuration

**Any agent working on this project must read `devhandoff.md` first to understand the full context and avoid breaking existing functionality.**