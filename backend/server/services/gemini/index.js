/**
 * Gemini Services - Main Export Module
 * 
 * Unified exports for all Gemini AI services including client initialization,
 * chat operations, function calling, and streaming support.
 * 
 * @module backend/server/services/gemini
 */

const client = require('./client');
const chat = require('./chat');
const functions = require('./functions');
const streaming = require('./streaming');

module.exports = {
    // Client management
    initializeGeminiClient: client.initializeGeminiClient,
    createModelWithFunctions: client.createModelWithFunctions,
    prewarmGeminiAPI: client.prewarmGeminiAPI,
    getAPIKeyFromEnv: client.getAPIKeyFromEnv,
    createFallbackModel: client.createFallbackModel,
    shouldFallbackTo25Flash: client.shouldFallbackTo25Flash,
    
    // Chat operations
    formatHistoryForGemini: chat.formatHistoryForGemini,
    startChatSession: chat.startChatSession,
    sendChatMessage: chat.sendChatMessage,
    sendChatMessageStream: chat.sendChatMessageStream,
    extractResponseText: chat.extractResponseText,
    hasFunctionCalls: chat.hasFunctionCalls,
    getFunctionCalls: chat.getFunctionCalls,
    createFunctionResponse: chat.createFunctionResponse,
    processAudioMessage: chat.processAudioMessage,
    sendMessageWithFallback: chat.sendMessageWithFallback,
    
    // Function calling
    analyzeFunctionDependencies: functions.analyzeFunctionDependencies,
    executeParallelFunctions: functions.executeParallelFunctions,
    processGroupedFunctionCalls: functions.processGroupedFunctionCalls,
    handleFunctionCalls: functions.handleFunctionCalls,
    
    // Streaming
    sendSSEEvent: streaming.sendSSEEvent,
    setupSSEHeaders: streaming.setupSSEHeaders,
    streamTextChunks: streaming.streamTextChunks,
    handleStreamingFunctionCalls: streaming.handleStreamingFunctionCalls,
    streamChatResponse: streaming.streamChatResponse
};
