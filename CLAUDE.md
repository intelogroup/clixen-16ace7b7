7# Clixen Project - AI WORKFLOW AUTOMATION MVP ✅

## 🎯 **SIMPLIFIED NATURAL-LANGUAGE WORKFLOW CREATOR**

**🌐 Live URLs:**
- **Frontend App**: http://18.221.12.50 ✅ (HTTPS-ready)
- **Authentication**: Working with real credentials ✅
- **Supabase Backend**: https://zfbgdixbzezpxllkoyfc.supabase.co ✅
- **n8n Interface**: http://18.221.12.50:5678 ✅

**Last Updated**: August 7, 2025 | **Status**: MVP Build Ready | **Architecture**: Netlify Static + Supabase

---

## 📋 **MVP Specification Overview**

Clixen is a **natural-language workflow creator** that transforms user prompts into executable n8n workflows. This MVP focuses on delivering a **simple, reliable experience** for developers to define and deploy automation pipelines using conversational instructions.

### 🎯 **Core MVP Features (In Scope)**

**✅ Authentication & User Management**
- Email/password authentication via Supabase Auth
- Session management and protected routes
- Basic user profile management

**✅ Project-Based Organization** 
- Create and select projects in dashboard view
- Project-scoped workflow organization
- Basic project metadata management

**✅ Chat-Based Workflow Creation**
- Natural language prompt processing
- Single GPT-powered conversation flow
- Feasibility checks and clarifying questions
- Workflow generation behind the scenes

**✅ n8n Integration**
- REST API deployment to connected n8n instance
- Basic workflow validation via MCP
- Deployment status monitoring
- Simple error handling and retry logic

**✅ Simple Dashboard**
- Workflow listing with name, status, creation date
- Project switching interface
- Chat history per workflow/project
- Mobile-responsive design

### ❌ **Explicitly Out of Scope (MVP)**
- Multi-agent orchestration or specialist AI agents
- Live workflow diagram rendering or interactive JSON editing
- Advanced undo/redo or collaborative editing features
- External OAuth providers beyond email/password
- Rate-limiting, complex caching, or multi-tenant billing systems
- Enterprise features: quotas, cost attribution, advanced monitoring

---

## 🏗️ **Simplified Architecture Stack**

### **Frontend (React/Vite) - MINIMAL UI**
- Production-optimized build (720KB total, <200KB gzipped critical path)
- **Three Core Pages**: Auth, Dashboard, Chat
- **Simple Chat Interface**: Text input, message history, loading states
- **Basic Dashboard**: Project list, workflow list, simple navigation
- **Authentication**: Standard email/password forms
- **Mobile-First**: Responsive design with clean typography

### **Backend (Supabase) - STREAMLINED**  
- **Supabase Auth**: Email/password authentication only
- **Database**: Core tables (users, projects, workflows, conversations)
- **Edge Functions**: 3-4 simple functions (not 15+ complex ones)
  - `workflow-generator`: Single GPT processing
  - `n8n-deployment`: Basic deployment
  - `projects-api`: CRUD operations
- **OpenAI Integration**: Single GPT-4 model for workflow generation
- **Security**: RLS policies, secure token handling, no hardcoded secrets

### **Infrastructure (Netlify + Supabase) - SIMPLE**
- **Static Hosting**: Netlify CDN for frontend
- **Edge Runtime**: Supabase for backend logic
- **No Complex Infrastructure**: No AWS EC2, no multi-agent coordination
- **SSL/Security**: Built-in HTTPS, basic security headers

---

## 📁 **Simplified Project Structure**

```
/root/repo/
├── frontend/src/                  # 🎯 FRONTEND APPLICATION
│   ├── pages/                     # Core Pages (3 total)
│   │   ├── StandardAuth.tsx           # Email/password auth
│   │   ├── StandardDashboard.tsx      # Project/workflow list
│   │   └── StandardChat.tsx           # Simple chat interface
│   ├── components/                # Basic UI Components
│   │   ├── Layout.tsx                 # Simple navigation
│   │   ├── LoadingButton.tsx          # Loading states
│   │   └── ui/                        # Basic button, input, etc.
│   ├── lib/                      # Core Services
│   │   ├── supabase.ts               # Auth integration
│   │   ├── n8n.ts                    # Simple n8n API client
│   │   └── workflowGenerator.ts      # Single GPT workflow generation
│   └── integrations/
│       └── supabase/types.ts         # Database types
├── backend/supabase/             # 🎯 BACKEND SERVICES
│   ├── functions/                # Edge Functions (3-4 total)
│   │   ├── workflow-generator/       # Single GPT processing
│   │   ├── n8n-deployment/          # Basic deployment
│   │   └── projects-api/            # CRUD operations
│   └── migrations/               # Database schema
├── docs/                         # 📖 MVP SPECIFICATIONS
│   ├── CLIXEN_MVP_SPEC.md           # Core requirements
│   ├── CLIXEN_UI_UX_DESIGN_SPEC.md  # Design specifications
│   └── CLIXEN_MVP_ROADMAP.md        # Development phases
├── netlify.toml                  # Simple deployment config
└── CLAUDE.md                     # This file
```

### **Key Changes from Complex System**
- **Removed**: `src/lib/agents/` (multi-agent system)
- **Removed**: Complex OAuth, rate limiting, cost attribution
- **Removed**: Real-time agent monitoring, progress tracking
- **Simplified**: Chat interface to basic message flow
- **Simplified**: Dashboard to simple lists
- **Simplified**: Edge functions from 15+ to 3-4

---

## 🎯 **MVP Success Metrics**

