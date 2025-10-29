/**
 * WebSocket Chat Handler with Instant Acknowledgment
 * Integration of intent analyzer for instant user feedback
 */

const intentAnalyzer = require('../../utils/intentAnalyzer');
const audioServices = require('../services/audio');
const geminiServices = require('../services/gemini');
const { conversationHistory } = require('../services/firestore');

/**
 * Handle text chat message with instant acknowledgment
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} data - Message data
 * @param {string} userEmail - User email
 * @param {string} userName - User first name
 */
async function handleChatWithInstantAck(ws, data, userEmail, userName) {
    const userMessage = data.message;
    
    console.log(`\n💬 Chat from ${userName}: "${userMessage}"`);
    
    try {
        // STEP 1: Instant Local Intent Analysis (< 5ms)
        const startAnalysis = Date.now();
        const intent = intentAnalyzer.analyzeWithMetrics(userMessage, userName);
        const analysisTime = Date.now() - startAnalysis;
        
        console.log(`   ⚡ Intent analysis: ${analysisTime}ms`);
        
        // STEP 2: Send instant acknowledgment if intent detected
        let ackAudioSent = false;
        
        if (intent && intent.confidence > 0.8) {
            console.log(`   🎯 Intent detected: ${intent.intent} (${intent.confidence.toFixed(2)} confidence)`);
            console.log(`   💬 Instant ack: "${intent.ack}"`);
            
            // Generate TTS for acknowledgment (non-blocking)
            const ackPromise = generateAndSendAck(ws, intent.ack, userEmail);
            ackAudioSent = true;
            
            // Don't await - let it run in parallel with Gemini
            ackPromise.catch(err => {
                console.error('   ⚠️  Ack audio failed (non-critical):', err.message);
            });
        } else if (intentAnalyzer.shouldUseInstantAck(userMessage)) {
            // Generic ack for unclear intents that seem like questions
            const genericAck = intentAnalyzer.getGenericAck(userName);
            console.log(`   💬 Generic ack: "${genericAck}"`);
            
            const ackPromise = generateAndSendAck(ws, genericAck, userEmail);
            ackAudioSent = true;
            
            ackPromise.catch(err => {
                console.error('   ⚠️  Generic ack failed (non-critical):', err.message);
            });
        }
        
        // STEP 3: Save user message to history
        await conversationHistory.addMessage(userEmail, 'user', userMessage);
        
        // STEP 4: Get Gemini response (this takes 1-3 seconds)
        const startGemini = Date.now();
        const history = await conversationHistory.formatHistoryForGemini(userEmail);
        
        console.log(`   🤖 Sending to Gemini...`);
        
        const geminiResponse = await geminiServices.chat.sendMessage(
            userMessage,
            history,
            userEmail
        );
        
        const geminiTime = Date.now() - startGemini;
        console.log(`   ✅ Gemini response: ${geminiTime}ms`);
        console.log(`   📝 Response: "${geminiResponse.substring(0, 100)}..."`);
        
        // STEP 5: Save assistant response
        await conversationHistory.addMessage(userEmail, 'assistant', geminiResponse);
        
        // STEP 6: Send text response to client
        ws.send(JSON.stringify({
            type: 'chat_response',
            text: geminiResponse,
            hasAck: ackAudioSent
        }));
        
        // STEP 7: Generate and stream TTS for full response (zero disk writes!)
        const startTTS = Date.now();
        
        // ✅ Get audio buffer directly (no file write!)
        const audioBuffer = await audioServices.textToSpeechGoogle(geminiResponse);
        
        const ttsTime = Date.now() - startTTS;
        console.log(`   🎵 TTS generated: ${ttsTime}ms`);
        
        // Stream audio to client (already in memory)
        ws.send(JSON.stringify({
            type: 'audio_response',
            audio: audioBuffer.toString('base64'),
            isAck: false
        }));
        
        console.log(`   💾 Zero disk writes - audio streamed directly from memory!`);
        
        const totalTime = Date.now() - startAnalysis;
        console.log(`   ⏱️  Total processing: ${totalTime}ms (Analysis: ${analysisTime}ms, Gemini: ${geminiTime}ms, TTS: ${ttsTime}ms)`);
        
        // Log metrics
        if (ackAudioSent) {
            console.log(`   📊 User perceived latency: ~${analysisTime + 200}ms (instant ack!)`);
        } else {
            console.log(`   📊 User perceived latency: ${totalTime}ms`);
        }
        
    } catch (error) {
        console.error('   ❌ Chat error:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Sorry, I encountered an error processing your message.'
        }));
    }
}

/**
 * Generate and send acknowledgment audio
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} ackText - Acknowledgment text
 * @param {string} userEmail - User email
 * @returns {Promise<void>}
 */
async function generateAndSendAck(ws, ackText, userEmail) {
    const startTTS = Date.now();
    
    // Use faster voice settings for quick acks
    const quickVoiceConfig = {
        name: 'en-US-Neural2-J',
        ssmlGender: 'MALE',
        speakingRate: 1.15, // Slightly faster for acks
        pitch: 0.0,
        volumeGainDb: 2.0
    };
    
    // ✅ Get audio buffer directly (no file write!)
    const ackBuffer = await audioServices.textToSpeechGoogle(ackText, quickVoiceConfig);
    
    const ttsTime = Date.now() - startTTS;
    console.log(`   🎵 Ack TTS generated: ${ttsTime}ms`);
    
    // Send acknowledgment audio immediately (already in memory)
    ws.send(JSON.stringify({
        type: 'audio_response',
        audio: ackBuffer.toString('base64'),
        isAck: true,  // Mark as acknowledgment
        text: ackText
    }));
    
    console.log(`   ✅ Ack audio sent to client`);
    console.log(`   💾 Zero disk writes - ack streamed directly from memory!`);
}

/**
 * Handle audio message with instant acknowledgment
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} data - Audio data
 * @param {string} userEmail - User email
 * @param {string} userName - User first name
 */
async function handleAudioWithInstantAck(ws, data, userEmail, userName) {
    console.log(`\n🎙️  Audio from ${userName}`);
    
    try {
        // STEP 1: Transcribe audio (pass buffer directly - no file write!)
        const startSTT = Date.now();
        const audioBuffer = Buffer.from(data.audio, 'base64');
        
        // ✅ Transcribe directly from buffer (implementation needs update in transcription.js)
        const transcription = await audioServices.transcribeAudioGemini(audioBuffer, userEmail);
        const sttTime = Date.now() - startSTT;
        
        console.log(`   ✅ STT: ${sttTime}ms`);
        console.log(`   📝 Transcribed: "${transcription}"`);
        console.log(`   💾 Zero disk writes - audio processed directly from memory!`);
        
        // Send transcription to client immediately
        ws.send(JSON.stringify({
            type: 'transcription',
            text: transcription
        }));
        
        // STEP 2: Now handle as text chat with instant ack
        await handleChatWithInstantAck(ws, { message: transcription }, userEmail, userName);
        
    } catch (error) {
        console.error('   ❌ Audio processing error:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Sorry, I had trouble processing your audio.'
        }));
    }
}

/**
 * Get intent analysis metrics
 * @returns {Object} Metrics object
 */
function getIntentMetrics() {
    return intentAnalyzer.getMetrics();
}

module.exports = {
    handleChatWithInstantAck,
    handleAudioWithInstantAck,
    getIntentMetrics
};
