/**
 * Unit Tests for Calendar Conflicts Module
 * Tests conflict detection with mocked Calendar API
 */

const { describe, it, expect, beforeEach, vi } = require('vitest');

// Mock dependencies
const mockGetCalendarClient = vi.fn();

vi.mock('../client', () => ({
    getCalendarClient: mockGetCalendarClient
}));

describe('Calendar Conflicts Module', () => {
    let conflicts;
    let mockCalendarClient;
    
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock calendar client
        mockCalendarClient = {
            freebusy: {
                query: vi.fn()
            },
            events: {
                list: vi.fn()
            }
        };
        
        mockGetCalendarClient.mockResolvedValue(mockCalendarClient);
        
        // Import module after mocks
        conflicts = require('../conflicts');
    });
    
    describe('checkConflicts', () => {
        it('should return no conflicts for free time slot', async () => {
            mockCalendarClient.freebusy.query.mockResolvedValue({
                data: {
                    calendars: {
                        primary: {
                            busy: []
                        }
                    }
                }
            });
            
            const result = await conflicts.checkConflicts('test@example.com', {
                startTime: '2025-10-29T10:00:00',
                endTime: '2025-10-29T11:00:00'
            });
            
            expect(result.hasConflicts).toBe(false);
            expect(result.message).toBe('Time slot is available');
            expect(result.proposedTime).toBeDefined();
        });
        
        it('should detect conflicts in busy time slot', async () => {
            const conflictStart = '2025-10-29T10:00:00Z';
            const conflictEnd = '2025-10-29T11:00:00Z';
            
            mockCalendarClient.freebusy.query.mockResolvedValue({
                data: {
                    calendars: {
                        primary: {
                            busy: [
                                {
                                    start: conflictStart,
                                    end: conflictEnd
                                }
                            ]
                        }
                    }
                }
            });
            
            mockCalendarClient.events.list.mockResolvedValue({
                data: {
                    items: [
                        {
                            id: 'event123',
                            summary: 'Existing Meeting',
                            start: { dateTime: conflictStart },
                            end: { dateTime: conflictEnd }
                        }
                    ]
                }
            });
            
            const result = await conflicts.checkConflicts('test@example.com', {
                startTime: '2025-10-29T10:00:00',
                endTime: '2025-10-29T11:00:00'
            });
            
            expect(result.hasConflicts).toBe(true);
            expect(result.conflictCount).toBe(1);
            expect(result.conflicts).toHaveLength(1);
            expect(result.conflicts[0].summary).toBe('Existing Meeting');
        });
        
        it('should filter out conflicts from different years', async () => {
            const lastYearConflict = '2024-10-29T10:00:00Z';
            const lastYearEnd = '2024-10-29T11:00:00Z';
            
            mockCalendarClient.freebusy.query.mockResolvedValue({
                data: {
                    calendars: {
                        primary: {
                            busy: [
                                {
                                    start: lastYearConflict,
                                    end: lastYearEnd
                                }
                            ]
                        }
                    }
                }
            });
            
            mockCalendarClient.events.list.mockResolvedValue({
                data: {
                    items: [
                        {
                            id: 'old-event',
                            summary: 'Last Year Meeting',
                            start: { dateTime: lastYearConflict },
                            end: { dateTime: lastYearEnd }
                        }
                    ]
                }
            });
            
            const result = await conflicts.checkConflicts('test@example.com', {
                startTime: '2025-10-29T10:00:00',
                endTime: '2025-10-29T11:00:00'
            });
            
            // Should return no conflicts after filtering
            expect(result.hasConflicts).toBe(false);
            expect(result.message).toBe('Time slot is available');
        });
        
        it('should handle multiple conflicts', async () => {
            mockCalendarClient.freebusy.query.mockResolvedValue({
                data: {
                    calendars: {
                        primary: {
                            busy: [
                                {
                                    start: '2025-10-29T10:00:00Z',
                                    end: '2025-10-29T10:30:00Z'
                                },
                                {
                                    start: '2025-10-29T10:30:00Z',
                                    end: '2025-10-29T11:00:00Z'
                                }
                            ]
                        }
                    }
                }
            });
            
            mockCalendarClient.events.list
                .mockResolvedValueOnce({
                    data: {
                        items: [
                            {
                                id: 'event1',
                                summary: 'Meeting 1',
                                start: { dateTime: '2025-10-29T10:00:00Z' },
                                end: { dateTime: '2025-10-29T10:30:00Z' }
                            }
                        ]
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        items: [
                            {
                                id: 'event2',
                                summary: 'Meeting 2',
                                start: { dateTime: '2025-10-29T10:30:00Z' },
                                end: { dateTime: '2025-10-29T11:00:00Z' }
                            }
                        ]
                    }
                });
            
            const result = await conflicts.checkConflicts('test@example.com', {
                startTime: '2025-10-29T10:00:00',
                endTime: '2025-10-29T11:00:00'
            });
            
            expect(result.hasConflicts).toBe(true);
            expect(result.conflictCount).toBe(2);
        });
        
        it('should handle API errors gracefully', async () => {
            mockCalendarClient.freebusy.query.mockRejectedValue(
                new Error('API Error')
            );
            
            await expect(
                conflicts.checkConflicts('test@example.com', {
                    startTime: '2025-10-29T10:00:00',
                    endTime: '2025-10-29T11:00:00'
                })
            ).rejects.toThrow('Failed to check conflicts');
        });
    });
});
