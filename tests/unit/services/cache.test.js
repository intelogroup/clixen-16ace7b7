/**
 * Unit tests for cache services
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import timezoneCache from '../../../backend/server/services/cache/timezone.js';
import calendarCache from '../../../backend/server/services/cache/calendar.js';
import conversationCache from '../../../backend/server/services/cache/conversation.js';

describe('Timezone Cache Service', () => {
    beforeEach(() => {
        timezoneCache.clearAllTimezoneCache();
    });

    it('should fetch and cache timezone', async () => {
        const mockCalendarClient = {
            settings: {
                get: vi.fn().mockResolvedValue({
                    data: { value: 'America/Los_Angeles' }
                })
            }
        };

        const getCalendarClient = vi.fn().mockResolvedValue(mockCalendarClient);
        
        const timezone = await timezoneCache.getCachedTimezone('test@example.com', getCalendarClient);
        
        expect(timezone).toBe('America/Los_Angeles');
        expect(getCalendarClient).toHaveBeenCalledWith('test@example.com');
    });

    it('should return cached timezone on second call', async () => {
        const mockCalendarClient = {
            settings: {
                get: vi.fn().mockResolvedValue({
                    data: { value: 'America/Chicago' }
                })
            }
        };

        const getCalendarClient = vi.fn().mockResolvedValue(mockCalendarClient);
        
        // First call - fetch from API
        const timezone1 = await timezoneCache.getCachedTimezone('test@example.com', getCalendarClient);
        expect(timezone1).toBe('America/Chicago');
        expect(getCalendarClient).toHaveBeenCalledTimes(1);
        
        // Second call - should use cache
        const timezone2 = await timezoneCache.getCachedTimezone('test@example.com', getCalendarClient);
        expect(timezone2).toBe('America/Chicago');
        expect(getCalendarClient).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should fallback to America/New_York on error', async () => {
        const getCalendarClient = vi.fn().mockRejectedValue(new Error('API Error'));
        
        const timezone = await timezoneCache.getCachedTimezone('test@example.com', getCalendarClient);
        
        expect(timezone).toBe('America/New_York');
    });

    it('should clear timezone cache for specific user', async () => {
        const mockCalendarClient = {
            settings: {
                get: vi.fn().mockResolvedValue({
                    data: { value: 'Europe/London' }
                })
            }
        };

        const getCalendarClient = vi.fn().mockResolvedValue(mockCalendarClient);
        
        await timezoneCache.getCachedTimezone('test@example.com', getCalendarClient);
        timezoneCache.clearTimezoneCache('test@example.com');
        
        // Should fetch again after clear
        await timezoneCache.getCachedTimezone('test@example.com', getCalendarClient);
        expect(getCalendarClient).toHaveBeenCalledTimes(2);
    });

    it('should return cache statistics', () => {
        const stats = timezoneCache.getTimezoneStats();
        expect(stats).toHaveProperty('size');
        expect(stats).toHaveProperty('ttl');
        expect(stats.ttl).toBe(24 * 60 * 60 * 1000);
    });
});

describe('Calendar Cache Service', () => {
    beforeEach(() => {
        calendarCache.clearAllCalendarCache();
    });

    it('should cache calendar query', () => {
        const args = { timeMin: '2025-10-28', timeMax: '2025-10-29' };
        const data = { events: [] };
        
        calendarCache.cacheCalendarQuery('test@example.com', args, data);
        const cached = calendarCache.getCachedCalendarQuery('test@example.com', args);
        
        expect(cached).toEqual(data);
    });

    it('should return null for uncached query', () => {
        const args = { timeMin: '2025-10-28' };
        const cached = calendarCache.getCachedCalendarQuery('test@example.com', args);
        
        expect(cached).toBeNull();
    });

    it('should generate consistent cache keys', () => {
        const args = { timeMin: '2025-10-28', calendarId: 'primary' };
        const key1 = calendarCache.generateCalendarCacheKey('test@example.com', args);
        const key2 = calendarCache.generateCalendarCacheKey('test@example.com', args);
        
        expect(key1).toBe(key2);
    });

    it('should invalidate cache for specific user', () => {
        const args1 = { timeMin: '2025-10-28' };
        const args2 = { timeMin: '2025-10-29' };
        const data = { events: [] };
        
        calendarCache.cacheCalendarQuery('user1@example.com', args1, data);
        calendarCache.cacheCalendarQuery('user1@example.com', args2, data);
        calendarCache.cacheCalendarQuery('user2@example.com', args1, data);
        
        calendarCache.invalidateCalendarCache('user1@example.com');
        
        // user1 cache should be cleared
        expect(calendarCache.getCachedCalendarQuery('user1@example.com', args1)).toBeNull();
        expect(calendarCache.getCachedCalendarQuery('user1@example.com', args2)).toBeNull();
        
        // user2 cache should still exist
        expect(calendarCache.getCachedCalendarQuery('user2@example.com', args1)).toEqual(data);
    });

    it('should clear specific cache entry', () => {
        const args1 = { timeMin: '2025-10-28' };
        const args2 = { timeMin: '2025-10-29' };
        const data = { events: [] };
        
        calendarCache.cacheCalendarQuery('test@example.com', args1, data);
        calendarCache.cacheCalendarQuery('test@example.com', args2, data);
        
        calendarCache.clearCalendarQueryCache('test@example.com', args1);
        
        expect(calendarCache.getCachedCalendarQuery('test@example.com', args1)).toBeNull();
        expect(calendarCache.getCachedCalendarQuery('test@example.com', args2)).toEqual(data);
    });

    it('should return cache statistics', () => {
        const stats = calendarCache.getCalendarCacheStats();
        expect(stats).toHaveProperty('size');
        expect(stats).toHaveProperty('ttl');
        expect(stats.ttl).toBe(5 * 60 * 1000);
    });
});

describe('Conversation Cache Service', () => {
    beforeEach(() => {
        conversationCache.clearAllHistory();
    });

    it('should get empty history for new user', () => {
        const history = conversationCache.getConversationHistory('test@example.com');
        expect(history).toEqual([]);
    });

    it('should add message to history', () => {
        conversationCache.addToHistory('test@example.com', 'user', 'Hello');
        const history = conversationCache.getConversationHistory('test@example.com');
        
        expect(history).toHaveLength(1);
        expect(history[0].role).toBe('user');
        expect(history[0].content).toBe('Hello');
        expect(history[0]).toHaveProperty('timestamp');
    });

    it('should limit history to MAX_HISTORY_MESSAGES', () => {
        const maxMessages = conversationCache.MAX_HISTORY_MESSAGES;
        
        // Add more than max messages
        for (let i = 0; i < maxMessages + 5; i++) {
            conversationCache.addToHistory('test@example.com', 'user', `Message ${i}`);
        }
        
        const history = conversationCache.getConversationHistory('test@example.com');
        expect(history).toHaveLength(maxMessages);
        expect(history[0].content).toBe(`Message 5`); // Oldest messages removed
    });

    it('should format history for Gemini', () => {
        conversationCache.addToHistory('test@example.com', 'user', 'Hello');
        conversationCache.addToHistory('test@example.com', 'assistant', 'Hi there!');
        
        const formatted = conversationCache.formatHistoryForGemini('test@example.com');
        
        expect(formatted).toHaveLength(2);
        expect(formatted[0]).toEqual({
            role: 'user',
            parts: [{ text: 'Hello' }]
        });
        expect(formatted[1]).toEqual({
            role: 'model',
            parts: [{ text: 'Hi there!' }]
        });
    });

    it('should only send last CONTEXT_MESSAGES to Gemini', () => {
        const contextMessages = conversationCache.CONTEXT_MESSAGES;
        
        // Add more than context messages
        for (let i = 0; i < contextMessages + 5; i++) {
            conversationCache.addToHistory('test@example.com', 'user', `Message ${i}`);
        }
        
        const formatted = conversationCache.formatHistoryForGemini('test@example.com');
        expect(formatted).toHaveLength(contextMessages);
    });

    it('should clear history for specific user', () => {
        conversationCache.addToHistory('user1@example.com', 'user', 'Message 1');
        conversationCache.addToHistory('user2@example.com', 'user', 'Message 2');
        
        const cleared = conversationCache.clearHistory('user1@example.com');
        
        expect(cleared).toBe(true);
        expect(conversationCache.getConversationHistory('user1@example.com')).toHaveLength(0);
        expect(conversationCache.getConversationHistory('user2@example.com')).toHaveLength(1);
    });

    it('should return false when clearing non-existent history', () => {
        const cleared = conversationCache.clearHistory('nonexistent@example.com');
        expect(cleared).toBe(false);
    });

    it('should return conversation statistics', () => {
        conversationCache.addToHistory('user1@example.com', 'user', 'Hello');
        conversationCache.addToHistory('user2@example.com', 'user', 'Hi');
        
        const stats = conversationCache.getConversationStats();
        
        expect(stats.totalUsers).toBe(2);
        expect(stats.maxMessages).toBe(conversationCache.MAX_HISTORY_MESSAGES);
        expect(stats.contextMessages).toBe(conversationCache.CONTEXT_MESSAGES);
        expect(stats.users).toHaveLength(2);
    });
});
