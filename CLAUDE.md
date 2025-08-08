7# Clixen Project - AI WORKFLOW AUTOMATION MVP ✅

## 🎯 **SIMPLIFIED NATURAL-LANGUAGE WORKFLOW CREATOR**

**🌐 Live URLs:**
- **Frontend App**: http://18.221.12.50 ✅ (HTTPS-ready)
- **Authentication**: Working with real credentials ✅
- **Supabase Backend**: https://zfbgdixbzezpxllkoyfc.supabase.co ✅
- **n8n Interface**: http://18.221.12.50:5678 ✅

**Last Updated**: August 8, 2025 | **Status**: Security Enhanced MVP | **Architecture**: Netlify Static + Supabase + n8n Community

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

## 🔐 **MVP Security Implementation (50-User Trial)**

### **User Isolation Strategy**
For our 50-user MVP trial with n8n Community Edition (self-hosted), we implement a pragmatic security approach:

1. **Workflow Naming Convention**: `[USR-{userId}] {workflowName}`
   - Every workflow is prefixed with user identifier
   - Prevents naming collisions between users
   - Enables easy identification and cleanup

2. **Webhook Path Security**: `webhook/{userHash}/{timestamp}/{random}`
   - Unguessable webhook URLs per user
   - Timestamp prevents replay attacks
   - Random suffix ensures uniqueness

3. **Supabase as Source of Truth**
   - All workflow metadata stored in Supabase with RLS
   - Dashboard queries only from Supabase (never direct n8n)
   - User can only see their own workflows via RLS policies

4. **Data Flow Architecture**:
   ```
   User → Frontend → Supabase (RLS) → Edge Functions → n8n API
                          ↑                              ↓
                     [Source of Truth]          [Execution Engine]
   ```

### **Implementation Components**

**Backend Services:**
- `/backend/supabase/functions/_shared/workflow-isolation.ts` - User isolation utilities
- `/backend/scripts/workflow-cleanup.ts` - GDPR-compliant data deletion
- `/backend/supabase/migrations/20250108_user_workflow_sync.sql` - RLS policies

**Frontend Services:**
- `/frontend/src/lib/services/workflowService.ts` - User-scoped workflow operations
- Dashboard components only query Supabase (never n8n directly)

