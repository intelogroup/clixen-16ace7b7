/**
 * VAD Service - Voice Activity Detection for automatic recording stop
 * Monitors audio levels and detects silence to automatically stop recording
 * 
 * Features:
 * - Real-time audio level monitoring
 * - Configurable silence threshold and audio level threshold
 * - Waits for speech before starting silence timer
 * - RMS-based audio analysis for accuracy
 * - Proper AudioContext cleanup
 */

class VADService {
    constructor(options = {}) {
        // Configuration
        this.SILENCE_THRESHOLD = options.silenceThreshold || 2000; // 2 seconds default
        this.AUDIO_THRESHOLD = options.audioThreshold || -40; // -40 dB default
        
        // Audio analysis
        this.audioContext = null;
        this.analyser = null;
        this.silenceDetectionInterval = null;
        
        // State tracking
        this.lastSoundTime = null;
        this.lastLogTime = null;
        this.lastSilenceLog = null;
        this.hasSpeechDetected = false;
        this.isActive = false;
        
        // Callbacks
        this.onSilenceDetected = null;
        this.onSpeechDetected = null;
        this.onAudioLevel = null;
    }
    
    /**
     * Start VAD monitoring on a media stream
     * @param {MediaStream} stream - The audio stream to monitor
     * @param {Object} callbacks - Event callbacks
     * @param {Function} callbacks.onSilenceDetected - Called when silence threshold is reached
     * @param {Function} callbacks.onSpeechDetected - Called when speech is first detected
     * @param {Function} callbacks.onAudioLevel - Called periodically with audio level (dB)
     * @returns {boolean} Success status
     */
    start(stream, callbacks = {}) {
        if (this.isActive) {
            console.warn('⚠️ VAD already active');
            return false;
        }
        
        try {
            console.log('🎤 Setting up VAD...');
            
            // Store callbacks
            this.onSilenceDetected = callbacks.onSilenceDetected;
            this.onSpeechDetected = callbacks.onSpeechDetected;
            this.onAudioLevel = callbacks.onAudioLevel;
            
            // Create audio context and analyser for VAD
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log(`   ✅ AudioContext created, state: ${this.audioContext.state}`);
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            console.log(`   ✅ Analyser created, fftSize: ${this.analyser.fftSize}`);
            
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            console.log(`   ✅ Audio source connected to analyser`);
            
            // Initialize - set to null to indicate we haven't detected speech yet
            this.lastSoundTime = null;
            this.hasSpeechDetected = false;
            console.log(`   ⏳ Waiting for user to speak before starting silence timer...`);
            
            // Start monitoring silence
            this.silenceDetectionInterval = setInterval(() => {
                this.detectSilence();
            }, 100); // Check every 100ms
            
            this.isActive = true;
            
            console.log(`🎤 VAD enabled: Auto-stop after ${this.SILENCE_THRESHOLD / 1000}s of silence AFTER speech`);
            console.log(`   Audio threshold: ${this.AUDIO_THRESHOLD} dB`);
            console.log(`   Detection interval: every 100ms`);
            
            return true;
            
        } catch (error) {
            console.error('⚠️ Could not setup VAD:', error);
            this.cleanup();
            return false;
        }
    }
    
