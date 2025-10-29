/**
 * Tests for Audio Storage Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    DEFAULT_AUDIO_DIR,
    ensureAudioDirectory,
    generateAudioPath,
    cleanupOldAudioFiles,
    deleteAudioFile,
    saveAudioFile,
    readAudioFile,
    getAudioFileInfo
} from '../../../backend/server/services/audio/storage.js';
import fs from 'fs';
import path from 'path';

describe('Audio Storage Service', () => {
    beforeEach(() => {
        // Mock console
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Mock file system operations
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);
        vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test-audio-data'));
        vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
        vi.spyOn(fs, 'statSync').mockReturnValue({
            size: 5000,
            birthtime: new Date('2024-01-01'),
            mtime: new Date('2024-01-02'),
            mtimeMs: Date.now()
        });
        vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('ensureAudioDirectory', () => {
        it('should create directory if it does not exist', () => {
            ensureAudioDirectory('c:\\test\\audio');

            expect(fs.mkdirSync).toHaveBeenCalledWith('c:\\test\\audio', { recursive: true });
        });

        it('should not create directory if it exists', () => {
            fs.existsSync.mockReturnValue(true);
            
            ensureAudioDirectory('c:\\test\\audio');

            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });

        it('should use default directory if not specified', () => {
            ensureAudioDirectory();

            expect(fs.mkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('public'),
                { recursive: true }
            );
        });
    });

    describe('generateAudioPath', () => {
        it('should generate unique audio path with timestamp', () => {
            const path1 = generateAudioPath('test', 'mp3', 'c:\\audio');
            const path2 = generateAudioPath('test', 'mp3', 'c:\\audio');

            expect(path1).toMatch(/test-\d+\.mp3$/);
            expect(path1).not.toBe(path2); // Should be unique
        });

        it('should use default values when not specified', () => {
            const audioPath = generateAudioPath();

            expect(audioPath).toMatch(/audio-\d+\.mp3$/);
            expect(audioPath).toContain('public');
        });

        it('should ensure directory exists', () => {
            generateAudioPath('test', 'mp3', 'c:\\new\\dir');

            expect(fs.existsSync).toHaveBeenCalledWith('c:\\new\\dir');
        });

        it('should handle different file extensions', () => {
            const wavPath = generateAudioPath('test', 'wav', 'c:\\audio');
            const webmPath = generateAudioPath('test', 'webm', 'c:\\audio');

            expect(wavPath).toMatch(/\.wav$/);
            expect(webmPath).toMatch(/\.webm$/);
        });
    });

    describe('cleanupOldAudioFiles', () => {
        it('should delete files older than max age', () => {
            const oldTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
            
            fs.readdirSync.mockReturnValue(['old-audio.mp3', 'new-audio.mp3']);
            fs.statSync
                .mockReturnValueOnce({ mtimeMs: oldTime }) // old file
                .mockReturnValueOnce({ mtimeMs: Date.now() }); // new file

            const deleted = cleanupOldAudioFiles('c:\\audio', 60 * 60 * 1000); // 1 hour max age

            expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
            expect(deleted).toBe(1);
        });

        it('should only process audio files', () => {
            fs.readdirSync.mockReturnValue([
                'audio.mp3',
                'audio.wav',
                'document.txt',
                'image.png'
            ]);
            fs.statSync.mockReturnValue({ mtimeMs: Date.now() - (2 * 60 * 60 * 1000) });

            cleanupOldAudioFiles('c:\\audio', 60 * 60 * 1000);

            // Should only check audio files
            expect(fs.statSync).toHaveBeenCalledTimes(2); // mp3 and wav only
        });

        it('should return 0 if directory does not exist', () => {
            fs.existsSync.mockReturnValue(false);

            const deleted = cleanupOldAudioFiles('c:\\nonexistent');

            expect(deleted).toBe(0);
            expect(fs.readdirSync).not.toHaveBeenCalled();
        });

        it('should handle file deletion errors gracefully', () => {
            fs.readdirSync.mockReturnValue(['error-audio.mp3']);
            fs.statSync.mockReturnValue({ mtimeMs: Date.now() - (2 * 60 * 60 * 1000) });
            fs.unlinkSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            const deleted = cleanupOldAudioFiles('c:\\audio', 60 * 60 * 1000);

            expect(deleted).toBe(0);
            expect(console.warn).toHaveBeenCalled();
        });

        it('should use default max age', () => {
            const oneHourAgo = Date.now() - (59 * 60 * 1000); // 59 minutes
            const twoHoursAgo = Date.now() - (61 * 60 * 1000); // 61 minutes
            
            fs.readdirSync.mockReturnValue(['recent.mp3', 'old.mp3']);
            fs.statSync
                .mockReturnValueOnce({ mtimeMs: oneHourAgo })
                .mockReturnValueOnce({ mtimeMs: twoHoursAgo });

            const deleted = cleanupOldAudioFiles('c:\\audio'); // Default: 1 hour

            expect(deleted).toBe(1); // Only old.mp3 should be deleted
        });
    });

    describe('deleteAudioFile', () => {
        it('should delete existing file', () => {
            fs.existsSync.mockReturnValue(true);

            const result = deleteAudioFile('c:\\audio\\test.mp3');

            expect(result).toBe(true);
            expect(fs.unlinkSync).toHaveBeenCalledWith('c:\\audio\\test.mp3');
        });

        it('should return false if file does not exist', () => {
            fs.existsSync.mockReturnValue(false);

            const result = deleteAudioFile('c:\\audio\\missing.mp3');

            expect(result).toBe(false);
            expect(fs.unlinkSync).not.toHaveBeenCalled();
        });

        it('should handle deletion errors', () => {
            fs.existsSync.mockReturnValue(true);
            fs.unlinkSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            const result = deleteAudioFile('c:\\audio\\error.mp3');

            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('saveAudioFile', () => {
        it('should save audio buffer to file', () => {
            const buffer = Buffer.from('test-audio-data');
            fs.existsSync.mockReturnValue(true);

            const result = saveAudioFile(buffer, 'c:\\audio\\output.mp3');

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'c:\\audio\\output.mp3',
                buffer,
                'binary'
            );
            expect(result).toMatchObject({
                path: 'c:\\audio\\output.mp3',
                size: 5000
            });
        });

        it('should create directory if needed', () => {
            const buffer = Buffer.from('test-audio-data');
            fs.existsSync.mockReturnValue(false);

            saveAudioFile(buffer, 'c:\\new\\dir\\output.mp3');

            expect(fs.mkdirSync).toHaveBeenCalled();
        });

        it('should use custom encoding', () => {
            const buffer = Buffer.from('test-audio-data');
            fs.existsSync.mockReturnValue(true);

            saveAudioFile(buffer, 'c:\\audio\\output.mp3', 'base64');

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'c:\\audio\\output.mp3',
                buffer,
                'base64'
            );
        });

        it('should throw error on write failure', () => {
            const buffer = Buffer.from('test-audio-data');
            fs.existsSync.mockReturnValue(true);
            fs.writeFileSync.mockImplementation(() => {
                throw new Error('Disk full');
            });

            expect(() => {
                saveAudioFile(buffer, 'c:\\audio\\output.mp3');
            }).toThrow('Disk full');
        });

        it('should return file size info', () => {
            const buffer = Buffer.from('test-audio-data');
            fs.existsSync.mockReturnValue(true);
            fs.statSync.mockReturnValue({ size: 12345 });

            const result = saveAudioFile(buffer, 'c:\\audio\\output.mp3');

            expect(result.size).toBe(12345);
            expect(result.sizeKB).toBe('12.05');
        });
    });

    describe('readAudioFile', () => {
        it('should read audio file as buffer', () => {
            fs.existsSync.mockReturnValue(true);

            const buffer = readAudioFile('c:\\audio\\test.mp3');

            expect(buffer).toBeInstanceOf(Buffer);
            expect(fs.readFileSync).toHaveBeenCalledWith('c:\\audio\\test.mp3');
        });

        it('should throw error if file not found', () => {
            fs.existsSync.mockReturnValue(false);

            expect(() => {
                readAudioFile('c:\\audio\\missing.mp3');
            }).toThrow('Audio file not found');
        });

        it('should throw error on read failure', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockImplementation(() => {
                throw new Error('Read error');
            });

            expect(() => {
                readAudioFile('c:\\audio\\test.mp3');
            }).toThrow('Read error');
        });
    });

    describe('getAudioFileInfo', () => {
        it('should return file info for existing file', () => {
            fs.existsSync.mockReturnValue(true);
            fs.statSync.mockReturnValue({
                size: 1024000,
                birthtime: new Date('2024-01-01'),
                mtime: new Date('2024-01-02')
            });

            const info = getAudioFileInfo('c:\\audio\\test.mp3');

            expect(info).toMatchObject({
                path: 'c:\\audio\\test.mp3',
                size: 1024000,
                sizeKB: '1000.00',
                sizeMB: '0.98'
            });
        });

        it('should return null if file does not exist', () => {
            fs.existsSync.mockReturnValue(false);

            const info = getAudioFileInfo('c:\\audio\\missing.mp3');

            expect(info).toBeNull();
        });

        it('should handle stat errors', () => {
            fs.existsSync.mockReturnValue(true);
            fs.statSync.mockImplementation(() => {
                throw new Error('Stat error');
            });

            const info = getAudioFileInfo('c:\\audio\\test.mp3');

            expect(info).toBeNull();
            expect(console.error).toHaveBeenCalled();
        });

        it('should include timestamps', () => {
            const created = new Date('2024-01-01T10:00:00Z');
            const modified = new Date('2024-01-02T15:30:00Z');
            
            fs.existsSync.mockReturnValue(true);
            fs.statSync.mockReturnValue({
                size: 5000,
                birthtime: created,
                mtime: modified
            });

            const info = getAudioFileInfo('c:\\audio\\test.mp3');

            expect(info.created).toEqual(created);
            expect(info.modified).toEqual(modified);
        });
    });

    describe('DEFAULT_AUDIO_DIR', () => {
        it('should point to public directory', () => {
            expect(DEFAULT_AUDIO_DIR).toContain('public');
        });
    });
});
