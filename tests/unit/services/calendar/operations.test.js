/**
 * Unit Tests for Calendar Operations Module
 * Tests calendar CRUD operations with mocked Calendar API
 */

const { describe, it, expect, beforeEach, vi } = require('vitest');

// Mock dependencies
const mockGetCalendarClient = vi.fn();
const mockGetCachedTimezone = vi.fn();
const mockGetCachedCalendarQuery = vi.fn();
const mockCacheCalendarQuery = vi.fn();
const mockInvalidateCalendarCache = vi.fn();

vi.mock('../client', () => ({
    getCalendarClient: mockGetCalendarClient
}));

vi.mock('../../cache/timezone', () => ({
    getCachedTimezone: mockGetCachedTimezone
}));

vi.mock('../../cache/calendar', () => ({
    getCachedCalendarQuery: mockGetCachedCalendarQuery,
    cacheCalendarQuery: mockCacheCalendarQuery,
    invalidateCalendarCache: mockInvalidateCalendarCache
}));

describe('Calendar Operations Module', () => {
    let operations;
    let mockCalendarClient;
    
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock calendar client
        mockCalendarClient = {
            events: {
                list: vi.fn(),
                insert: vi.fn(),
                delete: vi.fn(),
                instances: vi.fn()
            },
            calendarList: {
                list: vi.fn()
            }
        };
        
        mockGetCalendarClient.mockResolvedValue(mockCalendarClient);
        mockGetCachedTimezone.mockResolvedValue('America/New_York');
        mockGetCachedCalendarQuery.mockReturnValue(null);
        
        // Import module after mocks
        operations = require('../operations');
    });
    
    describe('getCurrentTime', () => {
        it('should return current time with timezone', async () => {
            const result = await operations.getCurrentTime('test@example.com');
            
            expect(result).toHaveProperty('currentTime');
            expect(result).toHaveProperty('timeZone', 'America/New_York');
            expect(result).toHaveProperty('localTime');
            expect(result).toHaveProperty('formatted');
            expect(result.date).toHaveProperty('year');
            expect(result.date).toHaveProperty('month');
            expect(result.date).toHaveProperty('day');
            expect(mockGetCachedTimezone).toHaveBeenCalledWith('test@example.com');
        });
        
        it('should fallback to UTC on error', async () => {
            mockGetCachedTimezone.mockRejectedValue(new Error('Timezone fetch failed'));
            
            const result = await operations.getCurrentTime('test@example.com');
            
            expect(result).toHaveProperty('timeZone', 'UTC');
            expect(result).toHaveProperty('error');
        });
    });
    
    describe('listEvents', () => {
        it('should list upcoming events', async () => {
            const mockEvents = [
                {
                    id: 'event1',
                    summary: 'Test Event 1',
                    start: { dateTime: '2025-10-29T10:00:00Z' },
                    end: { dateTime: '2025-10-29T11:00:00Z' }
                },
                {
                    id: 'event2',
                    summary: 'Test Event 2',
                    start: { dateTime: '2025-10-29T14:00:00Z' },
                    end: { dateTime: '2025-10-29T15:00:00Z' }
                }
            ];
            
            mockCalendarClient.events.list.mockResolvedValue({
                data: { items: mockEvents }
            });
            
            const result = await operations.listEvents('test@example.com', { daysAhead: 7 });
            
            expect(result.eventCount).toBe(2);
            expect(result.events).toHaveLength(2);
            expect(result.events[0].summary).toBe('Test Event 1');
            expect(mockCacheCalendarQuery).toHaveBeenCalled();
        });
        
        it('should return cached result if available', async () => {
            const cachedResult = { eventCount: 1, events: [] };
            mockGetCachedCalendarQuery.mockReturnValue(cachedResult);
            
            const result = await operations.listEvents('test@example.com', { daysAhead: 7 });
            
            expect(result).toBe(cachedResult);
            expect(mockCalendarClient.events.list).not.toHaveBeenCalled();
        });
        
        it('should search specific date', async () => {
            mockCalendarClient.events.list.mockResolvedValue({
                data: { items: [] }
            });
            
            await operations.listEvents('test@example.com', { specificDate: '2025-10-29' });
            
            expect(mockCalendarClient.events.list).toHaveBeenCalledWith(
                expect.objectContaining({
                    calendarId: 'primary',
                    singleEvents: true,
                    orderBy: 'startTime'
                })
            );
        });
    });
    
    describe('createEvent', () => {
        it('should create a single event', async () => {
            const mockEvent = {
                id: 'event123',
                summary: 'Team Meeting',
                start: { dateTime: '2025-10-29T10:00:00Z' },
                end: { dateTime: '2025-10-29T11:00:00Z' },
                htmlLink: 'https://calendar.google.com/event123'
            };
            
            mockCalendarClient.events.insert.mockResolvedValue({
                data: mockEvent
            });
            
            const result = await operations.createEvent('test@example.com', {
                summary: 'Team Meeting',
                startTime: '2025-10-29T10:00:00',
                endTime: '2025-10-29T11:00:00',
                description: 'Weekly sync'
            });
            
            expect(result.success).toBe(true);
            expect(result.eventId).toBe('event123');
            expect(result.summary).toBe('Team Meeting');
            expect(mockInvalidateCalendarCache).toHaveBeenCalledWith('test@example.com');
        });
        
        it('should include attendees if provided', async () => {
            mockCalendarClient.events.insert.mockResolvedValue({
                data: { id: 'event123', summary: 'Meeting' }
            });
            
            await operations.createEvent('test@example.com', {
                summary: 'Meeting',
                startTime: '2025-10-29T10:00:00',
                endTime: '2025-10-29T11:00:00',
                attendees: ['alice@example.com', 'bob@example.com']
            });
            
            expect(mockCalendarClient.events.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestBody: expect.objectContaining({
                        attendees: [
                            { email: 'alice@example.com' },
                            { email: 'bob@example.com' }
                        ]
                    })
                })
            );
        });
    });
    
    describe('createRecurringEvent', () => {
        it('should create daily weekdays recurring event', async () => {
            mockCalendarClient.events.insert.mockResolvedValue({
                data: {
                    id: 'recurring123',
                    summary: 'Daily Standup',
                    start: { dateTime: '2025-10-29T09:00:00Z' }
                }
            });
            
            mockCalendarClient.events.instances.mockResolvedValue({
                data: { items: new Array(20).fill({}) }
            });
            
            const result = await operations.createRecurringEvent('test@example.com', {
                summary: 'Daily Standup',
                startTime: '2025-10-29T09:00:00',
                endTime: '2025-10-29T09:30:00',
                recurrencePattern: 'daily-weekdays',
                count: 20
            });
            
            expect(result.success).toBe(true);
            expect(result.pattern).toBe('daily-weekdays');
            expect(result.instanceCount).toBe(20);
            expect(mockCalendarClient.events.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestBody: expect.objectContaining({
                        recurrence: expect.arrayContaining([
                            expect.stringContaining('RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR')
                        ])
                    })
                })
            );
        });
        
        it('should create weekly recurring event', async () => {
            mockCalendarClient.events.insert.mockResolvedValue({
                data: { id: 'recurring123', summary: 'Weekly Review' }
            });
            
            mockCalendarClient.events.instances.mockResolvedValue({
                data: { items: [] }
            });
            
            await operations.createRecurringEvent('test@example.com', {
                summary: 'Weekly Review',
                startTime: '2025-10-29T15:00:00',
                endTime: '2025-10-29T16:00:00',
                recurrencePattern: 'weekly',
                days: ['MO', 'WE', 'FR']
            });
            
            expect(mockCalendarClient.events.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestBody: expect.objectContaining({
                        recurrence: expect.arrayContaining([
                            expect.stringContaining('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')
                        ])
                    })
                })
            );
        });
    });
    
    describe('deleteEvent', () => {
        it('should delete single event', async () => {
            mockCalendarClient.events.delete.mockResolvedValue({});
            
            const result = await operations.deleteEvent('test@example.com', {
                eventId: 'event123'
            });
            
            expect(result.success).toBe(true);
            expect(result.eventId).toBe('event123');
            expect(mockCalendarClient.events.delete).toHaveBeenCalledWith({
                calendarId: 'primary',
                eventId: 'event123'
            });
            expect(mockInvalidateCalendarCache).toHaveBeenCalled();
        });
    });
    
    describe('deleteRecurringEvent', () => {
        it('should delete all instances of recurring event', async () => {
            const mockEvents = [
                { id: 'event1', summary: 'Standup', start: { dateTime: '2025-10-29T09:00:00Z' } },
                { id: 'event2', summary: 'Standup', start: { dateTime: '2025-10-30T09:00:00Z' } }
            ];
            
            mockCalendarClient.events.list.mockResolvedValue({
                data: { items: mockEvents }
            });
            
            mockCalendarClient.events.delete.mockResolvedValue({});
            
            const result = await operations.deleteRecurringEvent('test@example.com', {
                summary: 'Standup'
            });
            
            expect(result.success).toBe(true);
            expect(result.deletedCount).toBe(2);
            expect(mockCalendarClient.events.delete).toHaveBeenCalledTimes(2);
        });
        
        it('should return failure if no events found', async () => {
            mockCalendarClient.events.list.mockResolvedValue({
                data: { items: [] }
            });
            
            const result = await operations.deleteRecurringEvent('test@example.com', {
                summary: 'NonExistent'
            });
            
            expect(result.success).toBe(false);
            expect(result.deletedCount).toBe(0);
        });
    });
    
    describe('searchAndDeleteEvents', () => {
        it('should preview events without deleting', async () => {
            const mockEvents = [
                { id: 'event1', summary: 'Meeting', start: { dateTime: '2025-10-29T10:00:00Z' }, end: { dateTime: '2025-10-29T11:00:00Z' } }
            ];
            
            mockCalendarClient.events.list.mockResolvedValue({
                data: { items: mockEvents }
            });
            
            const result = await operations.searchAndDeleteEvents('test@example.com', {
                searchQuery: 'Meeting',
                startDate: '2025-10-29',
                endDate: '2025-10-29',
                confirmDelete: false
            });
            
            expect(result.success).toBe(true);
            expect(result.needsConfirmation).toBe(true);
            expect(result.preview).toHaveLength(1);
            expect(mockCalendarClient.events.delete).not.toHaveBeenCalled();
        });
        
        it('should delete events when confirmed', async () => {
            const mockEvents = [
                { id: 'event1', summary: 'Meeting', start: { dateTime: '2025-10-29T10:00:00Z' }, end: { dateTime: '2025-10-29T11:00:00Z' } }
            ];
            
            mockCalendarClient.events.list.mockResolvedValue({
                data: { items: mockEvents }
            });
            
            mockCalendarClient.events.delete.mockResolvedValue({});
            
            const result = await operations.searchAndDeleteEvents('test@example.com', {
                searchQuery: 'Meeting',
                startDate: '2025-10-29',
                endDate: '2025-10-29',
                confirmDelete: true
            });
            
            expect(result.success).toBe(true);
            expect(result.deletedCount).toBe(1);
            expect(mockCalendarClient.events.delete).toHaveBeenCalled();
            expect(mockInvalidateCalendarCache).toHaveBeenCalled();
        });
    });
});
