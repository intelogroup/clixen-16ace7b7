/**
 * Conversation History Firestore Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as conversationHistory from '../../../../backend/server/services/firestore/conversationHistory.js';

// Mock Firebase
const mockFirestore = {
    collection: vi.fn(),
    batch: vi.fn(),
};

const mockDocRef = {
    collection: vi.fn(),
    doc: vi.fn(),
};

const mockMessagesRef = {
    orderBy: vi.fn(),
    limit: vi.fn(),
    get: vi.fn(),
    doc: vi.fn(),
};

const mockBatch = {
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(),
};

const mockMessageDocRef = {
    id: 'msg_123',
};

vi.mock('../../../../firebase-config.js', () => ({
    getFirestore: vi.fn(() => mockFirestore),
}));

describe('Conversation History Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        conversationHistory.clearConversationCache();

        // Setup mock chain
        mockFirestore.collection.mockReturnValue({ doc: mockDocRef.doc });
        mockDocRef.doc.mockReturnValue(mockDocRef);
        mockDocRef.collection.mockReturnValue(mockMessagesRef);
        mockMessagesRef.orderBy.mockReturnValue(mockMessagesRef);
        mockMessagesRef.limit.mockReturnValue(mockMessagesRef);
        mockMessagesRef.doc.mockReturnValue(mockMessageDocRef);
        mockFirestore.batch.mockReturnValue(mockBatch);
        mockBatch.commit.mockResolvedValue();
    });

    afterEach(() => {
        conversationHistory.clearConversationCache();
    });

    describe('getConversationHistory', () => {
        it('should fetch messages from Firestore', async () => {
            const mockMessages = [
                { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
                { role: 'assistant', content: 'Hi there!', timestamp: '2024-01-01T00:00:01Z' },
            ];

            mockMessagesRef.get.mockResolvedValue({
                forEach: (callback) => {
                    mockMessages.forEach((msg, idx) => {
                        callback({
                            id: `msg_${idx}`,
                            data: () => msg,
                        });
                    });
                },
            });

            const result = await conversationHistory.getConversationHistory('test@example.com');

            expect(mockFirestore.collection).toHaveBeenCalledWith('conversations');
            expect(mockMessagesRef.orderBy).toHaveBeenCalledWith('timestamp', 'asc');
            expect(mockMessagesRef.limit).toHaveBeenCalledWith(50);
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({ role: 'user', content: 'Hello' });
        });

        it('should use cache on subsequent calls within TTL', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: () => {},
            });

            // First call
            await conversationHistory.getConversationHistory('test@example.com');
            expect(mockMessagesRef.get).toHaveBeenCalledTimes(1);

            // Second call - should use cache
            await conversationHistory.getConversationHistory('test@example.com');
            expect(mockMessagesRef.get).toHaveBeenCalledTimes(1);
        });

        it('should return empty array on Firestore error', async () => {
            mockMessagesRef.get.mockRejectedValue(new Error('Firestore error'));

            const result = await conversationHistory.getConversationHistory('test@example.com');

            expect(result).toEqual([]);
        });

        it('should throw error if email is missing', async () => {
            await expect(conversationHistory.getConversationHistory()).rejects.toThrow('User email is required');
        });
    });

    describe('addMessage', () => {
        beforeEach(() => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: () => {},
            });
        });

        it('should add message to cache', async () => {
            const result = await conversationHistory.addMessage(
                'test@example.com',
                'user',
                'Hello world'
            );

            expect(result).toMatchObject({
                role: 'user',
                content: 'Hello world',
                timestamp: expect.any(String),
            });

            // Check cache
            const stats = conversationHistory.getCacheStats();
            expect(stats.users[0].messageCount).toBe(1);
        });

        it('should add message with metadata', async () => {
            const metadata = { audioUrl: 'https://example.com/audio.mp3', duration: 5.2 };

            const result = await conversationHistory.addMessage(
                'test@example.com',
                'assistant',
                'Response text',
                metadata
            );

            expect(result).toMatchObject({
                role: 'assistant',
                content: 'Response text',
                audioUrl: 'https://example.com/audio.mp3',
                duration: 5.2,
            });
        });

        it('should sync to Firestore when threshold reached', async () => {
            // Add multiple messages to reach threshold
            for (let i = 0; i < 5; i++) {
                await conversationHistory.addMessage('test@example.com', 'user', `Message ${i}`);
            }

            expect(mockBatch.set).toHaveBeenCalled();
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should immediately sync user messages', async () => {
            await conversationHistory.addMessage('test@example.com', 'user', 'User message');

            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should trim history to MAX_HISTORY_MESSAGES', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: (callback) => {
                    // Simulate 51 existing messages
                    for (let i = 0; i < 51; i++) {
                        callback({
                            id: `msg_${i}`,
                            data: () => ({ role: 'user', content: `Old ${i}`, timestamp: new Date().toISOString() }),
                        });
                    }
                },
            });

            await conversationHistory.addMessage('test@example.com', 'user', 'New message');

            const stats = conversationHistory.getCacheStats();
            expect(stats.users[0].messageCount).toBeLessThanOrEqual(50);
        });

        it('should throw error if required fields are missing', async () => {
            await expect(conversationHistory.addMessage()).rejects.toThrow();
            await expect(conversationHistory.addMessage('test@example.com')).rejects.toThrow();
            await expect(conversationHistory.addMessage('test@example.com', 'user')).rejects.toThrow();
        });
    });

    describe('syncToFirestore', () => {
        it('should sync pending messages to Firestore', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: () => {},
            });

            // Add messages without syncing
            await conversationHistory.addMessage('test@example.com', 'assistant', 'Message 1');
            await conversationHistory.addMessage('test@example.com', 'assistant', 'Message 2');

            const synced = await conversationHistory.syncToFirestore('test@example.com');

            expect(mockBatch.set).toHaveBeenCalled();
            expect(mockBatch.commit).toHaveBeenCalled();
            expect(synced).toBeGreaterThan(0);
        });

        it('should return 0 if no pending writes', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: () => {},
            });

            await conversationHistory.getConversationHistory('test@example.com');
            const synced = await conversationHistory.syncToFirestore('test@example.com');

            expect(synced).toBe(0);
        });

        it('should update message IDs after sync', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: () => {},
            });

            await conversationHistory.addMessage('test@example.com', 'assistant', 'Test');
            
            const history = await conversationHistory.getConversationHistory('test@example.com');
            const messageBeforeSync = history[0];
            expect(messageBeforeSync.id).toBeUndefined();

            await conversationHistory.syncToFirestore('test@example.com');

            const historyAfterSync = await conversationHistory.getConversationHistory('test@example.com');
            expect(historyAfterSync[0].id).toBe('msg_123');
        });
    });

    describe('formatHistoryForGemini', () => {
        it('should format messages for Gemini API', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: (callback) => {
                    const messages = [
                        { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
                        { role: 'assistant', content: 'Hi!', timestamp: '2024-01-01T00:00:01Z' },
                    ];
                    messages.forEach((msg, idx) => {
                        callback({ id: `msg_${idx}`, data: () => msg });
                    });
                },
            });

            const result = await conversationHistory.formatHistoryForGemini('test@example.com');

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                role: 'user',
                parts: [{ text: 'Hello' }],
            });
            expect(result[1]).toEqual({
                role: 'model',
                parts: [{ text: 'Hi!' }],
            });
        });

        it('should only return last CONTEXT_MESSAGES', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: (callback) => {
                    // Create 20 messages
                    for (let i = 0; i < 20; i++) {
                        callback({
                            id: `msg_${i}`,
                            data: () => ({ role: 'user', content: `Message ${i}`, timestamp: new Date().toISOString() }),
                        });
                    }
                },
            });

            const result = await conversationHistory.formatHistoryForGemini('test@example.com');

            expect(result).toHaveLength(10); // CONTEXT_MESSAGES = 10
        });
    });

    describe('clearHistory', () => {
        it('should clear all messages for a user', async () => {
            const mockDocs = [
                { ref: { id: 'msg_1' } },
                { ref: { id: 'msg_2' } },
            ];

            mockMessagesRef.get.mockResolvedValue({
                empty: false,
                size: 2,
                docs: mockDocs,
            });

            const result = await conversationHistory.clearHistory('test@example.com');

            expect(mockBatch.delete).toHaveBeenCalledTimes(2);
            expect(mockBatch.commit).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should clear cache after clearing history', async () => {
            mockMessagesRef.get.mockResolvedValue({
                empty: false,
                size: 1,
                docs: [{ ref: { id: 'msg_1' } }],
            });

            await conversationHistory.clearHistory('test@example.com');

            const stats = conversationHistory.getCacheStats();
            expect(stats.users).not.toContainEqual(
                expect.objectContaining({ email: 'test@example.com' })
            );
        });

        it('should handle empty conversation gracefully', async () => {
            mockMessagesRef.get.mockResolvedValue({
                empty: true,
            });

            const result = await conversationHistory.clearHistory('test@example.com');

            expect(result).toBe(true);
            expect(mockBatch.delete).not.toHaveBeenCalled();
        });

        it('should throw error if email is missing', async () => {
            await expect(conversationHistory.clearHistory()).rejects.toThrow('User email is required');
        });
    });

    describe('getConversationStats', () => {
        it('should return conversation statistics', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: (callback) => {
                    const messages = [
                        { role: 'user', content: 'Q1', timestamp: '2024-01-01T00:00:00Z' },
                        { role: 'assistant', content: 'A1', timestamp: '2024-01-01T00:00:01Z' },
                        { role: 'user', content: 'Q2', timestamp: '2024-01-01T00:00:02Z' },
                        { role: 'assistant', content: 'A2', timestamp: '2024-01-01T00:00:03Z' },
                    ];
                    messages.forEach((msg, idx) => {
                        callback({ id: `msg_${idx}`, data: () => msg });
                    });
                },
            });

            const stats = await conversationHistory.getConversationStats('test@example.com');

            expect(stats.totalMessages).toBe(4);
            expect(stats.userMessages).toBe(2);
            expect(stats.assistantMessages).toBe(2);
            expect(stats.oldestMessage).toBe('2024-01-01T00:00:00Z');
            expect(stats.newestMessage).toBe('2024-01-01T00:00:03Z');
        });

        it('should handle empty conversation', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: () => {},
            });

            const stats = await conversationHistory.getConversationStats('test@example.com');

            expect(stats.totalMessages).toBe(0);
            expect(stats.userMessages).toBe(0);
            expect(stats.assistantMessages).toBe(0);
            expect(stats.oldestMessage).toBeNull();
            expect(stats.newestMessage).toBeNull();
        });
    });

    describe('Cache management', () => {
        it('should clear cache for specific user', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: () => {},
            });

            await conversationHistory.getConversationHistory('user1@example.com');
            await conversationHistory.getConversationHistory('user2@example.com');

            conversationHistory.clearConversationCache('user1@example.com');

            const stats = conversationHistory.getCacheStats();
            expect(stats.users).toHaveLength(1);
            expect(stats.users[0].email).toBe('user2@example.com');
        });

        it('should clear cache for all users', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: () => {},
            });

            await conversationHistory.getConversationHistory('user1@example.com');
            await conversationHistory.getConversationHistory('user2@example.com');

            conversationHistory.clearConversationCache();

            const stats = conversationHistory.getCacheStats();
            expect(stats.size).toBe(0);
        });

        it('should return cache statistics', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: (callback) => {
                    callback({
                        id: 'msg_1',
                        data: () => ({ role: 'user', content: 'Test', timestamp: new Date().toISOString() }),
                    });
                },
            });

            await conversationHistory.getConversationHistory('test@example.com');

            const stats = conversationHistory.getCacheStats();
            expect(stats).toHaveProperty('size', 1);
            expect(stats).toHaveProperty('ttl', 10 * 60 * 1000);
            expect(stats).toHaveProperty('maxMessages', 50);
            expect(stats).toHaveProperty('contextMessages', 10);
            expect(stats.users).toHaveLength(1);
            expect(stats.users[0]).toMatchObject({
                email: 'test@example.com',
                messageCount: 1,
                pendingWrites: 0,
            });
        });
    });

    describe('syncAllPending', () => {
        it('should sync all users with pending writes', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: () => {},
            });

            // Add messages for multiple users
            await conversationHistory.addMessage('user1@example.com', 'assistant', 'Test 1');
            await conversationHistory.addMessage('user2@example.com', 'assistant', 'Test 2');

            const totalSynced = await conversationHistory.syncAllPending();

            expect(totalSynced).toBeGreaterThan(0);
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should handle sync errors gracefully', async () => {
            mockMessagesRef.get.mockResolvedValue({
                forEach: () => {},
            });

            await conversationHistory.addMessage('user1@example.com', 'assistant', 'Test');

            mockBatch.commit.mockRejectedValueOnce(new Error('Sync error'));

            const totalSynced = await conversationHistory.syncAllPending();

            expect(totalSynced).toBe(0); // Failed syncs don't count
        });
    });

    describe('Constants', () => {
        it('should export configuration constants', () => {
            expect(conversationHistory.MAX_HISTORY_MESSAGES).toBe(50);
            expect(conversationHistory.CONTEXT_MESSAGES).toBe(10);
        });
    });
});
