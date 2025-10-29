/**
 * Test Text Preprocessing for TTS
 * Verify markdown/emoji removal works correctly
 */

const { preprocessTextForTTS } = require('./backend/server/services/audio/text-preprocessor');

console.log('🧪 Testing Text Preprocessing for TTS\n');

const testCases = [
    {
        name: 'Remove markdown bold/italic',
        input: 'You have **3 meetings** tomorrow and *one* today.',
        expected: 'You have 3 meetings tomorrow and one today.'
    },
    {
        name: 'Remove emojis',
        input: '✅ Event created! 📅 Meeting scheduled for tomorrow 🎉',
        expected: 'Event created! Meeting scheduled for tomorrow'
    },
    {
        name: 'Remove bullet points',
        input: 'Your events:\n- Meeting at 9 AM\n- Lunch at 12 PM',
        expected: 'Your events:\nMeeting at 9 AM\nLunch at 12 PM'
    },
    {
        name: 'Remove headers',
        input: '# Today\'s Schedule\n## Morning\nYou have a meeting',
        expected: 'Today\'s Schedule\nMorning\nYou have a meeting'
    },
    {
        name: 'Remove code blocks',
        input: 'Here is the time: `2024-10-29` for your reference',
        expected: 'Here is the time: 2024-10-29 for your reference'
    },
    {
        name: 'Remove URLs',
        input: 'Check https://example.com for details',
        expected: 'Check  for details'
    },
    {
        name: 'Fix repeated punctuation',
        input: 'Really!!! Are you sure??? Yes...',
        expected: 'Really! Are you sure? Yes...'
    },
    {
        name: 'Complex example',
        input: '**Great!** ✅ I\'ve scheduled your meeting:\n\n- 📅 **Date**: Tomorrow\n- 🕐 **Time**: 3 PM\n- 👤 **With**: Sarah\n\nSee you there!!!',
        expected: 'Great! I\'ve scheduled your meeting:\n\nDate: Tomorrow\nTime: 3 PM\nWith: Sarah\n\nSee you there!'
    }
];

let passed = 0;
let failed = 0;

testCases.forEach(({ name, input, expected }) => {
    const result = preprocessTextForTTS(input);
    const trimmedResult = result.trim();
    const trimmedExpected = expected.trim();
    
    if (trimmedResult === trimmedExpected) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        console.log(`   Input:    "${input}"`);
        console.log(`   Expected: "${trimmedExpected}"`);
        console.log(`   Got:      "${trimmedResult}"`);
        failed++;
    }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
} else {
    console.log('❌ Some tests failed');
    process.exit(1);
}
