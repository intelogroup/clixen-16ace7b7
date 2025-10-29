# Migration Plan: Next.js + Modular Backend Refactor

**Status:** 🚧 In Progress  
**Start Date:** October 28, 2025  
**Target Completion:** December 2025

---

## Overview

This document outlines the step-by-step migration from the monolithic `web-server.js` (3,284 lines) to a modular architecture with Next.js frontend and organized backend services.

### Goals

1. **Break monolithic server** into clean, testable modules (routes, controllers, services, middleware)
2. **Migrate to Next.js** (latest, app router) with TypeScript, Tailwind CSS, and shadcn/ui
3. **Persist conversations to Firestore** (migrate from in-memory storage)
4. **Redesign audio flow**: client uploads full audio → server sends to Gemini → stream text response back
5. **Maintain backward compatibility** during migration (no downtime)

---

## Current State Analysis

### web-server.js Breakdown (3,284 lines)

| Component | Lines | Description |
|-----------|-------|-------------|
| Dependencies & setup | 1-320 | Imports, Express app, Firebase init, caches |
| Cache layer | 24-120 | Timezone & calendar query caches |
| Conversation history | 123-150 | In-memory Map (userEmail → messages) |
| Audio transcription | 154-185 | Google Speech-to-Text integration |
| Firebase & auth | 314-320, 1568-1600 | Firebase Admin SDK, token verification |
| Calendar integration | 324-1560 | OAuth, Calendar API, function calling |
| Gemini AI model | 515-748 | Model config, system instructions |
| HTTP endpoints | 1602-2438 | Express routes (8 endpoints) |
| Text-to-Speech | 1716-1850 | Google Cloud TTS, streaming |
| WebSocket server | 2467-3284 | Real-time audio streaming, message handlers |

### Key Dependencies

- Express.js + WebSocket (ws)
- Firebase Admin SDK + Firestore
- Google APIs: Calendar, Speech-to-Text, Text-to-Speech, Gemini AI
- Multer (file uploads)
- OAuth 2.0 (Google Calendar access)

---

## New Architecture

### Folder Structure

```
clixen/
├── backend/
│   ├── api/
│   │   ├── routes/              # Express route definitions
│   │   │   ├── auth.routes.js
│   │   │   ├── calendar.routes.js
│   │   │   ├── conversation.routes.js
│   │   │   ├── audio.routes.js
│   │   │   ├── chat.routes.js
│   │   │   ├── health.routes.js
│   │   │   └── index.js
│   │   └── controllers/         # Request handlers
│   │       ├── auth.controller.js
│   │       ├── audio.controller.js
│   │       ├── chat.controller.js
│   │       ├── calendar.controller.js
│   │       └── conversation.controller.js
│   ├── server/
│   │   ├── services/            # Business logic
│   │   │   ├── audio/
│   │   │   │   ├── transcription.js
│   │   │   │   ├── tts.js
│   │   │   │   └── storage.js
│   │   │   ├── calendar/
│   │   │   │   ├── client.js
│   │   │   │   ├── operations.js
│   │   │   │   ├── conflicts.js
│   │   │   │   ├── timezone.js
│   │   │   │   └── parallel.js
│   │   │   ├── gemini/
│   │   │   │   ├── client.js
│   │   │   │   ├── config.js
│   │   │   │   └── functions.js
│   │   │   ├── firestore/
│   │   │   │   ├── conversations.js
│   │   │   │   ├── messages.js
│   │   │   │   └── index.js
│   │   │   └── cache/
│   │   │       ├── timezone.js
│   │   │       ├── calendar.js
│   │   │       └── conversation.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── rateLimit.js
│   │   │   ├── errorHandler.js
│   │   │   └── validation.js
│   │   ├── websocket/
│   │   │   ├── server.js
│   │   │   ├── handlers/
│   │   │   │   ├── audio.handler.js
│   │   │   │   ├── text.handler.js
│   │   │   │   └── index.js
│   │   │   └── connectionManager.js
│   │   └── utils/
│   │       ├── logger.js
│   │       ├── errors.js
│   │       ├── validation.js
│   │       └── config.js
│   ├── config/
│   │   ├── firebase.js
│   │   ├── google.js
│   │   └── constants.js
│   ├── credentials/             # (existing, keep secure)
│   └── index.js                 # Main server entry
├── frontend/
│   ├── next-app/                # NEW: Next.js app
│   │   ├── app/                 # App router
│   │   ├── components/          # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── lib/                 # Utilities
│   │   ├── public/              # Static assets
│   │   └── styles/              # Tailwind CSS
│   └── legacy/                  # OLD: public/ (for reference)
├── lib/                         # Shared utilities
├── scripts/                     # Migration & seed scripts
├── tests/                       # (existing)
├── docs/                        # (existing + new)
│   ├── adr/                     # Architecture Decision Records
│   ├── MIGRATION_PLAN.md        # This file
│   └── PLAN_REVIEW.md
└── .env.example                 # Environment template

```

