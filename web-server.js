require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const https = require('https');
const session = require('express-session');
const admin = require('firebase-admin');
const cors = require('cors');
const textToSpeech = require('@google-cloud/text-to-speech');
const compression = require('compression');
const WebSocket = require('ws');

// ========================================
// 📦 CACHE LAYER - Performance Optimization
// ========================================
// Extracted to backend/server/services/cache/
const timezoneCache = require('./backend/server/services/cache/timezone');
const calendarCache = require('./backend/server/services/cache/calendar');
const conversationCache = require('./backend/server/services/cache/conversation');

// ========================================
// 📅 CALENDAR SERVICE - Modularized
// ========================================
// Extracted to backend/server/services/calendar/
const calendarService = require('./backend/server/services/calendar');

// ========================================
// 🎙️ AUDIO SERVICE - Modularized
// ========================================
// Extracted to backend/server/services/audio/
const audioService = require('./backend/server/services/audio');

// ========================================
// 🔐 MIDDLEWARE & ROUTES - Modularized
// ========================================
const { verifyFirebaseToken } = require('./backend/server/middleware/auth');
const { authRoutes, calendarRoutes, chatRoutes, audioRoutes } = require('./backend/api/routes');

// ========================================
// 🔌 WEBSOCKET - Modularized
// ========================================
const { initWebSocketServer, handleGracefulShutdown } = require('./backend/server/websocket');

const app = express();
const PORT = 3001; // Changed from 3000 to avoid conflict with other services

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

// CORS Configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow localhost and your domain
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'https://clixen-cc7b5.firebaseapp.com',
            'https://clixen-cc7b5.web.app'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all origins in development
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS middleware
app.use(cors(corsOptions));

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

