import React, { useState } from 'react';
import { simpleChatService } from '../lib/services/SimpleChatService';
import { useAuth } from '../lib/AuthContext';

export default function TestEdgeFunction() {
  const [testMessage, setTestMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleTest = async () => {
    if (!testMessage.trim()) return;
    
    setIsLoading(true);
    setError('');
    setResponse('');
    
    console.log('🧪 Testing Edge Function with message:', testMessage);
    
    try {
      const result = await simpleChatService.handleNaturalConversation(testMessage, []);
      
      console.log('✅ Edge Function test result:', result);
      setResponse(JSON.stringify(result, null, 2));
      
    } catch (err: any) {
      console.error('❌ Edge Function test error:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 Edge Function Test Page
          </h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Project Status</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p><strong>✅ Edge Function Deployed:</strong> ai-chat-simple</p>
              <p><strong>📡 Project:</strong> zfbgdixbzezpxllkoyfc.supabase.co</p>
              <p><strong>👤 User Authenticated:</strong> {user ? 'Yes' : 'No'}</p>
              {user && (
                <p><strong>📧 User Email:</strong> {user.email}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Message
              </label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a test message for the AI..."
                className="input-clean w-full"
                onKeyPress={(e) => e.key === 'Enter' && handleTest()}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleTest}
                disabled={!testMessage.trim() || isLoading}
                className="btn-clean btn-primary"
              >
                {isLoading ? 'Testing...' : 'Test Edge Function'}
              </button>
              
              <button
                onClick={() => setTestMessage('I want to automate sending email notifications when users sign up')}
                className="btn-clean btn-secondary"
              >
                Use Sample Message
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Testing Edge Function...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-800 font-semibold mb-2">❌ Error</h3>
              <pre className="text-red-700 text-sm whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {response && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-green-800 font-semibold mb-2">✅ Success</h3>
              <pre className="text-green-700 text-sm whitespace-pre-wrap overflow-auto max-h-96">
                {response}
              </pre>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-4">🔍 Debug Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Open browser DevTools Console to see detailed logs</p>
              <p className="text-sm text-gray-600">All API calls and responses are logged with prefixes:</p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>🚀 [MODERN-CHAT] - Chat component events</li>
                <li>🔄 [CHAT] - SimpleChatService operations</li>
                <li>🌐 [EDGE-FUNCTION] - Edge Function calls</li>
                <li>🤖 [OPENAI] - OpenAI API interactions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