---

## Migration Steps

### Phase 0: Setup & Planning ✅

**Status:** Complete  
**Duration:** 2-3 days

- [x] Analyze `web-server.js` and map to new structure
- [x] Create folder skeleton
- [x] Write migration plan and ADR
- [x] Create `.env.example` with all required variables
- [x] Update todos with sequenced tasks

**Deliverables:**
- Folder structure created
- Documentation: `MIGRATION_PLAN.md`, `PLAN_REVIEW.md`, ADR
- `.env.example` with comprehensive variable list

---

### Phase 1: Backend Modularization

**Duration:** 1 week  
**Goal:** Split `web-server.js` into modules while preserving behavior

#### Step 1.1: Extract Cache Services (Day 1)

**Files to create:**
- `backend/server/services/cache/timezone.js`
- `backend/server/services/cache/calendar.js`
- `backend/server/services/cache/conversation.js`

**Actions:**
1. Copy cache functions from `web-server.js` (lines 24-120)
2. Add unit tests for cache operations
3. Update `web-server.js` to import from new modules
4. Run tests to verify no breakage

**Acceptance:**
- All cache tests pass
- Server runs without errors
- Existing endpoints work identically

#### Step 1.2: Extract Calendar Services (Day 2-3)

**Files to create:**
- `backend/server/services/calendar/client.js` (OAuth, getCalendarClient)
- `backend/server/services/calendar/operations.js` (listEvents, createEvent, etc.)
- `backend/server/services/calendar/conflicts.js` (checkConflicts)
- `backend/server/services/calendar/timezone.js` (getCachedTimezone)
- `backend/server/services/calendar/parallel.js` (parallel execution)

**Actions:**
1. Extract Calendar API functions (lines 749-1560)
2. Preserve OAuth token flow (filesystem-based initially)
3. Add unit tests with mocked Calendar API
4. Update imports in `web-server.js`

**Acceptance:**
- Calendar operations work identically
- OAuth flow unchanged
- Unit tests for all calendar functions

#### Step 1.3: Extract Audio Services (Day 3-4)

**Files to create:**
- `backend/server/services/audio/transcription.js` (Google STT)
- `backend/server/services/audio/tts.js` (Google TTS, streaming)
- `backend/server/services/audio/storage.js` (file storage)

**Actions:**
1. Extract transcription (lines 154-185) and TTS (lines 1716-1850)
2. Add configuration for audio storage path
3. Add unit tests with mocked Google APIs
4. Update imports in `web-server.js`

**Acceptance:**
- Audio transcription and TTS work identically
- Tests pass with mocked APIs

#### Step 1.4: Extract Gemini Services (Day 4-5)

**Files to create:**
- `backend/server/services/gemini/client.js` (Gemini AI client)
- `backend/server/services/gemini/config.js` (model config, system instructions)
- `backend/server/services/gemini/functions.js` (calendarFunctions array)

**Actions:**
1. Extract Gemini model setup (lines 263-748)
2. Separate function declarations from client code
3. Add unit tests with mocked Gemini API
4. Update imports in `web-server.js`

