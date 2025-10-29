/**
 * Tests for Gemini Client Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../../../backend/server/services/gemini/client.js';

// Mock @google/generative-ai
vi.mock('@google/generative-ai', () => {
    const MockGenerativeModel = vi.fn().mockImplementation(() => ({
        generateContent: vi.fn().mockResolvedValue({ response: { text: () => 'pong' } })
    }));

    const MockGoogleGenerativeAI = vi.fn().mockImplementation(() => ({
        getGenerativeModel: MockGenerativeModel
    }));

    return {
        GoogleGenerativeAI: MockGoogleGenerativeAI
    };
});

describe('Gemini Client Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear environment variables
        delete process.env.GEMINI_API_KEY;
        delete process.env.GOOGLE_API_KEY;
        delete process.env.FIREBASE_API_KEY;
    });

    describe('getAPIKeyFromEnv', () => {
        it('should return GEMINI_API_KEY if set', () => {
            process.env.GEMINI_API_KEY = 'test-gemini-key';
            const apiKey = client.getAPIKeyFromEnv();
            expect(apiKey).toBe('test-gemini-key');
        });

        it('should return GOOGLE_API_KEY if GEMINI_API_KEY not set', () => {
            process.env.GOOGLE_API_KEY = 'test-google-key';
            const apiKey = client.getAPIKeyFromEnv();
            expect(apiKey).toBe('test-google-key');
        });

        it('should return FIREBASE_API_KEY if neither GEMINI nor GOOGLE set', () => {
            process.env.FIREBASE_API_KEY = 'test-firebase-key';
            const apiKey = client.getAPIKeyFromEnv();
            expect(apiKey).toBe('test-firebase-key');
        });

        it('should return null if no API key found', () => {
            const apiKey = client.getAPIKeyFromEnv();
            expect(apiKey).toBeNull();
        });
    });

    describe('initializeGeminiClient', () => {
        it('should initialize Gemini client with valid API key', () => {
            const genAI = client.initializeGeminiClient('test-api-key');
            expect(genAI).toBeDefined();
        });

        it('should initialize with empty string if no API key provided', () => {
            const genAI = client.initializeGeminiClient();
            expect(genAI).toBeDefined();
        });

        it('should initialize with null API key', () => {
            const genAI = client.initializeGeminiClient(null);
            expect(genAI).toBeDefined();
        });
    });

    describe('createModelWithFunctions', () => {
        it('should create model with default configuration', () => {
            const genAI = client.initializeGeminiClient('test-key');
            const model = client.createModelWithFunctions(genAI);
            expect(model).toBeDefined();
        });

        it('should create model with function declarations', () => {
            const genAI = client.initializeGeminiClient('test-key');
            const functionDeclarations = [
                { name: 'testFunction', description: 'A test function' }
            ];
            const model = client.createModelWithFunctions(genAI, { functionDeclarations });
            expect(model).toBeDefined();
        });

        it('should create model with system instruction', () => {
            const genAI = client.initializeGeminiClient('test-key');
            const systemInstruction = 'You are a helpful assistant';
            const model = client.createModelWithFunctions(genAI, { systemInstruction });
            expect(model).toBeDefined();
        });

        it('should create model with custom model name', () => {
            const genAI = client.initializeGeminiClient('test-key');
            const model = client.createModelWithFunctions(genAI, { 
                modelName: 'gemini-pro' 
            });
            expect(model).toBeDefined();
        });

        it('should create model with all options', () => {
            const genAI = client.initializeGeminiClient('test-key');
            const functionDeclarations = [
                { name: 'testFunction', description: 'A test function' }
            ];
            const systemInstruction = 'You are a helpful assistant';
            const model = client.createModelWithFunctions(genAI, {
                modelName: 'gemini-pro',
                functionDeclarations,
                systemInstruction
            });
            expect(model).toBeDefined();
        });
    });

    describe('prewarmGeminiAPI', () => {
        it('should prewarm API successfully', async () => {
            const genAI = client.initializeGeminiClient('test-key');
            const duration = await client.prewarmGeminiAPI(genAI);
            expect(duration).toBeGreaterThanOrEqual(0);
        });

        it('should handle prewarm errors gracefully', async () => {
            const genAI = client.initializeGeminiClient('test-key');
            // Mock generateContent to throw error
            genAI.getGenerativeModel = vi.fn().mockImplementation(() => ({
                generateContent: vi.fn().mockRejectedValue(new Error('API Error'))
            }));
            
            const duration = await client.prewarmGeminiAPI(genAI);
            expect(duration).toBeGreaterThanOrEqual(0);
        });

        it('should prewarm with custom model name', async () => {
            const genAI = client.initializeGeminiClient('test-key');
            const duration = await client.prewarmGeminiAPI(genAI, 'gemini-pro');
            expect(duration).toBeGreaterThanOrEqual(0);
        });
    });
});
