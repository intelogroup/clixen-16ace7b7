# Frontend Modification Plan

This document outlines how to adapt the existing Clixen frontend codebase for the MVP scope defined in CLIXEN_MVP_SPEC.md and CLIXEN_MVP_ROADMAP.md. It will guide product and UI/UX designers through the relevant code areas and planned changes.

## 1. Overview
- Align the UI/UX with MVP requirements: authentication, project dashboard, interactive chat, deployment status, telemetry, and mobile responsiveness.
- Reference existing screenshot assets (ui-test-results/, screenshots/) for visual guidance.

## 2. Codebase Structure
- **src/pages/**: high-level routes and page layouts (Auth, Dashboard, Chat).
- **src/components/**: reusable UI components (Layout, MessageBubble, Loading states, etc.).
- **src/lib/hooks/** and **src/lib/api/**: data fetching, Supabase integration, and telemetry hooks.

## 3. Key Pages & Components
- **Auth pages** (src/pages/Auth.tsx, StandardAuth.tsx): sign up / sign in flows.
- **Dashboard pages** (src/pages/Dashboard.tsx, StandardDashboard.tsx): project selection and workflow list.
- **Chat pages** (src/pages/Chat.tsx, StandardChat.tsx): prompt entry and chat history view.
- **Layout components** (src/components/Layout.tsx, StandardLayout.tsx): global navigation, protected routes.
- **UI primitives** (src/components/LoadingButton.tsx, MessageBubble.tsx, TypingIndicator.tsx): feedback and status.

## 4. Required Modifications
### 4.1 Authentication & Routing
- Ensure Supabase email/password auth is wired into Auth pages and AuthContext.
- Protect all MVP routes behind Auth (ProtectedRoute component).

### 4.2 Project Dashboard
- Extend Dashboard page to list workflows per project with name, creation date, and deployment status.
- Add project selection/creation UI if not present.

### 4.3 Interactive Chat Interface
- Persist chat history per workflow: load and store messages in Supabase.
- Add “New Chat” button to clear conversation context.
- Integrate LoadingOverlay/TypingIndicator for request states.

### 4.4 Deployment Status
- On Chat page or Dashboard, show deployment status controls and indicators (loading spinner, success/failure banners).

### 4.5 Telemetry Integration
- Import and invoke telemetry hooks (useTelemetry or similar) at: auth events, workflow generation, deployment actions.

### 4.6 Responsive Design
- Audit existing mobile breakpoints in UI components and pages.
- Ensure chat and dashboard are mobile-friendly (refer to ui-test-results/*.png).

## 5. Handoff & Next Steps
- Share this plan along with MVP spec and roadmap with product and UI/UX designers.
- Designers review screenshots and code, propose mockups or component refinements.
- Iterate on component API and pages before development kick-off.

---
_Document generated based on MVP specification and existing frontend assets._