**Acceptance:**
- Gemini chat and function calling work identically
- Tests pass with mocked Gemini API

#### Step 1.5: Extract Routes & Controllers (Day 5-7)

**Files to create:**
- All route files in `backend/api/routes/`
- All controller files in `backend/api/controllers/`
- `backend/server/middleware/auth.js` (verifyFirebaseToken)

**Actions:**
1. Create route definitions (thin wrappers)
2. Move request handling logic to controllers
3. Extract `verifyFirebaseToken` to middleware
4. Wire routes in `backend/api/routes/index.js`
5. Update `web-server.js` to use new routes

**Acceptance:**
- All HTTP endpoints work identically
- Postman/test requests return same responses
- Middleware applies correctly

#### Step 1.6: Refactor WebSocket Server (Day 7)

**Files to create:**
- `backend/server/websocket/server.js`
- `backend/server/websocket/handlers/audio.handler.js`
- `backend/server/websocket/handlers/text.handler.js`
- `backend/server/websocket/connectionManager.js`

**Actions:**
1. Extract WebSocket setup (lines 2467-3284)
2. Organize message handlers
3. Preserve existing chunked audio flow
4. Add heartbeat and connection management
5. Update `web-server.js` to use new WebSocket module

**Acceptance:**
- WebSocket connections work identically
- Audio streaming unchanged
- Heartbeat mechanism working

---

### Phase 2: Firestore Integration

**Duration:** 3-5 days  
**Goal:** Migrate conversation history from in-memory to Firestore

#### Step 2.1: Design Firestore Schema (Day 1)

**Schema:**

```typescript
// conversations/{conversationId}
{
  userId: string;
  userEmail: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'active' | 'archived';
  lastMessage: string;
  metadata: {
    platform: string;
    version: string;
  };
}

// conversations/{conversationId}/messages/{messageId}
{
  speaker: 'user' | 'assistant';
  text: string;
  partial: boolean;
  seq: number;
  createdAt: Timestamp;
  tokens: number;
  audioRef?: string; // Reference to Cloud Storage
}

// audio/{audioId}
{
  storageRef: string;
  duration: number;
  size: number;
  format: string;
  createdAt: Timestamp;
}
```

**Actions:**
1. Document schema in `docs/FIRESTORE_SCHEMA.md`
2. Create indexes for queries (userId + updatedAt)
3. Add Firestore security rules

#### Step 2.2: Implement Firestore Services (Day 2-3)

**Files to create:**
- `backend/server/services/firestore/conversations.js`
- `backend/server/services/firestore/messages.js`
- `backend/server/services/firestore/index.js`

**Actions:**
1. Implement CRUD operations for conversations
2. Implement CRUD operations for messages
3. Add idempotent writes for streaming chunks
4. Add unit tests with mocked Firestore

**Acceptance:**
- All CRUD operations tested
- Idempotent writes prevent duplicates

#### Step 2.3: Dual-Write Migration (Day 4-5)

**Strategy:** Write to both in-memory and Firestore simultaneously

**Actions:**
1. Update conversation history functions to dual-write
2. Add feature flag `FEATURE_FIRESTORE_CONVERSATIONS`
3. Monitor logs for write errors
4. Test read consistency (in-memory vs Firestore)

**Acceptance:**
- Conversations written to both stores
- No data loss during migration
- Feature flag toggles behavior

#### Step 2.4: Cutover to Firestore (Day 5)

**Actions:**
1. Enable `FEATURE_FIRESTORE_CONVERSATIONS=true` in production
2. Monitor for errors and performance issues
3. Verify conversation history persists across restarts
4. Remove in-memory conversation history (keep as cache)

**Acceptance:**
- Conversations persist in Firestore
- Performance acceptable (<100ms reads)
- No data loss

---

### Phase 3: Next.js Frontend Scaffold

**Duration:** 3-5 days  
**Goal:** Set up Next.js app with basic UI and authentication

#### Step 3.1: Initialize Next.js App (Day 1)

**Actions:**
```bash
cd frontend/next-app
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
```

