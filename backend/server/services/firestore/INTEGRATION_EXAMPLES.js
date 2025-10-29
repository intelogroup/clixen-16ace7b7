/**
 * Firestore Services Integration Example
 * 
 * This file demonstrates how to integrate the new Firestore services
 * into the existing web-server.js and WebSocket handlers.
 */

// ============================================================================
// STEP 1: Import Firestore Services
// ============================================================================

const { userSettings, conversationHistory } = require('./backend/server/services/firestore');

// ============================================================================
// STEP 2: WebSocket Chat Handler Integration
// ============================================================================

// BEFORE (using in-memory cache)
/*
const conversationCache = require('./backend/server/services/cache/conversation');

async function handleChatMessage(ws, data, userEmail) {
    // Add user message to history
    conversationCache.addToHistory(userEmail, 'user', data.message);
    
    // Get conversation history for Gemini
    const history = conversationCache.formatHistoryForGemini(userEmail);
    
    // ... send to Gemini
    
    // Add assistant response to history
    conversationCache.addToHistory(userEmail, 'assistant', response);
}
*/

// AFTER (using Firestore with caching)
async function handleChatMessage(ws, data, userEmail) {
    // Add user message to history (optimistic cache update + batched write)
    await conversationHistory.addMessage(userEmail, 'user', data.message);
    
    // Get conversation history for Gemini (from cache or Firestore)
    const history = await conversationHistory.formatHistoryForGemini(userEmail);
    
    // ... send to Gemini
    
    // Add assistant response to history
    await conversationHistory.addMessage(userEmail, 'assistant', response);
}

// ============================================================================
// STEP 3: TTS Voice Configuration from User Settings
// ============================================================================

// BEFORE (hardcoded defaults)
/*
async function textToSpeech(text, userEmail) {
    const voiceConfig = {
        name: 'en-US-Neural2-J',
        ssmlGender: 'MALE',
        speakingRate: 1.05
    };
    // ... use voiceConfig
}
*/

// AFTER (user-specific voice settings)
async function textToSpeech(text, userEmail) {
    // Get user's voice preferences
    const settings = await userSettings.getUserSettings(userEmail);
    const voiceConfig = settings.voice;
    
    // Use personalized voice configuration
    await audioServices.textToSpeechGoogle(text, outputPath, voiceConfig);
}

// ============================================================================
// STEP 4: User Settings API Endpoints
// ============================================================================

