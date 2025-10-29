# ADR 0001: Next.js + Firebase + Streaming Architecture

**Date:** October 28, 2025  
**Status:** Accepted  
**Context:** Refactoring monolithic voice assistant to modular architecture

---

## Context

The current Clixen voice assistant is implemented as a monolithic Express server (`web-server.js`, 3,284 lines) with:
- In-memory conversation storage (lost on restart)
- Chunked audio streaming from client to server
- Real-time TTS audio streaming back to client
- Tightly coupled business logic and routing

We need to:
1. Scale the application with persistent conversation storage
2. Improve code maintainability by breaking monolith into modules
3. Modernize the frontend with a better developer experience
4. Support full audio uploads to Gemini (instead of chunked streaming)
5. Maintain real-time streaming capabilities for responses

---

## Decision

### 1. Frontend: Next.js (App Router) + TypeScript

**Decision:** Adopt Next.js 14+ with App Router, TypeScript, Tailwind CSS, and shadcn/ui.

**Rationale:**
- **Next.js App Router:** Server Components reduce client-side JavaScript, improve SEO, and simplify data fetching
- **TypeScript:** Type safety reduces bugs and improves IDE support
- **Tailwind CSS:** Utility-first CSS for rapid UI development with minimal bundle size
- **shadcn/ui:** Accessible, customizable component library with Vercel-style minimalism
- **Vercel Deployment:** Seamless integration with Next.js, automatic previews, edge functions

**Alternatives Considered:**
- **React SPA (Vite):** Rejected — lacks SSR/SSG capabilities, worse SEO
- **SvelteKit:** Rejected — smaller ecosystem, team unfamiliar with Svelte
- **Remix:** Rejected — less mature, smaller community than Next.js

**Trade-offs:**
- ✅ Better DX, faster builds, built-in optimizations
- ✅ Server Components reduce client bundle size
- ❌ Learning curve for App Router (different from Pages Router)
- ❌ Some libraries not yet compatible with React Server Components

---

### 2. Backend: Modular Node.js + Express

**Decision:** Refactor monolithic server into modular architecture with clear separation of concerns.

**Structure:**
```
backend/
├── api/                    # HTTP layer (routes + controllers)
├── server/
│   ├── services/           # Business logic (calendar, gemini, audio, firestore)
│   ├── middleware/         # Auth, rate limiting, error handling
│   ├── websocket/          # WebSocket server + handlers
│   └── utils/              # Shared utilities
└── config/                 # Configuration files
```

**Rationale:**
- **Testability:** Services can be unit tested in isolation
- **Maintainability:** Each module has a single responsibility (~200-400 LOC)
- **Scalability:** Services can be extracted to microservices later if needed
- **Onboarding:** New developers can understand one module at a time

**Alternatives Considered:**
- **Microservices (separate repos):** Rejected — premature optimization, adds deployment complexity
- **Serverless Functions (Vercel, AWS Lambda):** Rejected — WebSocket support limited, cold starts impact latency
- **NestJS (TypeScript framework):** Rejected — heavy framework, not worth migration cost

**Trade-offs:**
- ✅ Cleaner codebase, easier to maintain
- ✅ Better test coverage possible
- ❌ Initial refactoring effort (1-2 weeks)
- ❌ More files to navigate (managed with clear structure)

---

### 3. Conversation Persistence: Firestore

**Decision:** Migrate from in-memory conversation storage to Firebase Firestore.

**Schema:**
```
conversations/{conversationId}
  - userId, userEmail, createdAt, updatedAt, status, lastMessage

conversations/{conversationId}/messages/{messageId}
  - speaker, text, partial, seq, createdAt, tokens, audioRef
```

**Rationale:**
- **Persistence:** Conversations survive server restarts
- **Real-time:** Firestore supports real-time listeners (future feature: multi-device sync)
- **Scalability:** Automatic scaling, no database management
- **Firebase Integration:** Already using Firebase Auth, minimal setup

**Alternatives Considered:**
- **PostgreSQL (Supabase):** Rejected — requires more ops, relational model overkill for this use case
- **MongoDB Atlas:** Rejected — similar to Firestore but less integrated with Firebase ecosystem
- **Redis (in-memory cache):** Rejected — not durable, requires separate backup strategy

**Trade-offs:**
- ✅ Persistent storage, real-time listeners, zero ops
- ✅ Integrated with existing Firebase Auth
- ❌ Query limitations (no complex joins)
- ❌ Cost scales with reads/writes (acceptable for this use case)

---

### 4. Audio Storage: Google Cloud Storage

**Decision:** Store audio files in Google Cloud Storage (GCS), reference in Firestore.

**Rationale:**
- **Scalability:** GCS handles large binary files efficiently
- **Cost:** Cheaper than storing audio in Firestore (which has size limits)
- **Integration:** Already using Google Cloud for TTS/STT
- **CDN:** GCS provides automatic CDN for fast downloads

**Alternatives Considered:**
- **Firestore (base64):** Rejected — 1MB document size limit, expensive for large files
- **Local filesystem:** Rejected — not scalable, server restart loses files
- **AWS S3:** Rejected — adds another cloud provider, GCS simpler with existing Google Cloud setup

