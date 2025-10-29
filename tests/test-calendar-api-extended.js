/*
 * Test: Extended Calendar API endpoints
 * Calls additional non-destructive Calendar API methods to verify availability
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getCalendarClient } = require('../backend/server/services/calendar/client');

async function pickTestUser() {
    const envEmail = process.env.TEST_USER_EMAIL;
    if (envEmail) return envEmail;

    // Look into tokens directory for any saved tokens
    const tokensDir = path.join(__dirname, '../tokens');
    if (!fs.existsSync(tokensDir)) {
        // fallback to root tokens folder
        const alt = path.join(process.cwd(), 'tokens');
        if (!fs.existsSync(alt)) return null;
        const files = fs.readdirSync(alt).filter(f => f.endsWith('.json'));
        if (files.length === 0) return null;
        return files[0].replace(/\.json$/i, '');
    }

    const files = fs.readdirSync(tokensDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) return null;
    return files[0].replace(/\.json$/i, '');
}

async function run() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 Extended Calendar API Test');
    console.log('='.repeat(80));

    const userEmail = await pickTestUser();
    if (!userEmail) {
        console.error('❌ No test user found. Set TEST_USER_EMAIL in .env or place a token file in /tokens');
        process.exit(1);
    }

    console.log('Test user:', userEmail);

    try {
        const calendar = await getCalendarClient(userEmail);

        // 1) freebusy.query
        try {
            const now = new Date();
            const timeMin = now.toISOString();
            const timeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

            console.log('\n> freebusy.query (next 24h)');
            const fb = await calendar.freebusy.query({
                requestBody: {
                    timeMin,
                    timeMax,
                    items: [{ id: 'primary' }]
                }
            });
            console.log('✅ freebusy.query OK - calendars returned:', Object.keys(fb.data.calendars || {}).join(', '));
        } catch (err) {
            console.error('❌ freebusy.query failed:', err.message);
        }

        // 2) calendars.get (primary)
        try {
            console.log('\n> calendars.get (primary)');
            const calGet = await calendar.calendars.get({ calendarId: 'primary' });
            console.log('✅ calendars.get OK - summary:', calGet.data.summary || calGet.data.id);
        } catch (err) {
            console.error('❌ calendars.get failed:', err.message);
        }

        // 3) calendarList.list
        try {
            console.log('\n> calendarList.list (list calendars)');
            const list = await calendar.calendarList.list({ maxResults: 10 });
            console.log('✅ calendarList.list OK - total calendars:', list.data.items?.length || 0);
            if (list.data.items && list.data.items.length > 0) {
                console.log('   First calendars:', list.data.items.slice(0,3).map(c=>c.summary).join(' | '));
            }
        } catch (err) {
            console.error('❌ calendarList.list failed:', err.message);
        }

        // 4) settings.list
        try {
            console.log('\n> settings.list');
            const settings = await calendar.settings.list({ maxResults: 50 });
            console.log('✅ settings.list OK - total settings:', settings.data.items?.length || 0);
            if (settings.data.items && settings.data.items.length > 0) {
                console.log('   Example setting:', settings.data.items[0].id, '=', settings.data.items[0].value);
            }
        } catch (err) {
            console.error('❌ settings.list failed:', err.message);
        }

        // 5) colors.get
        try {
            console.log('\n> colors.get');
            const colors = await calendar.colors.get();
            console.log('✅ colors.get OK - calendar colors count:', Object.keys(colors.data.calendar || {}).length);
        } catch (err) {
            console.error('❌ colors.get failed:', err.message);
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ Extended Calendar API test completed');
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Failed to initialize calendar client:', error.message);
        process.exit(1);
    }
}

run();
