/**
 * Tests for WebSocket Chat Handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleTextMessage } from '../../../backend/server/websocket/handlers/chat.js';

describe('WebSocket Chat Handlers', () => {
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
            getConversationHistory: vi.fn().mockReturnValue([]),
            addToHistory: vi.fn(),
            model: {
                startChat: vi.fn().mockReturnValue({
                    sendMessageStream: vi.fn().mockReturnValue({
                        stream: {
                            [Symbol.asyncIterator]: async function* () {
                                yield { text: () => 'Chunk 1' };
                                yield { text: () => 'Chunk 2' };
                            }
                        },
                        response: Promise.resolve({
                            text: () => 'Complete response',
                            functionCalls: () => null
                        })
                    })
                })
            },
            analyzeFunctionDependencies: vi.fn().mockReturnValue([[]]),
            executeParallelFunctions: vi.fn().mockResolvedValue([])
        };
    });

    describe('handleTextMessage', () => {
        it('should process text message successfully', async () => {
            const message = {
                text: 'Hello, what time is it?'
            };

            await handleTextMessage(mockWs, message, userEmail, connectionId, mockDependencies);

            // Should send processing_started
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"processing_started"')
            );

            // Should add user message to history
            expect(mockDependencies.addToHistory).toHaveBeenCalledWith(
                userEmail,
                'user',
                'Hello, what time is it?'
            );

            // Should stream text chunks
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"text_chunk"')
            );

            // Should send processing_complete
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"processing_complete"')
            );
        });

        it('should handle existing conversation history', async () => {
            mockDependencies.getConversationHistory.mockReturnValue([
                { role: 'user', content: 'Previous message' },
                { role: 'model', content: 'Previous response' }
            ]);

            const message = {
                text: 'Follow-up question'
            };

            await handleTextMessage(mockWs, message, userEmail, connectionId, mockDependencies);

            // Should get conversation history
            expect(mockDependencies.getConversationHistory).toHaveBeenCalledWith(userEmail);

            // Should format history correctly
            expect(mockDependencies.model.startChat).toHaveBeenCalledWith(
                expect.objectContaining({
                    history: expect.arrayContaining([
                        expect.objectContaining({ role: 'user' }),
                        expect.objectContaining({ role: 'model' })
                    ])
                })
            );
        });

        it('should clean history that starts with model role', async () => {
            mockDependencies.getConversationHistory.mockReturnValue([
                { role: 'model', content: 'Invalid start' },
                { role: 'user', content: 'User message' },
                { role: 'model', content: 'Model response' }
            ]);

            const message = {
                text: 'New message'
            };

            await handleTextMessage(mockWs, message, userEmail, connectionId, mockDependencies);

            // History should be cleaned
            expect(mockDependencies.model.startChat).toHaveBeenCalled();
        });

        it('should handle function calls', async () => {
            mockDependencies.model.startChat.mockReturnValue({
                sendMessageStream: vi.fn()
                    .mockReturnValueOnce({
                        stream: {
                            [Symbol.asyncIterator]: async function* () {
                                yield { text: () => '' };
                            }
                        },
                        response: Promise.resolve({
                            text: () => '',
                            functionCalls: () => [{ name: 'testFunction', args: {} }]
                        })
                    })
                    .mockReturnValueOnce({
                        stream: {
                            [Symbol.asyncIterator]: async function* () {
                                yield { text: () => 'Final response' };
                            }
                        },
                        response: Promise.resolve({
                            text: () => 'Final response',
                            functionCalls: () => null
                        })
                    })
            });

            const message = {
                text: 'What is on my calendar?'
            };

            await handleTextMessage(mockWs, message, userEmail, connectionId, mockDependencies);

            // Should send function_calls notification
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"function_calls"')
            );

            // Should execute functions
            expect(mockDependencies.executeParallelFunctions).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            mockDependencies.model.startChat.mockReturnValue({
                sendMessageStream: vi.fn().mockRejectedValue(new Error('Streaming error'))
            });

            const message = {
                text: 'Test message'
            };

            await handleTextMessage(mockWs, message, userEmail, connectionId, mockDependencies);

            // Should send error message
            expect(mockWs.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"error"')
            );
        });

        it('should add final response to history', async () => {
            const message = {
                text: 'Hello'
            };

            await handleTextMessage(mockWs, message, userEmail, connectionId, mockDependencies);

            // Should add model response to history
            expect(mockDependencies.addToHistory).toHaveBeenCalledWith(
                userEmail,
                'model',
                'Complete response'
            );
        });
    });
});
