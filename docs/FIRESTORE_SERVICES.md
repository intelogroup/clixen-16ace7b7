# Firestore Services Implementation

## Overview
Firestore services provide persistent storage for user settings and conversation history with intelligent caching layers to optimize performance and reduce Firestore reads/writes.

## Architecture

### User Settings Service (`userSettings.js`)
Manages user preferences and configuration with 5-minute cache TTL.

**Features:**
- Default settings creation for new users
- Deep merge for partial updates
- In-memory caching (5-minute TTL)
- Last active timestamp tracking

**Data Structure:**
```javascript
{
  voice: {
    name: 'en-US-Neural2-J',
    ssmlGender: 'MALE',
    speakingRate: 1.05,
    pitch: 0.0,
    volumeGainDb: 2.0
  },
  language: 'en-US',
  timezone: 'America/New_York',
  preferences: {
    conversationStyle: 'balanced',
    calendarView: 'week',
    notificationsEnabled: true,
    audioAutoPlay: true
  },
  metadata: {
    createdAt, updatedAt, lastActive
  }
}
```

**API:**
- `getUserSettings(userEmail)` - Get/create user settings
- `updateUserSettings(userEmail, updates)` - Update settings (deep merge)
- `updateLastActive(userEmail)` - Update activity timestamp
- `deleteUserSettings(userEmail)` - Delete user settings
- `clearSettingsCache([userEmail])` - Clear cache
- `getSettingsCacheStats()` - Get cache statistics

### Conversation History Service (`conversationHistory.js`)
Manages conversation persistence with batched writes and 10-minute cache TTL.

**Features:**
- Batched writes (every 5 messages or 30 seconds)
- Automatic trimming to 50 messages max
- Context optimization (sends only last 10 to Gemini)
- Background sync scheduling
- Optimistic cache updates

**Data Structure:**
```javascript
{
  id: 'firestore_doc_id',
  role: 'user' | 'assistant',
  content: 'message text',
  timestamp: '2025-10-29T10:00:00Z',
  // Optional metadata
  audioUrl: 'url',
  duration: 5.2
}
```

**API:**
- `getConversationHistory(userEmail)` - Get cached/stored messages
- `addMessage(userEmail, role, content, metadata)` - Add message (optimistic update)
- `syncToFirestore(userEmail)` - Force sync pending writes
- `formatHistoryForGemini(userEmail)` - Get formatted context for AI
- `clearHistory(userEmail)` - Delete all messages
- `getConversationStats(userEmail)` - Get conversation statistics
- `clearConversationCache([userEmail])` - Clear cache
- `getCacheStats()` - Get cache statistics
- `syncAllPending()` - Sync all pending writes across all users

## Firestore Collections

### `users/{userEmail}`
Stores user settings and preferences.

### `conversations/{userEmail}/messages/{messageId}`
Stores conversation history per user.

## Performance Optimizations

1. **Caching Strategy:**
   - Settings: 5-minute TTL (infrequent changes)
   - Conversations: 10-minute TTL (active usage)
   - Reduces Firestore reads by ~80-90%

2. **Batched Writes:**
   - Batch every 5 messages
   - Background sync every 30 seconds
   - Immediate sync for user messages (important)

3. **Context Optimization:**
   - Store 50 messages per user
   - Send only last 10 to Gemini
   - Reduces token usage and latency

4. **Automatic Cleanup:**
   - Old messages deleted asynchronously
   - No blocking operations

## Integration with Existing Code

### Replace Cache Service
```javascript
// OLD (in-memory only)
const conversationCache = require('./services/cache/conversation');

// NEW (persistent + cached)
const { conversationHistory } = require('./services/firestore');

// Usage remains similar
await conversationHistory.addMessage(userEmail, 'user', text);
const history = await conversationHistory.formatHistoryForGemini(userEmail);
```

### Add User Settings Support
```javascript
const { userSettings } = require('./services/firestore');

// Get user voice preferences
const settings = await userSettings.getUserSettings(userEmail);
const voiceConfig = settings.voice;

// Update preferences
await userSettings.updateUserSettings(userEmail, {
  preferences: { conversationStyle: 'detailed' }
});
```

## Testing

Comprehensive test suites cover:
- CRUD operations
- Cache behavior (hits/misses/TTL)
- Error handling
- Edge cases (empty data, missing params)
- Batch operations
- Statistics and monitoring

**Test Files:**
- `tests/unit/services/firestore/userSettings.test.js` (20 tests)
- `tests/unit/services/firestore/conversationHistory.test.js` (27 tests)

## Migration Path

### Phase 1: Parallel Running (Current)
- Keep existing in-memory cache
- Add Firestore services alongside
- Test in production with real users

### Phase 2: Gradual Migration
- Update WebSocket handlers to use Firestore
- Update chat endpoints to use Firestore
- Monitor performance and error rates

### Phase 3: Complete Migration
- Remove in-memory conversation cache
- Update all references
- Deprecate old cache service

## Future Enhancements

1. **Analytics:**
   - Track conversation length trends
   - Monitor cache hit rates
   - User engagement metrics

2. **Advanced Features:**
   - Conversation search
   - Export conversation history
   - Conversation branching/forking
   - Multi-device sync

3. **Optimization:**
   - Compression for long conversations
   - Tiered storage (hot/cold data)
   - Edge caching with CDN

## Dependencies

- `firebase-admin` - Firestore SDK
- Existing `firebase-config.js` - Firebase initialization

## Configuration

Set in Firestore service constants:
```javascript
// userSettings.js
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// conversationHistory.js
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_HISTORY_MESSAGES = 50;
const CONTEXT_MESSAGES = 10;
const BATCH_WRITE_THRESHOLD = 5;
```

## Monitoring

Use cache statistics for monitoring:
```javascript
// Check settings cache health
const settingsStats = userSettings.getSettingsCacheStats();
console.log(`Cache size: ${settingsStats.size}, TTL: ${settingsStats.ttl}ms`);

// Check conversation cache health
const convStats = conversationHistory.getCacheStats();
console.log(`Pending writes: ${convStats.users.map(u => u.pendingWrites).reduce((a,b) => a+b, 0)}`);

// Force sync if needed
if (needsSync) {
  await conversationHistory.syncAllPending();
}
```

## Error Handling

Both services implement graceful degradation:
- Firestore errors return default/empty data
- Cache failures fall back to database reads
- Write failures are logged but don't crash server
- Retry logic for transient failures

## Security

Firestore rules should restrict access:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own settings
    match /users/{userEmail} {
      allow read, write: if request.auth.token.email == userEmail;
    }
    
    // Users can only read/write their own conversations
    match /conversations/{userEmail}/messages/{messageId} {
      allow read, write: if request.auth.token.email == userEmail;
    }
  }
}
```

## Status

✅ **COMPLETE**
- User settings service implemented
- Conversation history service implemented
- Comprehensive test suites created
- Documentation complete
- Ready for integration and migration
