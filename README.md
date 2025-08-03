# Clixen - Enterprise AI Automation Platform ✅

**Revolutionary Multi-Agent System for n8n Workflow Automation**

Transform natural language into production-ready n8n workflows using sophisticated AI agent coordination.

## 🤖 What is Clixen?

Clixen is a **next-generation AI automation platform** featuring a **sophisticated multi-agent system** that coordinates specialist AI agents to create, deploy, and manage n8n workflows from natural language descriptions. Built with 2025 AI agent best practices and enterprise-grade reliability.

## ✨ Revolutionary Features

- **🤖 Multi-Agent System**: Orchestrator-worker pattern with specialist AI agents
- **🎭 Real-Time Agent UI**: Live monitoring of agent activity and progress
- **🔄 Conversation Memory**: Context retention across user sessions  
- **⚡ Parallel Processing**: Multiple agents working simultaneously
- **🛡️ Error Recovery**: Comprehensive retry logic and rollback capabilities
- **📊 Progress Tracking**: Phase-based workflow development monitoring
- **🎯 Quality Assurance**: Multi-layer validation before deployment
- **🔒 Enterprise Security**: OAuth integration with centralized API management

## 🏗️ Next-Generation Architecture

```
User → Multi-Agent Chat UI → AI Agent Coordination Hub
                           ↓
    OrchestratorAgent → WorkflowDesignerAgent → DeploymentAgent
                           ↓                        ↓
                    n8n API Integration    Production Deployment
                           ↓
                  Supabase + OpenAI GPT-4
```

## 🎯 Production Status ✅

**Current Branch**: `main` (Complete Multi-Agent System)  
**Status**: Production-deployed with enterprise AI coordination  
**Live URL**: http://18.221.12.50 ✅

### ✅ Multi-Agent System Features
- [x] **BaseAgent Framework**: OpenAI GPT-4 integration with state management
- [x] **OrchestratorAgent**: Lead conversation manager and task delegation
- [x] **WorkflowDesignerAgent**: n8n workflow specialist with expert knowledge
- [x] **DeploymentAgent**: Production deployment with rollback capabilities
- [x] **AgentCoordinator**: Multi-agent orchestration and communication hub
- [x] **Real-Time UI**: Live agent status and progress visualization
- [x] **Conversation Memory**: Context retention across sessions
- [x] **OAuth Integration**: Smart permission detection and management

## 🛠️ Enterprise Tech Stack

- **Frontend**: React 18 + Vite + TypeScript (Multi-Agent UI)
- **AI Agents**: OpenAI GPT-4 with TypeScript framework
- **Backend**: Supabase + n8n API Integration
- **Authentication**: Supabase Auth with OAuth providers
- **Database**: PostgreSQL with RLS + Advanced Extensions
- **Automation**: n8n (self-hosted on AWS EC2)
- **Infrastructure**: AWS EC2 + Production deployment ready

## 📦 Modern Project Structure

```
/root/repo/
├── src/                       # 🎯 MAIN APPLICATION
│   ├── lib/agents/           # 🤖 MULTI-AGENT SYSTEM
│   │   ├── BaseAgent.ts           # Core agent foundation
│   │   ├── OrchestratorAgent.ts   # Lead conversation manager
│   │   ├── WorkflowDesignerAgent.ts # n8n workflow specialist
│   │   ├── DeploymentAgent.ts     # Production deployment agent
│   │   └── AgentCoordinator.ts    # Multi-agent orchestration hub
│   ├── lib/oauth/            # 🔐 OAUTH MANAGEMENT
│   ├── lib/api/              # 🌐 CENTRALIZED API MANAGEMENT
│   ├── components/           # UI Components + Permission Modal
│   └── pages/Chat.tsx        # 🎭 MULTI-AGENT CHAT INTERFACE
├── scripts/                  # Database migration scripts
├── devhandoff.md            # 📋 COMPLETE PROJECT CONTEXT
└── CLAUDE.md                # 📖 ARCHITECTURE DOCUMENTATION
```

## 🚀 Quick Start (Multi-Agent System)

### Prerequisites
- Node.js 20+
- npm or pnpm
- **OpenAI API Key** (for multi-agent system)
- Supabase account (configured)
- n8n instance (pre-configured)

### Installation & Development

```bash
# Clone repository
git clone https://github.com/yourusername/clixen.git
cd clixen

# Install dependencies
npm install

# Configure environment (CRITICAL for agents)
cp .env.example .env
# Edit .env with your OpenAI API key and Supabase credentials

# Start multi-agent development server
npm run dev
```

