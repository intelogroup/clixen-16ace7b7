/**
 * CalendarService
 * 
 * Manages Google Calendar integration including:
 * - Checking calendar connection status
 * - Initiating OAuth flow
 * - Updating UI based on connection state
 * 
 * Usage:
 * ```js
 * const calendarService = new CalendarService(connectBtn, statusElement, {
 *     makeAuthenticatedRequest: (url) => firebaseAuth.makeAuthenticatedRequest(url),
 *     onConnected: (email) => console.log('Connected:', email),
 *     onDisconnected: () => console.log('Not connected')
 * });
 * await calendarService.checkStatus();
 * calendarService.connect();
 * ```
 */
class CalendarService {
    /**
     * @param {HTMLElement} connectBtn - Calendar connect button element
     * @param {HTMLElement} statusElement - Calendar status indicator element
     * @param {Object} options - Configuration options
     * @param {Function} options.makeAuthenticatedRequest - Function to make authenticated API requests
     * @param {Function} options.onConnected - Callback when calendar is connected (email) => void
     * @param {Function} options.onDisconnected - Callback when calendar is not connected () => void
     */
    constructor(connectBtn, statusElement, options = {}) {
        this.connectBtn = connectBtn;
        this.statusElement = statusElement;
        this.makeAuthenticatedRequest = options.makeAuthenticatedRequest || this.defaultAuthRequest.bind(this);
        this.onConnected = options.onConnected;
        this.onDisconnected = options.onDisconnected;
        
        this.isConnected = false;
        this.connectedEmail = null;
        
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (this.connectBtn) {
            this.connectBtn.addEventListener('click', () => this.connect());
        }
    }
    
    /**
     * Default authenticated request function (uses firebaseAuth)
     */
    async defaultAuthRequest(endpoint) {
        if (!window.firebaseAuth) {
            throw new Error('Firebase auth not available');
        }
        return window.firebaseAuth.makeAuthenticatedRequest(endpoint);
    }
    
    /**
     * Check calendar connection status
     * @returns {Promise<Object>} Connection status { connected, email }
     */
    async checkStatus() {
        try {
            console.log('📅 Checking calendar connection status...');
            const startTime = Date.now();
            
            const response = await this.makeAuthenticatedRequest('/api/calendar-status');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const duration = Date.now() - startTime;
            
            this.isConnected = data.connected;
            this.connectedEmail = data.email;
            
            this.updateUI();
            
            if (data.connected) {
                console.log(`✅ Calendar already connected (checked in ${duration}ms)`);
                console.log('   📧 Calendar account:', data.email || 'Unknown');
                if (this.onConnected) {
                    this.onConnected(data.email);
                }
            } else {
                console.log(`⚠️ Calendar not connected (checked in ${duration}ms)`);
                console.log('   💡 Tip: Click "Connect Calendar" to enable calendar features');
                
                // Show notification banner
                this.showCalendarNotification();
                
                if (this.onDisconnected) {
                    this.onDisconnected();
                }
            }
            
            return { connected: data.connected, email: data.email };
        } catch (error) {
            console.error('❌ Error checking calendar status:', error.message);
            console.error('   📍 Error code:', error.code || 'Unknown');
            
            // Default to disconnected state on error
            this.isConnected = false;
            this.connectedEmail = null;
            this.updateUI();
            
            if (this.onDisconnected) {
                this.onDisconnected();
            }
            
            return { connected: false, email: null };
        }
    }
    
    /**
     * Update UI based on connection state
     */
    updateUI() {
        if (!this.connectBtn || !this.statusElement) {
            return;
        }
        
        if (this.isConnected) {
            // Hide connect button, show status
            this.connectBtn.style.display = 'none';
            this.statusElement.style.display = 'inline';
        } else {
            // Show connect button, hide status
            this.connectBtn.style.display = 'inline';
            this.statusElement.style.display = 'none';
        }
    }
    
    /**
     * Initiate calendar OAuth flow
     */
    connect() {
        console.log('📅 Initiating Google Calendar OAuth flow...');
        window.location.href = '/auth';
    }
    
    /**
     * Check if calendar is connected
     * @returns {boolean} True if connected
     */
    isCalendarConnected() {
        return this.isConnected;
    }
    
    /**
     * Get connected email
     * @returns {string|null} Connected email or null
     */
    getConnectedEmail() {
        return this.connectedEmail;
    }
    
    /**
     * Force disconnect (for testing)
     * Note: This only updates local state, does not revoke tokens
     */
    forceDisconnect() {
        this.isConnected = false;
        this.connectedEmail = null;
        this.updateUI();
        console.log('📅 Calendar disconnected (locally)');
    }
    
    /**
     * Show notification banner prompting user to connect calendar
     */
    showCalendarNotification() {
        // Check if user has already dismissed this notification
        if (localStorage.getItem('calendarNotificationDismissed')) {
            return;
        }
        
        // Don't show if notification already exists
        if (document.getElementById('calendar-notification')) {
            return;
        }
        
        // Create notification banner
        const notification = document.createElement('div');
        notification.id = 'calendar-notification';
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-width: 500px;
            animation: slideDown 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">📅</span>
                <div style="flex: 1;">
                    <div style="font-weight: bold; margin-bottom: 4px;">Connect Your Calendar</div>
                    <div style="font-size: 14px; opacity: 0.95;">
                        Click "Connect Calendar" to enable voice commands for managing your Google Calendar
                    </div>
                </div>
                <button onclick="document.getElementById('calendar-notification').remove(); localStorage.setItem('calendarNotificationDismissed', 'true');" 
                        style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    Got it
                </button>
            </div>
        `;
        
        // Add CSS animation
        if (!document.getElementById('calendar-notification-style')) {
            const style = document.createElement('style');
            style.id = 'calendar-notification-style';
            style.textContent = `
                @keyframes slideDown {
                    from {
                        transform: translateX(-50%) translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (document.getElementById('calendar-notification')) {
                notification.remove();
            }
        }, 10000);
    }
    
    /**
     * Get service state for debugging
     */
    getState() {
        return {
            isConnected: this.isConnected,
            connectedEmail: this.connectedEmail,
            hasConnectBtn: !!this.connectBtn,
            hasStatusElement: !!this.statusElement
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CalendarService = CalendarService;
}
