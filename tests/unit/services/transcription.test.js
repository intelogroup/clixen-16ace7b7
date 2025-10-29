/**
 * Tests for Audio Transcription Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transcribeAudioAsync, transcribeAudio } from '../../../backend/server/services/audio/transcription.js';

describe('Audio Transcription Service', () => {
    let mockGeminiClient;
    let mockAddToHistory;
    let mockGetHistory;
    let mockAudioBuffer;

    beforeEach(() => {
        // Mock audio buffer
        mockAudioBuffer = Buffer.from('fake-audio-data');

        // Mock conversation history functions
        mockAddToHistory = vi.fn();
        mockGetHistory = vi.fn(() => [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' }
        ]);

        // Mock Gemini client
        mockGeminiClient = {
            getGenerativeModel: vi.fn(() => ({
                generateContent: vi.fn(async () => ({
                    response: {
                        text: () => 'This is a test transcription.'
                    }
                }))
            }))
        };

        // Reset console mocks
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    describe('transcribeAudioAsync', () => {
        it('should transcribe audio successfully', async () => {
            const result = await transcribeAudioAsync(
                mockAudioBuffer,
                'test@example.com',
                'audio/webm',
                mockGeminiClient,
                mockAddToHistory,
                mockGetHistory
            );

            expect(result).toBe('This is a test transcription.');
            expect(mockGeminiClient.getGenerativeModel).toHaveBeenCalledWith({ 
                model: 'gemini-2.0-flash-exp' 
            });
        });

        it('should add transcription to conversation history', async () => {
            await transcribeAudioAsync(
                mockAudioBuffer,
                'test@example.com',
                'audio/webm',
                mockGeminiClient,
                mockAddToHistory,
                mockGetHistory
            );

            expect(mockAddToHistory).toHaveBeenCalledWith(
                'test@example.com',
                'user',
                'This is a test transcription.'
            );
            expect(mockGetHistory).toHaveBeenCalledWith('test@example.com');
        });

        it('should handle different MIME types', async () => {
            const model = mockGeminiClient.getGenerativeModel();
            
            await transcribeAudioAsync(
                mockAudioBuffer,
                'test@example.com',
                'audio/mp3',
                mockGeminiClient,
                mockAddToHistory,
                mockGetHistory
            );

            expect(model.generateContent).toHaveBeenCalledWith([
                expect.objectContaining({
                    inlineData: expect.objectContaining({
                        mimeType: 'audio/mp3'
                    })
                }),
                expect.any(Object)
            ]);
        });

        it('should use default MIME type if not specified', async () => {
            const model = mockGeminiClient.getGenerativeModel();
            
            await transcribeAudioAsync(
                mockAudioBuffer,
                'test@example.com',
                undefined,
                mockGeminiClient,
                mockAddToHistory,
                mockGetHistory
            );

            expect(model.generateContent).toHaveBeenCalledWith([
                expect.objectContaining({
                    inlineData: expect.objectContaining({
                        mimeType: 'audio/webm'
                    })
                }),
                expect.any(Object)
            ]);
        });

        it('should return null on transcription error', async () => {
            mockGeminiClient.getGenerativeModel = vi.fn(() => ({
                generateContent: vi.fn().mockRejectedValue(new Error('API Error'))
            }));

            const result = await transcribeAudioAsync(
                mockAudioBuffer,
                'test@example.com',
                'audio/webm',
                mockGeminiClient,
                mockAddToHistory,
                mockGetHistory
            );

            expect(result).toBeNull();
            expect(mockAddToHistory).not.toHaveBeenCalled();
        });

        it('should trim whitespace from transcription', async () => {
            mockGeminiClient.getGenerativeModel = vi.fn(() => ({
                generateContent: vi.fn(async () => ({
                    response: {
                        text: () => '  Transcription with spaces  \n'
                    }
                }))
            }));

            const result = await transcribeAudioAsync(
                mockAudioBuffer,
                'test@example.com',
                'audio/webm',
                mockGeminiClient,
                mockAddToHistory,
                mockGetHistory
            );

            expect(result).toBe('Transcription with spaces');
        });

        it('should convert audio buffer to base64', async () => {
            const model = mockGeminiClient.getGenerativeModel();
            
            await transcribeAudioAsync(
                mockAudioBuffer,
                'test@example.com',
                'audio/webm',
                mockGeminiClient,
                mockAddToHistory,
                mockGetHistory
            );

            expect(model.generateContent).toHaveBeenCalledWith([
                expect.objectContaining({
                    inlineData: expect.objectContaining({
                        data: mockAudioBuffer.toString('base64')
                    })
                }),
                expect.any(Object)
            ]);
        });

        it('should log progress messages', async () => {
            await transcribeAudioAsync(
                mockAudioBuffer,
                'test@example.com',
                'audio/webm',
                mockGeminiClient,
                mockAddToHistory,
                mockGetHistory
            );

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[Async STT] Starting background transcription')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[Async STT] Transcription complete')
            );
        });
    });

    describe('transcribeAudio', () => {
        it('should transcribe audio synchronously', async () => {
            const result = await transcribeAudio(
                mockAudioBuffer,
                'audio/webm',
                mockGeminiClient
            );

            expect(result).toBe('This is a test transcription.');
            expect(mockGeminiClient.getGenerativeModel).toHaveBeenCalledWith({ 
                model: 'gemini-2.0-flash-exp' 
            });
        });

        it('should not add to conversation history', async () => {
            await transcribeAudio(
                mockAudioBuffer,
                'audio/webm',
                mockGeminiClient
            );

            expect(mockAddToHistory).not.toHaveBeenCalled();
            expect(mockGetHistory).not.toHaveBeenCalled();
        });

        it('should handle transcription errors by throwing', async () => {
            mockGeminiClient.getGenerativeModel = vi.fn(() => ({
                generateContent: vi.fn().mockRejectedValue(new Error('API Error'))
            }));

            await expect(
                transcribeAudio(mockAudioBuffer, 'audio/webm', mockGeminiClient)
            ).rejects.toThrow('API Error');
        });

        it('should use default MIME type', async () => {
            const model = mockGeminiClient.getGenerativeModel();
            
            await transcribeAudio(mockAudioBuffer, undefined, mockGeminiClient);

            expect(model.generateContent).toHaveBeenCalledWith([
                expect.objectContaining({
                    inlineData: expect.objectContaining({
                        mimeType: 'audio/webm'
                    })
                }),
                expect.any(Object)
            ]);
        });

        it('should include transcription prompt', async () => {
            const model = mockGeminiClient.getGenerativeModel();
            
            await transcribeAudio(mockAudioBuffer, 'audio/webm', mockGeminiClient);

            expect(model.generateContent).toHaveBeenCalledWith([
                expect.any(Object),
                expect.objectContaining({
                    text: expect.stringContaining('Transcribe this audio exactly')
                })
            ]);
        });
    });
});
