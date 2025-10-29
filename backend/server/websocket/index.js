/**
 * WebSocket Module
 * 
 * Unified WebSocket server initialization and management
 * Handles real-time bidirectional streaming for audio and text chat
 */

const WebSocket = require('ws');
const { handleConnection, setupHeartbeat } = require('./connection');

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server instance
 * @param {Object} dependencies - Required dependencies
 * @param {Object} dependencies.admin - Firebase Admin SDK instance
 * @param {Function} dependencies.transcribeAudioAsync - Audio transcription function
 * @param {Function} dependencies.textToSpeechGoogle - TTS function
 * @param {Function} dependencies.getConversationHistory - Get chat history
 * @param {Function} dependencies.addToHistory - Add to chat history
 * @param {Object} dependencies.model - Gemini AI model instance
 * @param {Function} dependencies.analyzeFunctionDependencies - Analyze function call dependencies
 * @param {Function} dependencies.executeParallelFunctions - Execute calendar functions in parallel
 * @returns {WebSocket.Server} WebSocket server instance
 */
function initWebSocketServer(server, dependencies) {
    console.log('🔌 Initializing WebSocket server for real-time audio streaming...');
    const wsStartTime = Date.now();
    
    const wss = new WebSocket.Server({ server });
    
    // Store active WebSocket connections with user info
    const activeConnections = new Map(); // ws -> { user, lastActivity }
    
    // Request tracking for monitoring
    let totalRequests = 0;
    let totalErrors = 0;
    
    // Add activeConnections to dependencies
    const wssDependencies = {
        ...dependencies,
        activeConnections
    };
    
    // Handle new connections
    wss.on('connection', (ws, req) => {
        totalRequests++;
        const clientIP = req.socket.remoteAddress;
        console.log(`\n🔗 New WebSocket connection #${totalRequests} from ${clientIP}`);
        console.log(`   👥 Active connections: ${wss.clients.size}`);
        
        // Track errors per connection
        ws.on('error', () => {
            totalErrors++;
        });
        
        handleConnection(ws, req, wssDependencies);
    });
    
    // Setup heartbeat for connection health monitoring
    setupHeartbeat(wss);
    
    // Periodic stats logging (every 5 minutes)
    setInterval(() => {
        if (wss.clients.size > 0 || totalRequests > 0) {
            console.log(`\n📊 WebSocket Server Stats:`);
            console.log(`   👥 Active connections: ${wss.clients.size}`);
            console.log(`   📈 Total connections: ${totalRequests}`);
            console.log(`   ❌ Total errors: ${totalErrors}`);
            console.log(`   ⏱️  Uptime: ${((Date.now() - wsStartTime) / 1000 / 60).toFixed(1)} minutes`);
            const memUsage = process.memoryUsage();
            console.log(`   💾 Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB heap / ${(memUsage.rss / 1024 / 1024).toFixed(1)}MB RSS\n`);
        }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    const wsDuration = Date.now() - wsStartTime;
    console.log(`✅ WebSocket server initialized successfully in ${wsDuration}ms`);
    console.log('   • Real-time bidirectional streaming enabled');
    console.log('   • Audio chunks streamed as they\'re generated');
    console.log('   • No HTTP overhead for faster response times');
    console.log('   • Heartbeat monitoring: 30s interval');
    console.log('   • Stats logging: 5 minute interval\n');
    
    return wss;
}

/**
 * Graceful shutdown handler
 * @param {WebSocket.Server} wss - WebSocket server instance
 */
function handleGracefulShutdown(wss) {
    console.log('\n\n👋 Shutting down server...');
    console.log('🔌 Closing WebSocket connections...');
    
    wss.clients.forEach((ws) => {
        ws.close();
    });
    
    wss.close(() => {
        console.log('✅ WebSocket server closed');
        process.exit(0);
    });
}

module.exports = {
    initWebSocketServer,
    handleGracefulShutdown
};