- **User Onboarding**: ≥70% of new users complete first workflow within 10 minutes
- **Workflow Persistence**: ≥90% of generated workflows saved and retrievable
- **Deployment Rate**: ≥80% of generated workflows successfully deployed
- **Performance**: <3s page load, <200KB gzipped bundle
- **Basic Telemetry**: Core events captured (signup, workflow create, deploy)

---

## 🔒 **Production Environment Configuration**

### **Verified Working Configuration**
```bash
# Supabase Configuration (PRODUCTION VERIFIED)
VITE_SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw

# Service Role Key for Edge Functions
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig

# n8n Configuration  
VITE_N8N_API_URL=http://18.221.12.50:5678/api/v1
VITE_N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU

# OpenAI Configuration (for Edge Functions)
OPENAI_API_KEY=your-openai-key-here

# Authentication Credentials (TESTED)
Test User: jayveedz19@gmail.com
Password: Goldyear2023#
Status: ✅ Active and verified
```

### **Core Database Schema (MVP)**
```sql
-- Core tables for MVP (simplified from complex schema)
users           -- Managed by Supabase Auth
projects        -- Project organization
workflows       -- Generated n8n workflows
conversations   -- Chat history per workflow
```

---

## 🚀 **User Journey Flow**

### **Primary User Path**
1. **Authentication**: Email/password sign in/up
2. **Project Dashboard**: Create/select project
3. **Chat Interface**: Enter natural language prompt
4. **GPT Processing**: System asks clarifying questions  
5. **Workflow Generation**: GPT creates n8n workflow specification
6. **Save & Deploy**: Store workflow, optionally deploy to n8n
7. **Status Monitoring**: Basic deployment status feedback

### **UI/UX Specifications** 
- **Minimalist Design**: Clean whitespace, readable typography
- **Three-Screen Flow**: Auth → Dashboard → Chat
- **Mobile-Responsive**: Works on all device sizes
- **Simple Feedback**: Loading spinners, success/error states
- **No Complex UI**: No agent panels, progress bars, real-time coordination

---

## 🛠️ **Development Commands**

### **Build & Deploy**
```bash
# Install and build (Netlify command)
npm install && npm run build

# Development server
cd frontend && npm run dev

# Deploy to Netlify (handled by git push)
git push origin main
```

### **Database Management**
```bash
# Run migrations (if needed)
node scripts/run-migration-direct.js

# Access Supabase dashboard
https://supabase.com/dashboard/project/zfbgdixbzezpxllkoyfc
```

---

## 🎯 **Current Build Status**

**✅ Build Ready for Netlify:**
- Frontend build: ✅ Successfully generating 720KB output
- Dependencies: ✅ All npm packages installed
- Configuration: ✅ netlify.toml properly configured
- Security headers: ✅ CSP and security policies set
- Environment variables: ✅ All contexts configured

**✅ Core Infrastructure:**
- Authentication: ✅ Supabase Auth working with test user
- Database: ✅ PostgreSQL with core tables
- n8n Integration: ✅ API key configured and tested
- Edge Functions: ✅ Deployment methods verified (MCP + CLI)

**Next Steps:**
1. Test complete user journey end-to-end
2. Fix any errors that arise during testing
3. Ensure MVP scope compliance
4. Deploy to Netlify for production

---

## 🔗 **Key Files for MVP Development**

**⚠️ CRITICAL: READ THESE FIRST**
- **`/docs/`** - **MAIN GUIDANCE DOCS** - Complete MVP specifications and requirements
- **`devhandoff.md`** - Current project status and team coordination  
- **`failures.md`** - Learning from implementation failures
- **`success.md`** - Replicating successful implementations

**Core MVP Specifications:**
- `docs/CLIXEN_MVP_SPEC.md` - Main requirements and scope
- `docs/CLIXEN_UI_UX_DESIGN_SPEC.md` - Interface specifications
- `docs/CLIXEN_MVP_ROADMAP.md` - Development timeline

**Frontend Core:**
- `frontend/src/pages/StandardAuth.tsx` - Authentication page
- `frontend/src/pages/StandardDashboard.tsx` - Project/workflow dashboard  
- `frontend/src/pages/StandardChat.tsx` - Chat interface
- `frontend/src/lib/supabase.ts` - Database integration
- `frontend/src/lib/workflowGenerator.ts` - GPT integration

**Backend Core:**
- `backend/supabase/functions/` - Edge Functions
- `netlify.toml` - Deployment configuration

---

## ⚠️ **Critical MVP Guidelines**

1. **Scope Discipline**: Implement exactly what's in `/docs` specifications
2. **No Feature Creep**: Resist adding complex features not in MVP scope
3. **Simple > Complex**: Always choose simpler implementation
4. **MVP Success Metrics**: Focus on the 4 core metrics defined in spec
5. **User Journey First**: Prioritize complete user flow over advanced features
6. **Read and proceed according rules.md** this set of rules are not restricting you but guide you to act safely.

## 📚 **Documentation Discipline**

**⚠️ NO MORE DOCUMENT SPAMMING**
- **NEVER** create new .md files after implementation
- **INSTEAD** update existing documentation:
  - **`failures.md`** - Document what didn't work and why
  - **`success.md`** - Document successful implementations for replication  
  - **`devhandoff.md`** - Update current project status and coordination
  - **`CLAUDE.md`** - Update architecture decisions and status
  - **`README.md`** - Update only if user-facing changes

**Documentation Flow:**
1. **Before Implementation**: Read `/docs` for requirements
2. **During Implementation**: Track progress in todos
3. **After Success**: Update `success.md` with working approach
4. **After Failure**: Update `failures.md` with lessons learned
5. **Project Changes**: Update `devhandoff.md` for team coordination

**Remember**: This is an MVP focused on **validating core value proposition** (natural language → n8n workflows) with **minimal complexity** and **maximum reliability**.