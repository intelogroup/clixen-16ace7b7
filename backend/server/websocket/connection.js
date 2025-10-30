/**
 * WebSocket Connection Management
 * 
 * Handles WebSocket connection lifecycle:
 * - Connection establishment
 * - Authentication via Firebase
 * - Message routing
 * - Heartbeat/keepalive
 * - Connection cleanup
 */

const { handleAudioStream, handleStartAudioStream, handleAudioChunkStream, handleEndAudioStream } = require('./handlers/audio');
const { handleTextMessage } = require('./handlers/chat');

/**
 * Initialize WebSocket connection handler
 * @param {WebSocket} ws - WebSocket connection
 * @param {Request} req - HTTP request object
 * @param {Object} dependencies - Required dependencies (admin, audioService, etc.)
 * @returns {void}
 */
function handleConnection(ws, req, dependencies) {
    const {
        admin,
        transcribeAudioAsync,
        textToSpeechGoogle,
        getConversationHistory,
        addToHistory,
        model,
        analyzeFunctionDependencies,
        executeParallelFunctions,
        activeConnections
    } = dependencies;

    const connectionId = Date.now();
    console.log(`\n🔌 [WS-${connectionId}] New WebSocket connection established`);
    
    // Connection state
    let authenticated = false;
    let userEmail = null;
    
    // Heartbeat for keeping connection alive
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            // Handle authentication first
            if (message.type === 'auth') {
                try {
                    // Verify token with revocation check enabled
                    const decodedToken = await admin.auth().verifyIdToken(message.token, true);
                    userEmail = decodedToken.email;
                    authenticated = true;
                    
                    // Store connection
                    activeConnections.set(ws, {
                        user: userEmail,
                        uid: decodedToken.uid,
                        emailVerified: decodedToken.email_verified,
                        lastActivity: Date.now()
                    });
                    
                    console.log(`✅ [WS-${connectionId}] Authenticated: ${userEmail}`);
                    ws.send(JSON.stringify({
                        type: 'auth_success',
                        message: 'WebSocket authenticated successfully',
                        user: {
                            email: userEmail,
                            emailVerified: decodedToken.email_verified
                        },
                        timestamp: Date.now()
                    }));
                } catch (authError) {
                    console.error(`❌ [WS-${connectionId}] Authentication failed:`, authError.message);
                    
                    // Provide specific error messages
                    let errorMessage = 'Authentication failed';
                    if (authError.code === 'auth/id-token-revoked') {
                        errorMessage = 'Token has been revoked. Please sign in again.';
                    } else if (authError.code === 'auth/id-token-expired') {
                        errorMessage = 'Token has expired. Please refresh your token.';
                    }
                    
                    ws.send(JSON.stringify({
                        type: 'auth_error',
                        error: errorMessage,
                        code: authError.code,
                        timestamp: Date.now()
                    }));
                    ws.close();
                }
                return;
            }
            
            // Require authentication for all other messages
            if (!authenticated) {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'Not authenticated. Send auth message first.',
                    timestamp: Date.now()
                }));
                return;
            }
            
            // Prepare handler dependencies
            const handlerDeps = {
                transcribeAudioAsync,
                textToSpeechGoogle,
                getConversationHistory,
                addToHistory,
                model,
                analyzeFunctionDependencies,
                executeParallelFunctions
            };
            
            // Handle different message types
            switch (message.type) {
                case 'audio_stream':
                    await handleAudioStream(ws, message, userEmail, connectionId, handlerDeps);
                    break;
                    
                case 'text_message':
                    await handleTextMessage(ws, message, userEmail, connectionId, handlerDeps);
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({
                        type: 'pong',
                        timestamp: Date.now()
                    }));
                    break;
                
                // Real-time audio streaming handlers
                case 'start_audio_stream':
                    await handleStartAudioStream(ws, message, userEmail, connectionId);
                    break;
                    
                case 'audio_chunk':
                    await handleAudioChunkStream(ws, message, userEmail, connectionId);
                    break;
                    
                case 'end_audio_stream':
                    await handleEndAudioStream(ws, message, userEmail, connectionId, handlerDeps);
                    break;
                    
                default:
                    console.warn(`⚠️  [WS-${connectionId}] Unknown message type: ${message.type}`);
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: `Unknown message type: ${message.type}`,
                        timestamp: Date.now()
                    }));
            }
            
        } catch (error) {
            console.error(`❌ [WS-${connectionId}] Error processing message:`, error.message);
            console.error(`   📍 Error type:`, error.name);
            console.error(`   📍 User:`, userEmail || 'Unknown');
            console.error(`   📍 Message type:`, message?.type || 'Unknown');
            console.error(`   📍 Stack trace:`, error.stack?.split('\n').slice(0, 3).join('\n'));
            
            // Provide context-specific error tips
            if (error.message.includes('timeout')) {
                console.error(`   💡 Tip: Server timeout - operation took too long`);
            } else if (error.message.includes('Firebase')) {
                console.error(`   💡 Tip: Firebase/Gemini API error - check credentials`);
            } else if (error.message.includes('Calendar')) {
                console.error(`   💡 Tip: Calendar API error - check OAuth tokens`);
            }
            
            // Send error response but DON'T close the connection
            try {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: error.message,
                    timestamp: Date.now()
                }));
            } catch (sendError) {
                console.error(`❌ [WS-${connectionId}] Failed to send error message:`, sendError.message);
                console.error(`   💡 Tip: Connection likely already closed`);
                // Only close if we can't even send the error
                ws.close();
            }
        }
    });
    
    ws.on('close', (code, reason) => {
        console.log(`🔌 [WS-${connectionId}] Connection closed${userEmail ? ` (${userEmail})` : ''}`);
        console.log(`   📍 Code: ${code} - Reason: ${reason || 'No reason provided'}`);
        console.log(`   ⏰ Session duration: ${((Date.now() - connectionId) / 1000).toFixed(1)}s`);
        activeConnections.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error(`❌ [WS-${connectionId}] WebSocket error:`, error.message);
        console.error(`   📍 Error code:`, error.code);
        console.error(`   📍 User:`, userEmail || 'Not authenticated');
    });
}

/**
 * Setup heartbeat interval for WebSocket server
 * Pings all clients every 30 seconds to detect dead connections
 */
function setupHeartbeat(wss) {
    let deadConnectionCount = 0;
    let totalPingsSent = 0;
    
    const heartbeatInterval = setInterval(() => {
        totalPingsSent++;
        let aliveCount = 0;
        let deadCount = 0;
        
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                deadCount++;
                deadConnectionCount++;
                console.log(`💀 Terminating dead WebSocket connection (total dead: ${deadConnectionCount})`);
                return ws.terminate();
            }
            
            aliveCount++;
            ws.isAlive = false;
            ws.ping();
        });
        
        if (aliveCount > 0) {
            console.log(`💓 Heartbeat #${totalPingsSent}: ${aliveCount} alive, ${deadCount} terminated`);
        }
    }, 30000); // Every 30 seconds

    wss.on('close', () => {
        clearInterval(heartbeatInterval);
        console.log(`\n🔌 WebSocket server closed`);
        console.log(`   📊 Total heartbeats sent: ${totalPingsSent}`);
        console.log(`   💀 Total dead connections cleaned: ${deadConnectionCount}`);
    });

    return heartbeatInterval;
}

module.exports = {
    handleConnection,
    setupHeartbeat
};