    /**
     * Detect silence in the audio stream
     * Uses RMS calculation for accurate audio level detection
     */
    detectSilence() {
        if (!this.analyser || !this.isActive) return;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS (more accurate than simple average)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        
        // Convert to dB (approximate)
        const db = 20 * Math.log10(Math.max(rms, 1) / 255); // Prevent log(0)
        
        // Log current audio level (every 1 second to avoid spam)
        if (!this.lastLogTime || Date.now() - this.lastLogTime > 1000) {
            if (!this.hasSpeechDetected) {
                console.log(`🎚️  Audio level: ${db.toFixed(1)} dB (waiting for speech above ${this.AUDIO_THRESHOLD} dB...)`);
            } else {
                console.log(`🎚️  Audio level: ${db.toFixed(1)} dB (threshold: ${this.AUDIO_THRESHOLD} dB)`);
            }
            this.lastLogTime = Date.now();
            
            // Call audio level callback
            if (this.onAudioLevel) {
                this.onAudioLevel(db, this.AUDIO_THRESHOLD);
            }
        }
        
        // Check if sound is detected
        if (db > this.AUDIO_THRESHOLD) {
            // Sound detected!
            
            // If this is the first time we detect speech, mark it
            if (!this.hasSpeechDetected) {
                this.hasSpeechDetected = true;
                console.log(`🗣️  SPEECH DETECTED! Starting silence timer now (${db.toFixed(1)} dB)`);
                
                // Call speech detected callback
                if (this.onSpeechDetected) {
                    this.onSpeechDetected(db);
                }
            }
            
            // Reset silence timer
            const wasSilent = this.lastSoundTime && (Date.now() - this.lastSoundTime) > 500;
            if (wasSilent) {
                console.log(`🔊 Sound detected! Resetting silence timer (${db.toFixed(1)} dB)`);
            }
            this.lastSoundTime = Date.now();
        } else {
            // Silence detected
            
            // If we haven't detected speech yet, don't count silence
            if (!this.hasSpeechDetected) {
                // Just waiting for user to speak
                return;
            }
            
            // We have detected speech, now count silence
            const silenceDuration = Date.now() - this.lastSoundTime;
            
            // Log silence progress every 500ms
            if (!this.lastSilenceLog || Date.now() - this.lastSilenceLog > 500) {
                console.log(`🔇 Silence: ${(silenceDuration / 1000).toFixed(1)}s / ${(this.SILENCE_THRESHOLD / 1000).toFixed(1)}s (${db.toFixed(1)} dB)`);
                this.lastSilenceLog = Date.now();
            }
            
            if (silenceDuration >= this.SILENCE_THRESHOLD) {
                console.log(`✋ ${this.SILENCE_THRESHOLD / 1000}s of silence detected - auto-stopping`);
                
                // Call silence detected callback
                if (this.onSilenceDetected) {
                    this.onSilenceDetected(silenceDuration);
                }
            }
        }
    }
    
    /**
     * Stop VAD monitoring
     */
    stop() {
        console.log('🛑 Stopping VAD...');
        this.cleanup();
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        console.log('🧹 Cleaning up VAD resources...');
        
        // Clear silence detection interval
        if (this.silenceDetectionInterval) {
            clearInterval(this.silenceDetectionInterval);
            this.silenceDetectionInterval = null;
            console.log('   ✅ Cleared silence detection interval');
        }
        
        // Disconnect and clean up analyser
        if (this.analyser) {
            try {
                this.analyser.disconnect();
            } catch (e) {
                // Already disconnected, ignore
            }
            this.analyser = null;
        }
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().then(() => {
                console.log('   ✅ Closed audio context');
            }).catch((e) => {
                console.warn('   ⚠️ Error closing audio context:', e);
            });
            this.audioContext = null;
        }
        
        // Clean up state variables
        this.lastSoundTime = null;
        this.lastLogTime = null;
        this.lastSilenceLog = null;
        this.hasSpeechDetected = false;
        this.isActive = false;
        
        console.log('   ✅ VAD cleanup complete');
    }
    
    /**
     * Update configuration
     * @param {Object} options - Configuration options
     * @param {number} options.silenceThreshold - Silence duration in ms
     * @param {number} options.audioThreshold - Audio level threshold in dB
     */
    configure(options = {}) {
        if (options.silenceThreshold !== undefined) {
            this.SILENCE_THRESHOLD = options.silenceThreshold;
            console.log(`🔧 VAD silence threshold updated to ${this.SILENCE_THRESHOLD}ms`);
        }
        
        if (options.audioThreshold !== undefined) {
            this.AUDIO_THRESHOLD = options.audioThreshold;
            console.log(`🔧 VAD audio threshold updated to ${this.AUDIO_THRESHOLD} dB`);
        }
    }
    
    /**
     * Get current VAD state
     * @returns {Object} State object
     */
    getState() {
        return {
            isActive: this.isActive,
            hasSpeechDetected: this.hasSpeechDetected,
            silenceDuration: this.hasSpeechDetected && this.lastSoundTime 
                ? Date.now() - this.lastSoundTime 
                : 0,
            silenceThreshold: this.SILENCE_THRESHOLD,
            audioThreshold: this.AUDIO_THRESHOLD
        };
    }
    
    /**
     * Reset VAD state without stopping
     * Useful for restarting silence detection
     */
    reset() {
        console.log('🔄 Resetting VAD state...');
        this.lastSoundTime = null;
        this.lastLogTime = null;
        this.lastSilenceLog = null;
        this.hasSpeechDetected = false;
        console.log('   ✅ VAD state reset');
    }
}

// Make available globally
window.VADService = VADService;

console.log('✅ VAD service loaded');
