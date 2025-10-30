class VoiceAssistant {
    constructor() {
        // Recording service
        this.recordingService = new RecordingService();
        
        // VAD service
        this.vadService = new VADService({
            silenceThreshold: 2000, // 2 seconds
            audioThreshold: -40 // -40 dB
        });
        
        // Waveform service (will be initialized after DOM elements are ready)
        this.waveformService = null;
        
        // Audio Worker service
        this.audioWorkerService = new AudioWorkerService();
        this.audioWorkerService.initialize();
        
        // WebSocket service (primary mode, HTTP fallback)
        this.wsService = null;
        this.wsInitialized = false;
        
        // Streaming support
        this.isStreaming = false;
        this.streamedText = '';
        
        // Debouncing for UI actions
        this.isProcessing = false;
        this.lastActionTime = 0;
        this.ACTION_DEBOUNCE_MS = 500; // 500ms debounce
        
        this.initElements();
        this.attachEventListeners();
        this.recordingService.prewarmMicrophone(); // Start pre-warming mic immediately
        
        // Initialize WebSocket (primary mode, HTTP auto-fallback on error)
        this.initializeWebSocket();
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
            
            this.wsService = new WebSocketService();
            
            // Initialize (connects and authenticates if user is logged in)
            this.wsInitialized = await this.wsService.initialize();
            
            if (this.wsInitialized) {
                // Setup event handlers
                this.setupWebSocketHandlers();
                console.log('✅ WebSocket service ready');
            } else {
                console.log('⏳ Waiting for user authentication...');
            }
            
        } catch (error) {
            console.error('❌ WebSocket initialization failed:', error);
            console.log('   Falling back to HTTP mode');
            this.wsInitialized = false;
        }
    }
    
    /**
     * Setup WebSocket event handlers
     */
    setupWebSocketHandlers() {
        console.log('🔧 Setting up WebSocket event handlers...');
        
        const handlers = {
            // Instant acknowledgment (now handled as audio, not UI text)
            instant_ack: (data) => {
                console.log(`⚡ [WS Event] Instant ACK sent as audio: "${data.text}" (intent: ${data.intent || 'generic'})`);
                // No longer showing in UI - audio is played directly
            },
            
            // Transcription updates
            user_transcription: (data) => {
                console.log('📝 [WS Event] Transcription received:', data.text);
                this.transcriptionText.classList.remove('loading');
                this.transcriptionText.style.fontStyle = 'normal';
                this.transcriptionText.style.opacity = '1';
                this.transcriptionText.textContent = data.text;
            },
            
            // Function calls
            user_function_calls: (data) => {
                console.log(`🔧 [WS Event] Functions executing: ${data.functions.join(', ')}`);
            },
            
            // Response text
            user_response_text: (data) => {
                console.log('🤖 [WS Event] Response text received:', data.text.substring(0, 100) + '...');
                this.responseText.classList.remove('loading');
                this.responseText.textContent = data.text;
            },
            
            // Audio chunks (auto-played by WebSocketClient)
            user_audio_chunk: (data) => {
                console.log(`🔊 [WS Event] Audio chunk ${data.chunk + 1}/${data.total} playing`);
                
                // Show waveform on first chunk
                if (data.chunk === 0) {
                    console.log('   📊 Showing waveform visualization');
                    this.audioWaveformContainer.style.display = 'block';
                    this.waveformService.setState('playing');
                }
                
                // Hide waveform on last chunk
                if (data.isLast) {
                    console.log('   ✅ Last audio chunk received');
                    setTimeout(() => {
                        this.waveformService.setState('idle');
                    }, 2000);
                }
            },
            
            // Processing complete (server finished, but audio might still be playing)
            processing_complete: (data) => {
                console.log(`✅ [WS Event] Server processing complete in ${data.duration}ms`);
                console.log('   ⏳ Waiting for audio playback to finish...');
                // Don't clear processing status yet - wait for audio_queue_finished
                // Update text to indicate waiting for playback
                this.statusText.textContent = 'Playing audio...';
            },
            
            // Listen for when audio queue finishes playing
            audio_queue_finished: () => {
                console.log('🎵 [WS Event] All audio finished playing - clearing processing status');
                this.statusIndicator.classList.remove('processing');
                this.statusText.textContent = 'Complete!';
                
                // Re-enable buttons only when truly complete
                this.sendButton.disabled = false;
                this.micButton.disabled = false;
            },
            
            // Error handling
            error: (data) => {
                console.error('❌ [WS Event] Error from server:', data.error);
                this.statusIndicator.classList.remove('processing');
                this.statusText.textContent = 'Error';
                this.transcriptionText.classList.remove('loading');
                this.responseText.classList.remove('loading');
                this.responseText.textContent = `Error: ${data.error}`;
            }
        };
        
        // Register all handlers with the service
        this.wsService.setupHandlers(handlers);
        
        console.log('✅ WebSocket event handlers configured');
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
        
        // Initialize waveform service
        this.waveformService = new WaveformService(
            this.waveformCanvas,
            this.waveformStatus,
            this.audioWaveform
        );
        this.waveformService.initialize();
        
        // Initialize voice config service
        this.voiceConfigService = new VoiceConfigService(this.voiceSelect, {
            onVoiceChange: (voiceConfig, voiceLabel) => {
                // Voice change handled by service
            }
        });
        this.voiceConfigService.loadVoices();
        
        // Initialize history service
        this.historyService = new HistoryService(this.historyList, {
            getUserId: () => window.firebaseAuth?.getCurrentUser()?.uid
        });
        this.historyService.loadHistory();
        
        // Initialize audio playback service
        this.audioPlaybackService = new AudioPlaybackService(this.geminiAudio, {
            waveformService: this.waveformService,
            onEnded: () => {
                console.log('🎵 Audio playback finished');
            }
        });
        
        // Initialize calendar service
        this.calendarService = new CalendarService(
            this.calendarConnectBtn,
            document.getElementById('calendar-status')
        );
    }

    attachEventListeners() {
        this.micButton.addEventListener('click', () => this.toggleRecording());
        this.stopButton.addEventListener('click', () => this.stopRecording());
        this.sendButton.addEventListener('click', () => this.sendToGemini());
        this.clearHistoryButton.addEventListener('click', () => this.historyService.clearHistory());
        
        // Calendar status will be checked after authentication
        // Don't check here to avoid "no token" errors
    }
    
    /**
     * Initialize calendar connection check (called after user is authenticated)
     */
    async initCalendar() {
        try {
            await this.calendarService.checkStatus();
        } catch (error) {
            console.error('Calendar initialization failed:', error);
        }
    }
    

    

    

    
    connectCalendar() {
        // Redirect to Google Calendar OAuth flow
        window.location.href = '/auth';
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
        
        const state = this.recordingService.getState();
        if (state.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            // Start streaming to Gemini as soon as recording starts
            this.startStreamingToGemini();
            
            const stream = await this.recordingService.startRecording({
                onStart: (stream) => {
                    // Setup VAD (Voice Activity Detection) for auto-stop
                    this.vadService.start(stream, {
                        onSilenceDetected: () => {
                            console.log('🎙️ VAD triggered auto-stop');
                            this.stopRecording();
                        },
                        onSpeechDetected: (db) => {
                            console.log(`🗣️ Speech detected at ${db.toFixed(1)} dB`);
                        },
                        onAudioLevel: (db, threshold) => {
                            // Optional: Could update UI with audio level
                        }
                    });
                    
                    // UI Updates
                    this.micButton.classList.add('recording');
                    this.stopButton.disabled = false;
                    this.statusIndicator.classList.add('recording');
                    this.statusText.textContent = 'Recording & Streaming...';
                },
                onChunk: (chunk, chunkNumber) => {
                    // REAL-TIME: Send chunk immediately to Gemini
                    if (this.isStreamingToGemini) {
                        this.sendAudioChunkToGemini(chunk);
                        console.log(`📤 Streaming chunk ${chunkNumber} (${chunk.size} bytes) to Gemini`);
                    }
                },
                onStop: async (audioBlob, duration) => {
                    // Display recorded audio
                    const audioUrl = URL.createObjectURL(audioBlob);
                    this.userAudio.src = audioUrl;
                    this.userAudioPlayback.style.display = 'block';
                    
                    this.recordedBlob = audioBlob;
                    
                    // ✅ Always send audio after recording (batch mode)
                    console.log('🚀 Sending audio to server for processing...');
                    await this.finalizeStreamingToGemini();
                },
                onTimerUpdate: (timeString) => {
                    this.recordingTimer.textContent = timeString;
                }
            });
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }

    async stopRecording() {
        const state = this.recordingService.getState();
        if (!state.isRecording) {
            console.warn('⚠️ Not currently recording');
            return;
        }
        
        // Stop VAD
        this.vadService.stop();
        
        // UI Updates
        this.micButton.classList.remove('recording');
        this.stopButton.disabled = true;
        this.statusIndicator.classList.remove('recording');
        this.statusText.textContent = 'Processing...';
        
        // Stop recording - this will trigger the onStop callback
        await this.recordingService.stopRecording();
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
        if (!this.wsService || !this.wsInitialized) {
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
            
            // Get voice configuration from service
            const voiceConfig = this.voiceConfigService.getSelectedVoice();
            const voiceLabel = this.voiceConfigService.getSelectedVoiceLabel();
            
            // Log which voice is being used
            if (voiceConfig.name) {
                const isStudio = voiceConfig.name.includes('Studio');
                console.log(`   🎤 Using voice: ${voiceLabel} (${voiceConfig.name})`);
                if (isStudio) {
                    console.log(`   ⭐ Studio voice selected - Premium quality!`);
                }
            } else {
                console.log(`   🎤 Using backend default voice (en-US-Studio-O - Premium Female) ⭐`);
            }
            
            // ✅ DON'T send conversation history - backend maintains context via Firestore
            // Each command is a NEW ACTION to perform, context is maintained server-side
            
            // Use the WebSocketService's sendAudioStream method (batch mode)
            const result = await this.wsService.sendAudioStream(completeAudioBlob, voiceConfig);
            
            console.log('✅ Audio sent to server successfully');
            console.log(`   📝 Transcription: ${result.transcription}`);
            console.log(`   🤖 Response: ${result.response.substring(0, 100)}...`);
            
            // Update UI (already updated by event handlers, but ensure loading states are removed)
            this.transcriptionText.classList.remove('loading');
            this.responseText.classList.remove('loading');
            
            // Add to history
            this.historyService.addToHistory('user', result.transcription);
            this.historyService.addToHistory('assistant', result.response);
            
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
            
            // Get voice configuration from service
            const voiceConfig = this.voiceConfigService.getSelectedVoice();
            
            if (usingWebSocket) {
                // ========== WebSocket Mode (Primary - Real-time streaming) ==========
                console.log('⚡ Using WebSocket for real-time streaming...');
                
                const result = await this.wsClient.sendAudioStream(audioToSend, voiceConfig);
                
                // Update UI
                this.transcriptionText.classList.remove('loading');
                this.responseText.classList.remove('loading');
                
                // Add to history
                this.historyService.addToHistory('user', result.transcription);
                this.historyService.addToHistory('assistant', result.response);
                
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
            this.historyService.addToHistory('user', result.transcription);

            // Show response
            this.responseText.classList.add('loading');
            this.responseText.textContent = 'Gemini is thinking';

            // Stream response would go here, for now just show the response
            setTimeout(async () => {
                this.responseText.classList.remove('loading');
                this.responseText.textContent = result.response;
                console.log(`🤖 Gemini response: "${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}"`);
                console.log(`   Length: ${result.response.length} characters`);
                
                // Add to history
                this.historyService.addToHistory('assistant', result.response);

                // Show audio if available
                if (result.audioUrl) {
                    // Show waveform visualization
                    this.audioWaveformContainer.style.display = 'block';
                    
                    // Load and play audio using service
                    await this.audioPlaybackService.loadAndPlay(result.audioUrl);
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
    


    /**
     * AI MEMORY: Get last N messages for conversation context
     * Delegates to HistoryService
     */
    getConversationContext(count = 20) {
        return this.historyService.getConversationContext(count);
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
                                    this.historyService.addToHistory('assistant', data.fullText);
                                    
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
    const initApp = async () => {
        const user = window.firebaseAuth?.getCurrentUser();
        if (user) {
            console.log('✅ User authenticated, initializing app');
            
            // Initialize voice assistant only once
            if (!voiceAssistant) {
                voiceAssistant = new VoiceAssistant();
                
                // Check calendar connection after app is initialized
                await voiceAssistant.initCalendar();
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
