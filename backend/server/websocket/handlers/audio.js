
/**
 * WebSocket Audio Handlers
 * 
 * Handles audio-related WebSocket messages:
 * - audio_stream: Complete audio file sent at once (batch mode)
 * - start_audio_stream: Initialize real-time chunked streaming session
 * - audio_chunk: Receive individual audio chunks in real-time
 * - end_audio_stream: Finalize and process complete audio from chunks
 * 
 * PRIVACY: Audio files are NEVER saved to disk - only text transcriptions are persisted to Firestore
 */

const path = require('path');
const fs = require('fs');
const { conversationHistory } = require('../../services/firestore');

// Store active streaming sessions globally
const activeStreamingSessions = new Map(); // `${userEmail}:${requestId}` -> session data

/**
 * Generate a random quick acknowledgment message
 * Never includes user name for more natural, fast responses
 */
function getRandomAckMessage() {
    const messages = [
        "On it!",
        "Got it!",
        "Sure thing!",
        "One moment!",
        "Hang on!",
        "Just a sec!",
        "Let me check!",
        "Give me one sec!",
        "Working on it!",
        "Right away!",
        "Coming right up!",
        "Let me get that for you!",
        "I'll look that up!",
        "Checking now!",
        "One sec!",
        "Hold on!",
        "Looking into it!",
        "Let me see!",
        "On it, give me a moment!",
        "Copy that!",
        "Understood!",
        "No problem!",
        "Alright!",
        "Sure!",
        "I'm on it!",
        "Let me grab that!",
        "Pulling that up now!",
        "Give me just a moment!",
        "Checking that now!",
        "Working on that!"
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Handle complete audio stream (batch mode)
 * Receives entire audio file at once, transcribes it, processes with Gemini, and streams TTS response
 */
async function handleAudioStream(ws, message, userEmail, connectionId, dependencies) {
    const { 
        transcribeAudioAsync,
        textToSpeechGoogle,
        model,
        analyzeFunctionDependencies,
        executeParallelFunctions
    } = dependencies;
    
    // Note: getConversationHistory and addToHistory are deprecated - we use Firestore directly

    const requestId = message.requestId || Date.now();
    const requestStartTime = Date.now();
    console.log(`\n🎤 [WS-${connectionId}] Audio stream received from ${userEmail} (requestId: ${requestId})`);
    console.log(`   ⏰ Request timestamp: ${new Date(requestId).toLocaleTimeString()}`);
    
    try {
        // Send immediate acknowledgment
        const ackTime = Date.now();
        ws.send(JSON.stringify({
            type: 'processing_started',
            requestId,
            timestamp: ackTime
        }));
        console.log(`   ⚡ Acknowledgment sent in ${ackTime - requestStartTime}ms`);
        
        // INSTANT ACK: Generate and send TTS audio immediately
        const instantAck = getRandomAckMessage();
        
        console.log(`   🎙️ Generating TTS for instant ACK: "${instantAck}"`);
        
        // Generate TTS for acknowledgment (fast, using standard voice for speed)
        const ackTTSStart = Date.now();
        try {
            const ackAudioBuffer = await textToSpeechGoogle(instantAck, {
                voiceName: 'en-US-Standard-F', // Faster than Neural2
                speakingRate: 1.15 // Slightly faster for quick acks
            });
            
            const ackTTSDuration = Date.now() - ackTTSStart;
            console.log(`   ⚡ ACK TTS generated in ${ackTTSDuration}ms`);
            
            // Send as audio chunk immediately
            ws.send(JSON.stringify({
                type: 'audio_chunk',
                audioData: ackAudioBuffer.toString('base64'),
                isFirst: true,
                isAck: true,
                timestamp: Date.now()
            }));
            console.log(`   🔊 Instant ACK audio sent (${ackAudioBuffer.length} bytes)`);
        } catch (error) {
            console.error(`   ❌ Failed to generate ACK TTS: ${error.message}`);
            // Fallback: send text-only
            ws.send(JSON.stringify({
                type: 'instant_ack',
                text: instantAck,
                timestamp: Date.now()
            }));
        }
        
        // Decode base64 audio
        const decodeStartTime = Date.now();
        const audioBuffer = Buffer.from(message.audioData, 'base64');
        const decodeDuration = Date.now() - decodeStartTime;
        const mimeType = message.mimeType || 'audio/webm';
        
        console.log(`   📦 Audio size: ${audioBuffer.length} bytes (${(audioBuffer.length / 1024).toFixed(2)} KB)`);
        console.log(`   🎵 Format: ${mimeType}`);
        console.log(`   ⚡ Base64 decode: ${decodeDuration}ms`);
        
        // PARALLEL: Start async transcription for history (non-blocking, runs in background)
        const transcriptionPromise = transcribeAudioAsync(audioBuffer, userEmail, mimeType);
        console.log(`🚀 [Batch Mode] Background transcription started (non-blocking)...`);
        
        // Process with Gemini (stream results via WebSocket)
        const base64Audio = audioBuffer.toString('base64');
        const processingStartTime = Date.now();
        
        // AI MEMORY: Get conversation history from Firestore (properly formatted for Gemini)
        console.log(`   🧠 Loading conversation history from Firestore...`);
        const formattedHistory = await conversationHistory.formatHistoryForGemini(userEmail);
        console.log(`   📚 Retrieved ${formattedHistory.length} messages from Firestore`);
        
        // Debug: Show last 3 messages
        if (formattedHistory.length > 0) {
            console.log(`   🔍 Last messages in history:`);
            formattedHistory.slice(-3).forEach((msg, i) => {
                const text = msg.parts[0].text || JSON.stringify(msg.parts[0]);
                console.log(`      ${formattedHistory.length - 3 + i + 1}. ${msg.role}: ${text.substring(0, 50)}...`);
            });
        }
        
        // Note: formatHistoryForGemini() already handles proper role alternation
        // No need to manually clean up - Firestore service handles this
        console.log(`   ✅ Using ${formattedHistory.length} history messages for context`);
        
        let chat = model.startChat({
            history: formattedHistory
        });
        
        // Send to Gemini with automatic fallback
        const { sendMessageWithFallback } = require('../../services/gemini/chat');
        console.log(`   🤖 Sending audio to Gemini...`);
        const geminiStartTime = Date.now();
        let result = await sendMessageWithFallback(
            chat,
            [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Audio
                    }
                },
                { text: '🎤 CURRENT USER MESSAGE: Listen to this new audio message and respond according to your system instructions. CRITICAL REMINDERS: (1) NEVER trust dates from conversation history - ALWAYS call getCurrentTime() first for ANY time/date/calendar question. (2) If user corrects you or says "you\'re wrong", STOP and re-analyze the facts with LOGIC and COMMON SENSE. (3) People can only be in ONE place at a time. (4) If message references previous conversation (like "yes", "those dates", "what I said"), use history for context. If it\'s a new topic, treat it fresh.' }
            ],
            model,
            formattedHistory
        );
        
        let response = result.response;
        chat = result.chat; // Use fallback chat if fallback was triggered
        const geminiDuration = Date.now() - geminiStartTime;
        
        if (result.usedFallback) {
            console.log(`   ✅ Gemini response received in ${geminiDuration}ms (using fallback: ${result.fallbackModel})`);
        } else {
            console.log(`   ✅ Gemini response received in ${geminiDuration}ms`);
        }
        
        let functionCallCount = 0;
        
        // Get transcription from background promise and send to frontend
        const transcription = await transcriptionPromise;
        console.log(`   📝 Transcription complete: "${transcription}"`);
        ws.send(JSON.stringify({
            type: 'transcription',
            text: transcription,
            timestamp: Date.now()
        }));
        
        // Handle function calls
        let functionExecutionTime = 0;
        while (response.response.functionCalls() && response.response.functionCalls().length > 0) {
            const functionCalls = response.response.functionCalls();
            const functionNames = functionCalls.map(f => f.name).join(', ');
            console.log(`   🔧 Executing ${functionCalls.length} function(s): ${functionNames}`);
            
            // Notify about function execution
            ws.send(JSON.stringify({
                type: 'function_calls',
                functions: functionCalls.map(f => f.name),
                count: functionCalls.length,
                timestamp: Date.now()
            }));
            
            // Execute functions in parallel
            const functionStartTime = Date.now();
            const groups = analyzeFunctionDependencies(functionCalls);
            const functionResponses = [];
            
            for (const group of groups) {
                const groupResults = await executeParallelFunctions(group, userEmail);
                
                for (const { call, result, error, success } of groupResults) {
                    functionCallCount++;
                    functionResponses.push({
                        functionResponse: {
                            name: call.name,
                            response: success ? { result } : { error }
                        }
                    });
                }
            }
            
            const functionDuration = Date.now() - functionStartTime;
            functionExecutionTime += functionDuration;
            console.log(`   ✅ Functions executed in ${functionDuration}ms`);
            
            // Send function responses with fallback support
            const geminiFollowupStart = Date.now();
            const followupResult = await sendMessageWithFallback(
                chat,
                functionResponses,
                model,
                formattedHistory
            );
            
            response = followupResult.response;
            chat = followupResult.chat; // Update chat reference if fallback occurred
            
            if (followupResult.usedFallback) {
                console.log(`   🤖 Gemini follow-up response in ${Date.now() - geminiFollowupStart}ms (using fallback: ${followupResult.fallbackModel})`);
            } else {
                console.log(`   🤖 Gemini follow-up response in ${Date.now() - geminiFollowupStart}ms`);
            }
        }
        
        if (functionCallCount > 0) {
            console.log(`   📊 Total function execution time: ${functionExecutionTime}ms (${functionCallCount} function(s))`);
        }
        
        const responseText = response.response.text();
        
        // ⚡ OPTIMIZED FLOW: Generate first audio chunk BEFORE sending text
        // This reduces perceived latency - audio starts playing faster
        console.log(`   🔊 [WS-${connectionId}] Generating audio response...`);
        const voiceConfig = message.voiceConfig || {};
        
        // Split into sentences for streaming
        const sentences = responseText.match(/[^.!?]+[.!?]+/g) || [responseText];
        
        // ✅ Generate FIRST audio chunk immediately (zero disk writes!)
        const ttsStartTime = Date.now();
        const firstSentence = sentences[0].trim();
        const firstAudioBuffer = await textToSpeechGoogle(firstSentence, voiceConfig);
        const firstBase64Audio = firstAudioBuffer.toString('base64');
        
        const ttsFirstChunkTime = Date.now() - ttsStartTime;
        console.log(`   ⚡ First audio chunk ready in ${ttsFirstChunkTime}ms`);
        console.log(`   💾 Zero disk writes - audio in memory only!`);
        
        // NOW send text response AND first audio chunk together
        // This ensures audio playback starts immediately after text appears
        ws.send(JSON.stringify({
            type: 'response_text',
            text: responseText,
            functionCalls: functionCallCount,
            timestamp: Date.now()
        }));
        
        ws.send(JSON.stringify({
            type: 'audio_chunk',
            chunk: 0,
            total: sentences.length,
            audioData: firstBase64Audio,
            isLast: sentences.length === 1,
            timestamp: Date.now()
        }));
        
        console.log(`   🔊 [WS-${connectionId}] Sent text + first audio chunk (1/${sentences.length})`);
        
        // ✅ Generate and stream remaining audio chunks (zero disk writes!)
        let totalTTSTime = ttsFirstChunkTime;
        for (let i = 1; i < sentences.length; i++) {
            const sentence = sentences[i].trim();
            
            const chunkStartTime = Date.now();
            const audioBuffer = await textToSpeechGoogle(sentence, voiceConfig);
            const chunkDuration = Date.now() - chunkStartTime;
            totalTTSTime += chunkDuration;
            
            const base64AudioChunk = audioBuffer.toString('base64');
            
            ws.send(JSON.stringify({
                type: 'audio_chunk',
                chunk: i,
                total: sentences.length,
                audioData: base64AudioChunk,
                isLast: i === sentences.length - 1,
                timestamp: Date.now()
            }));
            
            console.log(`   🔊 [WS-${connectionId}] Sent audio chunk ${i + 1}/${sentences.length} (generated in ${chunkDuration}ms)`);
        }
        
        console.log(`   💾 Zero disk writes - all ${sentences.length} chunks streamed from memory!`);
        
        const totalTime = Date.now() - processingStartTime;
        const totalRequestTime = Date.now() - requestStartTime;
        
        // Performance breakdown
        console.log(`\n📊 [WS-${connectionId}] Performance Breakdown:`);
        console.log(`   ⚡ Acknowledgment: ${ackTime - requestStartTime}ms`);
        console.log(`   📦 Audio decode: ${decodeDuration}ms`);
        console.log(`   🤖 Gemini processing: ${geminiDuration}ms`);
        if (functionCallCount > 0) {
            console.log(`   🔧 Function execution: ${functionExecutionTime}ms (${functionCallCount} calls)`);
        }
        console.log(`   🔊 TTS generation: ${totalTTSTime}ms (${sentences.length} chunks)`);
        console.log(`   🏁 Total processing: ${totalTime}ms`);
        console.log(`   ⏱️  Total request time: ${totalRequestTime}ms`);
        
        // System health metrics
        const memUsage = process.memoryUsage();
        console.log(`   💾 Memory: Heap ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)}MB`);
        console.log(`   📈 RSS: ${(memUsage.rss / 1024 / 1024).toFixed(1)}MB`);
        
        console.log(`✅ [WS-${connectionId}] Stream complete`);
        
        // PRIVACY: Save only TEXT transcription and response to Firestore (no audio files!)
        try {
            const transcription = await transcriptionPromise;
            console.log(`   💾 Saving conversation to Firestore...`);
            await conversationHistory.addMessage(userEmail, 'user', transcription);
            await conversationHistory.addMessage(userEmail, 'assistant', responseText);
            console.log(`   ✅ Conversation saved (text only, no audio files)`);
        } catch (firestoreError) {
            console.error(`   ⚠️  Failed to save to Firestore (non-critical):`, firestoreError.message);
            // Don't fail the request if Firestore save fails
        }
        
        ws.send(JSON.stringify({
            type: 'processing_complete',
            requestId,
            duration: totalTime,
            timestamp: Date.now()
        }));
        
    } catch (error) {
        const errorTime = Date.now() - requestStartTime;
        console.error(`❌ [WS-${connectionId}] Audio stream error after ${errorTime}ms:`, error.message);
        console.error(`   📍 Error type:`, error.name);
        console.error(`   📍 Stack:`, error.stack?.split('\n').slice(0, 3).join('\n'));
        ws.send(JSON.stringify({
            type: 'error',
            error: error.message,
            timestamp: Date.now()
        }));
    }
}

