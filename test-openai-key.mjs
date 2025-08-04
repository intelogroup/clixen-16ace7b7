#!/usr/bin/env node

// Test OpenAI API key
import fetch from 'node-fetch';

// Get API key from environment variable or use placeholder
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key-here';

if (OPENAI_API_KEY === 'your-openai-api-key-here') {
  console.log('⚠️  Using placeholder API key. Set OPENAI_API_KEY environment variable.');
  console.log('Example: OPENAI_API_KEY=sk-... node test-openai-key.mjs');
  process.exit(1);
}

console.log('Testing OpenAI API key...\n');

async function testOpenAI() {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Hello, I am working!" in exactly 5 words.' }
        ],
        max_tokens: 20,
        temperature: 0.7
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ OpenAI API key is VALID!');
      console.log('Response:', data.choices[0].message.content);
      return true;
    } else {
      const error = await response.json();
      console.log('❌ OpenAI API key is INVALID');
      console.log('Error:', error.error?.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to test OpenAI API');
    console.log('Error:', error.message);
    return false;
  }
}

testOpenAI();