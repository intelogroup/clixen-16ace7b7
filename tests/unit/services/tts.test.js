/**
 * Tests for Text-to-Speech Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { textToSpeechGoogle, streamingTextToSpeech } from '../../../backend/server/services/audio/tts.js';
import fs from 'fs';
import textToSpeech from '@google-cloud/text-to-speech';

// Mock @google-cloud/text-to-speech
vi.mock('@google-cloud/text-to-speech', () => ({
    default: {
        TextToSpeechClient: vi.fn()
    }
}));

describe('Text-to-Speech Service', () => {
    let mockTTSClient;
    const testOutputPath = 'c:\\Users\\jayve\\projects\\clixen\\public\\test-output.mp3';
    const originalEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    beforeEach(() => {
        // Mock environment
        process.env.GOOGLE_APPLICATION_CREDENTIALS = 'c:\\test\\credentials.json';

        // Mock fs.existsSync for credentials check
        vi.spyOn(fs, 'existsSync').mockImplementation((path) => {
            if (path.includes('credentials.json')) return true;
            if (path.includes('test-output')) return true;
            return false;
        });

        // Mock TTS client
        mockTTSClient = {
            synthesizeSpeech: vi.fn(async () => [{
                audioContent: Buffer.from('fake-audio-data')
            }])
        };

        textToSpeech.TextToSpeechClient.mockImplementation(() => mockTTSClient);

        // Mock file operations
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        vi.spyOn(fs, 'statSync').mockReturnValue({ size: 12345 });
        vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('fake-audio-data'));
        vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
        vi.spyOn(fs, 'copyFileSync').mockImplementation(() => {});

        // Mock console
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = originalEnv;
        vi.restoreAllMocks();
    });

    describe('textToSpeechGoogle', () => {
        it('should synthesize speech successfully', async () => {
            const result = await textToSpeechGoogle('Hello world', testOutputPath);

            expect(result).toBe(true);
            expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                testOutputPath,
                expect.any(Buffer),
                'binary'
            );
        });

        it('should throw error if credentials not configured', async () => {
            fs.existsSync.mockReturnValue(false);

            await expect(
                textToSpeechGoogle('Hello', testOutputPath)
            ).rejects.toThrow('Google Cloud credentials NOT configured');
        });

        it('should use default voice configuration', async () => {
            await textToSpeechGoogle('Hello world', testOutputPath);

            expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalledWith(
                expect.objectContaining({
                    voice: expect.objectContaining({
                        languageCode: 'en-US',
                        name: 'en-US-Neural2-J',
                        ssmlGender: 'MALE'
                    })
                })
            );
        });

        it('should use custom voice configuration', async () => {
            const voiceConfig = {
                name: 'en-US-Neural2-C',
                ssmlGender: 'FEMALE',
                speakingRate: 1.2,
                pitch: 2.0,
                volumeGainDb: 4.0
            };

            await textToSpeechGoogle('Hello world', testOutputPath, voiceConfig);

            expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalledWith(
                expect.objectContaining({
                    voice: expect.objectContaining({
                        name: 'en-US-Neural2-C',
                        ssmlGender: 'FEMALE'
                    }),
                    audioConfig: expect.objectContaining({
                        speakingRate: 1.2,
                        pitch: 2.0,
                        volumeGainDb: 4.0
                    })
                })
            );
        });

        it('should configure audio settings', async () => {
            await textToSpeechGoogle('Hello world', testOutputPath);

            expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalledWith(
                expect.objectContaining({
                    audioConfig: expect.objectContaining({
                        audioEncoding: 'MP3',
                        speakingRate: 1.05,
                        pitch: 0.0,
                        volumeGainDb: 2.0,
                        effectsProfileId: ['headphone-class-device']
                    })
                })
            );
        });

        it('should handle TTS timeout', async () => {
            mockTTSClient.synthesizeSpeech.mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 20000))
            );

            await expect(
                textToSpeechGoogle('Hello', testOutputPath)
            ).rejects.toThrow('timeout');
        });

        it('should handle TTS API errors', async () => {
            mockTTSClient.synthesizeSpeech.mockRejectedValue(
                new Error('API quota exceeded')
            );

            await expect(
                textToSpeechGoogle('Hello', testOutputPath)
            ).rejects.toThrow('Google Cloud TTS failed');
        });

        it('should pass text to TTS request', async () => {
            const text = 'This is a test sentence.';
            await textToSpeechGoogle(text, testOutputPath);

            expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: { text: text }
                })
            );
        });

        it('should log progress information', async () => {
            await textToSpeechGoogle('Hello world', testOutputPath);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Google Cloud TTS API')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('successful')
            );
        });
    });

    describe('streamingTextToSpeech', () => {
        it('should use standard TTS for single sentence', async () => {
            const text = 'This is one sentence.';
            const result = await streamingTextToSpeech(text, testOutputPath);

            expect(result).toBe(true);
            expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalledTimes(1);
        });

        it('should split text into sentences', async () => {
            const text = 'First sentence. Second sentence. Third sentence.';
            await streamingTextToSpeech(text, testOutputPath);

            // First sentence + 2 more = 3 total calls
            expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalledTimes(3);
        });

        it('should generate first sentence immediately', async () => {
            const text = 'First sentence. Second sentence.';
            await streamingTextToSpeech(text, testOutputPath);

            // Verify first chunk was saved
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('_chunk_0.mp3'),
                expect.any(Buffer),
                'binary'
            );
        });

        it('should concatenate audio chunks', async () => {
            const text = 'First. Second. Third.';
            await streamingTextToSpeech(text, testOutputPath);

            // Should read chunk files
            expect(fs.readFileSync).toHaveBeenCalled();
            
            // Should write concatenated output
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                testOutputPath,
                expect.any(Buffer)
            );
        });

        it('should clean up temporary chunk files', async () => {
            const text = 'First. Second.';
            await streamingTextToSpeech(text, testOutputPath);

            // Should delete temporary chunks
            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        it('should handle concatenation errors gracefully', async () => {
            const text = 'First. Second.';
            
            // Make readFileSync fail on second call (for concatenation)
            fs.readFileSync.mockImplementationOnce(() => Buffer.from('data'))
                .mockImplementationOnce(() => { throw new Error('Read error'); });

            const result = await streamingTextToSpeech(text, testOutputPath);

            // Should still return true with fallback
            expect(result).toBe(true);
            expect(fs.copyFileSync).toHaveBeenCalled();
        });

        it('should respect concurrent limit when generating chunks', async () => {
            // Create text with 5 sentences (4 after first)
            const text = 'First. Second. Third. Fourth. Fifth.';
            
            let maxConcurrent = 0;
            let currentConcurrent = 0;

            mockTTSClient.synthesizeSpeech.mockImplementation(async () => {
                currentConcurrent++;
                maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                currentConcurrent--;
                return [{ audioContent: Buffer.from('fake-audio-data') }];
            });

            await streamingTextToSpeech(text, testOutputPath);

            // CONCURRENT_LIMIT is 3 in the code
            expect(maxConcurrent).toBeLessThanOrEqual(3);
        });

        it('should handle empty or invalid text', async () => {
            const text = '';
            const result = await streamingTextToSpeech(text, testOutputPath);

            expect(result).toBe(true);
            expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalledTimes(1);
        });

        it('should pass voice config to all chunks', async () => {
            const text = 'First. Second.';
            const voiceConfig = { name: 'en-US-Neural2-C' };
            
            await streamingTextToSpeech(text, testOutputPath, voiceConfig);

            // All calls should use the voice config
            expect(mockTTSClient.synthesizeSpeech).toHaveBeenCalledWith(
                expect.objectContaining({
                    voice: expect.objectContaining({
                        name: 'en-US-Neural2-C'
                    })
                })
            );
        });

        it('should log streaming progress', async () => {
            const text = 'First. Second. Third.';
            await streamingTextToSpeech(text, testOutputPath);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('STREAMING TTS')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Split into')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('chunks merged')
            );
        });
    });
});