**Trade-offs:**
- ✅ Scalable, cost-effective, fast
- ❌ Adds complexity (upload flow, signed URLs)
- ❌ Requires GCS bucket setup and IAM configuration

---

### 5. Audio Flow: Full Upload + Streaming Response

**Decision:** Client uploads complete audio file (single HTTP POST), server sends full audio to Gemini, server streams text response back via WebSocket.

**Flow:**
1. Client records full audio → `POST /api/v2/audio/upload`
2. Server validates audio (type, size), returns `sessionId`
3. Server transcribes audio (Google STT), sends full audio to Gemini
4. Server receives streaming text chunks from Gemini
5. Server forwards chunks to client via WebSocket
6. Server saves partial chunks to Firestore as they arrive
7. Server optionally generates TTS audio and streams back to client

**Rationale:**
- **Simplicity:** Single upload request simpler than managing chunked streaming
- **Gemini Compatibility:** Gemini API prefers complete audio for better transcription
- **Reliability:** Easier to retry failed uploads (idempotent)
- **Security:** Server validates full audio before processing

**Alternatives Considered:**
- **Keep Chunked Audio Upload:** Rejected — complex state management, harder to retry, worse for Gemini quality
- **Client-side Transcription (Web Speech API):** Rejected — limited browser support, quality inconsistent
- **SSE (Server-Sent Events) instead of WebSocket:** Accepted as fallback — simpler but uni-directional only

**Trade-offs:**
- ✅ Simpler client code, better reliability
- ✅ Better transcription quality (Gemini sees full context)
- ❌ Larger network payload (single request with full audio)
- ❌ Requires client buffering (wait until recording complete)

---

### 6. Streaming Transport: WebSocket (primary), SSE (fallback)

**Decision:** Use WebSocket for bi-directional streaming, SSE as fallback for uni-directional use cases.

**WebSocket Message Format:**
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

**Rationale:**
- **Low Latency:** WebSocket has lower overhead than HTTP polling
- **Bi-directional:** Supports client interruptions, status updates
- **Real-time:** Essential for streaming TTS audio
- **Resilience:** Heartbeat mechanism detects dead connections

**Alternatives Considered:**
- **HTTP Polling:** Rejected — high latency, server load
- **SSE Only:** Rejected — uni-directional only, can't interrupt
- **gRPC Streaming:** Rejected — overkill, browser support limited

**Trade-offs:**
- ✅ Low latency, bi-directional, real-time
- ❌ WebSocket hosting requires persistent connections (not pure serverless)
- ❌ More complex than SSE (reconnection logic, heartbeat)

---

### 7. Deployment: Vercel (Frontend) + Dedicated Node Server (Backend)

**Decision:** Deploy Next.js frontend to Vercel, backend to dedicated Node.js host (Fly.io, Render, or VPS).

**Rationale:**
- **Vercel:** Optimized for Next.js, automatic preview deployments, edge functions, CDN
- **Dedicated Backend:** WebSocket requires persistent connections (not suitable for serverless functions)
- **Cost:** Vercel free tier sufficient for frontend, backend requires ~$5-10/mo VM

**Alternatives Considered:**
- **Vercel Serverless for Backend:** Rejected — WebSocket connections not supported in serverless functions
- **All-in-One (Next.js + Express):** Rejected — Vercel optimized for Next.js, Express backend doesn't leverage Vercel optimizations
- **AWS (Fargate/ECS):** Rejected — overkill for this scale, more expensive, complex setup

**Trade-offs:**
- ✅ Best platform for each component (Vercel for Next.js, Node server for WebSocket)
- ✅ Vercel handles frontend optimizations (CDN, edge, caching)
- ❌ Two deployment targets (more complex than monolith)
- ❌ Backend requires separate monitoring and logging

---

## Implementation Plan

See [MIGRATION_PLAN.md](../MIGRATION_PLAN.md) for detailed phased rollout.

---

## Consequences

### Positive

1. **Scalability:** Firestore and GCS handle growth automatically
2. **Maintainability:** Modular codebase easier to understand and modify
3. **Developer Experience:** TypeScript, Next.js, and hot reloading improve productivity
4. **User Experience:** Persistent conversations, faster page loads (Next.js), real-time streaming
5. **Reliability:** Full audio upload simpler to retry, streaming provides incremental feedback

### Negative

1. **Migration Effort:** 4-6 weeks of refactoring (acceptable for long-term benefits)
2. **Deployment Complexity:** Two separate deployments (frontend + backend)
3. **Firestore Costs:** Scales with usage (monitor and optimize queries)
4. **WebSocket Hosting:** Requires dedicated server (can't use pure serverless)

### Neutral

1. **Learning Curve:** Team needs to learn App Router, Firestore queries, WebSocket patterns
2. **Testing Strategy:** More surfaces to test (frontend, backend, WebSocket, Firestore)

---

## Status

**Accepted** — Migration in progress as of October 28, 2025.

---

## References

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [shadcn/ui](https://ui.shadcn.com/)
- [Google Cloud Storage](https://cloud.google.com/storage/docs)
- [MIGRATION_PLAN.md](../MIGRATION_PLAN.md)
- [PLAN_REVIEW.md](../PLAN_REVIEW.md)
