/**
 * Tests for Audio Service Module (index.js)
 */

import { describe, it, expect } from 'vitest';
import * as audioService from '../../../backend/server/services/audio/index.js';

describe('Audio Service Module Exports', () => {
    describe('Transcription functions', () => {
        it('should export transcribeAudioAsync', () => {
            expect(audioService.transcribeAudioAsync).toBeDefined();
            expect(typeof audioService.transcribeAudioAsync).toBe('function');
        });

        it('should export transcribeAudio', () => {
            expect(audioService.transcribeAudio).toBeDefined();
            expect(typeof audioService.transcribeAudio).toBe('function');
        });
    });

    describe('Text-to-Speech functions', () => {
        it('should export textToSpeechGoogle', () => {
            expect(audioService.textToSpeechGoogle).toBeDefined();
            expect(typeof audioService.textToSpeechGoogle).toBe('function');
        });

        it('should export streamingTextToSpeech', () => {
            expect(audioService.streamingTextToSpeech).toBeDefined();
            expect(typeof audioService.streamingTextToSpeech).toBe('function');
        });
    });

    describe('Storage functions', () => {
        it('should export DEFAULT_AUDIO_DIR', () => {
            expect(audioService.DEFAULT_AUDIO_DIR).toBeDefined();
            expect(typeof audioService.DEFAULT_AUDIO_DIR).toBe('string');
        });

        it('should export ensureAudioDirectory', () => {
            expect(audioService.ensureAudioDirectory).toBeDefined();
            expect(typeof audioService.ensureAudioDirectory).toBe('function');
        });

        it('should export generateAudioPath', () => {
            expect(audioService.generateAudioPath).toBeDefined();
            expect(typeof audioService.generateAudioPath).toBe('function');
        });

        it('should export cleanupOldAudioFiles', () => {
            expect(audioService.cleanupOldAudioFiles).toBeDefined();
            expect(typeof audioService.cleanupOldAudioFiles).toBe('function');
        });

        it('should export deleteAudioFile', () => {
            expect(audioService.deleteAudioFile).toBeDefined();
            expect(typeof audioService.deleteAudioFile).toBe('function');
        });

        it('should export saveAudioFile', () => {
            expect(audioService.saveAudioFile).toBeDefined();
            expect(typeof audioService.saveAudioFile).toBe('function');
        });

        it('should export readAudioFile', () => {
            expect(audioService.readAudioFile).toBeDefined();
            expect(typeof audioService.readAudioFile).toBe('function');
        });

        it('should export getAudioFileInfo', () => {
            expect(audioService.getAudioFileInfo).toBeDefined();
            expect(typeof audioService.getAudioFileInfo).toBe('function');
        });
    });

    describe('Module completeness', () => {
        it('should export all expected functions', () => {
            const expectedExports = [
                'transcribeAudioAsync',
                'transcribeAudio',
                'textToSpeechGoogle',
                'streamingTextToSpeech',
                'DEFAULT_AUDIO_DIR',
                'ensureAudioDirectory',
                'generateAudioPath',
                'cleanupOldAudioFiles',
                'deleteAudioFile',
                'saveAudioFile',
                'readAudioFile',
                'getAudioFileInfo'
            ];

            expectedExports.forEach(exportName => {
                expect(audioService[exportName]).toBeDefined();
            });
        });

        it('should not have unexpected exports', () => {
            const expectedExports = [
                'transcribeAudioAsync',
                'transcribeAudio',
                'textToSpeechGoogle',
                'streamingTextToSpeech',
                'DEFAULT_AUDIO_DIR',
                'ensureAudioDirectory',
                'generateAudioPath',
                'cleanupOldAudioFiles',
                'deleteAudioFile',
                'saveAudioFile',
                'readAudioFile',
                'getAudioFileInfo',
                'default' // ES module default export
            ];

            const actualExports = Object.keys(audioService);
            expect(actualExports.sort()).toEqual(expectedExports.sort());
        });
    });
});
