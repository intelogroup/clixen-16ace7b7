class VoiceAssistant {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.warmStream = null; // Pre-warmed microphone stream
        this.isPrewarming = false;
        this.warmStreamTimeout = null; // Timeout to release warm stream after 5 minutes
        this.WARM_STREAM_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // WebSocket support (primary mode, HTTP fallback)
        this.wsClient = null;
        this.wsInitialized = false;
        
        // Web Worker for audio processing
        this.audioWorker = null;
        this.initAudioWorker();
        
        // Streaming support
        this.isStreaming = false;
        this.streamedText = '';
        
        // Debouncing for UI actions
        this.isProcessing = false;
        this.lastActionTime = 0;
        this.ACTION_DEBOUNCE_MS = 500; // 500ms debounce
        
        // VAD (Voice Activity Detection) settings
        this.audioContext = null;
        this.analyser = null;
        this.silenceDetectionInterval = null;
        this.lastSoundTime = null;
        this.lastLogTime = null;
        this.lastSilenceLog = null;
        this.SILENCE_THRESHOLD = 2000; // 2 seconds (2000ms) of silence before auto-stop (optimized for production - was 4s)
        this.AUDIO_THRESHOLD = -40; // dB threshold for detecting sound (adjusted from -50 to -40 for better ambient noise handling)
        
        this.initElements();
        this.attachEventListeners();
        this.loadHistory();
        this.prewarmMicrophone(); // Start pre-warming mic immediately
        
        // Initialize WebSocket (primary mode, HTTP auto-fallback on error)
        this.initializeWebSocket();
        
        // Load voices immediately to show Studio voice in UI
        this.voicesLoaded = false;
        this.loadVoices();
        
        // Also reload on dropdown focus in case cache expired
        this.voiceSelect.addEventListener('focus', () => {
            if (!this.voicesLoaded) {
                this.loadVoices();
            }
        }, { once: false });
    }
    
    /**
     * Debounce helper - prevents rapid repeated actions
     */
    debounce(action, minDelay = this.ACTION_DEBOUNCE_MS) {
        const now = Date.now();
        if (now - this.lastActionTime < minDelay) {
            console.log(`⏸️  Debounced: ${minDelay - (now - this.lastActionTime)}ms remaining`);
            return false;
        }
        this.lastActionTime = now;
        return true;
    }
    
    /**
     * Initialize WebSocket connection for real-time streaming
     */
    async initializeWebSocket() {
        try {
            console.log('🔌 Initializing WebSocket connection...');
            
            this.wsClient = new WebSocketClient();
            
            // Connect
            await this.wsClient.connect();
            
            // Authenticate once user is logged in
            const user = window.firebaseAuth?.getCurrentUser();
            if (user) {
                const token = await user.getIdToken();
                await this.wsClient.authenticate(token);
                
                this.wsInitialized = true;
                this.updateConnectionMode();
                
                // Setup event handlers
                this.setupWebSocketHandlers();
                
                console.log('✅ WebSocket initialized and authenticated');
            } else {
                console.log('⏳ Waiting for user authentication before WebSocket auth...');
                // Will authenticate after user signs in
            }
            
        } catch (error) {
            console.error('❌ WebSocket initialization failed:', error);
            console.log('   Falling back to HTTP mode');
            this.wsInitialized = false;
            this.updateConnectionMode();
        }
    }
    
    /**
     * Setup WebSocket event handlers
     */
    setupWebSocketHandlers() {
        console.log('🔧 Setting up WebSocket event handlers...');
        
        // Instant acknowledgment
        this.wsClient.on('instant_ack', (data) => {
            console.log(`⚡ [WS Event] Instant ACK: "${data.text}" (intent: ${data.intent || 'generic'})`);
            // Show ACK in transcription area temporarily
            this.transcriptionText.textContent = `🎙️ ${data.text}`;
            this.transcriptionText.style.fontStyle = 'italic';
            this.transcriptionText.style.opacity = '0.7';
        });
        
        // Transcription updates
        this.wsClient.on('user_transcription', (data) => {
            console.log('📝 [WS Event] Transcription received:', data.text);
            this.transcriptionText.classList.remove('loading');
            this.transcriptionText.style.fontStyle = 'normal';
            this.transcriptionText.style.opacity = '1';
            this.transcriptionText.textContent = data.text;
        });
        
        // Function calls
        this.wsClient.on('user_function_calls', (data) => {
            console.log(`🔧 [WS Event] Functions executing: ${data.functions.join(', ')}`);
        });
        
        // Response text
        this.wsClient.on('user_response_text', (data) => {
            console.log('🤖 [WS Event] Response text received:', data.text.substring(0, 100) + '...');
            this.responseText.classList.remove('loading');
            this.responseText.textContent = data.text;
        });
        
        // Audio chunks (auto-played by WebSocketClient)
        this.wsClient.on('user_audio_chunk', (data) => {
            console.log(`🔊 [WS Event] Audio chunk ${data.chunk + 1}/${data.total} playing`);
            
            // Show waveform on first chunk
            if (data.chunk === 0) {
                console.log('   📊 Showing waveform visualization');
                this.audioWaveformContainer.style.display = 'block';
                this.setupWaveformCanvas();
                this.setWaveformState('playing');
            }
            
            // Hide waveform on last chunk
            if (data.isLast) {
                console.log('   ✅ Last audio chunk received');
                setTimeout(() => {
                    this.setWaveformState('idle');
                }, 2000);
            }
        });
        
        // Processing complete (server finished, but audio might still be playing)
        this.wsClient.on('processing_complete', (data) => {
            console.log(`✅ [WS Event] Server processing complete in ${data.duration}ms`);
            console.log('   ⏳ Waiting for audio playback to finish...');
            // Don't clear processing status yet - wait for audio_queue_finished
            // Update text to indicate waiting for playback
            this.statusText.textContent = 'Playing audio...';
        });
        
        // Listen for when audio queue finishes playing
        this.wsClient.on('audio_queue_finished', () => {
            console.log('🎵 [WS Event] All audio finished playing - clearing processing status');
            this.statusIndicator.classList.remove('processing');
            this.statusText.textContent = 'Complete!';
            
            // Re-enable buttons only when truly complete
            this.sendButton.disabled = false;
            this.micButton.disabled = false;
        });
        
        // Error handling
        this.wsClient.on('error', (data) => {
            console.error('❌ [WS Event] Error from server:', data.error);
            this.statusIndicator.classList.remove('processing');
            this.statusText.textContent = 'Error';
            this.transcriptionText.classList.remove('loading');
            this.responseText.classList.remove('loading');
            this.responseText.textContent = `Error: ${data.error}`;
        });
        
        console.log('✅ WebSocket event handlers configured');
    }
    
    /**
     * Update connection mode indicator
     */
    updateConnectionMode() {
        const indicator = document.getElementById('connection-mode');
        if (indicator) {
            if (this.wsInitialized) {
                indicator.textContent = '⚡ WebSocket (Real-time)';
                indicator.style.color = '#4CAF50';
                indicator.style.fontWeight = 'bold';
            } else {
                indicator.textContent = 'HTTP Fallback';
                indicator.style.color = '#ff9800';
            }
        }
    }

    initAudioWorker() {
        try {
            console.log('🔧 Initializing Audio Worker...');
            const startTime = Date.now();
            
            this.audioWorker = new Worker('audio-worker.js');
            
            this.audioWorker.addEventListener('message', (e) => {
                const { success, result, task, error } = e.data;
                
                if (success) {
                    console.log(`✅ [Worker] Task completed: ${task}`);
                    this.handleWorkerResult(task, result);
                } else {
                    console.error(`❌ [Worker] Task failed: ${task}`, error);
                    console.error('   💡 Check worker implementation for bugs');
                }
            });
            
            this.audioWorker.addEventListener('error', (error) => {
                console.error('❌ [Worker] Error:', error.message || error);
                console.error('   📍 File:', error.filename);
                console.error('   📍 Line:', error.lineno, ':', error.colno);
            });
            
            const duration = Date.now() - startTime;
            console.log(`✅ Audio Worker initialized in ${duration}ms`);
            console.log('   📦 Worker ready for: analysis, encoding, decoding');
        } catch (error) {
            console.warn('⚠️  Could not initialize Audio Worker:', error.message);
            console.log('   📍 Falling back to direct processing (slower)');
            console.log('   💡 Tip: Check if audio-worker.js is accessible');
            this.audioWorker = null;
        }
    }

    handleWorkerResult(task, result) {
        switch(task) {
            case 'analyze':
                console.log('📊 Audio analysis:', result);
                if (result.quality === 'poor') {
                    console.warn('⚠️  Audio quality is poor, consider re-recording');
                }
                break;
        }
    }
    
    /**
     * Process audio with worker and return Promise
     */
    processWithWorker(audioBlob, task) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Worker task '${task}' timeout after 5s`));
            }, 5000);
            
            const handler = (e) => {
                const { success, result, task: completedTask, error } = e.data;
                
                if (completedTask === task) {
                    clearTimeout(timeout);
                    this.audioWorker.removeEventListener('message', handler);
                    
                    if (success) {
                        resolve(result);
                    } else {
                        reject(new Error(error));
                    }
                }
            };
            
            this.audioWorker.addEventListener('message', handler);
            this.audioWorker.postMessage({ audioBlob, task });
        });
    }

    initElements() {
        // Buttons
        this.micButton = document.getElementById('micButton');
        this.stopButton = document.getElementById('stopRecording');
        this.sendButton = document.getElementById('sendAudio');
        this.clearHistoryButton = document.getElementById('clearHistory');
        this.calendarConnectBtn = document.getElementById('calendar-connect-btn');
        
        // Voice Selector
        this.voiceSelect = document.getElementById('voiceSelect');

        // Status
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.recordingTimer = document.getElementById('recordingTimer');

        // Sections
        this.userAudioPlayback = document.getElementById('userAudioPlayback');
        this.userAudio = document.getElementById('userAudio');
        this.transcriptionSection = document.getElementById('transcriptionSection');
        this.transcriptionText = document.getElementById('transcriptionText');
        this.responseSection = document.getElementById('responseSection');
        this.responseText = document.getElementById('responseText');
        this.audioWaveformContainer = document.getElementById('audioWaveformContainer');
        this.audioWaveform = document.getElementById('audioWaveform');
        this.waveformCanvas = document.getElementById('waveformCanvas');
        this.waveformStatus = document.getElementById('waveformStatus');
        this.geminiAudio = document.getElementById('geminiAudio');
        this.historyList = document.getElementById('historyList');
        
        // Waveform setup
        this.waveformContext = null;
        this.waveformAnalyser = null;
        this.waveformAnimationId = null;
        this.waveformMode = 'circular'; // Always circular
        this.waveformState = 'idle'; // 'idle' or 'playing'
    }

    attachEventListeners() {
        this.micButton.addEventListener('click', () => this.toggleRecording());
        this.stopButton.addEventListener('click', () => this.stopRecording());
        this.sendButton.addEventListener('click', () => this.sendToGemini());
        this.clearHistoryButton.addEventListener('click', () => this.clearHistory());
        
        // Calendar connect button
        if (this.calendarConnectBtn) {
            this.calendarConnectBtn.addEventListener('click', () => this.connectCalendar());
        }
        
        // Check calendar connection status
        this.checkCalendarConnection();
    }
    
    async checkCalendarConnection() {
        try {
            console.log('📅 Checking calendar connection status...');
            const startTime = Date.now();
            const response = await window.firebaseAuth.makeAuthenticatedRequest('/api/calendar-status');
            const data = await response.json();
            const duration = Date.now() - startTime;
            
            const calendarConnectBtn = document.getElementById('calendar-connect-btn');
            const calendarStatus = document.getElementById('calendar-status');
            
            if (data.connected) {
                calendarConnectBtn.style.display = 'none';
                calendarStatus.style.display = 'inline';
                console.log(`✅ Calendar already connected (checked in ${duration}ms)`);
                console.log('   📧 Calendar account:', data.email || 'Unknown');
            } else {
                calendarConnectBtn.style.display = 'inline';
                calendarStatus.style.display = 'none';
                console.log(`⚠️ Calendar not connected (checked in ${duration}ms)`);
                console.log('   💡 Tip: Click "Connect Calendar" to enable calendar features');
            }
        } catch (error) {
            console.error('❌ Error checking calendar status:', error.message);
            console.error('   📍 Error code:', error.code || 'Unknown');
            // Show connect button by default if check fails
            const calendarConnectBtn = document.getElementById('calendar-connect-btn');
            if (calendarConnectBtn) {
                calendarConnectBtn.style.display = 'inline';
            }
        }
    }
    
    async loadVoices() {
        try {
            if (this.voicesLoaded) {
                console.log('✅ Voices already loaded, skipping');
                return;
            }
            
            console.log('🎙️ Loading available voices...');
            
            // Check localStorage cache first
            const VOICES_CACHE_KEY = 'clixen_voices_cache';
            const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            const cachedData = localStorage.getItem(VOICES_CACHE_KEY);
            if (cachedData) {
                try {
                    const { voices, timestamp } = JSON.parse(cachedData);
                    const age = Date.now() - timestamp;
                    
                    // Check if cache has Studio voices (invalidate old cache without them)
                    const hasStudioVoices = voices && voices.some(v => v.name && v.name.includes('Studio'));
                    
                    if (age < CACHE_DURATION && voices && voices.length > 0 && hasStudioVoices) {
                        console.log(`✅ Using cached voices (${Math.floor(age / 1000 / 60 / 60)}h old)`);
                        this.populateVoiceSelector(voices);
                        this.voicesLoaded = true;
                        return;
                    } else if (!hasStudioVoices) {
                        console.log('🔄 Cache outdated (missing Studio voices), fetching fresh...');
                    } else {
                        console.log('⏰ Cache expired, fetching fresh voices...');
                    }
                } catch (e) {
                    console.warn('⚠️ Invalid cache data, fetching fresh voices...');
                }
            }
            
            // Check if auth is ready
            if (!window.firebaseAuth || !window.firebaseAuth.getCurrentUser()) {
                console.warn('⚠️ Auth not ready yet, retrying in 500ms...');
                setTimeout(() => this.loadVoices(), 500);
                return;
            }
            
            const response = await window.firebaseAuth.makeAuthenticatedRequest('/api/voices');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache the voices in localStorage
            localStorage.setItem(VOICES_CACHE_KEY, JSON.stringify({
                voices: data.voices,
                timestamp: Date.now()
            }));
            console.log('💾 Voices cached to localStorage (7 day TTL)');
            
            // Populate voice dropdown
            this.populateVoiceSelector(data.voices);
            this.voicesLoaded = true;
            console.log(`✅ Loaded ${data.voices.length} voices`);
            
            // Log available Studio voices
            const studioVoices = data.voices.filter(v => v.name.includes('Studio'));
            if (studioVoices.length > 0) {
                console.log(`   ⭐ Studio voices available: ${studioVoices.map(v => v.label).join(', ')}`);
            }
        } catch (error) {
            console.error('Error loading voices:', error);
            // Fallback option
            this.voiceSelect.innerHTML = '<option value="">Default Voice</option>';
        }
    }
    
    /**
     * Populate voice selector dropdown with voice options
     */
    populateVoiceSelector(voices) {
        this.voiceSelect.innerHTML = '';
        voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = JSON.stringify({
                name: voice.name,
                ssmlGender: voice.gender
            });
            option.textContent = voice.label;
            
            // Set default voice (Studio-O = Premium Female)
            if (voice.name === 'en-US-Studio-O') {
                option.selected = true;
                console.log(`   🎙️ Default voice selected: ${voice.label} (${voice.name})`);
            }
            
            this.voiceSelect.appendChild(option);
        });
        
        // Add change listener to log voice selection
        this.voiceSelect.addEventListener('change', (e) => {
            const voiceConfig = JSON.parse(e.target.value);
            const selectedOption = e.target.options[e.target.selectedIndex];
            console.log(`🎵 Voice changed to: ${selectedOption.text} (${voiceConfig.name})`);
        });
    }
    
    connectCalendar() {
        // Redirect to Google Calendar OAuth flow
        window.location.href = '/auth';
    }

    async prewarmMicrophone() {
        try {
            this.isPrewarming = true;
            console.log('🔥 Pre-warming microphone...');
            
            // Clear any existing timeout
            if (this.warmStreamTimeout) {
                clearTimeout(this.warmStreamTimeout);
                this.warmStreamTimeout = null;
            }
            
            // PERFORMANCE: Release old stream if exists to prevent memory leaks
            if (this.warmStream) {
                this.warmStream.getTracks().forEach(track => {
                    track.stop();
                    // Remove event listeners to prevent memory leaks
                    track.onended = null;
                });
                this.warmStream = null;
            }
            
            this.warmStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,  // Lower sample rate for faster processing (3x faster than 48kHz)
                    channelCount: 1      // Mono audio (50% bandwidth of stereo)
                }
            });
            
            console.log('✅ Microphone pre-warmed and ready for instant recording!');
            console.log('   Optimized: 16kHz mono for faster transcription');
            console.log(`   ⏰ Will auto-release after ${this.WARM_STREAM_DURATION / 60000} minutes of inactivity`);
            
            // Optional: Show subtle indicator that mic is ready
            if (this.statusText && this.statusText.textContent === 'Ready') {
                this.statusText.textContent = 'Ready (Mic Hot 🔥)';
            }
            
            // Set timeout to release stream after 5 minutes
            this.warmStreamTimeout = setTimeout(() => {
                if (this.warmStream && !this.isRecording) {
                    console.log('⏰ 5 minutes elapsed, releasing hot microphone to save resources');
                    this.warmStream.getTracks().forEach(track => track.stop());
                    this.warmStream = null;
                    this.warmStreamTimeout = null;
                    
                    // Update status text
                    if (this.statusText && this.statusText.textContent === 'Ready (Mic Hot 🔥)') {
                        this.statusText.textContent = 'Ready';
                    }
                }
            }, this.WARM_STREAM_DURATION);
            
        } catch (err) {
            console.log('⚠️  Could not pre-warm microphone:', err.message);
            console.log('   Will request mic access on first recording instead');
            this.warmStream = null;
        } finally {
            this.isPrewarming = false;
        }
    }

    async toggleRecording() {
        // Debounce rapid clicks
        if (!this.debounce('toggleRecording', 300)) {
            return;
        }
        
        // Prevent recording if already processing
        if (this.micButton.disabled) {
            console.log('⚠️  Cannot record: Operation already in progress');
            return;
        }
        
        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            const setupStartTime = performance.now();
            console.log('🎬 Starting recording...');
            
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
                        sampleRate: 16000,  // Optimized for faster processing
                        channelCount: 1      // Mono audio
                    }
                });
                const micRequestTime = performance.now() - micRequestStart;
                console.log(`   ⏱️  Mic access granted in ${micRequestTime.toFixed(0)}ms`);
            }
            
            const setupTime = performance.now() - setupStartTime;
            console.log(`✅ Recording setup complete in ${setupTime.toFixed(0)}ms`);
            
            // REAL-TIME STREAMING: Send chunks as they're recorded
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 16000 // Lower bitrate for real-time streaming
            });
            this.audioChunks = [];
            this.streamingChunks = []; // Separate array for streaming
            this.isStreamingToGemini = false;

            // Start streaming to Gemini as soon as recording starts
            this.startStreamingToGemini();

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    
                    // REAL-TIME: Send chunk immediately to Gemini
                    if (this.isStreamingToGemini) {
                        this.streamingChunks.push(event.data);
                        this.sendAudioChunkToGemini(event.data);
                        console.log(`📤 Streaming chunk ${this.streamingChunks.length} (${event.data.size} bytes) to Gemini`);
                    }
                }
            };

            this.mediaRecorder.onstop = async () => {
                const recordingEndTime = performance.now();
                const recordingDuration = (recordingEndTime - this.recordingStartTime) / 1000;
                
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
                const audioUrl = URL.createObjectURL(audioBlob);
                this.userAudio.src = audioUrl;
                this.userAudioPlayback.style.display = 'block';
                
                const originalSize = audioBlob.size;
                const sizeKB = (originalSize / 1024).toFixed(2);
                const compressionRatio = (originalSize / (recordingDuration * 16000 * 2)).toFixed(2);
                
                console.log(`📦 Audio recorded: ${originalSize} bytes (${sizeKB} KB) - Opus format`);
                console.log(`   ⏱️  Recording duration: ${recordingDuration.toFixed(2)}s`);
                console.log(`   📊 Compression: ${(compressionRatio * 100).toFixed(0)}% of raw PCM`);
                console.log(`   🎵 Estimated bitrate: ${((originalSize * 8) / recordingDuration / 1000).toFixed(1)} kbps`);
                
                this.recordedBlob = audioBlob;
                
                // ✅ Always send audio after recording (batch mode)
                console.log('🚀 Sending audio to server for processing...');
                await this.finalizeStreamingToGemini();
                
                // ✅ Clean up MediaRecorder after processing
                if (this.mediaRecorder) {
                    // Stop all tracks
                    this.mediaRecorder.stream.getTracks().forEach(track => {
                        track.stop();
                        track.onended = null;
                    });
                    
                    // Clean up event handlers
                    this.mediaRecorder.ondataavailable = null;
                    this.mediaRecorder.onstop = null;
                    this.mediaRecorder.onerror = null;
                }
            };

            // Request data every 250ms for real-time streaming
            this.mediaRecorder.start(250); // Collect chunks every 250ms
            this.isRecording = true;
            
            // Setup VAD (Voice Activity Detection) for auto-stop
            this.setupVAD(stream);
            
            // UI Updates
            this.micButton.classList.add('recording');
            this.stopButton.disabled = false;
            this.statusIndicator.classList.add('recording');
            this.statusText.textContent = 'Recording & Streaming...';
            
            // Start timer
            this.recordingStartTime = Date.now();
            this.updateTimer();
            this.timerInterval = setInterval(() => this.updateTimer(), 100);
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.isRecording = false;
            
            // Stop VAD
            this.stopVAD();
            
            // UI Updates
            this.micButton.classList.remove('recording');
            this.stopButton.disabled = true;
            this.statusIndicator.classList.remove('recording');
            this.statusText.textContent = 'Processing...';
            
            // Clear timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            // Reset timer start time to prevent updates
            this.recordingStartTime = null;
            
            // ✅ Stop recording LAST - let onstop handler fire first before cleanup
            // The onstop handler will call finalizeStreamingToGemini() and then clean up
            this.mediaRecorder.stop();
            
            // Pre-warm mic again for next recording
            setTimeout(() => this.prewarmMicrophone(), 1000);
        }
    }

    /**
     * Start streaming audio to Gemini in real-time
     * Sends audio chunks as they're recorded for lower latency
     */
    async startStreamingToGemini() {
        // NOTE: Real-time chunk streaming is disabled - we'll use batch mode at the end
        // The server's real-time handlers (start_audio_stream, audio_chunk, end_audio_stream) 
        // are not properly connected in the WebSocket message router.
        // Instead, we collect chunks and send the complete audio via 'audio_stream' when done.
        
        console.log('🌊 Starting audio recording (will send to Gemini when complete)...');
        this.isStreamingToGemini = false; // Disable real-time streaming
        this.streamingRequestId = Date.now();
        this.streamingAudioChunks = [];
        
        // Don't show UI or call server yet - wait until recording is complete
    }

    /**
     * Send audio chunk to Gemini immediately (real-time streaming)
     */
    async sendAudioChunkToGemini(audioChunk) {
        // Just store chunks for batch processing at the end
        if (!this.streamingAudioChunks) {
            this.streamingAudioChunks = [];
        }
        this.streamingAudioChunks.push(audioChunk);
        
        console.log(`   📦 Collected chunk ${this.streamingAudioChunks.length} (${audioChunk.size} bytes)`);
    }

    /**
     * Finalize streaming session - send complete audio to Gemini via batch mode
     */
    async finalizeStreamingToGemini() {
        if (!this.wsClient || !this.wsInitialized) {
            console.log('⚠️  WebSocket not available, skipping batch send');
            return;
        }

        // Use the complete audio blob (all chunks combined)
        const completeAudioBlob = this.recordedBlob || new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
        
        if (!completeAudioBlob || completeAudioBlob.size === 0) {
            console.log('⚠️  No audio to send');
            return;
        }

        console.log('🏁 Sending complete audio to Gemini via WebSocket batch mode...');
        console.log(`   � Audio size: ${completeAudioBlob.size} bytes (${(completeAudioBlob.size / 1024).toFixed(2)} KB)`);
        
        try {
            // Show UI
            this.statusIndicator.classList.add('processing');
            this.transcriptionSection.style.display = 'block';
            this.transcriptionText.classList.add('loading');
            this.transcriptionText.textContent = 'Transcribing...';
            this.responseSection.style.display = 'block';
            this.responseText.classList.add('loading');
            this.responseText.textContent = 'Gemini is thinking...';
            
            // Get voice configuration
            const voiceConfig = this.voiceSelect.value ? JSON.parse(this.voiceSelect.value) : {};
            const selectedOption = this.voiceSelect.options[this.voiceSelect.selectedIndex];
            
            // Log which voice is being used
            if (voiceConfig.name) {
                const isStudio = voiceConfig.name.includes('Studio');
                console.log(`   🎤 Using voice: ${selectedOption?.text || 'Default'} (${voiceConfig.name})`);
                if (isStudio) {
                    console.log(`   ⭐ Studio voice selected - Premium quality!`);
                }
            } else {
                console.log(`   🎤 Using backend default voice (en-US-Studio-O - Premium Female) ⭐`);
            }
            
            // ✅ DON'T send conversation history - backend maintains context via Firestore
            // Each command is a NEW ACTION to perform, context is maintained server-side
            
            // Use the WebSocketClient's sendAudioStream method (batch mode)
            const result = await this.wsClient.sendAudioStream(completeAudioBlob, voiceConfig);
            
            console.log('✅ Audio sent to server successfully');
            console.log(`   📝 Transcription: ${result.transcription}`);
            console.log(`   🤖 Response: ${result.response.substring(0, 100)}...`);
            
            // Update UI (already updated by event handlers, but ensure loading states are removed)
            this.transcriptionText.classList.remove('loading');
            this.responseText.classList.remove('loading');
            
            // Add to history
            this.addToHistory('user', result.transcription);
            this.addToHistory('assistant', result.response);
            
            // ⚠️ DON'T re-enable buttons here - wait for audio_queue_finished event
            // Buttons will be re-enabled when audio finishes playing
            
        } catch (error) {
            console.error('❌ Failed to send audio:', error.message);
            console.error('   📍 Error type:', error.name);
            console.error('   📍 Stack trace:', error.stack?.split('\n')[0]);
            
            // Provide detailed error context
            if (error.message.includes('timeout')) {
                console.error('   💡 Tip: Server is slow - try again or check network');
            } else if (error.message.includes('WebSocket')) {
                console.error('   💡 Tip: WebSocket connection lost - reconnecting...');
            } else if (error.message.includes('auth')) {
                console.error('   💡 Tip: Authentication expired - refresh page');
            }
            
            // Clear processing status on error
            this.statusIndicator.classList.remove('processing');
            this.statusText.textContent = 'Error';
            this.responseText.classList.remove('loading');
            this.responseText.textContent = `Error: ${error.message}`;
            
            // Re-enable buttons
            this.sendButton.disabled = false;
            this.micButton.disabled = false;
        }
    }

    /**
     * Convert blob to base64
     */
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    updateTimer() {
        if (this.recordingStartTime) {
            const elapsed = Date.now() - this.recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const displaySeconds = seconds % 60;
            this.recordingTimer.textContent = 
                `${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
        }
    }

    setupVAD(stream) {
        try {
            console.log('🎤 Setting up VAD...');
            
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
            
            console.log(`🎤 VAD enabled: Auto-stop after ${this.SILENCE_THRESHOLD / 1000}s of silence AFTER speech`);
            console.log(`   Audio threshold: ${this.AUDIO_THRESHOLD} dB`);
            console.log(`   Detection interval: every 100ms`);
        } catch (error) {
            console.error('⚠️  Could not setup VAD:', error);
        }
    }

    detectSilence() {
        if (!this.analyser || !this.isRecording) return;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        // PERFORMANCE: Calculate RMS (more accurate than simple average)
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
        }
        
        // Check if sound is detected
        if (db > this.AUDIO_THRESHOLD) {
            // Sound detected!
            
            // If this is the first time we detect speech, mark it
            if (!this.hasSpeechDetected) {
                this.hasSpeechDetected = true;
                console.log(`🗣️  SPEECH DETECTED! Starting silence timer now (${db.toFixed(1)} dB)`);
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
                console.log(`✋ ${this.SILENCE_THRESHOLD / 1000}s of silence detected - auto-stopping recording`);
                this.stopRecording();
            }
        }
    }

    stopVAD() {
        console.log('🛑 Stopping VAD...');
        
        // Clear silence detection interval
        if (this.silenceDetectionInterval) {
            clearInterval(this.silenceDetectionInterval);
            this.silenceDetectionInterval = null;
            console.log('   ✅ Cleared silence detection interval');
        }
        
        // PERFORMANCE: Disconnect and clean up analyser
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
        console.log('   ✅ VAD cleanup complete');
    }

    async sendToGemini() {
        console.log('🎯 sendToGemini() called');
        console.log('   recordedBlob:', this.recordedBlob ? `${this.recordedBlob.size} bytes` : 'NULL/UNDEFINED');
        
        // Debounce rapid clicks
        if (!this.debounce('sendToGemini', 500)) {
            console.warn('⚠️  Debounced: Please wait before sending another request');
            return;
        }
        
        // Use the recorded blob directly
        const audioToSend = this.recordedBlob;
        
        if (!audioToSend) {
            console.error('❌ No audio recorded - this.recordedBlob is:', this.recordedBlob);
            alert('No audio recorded');
            return;
        }

        try {
            const totalStartTime = performance.now();
            console.log('\n' + '='.repeat(80));
            console.log('🚀 SENDING TO GEMINI');
            console.log('='.repeat(80));
            console.log(`📊 Audio size: ${audioToSend.size} bytes (${(audioToSend.size / 1024).toFixed(2)} KB)`);
            console.log(`🎵 Format: ${audioToSend.type}`);
            
            // Check if WebSocket is available (primary mode)
            const usingWebSocket = this.wsInitialized;
            console.log(`📡 Connection mode: ${usingWebSocket ? 'WebSocket ⚡ (primary)' : 'HTTP (fallback)'}`);
            
            // Update UI
            this.statusIndicator.classList.add('processing');
            this.statusText.textContent = 'Sending to Gemini...';
            this.sendButton.disabled = true;
            this.micButton.disabled = true;  // Disable recording while processing
            
            // Show sections
            this.transcriptionSection.style.display = 'block';
            this.transcriptionText.classList.add('loading');
            this.transcriptionText.textContent = 'Transcribing';
            
            this.responseSection.style.display = 'block';
            this.responseText.classList.add('loading');
            this.responseText.textContent = 'Gemini is thinking';
            
            // Get voice configuration
            const voiceConfig = this.voiceSelect.value ? JSON.parse(this.voiceSelect.value) : {};
            
            if (usingWebSocket) {
                // ========== WebSocket Mode (Primary - Real-time streaming) ==========
                console.log('⚡ Using WebSocket for real-time streaming...');
                
                const result = await this.wsClient.sendAudioStream(audioToSend, voiceConfig);
                
                // Update UI
                this.transcriptionText.classList.remove('loading');
                this.responseText.classList.remove('loading');
                
                // Add to history
                this.addToHistory('user', result.transcription);
                this.addToHistory('assistant', result.response);
                
                const totalTime = performance.now() - totalStartTime;
                console.log('\n' + '='.repeat(80));
                console.log(`⏱️  TOTAL TIME (WebSocket): ${totalTime.toFixed(0)}ms (${(totalTime / 1000).toFixed(2)}s)`);
                console.log(`   ⚡ Benefits: Real-time audio streaming, lower latency, no HTTP overhead`);
                console.log('='.repeat(80) + '\n');
                
                // Don't remove processing status yet - audio is still playing
                // Status will be updated when audio queue finishes
                this.sendButton.disabled = false;
                this.micButton.disabled = false;
                
            } else {
                // ========== HTTP Mode (Fallback) ==========
                console.log('📡 Using HTTP fallback mode...');

            // Prepare form data
            const formDataStartTime = performance.now();
            const formData = new FormData();
            formData.append('audio', audioToSend, 'recording.webm');
            
            // Add voice configuration
            formData.append('voiceConfig', JSON.stringify(voiceConfig));
            console.log(`🎙️ Selected voice:`, voiceConfig);
            
            const formDataTime = performance.now() - formDataStartTime;
            console.log(`📦 FormData prepared in ${formDataTime.toFixed(1)}ms`);

            // Send to backend with authentication
            const uploadStartTime = performance.now();
            console.log(`⬆️  Uploading to server...`);
            
            const response = await window.firebaseAuth.makeAuthenticatedRequest('/api/process-audio', {
                method: 'POST',
                body: formData
            });

            const uploadTime = performance.now() - uploadStartTime;
            const uploadSpeed = (this.recordedBlob.size / 1024) / (uploadTime / 1000); // KB/s
            console.log(`✅ Upload complete in ${uploadTime.toFixed(0)}ms`);
            console.log(`   📈 Upload speed: ${uploadSpeed.toFixed(1)} KB/s`);

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const parseStartTime = performance.now();
            const result = await response.json();
            const parseTime = performance.now() - parseStartTime;
            console.log(`📝 Response parsed in ${parseTime.toFixed(1)}ms`);

            // Update transcription
            this.transcriptionText.classList.remove('loading');
            this.transcriptionText.textContent = result.transcription;
            console.log(`📄 Transcription: "${result.transcription.substring(0, 100)}${result.transcription.length > 100 ? '...' : ''}"`);

            // Add to history
            this.addToHistory('user', result.transcription);

            // Show response
            this.responseText.classList.add('loading');
            this.responseText.textContent = 'Gemini is thinking';

            // Stream response would go here, for now just show the response
            setTimeout(() => {
                this.responseText.classList.remove('loading');
                this.responseText.textContent = result.response;
                console.log(`🤖 Gemini response: "${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}"`);
                console.log(`   Length: ${result.response.length} characters`);
                
                // Add to history
                this.addToHistory('assistant', result.response);

                // Show audio if available
                if (result.audioUrl) {
                    const audioLoadStart = performance.now();
                    console.log('🔊 Audio URL received:', result.audioUrl);
                    
                    // Show waveform visualization
                    this.audioWaveformContainer.style.display = 'block';
                    
                    // Setup canvas
                    this.setupWaveformCanvas();
                    
                    // Set to idle state initially
                    this.setWaveformState('idle');
                    
                    // Add timestamp to avoid caching and ensure fresh audio
                    const audioUrlWithTimestamp = `${result.audioUrl}?t=${Date.now()}`;
                    console.log('📡 Loading audio from:', audioUrlWithTimestamp);
                    this.geminiAudio.src = audioUrlWithTimestamp;
                    this.currentAudioUrl = audioUrlWithTimestamp;
                    
                    // Add load event listener and autoplay
                    this.geminiAudio.addEventListener('loadeddata', () => {
                        const audioLoadTime = performance.now() - audioLoadStart;
                        console.log(`✅ Audio loaded successfully in ${audioLoadTime.toFixed(0)}ms`);
                        console.log(`   Duration: ${this.geminiAudio.duration.toFixed(2)} seconds`);
                        console.log('   🎵 Auto-playing audio...');
                        
                        // Setup waveform analyzer and start visualization
                        this.setupWaveformAnalyzer();
                        
                        // Autoplay the audio response with aggressive retry
                        const attemptPlay = () => {
                            this.geminiAudio.play().then(() => {
                                console.log('✅ Audio playing with animated waveform');
                                this.setWaveformState('playing');
                            }).catch(error => {
                                console.warn('⚠️  Autoplay attempt failed:', error.message);
                                
                                // If autoplay is blocked, try again on next user interaction
                                const playOnInteraction = () => {
                                    console.log('🔓 User interacted, attempting autoplay...');
                                    this.geminiAudio.play().then(() => {
                                        console.log('✅ Audio started playing after user interaction');
                                        this.setWaveformState('playing');
                                        // Remove listener after successful play
                                        document.removeEventListener('click', playOnInteraction);
                                        document.removeEventListener('keydown', playOnInteraction);
                                    }).catch(e => {
                                        console.error('❌ Still cannot play audio:', e.message);
                                    });
                                };
                                
                                console.log('💡 Waiting for user interaction to play audio...');
                                document.addEventListener('click', playOnInteraction, { once: true });
                                document.addEventListener('keydown', playOnInteraction, { once: true });
                            });
                        };
                        
                        attemptPlay();
                    }, { once: true });
                    
                    // Handle play event
                    this.geminiAudio.addEventListener('play', () => {
                        console.log('▶️  Audio started playing');
                        this.setWaveformState('playing');
                    });
                    
                    // Handle pause event
                    this.geminiAudio.addEventListener('pause', () => {
                        console.log('⏸️  Audio paused');
                        this.setWaveformState('idle');
                    });
                    
                    // Add error handler with detailed logging
                    this.geminiAudio.addEventListener('error', (e) => {
                        console.error('❌ Audio loading error!');
                        console.error('   Event:', e);
                        console.error('   Audio element:', this.geminiAudio);
                        console.error('   Error code:', this.geminiAudio.error?.code);
                        console.error('   Error message:', this.geminiAudio.error?.message);
                        console.error('   Network state:', this.geminiAudio.networkState);
                        console.error('   Ready state:', this.geminiAudio.readyState);
                        console.error('   Source URL:', this.geminiAudio.src);
                        
                        // Try to fetch the audio file directly to debug
                        fetch(audioUrlWithTimestamp)
                            .then(res => {
                                console.log('   Fetch test - Status:', res.status, res.statusText);
                                console.log('   Content-Type:', res.headers.get('Content-Type'));
                                return res.blob();
                            })
                            .then(blob => {
                                console.log('   Fetch test - Blob size:', blob.size, 'bytes');
                                console.log('   Fetch test - Blob type:', blob.type);
                            })
                            .catch(fetchError => {
                                console.error('   Fetch test failed:', fetchError);
                            });
                    }, { once: true });
                    
                    // Stop waveform when audio ends
                    this.geminiAudio.addEventListener('ended', () => {
                        console.log('🎵 Audio playback finished');
                        this.setWaveformState('idle');
                        this.stopWaveformVisualization();
                    }, { once: true });
                } else {
                    console.warn('⚠️  No audio URL in response');
                }

                const totalTime = performance.now() - totalStartTime;
                console.log('\n' + '='.repeat(80));
                console.log(`⏱️  TOTAL PIPELINE TIME: ${totalTime.toFixed(0)}ms (${(totalTime / 1000).toFixed(2)}s)`);
                console.log('='.repeat(80) + '\n');

                this.statusIndicator.classList.remove('processing');
                this.statusText.textContent = 'Complete!';
                this.sendButton.disabled = false;
                this.micButton.disabled = false;  // Re-enable recording
            }, 1000);
            }

        } catch (error) {
            console.error('Error sending to Gemini:', error);
            alert(`Error: ${error.message}`);
            
            this.transcriptionText.classList.remove('loading');
            this.responseText.classList.remove('loading');
            this.statusIndicator.classList.remove('processing');
            this.statusText.textContent = 'Error occurred';
            this.sendButton.disabled = false;
            this.micButton.disabled = false;  // Re-enable recording on error
        }
    }

    playGeminiAudio() {
        if (this.geminiAudio.src && this.geminiAudio.src !== window.location.href) {
            this.geminiAudio.play().catch(error => {
                console.warn('Could not play audio:', error.message);
            });
        } else {
            console.log('No audio available to play yet');
        }
    }

    downloadGeminiAudio() {
        if (this.currentAudioUrl) {
            const a = document.createElement('a');
            a.href = this.currentAudioUrl;
            a.download = 'gemini-response.wav';
            a.click();
        }
    }
    
    setupWaveformCanvas() {
        if (!this.waveformCanvas) return;
        
        // Set canvas size for circular waveform
        const dpr = window.devicePixelRatio || 1;
        
        this.waveformCanvas.width = 250 * dpr;
        this.waveformCanvas.height = 250 * dpr;
        this.waveformCanvas.style.width = '250px';
        this.waveformCanvas.style.height = '250px';
        
        this.waveformContext = this.waveformCanvas.getContext('2d');
        this.waveformContext.scale(dpr, dpr);
        
        console.log(`✅ Waveform canvas initialized in circular mode`);
        
        // Draw idle state
        this.drawIdleWaveform();
    }
    
    setWaveformState(state) {
        this.waveformState = state;
        
        if (state === 'playing') {
            this.audioWaveform.classList.add('playing');
            this.waveformStatus.classList.add('hidden');
            
            const statusText = this.waveformStatus.querySelector('.status-text');
            const statusIcon = this.waveformStatus.querySelector('.status-icon');
            statusText.textContent = 'Playing';
            statusIcon.textContent = '🔊';
        } else {
            this.audioWaveform.classList.remove('playing');
            this.waveformStatus.classList.remove('hidden');
            
            const statusText = this.waveformStatus.querySelector('.status-text');
            const statusIcon = this.waveformStatus.querySelector('.status-icon');
            statusText.textContent = 'Ready';
            statusIcon.textContent = '🎵';
            
            // Draw idle state
            this.drawIdleWaveform();
        }
        
        console.log(`🎛️  Waveform state: ${state}`);
    }
    
    drawIdleWaveform() {
        if (!this.waveformContext) return;
        
        const canvas = this.waveformCanvas;
        const ctx = this.waveformContext;
        const dpr = window.devicePixelRatio || 1;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        
        // Create gradient for circular waveform
        const gradient = ctx.createRadialGradient(125, 125, 30, 125, 125, 100);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
        gradient.addColorStop(0.5, 'rgba(118, 75, 162, 0.3)');
        gradient.addColorStop(1, 'rgba(102, 126, 234, 0.3)');
        
        // Draw idle circular waveform
        const centerX = 125;
        const centerY = 125;
        const bars = 60;
        const radius = 80;
        
        for (let i = 0; i < bars; i++) {
            const angle = (Math.PI * 2 * i) / bars;
            const barHeight = 15 + Math.sin(i * 0.5) * 5; // Subtle wave
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
    
    setupWaveformAnalyzer() {
        try {
            // Only create audio context and source once to avoid "already connected" error
            if (!this.waveformAudioContext) {
                // Create audio context for waveform visualization
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.waveformAudioContext = new AudioContext();
                
                // Create analyser
                this.waveformAnalyser = this.waveformAudioContext.createAnalyser();
                this.waveformAnalyser.fftSize = 256;
                this.waveformAnalyser.smoothingTimeConstant = 0.8;
                
                // Connect audio element to analyser (can only be done once per element)
                const source = this.waveformAudioContext.createMediaElementSource(this.geminiAudio);
                source.connect(this.waveformAnalyser);
                this.waveformAnalyser.connect(this.waveformAudioContext.destination);
                
                console.log('✅ Waveform analyzer connected (first time)');
            } else {
                // Resume audio context if it was suspended
                if (this.waveformAudioContext.state === 'suspended') {
                    this.waveformAudioContext.resume();
                    console.log('✅ Waveform audio context resumed');
                }
            }
            
            // Start animation
            this.animateWaveform();
            
        } catch (error) {
            console.error('❌ Could not setup waveform analyzer:', error);
            console.error('   This is usually because the audio element is already connected.');
            console.error('   Error details:', error.message);
        }
    }
    
    animateWaveform() {
        if (!this.waveformAnalyser || !this.waveformContext) return;
        
        const canvas = this.waveformCanvas;
        const ctx = this.waveformContext;
        const analyser = this.waveformAnalyser;
        const dpr = window.devicePixelRatio || 1;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            if (this.waveformState !== 'playing') {
                return; // Stop if not playing
            }
            
            this.waveformAnimationId = requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            
            this.drawCircularWaveform(ctx, dataArray, bufferLength);
        };
        
        draw();
    }
    
    drawCircularWaveform(ctx, dataArray, bufferLength) {
        const centerX = 125;
        const centerY = 125;
        const bars = 60;
        const radius = 70;
        const maxBarHeight = 60;
        
        // Create gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, radius, centerX, centerY, radius + maxBarHeight);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#f093fb');
        
        // Draw center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
        ctx.fill();
        
        // Draw bars
        for (let i = 0; i < bars; i++) {
            const dataIndex = Math.floor((i / bars) * bufferLength);
            const amplitude = dataArray[dataIndex] / 255;
            const barHeight = amplitude * maxBarHeight;
            
            const angle = (Math.PI * 2 * i) / bars - Math.PI / 2;
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
    
    stopWaveformVisualization() {
        if (this.waveformAnimationId) {
            cancelAnimationFrame(this.waveformAnimationId);
            this.waveformAnimationId = null;
            console.log('🛑 Waveform visualization stopped');
        }
        
        // Return to idle state
        this.setWaveformState('idle');
    }

    addToHistory(role, content) {
        // SECURITY: Validate inputs to prevent XSS
        if (typeof role !== 'string' || !['user', 'assistant'].includes(role)) {
            console.error('❌ Invalid role for history');
            return;
        }
        
        if (typeof content !== 'string' || content.length === 0) {
            console.error('❌ Invalid content for history');
            return;
        }
        
        // SECURITY: Limit content length to prevent storage abuse
        const MAX_CONTENT_LENGTH = 50000; // 50KB
        const sanitizedContent = content.length > MAX_CONTENT_LENGTH 
            ? content.substring(0, MAX_CONTENT_LENGTH) + '... (truncated)'
            : content;
        
        const history = this.getHistory();
        
        // PERFORMANCE: Limit history size to prevent localStorage overflow
        const MAX_HISTORY_ITEMS = 100;
        if (history.length >= MAX_HISTORY_ITEMS) {
            history.shift(); // Remove oldest item
        }
        
        history.push({
            role,
            content: sanitizedContent,
            timestamp: new Date().toISOString()
        });
        
        const storageKey = this.getUserHistoryKey();
        try {
            localStorage.setItem(storageKey, JSON.stringify(history));
        } catch (e) {
            console.error('❌ Failed to save history (storage full?):', e);
            // Clear old history and try again
            history.splice(0, history.length / 2); // Remove half
            try {
                localStorage.setItem(storageKey, JSON.stringify(history));
            } catch (e2) {
                console.error('❌ Still cannot save history');
            }
        }
        
        this.renderHistory();
    }

    getUserHistoryKey() {
        // Get current authenticated user's ID for user-specific history
        const user = window.firebaseAuth?.getCurrentUser();
        if (user && user.uid) {
            return `voiceHistory_${user.uid}`;
        }
        // Fallback to generic key (shouldn't happen if auth is required)
        return 'voiceHistory_anonymous';
    }

    getHistory() {
        const storageKey = this.getUserHistoryKey();
        const stored = localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : [];
    }
    
    /**
     * AI MEMORY: Get last N messages for conversation context
     * @param {number} count - Number of recent messages to retrieve (default: 20)
     * @returns {Array} Array of {role, content} objects
     */
    getConversationContext(count = 20) {
        const history = this.getHistory();
        
        // Get last N messages
        const recentHistory = history.slice(-count);
        
        // Convert to format expected by backend (only role and content)
        const context = recentHistory.map(item => ({
            role: item.role === 'user' ? 'user' : 'model', // Convert 'assistant' to 'model' for Gemini
            parts: [{ text: item.content }]
        }));
        
        console.log(`🧠 Retrieved ${context.length} messages for conversation context`);
        if (context.length > 0) {
            console.log(`   📝 First message: "${context[0].parts[0].text.substring(0, 50)}..."`);
            console.log(`   📝 Last message: "${context[context.length - 1].parts[0].text.substring(0, 50)}..."`);
        }
        
        return context;
    }

    loadHistory() {
        this.renderHistory();
    }

    renderHistory() {
        const history = this.getHistory();
        this.historyList.innerHTML = '';
        
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
            header.textContent = `${item.role === 'user' ? '👤 You' : '🤖 Gemini'} - ${new Date(item.timestamp).toLocaleString()}`;
            
            const content = document.createElement('div');
            content.className = 'history-item-content';
            // SECURITY: Use textContent instead of innerHTML to prevent XSS
            content.textContent = item.content;
            
            div.appendChild(header);
            div.appendChild(content);
            this.historyList.appendChild(div);
        });
    }

    /**
     * Handle streaming response from server (Server-Sent Events)
     */
    async handleStreamingResponse(url, body) {
        console.log('🌊 Starting streaming request...');
        
        this.isStreaming = true;
        this.streamedText = '';
        
        // Show response section immediately
        this.responseSection.style.display = 'block';
        this.responseText.classList.add('loading');
        this.responseText.textContent = '';
        
        try {
            const response = await window.firebaseAuth.makeAuthenticatedRequest(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...body, stream: true })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    console.log('✅ Stream complete');
                    break;
                }
                
                // Decode the chunk
                const chunk = decoder.decode(value, { stream: true });
                
                // Process SSE format (data: {...}\n\n)
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            
                            switch (data.type) {
                                case 'chunk':
                                    // Append text chunk to display
                                    this.streamedText += data.text;
                                    this.responseText.textContent = this.streamedText;
                                    console.log(`📤 Received chunk: "${data.text}"`);
                                    break;
                                    
                                case 'function_call':
                                    console.log(`🔧 Function executing: ${data.functions.join(', ')}`);
                                    // Could show a loading indicator for function execution
                                    break;
                                    
                                case 'done':
                                    console.log(`✅ Streaming done. Total: ${data.fullText.length} chars in ${data.duration}ms`);
                                    this.responseText.classList.remove('loading');
                                    this.isStreaming = false;
                                    
                                    // Add to history
                                    this.addToHistory('assistant', data.fullText);
                                    
                                    return data.fullText;
                                    
                                case 'error':
                                    throw new Error(data.error);
                            }
                        } catch (parseError) {
                            console.warn('Failed to parse SSE data:', line);
                        }
                    }
                }
            }
            
            this.responseText.classList.remove('loading');
            this.isStreaming = false;
            
            return this.streamedText;
            
        } catch (error) {
            console.error('❌ Streaming error:', error);
            this.responseText.classList.remove('loading');
            this.isStreaming = false;
            throw error;
        }
    }

    clearHistory() {
        if (confirm('Clear all conversation history?')) {
            const storageKey = this.getUserHistoryKey();
            localStorage.removeItem(storageKey);
            this.renderHistory();
        }
    }
    
    /**
     * Clear cached voices (for debugging or forcing refresh)
     * Can be called from browser console: voiceAssistant.clearVoicesCache()
     */
    clearVoicesCache() {
        localStorage.removeItem('clixen_voices_cache');
        this.voicesLoaded = false;
        console.log('🗑️ Voices cache cleared. Voices will be fetched on next load.');
    }
}

