/**
 * Chat Controller
 * 
 * Handles text-based chat interactions with Gemini AI
 */

const path = require('path');
const fs = require('fs');
const conversationCache = require('../../server/services/cache/conversation'); // Legacy - for clearHistory only
const { conversationHistory } = require('../../server/services/firestore'); // Firestore storage
const calendarService = require('../../server/services/calendar');
const audioService = require('../../server/services/audio');

// Use Firestore for persistent conversation history
const {
    getConversationHistory,
    addMessage: addToHistory,
    clearHistory
} = conversationHistory;

const {
    calendarFunctions,
    executeFunction: executeCalendarFunction,
    analyzeFunctionDependencies: analyzeCalendarFunctionDependencies,
    executeParallelFunctions: executeCalendarParallelFunctions
} = calendarService;

// Wrapper for executeParallelFunctions
async function executeParallelFunctions(functionCalls, userEmail) {
    return executeCalendarParallelFunctions(functionCalls, userEmail, executeCalendarFunction);
}

// Wrapper for analyzeFunctionDependencies
const analyzeFunctionDependencies = analyzeCalendarFunctionDependencies;

/**
 * Process text chat message with streaming support
 */
async function processChat(req, res, model) {
    const requestId = Date.now();
    console.log('\n' + '='.repeat(80));
    console.log(`💬 TEXT CHAT REQUEST [${requestId}]`);
    console.log('='.repeat(80));
    
    try {
        const { message, stream } = req.body;
        
        if (!message) {
            console.log(`❌ [${requestId}] No message provided`);
            return res.status(400).json({ error: 'No message provided' });
        }

        console.log(`📨 [${requestId}] Received message: "${message}"`);
        console.log(`   Length: ${message.length} characters`);
        console.log(`   Stream mode: ${stream ? 'ENABLED' : 'DISABLED'}`);

        const aiStartTime = Date.now();
        
        // AI MEMORY: Get conversation history from Firestore
        console.log(`   🧠 Loading conversation history from Firestore...`);
        const formattedHistory = await conversationHistory.formatHistoryForGemini(req.user.email);
        console.log(`   📚 Retrieved ${formattedHistory.length} messages from Firestore`);
        
        // Debug: Show last 3 messages for context
        if (formattedHistory.length > 0) {
            console.log(`   🔍 Last messages in history:`);
            formattedHistory.slice(-3).forEach((msg, i) => {
                const text = msg.parts[0].text || JSON.stringify(msg.parts[0]);
                console.log(`      ${formattedHistory.length - 3 + i + 1}. ${msg.role}: ${text.substring(0, 50)}...`);
            });
        }
        
        const chat = model.startChat({
            history: formattedHistory
        });
        
        // Add user message to history (will be saved to Firestore)
        await addToHistory(req.user.email, 'user', message);
        
        // STREAMING MODE: Send response as it arrives
        if (stream) {
            console.log(`\n🌊 [${requestId}] STREAMING MODE ENABLED`);
            
            // Set headers for SSE (Server-Sent Events)
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            let fullResponse = '';
            let functionCallCount = 0;
            
            try {
                // Send initial message with streaming
                const result = await chat.sendMessageStream(message);
                
                // Stream chunks as they arrive
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    fullResponse += chunkText;
                    
                    // Send chunk to client immediately
                    res.write(`data: ${JSON.stringify({ 
                        type: 'chunk', 
                        text: chunkText,
                        timestamp: Date.now()
                    })}\n\n`);
                    
                    console.log(`   📤 Streamed chunk: "${chunkText.substring(0, 50)}..."`);
                }
                
                // Get final response to check for function calls
                const response = await result.response;
                
                // Handle function calls if any
                let currentResponse = response;
                while (currentResponse.functionCalls() && currentResponse.functionCalls().length > 0) {
                    const functionCalls = currentResponse.functionCalls();
                    functionCallCount++;
                    
                    console.log(`\n   🔧 [${requestId}] Function calls detected: ${functionCalls.length}`);
                    
                    // Notify client about function execution
                    res.write(`data: ${JSON.stringify({ 
                        type: 'function_call',
                        functions: functionCalls.map(f => f.name),
                        timestamp: Date.now()
                    })}\n\n`);
                    
                    // **PARALLEL EXECUTION**: Group independent functions
                    const groups = analyzeFunctionDependencies(functionCalls);
                    console.log(`   ⚡ Executing in ${groups.length} parallel group(s)`);
                    
                    const functionResponses = [];
                    
                    // Execute each group in sequence, but functions within group run in parallel
                    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                        const group = groups[groupIndex];
                        console.log(`   📦 Group ${groupIndex + 1}: ${group.map(c => c.name).join(', ')}`);
                        
                        const groupResults = await executeParallelFunctions(group, req.user.email);
                        
                        // Convert results to function responses
                        for (const { call, result, error, success } of groupResults) {
                            functionResponses.push({
                                functionResponse: {
                                    name: call.name,
                                    response: success ? { result } : { error }
                                }
                            });
                        }
                    }
                    
                    // Send function results back and stream the response
                    const nextResult = await chat.sendMessageStream(functionResponses);
                    
                    fullResponse = ''; // Reset for next response
                    for await (const chunk of nextResult.stream) {
                        const chunkText = chunk.text();
                        fullResponse += chunkText;
                        
                        res.write(`data: ${JSON.stringify({ 
                            type: 'chunk', 
                            text: chunkText,
                            timestamp: Date.now()
                        })}\n\n`);
                    }
                    
                    currentResponse = await nextResult.response;
                }
                
                const aiEndTime = Date.now();
                
                // Add final response to history (saved to Firestore)
                if (fullResponse) {
                    await addToHistory(req.user.email, 'assistant', fullResponse);
                }
                
                console.log(`✅ [${requestId}] Streaming complete in ${aiEndTime - aiStartTime}ms`);
                console.log(`   Function calls made: ${functionCallCount}`);
                console.log(`   Final response length: ${fullResponse.length} characters`);
                
                // Send completion event
                res.write(`data: ${JSON.stringify({ 
                    type: 'done',
                    fullText: fullResponse,
                    duration: aiEndTime - aiStartTime,
                    functionCalls: functionCallCount,
                    timestamp: Date.now()
                })}\n\n`);
                
                res.end();
                
            } catch (streamError) {
                console.error(`❌ [${requestId}] Streaming error:`, streamError);
                res.write(`data: ${JSON.stringify({ 
                    type: 'error',
                    error: streamError.message 
                })}\n\n`);
                res.end();
            }
            
        } else {
            // NON-STREAMING MODE: Original behavior
            console.log(`\n🤖 [${requestId}] Sending to Gemini AI with function calling...`);
            console.log(`   Model: gemini-2.0-flash-exp (with Calendar API access)`);
            
            let response = await chat.sendMessage(message);
            let functionCallCount = 0;
            
            // Handle function calls with PARALLEL EXECUTION
            while (response.response.functionCalls() && response.response.functionCalls().length > 0) {
                const functionCalls = response.response.functionCalls();
                console.log(`\n   🔧 [${requestId}] Gemini wants to call ${functionCalls.length} function(s):`);
                
                // **PARALLEL EXECUTION**: Group independent functions
                const groups = analyzeFunctionDependencies(functionCalls);
                console.log(`   ⚡ Executing in ${groups.length} parallel group(s)`);
                
                const functionResponses = [];
                
                // Execute each group in sequence, but functions within group run in parallel
                for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                    const group = groups[groupIndex];
                    console.log(`   📦 Group ${groupIndex + 1}: ${group.map(c => c.name).join(', ')}`);
                    
                    const groupStartTime = Date.now();
                    const groupResults = await executeParallelFunctions(group, req.user.email);
                    const groupDuration = Date.now() - groupStartTime;
                    
                    console.log(`   ✅ Group ${groupIndex + 1} completed in ${groupDuration}ms`);
                    
                    // Convert results to function responses and count calls
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
                
                // Send function results back to Gemini
                console.log(`\n   📤 [${requestId}] Sending ${functionResponses.length} function results back to Gemini...`);
                response = await chat.sendMessage(functionResponses);
            }
            
            const aiEndTime = Date.now();
            const responseText = response.response.text();
            
            // Add AI response to history (saved to Firestore)
            await addToHistory(req.user.email, 'assistant', responseText);
            
            console.log(`✅ [${requestId}] Gemini response received in ${aiEndTime - aiStartTime}ms`);
            console.log(`   Function calls made: ${functionCallCount}`);
            console.log(`   Response: "${responseText}"`);
            console.log(`   Length: ${responseText.length} characters`);

            // Convert to speech using STREAMING TTS (parallel processing)
            console.log(`\n🔊 [${requestId}] Converting to speech with streaming TTS...`);
            console.log(`   TTS Service: Google Cloud TTS API (Premium Neural2 Voice)`);
            console.log(`   Strategy: STREAMING - Process sentences in parallel`);
            
            // Get voice configuration from request body
            const voiceConfig = req.body.voiceConfig || {};
            console.log(`   Voice Config:`, voiceConfig);
            
            const outputAudioPath = path.join(__dirname, '../../../public', 'response-audio.mp3');
            const ttsStartTime = Date.now();
            
            // Use streaming TTS for faster perceived response
            const ttsPromise = audioService.streamingTextToSpeech(responseText, outputAudioPath, voiceConfig);
            
            // Wait for TTS to complete
            await ttsPromise;
            const ttsEndTime = Date.now();
            
            console.log(`✅ [${requestId}] TTS completed in ${ttsEndTime - ttsStartTime}ms`);
            const audioStats = fs.statSync(outputAudioPath);
            console.log(`   Audio file size: ${audioStats.size} bytes (${(audioStats.size / 1024).toFixed(2)} KB)`);

            console.log(`\n✨ [${requestId}] CHAT REQUEST COMPLETED`);
            console.log(`   Total time: ${Date.now() - requestId}ms`);
            console.log('='.repeat(80) + '\n');

            res.json({
                response: responseText,
                audioUrl: '/response-audio.mp3'
            });
        }

    } catch (error) {
        console.error(`\n❌ [${requestId}] ERROR:`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack:`, error.stack);
        console.log('='.repeat(80) + '\n');
        
        if (res.headersSent) {
            // If streaming, send error event
            res.write(`data: ${JSON.stringify({ 
                type: 'error',
                error: error.message 
            })}\n\n`);
            res.end();
        } else {
            res.status(500).json({ 
                error: 'Failed to process message',
                details: error.message 
            });
        }
    }
}

/**
 * Get conversation history
 */
async function getHistory(req, res) {
    try {
        const userEmail = req.user.email;
        const history = await getConversationHistory(userEmail);
        
        res.json({
            messageCount: history.length,
            maxMessages: conversationHistory.MAX_HISTORY_MESSAGES,
            contextMessages: conversationHistory.CONTEXT_MESSAGES,
            messages: history.map(msg => ({
                role: msg.role,
                content: msg.content.substring(0, 200), // Truncate for display
                timestamp: msg.timestamp
            }))
        });
    } catch (error) {
        console.error('Error getting conversation history:', error);
        res.status(500).json({ error: 'Failed to get conversation history' });
    }
}

/**
 * Clear conversation history
 */
async function clearConversationHistory(req, res) {
    try {
        const userEmail = req.user.email;
        await clearHistory(userEmail);
        
        res.json({
            success: true,
            message: 'Conversation history cleared from Firestore'
        });
    } catch (error) {
        console.error('Error clearing conversation history:', error);
        res.status(500).json({ error: 'Failed to clear conversation history' });
    }
}

module.exports = {
    processChat,
    getHistory,
    clearConversationHistory
};
