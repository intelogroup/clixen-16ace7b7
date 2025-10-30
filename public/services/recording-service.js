/**
 * Recording Service - Manages audio recording with MediaRecorder
 * Handles microphone pre-warming, recording state, and audio chunk collection
 * 
 * Features:
 * - Pre-warmed microphone for instant recording start
 * - Optimized audio settings (16kHz mono for faster processing)
 * - Proper cleanup to prevent memory leaks
 * - Recording timer management
 */

class RecordingService {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.streamingChunks = [];
        this.isRecording = false;
        this.recordingStartTime = null;
        this.timerInterval = null;
        
        // Pre-warmed microphone stream
        this.warmStream = null;
        this.isPrewarming = false;
        this.warmStreamTimeout = null;
        this.WARM_STREAM_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // Callbacks
        this.onRecordingStart = null;
        this.onRecordingStop = null;
        this.onTimerUpdate = null;
        this.onChunkAvailable = null;
    }
    
    /**
     * Pre-warm microphone for instant recording
     * Requests microphone access and keeps stream ready
     */
    async prewarmMicrophone() {
        try {
            this.isPrewarming = true;
            console.log('🔥 Pre-warming microphone...');
            
            // Clear any existing timeout
            if (this.warmStreamTimeout) {
                clearTimeout(this.warmStreamTimeout);
                this.warmStreamTimeout = null;
            }
            
            // Release old stream if exists to prevent memory leaks
            if (this.warmStream) {
                this.warmStream.getTracks().forEach(track => {
                    track.stop();
                    track.onended = null;
                });
                this.warmStream = null;
            }
            
            this.warmStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,  // Lower sample rate for faster processing
                    channelCount: 1      // Mono audio
                }
            });
            
            console.log('✅ Microphone pre-warmed and ready for instant recording!');
            console.log('   Optimized: 16kHz mono for faster transcription');
            console.log(`   ⏰ Will auto-release after ${this.WARM_STREAM_DURATION / 60000} minutes of inactivity`);
            
            // Set timeout to release stream after 5 minutes
            this.warmStreamTimeout = setTimeout(() => {
                if (this.warmStream && !this.isRecording) {
                    console.log('⏰ 5 minutes elapsed, releasing hot microphone to save resources');
                    this.warmStream.getTracks().forEach(track => track.stop());
                    this.warmStream = null;
                    this.warmStreamTimeout = null;
                }
            }, this.WARM_STREAM_DURATION);
            
            return true;
            
        } catch (err) {
            console.log('⚠️  Could not pre-warm microphone:', err.message);
            console.log('   Will request mic access on first recording instead');
            this.warmStream = null;
            return false;
        } finally {
            this.isPrewarming = false;
        }
    }
    
    /**
     * Start recording audio
     * @param {Object} options - Recording options
     * @param {Function} options.onStart - Callback when recording starts
     * @param {Function} options.onChunk - Callback when audio chunk is available
     * @param {Function} options.onStop - Callback when recording stops
     * @param {Function} options.onTimerUpdate - Callback for timer updates
     * @returns {Promise<MediaStream>} The media stream being recorded
     */
    async startRecording({ onStart, onChunk, onStop, onTimerUpdate } = {}) {
        if (this.isRecording) {
            console.warn('⚠️ Already recording');
            return null;
        }
        
        try {
            const setupStartTime = performance.now();
            console.log('🎬 Starting recording...');
            
            // Store callbacks
            this.onRecordingStart = onStart;
            this.onChunkAvailable = onChunk;
            this.onRecordingStop = onStop;
            this.onTimerUpdate = onTimerUpdate;
            
            // Clear the warm stream timeout since we're using it now
            if (this.warmStreamTimeout) {
                clearTimeout(this.warmStreamTimeout);
                this.warmStreamTimeout = null;
            }
            
            // Use pre-warmed stream if available, otherwise request new one
            let stream;
            if (this.warmStream) {
                console.log('⚡ Using pre-warmed microphone stream (instant start!)');
                stream = this.warmStream;
                this.warmStream = null; // Clear it since we're using it now
            } else {
                console.log('🎤 Requesting microphone access...');
                const micRequestStart = performance.now();
                stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 16000,
                        channelCount: 1
                    }
                });
                const micRequestTime = performance.now() - micRequestStart;
                console.log(`   ⏱️  Mic access granted in ${micRequestTime.toFixed(0)}ms`);
            }
            
            const setupTime = performance.now() - setupStartTime;
            console.log(`✅ Recording setup complete in ${setupTime.toFixed(0)}ms`);
            
            // Setup MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 16000
            });
            
            this.audioChunks = [];
            this.streamingChunks = [];
            
            // Handle data available
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    
                    // Call chunk callback if provided
                    if (this.onChunkAvailable) {
                        this.streamingChunks.push(event.data);
                        this.onChunkAvailable(event.data, this.streamingChunks.length);
                    }
                }
            };
            
            // Handle recording stop
            this.mediaRecorder.onstop = async () => {
                const recordingEndTime = performance.now();
                const recordingDuration = (recordingEndTime - this.recordingStartTime) / 1000;
                
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
                
                const originalSize = audioBlob.size;
                const sizeKB = (originalSize / 1024).toFixed(2);
                const compressionRatio = (originalSize / (recordingDuration * 16000 * 2)).toFixed(2);
                
                console.log(`📦 Audio recorded: ${originalSize} bytes (${sizeKB} KB) - Opus format`);
                console.log(`   ⏱️  Recording duration: ${recordingDuration.toFixed(2)}s`);
                console.log(`   📊 Compression: ${(compressionRatio * 100).toFixed(0)}% of raw PCM`);
                console.log(`   🎵 Estimated bitrate: ${((originalSize * 8) / recordingDuration / 1000).toFixed(1)} kbps`);
                
                // Call stop callback with audio blob
                if (this.onRecordingStop) {
                    await this.onRecordingStop(audioBlob, recordingDuration);
                }
                
                // Clean up MediaRecorder
                this.cleanupMediaRecorder();
            };
            
            // Start recording (collect chunks every 250ms for potential streaming)
            this.mediaRecorder.start(250);
            this.isRecording = true;
            
            // Start timer
            this.recordingStartTime = Date.now();
            this.startTimer();
            
            // Call start callback
            if (this.onRecordingStart) {
                this.onRecordingStart(stream);
            }
            
            return stream;
            
        } catch (error) {
            console.error('❌ Error starting recording:', error);
            throw error;
        }
    }
    
    /**
     * Stop recording
     * @returns {Promise<Blob>} The recorded audio blob
     */
    async stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) {
            console.warn('⚠️ Not currently recording');
            return null;
        }
        
        console.log('🛑 Stopping recording...');
        
        return new Promise((resolve) => {
            // Store the original onstop handler
            const originalOnStop = this.mediaRecorder.onstop;
            
            // Wrap it to also resolve the promise
            this.mediaRecorder.onstop = async (event) => {
                if (originalOnStop) {
                    await originalOnStop(event);
                }
                
                // Return the final blob
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
                resolve(audioBlob);
            };
            
            this.isRecording = false;
            this.stopTimer();
            
            // Stop the MediaRecorder
            this.mediaRecorder.stop();
            
            // Pre-warm mic again for next recording
            setTimeout(() => this.prewarmMicrophone(), 1000);
        });
    }
    
    /**
     * Start recording timer
     */
    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.recordingStartTime && this.onTimerUpdate) {
                const elapsed = Date.now() - this.recordingStartTime;
                const seconds = Math.floor(elapsed / 1000);
                const minutes = Math.floor(seconds / 60);
                const displaySeconds = seconds % 60;
                const timeString = `${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
                
                this.onTimerUpdate(timeString, elapsed);
            }
        }, 100);
    }
    
    /**
     * Stop recording timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.recordingStartTime = null;
    }
    
    /**
     * Clean up MediaRecorder and its resources
     */
    cleanupMediaRecorder() {
        if (this.mediaRecorder) {
            // Stop all tracks
            if (this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach(track => {
                    track.stop();
                    track.onended = null;
                });
            }
            
            // Clean up event handlers
            this.mediaRecorder.ondataavailable = null;
            this.mediaRecorder.onstop = null;
            this.mediaRecorder.onerror = null;
            
            this.mediaRecorder = null;
        }
    }
    
    /**
     * Get current recording state
     * @returns {Object} State object
     */
    getState() {
        return {
            isRecording: this.isRecording,
            isPrewarmed: !!this.warmStream,
            recordingDuration: this.recordingStartTime 
                ? Date.now() - this.recordingStartTime 
                : 0,
            chunksCollected: this.audioChunks.length
        };
    }
    
    /**
     * Get the latest recorded audio blob
     * @returns {Blob|null} Audio blob or null if no recording
     */
    getRecordedAudioBlob() {
        if (this.audioChunks.length === 0) {
            return null;
        }
        return new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
    }
    
    /**
     * Cleanup all resources
     */
    cleanup() {
        console.log('🧹 Cleaning up recording service...');
        
        this.stopTimer();
        this.cleanupMediaRecorder();
        
        // Release warm stream
        if (this.warmStream) {
            this.warmStream.getTracks().forEach(track => track.stop());
            this.warmStream = null;
        }
        
        // Clear timeout
        if (this.warmStreamTimeout) {
            clearTimeout(this.warmStreamTimeout);
            this.warmStreamTimeout = null;
        }
        
        // Clear chunks
        this.audioChunks = [];
        this.streamingChunks = [];
        
        console.log('✅ Recording service cleaned up');
    }
}

// Make available globally
window.RecordingService = RecordingService;

console.log('✅ Recording service loaded');