/**
 * Handle start of audio streaming session (real-time chunked mode)
 */
async function handleStartAudioStream(ws, message, userEmail, connectionId) {
    const requestId = message.requestId || Date.now();
    const sessionKey = `${userEmail}:${requestId}`;
    
    console.log(`\n🎬 [WS-${connectionId}] Starting audio streaming session (requestId: ${requestId})`);
    
    // Initialize session
    activeStreamingSessions.set(sessionKey, {
        chunks: [],
        mimeType: message.mimeType || 'audio/webm',
        startTime: Date.now(),
        userEmail,
        requestId,
        ws
    });
    
    // Acknowledge
    ws.send(JSON.stringify({
        type: 'stream_started',
        requestId,
        timestamp: Date.now()
    }));
    
    console.log(`   ✅ Streaming session initialized for ${userEmail}`);
}

/**
 * Handle incoming audio chunk (real-time chunked mode)
 */
async function handleAudioChunkStream(ws, message, userEmail, connectionId) {
    const requestId = message.requestId;
    const sessionKey = `${userEmail}:${requestId}`;
    const session = activeStreamingSessions.get(sessionKey);
    
    if (!session) {
        console.error(`   ❌ No active session found for requestId: ${requestId}`);
        ws.send(JSON.stringify({
            type: 'error',
            error: 'No active streaming session. Call start_audio_stream first.',
            timestamp: Date.now()
        }));
        return;
    }
    
    // Decode and store chunk
    const audioChunk = Buffer.from(message.audioData, 'base64');
    session.chunks.push(audioChunk);
    
    console.log(`   📦 [WS-${connectionId}] Received chunk ${session.chunks.length} (${audioChunk.length} bytes)`);
    
    // Acknowledge chunk received
    ws.send(JSON.stringify({
        type: 'chunk_received',
        requestId,
        chunkIndex: message.chunkIndex,
        totalChunks: session.chunks.length,
        timestamp: Date.now()
    }));
}

