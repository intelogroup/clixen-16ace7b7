# Clixen MVP Specification - Workflow-Centric Design

## 1. Project Overview

**Clixen** is a workflow-centric automation platform that transforms natural language prompts into executable n8n workflows. This MVP focuses on delivering a streamlined, workflow-first experience where users can quickly create, deploy, and manage automation pipelines through conversational AI interactions.

## 2. BMAD Framework

### 2.1 Business Goals
- **Accelerate workflow automation**: Enable users to go from idea to running n8n workflow within minutes.
- **Lower technical barrier**: Provide an intuitive, chat-based interface so non-experts can build automations.
- **Drive adoption of n8n**: Showcase n8n capabilities via natural-language UX and seamless deployment.
- **Measure success**: Track user engagement (number of workflows created) and successful deployments.

### 2.2 Market & User Personas
| Persona             | Description                                          | Key Pain Points                           |
|---------------------|------------------------------------------------------|-------------------------------------------|
| Automation Enthusiast | Citizen developers wanting simple automations       | Steep learning curve of n8n visual editor  |
| Backend Engineer    | Developers building integrations and pipelines       | Manual JSON editing of workflows           |
| Operations Manager  | Teams coordinating cross-system processes            | Lack of visibility and reproducibility     |

### 2.3 Architecture & Core Features
This MVP follows a **workflow-centric architecture** with comprehensive user experience patterns:

1. **Modern Chat Interface (Frontend)**
   - Workflow-first dashboard with immediate access to creation and management
   - AI-powered conversational workflow builder with intelligent clarifying questions
   - Real-time deployment status monitoring and error recovery flows
   - Comprehensive mockups available: see `/docs/*_MOCKUP.md` files

2. **Intelligent Workflow Engine (Backend)**
   - GPT-4 powered natural language processing for workflow generation
   - n8n JSON generator with validation and self-healing capabilities
   - n8n MCP integration for dynamic node metadata and lifecycle management
   - User isolation with `[USR-{userId}]` prefixing for multi-tenant safety

3. **Robust Deployment & Monitoring**
   - Real-time deployment progress tracking with visual feedback
   - Automatic error recovery and retry mechanisms
   - Comprehensive execution history and performance analytics
   - Health monitoring with proactive issue detection

4. **Workflow Management System**
   - Workflow-centric dashboard replacing project-based organization
   - Advanced search, filtering, and tagging capabilities
   - Bulk operations for efficient workflow management
   - Performance analytics and usage tracking per workflow

5. **Authentication & Security**
   - Clerk Auth or NextAuth.js for authentication (OAuth + Email)
   - Convex DB built-in security with function-level access control
   - Secure token management and API key encryption
   - User workflow isolation in n8n Community Edition

6. **Analytics & Monitoring**
   - Real-time workflow execution tracking
   - Performance metrics and success rate monitoring
   - Usage analytics and cost attribution
   - Error tracking with detailed diagnostics

### 2.4 Out-of-Scope
- Multi-agent orchestration or specialist AI agents.
- Live workflow diagram rendering and interactive JSON editing.
- Advanced undo/redo or collaborative editing features.
- External OAuth providers beyond basic email/password.
- Rate-limiting, complex caching, or multi-tenant billing systems.

## 3. Acceptance Criteria
- **Authentication**: Users can sign up and sign in via email/password with smooth onboarding flow
- **Workflow Dashboard**: Users see a workflow-centric dashboard with all their automations at a glance
- **AI Chat Creation**: Users describe workflows in natural language (e.g., "send daily weather emails")
- **Intelligent Dialogue**: System asks clarifying questions and provides workflow summaries before creation
- **One-Click Deployment**: Users deploy workflows with real-time progress tracking and status updates
- **Workflow Management**: Full CRUD operations with search, filter, tagging, and bulk actions
- **Execution Monitoring**: Users view execution history, success rates, and performance metrics
- **Error Recovery**: Clear error messages with actionable recovery options and auto-retry mechanisms
- **Mobile Responsive**: Full functionality on all device sizes with touch-optimized interfaces

## 4. Success Metrics
- **User Onboarding**: ≥70% of new users complete their first workflow within 10 minutes of signup.
- **Workflow Persistence**: ≥90% of generated workflows are saved and retrievable in the dashboard.
- **Deployment Rate**: ≥80% of generated workflows are successfully deployed.
- **Telemetry Coverage**: Capture core user events (signup, workflow create, deploy, execution errors) in analytics; full coverage deferred post‑MVP.

## 5. User Experience Mockups
Complete visual mockups and interaction patterns are available:
- **Landing Page**: `/docs/LANDING_PAGE_MOCKUP.md`
- **Onboarding Flow**: `/docs/ONBOARDING_FLOW_MOCKUP.md`
- **Workflow Management**: `/docs/PROJECT_WORKFLOW_MANAGEMENT_MOCKUP.md`
- **Chat Interactions**: `/docs/CHAT_INTERACTION_PATTERNS_MOCKUP.md`
- **Deployment & Monitoring**: `/docs/DEPLOYMENT_STATUS_MONITORING_MOCKUP.md`
- **Navigation & Layout**: `/docs/NAVIGATION_LAYOUT_PATTERNS_MOCKUP.md`
- **Analytics Dashboard**: `/docs/ANALYTICS_DASHBOARD_MOCKUP.md`
- **Billing & Usage**: `/docs/BILLING_USAGE_COMPONENTS_MOCKUP.md`
- **Error Handling**: `/docs/ERROR_HANDLING_UI_MOCKUP.md`

## 6. Technical Implementation (Next.js + Convex Stack)

### **Frontend Stack**
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.x for type safety
- **Styling**: Tailwind CSS 3.x + shadcn/ui components
- **State Management**: Zustand + Convex real-time subscriptions
- **Forms**: React Hook Form + Zod validation

### **Backend Stack**
- **Database**: Convex DB (real-time, ACID compliant)
- **Functions**: Convex Functions for serverless backend logic
- **Authentication**: Clerk Auth with Convex integration
- **File Storage**: Convex File Storage or Uploadthing
- **Real-time**: WebSocket connections via Convex

### **Infrastructure**
- **Deployment**: Vercel for edge deployment + global CDN
- **Monitoring**: Vercel Analytics + Convex Dashboard
- **Error Tracking**: Sentry for production error monitoring
- **Integration**: n8n Community Edition via REST API
- **Testing**: Playwright for E2E, Vitest for unit tests

## 7. Technical Notes
Refer to `docs/TECH_NOTES.md` for detailed implementation guidelines on secret management, JSON validation and self‑healing, versioning, pagination, telemetry quotas, testing, migrations, and security practices.
