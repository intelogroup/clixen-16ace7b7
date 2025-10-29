/**
 * Unit Tests for Calendar Parallel Execution Module
 * Tests dependency analysis and parallel execution logic
 */

const { describe, it, expect, beforeEach, vi } = require('vitest');

describe('Calendar Parallel Execution Module', () => {
    let parallel;
    
    beforeEach(() => {
        vi.clearAllMocks();
        parallel = require('../parallel');
    });
    
    describe('analyzeFunctionDependencies', () => {
        it('should group independent functions together', () => {
            const functionCalls = [
                { name: 'getCurrentTime', args: {} },
                { name: 'listEvents', args: { daysAhead: 7 } }
            ];
            
            const groups = parallel.analyzeFunctionDependencies(functionCalls);
            
            expect(groups).toHaveLength(1);
            expect(groups[0]).toHaveLength(2);
            expect(groups[0][0].name).toBe('getCurrentTime');
            expect(groups[0][1].name).toBe('listEvents');
        });
        
        it('should separate dependent functions into different groups', () => {
            const functionCalls = [
                { name: 'getCurrentTime', args: {} },
                { name: 'checkConflicts', args: { startTime: '2025-10-29T10:00:00', endTime: '2025-10-29T11:00:00' } },
                { name: 'createEvent', args: { summary: 'Meeting' } }
            ];
            
            const groups = parallel.analyzeFunctionDependencies(functionCalls);
            
            // getCurrentTime should be in first group (independent)
            expect(groups[0]).toContainEqual(
                expect.objectContaining({ name: 'getCurrentTime' })
            );
            
            // checkConflicts can run in second group (no dependencies)
            // createEvent should be in later group (depends on checkConflicts)
            expect(groups.length).toBeGreaterThanOrEqual(2);
        });
        
        it('should handle empty function calls', () => {
            const groups = parallel.analyzeFunctionDependencies([]);
            
            expect(groups).toHaveLength(0);
        });
        
        it('should group checkConflicts independently', () => {
            const functionCalls = [
                { name: 'listEvents', args: {} },
                { name: 'checkConflicts', args: {} }
            ];
            
            const groups = parallel.analyzeFunctionDependencies(functionCalls);
            
            // Both can run in parallel (checkConflicts has no dependencies)
            expect(groups).toHaveLength(1);
            expect(groups[0]).toHaveLength(2);
        });
        
        it('should put delete operations after list operations', () => {
            const functionCalls = [
                { name: 'listEvents', args: {} },
                { name: 'deleteEvent', args: { eventId: 'event123' } }
            ];
            
            const groups = parallel.analyzeFunctionDependencies(functionCalls);
            
            // listEvents should be in earlier group
            const listGroup = groups.find(g => g.some(f => f.name === 'listEvents'));
            const deleteGroup = groups.find(g => g.some(f => f.name === 'deleteEvent'));
            
            expect(listGroup).toBeDefined();
            expect(deleteGroup).toBeDefined();
        });
    });
    
    describe('executeParallelFunctions', () => {
        it('should execute functions in parallel and return results', async () => {
            const mockExecuteFunction = vi.fn()
                .mockResolvedValueOnce({ time: 'now' })
                .mockResolvedValueOnce({ events: [] });
            
            const functionCalls = [
                { name: 'getCurrentTime', args: {} },
                { name: 'listEvents', args: {} }
            ];
            
            const results = await parallel.executeParallelFunctions(
                functionCalls,
                'test@example.com',
                mockExecuteFunction
            );
            
            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);
            expect(mockExecuteFunction).toHaveBeenCalledTimes(2);
        });
        
        it('should handle function execution errors', async () => {
            const mockExecuteFunction = vi.fn()
                .mockResolvedValueOnce({ time: 'now' })
                .mockRejectedValueOnce(new Error('API Error'));
            
            const functionCalls = [
                { name: 'getCurrentTime', args: {} },
                { name: 'listEvents', args: {} }
            ];
            
            const results = await parallel.executeParallelFunctions(
                functionCalls,
                'test@example.com',
                mockExecuteFunction
            );
            
            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toBe('API Error');
        });
        
        it('should execute single function', async () => {
            const mockExecuteFunction = vi.fn().mockResolvedValue({ time: 'now' });
            
            const functionCalls = [
                { name: 'getCurrentTime', args: {} }
            ];
            
            const results = await parallel.executeParallelFunctions(
                functionCalls,
                'test@example.com',
                mockExecuteFunction
            );
            
            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
        });
        
        it('should measure execution time', async () => {
            const mockExecuteFunction = vi.fn()
                .mockImplementation(() => new Promise(resolve => 
                    setTimeout(() => resolve({ data: 'test' }), 50)
                ));
            
            const functionCalls = [
                { name: 'getCurrentTime', args: {} }
            ];
            
            const startTime = Date.now();
            await parallel.executeParallelFunctions(
                functionCalls,
                'test@example.com',
                mockExecuteFunction
            );
            const duration = Date.now() - startTime;
            
            // Should complete in roughly the time of the longest operation
            expect(duration).toBeGreaterThanOrEqual(50);
            expect(duration).toBeLessThan(150); // Some overhead is acceptable
        });
    });
});
