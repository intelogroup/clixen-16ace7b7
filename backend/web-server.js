require('dotenv').config();

// ========================================
// 🔒 ENVIRONMENT VALIDATION - Security First
// ========================================
const { validateEnv } = require('./config/env-validator');

// Validate environment (async to support Secret Manager)
(async () => {
    const envValidation = await validateEnv({ 
        strict: false, // Set to true to fail on warnings in production
        useSecretManager: process.env.USE_SECRET_MANAGER === 'true'
    });

    if (!envValidation.valid) {
        console.error('⚠️  Server starting with environment configuration issues');
        console.error('   Review warnings above and fix before deploying to production\n');
    }
})();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const session = require('express-session');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { VOICE_ASSISTANT_PROMPT } = require('./server/prompts/voice-assistant');

// ========================================
// 📦 CACHE LAYER - Performance Optimization
// ========================================
// Extracted to backend/server/services/cache/
const timezoneCache = require('./server/services/cache/timezone');
const calendarCache = require('./server/services/cache/calendar');
const conversationCache = require('./server/services/cache/conversation');

// ========================================
// 📅 CALENDAR SERVICE - Modularized
// ========================================
// Extracted to backend/server/services/calendar/
const calendarService = require('./server/services/calendar');

// ========================================
// 🎙️ AUDIO SERVICE - Modularized
// ========================================
// Extracted to backend/server/services/audio/
const audioService = require('./server/services/audio');

// ========================================
// 🔐 FIREBASE & AUTH - Modularized
// ========================================
const { initializeFirebase, admin } = require('./config/firebase-config');
const { verifyFirebaseToken } = require('./server/middleware/auth');
const { authRoutes, protectedAuthRoutes, calendarRoutes, chatRoutes, audioRoutes, configRoutes } = require('./api/routes');

// ========================================
// 🔌 WEBSOCKET - Modularized
// ========================================
const { initWebSocketServer, handleGracefulShutdown } = require('./server/websocket');

const app = express();
const PORT = process.env.PORT || 3000; // Main web server port (configurable via PORT env var)

// Imported cache functions (aliases for backward compatibility)
const {
    getCachedCalendarQuery,
    cacheCalendarQuery,
    invalidateCalendarCache
} = calendarCache;

const {
    getConversationHistory,
    addToHistory,
    formatHistoryForGemini,
    clearHistory
} = conversationCache;

// Calendar service functions
const {
    getCalendarClient,
    generateAuthUrl,
    handleOAuthCallback,
    calendarFunctions,
    executeFunction: executeCalendarFunction,
    analyzeFunctionDependencies: analyzeCalendarFunctionDependencies,
    executeParallelFunctions: executeCalendarParallelFunctions
} = calendarService;

// Wrappers to maintain existing function signatures in web-server.js
const analyzeFunctionDependencies = analyzeCalendarFunctionDependencies;

async function executeParallelFunctions(functionCalls, userEmail) {
    return executeCalendarParallelFunctions(functionCalls, userEmail, executeCalendarFunction);
}

// Wrapper for getCachedTimezone to maintain existing signature
async function getCachedTimezone(userEmail) {
    return timezoneCache.getCachedTimezone(userEmail, getCalendarClient);
}

// Wrapper for transcribeAudioAsync to maintain existing signature
async function transcribeAudioAsync(audioBuffer, userEmail, mimeType = 'audio/webm') {
    return audioService.transcribeAudioAsync(
        audioBuffer,
        userEmail,
        mimeType,
        genAI,
        addToHistory,
        getConversationHistory
    );
}

