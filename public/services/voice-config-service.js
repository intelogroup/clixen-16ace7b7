/**
 * VoiceConfigService
 * 
 * Manages TTS voice configuration including:
 * - Loading available voices from API
 * - Caching voices in localStorage (7-day TTL)
 * - Populating voice selector dropdown
 * - Handling voice selection changes
 * - Default voice selection
 * 
 * Usage:
 * ```js
 * const voiceService = new VoiceConfigService(selectElement, {
 *     onVoiceChange: (voiceConfig) => console.log('Voice changed:', voiceConfig)
 * });
 * await voiceService.loadVoices();
 * const currentVoice = voiceService.getSelectedVoice();
 * ```
 */
class VoiceConfigService {
    /**
     * @param {HTMLSelectElement} selectElement - Voice selector dropdown
     * @param {Object} options - Configuration options
     * @param {Function} options.onVoiceChange - Callback when voice changes (voiceConfig) => void
     * @param {Function} options.makeAuthenticatedRequest - Function to make authenticated API requests
     */
    constructor(selectElement, options = {}) {
        this.selectElement = selectElement;
        this.onVoiceChange = options.onVoiceChange;
        this.makeAuthenticatedRequest = options.makeAuthenticatedRequest || this.defaultAuthRequest.bind(this);
        
        this.voicesLoaded = false;
        this.voices = [];
        
        // Cache configuration
        this.CACHE_KEY = 'clixen_voices_cache';
        this.CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        // Default voice
        this.DEFAULT_VOICE = 'en-US-Studio-O'; // Premium Female
        
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners on voice selector
     */
    setupEventListeners() {
        // Load voices when selector is focused
        this.selectElement.addEventListener('focus', () => {
            if (!this.voicesLoaded) {
                this.loadVoices();
            }
        });
        
        // Handle voice changes
        this.selectElement.addEventListener('change', (e) => {
            const voiceConfig = e.target.value ? JSON.parse(e.target.value) : {};
            const selectedOption = e.target.options[e.target.selectedIndex];
            
            console.log(`🎵 Voice changed to: ${selectedOption.text} (${voiceConfig.name || 'Default'})`);
            
            if (this.onVoiceChange) {
                this.onVoiceChange(voiceConfig, selectedOption.text);
            }
        });
    }
    
    /**
     * Default authenticated request function (uses firebaseAuth)
     */
    async defaultAuthRequest(endpoint) {
        if (!window.firebaseAuth || !window.firebaseAuth.getCurrentUser()) {
            throw new Error('Firebase auth not ready');
        }
        return window.firebaseAuth.makeAuthenticatedRequest(endpoint);
    }
    
    /**
     * Load available voices from API or cache
     */
    async loadVoices() {
        try {
            if (this.voicesLoaded) {
                console.log('✅ Voices already loaded, skipping');
                return;
            }
            
            console.log('🎙️ Loading available voices...');
            
            // Try to load from cache first
            const cachedVoices = this.getVoicesFromCache();
            if (cachedVoices) {
                this.populateVoiceSelector(cachedVoices);
                this.voicesLoaded = true;
                return;
            }
            
            // Check if auth is ready
            if (!window.firebaseAuth || !window.firebaseAuth.getCurrentUser()) {
                console.warn('⚠️ Auth not ready yet, retrying in 500ms...');
                setTimeout(() => this.loadVoices(), 500);
                return;
            }
            
            // Fetch from API
            const response = await this.makeAuthenticatedRequest('/api/voices');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache the voices
            this.cacheVoices(data.voices);
            
            // Populate dropdown
            this.populateVoiceSelector(data.voices);
            this.voicesLoaded = true;
            
            console.log(`✅ Loaded ${data.voices.length} voices`);
            
            // Log Studio voices
            const studioVoices = data.voices.filter(v => v.name.includes('Studio'));
            if (studioVoices.length > 0) {
                console.log(`   ⭐ Studio voices available: ${studioVoices.map(v => v.label).join(', ')}`);
            }
        } catch (error) {
            console.error('❌ Error loading voices:', error);
            // Fallback option
            this.selectElement.innerHTML = '<option value="">Default Voice</option>';
        }
    }
    
    /**
     * Get voices from localStorage cache
     * @returns {Array|null} Cached voices or null if invalid/expired
     */
    getVoicesFromCache() {
        const cachedData = localStorage.getItem(this.CACHE_KEY);
        if (!cachedData) return null;
        
        try {
            const { voices, timestamp } = JSON.parse(cachedData);
            const age = Date.now() - timestamp;
            
            // Check if cache has Studio voices (invalidate old cache without them)
            const hasStudioVoices = voices && voices.some(v => v.name && v.name.includes('Studio'));
            
            if (age < this.CACHE_DURATION && voices && voices.length > 0 && hasStudioVoices) {
                const hours = Math.floor(age / 1000 / 60 / 60);
                console.log(`✅ Using cached voices (${hours}h old)`);
                return voices;
            } else if (!hasStudioVoices) {
                console.log('🔄 Cache outdated (missing Studio voices), fetching fresh...');
            } else {
                console.log('⏰ Cache expired, fetching fresh voices...');
            }
        } catch (e) {
            console.warn('⚠️ Invalid cache data, fetching fresh voices...');
        }
        
        return null;
    }
    
    /**
     * Cache voices in localStorage
     * @param {Array} voices - Voice list to cache
     */
    cacheVoices(voices) {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify({
                voices: voices,
                timestamp: Date.now()
            }));
            console.log('💾 Voices cached to localStorage (7 day TTL)');
        } catch (e) {
            console.warn('⚠️ Failed to cache voices:', e);
        }
    }
    
    /**
     * Populate voice selector dropdown with voice options
     * @param {Array} voices - Array of voice objects with name, gender, label
     */
    populateVoiceSelector(voices) {
        this.voices = voices;
        this.selectElement.innerHTML = '';
        
        voices.forEach((voice) => {
            const option = document.createElement('option');
            option.value = JSON.stringify({
                name: voice.name,
                ssmlGender: voice.gender
            });
            option.textContent = voice.label;
            
            // Set default voice
            if (voice.name === this.DEFAULT_VOICE) {
                option.selected = true;
                console.log(`   🎙️ Default voice selected: ${voice.label} (${voice.name})`);
            }
            
            this.selectElement.appendChild(option);
        });
    }
    
    /**
     * Get currently selected voice configuration
     * @returns {Object} Voice config with name and ssmlGender
     */
    getSelectedVoice() {
        if (!this.selectElement.value) {
            return {};
        }
        
        try {
            return JSON.parse(this.selectElement.value);
        } catch (e) {
            console.error('❌ Failed to parse voice config:', e);
            return {};
        }
    }
    
    /**
     * Get selected voice label
     * @returns {string} Voice label or "Default Voice"
     */
    getSelectedVoiceLabel() {
        const selectedOption = this.selectElement.options[this.selectElement.selectedIndex];
        return selectedOption ? selectedOption.text : 'Default Voice';
    }
    
    /**
     * Set voice by name
     * @param {string} voiceName - Voice name (e.g., 'en-US-Studio-O')
     * @returns {boolean} True if voice was found and set
     */
    setVoiceByName(voiceName) {
        for (let i = 0; i < this.selectElement.options.length; i++) {
            const option = this.selectElement.options[i];
            try {
                const config = JSON.parse(option.value);
                if (config.name === voiceName) {
                    this.selectElement.selectedIndex = i;
                    return true;
                }
            } catch (e) {
                // Skip invalid options
            }
        }
        return false;
    }
    
    /**
     * Clear cache (force fresh load on next request)
     */
    clearCache() {
        localStorage.removeItem(this.CACHE_KEY);
        this.voicesLoaded = false;
        console.log('🗑️ Voice cache cleared');
    }
    
    /**
     * Get service state for debugging
     */
    getState() {
        return {
            voicesLoaded: this.voicesLoaded,
            voiceCount: this.voices.length,
            selectedVoice: this.getSelectedVoice(),
            selectedLabel: this.getSelectedVoiceLabel()
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.VoiceConfigService = VoiceConfigService;
}
