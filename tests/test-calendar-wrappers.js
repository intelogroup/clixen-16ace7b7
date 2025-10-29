/**
 * Integration Test: All Calendar API Wrappers
 * Tests all newly implemented calendar functions
 */

require('dotenv').config();
const calendarService = require('../backend/server/services/calendar');

const TEST_USER = process.env.TEST_USER_EMAIL || 'jimkalinov@gmail.com';

async function run() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 COMPREHENSIVE CALENDAR API TEST');
    console.log('='.repeat(80));
    console.log(`Test User: ${TEST_USER}\n`);

    const results = {
        passed: [],
        failed: []
    };

    // Helper to run tests
    const test = async (name, fn) => {
        try {
            console.log(`\n📍 Testing: ${name}`);
            await fn();
            console.log(`✅ PASS: ${name}`);
            results.passed.push(name);
        } catch (error) {
            console.error(`❌ FAIL: ${name} - ${error.message}`);
            results.failed.push({ name, error: error.message });
        }
    };

    // Test 1: queryFreeBusy
    await test('queryFreeBusy', async () => {
        const now = new Date();
        const result = await calendarService.queryFreeBusy(TEST_USER, {
            timeMin: now.toISOString(),
            timeMax: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            calendars: ['primary']
        });
        if (!result.calendars || !result.calendars.primary) {
            throw new Error('Expected calendars.primary in result');
        }
        console.log(`   Busy periods: ${result.calendars.primary.busy.length}`);
    });

    // Test 2: listCalendars
    await test('listCalendars', async () => {
        const result = await calendarService.listCalendars(TEST_USER, {
            maxResults: 10
        });
        if (!result.calendars || !Array.isArray(result.calendars)) {
            throw new Error('Expected calendars array');
        }
        console.log(`   Found ${result.count} calendars`);
    });

    // Test 3: getCalendar
    await test('getCalendar', async () => {
        const result = await calendarService.getCalendar(TEST_USER, {
            calendarId: 'primary'
        });
        if (!result.id || !result.timeZone) {
            throw new Error('Expected calendar metadata');
        }
        console.log(`   Calendar: ${result.summary}, Timezone: ${result.timeZone}`);
    });

    // Test 4: getSettings
    await test('getSettings', async () => {
        const result = await calendarService.getSettings(TEST_USER, {
            maxResults: 20
        });
        if (!result.settings || typeof result.settings !== 'object') {
            throw new Error('Expected settings object');
        }
        console.log(`   Settings count: ${Object.keys(result.settings).length}`);
    });

    // Test 5: getColors
    await test('getColors', async () => {
        const result = await calendarService.getColors(TEST_USER);
        if (!result.calendarColors || !result.eventColors) {
            throw new Error('Expected color palettes');
        }
        console.log(`   Calendar colors: ${Object.keys(result.calendarColors).length}`);
        console.log(`   Event colors: ${Object.keys(result.eventColors).length}`);
    });

    // Test 6: Create a test event
    let testEventId = null;
    await test('createEvent', async () => {
        const now = new Date();
        const start = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 2 days from now
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

        const result = await calendarService.createEvent(TEST_USER, {
            summary: '[TEST] API Wrapper Test Event',
            description: 'Created by integration test - will be deleted',
            startTime: start.toISOString(),
            endTime: end.toISOString()
        });
        
        if (!result.success || !result.eventId) {
            throw new Error('Event creation failed');
        }
        testEventId = result.eventId;
        console.log(`   Created event: ${testEventId}`);
    });

    // Test 7: getEvent
    await test('getEvent', async () => {
        if (!testEventId) throw new Error('No test event created');
        
        const result = await calendarService.getEvent(TEST_USER, {
            eventId: testEventId
        });
        
        if (!result.id || result.id !== testEventId) {
            throw new Error('Event retrieval failed');
        }
        console.log(`   Retrieved: ${result.summary}`);
    });

    // Test 8: patchEvent (partial update)
    await test('patchEvent', async () => {
        if (!testEventId) throw new Error('No test event created');
        
        const result = await calendarService.patchEvent(TEST_USER, {
            eventId: testEventId,
            description: 'Updated description by patchEvent test'
        });
        
        if (!result.success) {
            throw new Error('Event patch failed');
        }
        console.log(`   Patched event successfully`);
    });

    // Test 9: updateEvent (full update)
    await test('updateEvent', async () => {
        if (!testEventId) throw new Error('No test event created');
        
        const now = new Date();
        const start = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 3 days from now
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        const result = await calendarService.updateEvent(TEST_USER, {
            eventId: testEventId,
            summary: '[TEST] Updated API Test Event',
            description: 'Fully updated by updateEvent test',
            startTime: start.toISOString(),
            endTime: end.toISOString()
        });
        
        if (!result.success) {
            throw new Error('Event update failed');
        }
        console.log(`   Updated event successfully`);
    });

    // Test 10: deleteEvent (cleanup)
    await test('deleteEvent', async () => {
        if (!testEventId) throw new Error('No test event created');
        
        const result = await calendarService.deleteEvent(TEST_USER, {
            eventId: testEventId
        });
        
        if (!result.success) {
            throw new Error('Event deletion failed');
        }
        console.log(`   Deleted test event`);
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    
    if (results.passed.length > 0) {
        console.log('\n✅ Passed tests:');
        results.passed.forEach(name => console.log(`   - ${name}`));
    }
    
    if (results.failed.length > 0) {
        console.log('\n❌ Failed tests:');
        results.failed.forEach(({ name, error }) => console.log(`   - ${name}: ${error}`));
    }

    console.log('\n' + '='.repeat(80));
    
    if (results.failed.length === 0) {
        console.log('🎉 ALL TESTS PASSED!');
        console.log('✅ All calendar API wrappers are working correctly');
        process.exit(0);
    } else {
        console.log('⚠️  SOME TESTS FAILED');
        console.log(`   ${results.passed.length} passed, ${results.failed.length} failed`);
        process.exit(1);
    }
}

run().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});
