/**
 * Conversation History Cache Service
 * 
 * In-memory conversation history store (will migrate to Firestore in Phase 2).
 * Stores recent conversation messages per user.
 */

// Conversation history store
const conversationHistory = new Map(); // userEmail -> array of messages
const MAX_HISTORY_MESSAGES = 20; // Keep 20 for storage
const CONTEXT_MESSAGES = 10; // Send only last 10 to Gemini for context

/**
 * Get conversation history for a user
 * @param {string} userEmail - User email address
 * @returns {Array} Array of conversation messages
 */
function getConversationHistory(userEmail) {
    if (!conversationHistory.has(userEmail)) {
        conversationHistory.set(userEmail, []);
    }
    return conversationHistory.get(userEmail);
}

/**
 * Add message to conversation history
 * @param {string} userEmail - User email address
 * @param {string} role - Message role ('user' or 'assistant')
 * @param {string} content - Message content
 */
function addToHistory(userEmail, role, content) {
    const history = getConversationHistory(userEmail);
    history.push({ role, content, timestamp: new Date().toISOString() });
    
    // Keep only last MAX_HISTORY_MESSAGES messages
    if (history.length > MAX_HISTORY_MESSAGES) {
        history.splice(0, history.length - MAX_HISTORY_MESSAGES);
    }
}

/**
 * Format history for Gemini (optimized - only send last N messages)
 * @param {string} userEmail - User email address
 * @returns {Array} Formatted messages for Gemini API
 */
function formatHistoryForGemini(userEmail) {
    const history = getConversationHistory(userEmail);
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
 */
function clearHistory(userEmail) {
    if (conversationHistory.has(userEmail)) {
        conversationHistory.delete(userEmail);
        console.log(`   🗑️  Cleared conversation history for ${userEmail}`);
        return true;
    }
    return false;
}

/**
 * Clear all conversation history
 */
function clearAllHistory() {
    const count = conversationHistory.size;
    conversationHistory.clear();
    console.log(`   🗑️  Cleared all conversation history (${count} users)`);
}

/**
 * Get conversation history statistics
 * @returns {Object} Stats object
 */
function getConversationStats() {
    const stats = {
        totalUsers: conversationHistory.size,
        maxMessages: MAX_HISTORY_MESSAGES,
        contextMessages: CONTEXT_MESSAGES,
        users: []
    };
    
    for (const [userEmail, history] of conversationHistory.entries()) {
        stats.users.push({
            email: userEmail,
            messageCount: history.length
        });
    }
    
    return stats;
}

module.exports = {
    getConversationHistory,
    addToHistory,
    formatHistoryForGemini,
    clearHistory,
    clearAllHistory,
    getConversationStats,
    MAX_HISTORY_MESSAGES,
    CONTEXT_MESSAGES
};
