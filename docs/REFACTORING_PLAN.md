# 🔧 Clixen Refactoring Plan - Microservices Architecture

## 📋 Current Issues

1. **`web-server.js` is 667 lines** - Too monolithic, mixing concerns
2. **`public/app.js` is 1800+ lines** - Massive frontend class, hard to maintain
3. **Tight coupling** - Components depend directly on each other
4. **No clear boundaries** - Business logic mixed with infrastructure
5. **Hard to test** - Monolithic structure makes unit testing difficult
6. **No service layer** - Direct database/API calls throughout

---

## 🎯 Refactoring Goals

### **Backend Goals:**
- ✅ Extract configuration to dedicated config manager
- ✅ Create service layer abstraction
- ✅ Implement dependency injection pattern
- ✅ Separate concerns: routing, business logic, data access
- ✅ Make services independently testable
- ✅ Add health check endpoints for each service

### **Frontend Goals:**
- ✅ Split monolithic `VoiceAssistant` class into modules
- ✅ Extract UI components (recording, waveform, voice selector)
- ✅ Create state management layer
- ✅ Implement event bus for component communication
- ✅ Extract audio processing into separate module

---

## 📂 Proposed New Structure

```
clixen/
├── backend/
│   ├── config/                          # NEW - Centralized configuration
│   │   ├── index.js                     # Main config loader
│   │   ├── server.js                    # Server config (PORT, timeouts)
│   │   ├── firebase.js                  # Firebase config
│   │   ├── gemini.js                    # Gemini AI config
│   │   ├── google-cloud.js              # Google Cloud TTS config
│   │   └── calendar.js                  # Calendar API config
│   │
│   ├── core/                            # NEW - Core business logic
│   │   ├── services/                    # Service layer
│   │   │   ├── audio/
│   │   │   │   ├── AudioService.js      # REFACTORED from audio/index.js
│   │   │   │   ├── TranscriptionService.js
│   │   │   │   ├── TTSService.js
│   │   │   │   └── AudioStorageService.js
│   │   │   ├── calendar/
│   │   │   │   ├── CalendarService.js   # REFACTORED - main calendar logic
│   │   │   │   ├── EventService.js      # Event CRUD operations
│   │   │   │   ├── ConflictService.js   # Conflict detection
│   │   │   │   └── AuthService.js       # OAuth handling
│   │   │   ├── ai/
│   │   │   │   ├── GeminiService.js     # REFACTORED from gemini/
│   │   │   │   ├── ChatService.js
│   │   │   │   └── FunctionCallService.js
│   │   │   └── firestore/
│   │   │       ├── FirestoreService.js  # Base Firestore operations
│   │   │       ├── ConversationService.js
│   │   │       └── UserSettingsService.js
│   │   │
│   │   └── repositories/                # NEW - Data access layer
│   │       ├── BaseRepository.js        # Common CRUD methods
│   │       ├── ConversationRepository.js
│   │       ├── UserRepository.js
│   │       └── CalendarRepository.js
│   │
│   ├── api/                             # EXISTING - Keep as is
│   │   ├── controllers/                 # Thin controllers
│   │   ├── routes/                      # Route definitions
│   │   └── middleware/                  # Auth, validation, etc.
│   │
│   ├── server/                          # REFACTORED
│   │   ├── app.js                       # NEW - Express app setup only
│   │   ├── server.js                    # NEW - HTTP server creation
│   │   ├── websocket/
│   │   │   ├── WebSocketServer.js       # NEW - WS server class
│   │   │   ├── ConnectionManager.js     # NEW - Connection lifecycle
│   │   │   ├── handlers/                # Existing handlers
│   │   │   └── events/                  # NEW - Event definitions
│   │   └── utils/                       # Existing utils
│   │
│   └── infrastructure/                  # NEW - External integrations
│       ├── firebase/
│       │   └── FirebaseClient.js        # Firebase Admin SDK wrapper
│       ├── google-cloud/
│       │   ├── TTSClient.js             # TTS API wrapper
│       │   └── STTClient.js             # STT API wrapper
│       └── gemini/
│           └── GeminiClient.js          # Gemini API wrapper
│
├── frontend/                            # NEW - Modern frontend structure
│   ├── src/
│   │   ├── components/                  # UI Components
│   │   │   ├── AudioRecorder/
│   │   │   │   ├── AudioRecorder.js     # EXTRACTED from app.js
│   │   │   │   ├── VADDetector.js       # Voice activity detection
│   │   │   │   └── MicrophoneButton.js
│   │   │   ├── Waveform/
│   │   │   │   ├── WaveformVisualizer.js # EXTRACTED from app.js
│   │   │   │   └── CircularWaveform.js
│   │   │   ├── VoiceSelector/
│   │   │   │   └── VoiceSelector.js     # EXTRACTED from app.js
│   │   │   ├── Calendar/
│   │   │   │   ├── CalendarView.js
│   │   │   │   └── EventCard.js
│   │   │   └── StatusIndicator/
│   │   │       └── StatusIndicator.js
│   │   │
│   │   ├── services/                    # Frontend services
│   │   │   ├── WebSocketService.js      # REFACTORED from websocket-client.js
│   │   │   ├── AudioService.js          # Audio processing
│   │   │   ├── FirebaseAuthService.js   # REFACTORED from firebase-auth.js
│   │   │   └── CalendarService.js       # Calendar API client
│   │   │
│   │   ├── store/                       # NEW - State management
│   │   │   ├── AppState.js              # Global app state
│   │   │   ├── AudioState.js            # Recording state
│   │   │   ├── ConversationState.js     # Chat history
│   │   │   └── CalendarState.js         # Calendar data
│   │   │
│   │   ├── utils/                       # Utilities
│   │   │   ├── audioWorker.js           # EXISTING - Keep as is
│   │   │   ├── eventBus.js              # NEW - Event communication
│   │   │   └── logger.js                # NEW - Structured logging
│   │   │
│   │   └── app.js                       # REFACTORED - Main orchestrator only
│   │
│   └── index.html                       # EXISTING - Update script imports
│
├── shared/                              # NEW - Shared types/constants
│   ├── constants/
│   │   ├── events.js                    # WebSocket event types
│   │   ├── errors.js                    # Error codes
│   │   └── audio.js                     # Audio configuration
│   └── types/
│       ├── calendar.js                  # Calendar types
│       └── message.js                   # Message types
│
├── web-server.js                        # REFACTORED - Slim entry point
└── package.json
```

