/**
 * AudioPlaybackService
 * 
 * Manages Gemini response audio playback including:
 * - Loading audio from URL with cache-busting
 * - Autoplay with retry on user interaction
 * - Error handling and debugging
 * - Integration with waveform visualization
 * - Download functionality
 * 
 * Usage:
 * ```js
 * const playbackService = new AudioPlaybackService(audioElement, {
 *     waveformService: waveformService,
 *     onPlay: () => console.log('Playing'),
 *     onPause: () => console.log('Paused'),
 *     onEnded: () => console.log('Finished'),
 *     onError: (error) => console.error('Error:', error)
 * });
 * await playbackService.loadAndPlay(audioUrl);
 * ```
 */
class AudioPlaybackService {
    /**
     * @param {HTMLAudioElement} audioElement - Audio element for playback
     * @param {Object} options - Configuration options
     * @param {Object} options.waveformService - WaveformService instance for visualization
     * @param {Function} options.onPlay - Callback when audio starts playing
     * @param {Function} options.onPause - Callback when audio is paused
     * @param {Function} options.onEnded - Callback when audio finishes
     * @param {Function} options.onError - Callback when error occurs (error) => void
     */
    constructor(audioElement, options = {}) {
        this.audioElement = audioElement;
        this.waveformService = options.waveformService;
        this.onPlay = options.onPlay;
        this.onPause = options.onPause;
        this.onEnded = options.onEnded;
        this.onError = options.onError;
        
        this.currentAudioUrl = null;
        this.autoplayEnabled = true;
        
        this.setupEventListeners();
    }
    
    /**
     * Set up audio element event listeners
     */
    setupEventListeners() {
        // Play event
        this.audioElement.addEventListener('play', () => {
            console.log('▶️  Audio started playing');
            if (this.waveformService) {
                this.waveformService.setState('playing');
                this.waveformService.startAnimation();
            }
            if (this.onPlay) {
                this.onPlay();
            }
        });
        
        // Pause event
        this.audioElement.addEventListener('pause', () => {
            console.log('⏸️  Audio paused');
            if (this.waveformService) {
                this.waveformService.setState('idle');
            }
            if (this.onPause) {
                this.onPause();
            }
        });
        
        // Ended event
        this.audioElement.addEventListener('ended', () => {
            console.log('🎵 Audio playback finished');
            if (this.waveformService) {
                this.waveformService.stopAnimation();
            }
            if (this.onEnded) {
                this.onEnded();
            }
        });
    }
    
    /**
     * Load audio from URL and attempt autoplay
     * @param {string} audioUrl - URL to audio file
     * @param {boolean} autoplay - Whether to autoplay (default: true)
     * @returns {Promise<void>}
     */
    async loadAndPlay(audioUrl, autoplay = true) {
        const audioLoadStart = performance.now();
        console.log('🔊 Audio URL received:', audioUrl);
        
        // Add timestamp to avoid caching and ensure fresh audio
        const audioUrlWithTimestamp = `${audioUrl}?t=${Date.now()}`;
        console.log('📡 Loading audio from:', audioUrlWithTimestamp);
        
        this.currentAudioUrl = audioUrlWithTimestamp;
        this.audioElement.src = audioUrlWithTimestamp;
        
        // Set waveform to idle state initially
        if (this.waveformService) {
            this.waveformService.setState('idle');
        }
        
        return new Promise((resolve, reject) => {
            // Loadeddata event - audio is ready to play
            const loadedHandler = () => {
                const audioLoadTime = performance.now() - audioLoadStart;
                console.log(`✅ Audio loaded successfully in ${audioLoadTime.toFixed(0)}ms`);
                console.log(`   Duration: ${this.audioElement.duration.toFixed(2)} seconds`);
                
                // Setup waveform analyzer
                if (this.waveformService) {
                    this.waveformService.setupAnalyzer(this.audioElement);
                }
                
                // Attempt autoplay if enabled
                if (autoplay && this.autoplayEnabled) {
                    console.log('   🎵 Auto-playing audio...');
                    this.attemptAutoplay().then(resolve).catch(reject);
                } else {
                    resolve();
                }
            };
            
            // Error event handler
            const errorHandler = (e) => {
                console.error('❌ Audio loading error!');
                console.error('   Event:', e);
                console.error('   Audio element:', this.audioElement);
                console.error('   Error code:', this.audioElement.error?.code);
                console.error('   Error message:', this.audioElement.error?.message);
                console.error('   Network state:', this.audioElement.networkState);
                console.error('   Ready state:', this.audioElement.readyState);
                console.error('   Source URL:', this.audioElement.src);
                
                // Try to fetch the audio file directly to debug
                this.debugFetchAudio(audioUrlWithTimestamp);
                
                const error = new Error(`Audio loading failed: ${this.audioElement.error?.message}`);
                if (this.onError) {
                    this.onError(error);
                }
                reject(error);
            };
            
            this.audioElement.addEventListener('loadeddata', loadedHandler, { once: true });
            this.audioElement.addEventListener('error', errorHandler, { once: true });
        });
    }
    
