const { google } = require('googleapis');
// const GoogleCalendarTester = require('./calendar-test'); // Commented out - file doesn't exist

// Your Google API Key
const API_KEY = 'AIzaSyCMU_vrDq83hSp_cvcxo2LLawC1G7ejRuw';

async function main() {
    console.log('🎯 Google Calendar API Test Environment');
    console.log('=====================================\n');
    
    console.log('📋 Available Commands:');
    console.log('  npm test          - Run basic API key validation');
    console.log('  node calendar-test.js - Run comprehensive calendar tests');
    console.log('  node index.js     - Run this main application\n');
    
    // Initialize the calendar API
    const calendar = google.calendar({
        version: 'v3',
        auth: API_KEY
    });
    
    console.log('🔧 API Configuration:');
    console.log(`   API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 6)}`);
    console.log(`   Version: v3`);
    console.log(`   Client: googleapis\n`);
    
    // Run a quick connectivity test
    try {
        console.log('🔍 Quick connectivity test...');
        const colors = await calendar.colors.get();
        console.log('✅ Successfully connected to Google Calendar API');
        console.log(`🎨 Retrieved ${Object.keys(colors.data.calendar || {}).length} calendar color options\n`);
        
        // Suggest next steps
        console.log('🚀 Next Steps:');
        console.log('1. Run comprehensive tests: node calendar-test.js');
        console.log('2. Check if Calendar API is enabled in Google Cloud Console');
        console.log('3. Set up OAuth 2.0 for full functionality (if needed)');
        console.log('4. Start building your calendar application!\n');
        
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Verify API key is correct');
        console.log('2. Ensure Calendar API is enabled in Google Cloud Console');
        console.log('3. Check API key restrictions and quotas');
        console.log('4. Consider setting up OAuth 2.0 for authenticated requests\n');
    }
}

// Example function for creating calendar events (requires OAuth)
function createEventExample() {
    const event = {
        'summary': 'Test Event',
        'location': 'Virtual',
        'description': 'A test event created via API',
        'start': {
            'dateTime': '2025-10-28T09:00:00-07:00',
            'timeZone': 'America/Los_Angeles',
        },
        'end': {
            'dateTime': '2025-10-28T10:00:00-07:00',
            'timeZone': 'America/Los_Angeles',
        },
        'attendees': [
            {'email': 'example@gmail.com'},
        ],
        'reminders': {
            'useDefault': false,
            'overrides': [
                {'method': 'email', 'minutes': 24 * 60},
                {'method': 'popup', 'minutes': 10},
            ],
        },
    };
    
    return event;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    API_KEY,
    createEventExample
};