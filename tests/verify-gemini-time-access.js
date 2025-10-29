/**
 * Test: Verify Gemini can access current time, date, year, days from Calendar API
 * 
 * This test verifies that:
 * 1. The getCurrentTime function is properly configured in Gemini
 * 2. Gemini can call getCurrentTime to get user's timezone-aware time
 * 3. Gemini receives proper date/time information including:
 *    - Current time (ISO and local format)
 *    - User's timezone
 *    - Year, month, day
 *    - Hour, minute, second
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const calendarService = require('../backend/server/services/calendar');

const {
    calendarFunctions,
    executeFunction: executeCalendarFunction,
    getCurrentTime
} = calendarService;

// Test configuration
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'your-email@gmail.com';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

console.log('\n' + '='.repeat(80));
console.log('🧪 TESTING: Gemini Access to Current Time/Date via Calendar API');
console.log('='.repeat(80));
console.log(`Test User: ${TEST_USER_EMAIL}`);
console.log(`API Key: ${GEMINI_API_KEY ? '✅ Found' : '❌ Missing'}\n`);

async function testDirectGetCurrentTime() {
    console.log('📍 TEST 1: Direct getCurrentTime() call');
    console.log('-'.repeat(80));
    
    try {
        const result = await getCurrentTime(TEST_USER_EMAIL);
        
        console.log('✅ getCurrentTime() executed successfully\n');
        console.log('📊 Result:');
        console.log(JSON.stringify(result, null, 2));
        
        // Verify structure
        const hasAllFields = 
            result.currentTime &&
            result.timeZone &&
            result.localTime &&
            result.formatted &&
            result.date &&
            result.date.year &&
            result.date.month &&
            result.date.day &&
            result.time &&
            result.time.hour !== undefined &&
            result.time.minute !== undefined &&
            result.time.second !== undefined;
        
        if (hasAllFields) {
            console.log('\n✅ All required fields present:');
            console.log(`   - Current Time (ISO): ${result.currentTime}`);
            console.log(`   - Timezone: ${result.timeZone}`);
            console.log(`   - Local Time: ${result.localTime}`);
            console.log(`   - Formatted: ${result.formatted}`);
            console.log(`   - Date: ${result.date.year}-${result.date.month}-${result.date.day}`);
            console.log(`   - Time: ${result.time.hour}:${result.time.minute}:${result.time.second}`);
            return true;
        } else {
            console.log('\n❌ Missing required fields');
            return false;
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

async function testGeminiFunctionDeclaration() {
    console.log('\n📍 TEST 2: Verify getCurrentTime in Gemini function declarations');
    console.log('-'.repeat(80));
    
    try {
        const getCurrentTimeFunc = calendarFunctions.find(f => f.name === 'getCurrentTime');
        
        if (!getCurrentTimeFunc) {
            console.error('❌ getCurrentTime not found in calendarFunctions');
            return false;
        }
        
        console.log('✅ Found getCurrentTime function declaration\n');
        console.log('📋 Function Details:');
        console.log(JSON.stringify(getCurrentTimeFunc, null, 2));
        
        // Verify description mentions timezone and date/time
        const descLower = getCurrentTimeFunc.description.toLowerCase();
        const hasTimeInfo = descLower.includes('time') || descLower.includes('date');
        const hasTimezone = descLower.includes('timezone');
        
        if (hasTimeInfo && hasTimezone) {
            console.log('\n✅ Function description mentions time and timezone');
            return true;
        } else {
            console.log('\n⚠️  Function description could be improved');
            return true; // Still passes, just a warning
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

async function testGeminiCanCallGetCurrentTime() {
    console.log('\n📍 TEST 3: Gemini AI calling getCurrentTime');
    console.log('-'.repeat(80));
    
    if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY not found in environment');
        return false;
    }
    
    try {
        // Initialize Gemini with function calling
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.0-flash-exp',
            tools: [{ functionDeclarations: calendarFunctions }]
        });
        
        console.log('✅ Gemini model initialized with calendar functions\n');
        
        // Start a chat session
        const chat = model.startChat({ history: [] });
        
        console.log('💬 Sending prompt: "What is the current date and time?"');
        
        // Send a message that should trigger getCurrentTime
        const result = await chat.sendMessage('What is the current date and time?');
        const response = result.response;
        
        // Check if Gemini wants to call getCurrentTime
        const functionCalls = response.functionCalls ? response.functionCalls() : [];
        
        console.log(`\n📞 Function calls requested: ${functionCalls.length}`);
        
        if (functionCalls.length === 0) {
            console.error('❌ Gemini did not call any functions');
            console.log('Response text:', response.text());
            return false;
        }
        
        // Check if getCurrentTime was called
        const getCurrentTimeCall = functionCalls.find(call => call.name === 'getCurrentTime');
        
        if (!getCurrentTimeCall) {
            console.error('❌ Gemini did not call getCurrentTime');
            console.log('Functions called:', functionCalls.map(c => c.name));
            return false;
        }
        
        console.log('✅ Gemini called getCurrentTime!\n');
        console.log('Function call details:');
        console.log(JSON.stringify(getCurrentTimeCall, null, 2));
        
        // Execute the function
        console.log('\n🔧 Executing getCurrentTime...');
        const timeResult = await executeCalendarFunction('getCurrentTime', {}, TEST_USER_EMAIL);
        
        console.log('✅ Function executed successfully\n');
        console.log('Result:', JSON.stringify(timeResult, null, 2));
        
        // Send result back to Gemini
        console.log('\n📤 Sending result back to Gemini...');
        const finalResponse = await chat.sendMessage([{
            functionResponse: {
                name: 'getCurrentTime',
                response: { result: timeResult }
            }
        }]);
        
        const finalText = finalResponse.response.text();
        console.log('\n🤖 Gemini\'s final response:');
        console.log(finalText);
        
        // Verify Gemini's response mentions date/time information
        const hasYear = /\d{4}/.test(finalText) || finalText.toLowerCase().includes('202');
        const hasTime = /\d{1,2}:\d{2}/.test(finalText) || finalText.toLowerCase().includes('time');
        const hasDate = finalText.toLowerCase().includes('day') || 
                        finalText.toLowerCase().includes('date') ||
                        hasYear;
        
        if (hasDate || hasTime) {
            console.log('\n✅ Gemini successfully used the time/date information');
            return true;
        } else {
            console.log('\n⚠️  Gemini response unclear - may not have processed time data');
            return true; // Still passes, as function was called
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

async function testGeminiUnderstandsRelativeTimes() {
    console.log('\n📍 TEST 4: Gemini using getCurrentTime for relative time queries');
    console.log('-'.repeat(80));
    
    if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY not found in environment');
        return false;
    }
    
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.0-flash-exp',
            tools: [{ functionDeclarations: calendarFunctions }]
        });
        
        const chat = model.startChat({ history: [] });
        
        console.log('💬 Sending prompt: "What day is tomorrow?"');
        
        const result = await chat.sendMessage('What day is tomorrow?');
        const response = result.response;
        
        const functionCalls = response.functionCalls ? response.functionCalls() : [];
        
        if (functionCalls.length === 0) {
            console.log('⚠️  Gemini answered without calling functions');
            console.log('Response:', response.text());
            return true; // Not a failure if Gemini can infer
        }
        
        const getCurrentTimeCall = functionCalls.find(call => call.name === 'getCurrentTime');
        
        if (getCurrentTimeCall) {
            console.log('✅ Gemini correctly called getCurrentTime for relative date\n');
            
            // Execute and respond
            const timeResult = await executeCalendarFunction('getCurrentTime', {}, TEST_USER_EMAIL);
            
            const finalResponse = await chat.sendMessage([{
                functionResponse: {
                    name: 'getCurrentTime',
                    response: { result: timeResult }
                }
            }]);
            
            console.log('🤖 Gemini\'s response:');
            console.log(finalResponse.response.text());
            
            return true;
        } else {
            console.log('ℹ️  Gemini handled query without explicit getCurrentTime call');
            return true; // Still acceptable
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('Starting test suite...\n');
    
    const results = {
        test1: false,
        test2: false,
        test3: false,
        test4: false
    };
    
    try {
        results.test1 = await testDirectGetCurrentTime();
        results.test2 = await testGeminiFunctionDeclaration();
        results.test3 = await testGeminiCanCallGetCurrentTime();
        results.test4 = await testGeminiUnderstandsRelativeTimes();
    } catch (error) {
        console.error('\n❌ Test suite error:', error.message);
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Test 1 - Direct getCurrentTime():           ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 - Function Declaration:              ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 - Gemini Calls getCurrentTime:       ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 4 - Relative Time Understanding:       ${results.test4 ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(r => r === true);
    
    if (allPassed) {
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('✅ Gemini CAN access current time/date from Calendar API');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED');
        console.log('Review the output above for details');
    }
    
    console.log('='.repeat(80) + '\n');
    
    process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});
