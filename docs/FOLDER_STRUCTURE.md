# Clixen - Folder Structure

**Updated:** October 28, 2025  
**Status:** 🚧 In Migration

---

## Overview

This document describes the new modular folder structure for the Clixen voice assistant. We are migrating from a monolithic `web-server.js` (3,284 lines) to a clean, testable architecture.

---

## Structure

```
clixen/
├── backend/                          # Backend services
│   ├── api/                          # HTTP API layer
│   │   ├── routes/                   # Express route definitions
│   │   │   ├── auth.routes.js       # /auth, /logout, /api/auth/callback
│   │   │   ├── calendar.routes.js   # /api/calendar-status
│   │   │   ├── conversation.routes.js # /api/conversation-history
│   │   │   ├── audio.routes.js      # /api/process-audio, /response-audio.mp3
│   │   │   ├── chat.routes.js       # /api/chat
│   │   │   ├── health.routes.js     # /api/health
│   │   │   └── index.js             # Route aggregator
│   │   └── controllers/              # Request handlers
│   │       ├── auth.controller.js
│   │       ├── audio.controller.js
│   │       ├── chat.controller.js
│   │       ├── calendar.controller.js
│   │       └── conversation.controller.js
│   ├── server/                       # Core business logic
│   │   ├── services/                 # Business services
│   │   │   ├── audio/
│   │   │   │   ├── transcription.js # Google Speech-to-Text
│   │   │   │   ├── tts.js           # Google Text-to-Speech
│   │   │   │   └── storage.js       # Audio file storage (GCS)
│   │   │   ├── calendar/
│   │   │   │   ├── client.js        # OAuth client, getCalendarClient
│   │   │   │   ├── operations.js    # listEvents, createEvent, etc.
│   │   │   │   ├── conflicts.js     # checkConflicts
│   │   │   │   ├── timezone.js      # getCachedTimezone
│   │   │   │   └── parallel.js      # Parallel function execution
│   │   │   ├── gemini/
│   │   │   │   ├── client.js        # Gemini AI client
│   │   │   │   ├── config.js        # Model config, system instructions
│   │   │   │   └── functions.js     # calendarFunctions array
│   │   │   ├── firestore/
│   │   │   │   ├── conversations.js # Conversation CRUD
│   │   │   │   ├── messages.js      # Message CRUD
│   │   │   │   └── index.js         # Firestore client init
│   │   │   └── cache/
│   │   │       ├── timezone.js      # Timezone cache (24h TTL)
│   │   │       ├── calendar.js      # Calendar query cache (5min TTL)
│   │   │       └── conversation.js  # Conversation cache
│   │   ├── middleware/
│   │   │   ├── auth.js              # verifyFirebaseToken
│   │   │   ├── rateLimit.js         # Rate limiting
│   │   │   ├── errorHandler.js      # Centralized error handling
│   │   │   └── validation.js        # Request validation
│   │   ├── websocket/
│   │   │   ├── server.js            # WebSocket server setup
│   │   │   ├── handlers/
│   │   │   │   ├── audio.handler.js # Audio streaming handlers
│   │   │   │   ├── text.handler.js  # Text message handlers
│   │   │   │   └── index.js         # Message router
│   │   │   └── connectionManager.js # Connection tracking, heartbeat
│   │   └── utils/
│   │       ├── logger.js            # Structured logging
│   │       ├── errors.js            # Custom error classes
│   │       ├── validation.js        # Input validators
│   │       └── config.js            # Centralized config
│   ├── config/
│   │   ├── firebase.js              # Firebase Admin SDK init
│   │   ├── google.js                # Google API credentials
│   │   └── constants.js             # MAX_HISTORY_MESSAGES, CACHE_DURATIONS
│   ├── credentials/                  # 🔒 NEVER COMMIT (in .gitignore)
│   │   ├── firebase-service-account.json
│   │   └── google-cloud-credentials.json
│   ├── workers/                      # Background jobs (existing)
│   └── index.js                      # Main server entry point
├── frontend/
│   ├── next-app/                     # NEW: Next.js application
│   │   ├── app/                      # App router pages
│   │   │   ├── page.tsx             # Home page
│   │   │   ├── conversation/
│   │   │   │   └── page.tsx         # Main chat interface
│   │   │   ├── settings/
│   │   │   │   └── page.tsx         # User settings
│   │   │   ├── auth/
│   │   │   │   └── login/
│   │   │   │       └── page.tsx     # Login page
│   │   │   └── layout.tsx           # Root layout
│   │   ├── components/               # React components
│   │   │   ├── Header.tsx
│   │   │   ├── ConversationView.tsx
│   │   │   ├── AudioInput.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── textarea.tsx
│   │   ├── lib/                      # Utilities
│   │   │   ├── firebase.ts          # Firebase client config
│   │   │   ├── api.ts               # API client
│   │   │   ├── websocket.ts         # WebSocket client
│   │   │   └── utils.ts             # Helper functions
│   │   ├── hooks/
│   │   │   ├── useAuth.ts           # Auth hook
│   │   │   ├── useConversation.ts   # Conversation hook
│   │   │   └── useWebSocket.ts      # WebSocket hook
│   │   ├── public/                   # Static assets
│   │   ├── styles/                   # Global styles
│   │   │   └── globals.css
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   └── package.json
│   └── legacy/                       # OLD: public/ files (for reference)
│       ├── app.js
│       ├── audio-worker.js
│       ├── firebase-auth.js
│       ├── index.html
│       ├── styles.css
│       └── websocket-client.js
├── lib/                               # Shared utilities
│   ├── types.ts                      # TypeScript types
│   └── constants.ts                  # Shared constants
├── scripts/                           # Utility scripts
│   ├── migrate-conversations.js     # Migrate in-memory → Firestore
│   ├── seed-firestore.js            # Seed test data
│   └── backup-firestore.js          # Backup Firestore data
├── tests/                             # Test files (existing)
│   ├── integration/                  # NEW: Integration tests
│   │   ├── audio-flow.test.js
│   │   ├── websocket.test.js
│   │   └── firestore.test.js
│   └── unit/                         # NEW: Unit tests
│       ├── services/
│       │   ├── cache.test.js
│       │   ├── calendar.test.js
│       │   └── gemini.test.js
│       └── utils/
│           └── validation.test.js
├── docs/                              # Documentation
│   ├── adr/                          # Architecture Decision Records
│   │   └── 0001-nextjs-firebase-streaming.md
│   ├── MIGRATION_PLAN.md            # Step-by-step migration plan
│   ├── PLAN_REVIEW.md               # Codebase analysis
│   ├── FOLDER_STRUCTURE.md          # This file
│   ├── API_REFERENCE.md             # (existing)
│   ├── ARCHITECTURE.md              # (existing)
│   └── ...                           # Other docs
├── public/                            # OLD: Static files (to be migrated)
├── tokens/                            # OAuth tokens (filesystem)
├── .env.example                      # Environment template
├── .gitignore
├── package.json
├── vitest.config.js
├── web-server.js                     # OLD: Monolithic server (to be refactored)
└── README.md

```

