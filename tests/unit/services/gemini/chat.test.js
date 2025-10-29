/**
 * Tests for Gemini Chat Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as chat from '../../../../backend/server/services/gemini/chat.js';

describe('Gemini Chat Service', () => {
    describe('formatHistoryForGemini', () => {
        it('should format empty history', () => {
            const history = [];
            const formatted = chat.formatHistoryForGemini(history);
            expect(formatted).toEqual([]);
        });

        it('should format user messages', () => {
            const history = [
                { role: 'user', content: 'Hello' }
            ];
            const formatted = chat.formatHistoryForGemini(history);
            expect(formatted).toEqual([
                { role: 'user', parts: [{ text: 'Hello' }] }
            ]);
        });

        it('should format model messages', () => {
            const history = [
                { role: 'model', content: 'Hi there!' }
            ];
            const formatted = chat.formatHistoryForGemini(history);
            expect(formatted).toEqual([
                { role: 'model', parts: [{ text: 'Hi there!' }] }
            ]);
        });

        it('should format mixed conversation', () => {
            const history = [
                { role: 'user', content: 'Hello' },
                { role: 'model', content: 'Hi!' },
                { role: 'user', content: 'How are you?' }
            ];
            const formatted = chat.formatHistoryForGemini(history);
            expect(formatted).toEqual([
                { role: 'user', parts: [{ text: 'Hello' }] },
                { role: 'model', parts: [{ text: 'Hi!' }] },
                { role: 'user', parts: [{ text: 'How are you?' }] }
            ]);
        });
    });

    describe('startChatSession', () => {
        it('should start chat with empty history', () => {
            const mockModel = {
                startChat: vi.fn().mockReturnValue({ send: vi.fn() })
            };
            
            const session = chat.startChatSession(mockModel);
            
            expect(mockModel.startChat).toHaveBeenCalledWith({
                history: []
            });
            expect(session).toBeDefined();
        });

        it('should start chat with history', () => {
            const mockModel = {
                startChat: vi.fn().mockReturnValue({ send: vi.fn() })
            };
            
            const history = [
                { role: 'user', content: 'Hello' },
                { role: 'model', content: 'Hi!' }
            ];
            
            const session = chat.startChatSession(mockModel, history);
            
            expect(mockModel.startChat).toHaveBeenCalledWith({
                history: [
                    { role: 'user', parts: [{ text: 'Hello' }] },
                    { role: 'model', parts: [{ text: 'Hi!' }] }
                ]
            });
            expect(session).toBeDefined();
        });
    });

    describe('sendChatMessage', () => {
        it('should send text message', async () => {
            const mockResponse = { response: { text: () => 'Response' } };
            const mockChat = {
                sendMessage: vi.fn().mockResolvedValue(mockResponse)
            };
            
            const response = await chat.sendChatMessage(mockChat, 'Hello');
            
            expect(mockChat.sendMessage).toHaveBeenCalledWith('Hello');
            expect(response).toBe(mockResponse);
        });

        it('should send multipart message', async () => {
            const mockResponse = { response: { text: () => 'Response' } };
            const mockChat = {
                sendMessage: vi.fn().mockResolvedValue(mockResponse)
            };
            
            const message = [
                { text: 'Hello' },
                { inlineData: { mimeType: 'image/png', data: 'base64data' } }
            ];
            
            const response = await chat.sendChatMessage(mockChat, message);
            
            expect(mockChat.sendMessage).toHaveBeenCalledWith(message);
            expect(response).toBe(mockResponse);
        });
    });

    describe('sendChatMessageStream', () => {
        it('should send streaming message', async () => {
            const mockResult = { 
                stream: (async function* () { yield { text: () => 'chunk' }; })(),
                response: Promise.resolve({ text: () => 'Full response' })
            };
            const mockChat = {
                sendMessageStream: vi.fn().mockResolvedValue(mockResult)
            };
            
            const result = await chat.sendChatMessageStream(mockChat, 'Hello');
            
            expect(mockChat.sendMessageStream).toHaveBeenCalledWith('Hello');
            expect(result).toBe(mockResult);
        });
    });

    describe('extractResponseText', () => {
        it('should extract text from response', () => {
            const mockResponse = {
                text: () => 'Response text'
            };
            
            const text = chat.extractResponseText(mockResponse);
            expect(text).toBe('Response text');
        });
    });

    describe('hasFunctionCalls', () => {
        it('should return true when function calls exist', () => {
            const mockResponse = {
                functionCalls: () => [{ name: 'testFunction' }]
            };
            
            const result = chat.hasFunctionCalls(mockResponse);
            expect(result).toBe(true);
        });

        it('should return false when no function calls', () => {
            const mockResponse = {
                functionCalls: () => []
            };
            
            const result = chat.hasFunctionCalls(mockResponse);
            expect(result).toBe(false);
        });

        it('should return false when functionCalls is null', () => {
            const mockResponse = {
                functionCalls: () => null
            };
            
            const result = chat.hasFunctionCalls(mockResponse);
            expect(result).toBeFalsy();
        });

        it('should return false when functionCalls is undefined', () => {
            const mockResponse = {};
            
            const result = chat.hasFunctionCalls(mockResponse);
            expect(result).toBeFalsy();
        });
    });

    describe('getFunctionCalls', () => {
        it('should get function calls from response', () => {
            const functionCalls = [{ name: 'testFunction', args: {} }];
            const mockResponse = {
                functionCalls: () => functionCalls
            };
            
            const calls = chat.getFunctionCalls(mockResponse);
            expect(calls).toEqual(functionCalls);
        });

        it('should return empty array when no function calls', () => {
            const mockResponse = {
                functionCalls: () => []
            };
            
            const calls = chat.getFunctionCalls(mockResponse);
            expect(calls).toEqual([]);
        });

        it('should return empty array when functionCalls is undefined', () => {
            const mockResponse = {};
            
            const calls = chat.getFunctionCalls(mockResponse);
            expect(calls).toEqual([]);
        });
    });

    describe('createFunctionResponse', () => {
        it('should create successful function response', () => {
            const response = chat.createFunctionResponse('testFunction', { data: 'result' }, true);
            
            expect(response).toEqual({
                functionResponse: {
                    name: 'testFunction',
                    response: { result: { data: 'result' } }
                }
            });
        });

        it('should create error function response', () => {
            const response = chat.createFunctionResponse('testFunction', 'Error message', false);
            
            expect(response).toEqual({
                functionResponse: {
                    name: 'testFunction',
                    response: { error: 'Error message' }
                }
            });
        });

        it('should default to success if not specified', () => {
            const response = chat.createFunctionResponse('testFunction', { data: 'result' });
            
            expect(response).toEqual({
                functionResponse: {
                    name: 'testFunction',
                    response: { result: { data: 'result' } }
                }
            });
        });
    });

    describe('processAudioMessage', () => {
        it('should process audio with instruction', async () => {
            const mockResponse = { text: () => 'Audio processed' };
            const mockChat = {
                sendMessage: vi.fn().mockResolvedValue({ response: mockResponse })
            };
            const mockModel = {
                startChat: vi.fn().mockReturnValue(mockChat)
            };
            
            const audioBuffer = Buffer.from('fake audio data');
            const result = await chat.processAudioMessage(
                mockModel,
                audioBuffer,
                'audio/webm',
                'Listen to this',
                []
            );
            
            expect(mockModel.startChat).toHaveBeenCalled();
            expect(mockChat.sendMessage).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        inlineData: expect.objectContaining({
                            mimeType: 'audio/webm',
                            data: audioBuffer.toString('base64')
                        })
                    }),
                    { text: 'Listen to this' }
                ])
            );
            expect(result.chat).toBe(mockChat);
            expect(result.response).toBe(mockResponse);
        });

        it('should process audio without instruction', async () => {
            const mockResponse = { text: () => 'Audio processed' };
            const mockChat = {
                sendMessage: vi.fn().mockResolvedValue({ response: mockResponse })
            };
            const mockModel = {
                startChat: vi.fn().mockReturnValue(mockChat)
            };
            
            const audioBuffer = Buffer.from('fake audio data');
            const result = await chat.processAudioMessage(
                mockModel,
                audioBuffer,
                'audio/webm',
                '',
                []
            );
            
            expect(mockChat.sendMessage).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        inlineData: expect.any(Object)
                    })
                ])
            );
            expect(result.chat).toBe(mockChat);
        });

        it('should use conversation history', async () => {
            const mockResponse = { text: () => 'Audio processed' };
            const mockChat = {
                sendMessage: vi.fn().mockResolvedValue({ response: mockResponse })
            };
            const mockModel = {
                startChat: vi.fn().mockReturnValue(mockChat)
            };
            
            const history = [
                { role: 'user', content: 'Previous message' },
                { role: 'model', content: 'Previous response' }
            ];
            
            const audioBuffer = Buffer.from('fake audio data');
            await chat.processAudioMessage(
                mockModel,
                audioBuffer,
                'audio/webm',
                'Listen',
                history
            );
            
            expect(mockModel.startChat).toHaveBeenCalledWith({
                history: expect.arrayContaining([
                    { role: 'user', parts: [{ text: 'Previous message' }] },
                    { role: 'model', parts: [{ text: 'Previous response' }] }
                ])
            });
        });
    });
});
