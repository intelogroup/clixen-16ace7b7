# Clixen - AI Voice Calendar Assistant

**Status:** 🚧 In Migration to Next.js + Modular Architecture  
**Version:** 2.0.0 (Migration in Progress)

Clixen is an AI-powered voice assistant that helps you manage your Google Calendar through natural conversation. Built with Gemini AI, Next.js, and Firebase.

## 📋 Migration Notice

We are currently refactoring from a monolithic Express server to a modern, modular architecture with Next.js frontend and organized backend services.

**📚 Migration Documentation:**
- [Migration Plan](./docs/MIGRATION_PLAN.md) — Detailed phased migration plan
- [Plan Review](./docs/PLAN_REVIEW.md) — Codebase analysis and validation
- [Architecture Decision Record](./docs/adr/0001-nextjs-firebase-streaming.md) — Key technical decisions
- [Folder Structure](./docs/FOLDER_STRUCTURE.md) — New directory layout and guidelines

**Current Phase:** Phase 0 Complete ✅ | Phase 1 Next (Backend Modularization)

## ✨ Features

- 🎤 **Voice Interaction** — Talk naturally to manage your calendar
- 📅 **Smart Calendar Management** — Create, update, delete events via voice
- 🔄 **Real-time Streaming** — Instant responses with WebSocket streaming
- 💾 **Persistent Conversations** — Conversations saved to Firestore
- 🔐 **Secure Authentication** — Firebase Auth + Google OAuth
- 🎨 **Modern UI** — Next.js with shadcn/ui (Vercel-style minimalism)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Project with Calendar API, Speech-to-Text, Text-to-Speech, and Gemini API enabled
- Firebase project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd clixen
npm install
```

2. Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
# Edit .env with your API keys and credentials
```

3. Set up Google Cloud credentials:
   - Place Firebase service account JSON in `backend/credentials/firebase-service-account.json`
   - Place Google Cloud credentials JSON in `backend/credentials/google-cloud-credentials.json`
   - Store OAuth tokens in `tokens/` directory (auto-generated on first auth)

### Running the Application

**Development (Current Monolithic Server):**
```bash
npm run web              # Start web server on port 3001
npm run web:dev          # Start with nodemon (auto-reload)
```

**Testing:**
```bash
npm test                 # Run all tests
npm run test:ui          # Run tests with UI
npm run verify           # Verify AI calendar setup
```

## Quick Start

### Test API Key (Public Access Only)
```bash
npm test                    # Basic API key validation
node calendar-test.js       # Comprehensive public calendar tests
```

### Authenticate with OAuth (Full Access)
```bash
npm run auth                # Start OAuth authentication flow
npm run auth:test           # Test OAuth authentication
npm run demo                # Run authenticated demo
npm run auth:logout         # Revoke authentication
```

## Authentication Types

### 1. API Key Authentication
- ✅ Access public calendars
- ✅ Read calendar metadata (colors, settings)
- ✅ Free/busy queries on public calendars
- ❌ Cannot access private calendars
- ❌ Cannot create/modify events

**Files**: `test-api.js`, `calendar-test.js`, `index.js`

### 2. OAuth 2.0 Authentication
- ✅ Full access to your calendars
- ✅ Create, read, update, delete events
- ✅ Manage calendar settings
- ✅ Access private calendar data
- ✅ Share calendars and manage permissions

**Files**: `oauth-setup.js`, `authenticated-calendar.js`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run main application |
| `npm test` | Test API key validation |
| `npm run auth` | Authenticate with Google OAuth |
| `npm run auth:test` | Test OAuth authentication |
| `npm run auth:logout` | Revoke authentication token |
| `npm run demo` | Run authenticated calendar demo |

## 📁 Project Structure

