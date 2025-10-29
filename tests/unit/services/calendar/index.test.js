/**
 * Unit Tests for Calendar Service Index
 * Tests the main calendar service exports and integration
 */

const { describe, it, expect, beforeEach, vi } = require('vitest');

describe('Calendar Service Index', () => {
    let calendarService;
    
    beforeEach(() => {
        vi.resetModules();
        calendarService = require('../index');
    });
    
    describe('Module Exports', () => {
        it('should export client functions', () => {
            expect(calendarService.getCalendarClient).toBeDefined();
            expect(calendarService.generateAuthUrl).toBeDefined();
            expect(calendarService.handleOAuthCallback).toBeDefined();
            expect(calendarService.hasCredentials).toBeDefined();
            expect(calendarService.revokeAccess).toBeDefined();
        });
        
        it('should export function declarations', () => {
            expect(calendarService.calendarFunctions).toBeDefined();
            expect(Array.isArray(calendarService.calendarFunctions)).toBe(true);
        });
        
        it('should export operation functions', () => {
            expect(calendarService.getCurrentTime).toBeDefined();
            expect(calendarService.listEvents).toBeDefined();
            expect(calendarService.createEvent).toBeDefined();
            expect(calendarService.createRecurringEvent).toBeDefined();
            expect(calendarService.deleteEvent).toBeDefined();
            expect(calendarService.deleteRecurringEvent).toBeDefined();
            expect(calendarService.searchAndDeleteEvents).toBeDefined();
        });
        
        it('should export conflict checking', () => {
            expect(calendarService.checkConflicts).toBeDefined();
        });
        
        it('should export parallel execution functions', () => {
            expect(calendarService.analyzeFunctionDependencies).toBeDefined();
            expect(calendarService.executeParallelFunctions).toBeDefined();
        });
        
        it('should export executeFunction', () => {
            expect(calendarService.executeFunction).toBeDefined();
            expect(typeof calendarService.executeFunction).toBe('function');
        });
    });
    
    describe('calendarFunctions', () => {
        it('should include all required function declarations', () => {
            const functionNames = calendarService.calendarFunctions.map(f => f.name);
            
            expect(functionNames).toContain('getCurrentTime');
            expect(functionNames).toContain('listEvents');
            expect(functionNames).toContain('checkConflicts');
            expect(functionNames).toContain('createEvent');
            expect(functionNames).toContain('createRecurringEvent');
            expect(functionNames).toContain('deleteEvent');
            expect(functionNames).toContain('deleteRecurringEvent');
            expect(functionNames).toContain('searchAndDeleteEvents');
        });
        
        it('should have proper function schema structure', () => {
            const getCurrentTime = calendarService.calendarFunctions.find(
                f => f.name === 'getCurrentTime'
            );
            
            expect(getCurrentTime).toBeDefined();
            expect(getCurrentTime.description).toBeDefined();
            expect(getCurrentTime.parameters).toBeDefined();
            expect(getCurrentTime.parameters.type).toBe('object');
        });
        
        it('should have required parameters for critical functions', () => {
            const createEvent = calendarService.calendarFunctions.find(
                f => f.name === 'createEvent'
            );
            
            expect(createEvent.parameters.required).toContain('summary');
            expect(createEvent.parameters.required).toContain('startTime');
            expect(createEvent.parameters.required).toContain('endTime');
        });
    });
    
    describe('executeFunction', () => {
        it('should throw error for invalid function name', async () => {
            await expect(
                calendarService.executeFunction('invalidFunction', {}, 'test@example.com')
            ).rejects.toThrow('Unknown function');
        });
        
        it('should throw error if no user email provided', async () => {
            await expect(
                calendarService.executeFunction('getCurrentTime', {}, null)
            ).rejects.toThrow('User email required');
        });
    });
});
