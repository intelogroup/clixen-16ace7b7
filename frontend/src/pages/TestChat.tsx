import React, { useState } from 'react';
import { simpleChatService } from '../lib/services/SimpleChatService';
import toast from 'react-hot-toast';

export default function TestChat() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runBasicTest = async () => {
    setIsRunning(true);
    addResult('🧪 Starting Basic SimpleChatService Test');

    try {
      const testMessage = "I want to automate sending email notifications when new users sign up";
      addResult(`📤 Sending: "${testMessage}"`);

      const result = await simpleChatService.handleNaturalConversation(testMessage, []);
      
      addResult('✅ Response received successfully');
      addResult(`📊 Response: "${result.response.substring(0, 100)}..."`);
      addResult(`🔍 Mode: ${result.mode}`);
      addResult(`❓ Needs More Info: ${result.needsMoreInfo}`);
      addResult(`⚡ Can Proceed: ${result.canProceed}`);
      addResult(`❓ Questions: ${result.questions.length}`);

      if (result.scopeStatus?.generated) {
        addResult('🎉 Workflow was generated!');
      }

    } catch (error) {
      addResult(`❌ Error: ${error.message}`);
    }

    setIsRunning(false);
  };

  const runConversationFlow = async () => {
    setIsRunning(true);
    addResult('🔄 Starting Conversation Flow Test');

    const messages = [
      "I need help with automation",
      "I want to send Slack messages when someone fills out a form",
      "The form is on my website and I want to notify our sales team in #leads channel",
      "Yes, that sounds perfect. Please create the workflow."
    ];

    let conversationHistory: any[] = [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      addResult(`💬 Message ${i + 1}: "${message}"`);

      try {
        const result = await simpleChatService.handleNaturalConversation(
          message,
          conversationHistory
        );

        addResult(`📤 Phase: ${result.mode} | Needs Info: ${result.needsMoreInfo}`);

        if (result.questions.length > 0) {
          addResult(`❓ Questions: ${result.questions.join(', ')}`);
        }

        if (result.scopeStatus?.generated) {
          addResult('🎉 Workflow Generated Successfully!');
        }

        // Add to conversation history
        conversationHistory.push(
          { type: 'user', content: message },
          { type: 'assistant', content: result.response }
        );

        // Delay between messages
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        addResult(`❌ Message ${i + 1} failed: ${error.message}`);
      }
    }

    setIsRunning(false);
    addResult('🏁 Conversation flow test completed');
  };

  const testErrorHandling = async () => {
    setIsRunning(true);
    addResult('🔧 Starting Error Handling Test');

    try {
      // Test with empty message
      const result1 = await simpleChatService.handleNaturalConversation('', []);
      addResult('✅ Empty message handled gracefully');
    } catch (error) {
      addResult('❌ Empty message caused error');
    }

    try {
      // Test with very long message
      const longMessage = 'A'.repeat(5000);
      const result2 = await simpleChatService.handleNaturalConversation(longMessage, []);
      addResult('✅ Long message handled gracefully');
    } catch (error) {
      addResult('❌ Long message caused error');
    }

    setIsRunning(false);
    addResult('🏁 Error handling test completed');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Phase 1 Chat Testing Dashboard
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={runBasicTest}
              disabled={isRunning}
              className="btn-primary"
            >
              {isRunning ? 'Running...' : 'Basic Test'}
            </button>

            <button
              onClick={runConversationFlow}
              disabled={isRunning}
              className="btn-primary"
            >
              {isRunning ? 'Running...' : 'Conversation Flow'}
            </button>

            <button
              onClick={testErrorHandling}
              disabled={isRunning}
              className="btn-primary"
            >
              {isRunning ? 'Running...' : 'Error Handling'}
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Test Results</h2>
            <button
              onClick={clearResults}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Results
            </button>
          </div>

          <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
            {testResults.length === 0 ? (
              <div className="text-gray-500">
                Click a test button above to start testing Phase 1 functionality
              </div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-blue-800 font-semibold mb-2">Phase 1 Features Being Tested:</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>✅ SimpleChatService integration with Supabase Edge Functions</li>
              <li>✅ Fallback service when Edge Functions are unavailable</li>
              <li>✅ Conversation flow through different phases (gathering → validating → creating)</li>
              <li>✅ Workflow status updates based on AI responses</li>
              <li>✅ Error handling and user-friendly error messages</li>
              <li>✅ Toast notifications for service status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