**Configuration:**
- TypeScript: Yes
- Tailwind CSS: Yes
- App Router: Yes
- Import alias: `@/*`

**Acceptance:**
- Next.js dev server runs
- Default homepage loads

#### Step 3.2: Install shadcn/ui (Day 1-2)

**Actions:**
```bash
npx shadcn@latest init
npx shadcn@latest add button card input textarea
```

**Configuration:**
- Style: New York (minimal)
- Base color: Slate
- CSS variables: Yes

**Acceptance:**
- shadcn/ui components available
- Button, Card, Input render correctly

#### Step 3.3: Implement Firebase Auth (Day 2-3)

**Files to create:**
- `frontend/next-app/lib/firebase.ts` (Firebase client config)
- `frontend/next-app/app/auth/login/page.tsx` (login page)
- `frontend/next-app/hooks/useAuth.ts` (auth hook)

**Actions:**
1. Set up Firebase client SDK
2. Implement Google sign-in
3. Store auth token in session/cookie
4. Create protected route wrapper

**Acceptance:**
- User can sign in with Google
- Auth token persists across page reloads
- Protected routes redirect to login

#### Step 3.4: Create Base Layout & Pages (Day 3-4)

**Pages to create:**
- `app/page.tsx` (home)
- `app/conversation/page.tsx` (main chat interface)
- `app/settings/page.tsx` (user settings)

**Components to create:**
- `components/Header.tsx` (navigation)
- `components/ConversationView.tsx` (message list)
- `components/AudioInput.tsx` (audio recording UI)
- `components/MessageBubble.tsx` (chat message)

**Acceptance:**
- All pages render
- Navigation works
- Responsive design (mobile + desktop)

#### Step 3.5: Connect to Backend API (Day 4-5)

**Files to create:**
- `frontend/next-app/lib/api.ts` (API client)
- `frontend/next-app/lib/websocket.ts` (WebSocket client)

**Actions:**
1. Create API client with auth header injection
2. Test API calls to backend
3. Set up WebSocket connection
4. Display conversation history from Firestore

**Acceptance:**
- API calls work with authentication
- WebSocket connects successfully
- Conversation history displays

---

### Phase 4: New Audio Flow & Streaming

**Duration:** 4-6 days  
**Goal:** Implement full audio upload + streaming text response

#### Step 4.1: Design New Audio Endpoint (Day 1)

**New endpoint:** `POST /api/v2/audio/upload`

**Request:**
- Multipart form-data with audio file
- Max size: 10MB
- Allowed types: webm, wav, mp3

**Response:**
```json
{
  "sessionId": "uuid",
  "status": "processing",
  "wsUrl": "ws://localhost:3001?sessionId=uuid"
}
```

**Actions:**
1. Add route and controller
2. Add file validation (size, type)
3. Add rate limiting (per user)
4. Return WebSocket URL for streaming

**Acceptance:**
- Endpoint accepts audio files
- Validation works (rejects invalid files)
- Rate limiting enforced

#### Step 4.2: Implement Gemini Full-Audio Client (Day 2-3)

**Files to create:**
- `backend/server/services/gemini/streaming.js`

**Actions:**
1. Create method to send full audio to Gemini
2. Expose streaming interface (AsyncIterator or EventEmitter)
3. Handle Gemini errors (retry, backoff)
4. Add unit tests with mocked Gemini streaming API

**Acceptance:**
- Full audio sent to Gemini successfully
- Streaming text chunks received
- Error handling works (retries on transient errors)

#### Step 4.3: Implement WebSocket Streaming Response (Day 3-4)

**Message format:**
```json
{
  "type": "chunk",
  "sessionId": "uuid",
  "seq": 1,
  "text": "partial text",
  "partial": true,
  "timestamp": 1234567890
}
```

**Actions:**
1. Update WebSocket handler to stream Gemini responses
2. Send chunks as they arrive from Gemini
3. Persist partial chunks to Firestore
4. Mark final chunk with `partial: false`

**Acceptance:**
- Text chunks stream to client in real-time
- Chunks saved to Firestore incrementally
- Final message marked complete

