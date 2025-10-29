/**
 * Tests for Gemini Function Calling Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as functions from '../../../../backend/server/services/gemini/functions.js';

describe('Gemini Function Calling Service', () => {
    describe('analyzeFunctionDependencies', () => {
        it('should group independent functions together', () => {
            const functionCalls = [
                { name: 'getCurrentTime', args: {} },
                { name: 'listEvents', args: {} }
            ];
            
            const groups = functions.analyzeFunctionDependencies(functionCalls);
            
            expect(groups).toHaveLength(1);
            expect(groups[0]).toHaveLength(2);
            expect(groups[0].map(c => c.name)).toEqual(['getCurrentTime', 'listEvents']);
        });

        it('should separate dependent functions', () => {
            const functionCalls = [
                { name: 'getCurrentTime', args: {} },
                { name: 'createEvent', args: {} }
            ];
            
            const groups = functions.analyzeFunctionDependencies(functionCalls);
            
            expect(groups.length).toBeGreaterThanOrEqual(2);
            // getCurrentTime should be in first group
            expect(groups[0].map(c => c.name)).toContain('getCurrentTime');
        });

        it('should handle checkConflicts in parallel', () => {
            const functionCalls = [
                { name: 'checkConflicts', args: {} },
                { name: 'getCurrentTime', args: {} }
            ];
            
            const groups = functions.analyzeFunctionDependencies(functionCalls);
            
            expect(groups).toHaveLength(2);
        });

        it('should handle mixed dependencies', () => {
            const functionCalls = [
                { name: 'getCurrentTime', args: {} },
                { name: 'listEvents', args: {} },
                { name: 'checkConflicts', args: {} },
                { name: 'createEvent', args: {} }
            ];
            
            const groups = functions.analyzeFunctionDependencies(functionCalls);
            
            expect(groups.length).toBeGreaterThanOrEqual(2);
            // Independent functions should be in first group
            expect(groups[0].some(c => c.name === 'getCurrentTime')).toBe(true);
        });

        it('should handle empty function calls', () => {
            const groups = functions.analyzeFunctionDependencies([]);
            expect(groups).toEqual([]);
        });

        it('should handle single function call', () => {
            const functionCalls = [{ name: 'getCurrentTime', args: {} }];
            const groups = functions.analyzeFunctionDependencies(functionCalls);
            
            expect(groups).toHaveLength(1);
            expect(groups[0]).toHaveLength(1);
        });
    });

    describe('executeParallelFunctions', () => {
        it('should execute functions in parallel', async () => {
            const functionCalls = [
                { name: 'func1', args: { param: 'value1' } },
                { name: 'func2', args: { param: 'value2' } }
            ];
            
            const mockExecutor = vi.fn()
                .mockResolvedValueOnce('result1')
                .mockResolvedValueOnce('result2');
            
            const results = await functions.executeParallelFunctions(
                functionCalls,
                'test@example.com',
                mockExecutor
            );
            
            expect(results).toHaveLength(2);
            expect(results[0]).toMatchObject({
                call: functionCalls[0],
                result: 'result1',
                success: true
            });
            expect(results[1]).toMatchObject({
                call: functionCalls[1],
                result: 'result2',
                success: true
            });
            
            expect(mockExecutor).toHaveBeenCalledTimes(2);
        });

        it('should handle function execution errors', async () => {
            const functionCalls = [
                { name: 'func1', args: {} },
                { name: 'func2', args: {} }
            ];
            
            const mockExecutor = vi.fn()
                .mockResolvedValueOnce('success')
                .mockRejectedValueOnce(new Error('Function failed'));
            
            const results = await functions.executeParallelFunctions(
                functionCalls,
                'test@example.com',
                mockExecutor
            );
            
            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toBe('Function failed');
        });

        it('should execute all functions even if some fail', async () => {
            const functionCalls = [
                { name: 'func1', args: {} },
                { name: 'func2', args: {} },
                { name: 'func3', args: {} }
            ];
            
            const mockExecutor = vi.fn()
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockResolvedValueOnce('success')
                .mockRejectedValueOnce(new Error('Error 3'));
            
            const results = await functions.executeParallelFunctions(
                functionCalls,
                'test@example.com',
                mockExecutor
            );
            
            expect(results).toHaveLength(3);
            expect(mockExecutor).toHaveBeenCalledTimes(3);
        });

        it('should pass correct arguments to executor', async () => {
            const functionCalls = [
                { name: 'testFunc', args: { param1: 'value1', param2: 42 } }
            ];
            
            const mockExecutor = vi.fn().mockResolvedValue('result');
            
            await functions.executeParallelFunctions(
                functionCalls,
                'user@test.com',
                mockExecutor
            );
            
            expect(mockExecutor).toHaveBeenCalledWith(
                'testFunc',
                { param1: 'value1', param2: 42 },
                'user@test.com'
            );
        });
    });

    describe('processGroupedFunctionCalls', () => {
        it('should process multiple groups sequentially', async () => {
            const groups = [
                [{ name: 'func1', args: {} }],
                [{ name: 'func2', args: {} }, { name: 'func3', args: {} }]
            ];
            
            const mockExecutor = vi.fn()
                .mockResolvedValueOnce('result1')
                .mockResolvedValueOnce('result2')
                .mockResolvedValueOnce('result3');
            
            const result = await functions.processGroupedFunctionCalls(
                groups,
                'test@example.com',
                mockExecutor
            );
            
            expect(result.functionResponses).toHaveLength(3);
            expect(result.totalFunctionCalls).toBe(3);
            expect(mockExecutor).toHaveBeenCalledTimes(3);
        });

        it('should format function responses correctly', async () => {
            const groups = [
                [{ name: 'testFunc', args: {} }]
            ];
            
            const mockExecutor = vi.fn().mockResolvedValue({ data: 'result' });
            
            const result = await functions.processGroupedFunctionCalls(
                groups,
                'test@example.com',
                mockExecutor
            );
            
            expect(result.functionResponses[0]).toEqual({
                functionResponse: {
                    name: 'testFunc',
                    response: { result: { data: 'result' } }
                }
            });
        });

        it('should handle errors in function responses', async () => {
            const groups = [
                [{ name: 'testFunc', args: {} }]
            ];
            
            const mockExecutor = vi.fn().mockRejectedValue(new Error('Test error'));
            
            const result = await functions.processGroupedFunctionCalls(
                groups,
                'test@example.com',
                mockExecutor
            );
            
            expect(result.functionResponses[0]).toEqual({
                functionResponse: {
                    name: 'testFunc',
                    response: { error: 'Test error' }
                }
            });
        });

        it('should handle empty groups', async () => {
            const groups = [];
            const mockExecutor = vi.fn();
            
            const result = await functions.processGroupedFunctionCalls(
                groups,
                'test@example.com',
                mockExecutor
            );
            
            expect(result.functionResponses).toEqual([]);
            expect(result.totalFunctionCalls).toBe(0);
            expect(mockExecutor).not.toHaveBeenCalled();
        });
    });

    describe('handleFunctionCalls', () => {
        it('should handle single round of function calls', async () => {
            const mockFunctionCalls = [{ name: 'testFunc', args: {} }];
            const mockResponse = {
                functionCalls: vi.fn()
                    .mockReturnValueOnce(mockFunctionCalls)
                    .mockReturnValueOnce(null)
            };
            
            const mockChat = {
                sendMessage: vi.fn().mockResolvedValue({ 
                    response: { 
                        functionCalls: () => null,
                        text: () => 'Final response'
                    } 
                })
            };
            
            const mockExecutor = vi.fn().mockResolvedValue('result');
            
            const result = await functions.handleFunctionCalls(
                mockChat,
                mockResponse,
                'test@example.com',
                mockExecutor,
                'req-123'
            );
            
            expect(result.functionCallCount).toBeGreaterThan(0);
            expect(mockChat.sendMessage).toHaveBeenCalled();
        });

        it('should handle multiple rounds of function calls', async () => {
            const mockFunctionCalls1 = [{ name: 'func1', args: {} }];
            const mockFunctionCalls2 = [{ name: 'func2', args: {} }];
            
            let callCount = 0;
            const mockChat = {
                sendMessage: vi.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        return Promise.resolve({
                            response: {
                                functionCalls: () => mockFunctionCalls2
                            }
                        });
                    }
                    return Promise.resolve({
                        response: {
                            functionCalls: () => null,
                            text: () => 'Final response'
                        }
                    });
                })
            };
            
            const mockResponse = {
                functionCalls: () => mockFunctionCalls1
            };
            
            const mockExecutor = vi.fn().mockResolvedValue('result');
            
            const result = await functions.handleFunctionCalls(
                mockChat,
                mockResponse,
                'test@example.com',
                mockExecutor,
                'req-123'
            );
            
            expect(result.functionCallCount).toBe(2);
            expect(mockChat.sendMessage).toHaveBeenCalledTimes(2);
        });

        it('should handle no function calls', async () => {
            const mockResponse = {
                functionCalls: () => null
            };
            
            const mockChat = {
                sendMessage: vi.fn()
            };
            
            const mockExecutor = vi.fn();
            
            const result = await functions.handleFunctionCalls(
                mockChat,
                mockResponse,
                'test@example.com',
                mockExecutor,
                'req-123'
            );
            
            expect(result.functionCallCount).toBe(0);
            expect(mockChat.sendMessage).not.toHaveBeenCalled();
        });
    });
});