/**
 * Handle end of audio streaming - process complete audio with Gemini (real-time chunked mode)
 */
async function handleEndAudioStream(ws, message, userEmail, connectionId, dependencies) {
    const {
        transcribeAudioAsync,
        textToSpeechGoogle,
        getConversationHistory,
        addToHistory,
        model,
        analyzeFunctionDependencies,
        executeParallelFunctions
    } = dependencies;

    const requestId = message.requestId;
    const sessionKey = `${userEmail}:${requestId}`;
    const session = activeStreamingSessions.get(sessionKey);
    
    if (!session) {
        console.error(`   ❌ No active session found for requestId: ${requestId}`);
        ws.send(JSON.stringify({
            type: 'error',
            error: 'No active streaming session found.',
            timestamp: Date.now()
        }));
        return;
    }
    
    console.log(`\n🏁 [WS-${connectionId}] Finalizing audio stream (requestId: ${requestId})`);
    console.log(`   📦 Total chunks received: ${session.chunks.length}`);
    
    try {
        // Combine all chunks into complete audio
        const completeAudioBuffer = Buffer.concat(session.chunks);
        const totalSize = completeAudioBuffer.length;
        const duration = Date.now() - session.startTime;
        
        console.log(`   ✅ Combined audio: ${totalSize} bytes (${(totalSize / 1024).toFixed(2)} KB)`);
        console.log(`   ⏱️  Streaming duration: ${duration}ms`);
        
        // PARALLEL: Start async transcription for history (non-blocking, runs in background)
        const transcriptionPromise = transcribeAudioAsync(completeAudioBuffer, userEmail, session.mimeType);
        console.log(`🚀 [Real-time Stream] Background transcription started (non-blocking)...`);
        
        // Send processing started
        ws.send(JSON.stringify({
            type: 'processing_started',
            requestId,
            timestamp: Date.now()
        }));
        
        // INSTANT ACK: Generate and send TTS audio immediately
        const instantAck = getRandomAckMessage();
        
        console.log(`   🎙️ Generating TTS for instant ACK: "${instantAck}"`);
        
        // Generate TTS for acknowledgment (fast, using standard voice for speed)
        const ackTTSStart = Date.now();
        try {
            const ackAudioBuffer = await textToSpeechGoogle(instantAck, {
                voiceName: 'en-US-Standard-F', // Faster than Neural2
                speakingRate: 1.15 // Slightly faster for quick acks
            });
            
            const ackTTSDuration = Date.now() - ackTTSStart;
            console.log(`   ⚡ ACK TTS generated in ${ackTTSDuration}ms`);
            
            // Send as audio chunk immediately
            ws.send(JSON.stringify({
                type: 'audio_chunk',
                audioData: ackAudioBuffer.toString('base64'),
                isFirst: true,
                isAck: true,
                timestamp: Date.now()
            }));
            console.log(`   🔊 Instant ACK audio sent (${ackAudioBuffer.length} bytes)`);
        } catch (error) {
            console.error(`   ❌ Failed to generate ACK TTS: ${error.message}`);
            // Fallback: send text-only
            ws.send(JSON.stringify({
                type: 'instant_ack',
                text: instantAck,
                timestamp: Date.now()
            }));
        }
        
        // Process with Gemini (same as handleAudioStream)
        const base64Audio = completeAudioBuffer.toString('base64');
        const processingStartTime = Date.now();
        
        // AI MEMORY: Get conversation history from Firestore
        console.log(`   🧠 Loading conversation history from Firestore...`);
        const formattedHistory = await conversationHistory.formatHistoryForGemini(userEmail);
        console.log(`   📚 Retrieved ${formattedHistory.length} messages from Firestore`);
        
        // Debug: Show last 3 messages
        if (formattedHistory.length > 0) {
            console.log(`   🔍 Last messages in history:`);
            formattedHistory.slice(-3).forEach((msg, i) => {
                const text = msg.parts[0].text || JSON.stringify(msg.parts[0]);
                console.log(`      ${formattedHistory.length - 3 + i + 1}. ${msg.role}: ${text.substring(0, 50)}...`);
            });
        }
        
        // Note: formatHistoryForGemini() already handles proper role alternation
        console.log(`   ✅ Using ${formattedHistory.length} history messages for context`);
        
        let chat = model.startChat({
            history: formattedHistory
        });
        
        // Send to Gemini with automatic fallback
        const { sendMessageWithFallback } = require('../../services/gemini/chat');
        const geminiStartTime = Date.now();
        let result = await sendMessageWithFallback(
            chat,
            [
                {
                    inlineData: {
                        mimeType: session.mimeType,
                        data: base64Audio
                    }
                },
                { text: '🎤 CURRENT USER MESSAGE: Listen to this new audio message and respond according to your system instructions. CRITICAL REMINDERS: (1) NEVER trust dates from conversation history - ALWAYS call getCurrentTime() first for ANY time/date/calendar question. (2) If user corrects you or says "you\'re wrong", STOP and re-analyze the facts with LOGIC and COMMON SENSE. (3) People can only be in ONE place at a time. (4) If message references previous conversation (like "yes", "those dates", "what I said"), use history for context. If it\'s a new topic, treat it fresh.' }
            ],
            model,
            formattedHistory
        );
        
        let response = result.response;
        chat = result.chat; // Use fallback chat if fallback was triggered
        
        if (result.usedFallback) {
            console.log(`   ✅ Gemini response received in ${Date.now() - geminiStartTime}ms (using fallback: ${result.fallbackModel})`);
        } else {
            console.log(`   ✅ Gemini response received in ${Date.now() - geminiStartTime}ms`);
        }
        
        let functionCallCount = 0;
        
        // Stream transcription update
        ws.send(JSON.stringify({
            type: 'transcription',
            text: 'Processing audio...',
            timestamp: Date.now()
        }));
        
        // Handle function calls
        while (response.response.functionCalls() && response.response.functionCalls().length > 0) {
            const functionCalls = response.response.functionCalls();
            
            ws.send(JSON.stringify({
                type: 'function_calls',
                functions: functionCalls.map(f => f.name),
                count: functionCalls.length,
                timestamp: Date.now()
            }));
            
            const groups = analyzeFunctionDependencies(functionCalls);
            const functionResponses = [];
            
            for (const group of groups) {
                const groupResults = await executeParallelFunctions(group, userEmail);
                
                for (const { call, result, error, success } of groupResults) {
                    functionCallCount++;
                    functionResponses.push({
                        functionResponse: {
                            name: call.name,
                            response: success ? { result } : { error }
                        }
                    });
                }
            }
            
            // Send function responses with fallback support
            const followupResult = await sendMessageWithFallback(
                chat,
                functionResponses,
                model,
                formattedHistory
            );
            
            response = followupResult.response;
            chat = followupResult.chat; // Update chat reference if fallback occurred
            
            if (followupResult.usedFallback) {
                console.log(`   🔄 Used fallback model: ${followupResult.fallbackModel}`);
            }
        }
        
        const responseText = response.response.text();
        
        // Generate and stream TTS (zero disk writes!)
        console.log(`   🔊 [WS-${connectionId}] Generating audio response...`);
        const voiceConfig = message.voiceConfig || {};
        
        const sentences = responseText.match(/[^.!?]+[.!?]+/g) || [responseText];
        
        // ✅ Generate first audio chunk immediately (in memory)
        const ttsStartTime = Date.now();
        const firstSentence = sentences[0].trim();
        const firstAudioBuffer = await textToSpeechGoogle(firstSentence, voiceConfig);
        const firstBase64Audio = firstAudioBuffer.toString('base64');
        
        console.log(`   ⚡ First audio chunk ready in ${Date.now() - ttsStartTime}ms`);
        console.log(`   💾 Zero disk writes - audio in memory only!`);
        
        // Send text + first audio chunk
        ws.send(JSON.stringify({
            type: 'response_text',
            text: responseText,
            functionCalls: functionCallCount,
            timestamp: Date.now()
        }));
        
        ws.send(JSON.stringify({
            type: 'audio_chunk',
            chunk: 0,
            total: sentences.length,
            audioData: firstBase64Audio,
            isLast: sentences.length === 1,
            timestamp: Date.now()
        }));
        
        // ✅ Generate remaining chunks (zero disk writes!)
        for (let i = 1; i < sentences.length; i++) {
            const sentence = sentences[i].trim();
            const audioBuffer = await textToSpeechGoogle(sentence, voiceConfig);
            const base64AudioChunk = audioBuffer.toString('base64');
            
            ws.send(JSON.stringify({
                type: 'audio_chunk',
                chunk: i,
                total: sentences.length,
                audioData: base64AudioChunk,
                isLast: i === sentences.length - 1,
                timestamp: Date.now()
            }));
            
            console.log(`   🔊 [WS-${connectionId}] Sent audio chunk ${i + 1}/${sentences.length}`);
        }
        
        console.log(`   💾 Zero disk writes - all ${sentences.length} chunks streamed from memory!`);
        
        const totalTime = Date.now() - processingStartTime;
        console.log(`✅ [WS-${connectionId}] Real-time stream complete in ${totalTime}ms`);
        
        // PRIVACY: Save only TEXT transcription and response to Firestore (no audio files!)
        try {
            const transcription = await transcriptionPromise;
            console.log(`   💾 Saving conversation to Firestore...`);
            await conversationHistory.addMessage(userEmail, 'user', transcription);
            await conversationHistory.addMessage(userEmail, 'assistant', responseText);
            console.log(`   ✅ Conversation saved (text only, no audio files)`);
        } catch (firestoreError) {
            console.error(`   ⚠️  Failed to save to Firestore (non-critical):`, firestoreError.message);
        }
        
        ws.send(JSON.stringify({
            type: 'processing_complete',
            requestId,
            duration: totalTime,
            timestamp: Date.now()
        }));
        
    } catch (error) {
        console.error(`❌ [WS-${connectionId}] Real-time stream error:`, error);
        ws.send(JSON.stringify({
            type: 'error',
            error: error.message,
            timestamp: Date.now()
        }));
    } finally {
        // Clean up session
        activeStreamingSessions.delete(sessionKey);
        console.log(`   🗑️  Cleaned up streaming session: ${sessionKey}`);
    }
}

module.exports = {
    handleAudioStream,
    handleStartAudioStream,
    handleAudioChunkStream,
    handleEndAudioStream
};
