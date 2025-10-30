/**
 * WebSocket Service - High-level wrapper for WebSocket operations
 * Manages WebSocket connection, authentication, and UI integration
 * 
 * Depends on: WebSocketClient (websocket-client.js)
 */

class WebSocketService {
    constructor() {
        this.client = null;
        this.initialized = false;
        this.eventHandlers = new Map();
    }
    
    /**
     * Initialize WebSocket connection
     * @returns {Promise<boolean>} True if initialized successfully
     */
    async initialize() {
        try {
            console.log('🔌 Initializing WebSocket service...');
            
            this.client = new WebSocketClient();
            
            // Connect to server
            await this.client.connect();
            
            // Authenticate if user is logged in
            const user = window.firebaseAuth?.getCurrentUser();
            if (user) {
                const token = await user.getIdToken();
                await this.client.authenticate(token);
                
                this.initialized = true;
                this.updateConnectionMode(true);
                
                console.log('✅ WebSocket service initialized and authenticated');
                return true;
            } else {
                console.log('⏳ Waiting for user authentication...');
                this.initialized = false;
                return false;
            }
            
        } catch (error) {
            console.error('❌ WebSocket service initialization failed:', error);
            console.log('   Falling back to HTTP mode');
            this.initialized = false;
            this.updateConnectionMode(false);
            return false;
        }
    }
    
    /**
     * Setup event handlers for WebSocket events
     * @param {Object} handlers - Object with event handler callbacks
     */
    setupHandlers(handlers) {
        if (!this.client) {
            console.warn('⚠️ Cannot setup handlers - WebSocket client not initialized');
            return;
        }
        
        console.log('🔧 Setting up WebSocket event handlers...');
        
        // Store handlers for cleanup
        this.eventHandlers = handlers;
        
        // Register all handlers with the WebSocket client
        Object.entries(handlers).forEach(([event, handler]) => {
            this.client.on(event, handler);
        });
        
        console.log(`✅ Registered ${Object.keys(handlers).length} event handlers`);
    }
    
    /**
     * Send audio stream via WebSocket
     * @param {Blob} audioBlob - Audio data to send
     * @param {Object} voiceConfig - Voice configuration for TTS
     * @returns {Promise<Object>} Response with transcription, response text, and audio
     */
    async sendAudioStream(audioBlob, voiceConfig = {}) {
        if (!this.initialized) {
            throw new Error('WebSocket service not initialized');
        }
        
        return await this.client.sendAudioStream(audioBlob, voiceConfig);
    }
    
    /**
     * Send text message via WebSocket
     * @param {string} text - Text message to send
     * @returns {Promise<Object>} Response with reply text
     */
    async sendTextMessage(text) {
        if (!this.initialized) {
            throw new Error('WebSocket service not initialized');
        }
        
        return await this.client.sendTextMessage(text);
    }
    
    /**
     * Register an event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    on(event, handler) {
        if (!this.client) {
            console.warn('⚠️ Cannot register handler - WebSocket client not initialized');
            return;
        }
        
        this.client.on(event, handler);
    }
    
    /**
     * Unregister an event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    off(event, handler) {
        if (!this.client) {
            return;
        }
        
        this.client.off(event, handler);
    }
    
    /**
     * Update connection mode indicator in UI
     * @param {boolean} isWebSocket - Whether WebSocket is active
     */
    updateConnectionMode(isWebSocket) {
        const indicator = document.getElementById('connection-mode');
        if (indicator) {
            if (isWebSocket) {
                indicator.textContent = '⚡ WebSocket (Real-time)';
                indicator.style.color = '#4CAF50';
                indicator.style.fontWeight = 'bold';
            } else {
                indicator.textContent = 'HTTP Fallback';
                indicator.style.color = '#ff9800';
            }
        }
    }
    
    /**
     * Check if WebSocket is initialized and ready
     * @returns {boolean}
     */
    isReady() {
        return this.initialized && this.client && this.client.authenticated;
    }
    
    /**
     * Get connection status
     * @returns {Object} Status object with connection details
     */
    getStatus() {
        return {
            initialized: this.initialized,
            connected: this.client?.connected || false,
            authenticated: this.client?.authenticated || false
        };
    }
    
    /**
     * Cleanup and close connection
     */
    cleanup() {
        console.log('🧹 Cleaning up WebSocket service...');
        
        // Remove all event handlers
        if (this.client && this.eventHandlers) {
            Object.entries(this.eventHandlers).forEach(([event, handler]) => {
                this.client.off(event, handler);
            });
        }
        
        // Close WebSocket connection
        if (this.client) {
            this.client.close();
        }
        
        this.client = null;
        this.initialized = false;
        this.eventHandlers.clear();
        
        console.log('✅ WebSocket service cleaned up');
    }
}

// Make available globally
window.WebSocketService = WebSocketService;

console.log('✅ WebSocket service loaded');
