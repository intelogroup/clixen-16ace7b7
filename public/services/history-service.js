/**
 * HistoryService
 * 
 * Manages conversation history including:
 * - Storing conversations in localStorage (user-specific)
 * - Rendering history UI
 * - Security validations (XSS prevention, content length limits)
 * - Conversation context retrieval for AI memory
 * 
 * Usage:
 * ```js
 * const historyService = new HistoryService(historyListElement, {
 *     getUserId: () => firebaseAuth.getCurrentUser()?.uid
 * });
 * historyService.addToHistory('user', 'Hello');
 * historyService.addToHistory('assistant', 'Hi there!');
 * const context = historyService.getConversationContext(20);
 * ```
 */
class HistoryService {
    /**
     * @param {HTMLElement} historyListElement - Container element for history items
     * @param {Object} options - Configuration options
     * @param {Function} options.getUserId - Function that returns current user ID
     */
    constructor(historyListElement, options = {}) {
        this.historyListElement = historyListElement;
        this.getUserId = options.getUserId || (() => null);
        
        // Security limits
        this.MAX_CONTENT_LENGTH = 50000; // 50KB per message
        this.MAX_HISTORY_ITEMS = 100; // Max items in storage
        
        // Storage key prefix
        this.STORAGE_KEY_PREFIX = 'voiceHistory_';
    }
    
    /**
     * Get user-specific storage key
     * @returns {string} Storage key for current user
     */
    getUserHistoryKey() {
        const userId = this.getUserId();
        if (userId) {
            return `${this.STORAGE_KEY_PREFIX}${userId}`;
        }
        // Fallback to anonymous key
        return `${this.STORAGE_KEY_PREFIX}anonymous`;
    }
    
    /**
     * Get conversation history from localStorage
     * @returns {Array} Array of history items with role, content, timestamp
     */
    getHistory() {
        const storageKey = this.getUserHistoryKey();
        const stored = localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : [];
    }
    
    /**
     * Add message to conversation history
     * @param {string} role - 'user' or 'assistant'
     * @param {string} content - Message content
     */
    addToHistory(role, content) {
        // SECURITY: Validate inputs to prevent XSS
        if (typeof role !== 'string' || !['user', 'assistant'].includes(role)) {
            console.error('❌ Invalid role for history:', role);
            return;
        }
        
        if (typeof content !== 'string' || content.length === 0) {
            console.error('❌ Invalid content for history');
            return;
        }
        
        // SECURITY: Limit content length to prevent storage abuse
        const sanitizedContent = content.length > this.MAX_CONTENT_LENGTH 
            ? content.substring(0, this.MAX_CONTENT_LENGTH) + '... (truncated)'
            : content;
        
        const history = this.getHistory();
        
        // PERFORMANCE: Limit history size to prevent localStorage overflow
        if (history.length >= this.MAX_HISTORY_ITEMS) {
            history.shift(); // Remove oldest item
            console.log(`⚠️ History limit reached (${this.MAX_HISTORY_ITEMS}), removing oldest item`);
        }
        
        history.push({
            role,
            content: sanitizedContent,
            timestamp: new Date().toISOString()
        });
        
        this.saveHistory(history);
        this.renderHistory();
    }
    
    /**
     * Save history to localStorage with error handling
     * @param {Array} history - History array to save
     */
    saveHistory(history) {
        const storageKey = this.getUserHistoryKey();
        try {
            localStorage.setItem(storageKey, JSON.stringify(history));
        } catch (e) {
            console.error('❌ Failed to save history (storage full?):', e);
            // Try to free up space by removing half the history
            const reducedHistory = history.slice(Math.floor(history.length / 2));
            try {
                localStorage.setItem(storageKey, JSON.stringify(reducedHistory));
                console.log(`⚠️ Reduced history to ${reducedHistory.length} items to fit storage`);
            } catch (e2) {
                console.error('❌ Still cannot save history after reduction');
            }
        }
    }
    
    /**
     * Load and render history
     */
    loadHistory() {
        this.renderHistory();
    }
    
    /**
     * Render history in the UI
     */
    renderHistory() {
        const history = this.getHistory();
        this.historyListElement.innerHTML = '';
        
        history.forEach(item => {
            // SECURITY: Validate item structure
            if (!item || typeof item.role !== 'string' || typeof item.content !== 'string') {
                console.warn('⚠️ Skipping invalid history item');
                return;
            }
            
            const div = document.createElement('div');
            div.className = `history-item ${item.role}`;
            
            const header = document.createElement('div');
            header.className = 'history-item-header';
            // SECURITY: Use textContent to prevent XSS
            const roleLabel = item.role === 'user' ? '👤 You' : '🤖 Gemini';
            const timestamp = new Date(item.timestamp).toLocaleString();
            header.textContent = `${roleLabel} - ${timestamp}`;
            
            const content = document.createElement('div');
            content.className = 'history-item-content';
            // SECURITY: Use textContent instead of innerHTML to prevent XSS
            content.textContent = item.content;
            
            div.appendChild(header);
            div.appendChild(content);
            this.historyListElement.appendChild(div);
        });
    }
    
    /**
     * Clear all conversation history
     * @returns {boolean} True if history was cleared
     */
    clearHistory() {
        if (confirm('Clear all conversation history?')) {
            const storageKey = this.getUserHistoryKey();
            localStorage.removeItem(storageKey);
            this.renderHistory();
            console.log('🗑️ Conversation history cleared');
            return true;
        }
        return false;
    }
    
    /**
     * Get last N messages for conversation context (AI memory)
     * @param {number} count - Number of recent messages to retrieve (default: 20)
     * @returns {Array} Array of {role, parts} objects in Gemini format
     */
    getConversationContext(count = 20) {
        const history = this.getHistory();
        
        // Get last N messages
        const recentHistory = history.slice(-count);
        
        // Convert to format expected by backend (Gemini API format)
        const context = recentHistory.map(item => ({
            role: item.role === 'user' ? 'user' : 'model', // Convert 'assistant' to 'model' for Gemini
            parts: [{ text: item.content }]
        }));
        
        console.log(`🧠 Retrieved ${context.length} messages for conversation context`);
        if (context.length > 0) {
            const first = context[0].parts[0].text;
            const last = context[context.length - 1].parts[0].text;
            console.log(`   📝 First message: "${first.substring(0, 50)}..."`);
            console.log(`   📝 Last message: "${last.substring(0, 50)}..."`);
        }
        
        return context;
    }
    
    /**
     * Get history count
     * @returns {number} Number of items in history
     */
    getHistoryCount() {
        return this.getHistory().length;
    }
    
    /**
     * Export history as JSON string
     * @returns {string} JSON representation of history
     */
    exportHistory() {
        const history = this.getHistory();
        return JSON.stringify(history, null, 2);
    }
    
    /**
     * Import history from JSON string
     * @param {string} jsonString - JSON representation of history
     * @returns {boolean} True if import was successful
     */
    importHistory(jsonString) {
        try {
            const history = JSON.parse(jsonString);
            if (!Array.isArray(history)) {
                throw new Error('Invalid history format');
            }
            this.saveHistory(history);
            this.renderHistory();
            console.log(`✅ Imported ${history.length} history items`);
            return true;
        } catch (e) {
            console.error('❌ Failed to import history:', e);
            return false;
        }
    }
    
    /**
     * Get service state for debugging
     */
    getState() {
        const history = this.getHistory();
        return {
            itemCount: history.length,
            storageKey: this.getUserHistoryKey(),
            oldestMessage: history[0]?.timestamp,
            newestMessage: history[history.length - 1]?.timestamp
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.HistoryService = HistoryService;
}
