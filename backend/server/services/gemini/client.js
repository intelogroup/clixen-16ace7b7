/**
 * Gemini AI Client Service
 * 
 * Handles GoogleGenerativeAI initialization, model creation with function calling,
 * warmup logic, and configuration management.
 * 
 * @module backend/server/services/gemini/client
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Initialize Gemini client with API key
 * @param {string} apiKey - Google API key for Gemini
 * @returns {GoogleGenerativeAI} Initialized Gemini client
 */
function initializeGeminiClient(apiKey) {
    if (!apiKey) {
        console.warn('⚠️  No API key provided for Gemini client initialization');
        return new GoogleGenerativeAI('');
    }
    
    console.log('✅ Gemini client initialized');
    return new GoogleGenerativeAI(apiKey);
}

/**
 * Create a Gemini model with function calling support
 * @param {GoogleGenerativeAI} genAI - Initialized Gemini client
 * @param {Object} options - Model configuration options
 * @param {string} options.modelName - Name of the model (default: gemini-2.0-flash-exp)
 * @param {Array} options.functionDeclarations - Function declarations for function calling
 * @param {string} options.systemInstruction - System instruction for the model
 * @returns {Object} Configured Gemini model with fallback support
 */
function createModelWithFunctions(genAI, options = {}) {
    const {
        modelName = 'gemini-2.0-flash-exp',
        functionDeclarations = [],
        systemInstruction = ''
    } = options;

    const config = {
        model: modelName
    };

    // Add function calling if declarations provided
    if (functionDeclarations.length > 0) {
        config.tools = [{ functionDeclarations }];
    }

    // Add system instruction if provided
    if (systemInstruction) {
        config.systemInstruction = systemInstruction;
    }

    console.log(`✅ Created Gemini model: ${modelName}`);
    if (functionDeclarations.length > 0) {
        console.log(`   📋 Function calling enabled with ${functionDeclarations.length} declarations`);
    }

    const primaryModel = genAI.getGenerativeModel(config);
    
    // Store fallback model info for error recovery
    primaryModel._fallbackModelName = 'gemini-2.5-flash-latest';
    primaryModel._fallbackConfig = {
        ...config,
        model: 'gemini-2.5-flash-latest'
    };
    primaryModel._genAI = genAI;
    
    return primaryModel;
}

/**
 * Pre-warm Gemini API connections with a simple request
 * @param {GoogleGenerativeAI} genAI - Initialized Gemini client
 * @param {string} modelName - Name of the model to warm up (default: gemini-2.0-flash-exp)
 * @returns {Promise<number>} Duration of warmup in milliseconds
 */
async function prewarmGeminiAPI(genAI, modelName = 'gemini-2.0-flash-exp') {
    console.log('🔥 Pre-warming Gemini API...');
    const startTime = Date.now();
    
    try {
        const warmupModel = genAI.getGenerativeModel({ model: modelName });
        await warmupModel.generateContent('ping');
        
        const duration = Date.now() - startTime;
        console.log(`✅ Gemini API pre-warmed in ${duration}ms`);
        return duration;
    } catch (error) {
        console.log('⚠️  Gemini warmup failed:', error.message);
        return Date.now() - startTime;
    }
}

/**
 * Get API key from environment variables
 * Priority: GEMINI_API_KEY > GOOGLE_API_KEY > FIREBASE_API_KEY
 * @returns {string|null} API key or null if not found
 */
function getAPIKeyFromEnv() {
    const apiKey = process.env.GEMINI_API_KEY || 
                   process.env.GOOGLE_API_KEY || 
                   process.env.FIREBASE_API_KEY;
    
    if (!apiKey) {
        console.warn('⚠️  No GEMINI_API_KEY / GOOGLE_API_KEY / FIREBASE_API_KEY found in environment.');
        return null;
    }
    
    return apiKey;
}

/**
 * Create fallback model for error recovery
 * @param {Object} primaryModel - Primary Gemini model that failed
 * @returns {Object} Fallback Gemini model (2.5 Flash)
 */
function createFallbackModel(primaryModel) {
    if (!primaryModel._genAI || !primaryModel._fallbackConfig) {
        throw new Error('Model does not support fallback - missing configuration');
    }
    
    console.log(`🔄 Creating fallback model: ${primaryModel._fallbackModelName}`);
    const fallbackModel = primaryModel._genAI.getGenerativeModel(primaryModel._fallbackConfig);
    
    // Copy fallback info to new model for potential future fallbacks
    fallbackModel._fallbackModelName = primaryModel._fallbackModelName;
    fallbackModel._fallbackConfig = primaryModel._fallbackConfig;
    fallbackModel._genAI = primaryModel._genAI;
    
    return fallbackModel;
}

/**
 * Check if error should trigger fallback to 2.5 Flash
 * @param {Error} error - Error from Gemini API
 * @returns {boolean} True if should fallback to 2.5 Flash
 */
function shouldFallbackTo25Flash(error) {
    const errorMessage = error?.message || '';
    
    // Common 2.0 Flash experimental errors that 2.5 handles better
    const fallbackTriggers = [
        'function response parts',           // Function calling mismatch
        'function call parts',                // Function calling errors
        '400 Bad Request',                    // General 400 errors from 2.0-exp
        'RESOURCE_EXHAUSTED',                 // Rate limiting on experimental
        'Model not found',                    // Experimental model unavailable
        'UNAVAILABLE'                         // Service temporarily down
    ];
    
    return fallbackTriggers.some(trigger => errorMessage.includes(trigger));
}

module.exports = {
    initializeGeminiClient,
    createModelWithFunctions,
    prewarmGeminiAPI,
    getAPIKeyFromEnv,
    createFallbackModel,
    shouldFallbackTo25Flash
};
