#!/usr/bin/env node

// Test CORS from Netlify domain
import fetch from 'node-fetch';

const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

console.log('Testing CORS from different origins...\n');

const origins = [
  'https://clixen.netlify.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://example.com'
];

for (const origin of origins) {
  console.log(`Testing with Origin: ${origin}`);
  
  try {
    const response = await fetch(`${N8N_API_URL}/workflows`, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'X-N8N-API-KEY, Content-Type'
      }
    });
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin') || 'Not set'}`);
    console.log(`  Access-Control-Allow-Credentials: ${response.headers.get('access-control-allow-credentials') || 'Not set'}`);
    console.log(`  Access-Control-Allow-Headers: ${response.headers.get('access-control-allow-headers') || 'Not set'}`);
    
    // Try actual request
    const apiResponse = await fetch(`${N8N_API_URL}/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
        'Origin': origin
      }
    });
    console.log(`  API Request Status: ${apiResponse.status}`);
    console.log(`  API CORS Header: ${apiResponse.headers.get('access-control-allow-origin') || 'Not set'}`);
    
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
  
  console.log('');
}