---

## 🔄 Phase 1: Backend Refactoring (Week 1-2)

### **Priority 1: Configuration Management**
**Files to create:**
- `backend/config/index.js` - Main config loader
- `backend/config/server.js`
- `backend/config/firebase.js`
- `backend/config/gemini.js`

**Action:**
```javascript
// backend/config/index.js
module.exports = {
  server: require('./server'),
  firebase: require('./firebase'),
  gemini: require('./gemini'),
  googleCloud: require('./google-cloud'),
  calendar: require('./calendar')
};
```

**Goal:** Extract all env vars and configs from `web-server.js`

---

### **Priority 2: Service Layer**
**Files to refactor:**
- Extract `backend/core/services/audio/AudioService.js`
- Extract `backend/core/services/calendar/CalendarService.js`
- Extract `backend/core/services/ai/GeminiService.js`

**Pattern:**
```javascript
// backend/core/services/audio/AudioService.js
class AudioService {
  constructor(dependencies) {
    this.ttsService = dependencies.ttsService;
    this.sttService = dependencies.sttService;
    this.storageService = dependencies.storageService;
  }

  async transcribe(audioBuffer, userEmail, mimeType) {
    // Isolated, testable business logic
  }
}
```

---

### **Priority 3: Web Server Simplification**
**Refactor `web-server.js` to:**
```javascript
// web-server.js - NEW SLIM VERSION (< 100 lines)
require('dotenv').config();
const { createServer } = require('./backend/server/server');
const config = require('./backend/config');

async function start() {
  try {
    const server = await createServer(config);
    
    // Graceful shutdown
    process.on('SIGTERM', () => server.close());
    process.on('SIGINT', () => server.close());
    
    console.log(`✅ Server running at http://localhost:${config.server.PORT}`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
