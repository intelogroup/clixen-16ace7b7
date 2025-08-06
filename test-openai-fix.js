// Quick test to verify OpenAI configuration detection
console.log('Testing OpenAI configuration detection...');

// Test the environment variable
const envKey = 'sk-placeholder-replace-with-your-actual-openai-api-key';
const isValid = envKey && 
    envKey !== 'your-openai-api-key-here' && 
    envKey !== 'sk-placeholder-replace-with-your-actual-openai-api-key' &&
    !envKey.includes('placeholder') &&
    envKey.startsWith('sk-') && 
    envKey.length > 30;

console.log('Environment Key:', envKey);
console.log('Is Valid:', isValid);
console.log('Expected: false (should detect placeholder)');

// Test with a real-looking key
const realKey = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567';
const isRealValid = realKey && 
    realKey !== 'your-openai-api-key-here' && 
    realKey !== 'sk-placeholder-replace-with-your-actual-openai-api-key' &&
    !realKey.includes('placeholder') &&
    realKey.startsWith('sk-') && 
    realKey.length > 30;

console.log('Real Key:', realKey);
console.log('Is Real Valid:', isRealValid);
console.log('Expected: true (should accept real key)');