// Initialize when DOM is ready AND user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    let voiceAssistant = null;
    
    // Wait for auth state before initializing app
    const initApp = () => {
        const user = window.firebaseAuth?.getCurrentUser();
        if (user) {
            console.log('✅ User authenticated, initializing app');
            
            // Initialize voice assistant only once
            if (!voiceAssistant) {
                voiceAssistant = new VoiceAssistant();
            }
            
            // Show main content
            document.querySelector('main').style.display = 'block';
        } else {
            console.log('🔒 User not authenticated, blocking app access');
            
            // Hide main content
            document.querySelector('main').style.display = 'none';
            
            // Show auth required message
            const container = document.querySelector('.container');
            if (container && !document.getElementById('auth-required-msg')) {
                const authMsg = document.createElement('div');
                authMsg.id = 'auth-required-msg';
                authMsg.style.cssText = 'text-align: center; padding: 40px; margin: 20px;';
                authMsg.innerHTML = `
                    <h2>🔒 Authentication Required</h2>
                    <p style="margin: 20px 0; color: #666;">Please sign in to use the voice assistant</p>
                    <button onclick="document.getElementById('sign-in-btn').click()" 
                            style="padding: 12px 24px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
                        Sign In Now
                    </button>
                `;
                const main = document.querySelector('main');
                container.insertBefore(authMsg, main);
            }
        }
    };
    
    // Listen for authentication state changes
    window.addEventListener('user-authenticated', () => {
        console.log('🎉 User authenticated event received');
        initApp();
    });
    
    window.addEventListener('user-signed-out', () => {
        console.log('👋 User signed out event received');
        voiceAssistant = null; // Reset assistant
        
        // Clear the display (don't delete history from storage - user might sign back in)
        if (document.getElementById('historyList')) {
            document.getElementById('historyList').innerHTML = '';
        }
        
        initApp();
    });
    
    // Check if firebase-auth.js has loaded
    if (window.firebaseAuth) {
        initApp();
    } else {
        // Wait for firebase-auth.js to load
        const checkAuth = setInterval(() => {
            if (window.firebaseAuth) {
                clearInterval(checkAuth);
                initApp();
            }
        }, 100);
    }
});
