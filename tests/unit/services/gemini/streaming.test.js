/**
 * Tests for Gemini Streaming Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as streaming from '../../../../backend/server/services/gemini/streaming.js';

describe('Gemini Streaming Service', () => {
    let mockRes;

    beforeEach(() => {
        mockRes = {
            write: vi.fn(),
            setHeader: vi.fn(),
            end: vi.fn()
        };
    });

    describe('sendSSEEvent', () => {
        it('should send SSE formatted event', () => {
            streaming.sendSSEEvent(mockRes, 'chunk', { text: 'Hello' });
            
            expect(mockRes.write).toHaveBeenCalledOnce();
            const written = mockRes.write.mock.calls[0][0];
            expect(written).toContain('data: ');
            expect(written).toContain('"type":"chunk"');
            expect(written).toContain('"text":"Hello"');
            expect(written).toContain('timestamp');
        });

        it('should include timestamp', () => {
            const beforeTime = Date.now();
            streaming.sendSSEEvent(mockRes, 'test', { data: 'value' });
            const afterTime = Date.now();
            
            const written = mockRes.write.mock.calls[0][0];
            const parsed = JSON.parse(written.match(/data: (.+)\n/)[1]);
            
            expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(parsed.timestamp).toBeLessThanOrEqual(afterTime);
        });

        it('should handle different event types', () => {
            streaming.sendSSEEvent(mockRes, 'done', { fullText: 'Complete' });
            
            const written = mockRes.write.mock.calls[0][0];
            expect(written).toContain('"type":"done"');
            expect(written).toContain('"fullText":"Complete"');
        });

        it('should handle empty data', () => {
            streaming.sendSSEEvent(mockRes, 'ping', {});
            
            expect(mockRes.write).toHaveBeenCalledOnce();
            const written = mockRes.write.mock.calls[0][0];
            expect(written).toContain('"type":"ping"');
        });
    });

    describe('setupSSEHeaders', () => {
        it('should set correct SSE headers', () => {
            streaming.setupSSEHeaders(mockRes);
            
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
            expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
            expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
            expect(mockRes.setHeader).toHaveBeenCalledTimes(3);
        });
    });

    describe('streamTextChunks', () => {
        it('should stream text chunks', async () => {
            const mockStream = (async function* () {
                yield { text: () => 'Hello ' };
                yield { text: () => 'world!' };
            })();
            
            const fullText = await streaming.streamTextChunks(mockStream, mockRes);
            
            expect(fullText).toBe('Hello world!');
            expect(mockRes.write).toHaveBeenCalledTimes(2);
        });

        it('should handle single chunk', async () => {
            const mockStream = (async function* () {
                yield { text: () => 'Single chunk' };
            })();
            
            const fullText = await streaming.streamTextChunks(mockStream, mockRes);
            
            expect(fullText).toBe('Single chunk');
            expect(mockRes.write).toHaveBeenCalledOnce();
        });

        it('should handle empty stream', async () => {
            const mockStream = (async function* () {})();
            
            const fullText = await streaming.streamTextChunks(mockStream, mockRes);
            
            expect(fullText).toBe('');
            expect(mockRes.write).not.toHaveBeenCalled();
        });

        it('should handle chunk errors gracefully', async () => {
            const mockStream = (async function* () {
                yield { text: () => 'Good chunk' };
                yield { text: () => { throw new Error('Chunk error'); } };
                yield { text: () => 'Another good chunk' };
            })();
            
            const fullText = await streaming.streamTextChunks(mockStream, mockRes);
            
            // Should continue despite error
            expect(fullText).toBe('Good chunkAnother good chunk');
        });

        it('should accumulate all chunks correctly', async () => {
            const mockStream = (async function* () {
                yield { text: () => 'First' };
                yield { text: () => ' ' };
                yield { text: () => 'Second' };
                yield { text: () => ' ' };
                yield { text: () => 'Third' };
            })();
            
            const fullText = await streaming.streamTextChunks(mockStream, mockRes);
            
            expect(fullText).toBe('First Second Third');
        });
    });

    describe('handleStreamingFunctionCalls', () => {
        it('should handle no function calls', async () => {
            const mockResponse = {
                functionCalls: () => null
            };
            
            const mockChat = { sendMessageStream: vi.fn() };
            const mockExecutor = vi.fn();
            const mockProcessGrouped = vi.fn();
            const mockAnalyze = vi.fn();
            
            const result = await streaming.handleStreamingFunctionCalls(
                mockChat,
                mockResponse,
                'test@example.com',
                mockExecutor,
                mockProcessGrouped,
                mockAnalyze,
                mockRes,
                'req-123'
            );
            
            expect(result.fullResponse).toBe('');
            expect(result.functionCallCount).toBe(0);
            expect(mockChat.sendMessageStream).not.toHaveBeenCalled();
        });

        it('should handle single round of function calls', async () => {
            const mockFunctionCalls = [{ name: 'testFunc', args: {} }];
            const mockResponse = {
                functionCalls: () => mockFunctionCalls
            };
            
            const mockStream = (async function* () {
                yield { text: () => 'Response text' };
            })();
            
            const mockChat = {
                sendMessageStream: vi.fn().mockResolvedValue({
                    stream: mockStream,
                    response: Promise.resolve({ functionCalls: () => null })
                })
            };
            
            const mockExecutor = vi.fn().mockResolvedValue('result');
            const mockProcessGrouped = vi.fn().mockResolvedValue({
                functionResponses: [{ functionResponse: { name: 'testFunc', response: { result: 'result' } } }],
                totalFunctionCalls: 1
            });
            const mockAnalyze = vi.fn().mockReturnValue([[mockFunctionCalls[0]]]);
            
            const result = await streaming.handleStreamingFunctionCalls(
                mockChat,
                mockResponse,
                'test@example.com',
                mockExecutor,
                mockProcessGrouped,
                mockAnalyze,
                mockRes,
                'req-123'
            );
            
            expect(result.functionCallCount).toBe(1);
            expect(mockChat.sendMessageStream).toHaveBeenCalled();
            expect(mockRes.write).toHaveBeenCalled();
        });

        it('should notify client about function execution', async () => {
            const mockFunctionCalls = [{ name: 'func1', args: {} }, { name: 'func2', args: {} }];
            const mockResponse = {
                functionCalls: () => mockFunctionCalls
            };
            
            const mockStream = (async function* () {})();
            
            const mockChat = {
                sendMessageStream: vi.fn().mockResolvedValue({
                    stream: mockStream,
                    response: Promise.resolve({ functionCalls: () => null })
                })
            };
            
            const mockExecutor = vi.fn().mockResolvedValue('result');
            const mockProcessGrouped = vi.fn().mockResolvedValue({
                functionResponses: [],
                totalFunctionCalls: 2
            });
            const mockAnalyze = vi.fn().mockReturnValue([mockFunctionCalls]);
            
            await streaming.handleStreamingFunctionCalls(
                mockChat,
                mockResponse,
                'test@example.com',
                mockExecutor,
                mockProcessGrouped,
                mockAnalyze,
                mockRes,
                'req-123'
            );
            
            // Check that function_call event was sent
            const calls = mockRes.write.mock.calls;
            const functionCallEvent = calls.find(call => 
                call[0].includes('"type":"function_call"')
            );
            
            expect(functionCallEvent).toBeDefined();
            expect(functionCallEvent[0]).toContain('func1');
            expect(functionCallEvent[0]).toContain('func2');
        });
    });

    describe('streamChatResponse', () => {
        it('should stream complete chat response', async () => {
            const mockStream = (async function* () {
                yield { text: () => 'Hello' };
                yield { text: () => ' world' };
            })();
            
            const mockChat = {
                sendMessageStream: vi.fn().mockResolvedValue({
                    stream: mockStream,
                    response: Promise.resolve({ functionCalls: () => null })
                })
            };
            
            const mockExecutor = vi.fn();
            const mockProcessGrouped = vi.fn();
            const mockAnalyze = vi.fn();
            
            const result = await streaming.streamChatResponse(
                mockChat,
                'Test message',
                mockRes,
                'test@example.com',
                mockExecutor,
                mockProcessGrouped,
                mockAnalyze,
                'req-123'
            );
            
            expect(result.success).toBe(true);
            expect(result.fullText).toBe('Hello world');
            expect(mockRes.end).toHaveBeenCalled();
        });

        it('should send completion event', async () => {
            const mockStream = (async function* () {
                yield { text: () => 'Response' };
            })();
            
            const mockChat = {
                sendMessageStream: vi.fn().mockResolvedValue({
                    stream: mockStream,
                    response: Promise.resolve({ functionCalls: () => null })
                })
            };
            
            const mockExecutor = vi.fn();
            const mockProcessGrouped = vi.fn();
            const mockAnalyze = vi.fn();
            
            await streaming.streamChatResponse(
                mockChat,
                'Test',
                mockRes,
                'test@example.com',
                mockExecutor,
                mockProcessGrouped,
                mockAnalyze,
                'req-123'
            );
            
            // Find done event
            const doneEvent = mockRes.write.mock.calls.find(call =>
                call[0].includes('"type":"done"')
            );
            
            expect(doneEvent).toBeDefined();
            expect(doneEvent[0]).toContain('fullText');
            expect(doneEvent[0]).toContain('duration');
        });

        it('should handle streaming errors', async () => {
            const mockChat = {
                sendMessageStream: vi.fn().mockRejectedValue(new Error('Streaming error'))
            };
            
            const mockExecutor = vi.fn();
            const mockProcessGrouped = vi.fn();
            const mockAnalyze = vi.fn();
            
            const result = await streaming.streamChatResponse(
                mockChat,
                'Test',
                mockRes,
                'test@example.com',
                mockExecutor,
                mockProcessGrouped,
                mockAnalyze,
                'req-123'
            );
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Streaming error');
            
            // Should send error event
            const errorEvent = mockRes.write.mock.calls.find(call =>
                call[0].includes('"type":"error"')
            );
            expect(errorEvent).toBeDefined();
            expect(mockRes.end).toHaveBeenCalled();
        });
    });
});
