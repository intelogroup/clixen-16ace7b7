/**
 * Tests for WebSocket Audio Handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleAudioStream, handleStartAudioStream, handleAudioChunkStream, handleEndAudioStream } from '../../../backend/server/websocket/handlers/audio.js';

describe('WebSocket Audio Handlers', () => {
    let mockWs;
    let mockDependencies;
    const connectionId = 12345;
    const userEmail = 'test@example.com';

    beforeEach(() => {
        // Mock WebSocket
        mockWs = {
            send: vi.fn(),
            close: vi.fn()
        };

        // Mock dependencies
        mockDependencies = {
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
            executeParallelFunctions: vi.fn().mockResolvedValue([])
        };
    });

    describe('handleAudioStream', () => {
        it('should process audio stream successfully', async () => {
            const message = {
                requestId: 1234,
                audioData: Buffer.from('test audio').toString('base64'),
                mimeType: 'audio/webm'
            };

            await handleAudioStream(mockWs, message, userEmail, connectionId, mockDependencies);

            // Should send processing_started
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"processing_started"')
            );

            // Should call transcribeAudioAsync
            expect(mockDependencies.transcribeAudioAsync).toHaveBeenCalled();

            // Should get conversation history
            expect(mockDependencies.getConversationHistory).toHaveBeenCalledWith(userEmail);

            // Should send response_text
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"response_text"')
            );

            // Should send processing_complete
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"processing_complete"')
            );
        });

        it('should handle errors gracefully', async () => {
            const message = {
                requestId: 1234,
                audioData: Buffer.from('test audio').toString('base64'),
                mimeType: 'audio/webm'
            };

            mockDependencies.model.startChat.mockReturnValue({
                sendMessage: vi.fn().mockRejectedValue(new Error('Gemini error'))
            });

            await handleAudioStream(mockWs, message, userEmail, connectionId, mockDependencies);

            // Should send error message
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"error"')
            );
        });

        it('should handle function calls', async () => {
            const message = {
                requestId: 1234,
                audioData: Buffer.from('test audio').toString('base64'),
                mimeType: 'audio/webm'
            };

            // Mock function calling response
            mockDependencies.model.startChat.mockReturnValue({
                sendMessage: vi.fn()
                    .mockResolvedValueOnce({
                        response: {
                            text: () => '',
                            functionCalls: () => [{ name: 'testFunction', args: {} }]
                        }
                    })
                    .mockResolvedValueOnce({
                        response: {
                            text: () => 'Final response',
                            functionCalls: () => null
                        }
                    })
            });

            await handleAudioStream(mockWs, message, userEmail, connectionId, mockDependencies);

            // Should send function_calls notification
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"function_calls"')
            );

            // Should execute functions
            expect(mockDependencies.executeParallelFunctions).toHaveBeenCalled();
        });
    });

    describe('handleStartAudioStream', () => {
        it('should initialize streaming session', async () => {
            const message = {
                requestId: 1234,
                mimeType: 'audio/webm'
            };

            await handleStartAudioStream(mockWs, message, userEmail, connectionId);

            // Should send stream_started acknowledgment
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"stream_started"')
            );
        });

        it('should use default mimeType if not provided', async () => {
            const message = {
                requestId: 1234
            };

            await handleStartAudioStream(mockWs, message, userEmail, connectionId);

            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"stream_started"')
            );
        });
    });

    describe('handleAudioChunkStream', () => {
        it('should handle audio chunk successfully', async () => {
            // First start a session
            await handleStartAudioStream(mockWs, {
                requestId: 1234,
                mimeType: 'audio/webm'
            }, userEmail, connectionId);

            mockWs.send.mockClear();

            // Then send a chunk
            const message = {
                requestId: 1234,
                audioData: Buffer.from('chunk data').toString('base64'),
                chunkIndex: 0
            };

            await handleAudioChunkStream(mockWs, message, userEmail, connectionId);

            // Should send chunk_received acknowledgment
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"chunk_received"')
            );
        });

        it('should return error if no active session', async () => {
            const message = {
                requestId: 9999,  // Non-existent session
                audioData: Buffer.from('chunk data').toString('base64'),
                chunkIndex: 0
            };

            await handleAudioChunkStream(mockWs, message, userEmail, connectionId);

            // Should send error
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"error"')
            );
        });
    });

    describe('handleEndAudioStream', () => {
        it('should process complete audio from chunks', async () => {
            // Start session
            await handleStartAudioStream(mockWs, {
                requestId: 1234,
                mimeType: 'audio/webm'
            }, userEmail, connectionId);

            // Add chunks
            await handleAudioChunkStream(mockWs, {
                requestId: 1234,
                audioData: Buffer.from('chunk1').toString('base64'),
                chunkIndex: 0
            }, userEmail, connectionId);

            await handleAudioChunkStream(mockWs, {
                requestId: 1234,
                audioData: Buffer.from('chunk2').toString('base64'),
                chunkIndex: 1
            }, userEmail, connectionId);

            mockWs.send.mockClear();

            // End stream
            const message = {
                requestId: 1234
            };

            await handleEndAudioStream(mockWs, message, userEmail, connectionId, mockDependencies);

            // Should send processing_started
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"processing_started"')
            );

            // Should process combined audio
            expect(mockDependencies.transcribeAudioAsync).toHaveBeenCalled();

            // Should send processing_complete
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"processing_complete"')
            );
        });

        it('should return error if no active session', async () => {
            const message = {
                requestId: 9999  // Non-existent session
            };

            await handleEndAudioStream(mockWs, message, userEmail, connectionId, mockDependencies);

            // Should send error
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"error"')
            );
        });
    });
});
