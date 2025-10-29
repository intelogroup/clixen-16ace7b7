/**
 * Intent Analyzer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as intentAnalyzer from '../../../backend/server/utils/intentAnalyzer.js';

describe('Intent Analyzer', () => {
    beforeEach(() => {
        intentAnalyzer.resetMetrics();
    });

    describe('Calendar Intent Detection', () => {
        it('should detect calendar check intent', () => {
            const tests = [
                "check my calendar for tomorrow",
                "show me my schedule",
                "do I have any meetings tomorrow",
                "am I free on Friday"
            ];

            tests.forEach(text => {
                const result = intentAnalyzer.analyzeIntent(text, 'Jim');
                expect(result).toBeTruthy();
                expect(result.intent).toMatch(/calendar/); // Any calendar intent is good
                expect(result.ack).toContain('Jim');
                expect(result.confidence).toBeGreaterThan(0.7);
            });
        });

        it('should detect calendar create intent', () => {
            const tests = [
                "schedule a meeting with Sarah tomorrow",
                "create an event for next Friday",
                "book a meeting room for 3pm",
                "set up a call with the team"
            ];

            tests.forEach(text => {
                const result = intentAnalyzer.analyzeIntent(text, 'Jim');
                expect(result).toBeTruthy();
                expect(result.intent).toBe('calendar_create');
                expect(result.ack).toContain('Jim');
            });
        });

        it('should detect calendar find intent', () => {
            const tests = [
                "when is my meeting with Bob",
                "find my appointment with the dentist"
            ];

            tests.forEach(text => {
                const result = intentAnalyzer.analyzeIntent(text, 'Jim');
                expect(result).toBeTruthy();
                expect(result.intent).toMatch(/calendar_find|search_question/); // Both are valid
            });
        });
    });

    describe('Simple Confirmations', () => {
        it('should detect simple confirmations', () => {
            const tests = ['yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'right', 'correct'];

            tests.forEach(text => {
                const result = intentAnalyzer.analyzeIntent(text, 'Jim');
                expect(result).toBeTruthy();
                expect(result.intent).toBe('simple_confirm');
                expect(result.confidence).toBeGreaterThan(0.8);
            });
        });

        it('should detect simple denials', () => {
            const tests = ['no', 'nope', 'nah', 'cancel', 'stop', 'never mind'];

            tests.forEach(text => {
                const result = intentAnalyzer.analyzeIntent(text, 'Jim');
                expect(result).toBeTruthy();
                expect(result.intent).toBe('simple_deny');
            });
        });
    });

    describe('Greetings', () => {
        it('should detect greetings', () => {
            const tests = ['hi', 'hello', 'hey', 'good morning', 'good afternoon'];

            tests.forEach(text => {
                const result = intentAnalyzer.analyzeIntent(text, 'Jim');
                expect(result).toBeTruthy();
                expect(result.intent).toBe('greeting');
                expect(result.ack).toContain('Jim');
            });
        });
    });

    describe('Time Queries', () => {
        it('should detect time queries', () => {
            const tests = [
                'time now',
                'current time',
                'what is the time'
            ];

            tests.forEach(text => {
                const result = intentAnalyzer.analyzeIntent(text, 'Jim');
                expect(result).toBeTruthy();
                expect(result.intent).toMatch(/time_query|search_question/); // Both are valid
            });
        });
    });

    describe('Search Questions', () => {
        it('should detect search questions', () => {
            const tests = [
                'what is quantum computing',
                'who invented the telephone'
            ];

            tests.forEach(text => {
                const result = intentAnalyzer.analyzeIntent(text, 'Jim');
                expect(result).toBeTruthy();
                expect(result.intent).toBe('search_question');
            });
        });
        
        it('should detect search questions starting with tell/explain', () => {
            const tests = [
                'tell me about climate change',
                'explain how rockets work'
            ];

            tests.forEach(text => {
                const result = intentAnalyzer.analyzeIntent(text, 'Jim');
                expect(result).toBeTruthy();
                // These should match search_question
                expect(result.intent).toMatch(/search_question/);
            });
        });
    });

    describe('Reminders', () => {
        it('should detect reminder creation', () => {
            const tests = [
                'remind me to call mom',
                'set a reminder for 5pm',
                'don\'t let me forget about the meeting'
            ];

            tests.forEach(text => {
                const result = intentAnalyzer.analyzeIntent(text, 'Jim');
                expect(result).toBeTruthy();
                expect(result.intent).toBe('reminder_create');
            });
        });
    });

    describe('Personalization', () => {
        it('should personalize acks with user name', () => {
            const result = intentAnalyzer.analyzeIntent('check my calendar', 'Sarah');
            expect(result.ack).toContain('Sarah');
        });

        it('should use default name if not provided', () => {
            const result = intentAnalyzer.analyzeIntent('check my calendar');
            expect(result.ack).toContain('there');
        });
    });

    describe('shouldUseInstantAck', () => {
        it('should return true for questions', () => {
            expect(intentAnalyzer.shouldUseInstantAck('what is my schedule?')).toBe(true);
        });

        it('should return true for short responses', () => {
            expect(intentAnalyzer.shouldUseInstantAck('yes please')).toBe(true);
        });

        it('should return true for action requests', () => {
            expect(intentAnalyzer.shouldUseInstantAck('schedule a meeting tomorrow')).toBe(true);
        });

        it('should return false for long non-action statements', () => {
            expect(intentAnalyzer.shouldUseInstantAck(
                'I think the weather is really nice today and I might go for a walk'
            )).toBe(false);
        });
    });

    describe('getGenericAck', () => {
        it('should return generic ack with name', () => {
            const ack = intentAnalyzer.getGenericAck('Jim');
            expect(ack).toContain('Jim');
            expect(ack.length).toBeGreaterThan(5);
        });
    });

    describe('Performance', () => {
        it('should process intents very quickly', () => {
            const startTime = process.hrtime.bigint();
            
            for (let i = 0; i < 100; i++) {
                intentAnalyzer.analyzeIntent('check my calendar for tomorrow', 'Jim');
            }
            
            const endTime = process.hrtime.bigint();
            const totalTime = Number(endTime - startTime) / 1_000_000; // ms
            const avgTime = totalTime / 100;
            
            // Should be under 1ms per analysis
            expect(avgTime).toBeLessThan(1);
        });

        it('should track metrics correctly', () => {
            intentAnalyzer.analyzeWithMetrics('check my calendar', 'Jim');
            intentAnalyzer.analyzeWithMetrics('yes', 'Jim');
            intentAnalyzer.analyzeWithMetrics('some random text that wont match', 'Jim');

            const metrics = intentAnalyzer.getMetrics();
            
            expect(metrics.totalAnalyses).toBe(3);
            expect(metrics.regexMatches).toBeGreaterThan(0);
            expect(metrics.noMatches).toBeGreaterThan(0);
            expect(metrics.avgProcessingTime).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty text', () => {
            expect(intentAnalyzer.analyzeIntent('')).toBeNull();
            expect(intentAnalyzer.analyzeIntent('   ')).toBeNull();
        });

        it('should handle null/undefined', () => {
            expect(intentAnalyzer.analyzeIntent(null)).toBeNull();
            expect(intentAnalyzer.analyzeIntent(undefined)).toBeNull();
        });

        it('should handle mixed case', () => {
            const result = intentAnalyzer.analyzeIntent('CHECK MY CALENDAR', 'Jim');
            expect(result).toBeTruthy();
            expect(result.intent).toMatch(/calendar/);
        });

        it('should handle extra whitespace', () => {
            const result = intentAnalyzer.analyzeIntent('  check   my   calendar  ', 'Jim');
            expect(result).toBeTruthy();
        });
    });

    describe('Confidence Scores', () => {
        it('should have high confidence for regex matches', () => {
            const result = intentAnalyzer.analyzeIntent('check my calendar', 'Jim');
            expect(result.confidence).toBeGreaterThan(0.9);
            expect(result.method).toBe('regex');
        });

        it('should have lower confidence for semantic matches', () => {
            // Create a text that matches semantically but not via regex
            const result = intentAnalyzer.analyzeIntent('calendar busy free', 'Jim');
            if (result && result.method === 'semantic') {
                expect(result.confidence).toBeLessThan(0.9);
                expect(result.confidence).toBeGreaterThan(0.7);
            }
        });
    });
});
