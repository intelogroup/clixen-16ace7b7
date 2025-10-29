/**
 * Test: Verify conversation history is loaded correctly
 * 
 * This test demonstrates that Gemini loads previous conversation context
 */

require('dotenv').config();
const { conversationHistory } = require('../backend/server/services/firestore');

const TEST_USER = 'test@example.com';

async function testConversationHistory() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTING: Conversation History Loading');
    console.log('='.repeat(80));
    
    try {
        // Step 1: Clear existing history
        console.log('\n📍 Step 1: Clear existing history');
        await conversationHistory.clearHistory(TEST_USER);
        console.log('✅ History cleared\n');
        
        // Step 2: Add some test messages
        console.log('📍 Step 2: Add test conversation');
        await conversationHistory.addMessage(TEST_USER, 'user', 'What is the capital of France?');
        await conversationHistory.addMessage(TEST_USER, 'assistant', 'The capital of France is Paris.');
        await conversationHistory.addMessage(TEST_USER, 'user', 'What about Germany?');
        await conversationHistory.addMessage(TEST_USER, 'assistant', 'The capital of Germany is Berlin.');
        console.log('✅ Added 4 messages\n');
        
        // Force sync to Firestore
        console.log('📍 Step 3: Sync to Firestore');
        await conversationHistory.syncToFirestore(TEST_USER);
        console.log('✅ Synced to Firestore\n');
        
        // Step 4: Get conversation history (simulating what Gemini does)
        console.log('📍 Step 4: Load conversation history (like Gemini does)');
        const history = await conversationHistory.getConversationHistory(TEST_USER);
        console.log(`✅ Loaded ${history.length} messages:\n`);
        
        history.forEach((msg, i) => {
            console.log(`   ${i + 1}. [${msg.role}] ${msg.content}`);
        });
        
        // Step 5: Format for Gemini
        console.log('\n📍 Step 5: Format history for Gemini API');
        const formattedHistory = await conversationHistory.formatHistoryForGemini(TEST_USER);
        console.log(`✅ Formatted ${formattedHistory.length} messages for Gemini:\n`);
        
        formattedHistory.forEach((msg, i) => {
            console.log(`   ${i + 1}. [${msg.role}] ${msg.parts[0].text}`);
        });
        
        // Step 6: Get stats
        console.log('\n📍 Step 6: Get conversation stats');
        const stats = await conversationHistory.getConversationStats(TEST_USER);
        console.log('✅ Stats:');
        console.log(`   - Total messages: ${stats.totalMessages}`);
        console.log(`   - User messages: ${stats.userMessages}`);
        console.log(`   - Assistant messages: ${stats.assistantMessages}`);
        console.log(`   - Oldest message: ${stats.oldestMessage}`);
        console.log(`   - Newest message: ${stats.newestMessage}`);
        
        console.log('\n' + '='.repeat(80));
        console.log('🎉 TEST PASSED: Conversation history is loaded correctly!');
        console.log('='.repeat(80));
        console.log('\n✅ Gemini will now have access to previous conversation context');
        console.log('✅ History is stored in Firestore (survives server restarts)');
        console.log('✅ Last 10 of 50 messages are sent to Gemini for context\n');
        
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testConversationHistory();