#### Step 4.4: Update Frontend Audio UI (Day 4-5)

**Actions:**
1. Update `AudioInput.tsx` to record complete audio
2. Upload full audio via `POST /api/v2/audio/upload`
3. Connect to WebSocket for streaming response
4. Display streaming text chunks in `ConversationView`

**Acceptance:**
- User can record and upload audio
- Streaming response displays in real-time
- UI handles reconnections gracefully

#### Step 4.5: Optional: Keep Streaming TTS (Day 5-6)

**Decision:** Stream audio chunks back to client (Option B from plan review)

**Actions:**
1. Generate TTS for each text chunk server-side
2. Stream audio chunks via WebSocket
3. Client plays audio chunks as received

**Acceptance:**
- Text chunks converted to audio
- Audio chunks stream to client
- Playback smooth (no gaps)

---

### Phase 5: Testing & Deployment

**Duration:** 2-4 days  
**Goal:** Comprehensive tests and deployment configuration

#### Step 5.1: Integration Tests (Day 1-2)

**Tests to add:**
- E2E test: Upload audio → receive streaming response → save to Firestore
- WebSocket reconnection test
- OAuth flow test
- Rate limiting test
- File size validation test

**Actions:**
1. Add integration tests in `tests/integration/`
2. Use vitest for testing
3. Mock Gemini API for consistent results

**Acceptance:**
- All integration tests pass
- Tests run in CI (GitHub Actions)

#### Step 5.2: Performance Benchmarks (Day 2)

**Metrics to measure:**
- Audio upload latency (p50, p95, p99)
- Streaming response latency (time to first chunk)
- WebSocket connection count (max concurrent)
- Firestore read/write latency

**Actions:**
1. Add performance tests
2. Benchmark before/after refactor
3. Document results in `docs/PERFORMANCE.md`

**Acceptance:**
- Latency within acceptable range (<2s for first chunk)
- No performance regression

#### Step 5.3: Deployment Configuration (Day 3-4)

**Vercel Configuration:**
- Frontend: Deploy Next.js app to Vercel
- Backend: Deploy to separate Node.js host (Fly.io, Render, or VPS) for WebSocket support

**Files to create:**
- `vercel.json` (Next.js config)
- `fly.toml` (backend config if using Fly.io)
- `docs/DEPLOYMENT.md` (deployment guide)

**Actions:**
1. Set up Vercel project for Next.js
2. Set up backend host with WebSocket support
3. Configure environment variables
4. Test deployment in staging

**Acceptance:**
- Frontend deploys successfully to Vercel
- Backend WebSocket server runs on dedicated host
- Environment variables configured correctly

---

## Rollback Plan

If issues arise during migration:

1. **Phase 1 (Backend Modularization):** Revert to monolithic `web-server.js` (keep as `web-server.backup.js`)
2. **Phase 2 (Firestore):** Disable `FEATURE_FIRESTORE_CONVERSATIONS` flag, fall back to in-memory
3. **Phase 3 (Next.js):** Keep existing `public/` frontend active during Next.js development
4. **Phase 4 (Audio Flow):** Keep old chunked audio endpoint (`/api/process-audio`) active alongside new endpoint (`/api/v2/audio/upload`)

---

## Success Criteria

- ✅ All existing features work identically
- ✅ Conversation history persists in Firestore
- ✅ New audio flow (full upload + streaming) works
- ✅ Next.js frontend deployed and functional
- ✅ All tests pass (unit + integration)
- ✅ Performance within acceptable range (no regression)
- ✅ Documentation complete (API, deployment, architecture)
- ✅ Zero downtime during migration

---

## Next Steps

1. ✅ Complete Phase 0 (Setup & Planning)
2. Start Phase 1 (Backend Modularization) — Extract cache services
3. Track progress in todo list
4. Update this document as phases complete

---

## References

- [PLAN_REVIEW.md](./PLAN_REVIEW.md) — Detailed codebase analysis
- [ADR 0001](./adr/0001-nextjs-firebase-streaming.md) — Architecture decisions
- [.env.example](../.env.example) — Environment variables
