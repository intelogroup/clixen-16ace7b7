# 🤖 GitHub Copilot Instructions for Clixen<?xml version="1.0" encoding="utf-8"?>

<copilot-instructions>

## 📋 About This Project  <project>Clixen</project>

  <quickstart>

**Clixen** is a real-time voice assistant application that provides conversational AI with calendar integration.    <clone>git clone &lt;repo-url&gt;</clone>

    <install>npm install</install>

### Core Capabilities    <env>Copy .env.example and set Firebase and Google credentials</env>

- 🎤 **Real-time audio processing** via WebSocket connections  </quickstart>

- 🤖 **AI-powered conversations** using Google's Gemini API  <commands>

- 📅 **Calendar management** through Google Calendar API    <start>npm run web</start>

- 🔐 **Firebase authentication** for user management    <dev>npm run web:dev</dev>

- 💾 **Firestore** for persistent data storage    <test>npm test</test>

  </commands>

---  <workflow>

    <branch>Use feature branches: feat/short-desc</branch>

## 🚀 Quick Start    <commit>Small, focused commits. First line summary.</commit>

    <pr>Small PRs, include tests, request reviews</pr>

### Setup  </workflow>

```bash  <rules>

# Clone repository    <do>Use dependency injection</do>

git clone <repo-url>    <do>Add JSDoc for public APIs</do>

    <dont>Commit secrets</dont>

# Install dependencies    <dont>Leave console.debug in production</dont>

npm install  </rules>

  <contact>Open an issue for questions or tag a maintainer</contact>

# Configure environment</copilot-instructions>

# Copy .env.example and set Firebase and Google credentials# 🤖 GitHub Copilot Guide for Clixen

```

## 📋 About This Project

### Commands

```bashClixen is a real-time voice assistant application that provides conversational AI with calendar integration. The system combines:

npm run web       # Start production server

npm run web:dev   # Start development server- **Real-time audio processing** via WebSocket connections

npm test          # Run tests- **AI-powered conversations** using Google's Gemini API

```- **Calendar management** through Google Calendar API

- **Firebase authentication** for user management

---- **Firestore** for persistent data storage



## 🏗️ Architecture OverviewThe architecture follows a modular, service-oriented design with clear separation between frontend, backend, and shared concerns.



### Backend Structure---

```

backend/## �️ Architecture Overview

├── api/              # HTTP endpoints

│   ├── controllers/  # Request handlers### **Backend Structure**

│   └── routes/       # Route definitions```

├── server/backend/

│   ├── middleware/   # Authentication, validation├── api/              # HTTP endpoints

│   ├── services/     # Business logic (audio, calendar, gemini, firestore)│   ├── controllers/  # Request handlers

│   ├── websocket/    # Real-time communication│   └── routes/       # Route definitions

│   └── utils/        # Helper functions├── server/

└── config/           # Configuration management│   ├── middleware/   # Authentication, validation

```│   ├── services/     # Business logic (audio, calendar, gemini, firestore)

│   ├── websocket/    # Real-time communication

### Frontend Structure│   └── utils/        # Helper functions

```└── config/           # Configuration management

frontend/```

├── next-app/         # Next.js application (primary)

└── public/           # Legacy vanilla JS client### **Frontend Structure**

``````

frontend/

### Technology Stack├── next-app/         # Next.js application (primary)

- **Backend:** Node.js, Express, WebSocket└── public/           # Legacy vanilla JS client

- **Frontend:** Next.js (React), vanilla JavaScript (legacy)```

- **AI:** Google Gemini API for conversational AI

- **Audio:** Google Cloud Speech-to-Text and Text-to-Speech### **Key Technologies**

- **Database:** Firebase Firestore- **Backend:** Node.js, Express, WebSocket

- **Authentication:** Firebase Auth- **Frontend:** Next.js (React), vanilla JavaScript (legacy)

- **Calendar:** Google Calendar API- **AI:** Google Gemini API for conversational AI

- **Audio:** Google Cloud Speech-to-Text and Text-to-Speech

---- **Database:** Firebase Firestore

- **Authentication:** Firebase Auth

## 📝 Development Workflow- **Calendar:** Google Calendar API



### Branching Strategy---

- Use feature branches: `feat/short-description`
- Keep branches focused and short-lived

### Commit Guidelines
- Write small, focused commits
- First line: concise summary (50 chars max)
- Add detailed description if needed

### Pull Requests
- Keep PRs small and reviewable
- Include tests for new functionality
- Request reviews from team members

---

## ✅ Coding Standards

### Do's ✓
- ✓ Use dependency injection for services
- ✓ Add JSDoc comments for public APIs
- ✓ Write unit tests for business logic
- ✓ Handle errors gracefully
- ✓ Use meaningful variable names

### Don'ts ✗
- ✗ Never commit secrets or credentials
- ✗ Don't leave `console.debug` in production code
- ✗ Avoid hard-coding configuration values
- ✗ Don't bypass authentication middleware

---

## 🤖 Copilot Behavior Guidelines

### Documentation Policy
**⚠️ DO NOT create .md files after each run or task completion.**

When generating summaries or documentation:
- ✓ Add summaries and updates directly in chat responses
- ✓ Update existing documentation files when necessary
- ✗ **Do not create new markdown files for status updates**
- ✗ **Do not spam the docs/ folder with task summaries**

If you need to generate a summary:
- Present it in the chat conversation
- Only create/update files when explicitly requested

### Communication Style
- Keep responses concise and actionable
- Provide code examples when helpful
- Reference existing documentation when available

---

## 📞 Support

- Open an issue for questions or bug reports
- Tag a maintainer for urgent matters
- Check existing documentation in `docs/` folder