### Environment Configuration

```bash
# Required for Multi-Agent System
VITE_OPENAI_API_KEY=your-openai-key-here
VITE_SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_N8N_API_URL=http://18.221.12.50:5678/api/v1
VITE_N8N_API_KEY=your-n8n-api-key
```

### Production Deployment

```bash
# Build with multi-agent system
npm run build

# Deploy to production (current: AWS EC2)
# Access at: http://18.221.12.50
```

## 📝 Multi-Agent Usage Example

1. **User**: "Create a workflow that saves email attachments to Google Drive"

2. **🎭 OrchestratorAgent**: 
   - Analyzes requirements and detects needed OAuth permissions
   - "I'll need access to Gmail for email reading and Google Drive for file storage"

3. **🔐 OAuth System**: 
   - Shows permission modal with clear explanations
   - Handles secure OAuth flow for Google services

4. **⚙️ WorkflowDesignerAgent**: 
   - Designs optimal n8n workflow architecture
   - Configures Gmail trigger and Google Drive nodes
   - Applies enterprise best practices

5. **🚀 DeploymentAgent**: 
   - Validates workflow before deployment
   - Deploys safely with rollback capabilities
   - Monitors health and performance

6. **Result**: Enterprise-grade automation deployed in under 60 seconds with AI coordination! ✅

## 🔒 Enterprise Security

- **Multi-Agent Validation**: Comprehensive input validation across agent network
- **OAuth Integration**: Secure token management for Google, Microsoft, Dropbox
- **Supabase RLS**: Row-level security with user isolation
- **API Rate Limiting**: Intelligent quota management across services
- **No Hardcoded Secrets**: Environment variables only
- **Agent Communication**: Encrypted agent-to-agent messaging
- **Audit Logging**: Complete activity tracking

## 📊 Platform Capabilities

### Free Tier
- 10 workflows per user with multi-agent assistance
- Basic OAuth integrations
- Community support

### Pro Tier  
- Unlimited workflows with advanced agents
- Premium OAuth providers
- Priority agent processing
- Advanced analytics

### Enterprise
- Custom agent specializations
- White-label multi-agent system
- Dedicated agent instances
- Enterprise OAuth management

## 🗺️ Multi-Agent Evolution Roadmap

### ✅ Phase 1 (COMPLETE - Enterprise Multi-Agent System)
- **Multi-Agent Coordination**: Production-ready with 4 specialist agents
- **Real-Time UI**: Live agent monitoring and progress tracking
- **OAuth Integration**: Smart permission detection and management
- **Conversation Memory**: Context retention across sessions

### 🚧 Phase 2 (Agent Enhancement)
- **Learning System**: Agents learn from successful workflow patterns  
- **Testing Agent**: Specialist agent for workflow validation
- **Integration Agent**: Complex API integration specialist
- **Performance Analytics**: Agent-driven optimization insights

### 🔮 Phase 3 (Enterprise Scale)
- **Agent Marketplace**: Custom agent specializations
- **Multi-Tenant Agents**: Isolated agent contexts per organization
- **Horizontal Agent Scaling**: Distributed agent processing
- **Advanced Security**: Enterprise-grade agent access controls

## 🤝 Contributing

The multi-agent system is in active development. Contributions welcome for:
- New specialist agents
- Agent communication improvements  
- UI enhancements for agent monitoring
- Testing and validation

## 📄 License

Proprietary - All rights reserved

## 🆘 Support & Documentation

- **Primary Documentation**: [`devhandoff.md`](devhandoff.md) - Complete project context
- **Architecture Guide**: [`CLAUDE.md`](CLAUDE.md) - Technical architecture
- **Live System**: http://18.221.12.50 (Production deployment)
- **Multi-Agent System**: Full TypeScript implementation in `src/lib/agents/`

## 🔗 Key Files for Developers

- **Agent System**: `src/lib/agents/` - Complete multi-agent framework
- **Chat Interface**: `src/pages/Chat.tsx` - Real-time agent monitoring UI
- **OAuth Integration**: `src/lib/oauth/` - Smart permission management
- **Database Scripts**: `scripts/` - Migration and setup utilities

---

**🤖 Powered by Revolutionary Multi-Agent AI Architecture**

*Built with Enterprise AI by Terragon Labs - Transforming automation through intelligent agent coordination.*