```
clixen/
├── backend/                      # NEW: Backend services (in progress)
│   ├── api/                      # HTTP routes and controllers
│   ├── server/                   # Business logic (services, middleware, websocket)
│   ├── config/                   # Configuration files
│   └── credentials/              # 🔒 Secure credentials (not committed)
├── frontend/
│   ├── next-app/                 # NEW: Next.js application (pending)
│   └── legacy/                   # OLD: Current public/ files
├── public/                       # Current static files and frontend
├── tests/                        # Test files
├── docs/                         # Documentation
│   ├── adr/                      # Architecture Decision Records
│   ├── MIGRATION_PLAN.md
│   ├── PLAN_REVIEW.md
│   └── FOLDER_STRUCTURE.md
├── lib/                          # Shared utilities
├── scripts/                      # Migration and utility scripts
├── web-server.js                 # Current monolithic server (3,284 lines)
├── .env.example                  # Environment variables template
└── package.json
```

See [FOLDER_STRUCTURE.md](./docs/FOLDER_STRUCTURE.md) for detailed structure and guidelines.

## Usage Examples

### Authenticate and List Calendars
```bash
npm run auth        # Opens browser for authentication
npm run auth:test   # Lists your calendars
```

### Run Authenticated Demo
```bash
npm run demo        # Shows calendars and upcoming events
```

### Use in Your Code
```javascript
const AuthenticatedCalendarAPI = require('./authenticated-calendar');

async function main() {
    const calendarAPI = new AuthenticatedCalendarAPI();
    await calendarAPI.initialize();
    
    // List calendars
    const calendars = await calendarAPI.listCalendars();
    
    // Get upcoming events
    const events = await calendarAPI.listUpcomingEvents('primary', 10);
    
    // Create an event
    const event = {
        summary: 'Team Meeting',
        start: { dateTime: '2025-10-28T14:00:00-07:00' },
        end: { dateTime: '2025-10-28T15:00:00-07:00' },
    };
    await calendarAPI.createEvent('primary', event);
}

main();
```

## API Scopes

The OAuth authentication requests these scopes:
- `calendar.readonly` - Read-only access to calendars
- `calendar.events` - Manage calendar events
- `calendar` - Full calendar access

## 🏗️ Architecture

### Current (Monolithic)
- Single `web-server.js` (3,284 lines)
- Express + WebSocket server
- In-memory conversation storage
- Chunked audio streaming

### Target (Modular)
- Next.js frontend (TypeScript, Tailwind, shadcn/ui)
- Modular backend (routes → controllers → services)
- Firestore for conversation persistence
- Full audio upload + streaming text response
- WebSocket for real-time streaming

**Read more:** [Architecture Decision Record](./docs/adr/0001-nextjs-firebase-streaming.md)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:conflicts        # Conflict detection tests
npm run test:ui               # Interactive test UI
npm run gemini:test           # Gemini AI tests
npm run stt:sample            # Speech-to-text tests
npm run firebase:status       # Check Firebase status
```

## 📖 Documentation

- [API Reference](./docs/API_REFERENCE.md) — Current API endpoints
- [Architecture](./docs/ARCHITECTURE.md) — System design
- [Migration Plan](./docs/MIGRATION_PLAN.md) — Step-by-step migration guide
- [Folder Structure](./docs/FOLDER_STRUCTURE.md) — Directory layout
- [Function Calling Guide](./docs/FUNCTION_CALLING_GUIDE.md) — Gemini function calling
- [Performance Optimizations](./docs/PERFORMANCE_OPTIMIZATIONS.md) — Speed improvements
- [Firebase Auth Setup](./docs/FIREBASE_AUTH_SETUP.md) — Authentication guide

## 🔐 Security

- Never commit files in `backend/credentials/`
- Use `.env` for secrets (see `.env.example`)
- OAuth tokens stored in `tokens/` directory (in `.gitignore`)
- Firebase service account JSON must be kept secure

## 🤝 Contributing

We're currently in active migration. See [MIGRATION_PLAN.md](./docs/MIGRATION_PLAN.md) for how to contribute.

**Current Focus:** Phase 1 - Backend Modularization

## 📝 License

MIT

## 🔗 Resources

- [Google Calendar API Reference](https://developers.google.com/calendar/api/v3/reference)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)