---

## Key Directories

### `backend/api/`
HTTP API layer. Routes are thin wrappers that delegate to controllers. Controllers orchestrate service calls.

### `backend/server/services/`
Core business logic. Each service has a single responsibility and can be tested in isolation.

### `backend/server/middleware/`
Express middleware for cross-cutting concerns (auth, rate limiting, error handling).

### `backend/server/websocket/`
WebSocket server for real-time streaming. Handlers process different message types.

### `backend/config/`
Configuration and initialization code (Firebase, Google APIs, constants).

### `frontend/next-app/`
Next.js application with App Router. TypeScript, Tailwind CSS, and shadcn/ui.

### `frontend/legacy/`
Old frontend files from `public/` kept for reference during migration.

### `lib/`
Shared utilities and types used by both frontend and backend.

### `scripts/`
Migration scripts, seed scripts, and backup utilities.

### `tests/integration/` and `tests/unit/`
Organized tests by type. Integration tests cover end-to-end flows. Unit tests cover individual services.

### `docs/adr/`
Architecture Decision Records documenting key technical decisions.

---

## Migration Status

| Module | Status | Notes |
|--------|--------|-------|
| Folder structure | ✅ Complete | Skeleton created |
| Documentation | ✅ Complete | MIGRATION_PLAN.md, ADR 0001 |
| Cache services | 🚧 Pending | Extract from web-server.js |
| Calendar services | 🚧 Pending | Extract Calendar API functions |
| Audio services | 🚧 Pending | Extract STT/TTS functions |
| Gemini services | 🚧 Pending | Extract Gemini client |
| Routes & controllers | 🚧 Pending | Split HTTP endpoints |
| WebSocket refactor | 🚧 Pending | Organize handlers |
| Firestore integration | 🚧 Pending | Migrate conversation storage |
| Next.js scaffold | 🚧 Pending | Create Next.js app |
| New audio flow | 🚧 Pending | Full upload + streaming |
| Tests | 🚧 Pending | Integration & unit tests |
| Deployment | 🚧 Pending | Vercel + backend host |

---

## Guidelines

### Naming Conventions

- **Files:** kebab-case (e.g., `calendar.operations.js`)
- **Classes:** PascalCase (e.g., `CalendarService`)
- **Functions:** camelCase (e.g., `getCachedTimezone`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_HISTORY_MESSAGES`)

### Module Exports

Prefer named exports for services:
```javascript
// services/calendar/operations.js
export async function listEvents(userEmail, args) { ... }
export async function createEvent(userEmail, args) { ... }
```

Use default exports for classes and main modules:
```javascript
// services/gemini/client.js
export default class GeminiClient { ... }
```

### Import Paths

Use relative imports within same module:
```javascript
import { getCachedTimezone } from './timezone.js';
```

Use absolute imports from root:
```javascript
import { verifyFirebaseToken } from '@/backend/server/middleware/auth.js';
```

---

## Security Notes

- **Never commit** files in `backend/credentials/`
- Use `.env` for secrets (see `.env.example`)
- OAuth tokens stored in `tokens/` directory (in `.gitignore`)
- Firebase service account JSON must be kept secure

---

## Next Steps

See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for detailed migration steps.

---

## References

- [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) — Phased migration plan
- [PLAN_REVIEW.md](./PLAN_REVIEW.md) — Codebase analysis
- [ADR 0001](./adr/0001-nextjs-firebase-streaming.md) — Architecture decisions