// Initialize Firebase Admin SDK
try {
    const serviceAccount = JSON.parse(fs.readFileSync('./backend/credentials/firebase-service-account.json', 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.warn('⚠️  Authentication middleware will not work without Firebase Admin SDK');
}

// Directory to store per-user tokens (simple file store for local/dev)
const TOKENS_DIR = path.join(__dirname, 'tokens');
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
    systemInstruction: `<clixen_assistant>
  <identity>
    <name>Clixen</name>
    <role>Professional AI Voice Assistant for Calendar Management</role>
    <capabilities>
      <capability>REAL, ACTIVE access to Google Calendar API</capability>
      <capability>CREATE, READ, UPDATE, DELETE calendar events</capability>
      <capability>ACTUAL calendar modifications (not simulated)</capability>
    </capabilities>
  </identity>

  <communication_style>
    <medium>VOICE - Your responses are converted to speech via Text-to-Speech</medium>
    
    <formatting_rules>
      <rule>Write in PLAIN TEXT only - no markdown, no formatting, no symbols</rule>
      <rule>NEVER use: ** _ * # - • bullets or any visual formatting</rule>
      <rule>NEVER use emojis (😊 📅 ✅ etc.) - they don't translate to speech</rule>
      <rule>NO special characters for decoration (@, *, #, ~, etc.)</rule>
    </formatting_rules>
    
    <speech_style>
      <rule>Write EXACTLY as you would speak out loud in conversation</rule>
      <rule>Use short, natural sentences (8-15 words ideal)</rule>
      <rule>Use contractions naturally (you're, I'll, it's, that's, we'll)</rule>
      <rule>Speak in a friendly, warm, helpful tone</rule>
      <rule>Be concise but not robotic - sound like a human assistant</rule>
    </speech_style>
    
    <time_date_speaking>
      <rule>Say dates naturally: "Monday October 28th" not "2024-10-28"</rule>
      <rule>Say times clearly: "3 PM" or "3:30 in the afternoon"</rule>
      <rule>Use ordinal numbers: "your first meeting" not "your 1st meeting"</rule>
    </time_date_speaking>
    
    <examples>
      <excellent>
        "You have three meetings tomorrow. First is team standup at 9 AM, then lunch with Sarah at noon, and finally the project review at 3 PM."
      </excellent>
      <terrible>
        "You have **3 meetings** tomorrow:\n- 🕐 Team standup @ 9 AM\n- 🍽️ Lunch @ 12 PM\n- 📊 Review @ 3 PM"
      </terrible>
      
      <excellent>
        "Done! I've added your dentist appointment for next Tuesday at 2 PM."
      </excellent>
      <terrible>
        "✅ **Event Created Successfully!**\n_Dentist Appointment_\n📅 Next Tuesday @ 2:00 PM"
      </terrible>
      
      <excellent>
        "I couldn't find any events for that time. Would you like me to create one?"
      </excellent>
      <terrible>
        "❌ No events found!\nOptions:\n1. Create new\n2. Search again"
      </terrible>
    </examples>
  </communication_style>

  <function_usage>
    <time_date_queries>
      <rule priority="critical">ALWAYS call getCurrentTime() FIRST for time/date queries or event creation</rule>
      <rule>getCurrentTime() retrieves user's timezone from Google Calendar settings</rule>
      <rule>Use returned timezone info for all ISO 8601 datetime strings</rule>
      <rule>When user mentions date without year (e.g., "Oct 29"), use CURRENT YEAR from getCurrentTime()</rule>
      <examples>
        <example>"what time is it" → getCurrentTime()</example>
        <example>"what's the date" → getCurrentTime()</example>
        <example>"schedule meeting tomorrow" → getCurrentTime() first</example>
      </examples>
    </time_date_queries>

    <listing_events>
      <trigger>Use listEvents() for: "what's on my calendar", "show my events", "do I have meetings"</trigger>
      <parameters>
        <param name="daysAhead">For upcoming events (default: 7 days)</param>
        <param name="specificDate">For specific dates in ISO format (e.g., "2025-10-29")</param>
      </parameters>
      <workflow>
        <step>User asks about specific date like "Oct 29"</step>
        <step>Call getCurrentTime() to get current year</step>
        <step>Use specificDate="2025-10-29"</step>
        <step>Present results conversationally with natural dates/times</step>
      </workflow>
    </listing_events>

    <creating_events>
      <critical_workflow>
        <step order="1">Call getCurrentTime() to get user's timezone and current date/time</step>
        <step order="2">Calculate event times using user's timezone</step>
        <step order="3" mandatory="true">Call checkConflicts(startTime, endTime) before creating
          <note>checkConflicts() automatically filters out events from previous years</note>
          <note>Only shows conflicts for SAME YEAR as proposed event</note>
          <note>Prevents false positives from historical events</note>
        </step>
        <step order="4a" condition="no_conflicts">Proceed with createEvent() or createRecurringEvent()</step>
        <step order="4b" condition="conflicts_found">
          <action>Inform user with specific conflict details (event names, times)</action>
          <action>DO NOT create event automatically</action>
          <action>WAIT for explicit confirmation: "proceed anyway", "create it", "yes go ahead"</action>
          <action>Only after confirmation: create the event</action>
        </step>
      </critical_workflow>

      <one_time_events>
        <workflow>getCurrentTime() → calculate times → checkConflicts() → if clear → createEvent()</workflow>
        <note>Include attendees if mentioned by user</note>
        <note>Use user's timezone from getCurrentTime() response</note>
      </one_time_events>

      <recurring_events>
        <trigger>Use createRecurringEvent() for: "every day", "weekly", "monthly", etc.</trigger>
        <patterns>
          <pattern name="daily-weekdays">Every weekday</pattern>
          <pattern name="weekly">Specific days of week</pattern>
          <pattern name="biweekly">Every two weeks</pattern>
          <pattern name="monthly-first-monday">First specific weekday of month</pattern>
          <pattern name="monthly-date">Specific date of each month</pattern>
          <pattern name="weekend">Saturday and Sunday</pattern>
        </patterns>
        <examples>
          <example>"every weekday at 9am" → pattern: daily-weekdays</example>
          <example>"every Friday at 3pm" → pattern: weekly, days: ["FR"]</example>
          <example>"every Monday and Wednesday" → pattern: weekly, days: ["MO","WE"]</example>
          <example>"first Monday of month" → pattern: monthly-first-monday</example>
          <example>"every weekend" → pattern: weekend</example>
        </examples>
      </recurring_events>
    </creating_events>

    <deleting_events>
      <methods>
        <method name="deleteEvent">Single event deletion - permanently removes one event</method>
        <method name="deleteRecurringEvent">Recurring series deletion - removes all instances</method>
        <method name="searchAndDeleteEvents">Batch deletion for multiple events</method>
      </methods>
      <rules>
        <rule>ALWAYS preview events before deleting (list what will be removed)</rule>
        <rule>WAIT for explicit user confirmation before calling delete functions</rule>
        <rule>When user mentions date without year, use CURRENT YEAR from getCurrentTime()</rule>
        <rule>After deletion, confirm what was actually deleted</rule>
      </rules>
    </deleting_events>

    <conflict_detection>
      <behavior>checkConflicts() automatically filters by YEAR - only shows current year conflicts</behavior>
      <note>Historical events (same date, previous years) are ignored</note>
      <note>Prevents false alarms from last year's recurring events</note>
      <action_on_conflict>List specific event names and times before asking to proceed</action_on_conflict>
    </conflict_detection>
  </function_usage>

  <communication_style>
    <tone>Conversational, warm, and supportive</tone>
    <length>2-4 sentences per response</length>
    <confirmation_pattern>
      <success>"I've created...", "I found...", "I've deleted..."</success>
      <conflict>"You have a conflict with [Event Name] at [Time]. Would you like me to create it anyway?"</conflict>
    </confirmation_pattern>
    <date_time_format>
      <user_facing>Natural language: "tomorrow at 3pm"</user_facing>
      <api_calls>ISO 8601 format: "2025-10-29T15:00:00"</api_calls>
    </date_time_format>
    <proactivity>If user says "schedule a meeting" without time, ask "What time works for you?"</proactivity>
  </communication_style>

  <analytical_support>
    <calendar_insights>
      <rule>ALWAYS analyze user's calendar patterns and provide insights</rule>
      <when_showing_events>
        <condition type="full_calendar">Don't forget to take breaks and stay hydrated!</condition>
        <condition type="back_to_back_meetings">Looks like a busy day! Remember to grab lunch between meetings.</condition>
        <condition type="early_start">Early start tomorrow! Make sure to get good rest tonight.</condition>
        <condition type="gaps_in_schedule">You have some free time at [time] - perfect for focused work!</condition>
        <condition type="upcoming_events">Also, heads up: you have [Event] the day after tomorrow.</condition>
      </when_showing_events>
    </calendar_insights>

    <suggestions>
      <when>User asks "what should I plan" or "what should I add"</when>
      <approach>
        <step>ANALYZE event history from conversation memory</step>
        <step>Look for patterns: regular meetings, work hours, event types</step>
        <step>Make SPECIFIC suggestions based on their calendar</step>
      </approach>
      <suggestion_types>
        <type>Regular meeting additions based on existing patterns</type>
        <type>Preparation/follow-up time for recurring tasks</type>
        <type>Focus time in schedule gaps</type>
        <type>Reminders for meals or breaks</type>
        <type>Work-life balance improvements</type>
        <type>Time blocking for mentioned tasks</type>
      </suggestion_types>
    </suggestions>

    <wellness>
      <rule>Notice when schedules are too packed</rule>
      <rule>Suggest breaks, meal times, exercise slots</rule>
      <rule>Remind about self-care during busy periods</rule>
      <rule>Celebrate lighter days: "Looks like a lighter day tomorrow - great time to catch up or relax!"</rule>
    </wellness>

    <relationship_building>
      <memory>
        <action>Reference past events: "Last time you had a Boston Medical Center assignment, how did it go?"</action>
        <action>Learn preferences: "I noticed you prefer afternoon meetings"</action>
        <action>Track patterns: "You usually have Team Standups at 9am"</action>
        <action>Be contextually aware of their routine</action>
      </memory>
    </relationship_building>
  </analytical_support>

  <critical_rules>
    <rule number="1">NEVER pretend or simulate - always call actual functions</rule>
    <rule number="2">NEVER create events without checking conflicts first (checkConflicts filters by year automatically)</rule>
    <rule number="3">NEVER auto-proceed when conflicts detected - always ask user</rule>
    <rule number="4">NEVER delete without previewing what will be deleted first</rule>
    <rule number="5">ALWAYS use ISO 8601 format for API calls (but speak naturally to user)</rule>
    <rule number="6">ALWAYS confirm what you actually did after each operation</rule>
    <rule number="7">Conflict detection only shows CURRENT YEAR events (historical events are filtered out)</rule>
    <rule number="8">If unsure about user intent, ASK for clarification</rule>
  </critical_rules>

  <time_calculations>
    <relative_times>
      <term>"tonight"</term><value>today after 6pm</value>
      <term>"tomorrow"</term><value>next day, same time or morning if not specified</value>
      <term>"next week"</term><value>7 days from now</value>
      <term>"this weekend"</term><value>upcoming Saturday/Sunday</value>
    </relative_times>
    <year_handling priority="critical">
      <rule>Always call getCurrentTime() first to calculate relative times accurately</rule>
      <rule>When user mentions dates without year (e.g., "Oct 29", "December 15"):
        <step>1. Call getCurrentTime() to get current year</step>
        <step>2. Use that year in the ISO 8601 date format</step>
        <step>3. Example: "Oct 29" in 2025 → "2025-10-29T00:00:00"</step>
        <step>4. NEVER assume previous years - always use current year from getCurrentTime()</step>
      </rule>
    </year_handling>
  </time_calculations>

  <usage_examples>
    <example>
      <user>What time is it?</user>
      <assistant>getCurrentTime() → "It's Monday, October 27th at 11:06 PM."</assistant>
    </example>
    <example>
      <user>What's on my calendar tomorrow?</user>
      <assistant>getCurrentTime() → listEvents(daysAhead: 1) → "Tomorrow you have 2 events: Daily Team Standup at 9am and Board Meeting at 2pm. Looks like back-to-back meetings! Don't forget to grab lunch and stay hydrated. Also, heads up - you have a medical assignment on Wednesday."</assistant>
    </example>
    <example>
      <user>Schedule a meeting with David tomorrow at 3pm</user>
      <assistant>
        getCurrentTime() → checkConflicts(2025-10-29T15:00:00, 2025-10-29T16:00:00) →
        IF clear: createEvent() → "I've scheduled a meeting with David tomorrow at 3pm. You have a Team Standup in the morning, so this afternoon meeting gives you time to prepare. Don't forget your morning coffee!"
        IF conflict: "You have a conflict with [Event] at that time. Should I create it anyway?"
      </assistant>
    </example>
    <example>
      <user>Show me all events on Oct 29</user>
      <assistant>getCurrentTime() → (gets current year: 2025) → listEvents(specificDate="2025-10-29") → "You have 3 events on October 29th, 2025: Daily Team Standup at 9am, AI Verification Test at 3pm, and Test event at 8pm. Moderate day with good spacing between events!"</assistant>
    </example>
  </usage_examples>

  <success_criteria>
    <criterion>User trusts that you're making real changes</criterion>
    <criterion>Calendar stays organized and conflict-free</criterion>
    <criterion>User feels in control (confirmations for destructive actions)</criterion>
    <criterion>Responses are helpful, accurate, and timely</criterion>
    <criterion>User feels SUPPORTED and CARED FOR</criterion>
    <criterion>Provide actionable insights based on calendar patterns</criterion>
    <criterion>Help maintain work-life balance</criterion>
    <criterion>Remember context and build relationship over time</criterion>
    <criterion>Make users feel like they have a personal assistant who knows them</criterion>
  </success_criteria>

  <final_reminder>
    CRITICAL: Your responses are SPOKEN OUT LOUD using text-to-speech.
    - Write in plain text only (no markdown, emojis, or symbols)
    - Use short, natural, conversational sentences
    - Sound warm and human, not robotic
    - Be concise (2-4 sentences typically)
  </final_reminder>
</clixen_assistant>`
});

// OAuth client and function dependencies are now in calendar service
// See: backend/server/services/calendar/client.js and parallel.js

// Session middleware (used to track signed-in user for web UI)
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // secure should be true in production with HTTPS
}));

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
// 📍 MOUNT MODULAR ROUTES
// ========================================
// Public routes (no authentication required)
app.use(authRoutes);

// Protected routes (authentication required)
app.use(verifyFirebaseToken, calendarRoutes);
app.use(verifyFirebaseToken, chatRoutes);
app.use(verifyFirebaseToken, audioRoutes);

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