    /**
     * Attempt to autoplay audio with retry on user interaction
     * @returns {Promise<void>}
     */
    async attemptAutoplay() {
        try {
            await this.audioElement.play();
            console.log('✅ Audio playing with animated waveform');
            if (this.waveformService) {
                this.waveformService.setState('playing');
                this.waveformService.startAnimation();
            }
        } catch (error) {
            console.warn('⚠️  Autoplay attempt failed:', error.message);
            
            // If autoplay is blocked, try again on next user interaction
            return new Promise((resolve) => {
                const playOnInteraction = () => {
                    console.log('🔓 User interacted, attempting autoplay...');
                    this.audioElement.play().then(() => {
                        console.log('✅ Audio started playing after user interaction');
                        if (this.waveformService) {
                            this.waveformService.setState('playing');
                            this.waveformService.startAnimation();
                        }
                        // Remove listeners after successful play
                        document.removeEventListener('click', playOnInteraction);
                        document.removeEventListener('keydown', playOnInteraction);
                        resolve();
                    }).catch(e => {
                        console.error('❌ Still cannot play audio:', e.message);
                        // Keep listeners for next interaction
                    });
                };
                
                console.log('💡 Waiting for user interaction to play audio...');
                document.addEventListener('click', playOnInteraction, { once: true });
                document.addEventListener('keydown', playOnInteraction, { once: true });
            });
        }
    }
    
    /**
     * Debug fetch audio file directly
     * @param {string} audioUrl - Audio URL to test
     */
    async debugFetchAudio(audioUrl) {
        try {
            const res = await fetch(audioUrl);
            console.log('   Fetch test - Status:', res.status, res.statusText);
            console.log('   Content-Type:', res.headers.get('Content-Type'));
            
            const blob = await res.blob();
            console.log('   Fetch test - Blob size:', blob.size, 'bytes');
            console.log('   Fetch test - Blob type:', blob.type);
        } catch (fetchError) {
            console.error('   Fetch test failed:', fetchError);
        }
    }
    
    /**
     * Play audio (manual control)
     * @returns {Promise<void>}
     */
    async play() {
        try {
            await this.audioElement.play();
            console.log('▶️  Audio started playing (manual)');
        } catch (error) {
            console.error('❌ Failed to play audio:', error);
            throw error;
        }
    }
    
    /**
     * Pause audio
     */
    pause() {
        this.audioElement.pause();
        console.log('⏸️  Audio paused (manual)');
    }
    
    /**
     * Stop audio (pause and reset to beginning)
     */
    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        console.log('⏹️  Audio stopped');
    }
    
    /**
     * Set volume (0.0 to 1.0)
     * @param {number} volume - Volume level
     */
    setVolume(volume) {
        this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * Get current playback time
     * @returns {number} Current time in seconds
     */
    getCurrentTime() {
        return this.audioElement.currentTime;
    }
    
    /**
     * Get audio duration
     * @returns {number} Duration in seconds
     */
    getDuration() {
        return this.audioElement.duration;
    }
    
    /**
     * Check if audio is currently playing
     * @returns {boolean} True if playing
     */
    isPlaying() {
        return !this.audioElement.paused;
    }
    
    /**
     * Enable/disable autoplay
     * @param {boolean} enabled - Whether to enable autoplay
     */
    setAutoplay(enabled) {
        this.autoplayEnabled = enabled;
        console.log(`🔊 Autoplay ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Download current audio file
     * @param {string} filename - Optional filename (default: 'gemini-audio.mp3')
     */
    downloadAudio(filename = 'gemini-audio.mp3') {
        if (!this.currentAudioUrl) {
            console.warn('⚠️  No audio loaded to download');
            return;
        }
        
        const a = document.createElement('a');
        a.href = this.currentAudioUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log(`📥 Downloading audio as: ${filename}`);
    }
    
    /**
     * Clear current audio
     */
    clear() {
        this.stop();
        this.audioElement.src = '';
        this.currentAudioUrl = null;
        console.log('🗑️ Audio cleared');
    }
    
    /**
     * Get service state for debugging
     */
    getState() {
        return {
            isPlaying: this.isPlaying(),
            currentTime: this.getCurrentTime(),
            duration: this.getDuration(),
            volume: this.audioElement.volume,
            audioUrl: this.currentAudioUrl,
            autoplayEnabled: this.autoplayEnabled
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.AudioPlaybackService = AudioPlaybackService;
}