### **Known Limitations (Accepted for MVP)**
- n8n admin panel shows all workflows (users don't have access)
- Execution logs are global (mitigated by user prefixes)
- Resource limits shared across users (monitoring for abuse)
- No workflow execution sandboxing (acceptable for 50 trusted users)

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

## 🚀 **User Journey Flow (Enhanced with 2-Way Sync)**

### **Primary User Path**
1. **Authentication**: Email/password sign in/up
2. **Project Dashboard**: Create/select project
3. **Chat Interface**: Enter natural language prompt
4. **GPT Processing**: System asks clarifying questions  
5. **Workflow Generation**: GPT creates n8n workflow with user prefix
6. **Save & Deploy**: Store in Supabase + deploy to n8n with isolation
7. **Status Monitoring**: Real-time sync between Supabase and n8n

### **2-Way Synchronization Flow**
```
CREATE/UPDATE:
User Action → Supabase (RLS) → Edge Function → n8n API
                    ↓                              ↓
              [Store Metadata]            [Deploy with USR prefix]

READ/DISPLAY:
Dashboard ← Supabase (RLS) ← Sync Service ← n8n Status
              ↑
        [User sees only their workflows]

DELETE/CLEANUP:
User Delete → Supabase Soft Delete → Cleanup Job → n8n Hard Delete
```

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

## 🎯 **Implementation Plan for Engineering Team**

### **Phase 1: Backend Security Layer (Day 1)**
**Owner: Backend Engineer**

1. **Deploy Workflow Isolation Manager**
   - [ ] Deploy `/backend/supabase/functions/_shared/workflow-isolation.ts`
   - [ ] Update `ai-chat-simple` Edge Function with user prefixing
   - [ ] Test workflow naming with multiple users

2. **Database Migration**
   - [ ] Run migration: `/backend/supabase/migrations/20250108_user_workflow_sync.sql`
   - [ ] Verify RLS policies are enforcing user isolation
   - [ ] Test that users can only see their own workflows

3. **Cleanup Utilities**
   - [ ] Deploy `/backend/scripts/workflow-cleanup.ts`
   - [ ] Schedule weekly cleanup job for inactive workflows
   - [ ] Test user data deletion flow

### **Phase 2: Frontend Integration (Day 2)**
**Owner: Frontend Engineer**

1. **Dashboard Updates**
   - [ ] Integrate `WorkflowService` in StandardDashboard
   - [ ] Remove any direct n8n API calls from frontend
   - [ ] Ensure all workflow queries go through Supabase

2. **UI Components Needed**
   - [ ] Workflow status badges (deployed/draft/error)
   - [ ] Workflow actions menu (Edit/Archive/Delete)
   - [ ] Execution count display
   - [ ] Last accessed timestamp
   - [ ] Project selector dropdown

3. **Chat Interface Enhancements**
   - [ ] Add workflow name input field
   - [ ] Display deployment status in real-time
   - [ ] Show webhook URL (if applicable)
   - [ ] Add "Test Workflow" button

### **Phase 3: 2-Way Sync Implementation (Day 3)**
**Owner: Full-Stack Engineer**

1. **Sync Service Creation**
   ```typescript
   // Create new Edge Function: workflow-sync
   - Poll n8n for execution status
   - Update Supabase with execution counts
   - Handle workflow state changes
   - Implement retry logic for failed syncs
   ```

2. **Real-time Updates**
   - [ ] Setup Supabase Realtime for workflow status
   - [ ] Implement WebSocket connection in frontend
   - [ ] Auto-refresh dashboard on status changes

3. **Error Handling**
   - [ ] Graceful degradation if n8n is down
   - [ ] Queue failed deployments for retry
   - [ ] User-friendly error messages

### **Phase 4: Testing & Validation (Day 4)**
**Owner: QA + All Engineers**

1. **User Isolation Testing**
   - [ ] Create 5 test users
   - [ ] Deploy workflows from each user
   - [ ] Verify dashboard isolation
   - [ ] Test webhook uniqueness

2. **2-Way Sync Testing**
   - [ ] Deploy workflow → Verify in n8n
   - [ ] Execute in n8n → Verify count in Supabase
   - [ ] Delete in dashboard → Verify removal from n8n
   - [ ] Test error scenarios

3. **Performance Testing**
   - [ ] Dashboard load time < 3s with 50 workflows
   - [ ] Deployment time < 5s
   - [ ] Sync delay < 2s

### **Phase 5: MVP Release Prep (Day 5)**
**Owner: DevOps + Product**

1. **Deployment Checklist**
   - [ ] Remove all hardcoded API keys
   - [ ] Set environment variables in Netlify
   - [ ] Enable Supabase RLS on all tables
   - [ ] Deploy Edge Functions to production

2. **User Communication**
   - [ ] Prepare disclaimer for 50 beta users
   - [ ] Create onboarding email with limitations
   - [ ] Setup support channel for feedback

3. **Monitoring Setup**
   - [ ] Workflow creation metrics
   - [ ] Deployment success rate
   - [ ] User activity tracking
   - [ ] Error rate monitoring

## 🎯 **Current Build Status**

**✅ Security Enhancements Completed:**
- User isolation: ✅ Workflow naming convention implemented
- Database security: ✅ RLS policies configured
- Cleanup utilities: ✅ GDPR-compliant deletion ready
- Frontend service: ✅ WorkflowService with user scoping

**🔄 In Progress:**
- 2-way sync service implementation
- Dashboard UI updates for workflow management
- Real-time status updates

**📋 Ready for Testing:**
- User isolation with [USR-] prefixes
- Supabase-only dashboard queries
- Workflow cleanup scripts

**Next Sprint Focus:**
1. Complete 2-way sync implementation
2. Add missing UI components
3. Run full integration tests with 5 users
4. Deploy to production for 50-user trial

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