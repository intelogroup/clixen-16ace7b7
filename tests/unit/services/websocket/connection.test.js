/**
 * Tests for WebSocket Connection Management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handleConnection, setupHeartbeat } from '../../../backend/server/websocket/connection.js';

describe('WebSocket Connection Management', () => {
    let mockWs;
    let mockReq;
    let mockDependencies;
    let mockAdmin;
    let mockActiveConnections;

    beforeEach(() => {
        // Mock WebSocket
        mockWs = {
            send: vi.fn(),
            close: vi.fn(),
            on: vi.fn(),
            isAlive: true
        };

        // Mock HTTP Request
        mockReq = {
            headers: {},
            connection: {}
        };

        // Mock ActiveConnections Map
        mockActiveConnections = new Map();

        // Mock Firebase Admin
        mockAdmin = {
            auth: () => ({
                verifyIdToken: vi.fn().mockResolvedValue({
                    email: 'test@example.com',
                    uid: 'test-uid'
                })
            })
        };

        // Mock dependencies
        mockDependencies = {
            admin: mockAdmin,
            transcribeAudioAsync: vi.fn().mockResolvedValue('Transcribed text'),
            textToSpeechGoogle: vi.fn().mockResolvedValue(undefined),
            getConversationHistory: vi.fn().mockReturnValue([]),
            addToHistory: vi.fn(),
            model: {
                startChat: vi.fn().mockReturnValue({
                    sendMessage: vi.fn().mockResolvedValue({
                        response: {
                            text: () => 'Test response',
                            functionCalls: () => null
                        }
                    })
                })
            },
            analyzeFunctionDependencies: vi.fn().mockReturnValue([[]]),
            executeParallelFunctions: vi.fn().mockResolvedValue([]),
            activeConnections: mockActiveConnections
        };
    });

    describe('handleConnection', () => {
        it('should setup event listeners on connection', () => {
            handleConnection(mockWs, mockReq, mockDependencies);

            expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
            expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
            expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockWs.on).toHaveBeenCalledWith('pong', expect.any(Function));
        });

        it('should handle authentication message', async () => {
            handleConnection(mockWs, mockReq, mockDependencies);

            const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];

            const authMessage = JSON.stringify({
                type: 'auth',
                token: 'valid-token'
            });

            await messageHandler(Buffer.from(authMessage));

            expect(mockDependencies.admin.auth().verifyIdToken).toHaveBeenCalledWith('valid-token');
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"auth_success"')
            );
            expect(mockActiveConnections.size).toBe(1);
        });

        it('should reject invalid authentication', async () => {
            mockDependencies.admin.auth = () => ({
                verifyIdToken: vi.fn().mockRejectedValue(new Error('Invalid token'))
            });

            handleConnection(mockWs, mockReq, mockDependencies);

            const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];

            const authMessage = JSON.stringify({
                type: 'auth',
                token: 'invalid-token'
            });

            await messageHandler(Buffer.from(authMessage));

            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"auth_error"')
            );
            expect(mockWs.close).toHaveBeenCalled();
        });

        it('should require authentication for non-auth messages', async () => {
            handleConnection(mockWs, mockReq, mockDependencies);

            const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];

            const textMessage = JSON.stringify({
                type: 'text_message',
                text: 'Hello'
            });

            await messageHandler(Buffer.from(textMessage));

            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"error":"Not authenticated')
            );
        });

        it('should handle ping message', async () => {
            handleConnection(mockWs, mockReq, mockDependencies);

            // First authenticate
            const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
            await messageHandler(Buffer.from(JSON.stringify({
                type: 'auth',
                token: 'valid-token'
            })));

            mockWs.send.mockClear();

            // Then send ping
            await messageHandler(Buffer.from(JSON.stringify({
                type: 'ping'
            })));

            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"pong"')
            );
        });

        it('should handle unknown message type', async () => {
            handleConnection(mockWs, mockReq, mockDependencies);

            // First authenticate
            const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
            await messageHandler(Buffer.from(JSON.stringify({
                type: 'auth',
                token: 'valid-token'
            })));

            mockWs.send.mockClear();

            // Then send unknown type
            await messageHandler(Buffer.from(JSON.stringify({
                type: 'unknown_type'
            })));

            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"error":"Unknown message type')
            );
        });

        it('should handle connection close', () => {
            handleConnection(mockWs, mockReq, mockDependencies);

            // Authenticate first
            const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
            messageHandler(Buffer.from(JSON.stringify({
                type: 'auth',
                token: 'valid-token'
            })));

            // Wait for authentication to complete
            setTimeout(() => {
                const closeHandler = mockWs.on.mock.calls.find(call => call[0] === 'close')[1];
                closeHandler();

                expect(mockActiveConnections.size).toBe(0);
            }, 100);
        });

        it('should update isAlive on pong', () => {
            handleConnection(mockWs, mockReq, mockDependencies);

            const pongHandler = mockWs.on.mock.calls.find(call => call[0] === 'pong')[1];

            mockWs.isAlive = false;
            pongHandler();

            expect(mockWs.isAlive).toBe(true);
        });
    });

    describe('setupHeartbeat', () => {
        let mockWss;
        let heartbeatInterval;

        beforeEach(() => {
            vi.useFakeTimers();

            mockWss = {
                clients: new Set([mockWs]),
                on: vi.fn()
            };

            mockWs.ping = vi.fn();
            mockWs.terminate = vi.fn();
        });

        afterEach(() => {
            vi.restoreAllTimers();
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }
        });

        it('should setup heartbeat interval', () => {
            heartbeatInterval = setupHeartbeat(mockWss);

            expect(heartbeatInterval).toBeDefined();
        });

        it('should ping all clients', () => {
            mockWs.isAlive = true;

            heartbeatInterval = setupHeartbeat(mockWss);

            vi.advanceTimersByTime(30000);

            expect(mockWs.ping).toHaveBeenCalled();
            expect(mockWs.isAlive).toBe(false);
        });

        it('should terminate dead connections', () => {
            mockWs.isAlive = false;

            heartbeatInterval = setupHeartbeat(mockWss);

            vi.advanceTimersByTime(30000);

            expect(mockWs.terminate).toHaveBeenCalled();
        });

        it('should clear interval on wss close', () => {
            heartbeatInterval = setupHeartbeat(mockWss);

            const closeHandler = mockWss.on.mock.calls.find(call => call[0] === 'close')[1];
            closeHandler();

            // Interval should be cleared
            vi.advanceTimersByTime(30000);
            expect(mockWs.ping).not.toHaveBeenCalled();
        });
    });
});
