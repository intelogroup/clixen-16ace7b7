/**
 * Gemini Model Comparison Test
 * 
 * Compares performance between:
 * - gemini-2.0-flash-exp (current)
 * - gemini-2.5-flash-preview-0514 (experimental)
 * 
 * Tests:
 * 1. Simple text generation (latency)
 * 2. Function calling (single function)
 * 3. Function calling (multiple parallel functions)
 * 4. Long response generation
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const calendarService = require('./backend/server/services/calendar');

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!API_KEY) {
    console.error('❌ No API key found! Set GEMINI_API_KEY in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Test configurations
const MODELS = [
    'gemini-2.0-flash-exp',
    'gemini-2.5-flash',               // Gemini 2.5 Flash
    'gemini-2.5-flash-preview-05-20', // Gemini 2.5 Flash Preview
    'gemini-2.5-flash-8b'             // Gemini 2.5 Flash Lite (8B)
];

// Calendar function declarations
const { calendarFunctions } = calendarService;

/**
 * Test 1: Simple text generation (latency test)
 */
async function testSimpleGeneration(modelName) {
    console.log(`\n📝 Test 1: Simple Text Generation (${modelName})`);
    
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const prompts = [
        'What time is it?',
        'Tell me a joke',
        'What is 2+2?'
    ];
    
    const results = [];
    
    for (const prompt of prompts) {
        const startTime = Date.now();
        
        try {
            const result = await model.generateContent(prompt);
            const response = result.response.text();
            const duration = Date.now() - startTime;
            
            results.push({
                prompt,
                duration,
                responseLength: response.length,
                success: true
            });
            
            console.log(`   ✅ "${prompt}" → ${duration}ms (${response.length} chars)`);
        } catch (error) {
            console.log(`   ❌ "${prompt}" → ERROR: ${error.message}`);
            results.push({
                prompt,
                duration: Date.now() - startTime,
                success: false,
                error: error.message
            });
        }
    }
    
    const avgDuration = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length;
    
    console.log(`   📊 Average latency: ${avgDuration.toFixed(0)}ms`);
    
    return { results, avgDuration };
}

/**
 * Test 2: Single function call
 */
async function testSingleFunctionCall(modelName) {
    console.log(`\n🔧 Test 2: Single Function Call (${modelName})`);
    
    const model = genAI.getGenerativeModel({
        model: modelName,
        tools: [{ functionDeclarations: calendarFunctions }]
    });
    
    const prompts = [
        "What's on my calendar today?",
        "Show me my events this week",
        "Do I have any meetings tomorrow?"
    ];
    
    const results = [];
    
    for (const prompt of prompts) {
        const startTime = Date.now();
        
        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            
            const functionCalls = response.functionCalls();
            const duration = Date.now() - startTime;
            
            results.push({
                prompt,
                duration,
                functionCallCount: functionCalls ? functionCalls.length : 0,
                functions: functionCalls ? functionCalls.map(f => f.name) : [],
                success: true
            });
            
            console.log(`   ✅ "${prompt}" → ${duration}ms (${functionCalls?.length || 0} function calls)`);
            if (functionCalls) {
                console.log(`      Functions: ${functionCalls.map(f => f.name).join(', ')}`);
            }
        } catch (error) {
            console.log(`   ❌ "${prompt}" → ERROR: ${error.message}`);
            results.push({
                prompt,
                duration: Date.now() - startTime,
                success: false,
                error: error.message
            });
        }
    }
    
    const avgDuration = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length;
    
    console.log(`   📊 Average latency: ${avgDuration.toFixed(0)}ms`);
    
    return { results, avgDuration };
}

/**
 * Test 3: Multiple parallel function calls
 */
async function testMultipleFunctionCalls(modelName) {
    console.log(`\n⚡ Test 3: Multiple Function Calls (${modelName})`);
    
    const model = genAI.getGenerativeModel({
        model: modelName,
        tools: [{ functionDeclarations: calendarFunctions }]
    });
    
    const prompts = [
        "Check if I have any conflicts next week and show me all my events",
        "List my events for today, tomorrow, and this week",
        "Show me my calendar and check for any scheduling conflicts"
    ];
    
    const results = [];
    
    for (const prompt of prompts) {
        const startTime = Date.now();
        
        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            
            const functionCalls = response.functionCalls();
            const duration = Date.now() - startTime;
            
            results.push({
                prompt,
                duration,
                functionCallCount: functionCalls ? functionCalls.length : 0,
                functions: functionCalls ? functionCalls.map(f => f.name) : [],
                parallelCapable: functionCalls && functionCalls.length > 1,
                success: true
            });
            
            console.log(`   ✅ "${prompt}" → ${duration}ms`);
            console.log(`      ${functionCalls?.length || 0} function calls: ${functionCalls?.map(f => f.name).join(', ') || 'none'}`);
        } catch (error) {
            console.log(`   ❌ "${prompt}" → ERROR: ${error.message}`);
            results.push({
                prompt,
                duration: Date.now() - startTime,
                success: false,
                error: error.message
            });
        }
    }
    
    const avgDuration = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length;
    
    const avgFunctionCalls = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.functionCallCount, 0) / results.filter(r => r.success).length;
    
    console.log(`   📊 Average latency: ${avgDuration.toFixed(0)}ms`);
    console.log(`   📊 Average function calls: ${avgFunctionCalls.toFixed(1)}`);
    
    return { results, avgDuration, avgFunctionCalls };
}

/**
 * Test 4: Long response generation
 */
