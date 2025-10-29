/**
 * Conversation History Firestore Service
 * Persists conversation history to Firestore with in-memory caching
 */

const { getFirestore } = require('../../../../firebase-config');

// In-memory cache for conversation history (reduces Firestore reads)
const conversationCache = new Map(); // userEmail -> { messages, lastSync }
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_HISTORY_MESSAGES = 50; // Store up to 50 messages per user
const CONTEXT_MESSAGES = 10; // Send only last 10 to Gemini for context
const BATCH_WRITE_THRESHOLD = 5; // Write to Firestore every N messages

/**
 * Get conversation history for a user (with caching)
 * @param {string} userEmail - User email address
 * @returns {Promise<Array>} Array of conversation messages
 */
async function getConversationHistory(userEmail) {
    if (!userEmail) {
        throw new Error('User email is required');
    }

    // Check cache first
    const cached = conversationCache.get(userEmail);
    if (cached && Date.now() - cached.lastSync < CACHE_TTL) {
        console.log(`   💾 Cache HIT: Conversation history for ${userEmail} (${cached.messages.length} messages)`);
        return cached.messages;
    }

    // Fetch from Firestore
    try {
        const db = getFirestore();
        const conversationsRef = db.collection('conversations').doc(userEmail).collection('messages');
        
        // Get messages ordered by timestamp (most recent last)
        const snapshot = await conversationsRef
            .orderBy('timestamp', 'asc')
            .limit(MAX_HISTORY_MESSAGES)
            .get();

        const messages = [];
        snapshot.forEach(doc => {
            messages.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`   📖 Firestore READ: Loaded ${messages.length} messages for ${userEmail}`);

        // Update cache
        conversationCache.set(userEmail, {
            messages,
            lastSync: Date.now(),
            pendingWrites: 0
        });

        return messages;
    } catch (error) {
        console.error(`   ❌ Error fetching conversation history for ${userEmail}:`, error);
        // Return empty array on error
        return [];
    }
}

/**
 * Add message to conversation history (cached write)
 * @param {string} userEmail - User email address
 * @param {string} role - Message role ('user' or 'assistant')
 * @param {string} content - Message content
 * @param {Object} metadata - Optional metadata (audioUrl, duration, etc.)
 * @returns {Promise<Object>} Added message object
 */
async function addMessage(userEmail, role, content, metadata = {}) {
    if (!userEmail || !role || !content) {
        throw new Error('User email, role, and content are required');
    }

    const message = {
        role,
        content,
        timestamp: new Date().toISOString(),
        ...metadata
    };

    try {
        // Update cache first (optimistic update)
        let cacheEntry = conversationCache.get(userEmail);
        if (!cacheEntry) {
            // Initialize cache if not exists
            const history = await getConversationHistory(userEmail);
            cacheEntry = {
                messages: history,
                lastSync: Date.now(),
                pendingWrites: 0
            };
            conversationCache.set(userEmail, cacheEntry);
        }

        // Add to cache
        cacheEntry.messages.push(message);
        cacheEntry.pendingWrites++;

        // Trim to MAX_HISTORY_MESSAGES
        if (cacheEntry.messages.length > MAX_HISTORY_MESSAGES) {
            const removed = cacheEntry.messages.splice(0, cacheEntry.messages.length - MAX_HISTORY_MESSAGES);
            // Delete old messages from Firestore in background
            deleteMessagesAsync(userEmail, removed.map(m => m.id).filter(Boolean));
        }

        console.log(`   💬 Added message to cache (${role}): ${userEmail} [Pending: ${cacheEntry.pendingWrites}]`);

        // Write to Firestore if threshold reached or important message
        if (cacheEntry.pendingWrites >= BATCH_WRITE_THRESHOLD || role === 'user') {
            await syncToFirestore(userEmail);
        } else {
            // Schedule background sync
            scheduleBackgroundSync(userEmail);
        }

        return message;
    } catch (error) {
        console.error(`   ❌ Error adding message for ${userEmail}:`, error);
        throw error;
    }
}

/**
 * Sync cached messages to Firestore
 * @param {string} userEmail - User email address
 * @returns {Promise<number>} Number of messages synced
 */
async function syncToFirestore(userEmail) {
    const cacheEntry = conversationCache.get(userEmail);
    if (!cacheEntry || cacheEntry.pendingWrites === 0) {
        return 0;
    }

    try {
        const db = getFirestore();
        const conversationsRef = db.collection('conversations').doc(userEmail).collection('messages');
        
        // Get messages that need to be written (those without IDs)
        const messagesToWrite = cacheEntry.messages.filter(m => !m.id);
        
        if (messagesToWrite.length === 0) {
            cacheEntry.pendingWrites = 0;
            return 0;
        }

        // Batch write to Firestore
        const batch = db.batch();
        const writtenMessages = [];

        for (const message of messagesToWrite) {
            const docRef = conversationsRef.doc();
            const messageData = { ...message };
            delete messageData.id; // Remove id field before writing
            
            batch.set(docRef, messageData);
            message.id = docRef.id; // Update cache with Firestore ID
            writtenMessages.push(docRef.id);
        }

        await batch.commit();
        
        cacheEntry.pendingWrites = 0;
        cacheEntry.lastSync = Date.now();

        console.log(`   ✅ Synced ${writtenMessages.length} messages to Firestore for ${userEmail}`);
        return writtenMessages.length;
    } catch (error) {
        console.error(`   ❌ Error syncing messages to Firestore for ${userEmail}:`, error);
        throw error;
    }
}

/**
 * Format history for Gemini API (optimized - only send last N messages)
 * @param {string} userEmail - User email address
 * @returns {Promise<Array>} Formatted messages for Gemini API
 */
async function formatHistoryForGemini(userEmail) {
    const history = await getConversationHistory(userEmail);
    
    // Only send last CONTEXT_MESSAGES for better performance
    const recentHistory = history.slice(-CONTEXT_MESSAGES);
    
    console.log(`   📚 Context: Sending last ${recentHistory.length}/${history.length} messages to Gemini`);
    
    return recentHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));
}

