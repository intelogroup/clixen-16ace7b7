# Clixen MVP Digital Wireframes

This document provides low-fidelity digital wireframes (greyscale) for the core Clixen MVP screens. Use these layouts as the basis for high-fidelity mockups.

## 1. Auth Page (Sign In / Sign Up)
- **Header**: centered logo (docs/clixen_logo.svg)
- **Form Card**: vertically and horizontally centered
  - Email input field
  - Password input field
  - Primary button: "Sign In" (or "Sign Up")
  - Link: "Create an account" / "Already have an account? Sign in"
- **Footer Text**: terms and privacy link, small font

## 2. Project Dashboard

### 2.1 Empty State
- **Header**: logo, user avatar menu
- **Main**: centered placeholder card
  - Text: "No projects yet"
  - Primary button: "Create New Project"

### 2.2 List View
- **Header**: logo, user avatar, "Create New Project" button
- **Sidebar**: (optional) project list navigation
- **Main Grid**: project/workflow cards
  - Title, status badge (Pending / Deployed / Failed), creation date
  - "View" action

## 3. Chat Interface

### 3.1 Empty State
- **Header**: back arrow, project name, "New Chat" button
- **Main**: centered placeholder text: "Start a new conversation"
- **Footer**: disabled text input + send icon button

### 3.2 Conversation View
- **Header**: back arrow to dashboard, project name, "New Chat" button
- **Main**: scrollable chat history
  - User messages (right-aligned bubbles)
  - System responses (left-aligned bubbles)
- **Footer**: active text input + send button (with loading spinner on submit)

## 4. Deployment Status Panel
- Inline panel above chat input or as toast
  - Spinner + "Deploying workflow..."
  - Success: ✔️ "Workflow deployed"
  - Error: ❌ "Deployment failed" + retry link

---
_End of digital wireframes document. Proceed to hi-fidelity mockups based on these layouts._
