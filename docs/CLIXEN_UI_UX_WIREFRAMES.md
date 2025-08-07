# Clixen MVP ASCII Wireframes & Design Deliverables

This document provides low-fidelity ASCII wireframes aligned with the UI/UX design spec (BMAD framework) for Clixen MVP.

## BMAD Summary for Design Deliverables
**Business Goals:**
- Intuitive minimal interface that accelerates onboarding and workflow creation.
- Clear feedback loops for deployment status and errors to ensure reliability.

**Market & Personas:**
- New User, Power User, Mobile Operator (see UI/UX spec for details).

**Architecture & Core Screens:**
- Auth Page
- Project Dashboard (empty & list views)
- Chat Interface (empty & conversation history)
- Deployment Status Indicator

**Delivery Plan:**
1. Generate ASCII wireframes (this document)
2. Produce low-fidelity digital wireframes
3. Create high-fidelity mockups (desktop & mobile)
4. Hand off design tokens & style guide

---

## 1. Auth Page
```
┌─────────────────────────────────────────────┐
│               Clixen Logo                  │
│---------------------------------------------│
│ Email address: [_________________________]  │
│ Password:      [_________________________]  │
│                                             │
│ [ Sign In ]      [ Create Account ]         │
│                                             │
│       Forgot password?                     │
└─────────────────────────────────────────────┘
```

## 2. Project Dashboard

### 2.1 Empty State
```
┌─────────────────────────────────────────────┐
│ Projects                                   │
│---------------------------------------------│
│ You have no projects yet.                  │
│                                             │
│       [ + Create New Project ]             │
└─────────────────────────────────────────────┘
```

### 2.2 Project & Workflow List View
```
┌─────────────────────────────────────────────┐
│ Projects                                   │
│---------------------------------------------│
│ [Project: Marketing Automations]  • 3 flows │
│   • Slack Notifier      Success  2025-08-01 │
│   • RSS Digest          Pending  2025-07-29 │
│   • CRM Sync           Failed    2025-07-28 │
│                                             │
│ [Project: Alerts & Reports]  • 2 flows      │
│   • Daily Summary      Success  2025-08-02 │
│   • Threshold Alert    Pending  2025-08-03 │
│                                             │
│ [ + Create New Project ]                   │
└─────────────────────────────────────────────┘
```

## 3. Chat Interface

### 3.1 Empty Conversation State
```
┌─────────────────────────────────────────────┐
│ Project: Marketing Automations             │
├─────────────────────────────────────────────┤
│ Start a new conversation to define a flow. │
│                                             │
│ [ New Chat ]                                │
└─────────────────────────────────────────────┘
```

### 3.2 Chat with History and Input
```
┌─────────────────────────────────────────────┐
│ Project: Marketing Automations             │
├─────────────────────────────────────────────┤
│ [09:02] User: Send a Slack alert on new DB  │
│         entries.                           │
│ [09:02] Bot: Sure—here's the workflow...    │
│                                             │
│ [09:05] User: Add email notification.      │
│ [09:05] Bot: Updated, deploying next.      │
│                                             │
│ ──────────────────────────────────────────  │
│ > [ Type a message...                    ] │
│                                             │
│ [ Send ]             [ New Chat ]          │
└─────────────────────────────────────────────┘
```

## 4. Deployment Status Indicator
```
┌──────────────── Deployment Status ─────────┐
│ ⚙️ Deploying flow “Slack Notifier”...      │
│ [Loading spinner]                         │
└─────────────────────────────────────────────┘
┌──────────────── Deployment Status ─────────┐
│ ✅ Flow “Slack Notifier” deployed!         │
└─────────────────────────────────────────────┘

---

_End of ASCII wireframes for Clixen MVP UI._
