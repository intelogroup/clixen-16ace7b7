import { n8nApi } from './src/lib/n8n.ts';

console.log('Testing N8N connection fix...');

async function testConnection() {
  try {
    console.log('Running n8n connection test...');
    const result = await n8nApi.testConnection();
    console.log('Connection test result:', result);
    
    if (result.success) {
      console.log('✅ Connection successful:', result.message);
      if (result.version) {
        console.log('Version:', result.version);
      }
    } else {
      console.log('❌ Connection failed:', result.message);
    }
    
    // Test workflow listing
    console.log('\nTesting workflow listing...');
    const workflows = await n8nApi.getWorkflows();
    console.log('Workflows found:', workflows?.length || 0);
    if (workflows?.length > 0) {
      console.log('Sample workflow:', workflows[0]);
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Check if we're in browser or node environment
if (typeof window !== 'undefined') {
  console.log('Running in browser environment');
  console.log('Current URL:', window.location.href);
  console.log('Is production environment:', !window.location.hostname.includes('localhost'));
} else {
  console.log('Running in Node.js environment');
}

testConnection();
