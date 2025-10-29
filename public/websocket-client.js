/**
 * WebSocket Client for Real-Time Audio Streaming
 * Provides low-latency bidirectional communication with the server
 */

class WebSocketClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.authenticated = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.messageHandlers = new Map();
        this.pendingRequests = new Map();
        
        // Audio playback queue for streaming chunks
        this.audioQueue = [];
        this.isPlayingQueue = false;
        this.pendingAckAudio = null;  // Store pending ack audio that can be cancelled
        this.geminiAudioStarted = false;  // Flag to prevent ack from playing
        this.currentAckAudio = null;  // Currently playing ack audio element
    }
    
    /**
     * Connect to WebSocket server
     */
    connect() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
            
            try {
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log('✅ WebSocket connected!');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    
                    // Start heartbeat
                    this.startHeartbeat();
                    
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    reject(error);
                };
                
                this.ws.onclose = (event) => {
                    console.log('🔌 WebSocket disconnected');
                    console.log('   📍 Code:', event.code, '- Reason:', event.reason || 'No reason provided');
                    console.log('   🧹 Clean closure:', event.wasClean);
                    this.connected = false;
                    this.authenticated = false;
                    
                    // PERFORMANCE: Clear audio queue on disconnect to prevent stale audio
                    this.clearAudioQueue();
                    
                    // PERFORMANCE: Stop heartbeat
                    if (this.heartbeatInterval) {
                        clearInterval(this.heartbeatInterval);
                        this.heartbeatInterval = null;
                    }
                    
                    // Attempt reconnection only if not intentionally closed
                    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1); // Exponential backoff
                        console.log(`🔄 Reconnecting in ${delay.toFixed(0)}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                        setTimeout(() => {
                            // Re-authenticate after reconnection
                            this.connect().then(() => {
                                const user = window.firebaseAuth?.getCurrentUser();
                                if (user) {
                                    return user.getIdToken();
                                }
                            }).then(token => {
                                if (token) {
                                    return this.authenticate(token);
                                }
                            }).catch(error => {
                                console.error('❌ Reconnection failed:', error);
                            });
                        }, delay);
                    } else if (event.code !== 1000) {
                        console.log('❌ Max reconnection attempts reached');
                        console.log('   💡 Tip: Refresh the page or check your network connection');
                        this.emit('max_reconnects_reached');
                    }
                };
                
            } catch (error) {
                console.error('❌ Failed to create WebSocket:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Authenticate with Firebase token
     */
    async authenticate(token) {
        if (!this.connected) {
            throw new Error('WebSocket not connected');
        }
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Authentication timeout'));
            }, 5000);
            
            this.once('auth_success', () => {
                clearTimeout(timeout);
                this.authenticated = true;
                console.log('✅ WebSocket authenticated');
                resolve();
            });
            
            this.once('auth_error', (data) => {
                clearTimeout(timeout);
                console.error('❌ Authentication failed:', data.error);
                reject(new Error(data.error));
            });
            
            this.send({
                type: 'auth',
                token: token
            });
        });
    }
    
    /**
     * Send audio stream via WebSocket
     * Note: Conversation history is NOT sent - backend maintains context via Firestore
     * Each command represents a NEW ACTION, not a continuation of context
     */
    async sendAudioStream(audioBlob, voiceConfig = {}) {
        if (!this.authenticated) {
            throw new Error('Not authenticated');
        }
        
        // SECURITY: Validate audio size to prevent DoS
        const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB limit
        if (audioBlob.size > MAX_AUDIO_SIZE) {
            throw new Error(`Audio too large: ${(audioBlob.size / 1024 / 1024).toFixed(2)}MB (max: 10MB)`);
        }
        
        console.log('🎤 Sending audio via WebSocket...');
        console.log(`   Size: ${audioBlob.size} bytes (${(audioBlob.size / 1024).toFixed(2)} KB)`);
        console.log(`   🧠 Context maintained by backend via Firestore`);
        
        // Reset Gemini audio flag for new request
        this.geminiAudioStarted = false;
        
        // Convert blob to base64
        const base64Audio = await this.blobToBase64(audioBlob);
        
        const requestId = Date.now();
        
        return new Promise((resolve, reject) => {
            // OPTIMIZATION: Increased timeout for long responses with multiple function calls
            const timeout = setTimeout(() => {
                cleanup();
                console.error('⏰ Audio processing timeout (180s) - server may be overloaded');
                console.error('   💡 Try shorter queries or check server logs');
                reject(new Error('Audio processing timeout'));
            }, 180000); // 180 second timeout (3 minutes for complex calendar operations + TTS)
            
            const audioChunks = [];
            let responseText = '';
            
            // Create handler functions that we can clean up
            const handlers = {
                processing_started: (data) => {
                    if (data.requestId === requestId) {
                        console.log(`⚡ Server started processing (requestId: ${requestId})`);
                    }
                },
                instant_ack: (data) => {
                    console.log(`⚡ Instant ACK: "${data.text}" (intent: ${data.intent || 'generic'})`);
                    // Speak the acknowledgment immediately
                    if (window.speakText) {
                        window.speakText(data.text, true); // true = instant/priority
                    }
                    this.emit('instant_ack', data);
                },
                transcription: (data) => {
                    console.log(`📝 Transcription: ${data.text}`);
                    this.emit('user_transcription', data);
                },
                function_calls: (data) => {
                    console.log(`🔧 Executing ${data.count} function(s): ${data.functions.join(', ')}`);
                    this.emit('user_function_calls', data);
                },
                response_text: (data) => {
                    responseText = data.text;
                    console.log(`🤖 Response: "${responseText.substring(0, 100)}..."`);
                    this.emit('user_response_text', data);
                },
                audio_response: (data) => {
                    // Handle quick acknowledgment audio (can be cancelled)
                    if (data.isAck) {
                        console.log(`⚡ Quick ack received: "${data.text}"`);
                        this.handleAckAudio(data.audio);
                    } else {
                        // Regular audio response
                        console.log(`🔊 Audio response received`);
                        this.queueAudioChunk(data.audio);
                    }
                },
                audio_chunk: (data) => {
                    if (data.chunk === 0) {
                        console.log(`⚡ First Gemini audio chunk received - cancelling any pending ack`);
                        this.cancelAckAudio();  // Cancel ack when Gemini audio starts
                        this.geminiAudioStarted = true;
                    }
                    console.log(`🔊 Audio chunk ${data.chunk + 1}/${data.total} received`);
                    audioChunks.push(data.audioData);
                    this.queueAudioChunk(data.audioData);
                    this.emit('user_audio_chunk', data);
                },
                processing_complete: (data) => {
                    if (data.requestId === requestId) {
                        cleanup();
                        console.log(`✅ Processing complete in ${data.duration}ms (requestId: ${requestId})`);
                        
                        // Emit user-facing event
                        this.emit('processing_complete', data);
                        
                        resolve({
                            transcription: '(WebSocket stream)',
                            response: responseText,
                            audioChunks: audioChunks,
                            duration: data.duration
                        });
                    }
                },
                error: (data) => {
                    cleanup();
                    
                    // Clear audio queue on error
                    this.audioQueue = [];
                    this.isPlayingQueue = false;
                    
                    // Emit audio_queue_finished to clear UI
                    this.emit('audio_queue_finished');
                    
                    reject(new Error(data.error));
                }
            };
            
            // Cleanup function to remove all listeners
            const cleanup = () => {
                clearTimeout(timeout);
                Object.keys(handlers).forEach(event => {
                    this.off(event, handlers[event]);
                });
            };
            
            // Register all handlers
            Object.keys(handlers).forEach(event => {
                this.on(event, handlers[event]);
            });
            
            // Send audio data (backend maintains context via Firestore)
            this.send({
                type: 'audio_stream',
                audioData: base64Audio,
                mimeType: audioBlob.type,
                voiceConfig: voiceConfig,
                requestId: requestId
            });
        });
    }
    
    /**
     * Send text message via WebSocket
     */
    async sendTextMessage(text) {
        if (!this.authenticated) {
            throw new Error('Not authenticated');
        }
        
        console.log(`💬 Sending text via WebSocket: "${text}"`);
        
        const requestId = Date.now();
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Text processing timeout'));
            }, 30000);
            
            let fullResponse = '';
            
            this.on('text_chunk', (data) => {
                fullResponse += data.text;
                this.emit('user_text_chunk', data);
            });
            
            this.on('function_calls', (data) => {
                console.log(`🔧 Executing functions: ${data.functions.join(', ')}`);
                this.emit('user_function_calls', data);
            });
            
            this.on('processing_complete', (data) => {
                if (data.requestId === requestId) {
                    clearTimeout(timeout);
                    resolve({
                        response: fullResponse,
                        duration: data.duration
                    });
                }
            });
            
            this.on('error', (data) => {
                clearTimeout(timeout);
                reject(new Error(data.error));
            });
            
            this.send({
                type: 'text_message',
                text: text,
                requestId: requestId
            });
        });
    }
    
    /**
     * Handle acknowledgment audio (can be cancelled by Gemini response)
     */
    async handleAckAudio(base64Audio) {
        // Don't play ack if Gemini audio has already started
        if (this.geminiAudioStarted) {
            console.log('   ⚠️ Gemini audio already playing - discarding ack');
            return;
        }
        
        this.pendingAckAudio = base64Audio;
        
        try {
            // Convert base64 to blob
            const audioBlob = this.base64ToBlob(base64Audio, 'audio/mpeg');
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Create audio element
            const audio = new Audio(audioUrl);
            audio.volume = 1.0;
            audio.preload = 'auto';
            
            this.currentAckAudio = audio;
            
            audio.onended = () => {
                console.log('   ✅ Ack audio finished playing');
                URL.revokeObjectURL(audioUrl);
                this.currentAckAudio = null;
                this.pendingAckAudio = null;
            };
            
            audio.onerror = (error) => {
                console.error('   ❌ Ack audio playback error:', error);
                URL.revokeObjectURL(audioUrl);
                this.currentAckAudio = null;
                this.pendingAckAudio = null;
            };
            
            // Check again before playing (Gemini might have arrived while we were setting up)
            if (this.geminiAudioStarted) {
                console.log('   ⚠️ Gemini audio started during ack setup - cancelling ack');
                audio.pause();
                audio.src = '';
                URL.revokeObjectURL(audioUrl);
                this.currentAckAudio = null;
                this.pendingAckAudio = null;
                return;
            }
            
            await audio.play();
            console.log('   🔊 Playing quick acknowledgment audio');
            
        } catch (error) {
            console.error('   ❌ Failed to play ack audio:', error);
            this.currentAckAudio = null;
            this.pendingAckAudio = null;
        }
    }
    
    /**
     * Cancel any pending or playing acknowledgment audio
     */
    cancelAckAudio() {
        if (this.currentAckAudio) {
            console.log('   🛑 Cancelling currently playing ack audio');
            this.currentAckAudio.pause();
            this.currentAckAudio.src = '';
            this.currentAckAudio = null;
        }
        
        if (this.pendingAckAudio) {
            console.log('   🛑 Discarding pending ack audio');
            this.pendingAckAudio = null;
        }
    }
    
    /**
     * Queue audio chunk for sequential playback
     */
    queueAudioChunk(base64Audio) {
        // PERFORMANCE: Limit queue size to prevent memory issues
        const MAX_QUEUE_SIZE = 100;
        if (this.audioQueue.length >= MAX_QUEUE_SIZE) {
            console.warn('⚠️ Audio queue full, dropping oldest chunk');
            this.audioQueue.shift();
        }
        
        this.audioQueue.push(base64Audio);
        
        if (!this.isPlayingQueue) {
            this.playNextChunk();
        }
    }
    
    /**
     * Play next audio chunk in queue
     */
    async playNextChunk() {
        if (this.audioQueue.length === 0) {
            this.isPlayingQueue = false;
            console.log('✅ Audio queue finished playing all chunks');
            // Emit event when queue is fully finished
            this.emit('audio_queue_finished');
            return;
        }
        
        this.isPlayingQueue = true;
        
        const base64Audio = this.audioQueue.shift();
        
        try {
            // Convert base64 to blob
            const audioBlob = this.base64ToBlob(base64Audio, 'audio/mpeg');
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Create temporary audio element
            const audio = new Audio(audioUrl);
            
            // PERFORMANCE: Set volume and preload settings
            audio.volume = 1.0;
            audio.preload = 'auto';
            
            audio.onended = () => {
                // PERFORMANCE: Clean up to prevent memory leaks
                URL.revokeObjectURL(audioUrl);
                audio.onended = null;
                audio.onerror = null;
                audio.src = '';
                this.playNextChunk(); // Play next chunk
            };
            
            audio.onerror = (error) => {
                console.error('❌ Audio playback error:', error);
                // PERFORMANCE: Clean up on error
                URL.revokeObjectURL(audioUrl);
                audio.onended = null;
                audio.onerror = null;
                audio.src = '';
                this.playNextChunk(); // Try next chunk
            };
            
            await audio.play();
            
        } catch (error) {
            console.error('❌ Failed to play audio chunk:', error);
            this.playNextChunk(); // Try next chunk
        }
    }
    
    /**
     * Clear audio queue
     */
    clearAudioQueue() {
        console.log(`🗑️ Clearing audio queue (${this.audioQueue.length} chunks)`);
        this.audioQueue = [];
        this.isPlayingQueue = false;
        
        // PERFORMANCE: Emit queue finished to clear UI
        if (this.audioQueue.length > 0) {
            this.emit('audio_queue_finished');
        }
    }
    
    /**
     * Send message to server
     */
    send(data) {
        if (!this.connected) {
            throw new Error('WebSocket not connected');
        }
        
        this.ws.send(JSON.stringify(data));
    }
    
    /**
     * Handle incoming message
     */
    handleMessage(data) {
        try {
            // SECURITY: Validate message size to prevent memory attacks
            if (data.length > 50 * 1024 * 1024) { // 50MB limit per message
                console.error('❌ Message too large, rejecting');
                return;
            }
            
            const message = JSON.parse(data);
            
            // SECURITY: Validate message structure
            if (!message || typeof message.type !== 'string') {
                console.error('❌ Invalid message format');
                return;
            }
            
            // Log all incoming messages for debugging
            if (message.type !== 'pong') { // Skip noisy pong messages
                console.log(`📨 [WS] Received message type: ${message.type}`, 
                    message.type === 'audio_chunk' ? `(chunk ${message.chunk + 1}/${message.total})` : 
                    message.type === 'response_text' ? `"${message.text?.substring(0, 50)}..."` :
                    message.type === 'transcription' ? `"${message.text}"` :
                    '');
            }
            
            // Emit to registered handlers
            this.emit(message.type, message);
            
        } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
        }
    }
    
    /**
     * Register message handler
     */
    on(type, handler) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type).push(handler);
    }
    
    /**
     * Register one-time message handler
     */
    once(type, handler) {
        const wrappedHandler = (data) => {
            handler(data);
            this.off(type, wrappedHandler);
        };
        this.on(type, wrappedHandler);
    }
    
    /**
     * Unregister message handler
     */
    off(type, handler) {
        if (this.messageHandlers.has(type)) {
            const handlers = this.messageHandlers.get(type);
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event to handlers
     */
    emit(type, data) {
        if (this.messageHandlers.has(type)) {
            this.messageHandlers.get(type).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`❌ Error in ${type} handler:`, error);
                }
            });
        }
    }
    
    /**
     * Start heartbeat ping
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.connected) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Every 30 seconds
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
    
    /**
     * Convert base64 to blob
     */
    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }
    
    /**
     * Close WebSocket connection
     */
    close() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        if (this.ws) {
            this.ws.close();
        }
        
        this.connected = false;
        this.authenticated = false;
        console.log('🔌 WebSocket closed');
    }
}

// Make available globally
window.WebSocketClient = WebSocketClient;

console.log('✅ WebSocket client loaded');
