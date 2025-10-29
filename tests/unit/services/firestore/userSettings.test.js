/**
 * User Settings Firestore Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as userSettings from '../../../../backend/server/services/firestore/userSettings.js';

// Mock Firebase
const mockFirestore = {
    collection: vi.fn(),
};

const mockDocRef = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
};

const mockCollectionRef = {
    doc: vi.fn(() => mockDocRef),
};

vi.mock('../../../../firebase-config.js', () => ({
    getFirestore: vi.fn(() => mockFirestore),
}));

describe('User Settings Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFirestore.collection.mockReturnValue(mockCollectionRef);
        userSettings.clearSettingsCache();
    });

    afterEach(() => {
        userSettings.clearSettingsCache();
    });

    describe('getUserSettings', () => {
        it('should fetch settings from Firestore for existing user', async () => {
            const mockSettings = {
                voice: { name: 'en-US-Neural2-C', ssmlGender: 'FEMALE' },
                language: 'en-US',
                preferences: { conversationStyle: 'detailed' },
                metadata: { createdAt: '2024-01-01T00:00:00Z' }
            };

            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockSettings,
            });

            const result = await userSettings.getUserSettings('test@example.com');

            expect(mockFirestore.collection).toHaveBeenCalledWith('users');
            expect(mockCollectionRef.doc).toHaveBeenCalledWith('test@example.com');
            expect(result).toEqual(mockSettings);
        });

        it('should create default settings for new user', async () => {
            mockDocRef.get.mockResolvedValue({
                exists: false,
            });

            const result = await userSettings.getUserSettings('newuser@example.com');

            expect(mockDocRef.set).toHaveBeenCalled();
            const setCall = mockDocRef.set.mock.calls[0][0];
            expect(setCall).toHaveProperty('voice.name', 'en-US-Neural2-J');
            expect(setCall).toHaveProperty('language', 'en-US');
            expect(setCall).toHaveProperty('metadata.createdAt');
            expect(result).toMatchObject({
                voice: expect.any(Object),
                language: expect.any(String),
                preferences: expect.any(Object),
            });
        });

        it('should use cache on subsequent calls within TTL', async () => {
            const mockSettings = { voice: { name: 'test' } };
            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockSettings,
            });

            // First call - should hit Firestore
            await userSettings.getUserSettings('cached@example.com');
            expect(mockDocRef.get).toHaveBeenCalledTimes(1);

            // Second call - should use cache
            await userSettings.getUserSettings('cached@example.com');
            expect(mockDocRef.get).toHaveBeenCalledTimes(1); // Still 1, not 2
        });

        it('should throw error if email is missing', async () => {
            await expect(userSettings.getUserSettings()).rejects.toThrow('User email is required');
        });

        it('should return default settings on Firestore error', async () => {
            mockDocRef.get.mockRejectedValue(new Error('Firestore error'));

            const result = await userSettings.getUserSettings('error@example.com');

            expect(result).toEqual(userSettings.DEFAULT_SETTINGS);
        });
    });

    describe('updateUserSettings', () => {
        it('should update user settings with partial data', async () => {
            const existingSettings = {
                voice: { name: 'en-US-Neural2-J', ssmlGender: 'MALE' },
                language: 'en-US',
                preferences: { conversationStyle: 'balanced' },
                metadata: { createdAt: '2024-01-01T00:00:00Z' }
            };

            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => existingSettings,
            });

            const updates = {
                voice: { name: 'en-US-Neural2-C' },
                preferences: { conversationStyle: 'detailed' }
            };

            const result = await userSettings.updateUserSettings('test@example.com', updates);

            expect(mockDocRef.set).toHaveBeenCalled();
            const setCall = mockDocRef.set.mock.calls[0][0];
            expect(setCall.voice.name).toBe('en-US-Neural2-C');
            expect(setCall.voice.ssmlGender).toBe('MALE'); // Should preserve
            expect(setCall.preferences.conversationStyle).toBe('detailed');
            expect(setCall.metadata.updatedAt).toBeDefined();
        });

        it('should deep merge nested objects', async () => {
            const existingSettings = {
                voice: { name: 'en-US-Neural2-J', speakingRate: 1.0, pitch: 0.0 },
                metadata: { createdAt: '2024-01-01' }
            };

            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => existingSettings,
            });

            const updates = {
                voice: { speakingRate: 1.2 }
            };

            await userSettings.updateUserSettings('test@example.com', updates);

            const setCall = mockDocRef.set.mock.calls[0][0];
            expect(setCall.voice.name).toBe('en-US-Neural2-J');
            expect(setCall.voice.speakingRate).toBe(1.2);
            expect(setCall.voice.pitch).toBe(0.0);
        });

        it('should invalidate cache after update', async () => {
            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ voice: { name: 'test' } }),
            });

            // Populate cache
            await userSettings.getUserSettings('test@example.com');
            expect(mockDocRef.get).toHaveBeenCalledTimes(1);

            // Update settings
            await userSettings.updateUserSettings('test@example.com', { language: 'es-ES' });

            // Next get should fetch from Firestore again
            await userSettings.getUserSettings('test@example.com');
            expect(mockDocRef.get).toHaveBeenCalledTimes(2);
        });

        it('should throw error if email is missing', async () => {
            await expect(userSettings.updateUserSettings(null, {})).rejects.toThrow('User email is required');
        });

        it('should throw error if updates object is invalid', async () => {
            await expect(userSettings.updateUserSettings('test@example.com', null)).rejects.toThrow('Updates object is required');
        });
    });

    describe('updateLastActive', () => {
        it('should update last active timestamp', async () => {
            await userSettings.updateLastActive('test@example.com');

            expect(mockDocRef.set).toHaveBeenCalled();
            const setCall = mockDocRef.set.mock.calls[0][0];
            expect(setCall.metadata.lastActive).toBeDefined();
            expect(setCall.metadata.lastActive).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('should not throw if email is missing', async () => {
            await expect(userSettings.updateLastActive(null)).resolves.not.toThrow();
        });

        it('should update cache if exists', async () => {
            const mockSettings = {
                metadata: { lastActive: '2024-01-01T00:00:00Z' }
            };
            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockSettings,
            });

            // Populate cache
            await userSettings.getUserSettings('test@example.com');

            // Update last active
            await userSettings.updateLastActive('test@example.com');

            // Get from cache
            const result = await userSettings.getUserSettings('test@example.com');
            expect(result.metadata.lastActive).not.toBe('2024-01-01T00:00:00Z');
        });
    });

    describe('deleteUserSettings', () => {
        it('should delete user settings from Firestore', async () => {
            await userSettings.deleteUserSettings('test@example.com');

            expect(mockFirestore.collection).toHaveBeenCalledWith('users');
            expect(mockCollectionRef.doc).toHaveBeenCalledWith('test@example.com');
            expect(mockDocRef.delete).toHaveBeenCalled();
        });

        it('should invalidate cache after deletion', async () => {
            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ voice: { name: 'test' } }),
            });

            // Populate cache
            await userSettings.getUserSettings('test@example.com');

            // Delete
            await userSettings.deleteUserSettings('test@example.com');

            // Cache should be cleared
            const stats = userSettings.getSettingsCacheStats();
            expect(stats.entries).not.toContain('test@example.com');
        });

        it('should throw error if email is missing', async () => {
            await expect(userSettings.deleteUserSettings()).rejects.toThrow('User email is required');
        });
    });

    describe('Cache management', () => {
        it('should clear cache for specific user', async () => {
            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ voice: { name: 'test' } }),
            });

            await userSettings.getUserSettings('user1@example.com');
            await userSettings.getUserSettings('user2@example.com');

            userSettings.clearSettingsCache('user1@example.com');

            const stats = userSettings.getSettingsCacheStats();
            expect(stats.entries).toContain('user2@example.com');
            expect(stats.entries).not.toContain('user1@example.com');
        });

        it('should clear cache for all users', async () => {
            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ voice: { name: 'test' } }),
            });

            await userSettings.getUserSettings('user1@example.com');
            await userSettings.getUserSettings('user2@example.com');

            userSettings.clearSettingsCache();

            const stats = userSettings.getSettingsCacheStats();
            expect(stats.size).toBe(0);
        });

        it('should return cache statistics', async () => {
            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ voice: { name: 'test' } }),
            });

            await userSettings.getUserSettings('user1@example.com');

            const stats = userSettings.getSettingsCacheStats();
            expect(stats).toHaveProperty('size', 1);
            expect(stats).toHaveProperty('ttl', 5 * 60 * 1000);
            expect(stats.entries).toContain('user1@example.com');
        });
    });

    describe('Default settings', () => {
        it('should have valid default settings structure', () => {
            const defaults = userSettings.DEFAULT_SETTINGS;

            expect(defaults).toHaveProperty('voice');
            expect(defaults.voice).toHaveProperty('name');
            expect(defaults.voice).toHaveProperty('ssmlGender');
            expect(defaults.voice).toHaveProperty('speakingRate');
            expect(defaults).toHaveProperty('language');
            expect(defaults).toHaveProperty('timezone');
            expect(defaults).toHaveProperty('preferences');
            expect(defaults.preferences).toHaveProperty('conversationStyle');
            expect(defaults.preferences).toHaveProperty('calendarView');
            expect(defaults).toHaveProperty('metadata');
        });
    });
});
