/**
 * Gemini Streaming Service
 * 
 * Handles Server-Sent Events (SSE) streaming, chunk handling, and streaming function calls.
 * 
 * @module backend/server/services/gemini/streaming
 */

/**
 * Send SSE event to client
 * @param {Object} res - Express response object
 * @param {string} type - Event type
 * @param {Object} data - Event data
 */
function sendSSEEvent(res, type, data) {
    res.write(`data: ${JSON.stringify({ 
        type,
        ...data,
        timestamp: Date.now()
    })}\n\n`);
}

/**
 * Setup SSE headers for streaming response
 * @param {Object} res - Express response object
 */
function setupSSEHeaders(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
}

/**
 * Stream text chunks from Gemini response
 * @param {AsyncIterable} stream - Gemini response stream
 * @param {Object} res - Express response object
 * @returns {Promise<string>} Full accumulated response text
 */
async function streamTextChunks(stream, res) {
    let fullResponse = '';
    
    for await (const chunk of stream) {
        try {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            
            // Send chunk to client immediately
            sendSSEEvent(res, 'chunk', { text: chunkText });
            
            console.log(`   📤 Streamed chunk: "${chunkText.substring(0, 50)}..."`);
        } catch (error) {
            console.error('   ⚠️  Error processing chunk:', error.message);
        }
    }
    
    return fullResponse;
}

/**
 * Handle function calls during streaming
 * @param {Object} chat - Active chat session
 * @param {Object} response - Current response
 * @param {string} userEmail - User email for authentication
 * @param {Function} executeFunction - Function executor
 * @param {Function} processGroupedFunctionCalls - Function to process grouped calls
 * @param {Function} analyzeFunctionDependencies - Function to analyze dependencies
 * @param {Object} res - Express response object
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<Object>} Full response text and function call count
 */
async function handleStreamingFunctionCalls(
    chat, 
    response, 
    userEmail, 
    executeFunction, 
    processGroupedFunctionCalls,
    analyzeFunctionDependencies,
    res, 
    requestId = ''
) {
    let fullResponse = '';
    let functionCallCount = 0;
    let currentResponse = response;
    
    while (currentResponse && currentResponse.functionCalls) {
        const functionCalls = currentResponse.functionCalls();
        if (!functionCalls || functionCalls.length === 0) {
            break;
        }
        
        console.log(`\n   🔧 [${requestId}] Function calls detected: ${functionCalls.length}`);
        
        // Notify client about function execution
        sendSSEEvent(res, 'function_call', { 
            functions: functionCalls.map(f => f.name)
        });
        
        // Group functions for parallel execution
        const groups = analyzeFunctionDependencies(functionCalls);
        console.log(`   ⚡ Executing in ${groups.length} parallel group(s)`);
        
        const { functionResponses, totalFunctionCalls } = await processGroupedFunctionCalls(
            groups, 
            userEmail, 
            executeFunction
        );
        
        functionCallCount += totalFunctionCalls;
        
        // Send function results back and stream the response
        const nextResult = await chat.sendMessageStream(functionResponses);
        
        fullResponse = ''; // Reset for next response
        for await (const chunk of nextResult.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            
            sendSSEEvent(res, 'chunk', { text: chunkText });
        }
        
        currentResponse = await nextResult.response;
    }
    
    return { fullResponse, functionCallCount };
}

/**
 * Stream Gemini chat response with function calling support
 * @param {Object} chat - Active chat session
 * @param {string|Array} message - Message to send
 * @param {Object} res - Express response object
 * @param {string} userEmail - User email for authentication
 * @param {Function} executeFunction - Function executor
 * @param {Function} processGroupedFunctionCalls - Function to process grouped calls
 * @param {Function} analyzeFunctionDependencies - Function to analyze dependencies
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<Object>} Streaming result
 */
async function streamChatResponse(
    chat, 
    message, 
    res, 
    userEmail, 
    executeFunction,
    processGroupedFunctionCalls,
    analyzeFunctionDependencies,
    requestId = ''
) {
    console.log(`\n🌊 [${requestId}] STREAMING MODE ENABLED`);
    
    try {
        const startTime = Date.now();
        
        // Send initial message with streaming
        const result = await chat.sendMessageStream(message);
        
        // Stream chunks as they arrive
        const fullResponse = await streamTextChunks(result.stream, res);
        
        // Get final response to check for function calls
        const response = await result.response;
        
        // Handle function calls if any
        const { fullResponse: finalResponse, functionCallCount } = await handleStreamingFunctionCalls(
            chat,
            response,
            userEmail,
            executeFunction,
            processGroupedFunctionCalls,
            analyzeFunctionDependencies,
            res,
            requestId
        );
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ [${requestId}] Streaming complete in ${duration}ms`);
        console.log(`   Function calls made: ${functionCallCount}`);
        console.log(`   Final response length: ${(finalResponse || fullResponse).length} characters`);
        
        // Send completion event
        sendSSEEvent(res, 'done', {
            fullText: finalResponse || fullResponse,
            duration,
            functionCalls: functionCallCount
        });
        
        res.end();
        
        return {
            success: true,
            fullText: finalResponse || fullResponse,
            duration,
            functionCallCount
        };
        
    } catch (error) {
        console.error(`❌ [${requestId}] Streaming error:`, error);
        sendSSEEvent(res, 'error', { error: error.message });
        res.end();
        
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    sendSSEEvent,
    setupSSEHeaders,
    streamTextChunks,
    handleStreamingFunctionCalls,
    streamChatResponse
};