// ========================================
// 🛡️ CORS CONFIGURATION - Environment-Aware Security
// ========================================
const isDevelopment = process.env.NODE_ENV !== 'production';
const PRODUCTION_URL = process.env.PRODUCTION_URL; // e.g., 'https://yourdomain.com'

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin) {
            // In production, be more strict - only allow no-origin in dev
            if (isDevelopment) {
                return callback(null, true);
            }
            // In production, log and optionally reject no-origin requests
            console.warn('⚠️  Request with no origin in production');
            return callback(null, true); // Can set to false to reject
        }
        
        // Build allowed origins list based on environment
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:3001', // Next.js dev server
            'https://clixen-cc7b5.firebaseapp.com',
            'https://clixen-cc7b5.web.app'
        ];
        
        // Add production URL if configured
        if (PRODUCTION_URL) {
            allowedOrigins.push(PRODUCTION_URL);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else if (isDevelopment) {
            // In development, allow all origins but log them
            console.log('🔓 Dev mode: Allowing origin:', origin);
            callback(null, true);
        } else {
            // In production, reject unauthorized origins
            console.warn('🚫 Rejected CORS request from:', origin);
            callback(new Error(`CORS policy: Origin ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: isDevelopment ? 0 : 86400 // Cache preflight for 24h in production
};

// Apply CORS middleware
app.use(cors(corsOptions));
console.log(`✅ CORS configured for ${isDevelopment ? 'development' : 'production'} mode`);

// ========================================
// 🛡️ SECURITY MIDDLEWARE - Helmet
// ========================================
// Apply Helmet security headers early in the middleware chain
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.gstatic.com", "https://apis.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "wss:", "ws:", "https://generativelanguage.googleapis.com", "https://speech.googleapis.com"],
            mediaSrc: ["'self'", "blob:"],
            workerSrc: ["'self'", "blob:"],
            frameSrc: ["'self'", "https://accounts.google.com"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for audio workers
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resources for audio
}));
console.log('✅ Helmet security headers enabled (XSS, clickjacking, MIME sniffing protection)');

// Enable compression for all responses (30-70% bandwidth reduction)
app.use(compression({
    level: 6, // Compression level (0-9, 6 is good balance)
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) {
            return false;
        }
        // Compress everything else
        return compression.filter(req, res);
    }
}));
console.log('✅ Compression middleware enabled (30-70% bandwidth reduction)');

// Handle preflight requests
app.options('*', cors(corsOptions));

// Initialize Firebase Admin SDK (centralized configuration)
try {
    initializeFirebase();
    console.log('✅ Firebase Admin SDK initialized from config');
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.warn('⚠️  Authentication middleware will not work without Firebase Admin SDK');
}

// Directory to store per-user tokens (simple file store for local/dev)
const TOKENS_DIR = path.join(__dirname, 'credentials', 'tokens');
if (!fs.existsSync(TOKENS_DIR)) fs.mkdirSync(TOKENS_DIR, { recursive: true });

// Helper to clear conversation history for a user (now imported from conversationCache module)
// function clearHistory(userEmail) { ... } - moved to backend/server/services/cache/conversation.js

// NOTE: Multer configuration moved to backend/api/routes/audio.js

// Initialize Gemini / API keys
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.FIREBASE_API_KEY;
if (!apiKey) {
    console.error('⚠️  Warning: No GEMINI_API_KEY / GOOGLE_API_KEY / FIREBASE_API_KEY found in environment.');
    console.warn('Some AI or Firebase features may not be available. Set GEMINI_API_KEY or FIREBASE_API_KEY in your .env for local testing.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

// Pre-warm API connections on startup
let apiConnectionsPrewarmed = false;
async function prewarmAPIConnections() {
    if (apiConnectionsPrewarmed) return;
    
    console.log('🔥 Pre-warming API connections...');
    const startTime = Date.now();
    
    try {
        // Pre-warm Gemini API with a simple request
        const warmupModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const warmupPromise = warmupModel.generateContent('ping').catch(e => 
            console.log('   ⚠️  Gemini warmup failed:', e.message)
        );
        
        // Pre-warm Google Calendar API (if we have tokens)
        const tokenFiles = fs.existsSync(TOKENS_DIR) ? fs.readdirSync(TOKENS_DIR) : [];
        const calendarWarmupPromises = tokenFiles.slice(0, 2).map(async (file) => {
            try {
                const userEmail = file.replace('.json', '');
                const calendar = await getCalendarClient(userEmail);
                await calendar.calendarList.list({ maxResults: 1 });
                console.log(`   ✅ Calendar API warmed for ${userEmail}`);
            } catch (e) {
                // Silently fail - token might be expired
            }
        });
        
        // Wait for all warmup requests
        await Promise.all([warmupPromise, ...calendarWarmupPromises]);
        
        const duration = Date.now() - startTime;
        console.log(`✅ API connections pre-warmed in ${duration}ms`);
        apiConnectionsPrewarmed = true;
    } catch (error) {
        console.log('⚠️  API warmup failed:', error.message);
    }
}

// Start pre-warming after a short delay (let server start first)
setTimeout(() => prewarmAPIConnections(), 2000);

// Read Firebase envs (for future Firestore integration)
const firebaseApiKey = process.env.FIREBASE_API_KEY;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
if (firebaseApiKey) {
    console.log('🔑 Firebase API key loaded from env (masked):', firebaseApiKey.substring(0, Math.min(8, firebaseApiKey.length)) + '...');
}
if (firebaseProjectId) {
    console.log('🔧 Firebase project id loaded from env:', firebaseProjectId);
}

// Calendar functions are now imported from calendar service module
// See: backend/server/services/calendar/functions.js

// Create model with function calling enabled
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    tools: [{ functionDeclarations: calendarFunctions }],
    systemInstruction: VOICE_ASSISTANT_PROMPT
});

// OAuth client and function dependencies are now in calendar service
// See: backend/server/services/calendar/client.js and parallel.js

// ========================================
// 🔒 SESSION CONFIGURATION - Secure Cookies
// ========================================
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    name: 'clixen.sid', // Custom name instead of default 'connect.sid'
    resave: false,
    saveUninitialized: false, // Don't create session until something stored (GDPR-friendly)
    cookie: {
        secure: isProduction, // Require HTTPS in production
        httpOnly: true, // Prevent XSS attacks
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
        domain: isProduction && process.env.PRODUCTION_URL 
            ? new URL(process.env.PRODUCTION_URL).hostname 
            : undefined
    },
    proxy: isProduction // Trust proxy if behind reverse proxy in production
}));
console.log(`✅ Session configured with ${isProduction ? 'secure' : 'development'} cookies`);

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// ========================================
// 🔧 INJECT DEPENDENCIES FOR ROUTES
// ========================================
// Store Gemini instances on app for access by controllers
app.set('genAI', genAI);
app.set('geminiModel', model);

// ========================================
// �️ RATE LIMITERS - DDoS and Abuse Protection
// ========================================
const { 
    apiLimiter, 
    authLimiter, 
    calendarLimiter, 
    chatLimiter,
    wsConnectionLimiter 
} = require('./server/middleware/rate-limiter');

// Apply general API rate limiter to all /api routes
app.use('/api', apiLimiter);
console.log('✅ Rate limiters configured (API, Auth, Calendar, Chat)');

// ========================================
// 📍 MOUNT MODULAR ROUTES
// ========================================
// Public routes (no authentication required, but rate limited)
app.use('/auth', authLimiter, authRoutes); // Stricter rate limit for auth
app.use('/api/config', configRoutes); // Configuration endpoint (public)

// Protected routes (authentication + rate limiting)
app.use(verifyFirebaseToken, protectedAuthRoutes); // Protected auth routes
app.use(verifyFirebaseToken, calendarLimiter, calendarRoutes); // Calendar with specific limiter
app.use(verifyFirebaseToken, chatLimiter, chatRoutes); // Chat with specific limiter
app.use(verifyFirebaseToken, audioRoutes); // Audio uses general API limiter

// Explicit route for audio file with proper headers
app.get('/response-audio.mp3', (req, res) => {
    const audioPath = path.join(__dirname, 'public', 'response-audio.mp3');
    
    if (fs.existsSync(audioPath)) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(audioPath);
    } else {
        console.error('❌ Audio file not found:', audioPath);
        res.status(404).send('Audio file not found');
    }
});

// ========================================
// 📍 HTTP ROUTES (Modularized)
// ========================================
// Routes have been extracted to backend/api/routes/
// - auth.js: OAuth flow (/auth, /api/auth/callback/google, /logout)
// - calendar.js: Calendar status (/api/calendar-status)
// - chat.js: Text chat (/api/chat, /api/conversation-history, /api/clear-history)
// - audio.js: Audio processing (/api/process-audio, /api/voices)
// See backend/api/controllers/ for business logic

// Health check (public - no auth required)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================================
// 🔧 LEGACY ROUTE HANDLERS (To be removed)
// ========================================
// The following code is kept temporarily for WebSocket handlers
// Will be fully removed when WebSocket logic is extracted

// Configure multer for legacy WebSocket usage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit
    }
});

// Wrapper functions for WebSocket handlers (to be moved to websocket module)
async function streamingTextToSpeech(text, outputPath, voiceConfig = {}) {
    return audioService.streamingTextToSpeech(text, outputPath, voiceConfig);
}

async function textToSpeechGoogle(text, outputPath, voiceConfig = {}) {
    return audioService.textToSpeechGoogle(text, outputPath, voiceConfig);
}

// NOTE: HTTP routes have been moved to backend/api/routes/ and backend/api/controllers/
// The above wrapper functions are kept temporarily for WebSocket handlers

// Start server with extended timeout for large audio uploads
const serverStartTime = Date.now();
const server = app.listen(PORT, () => {
    const startupDuration = Date.now() - serverStartTime;
    console.log('\n' + '='.repeat(60));
    console.log('🎙️  Clixen - AI Calendar Assistant');
    console.log('='.repeat(60));
    console.log(`\n✅ Server running at http://localhost:${PORT}`);
    console.log(`   ⚡ Startup time: ${startupDuration}ms`);
    console.log(`   📅 Started: ${new Date().toLocaleString()}`);
    console.log(`   🖥️  Node version: ${process.version}`);
    console.log(`   💾 Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`);
    console.log(`\n📱 Open in browser: http://localhost:${PORT}`);
    console.log('\n💡 Features:');
    console.log('   • Voice-activated calendar control');
    console.log('   • REAL Google Calendar API integration');
    console.log('   • Create, list, and delete events');
    console.log('   • Auto/Manual send modes');
    console.log('   • Full conversation history');
    console.log('   • WebSocket support for real-time streaming 🚀');
    console.log('\n🔧 Available Commands:');
    console.log('   • "What time is it?"');
    console.log('   • "What\'s on my calendar today?"');
    console.log('   • "Schedule a meeting with David at 10pm tonight"');
    console.log('   • "Show my events this week"');
    console.log('\n⏱️  Server Configuration:');
    console.log('   • Request timeout: 5 minutes (300s)');
    console.log('   • Keep-alive timeout: 305s');
    console.log('   • Headers timeout: 310s');
    console.log(`\n🔌 WebSocket server will start on ws://localhost:${PORT}`);
    console.log('\n' + '='.repeat(60) + '\n');
});

// Set timeout to 5 minutes (300000ms) to handle large audio files and long AI processing
server.timeout = 300000;
server.keepAliveTimeout = 305000; // Slightly higher than timeout
server.headersTimeout = 310000; // Even higher to ensure proper cleanup

// ============================================================================
// WebSocket Server for Real-Time Streaming
// ============================================================================
// Initialize WebSocket server with required dependencies
const wss = initWebSocketServer(server, {
    admin,
    transcribeAudioAsync,
    textToSpeechGoogle,
    getConversationHistory,
    addToHistory,
    model,
    analyzeFunctionDependencies,
    executeParallelFunctions
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    handleGracefulShutdown(wss);
});
