#!/usr/bin/env node

/**
 * Clear conversation history from Firestore for a specific user
 * Usage: node scripts/clear-conversation.js [email]
 */

require('dotenv').config();
const { initializeFirebase } = require('../backend/config/firebase-config');
const { clearHistory } = require('../backend/server/services/firestore/conversationHistory');

// Initialize Firebase
try {
    initializeFirebase();
    console.log('✅ Firebase initialized');
} catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    process.exit(1);
}

async function clearConversation(userEmail) {
    try {
        console.log(`\n🗑️  Clearing conversation history for: ${userEmail}`);
        
        const success = await clearHistory(userEmail);
        
        if (success) {
            console.log(`✅ Successfully cleared conversation history for ${userEmail}`);
            console.log('   All messages have been deleted from Firestore');
        } else {
            console.log(`⚠️  No conversation found for ${userEmail}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error(`❌ Error clearing conversation:`, error);
        process.exit(1);
    }
}

// Get user email from command line args or use default
const userEmail = process.argv[2] || 'jimkalinov@gmail.com';

clearConversation(userEmail);
