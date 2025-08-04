#!/usr/bin/env node

// Test n8n connection directly
import fetch from 'node-fetch';

const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

console.log('Testing n8n connection...');
console.log('API URL:', N8N_API_URL);
console.log('API Key:', N8N_API_KEY.substring(0, 20) + '...');

// Test 1: Health check
console.log('\n1. Testing health endpoint...');
try {
  const healthResponse = await fetch('http://18.221.12.50:5678/healthz');
  console.log('Health check status:', healthResponse.status);
  const healthData = await healthResponse.json();
  console.log('Health response:', healthData);
} catch (error) {
  console.error('Health check failed:', error.message);
}

// Test 2: API with key
console.log('\n2. Testing API with key...');
try {
  const apiResponse = await fetch(`${N8N_API_URL}/workflows`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  console.log('API status:', apiResponse.status);
  if (apiResponse.ok) {
    const data = await apiResponse.json();
    console.log('Number of workflows:', data.data?.length || 0);
    console.log('First workflow:', data.data?.[0]?.name || 'No workflows');
  } else {
    const error = await apiResponse.text();
    console.error('API error:', error);
  }
} catch (error) {
  console.error('API request failed:', error.message);
}

// Test 3: Check what the browser would see
console.log('\n3. Simulating browser environment...');
const IS_DEMO_MODE = !N8N_API_URL.includes('18.221.12.50') && !N8N_API_URL.includes('localhost');
console.log('URL includes 18.221.12.50:', N8N_API_URL.includes('18.221.12.50'));
console.log('URL includes localhost:', N8N_API_URL.includes('localhost'));
console.log('IS_DEMO_MODE would be:', IS_DEMO_MODE);

// Test 4: CORS request (what the browser does)
console.log('\n4. Testing CORS (browser-like request)...');
try {
  const corsResponse = await fetch(`${N8N_API_URL}/workflows`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      'Origin': 'https://clixen.netlify.app'
    }
  });
  console.log('CORS request status:', corsResponse.status);
  if (!corsResponse.ok) {
    const error = await corsResponse.text();
    console.error('CORS error:', error);
  }
} catch (error) {
  console.error('CORS request failed:', error.message);
}