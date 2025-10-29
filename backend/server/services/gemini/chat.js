/**
 * Gemini Chat Service
 * 
 * Handles conversation management, history formatting, and non-streaming chat operations.
 * 
 * @module backend/server/services/gemini/chat
 */

/**
 * Format conversation history for Gemini API
 * Maps internal history format to Gemini's expected format
 * @param {Array} history - Array of conversation messages
 * @returns {Array} Formatted history for Gemini
 */
function formatHistoryForGemini(history) {
    return history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));
}

/**
 * Start a chat session with history
 * @param {Object} model - Gemini model instance
 * @param {Array} history - Conversation history
 * @returns {Object} Chat session
 */
function startChatSession(model, history = []) {
    const formattedHistory = formatHistoryForGemini(history);
    
    return model.startChat({
        history: formattedHistory
    });
}

/**
 * Send a message in a chat session (non-streaming)
 * @param {Object} chat - Active chat session
 * @param {string|Array} message - Message to send (text or multipart)
 * @returns {Promise<Object>} Chat response
 */
async function sendChatMessage(chat, message) {
    return await chat.sendMessage(message);
}

/**
 * Send a streaming message in a chat session
 * @param {Object} chat - Active chat session
 * @param {string|Array} message - Message to send (text or multipart)
 * @returns {Promise<Object>} Streaming result with .stream and .response
 */
async function sendChatMessageStream(chat, message) {
    return await chat.sendMessageStream(message);
}

/**
 * Extract text from Gemini response
 * @param {Object} response - Gemini response object
 * @returns {string} Response text
 */
function extractResponseText(response) {
    return response.text();
}

/**
 * Check if response contains function calls
 * @param {Object} response - Gemini response object
 * @returns {boolean} True if response has function calls
 */
function hasFunctionCalls(response) {
    if (!response || !response.functionCalls) {
        return false;
    }
    const calls = response.functionCalls();
    return calls && calls.length > 0;
}

/**
 * Get function calls from response
 * @param {Object} response - Gemini response object
 * @returns {Array} Array of function call objects
 */
function getFunctionCalls(response) {
    if (!hasFunctionCalls(response)) {
        return [];
    }
    return response.functionCalls();
}

/**
 * Create function response message for Gemini
 * @param {string} functionName - Name of the function
 * @param {Object} result - Function execution result
 * @param {boolean} success - Whether function executed successfully
 * @returns {Object} Formatted function response
 */
function createFunctionResponse(functionName, result, success = true) {
    return {
        functionResponse: {
            name: functionName,
            response: success ? { result } : { error: result }
        }
    };
}

/**
 * Process audio with Gemini (direct audio-to-response)
 * @param {Object} model - Gemini model instance
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} mimeType - Audio MIME type (e.g., 'audio/webm')
 * @param {string} instruction - Optional instruction text
 * @param {Array} history - Conversation history
 * @returns {Promise<Object>} Chat session with initial response
 */
async function processAudioMessage(model, audioBuffer, mimeType, instruction = '', history = []) {
    const formattedHistory = formatHistoryForGemini(history);
    
    const chat = model.startChat({
        history: formattedHistory
    });
    
    // Convert audio to base64
    const base64Audio = audioBuffer.toString('base64');
    
    // Create message with audio and optional instruction
    const message = [
        {
            inlineData: {
                mimeType: mimeType,
                data: base64Audio
            }
        }
    ];
    
    if (instruction) {
        message.push({ text: instruction });
    }
    
    const response = await chat.sendMessage(message);
    
    return { chat, response: response.response };
}

/**
 * Send message with automatic fallback to 2.5 Flash on 2.0 errors
 * @param {Object} chat - Active chat session
 * @param {string|Array} message - Message to send
 * @param {Object} model - Original Gemini model (for fallback)
 * @param {Array} history - Conversation history (for fallback chat session)
 * @returns {Promise<Object>} Response object with .response and .usedFallback flag
 */
async function sendMessageWithFallback(chat, message, model, history = []) {
    try {
        // Try primary model first
        const response = await chat.sendMessage(message);
        return { response, usedFallback: false, chat };
    } catch (error) {
        // Check if we should fallback to 2.5 Flash
        const { shouldFallbackTo25Flash, createFallbackModel } = require('./client');
        
        if (!shouldFallbackTo25Flash(error)) {
            // Not a fallback-eligible error, rethrow
            throw error;
        }
        
        console.warn(`⚠️  Gemini 2.0 Flash error: ${error.message}`);
        console.log(`🔄 Falling back to Gemini 2.5 Flash...`);
        
        // Create fallback model and restart chat with same history
        const fallbackModel = createFallbackModel(model);
        const formattedHistory = formatHistoryForGemini(history);
        const fallbackChat = fallbackModel.startChat({
            history: formattedHistory
        });
        
        // Retry with fallback model
        const fallbackResponse = await fallbackChat.sendMessage(message);
        console.log(`✅ Fallback successful - using Gemini 2.5 Flash`);
        
        return { 
            response: fallbackResponse, 
            usedFallback: true, 
            fallbackModel: '2.5-flash',
            chat: fallbackChat 
        };
    }
}

module.exports = {
    formatHistoryForGemini,
    startChatSession,
    sendChatMessage,
    sendChatMessageStream,
    extractResponseText,
    hasFunctionCalls,
    getFunctionCalls,
    createFunctionResponse,
    processAudioMessage,
    sendMessageWithFallback
};