/**
 * Clear conversation history for a user
 * @param {string} userEmail - User email address
 * @returns {Promise<boolean>} True if successful
 */
async function clearHistory(userEmail) {
    if (!userEmail) {
        throw new Error('User email is required');
    }

    try {
        const db = getFirestore();
        const conversationsRef = db.collection('conversations').doc(userEmail).collection('messages');
        
        // Get all messages
        const snapshot = await conversationsRef.get();
        
        if (snapshot.empty) {
            console.log(`   ℹ️  No messages to clear for ${userEmail}`);
            conversationCache.delete(userEmail);
            return true;
        }

        // Delete in batches
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        // Clear cache
        conversationCache.delete(userEmail);
        
        console.log(`   🗑️  Cleared ${snapshot.size} messages for ${userEmail}`);
        return true;
    } catch (error) {
        console.error(`   ❌ Error clearing conversation history for ${userEmail}:`, error);
        throw error;
    }
}

/**
 * Get conversation statistics for a user
 * @param {string} userEmail - User email address
 * @returns {Promise<Object>} Statistics object
 */
async function getConversationStats(userEmail) {
    const history = await getConversationHistory(userEmail);
    
    const stats = {
        totalMessages: history.length,
        userMessages: history.filter(m => m.role === 'user').length,
        assistantMessages: history.filter(m => m.role === 'assistant').length,
        oldestMessage: history.length > 0 ? history[0].timestamp : null,
        newestMessage: history.length > 0 ? history[history.length - 1].timestamp : null
    };

    return stats;
}

/**
 * Clear conversation cache for a user or all users
 * @param {string} [userEmail] - Optional user email (clears all if not provided)
 */
function clearConversationCache(userEmail = null) {
    if (userEmail) {
        conversationCache.delete(userEmail);
        console.log(`   🗑️  Cleared conversation cache for ${userEmail}`);
    } else {
        const count = conversationCache.size;
        conversationCache.clear();
        console.log(`   🗑️  Cleared conversation cache for all users (${count} entries)`);
    }
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
    const stats = {
        size: conversationCache.size,
        ttl: CACHE_TTL,
        maxMessages: MAX_HISTORY_MESSAGES,
        contextMessages: CONTEXT_MESSAGES,
        users: []
    };

    for (const [userEmail, cacheEntry] of conversationCache.entries()) {
        stats.users.push({
            email: userEmail,
            messageCount: cacheEntry.messages.length,
            pendingWrites: cacheEntry.pendingWrites,
            lastSync: new Date(cacheEntry.lastSync).toISOString()
        });
    }

    return stats;
}

/**
 * Delete messages from Firestore (async background operation)
 * @param {string} userEmail - User email address
 * @param {Array<string>} messageIds - Message IDs to delete
 */
function deleteMessagesAsync(userEmail, messageIds) {
    if (!messageIds || messageIds.length === 0) return;

    // Run deletion in background without blocking
    (async () => {
        try {
            const db = getFirestore();
            const conversationsRef = db.collection('conversations').doc(userEmail).collection('messages');
            
            const batch = db.batch();
            for (const messageId of messageIds) {
                batch.delete(conversationsRef.doc(messageId));
            }
            
            await batch.commit();
            console.log(`   🗑️  Deleted ${messageIds.length} old messages for ${userEmail}`);
        } catch (error) {
            console.error(`   ⚠️  Error deleting old messages for ${userEmail}:`, error.message);
        }
    })();
}

/**
 * Schedule background sync for a user
 * @param {string} userEmail - User email address
 */
const syncTimers = new Map();

function scheduleBackgroundSync(userEmail) {
    // Clear existing timer
    if (syncTimers.has(userEmail)) {
        clearTimeout(syncTimers.get(userEmail));
    }

    // Schedule sync in 30 seconds
    const timer = setTimeout(async () => {
        try {
            await syncToFirestore(userEmail);
            syncTimers.delete(userEmail);
        } catch (error) {
            console.error(`   ⚠️  Background sync failed for ${userEmail}:`, error.message);
        }
    }, 30000); // 30 seconds

    syncTimers.set(userEmail, timer);
}

/**
 * Force sync all pending messages
 * @returns {Promise<number>} Total messages synced
 */
async function syncAllPending() {
    let totalSynced = 0;
    
    for (const [userEmail, cacheEntry] of conversationCache.entries()) {
        if (cacheEntry.pendingWrites > 0) {
            try {
                const synced = await syncToFirestore(userEmail);
                totalSynced += synced;
            } catch (error) {
                console.error(`   ⚠️  Error syncing for ${userEmail}:`, error.message);
            }
        }
    }

    console.log(`   ✅ Synced ${totalSynced} total messages across all users`);
    return totalSynced;
}

module.exports = {
    getConversationHistory,
    addMessage,
    syncToFirestore,
    formatHistoryForGemini,
    clearHistory,
    getConversationStats,
    clearConversationCache,
    getCacheStats,
    syncAllPending,
    MAX_HISTORY_MESSAGES,
    CONTEXT_MESSAGES
};
