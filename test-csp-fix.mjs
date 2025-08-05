// Test script to verify CSP fix by testing Edge Function
console.log('🧪 Testing CSP fix by verifying Edge Function works...');

const testEdgeFunction = async () => {
  try {
    const response = await fetch('https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-system', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw'
      },
      body: JSON.stringify({
        message: 'Test message to verify CSP fix',
        user_id: 'test-user',
        agent_type: 'test'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Edge Function working:', {
        status: response.status,
        hasResponse: !!data.response,
        preview: data.response?.substring(0, 50) + '...'
      });
      return true;
    } else {
      console.log('⚠️  Edge Function response:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Edge Function error:', error.message);
    return false;
  }
};

testEdgeFunction();