```

---

## 🎨 Phase 2: Frontend Refactoring (Week 3-4)

### **Priority 1: Extract Components**
**Break down `app.js` (1800 lines) into:**
- `components/AudioRecorder/AudioRecorder.js` (~300 lines)
- `components/Waveform/WaveformVisualizer.js` (~200 lines)
- `components/VoiceSelector/VoiceSelector.js` (~150 lines)
- `components/StatusIndicator/StatusIndicator.js` (~100 lines)

**Pattern:**
```javascript
// frontend/src/components/AudioRecorder/AudioRecorder.js
export class AudioRecorder extends EventTarget {
  constructor() {
    super();
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  async startRecording() {
    // Focused, single-responsibility
    this.dispatchEvent(new CustomEvent('recording-started'));
  }
}
```

---

### **Priority 2: State Management**
**Create centralized state:**
```javascript
// frontend/src/store/AppState.js
class AppState {
  constructor() {
    this.state = {
      user: null,
      isRecording: false,
      isProcessing: false,
      conversation: [],
      calendar: []
    };
    this.listeners = [];
  }

  setState(updates) {
    Object.assign(this.state, updates);
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }
}

export const appState = new AppState();
```

---

### **Priority 3: Service Extraction**
**Refactor services:**
```javascript
// frontend/src/services/WebSocketService.js
export class WebSocketService extends EventTarget {
  constructor(config) {
    super();
    this.ws = null;
    this.config = config;
  }

  connect() {
    this.ws = new WebSocket(this.config.url);
    this.setupEventHandlers();
  }

  send(type, data) {
    this.ws.send(JSON.stringify({ type, ...data }));
  }
}
```

---

## 🧪 Phase 3: Testing Infrastructure (Week 5)

### **Add Test Structure:**
```
tests/
├── unit/
│   ├── services/
│   │   ├── AudioService.test.js
│   │   ├── CalendarService.test.js
│   │   └── GeminiService.test.js
│   └── repositories/
│       └── ConversationRepository.test.js
├── integration/
│   ├── api/
│   │   └── audio-endpoints.test.js
│   └── websocket/
│       └── connection.test.js
└── e2e/
    └── voice-assistant-flow.test.js
```

---

## 📊 Phase 4: Monitoring & Observability (Week 6)

### **Add Health Checks:**
```javascript
// backend/api/routes/health.js
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    services: {
      firebase: await checkFirebase(),
      gemini: await checkGemini(),
      calendar: await checkCalendar()
    }
  };
  res.json(health);
});
```

### **Add Metrics:**
- Request latency tracking
- Function call success rates
- WebSocket connection stats
- Audio processing metrics

---

## 🚀 Migration Strategy

### **Step-by-Step Approach:**
1. ✅ **No breaking changes** - Keep old code working
2. ✅ **Create new alongside old** - Gradual migration
3. ✅ **Add adapters** - Bridge old and new code
4. ✅ **Test thoroughly** - Each refactored component
5. ✅ **Deprecate gradually** - Remove old code last

### **Example Adapter Pattern:**
```javascript
// backend/adapters/legacyCalendarAdapter.js
const { CalendarService } = require('../core/services/calendar/CalendarService');

// Old function signature
function getCalendarClient(userEmail) {
  // Delegate to new service
  return CalendarService.getClient(userEmail);
}

module.exports = { getCalendarClient };
```

---

## ✅ Success Metrics

**Code Quality:**
- `web-server.js`: 667 lines → < 100 lines
- `app.js`: 1800 lines → < 300 lines
- Test coverage: 0% → 70%+

**Performance:**
- Startup time: Measure and improve
- Memory usage: Track and optimize
- Response times: Monitor and reduce

**Developer Experience:**
- Time to add feature: < 30 min
- Time to fix bug: < 15 min
- Time to onboard new dev: < 1 day

---

## 🎯 Quick Wins (Do These First!)

1. **Extract config** (2 hours) - Immediate clarity
2. **Create AudioService** (4 hours) - Most isolated
3. **Extract WaveformVisualizer** (3 hours) - Self-contained
4. **Add health checks** (2 hours) - Operational insight
5. **Create AppState** (3 hours) - Foundation for frontend

**Total: ~2 days for massive improvements!**

---

## 📝 Notes

- Keep backward compatibility during migration
- Use feature flags for gradual rollout
- Document each service's API
- Add JSDoc comments for better IDE support
- Consider TypeScript migration in Phase 5