async function testLongResponse(modelName) {
    console.log(`\n📚 Test 4: Long Response Generation (${modelName})`);
    
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const prompts = [
        "Explain how calendars work in detail",
        "Write a comprehensive guide about time management"
    ];
    
    const results = [];
    
    for (const prompt of prompts) {
        const startTime = Date.now();
        
        try {
            const result = await model.generateContent(prompt);
            const response = result.response.text();
            const duration = Date.now() - startTime;
            
            const tokenEstimate = Math.ceil(response.length / 4); // Rough estimate
            
            results.push({
                prompt,
                duration,
                responseLength: response.length,
                tokenEstimate,
                throughput: (tokenEstimate / (duration / 1000)).toFixed(0),
                success: true
            });
            
            console.log(`   ✅ "${prompt.substring(0, 50)}..."`);
            console.log(`      Duration: ${duration}ms | Length: ${response.length} chars | ~${tokenEstimate} tokens`);
            console.log(`      Throughput: ~${(tokenEstimate / (duration / 1000)).toFixed(0)} tokens/sec`);
        } catch (error) {
            console.log(`   ❌ "${prompt}" → ERROR: ${error.message}`);
            results.push({
                prompt,
                duration: Date.now() - startTime,
                success: false,
                error: error.message
            });
        }
    }
    
    return { results };
}

/**
 * Run all tests for a model
 */
async function runTestsForModel(modelName) {
    console.log('\n' + '='.repeat(80));
    console.log(`🧪 Testing Model: ${modelName}`);
    console.log('='.repeat(80));
    
    const startTime = Date.now();
    
    try {
        const test1 = await testSimpleGeneration(modelName);
        const test2 = await testSingleFunctionCall(modelName);
        const test3 = await testMultipleFunctionCalls(modelName);
        const test4 = await testLongResponse(modelName);
        
        const totalTime = Date.now() - startTime;
        
        console.log(`\n📊 SUMMARY for ${modelName}:`);
        console.log(`   • Simple generation: ${test1.avgDuration.toFixed(0)}ms avg`);
        console.log(`   • Single function call: ${test2.avgDuration.toFixed(0)}ms avg`);
        console.log(`   • Multiple function calls: ${test3.avgDuration.toFixed(0)}ms avg (${test3.avgFunctionCalls.toFixed(1)} calls)`);
        console.log(`   • Total test time: ${(totalTime / 1000).toFixed(1)}s`);
        
        return {
            modelName,
            test1,
            test2,
            test3,
            test4,
            totalTime,
            success: true
        };
    } catch (error) {
        console.error(`\n❌ Test failed for ${modelName}:`, error.message);
        return {
            modelName,
            success: false,
            error: error.message
        };
    }
}

/**
 * Main comparison
 */
async function main() {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 Gemini Model Performance Comparison');
    console.log('='.repeat(80));
    
    const allResults = [];
    
    for (const modelName of MODELS) {
        const result = await runTestsForModel(modelName);
        allResults.push(result);
        
        // Wait a bit between models to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Final comparison
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL COMPARISON');
    console.log('='.repeat(80));
    
    const successfulResults = allResults.filter(r => r.success);
    
    if (successfulResults.length === 0) {
        console.log('❌ No successful tests to compare');
        return;
    }
    
    console.log('\n🏆 Winner by Category:');
    
    // Simple generation
    const fastestSimple = successfulResults.reduce((min, r) => 
        r.test1.avgDuration < min.test1.avgDuration ? r : min
    );
    console.log(`   • Fastest simple generation: ${fastestSimple.modelName} (${fastestSimple.test1.avgDuration.toFixed(0)}ms)`);
    
    // Single function call
    const fastestSingleFunc = successfulResults.reduce((min, r) => 
        r.test2.avgDuration < min.test2.avgDuration ? r : min
    );
    console.log(`   • Fastest single function: ${fastestSingleFunc.modelName} (${fastestSingleFunc.test2.avgDuration.toFixed(0)}ms)`);
    
    // Multiple function calls
    const fastestMultiFunc = successfulResults.reduce((min, r) => 
        r.test3.avgDuration < min.test3.avgDuration ? r : min
    );
    console.log(`   • Fastest multiple functions: ${fastestMultiFunc.modelName} (${fastestMultiFunc.test3.avgDuration.toFixed(0)}ms)`);
    
    // Most function calls on average
    const mostFunctionCalls = successfulResults.reduce((max, r) => 
        r.test3.avgFunctionCalls > max.test3.avgFunctionCalls ? r : max
    );
    console.log(`   • Most function calls: ${mostFunctionCalls.modelName} (${mostFunctionCalls.test3.avgFunctionCalls.toFixed(1)} avg)`);
    
    console.log('\n💡 Recommendation:');
    
    // Overall best based on weighted average
    const scores = successfulResults.map(r => ({
        model: r.modelName,
        score: (
            (1 / r.test1.avgDuration) * 0.2 +  // 20% weight
            (1 / r.test2.avgDuration) * 0.3 +  // 30% weight
            (1 / r.test3.avgDuration) * 0.4 +  // 40% weight
            (r.test3.avgFunctionCalls / 10) * 0.1  // 10% weight
        )
    }));
    
    const best = scores.reduce((max, s) => s.score > max.score ? s : max);
    
    console.log(`   🥇 Overall best: ${best.model}`);
    console.log(`      Use this for your production workload!`);
    
    console.log('\n='.repeat(80));
}

// Run tests
main().catch(console.error);