// GET /api/settings - Get user settings
app.get('/api/settings', async (req, res) => {
    try {
        const userEmail = req.user.email; // From auth middleware
        const settings = await userSettings.getUserSettings(userEmail);
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/settings - Update user settings
app.put('/api/settings', async (req, res) => {
    try {
        const userEmail = req.user.email;
        const updates = req.body;
        
        const updatedSettings = await userSettings.updateUserSettings(userEmail, updates);
        res.json({ success: true, settings: updatedSettings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/conversations/clear - Clear conversation history
app.delete('/api/conversations/clear', async (req, res) => {
    try {
        const userEmail = req.user.email;
        await conversationHistory.clearHistory(userEmail);
        res.json({ success: true, message: 'Conversation history cleared' });
    } catch (error) {
        console.error('Error clearing history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/conversations/stats - Get conversation statistics
app.get('/api/conversations/stats', async (req, res) => {
    try {
        const userEmail = req.user.email;
        const stats = await conversationHistory.getConversationStats(userEmail);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// STEP 5: Audio Message with Metadata
// ============================================================================

async function handleAudioMessage(ws, audioData, userEmail) {
    // Transcribe audio
    const transcription = await audioServices.transcribeAudioGemini(audioFile, userEmail);
    
    // Save user message with audio metadata
    await conversationHistory.addMessage(
        userEmail,
        'user',
        transcription,
        {
            audioUrl: audioFile,
            duration: audioDuration,
            transcribedAt: new Date().toISOString()
        }
    );
    
    // ... process and respond
    
    // Save assistant response with audio URL
    await conversationHistory.addMessage(
        userEmail,
        'assistant',
        responseText,
        {
            audioUrl: responseAudioUrl,
            duration: responseDuration,
            generatedAt: new Date().toISOString()
        }
    );
}

// ============================================================================
// STEP 6: Connection Lifecycle - Update Last Active
// ============================================================================

// When user connects via WebSocket
async function handleUserConnection(ws, userEmail) {
    // Update last active timestamp (non-blocking)
    userSettings.updateLastActive(userEmail).catch(err => {
        console.warn('Failed to update last active:', err.message);
    });
    
    // ... handle connection
}

// ============================================================================
// STEP 7: Periodic Sync of Pending Messages
// ============================================================================

// Run every 5 minutes to ensure no data loss
setInterval(async () => {
    try {
        const synced = await conversationHistory.syncAllPending();
        if (synced > 0) {
            console.log(`✅ Periodic sync: ${synced} messages synced to Firestore`);
        }
    } catch (error) {
        console.error('⚠️  Periodic sync failed:', error);
    }
}, 5 * 60 * 1000); // Every 5 minutes

// ============================================================================
// STEP 8: Graceful Shutdown - Sync All Pending
// ============================================================================

process.on('SIGTERM', async () => {
    console.log('📤 Syncing pending messages before shutdown...');
    try {
        const synced = await conversationHistory.syncAllPending();
        console.log(`✅ Synced ${synced} messages before shutdown`);
    } catch (error) {
        console.error('⚠️  Failed to sync on shutdown:', error);
    }
    process.exit(0);
});

// ============================================================================
// STEP 9: Monitoring and Health Checks
// ============================================================================

// GET /api/health/cache - Monitor cache health
app.get('/api/health/cache', (req, res) => {
    const settingsCache = userSettings.getSettingsCacheStats();
    const conversationCache = conversationHistory.getCacheStats();
    
    res.json({
        success: true,
        cache: {
            settings: {
                size: settingsCache.size,
                ttl: settingsCache.ttl,
                users: settingsCache.entries.length
            },
            conversations: {
                size: conversationCache.size,
                ttl: conversationCache.ttl,
                users: conversationCache.users.length,
                pendingWrites: conversationCache.users.reduce((sum, u) => sum + u.pendingWrites, 0)
            }
        }
    });
});

// ============================================================================
// STEP 10: Timezone from User Settings
// ============================================================================

// BEFORE (fetch from Google Calendar API every time)
/*
async function getUserTimezone(userEmail, getCalendarClient) {
    const calendar = await getCalendarClient(userEmail);
    const response = await calendar.settings.get({ setting: 'timezone' });
    return response.data.value;
}
*/

// AFTER (use cached user settings, fallback to Calendar API)
async function getUserTimezone(userEmail, getCalendarClient) {
    // Try user settings first (fast)
    const settings = await userSettings.getUserSettings(userEmail);
    if (settings.timezone) {
        return settings.timezone;
    }
    
    // Fallback to Calendar API and save to settings
    const calendar = await getCalendarClient(userEmail);
    const response = await calendar.settings.get({ setting: 'timezone' });
    const timezone = response.data.value;
    
    // Save to user settings for next time
    await userSettings.updateUserSettings(userEmail, { timezone });
    
    return timezone;
}

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/*
[ ] 1. Import Firestore services in web-server.js
[ ] 2. Update WebSocket chat handler to use conversationHistory
[ ] 3. Update TTS calls to use user voice settings
[ ] 4. Add settings API endpoints (GET/PUT /api/settings)
[ ] 5. Add conversation management endpoints (DELETE/GET /api/conversations/*)
[ ] 6. Update audio handlers to save metadata
[ ] 7. Update connection handler to track last active
[ ] 8. Add periodic sync interval (5 minutes)
[ ] 9. Add graceful shutdown handler
[ ] 10. Add cache health monitoring endpoint
[ ] 11. Update timezone handling to use user settings
[ ] 12. Test with real users (gradual rollout)
[ ] 13. Monitor cache stats and Firestore usage
[ ] 14. Remove old in-memory cache after successful migration
*/

module.exports = {
    // Export integration functions for use in web-server.js
    handleChatMessage,
    textToSpeech,
    handleAudioMessage,
    handleUserConnection,
    getUserTimezone
};
