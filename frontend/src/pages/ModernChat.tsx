import React, { useState, useRef, useEffect } from 'react';

export default function ModernChat() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: `👋 **Welcome to Clixen AI!**

I'm your intelligent workflow automation assistant. I help you create powerful n8n workflows using simple, natural language.

**What I can help you with:**
🔄 Automate repetitive tasks
🔗 Connect different services and APIs
⏰ Create scheduled workflows
🪝 Set up webhooks and triggers
📊 Build data processing pipelines

**To get started**, just tell me what you'd like to automate! For example:
- "Send me a Slack message every morning at 9 AM"
- "When I receive an email, save the attachment to Google Drive"
- "Create a webhook that processes form submissions"

What would you like to automate today?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState('draft');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Great! I'll help you create that automation. Let me break this down into a workflow...",
        "Perfect! This sounds like a job for n8n. I'll design a workflow that handles this automatically.",
        "Excellent idea! I can create a workflow that will automate this process for you.",
        "That's a fantastic use case! Let me create an intelligent workflow to handle this."
      ];

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      setWorkflowStatus('generated');
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return '#10b981';
      case 'saved': return '#3b82f6';
      case 'deployed': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%)',
      fontFamily: 'Inter, sans-serif',
      color: 'white',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '15px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              padding: '10px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}>
              ← Dashboard
            </button>
            
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              💬
            </div>
            
            <div>
              <h1 style={{ margin: '0', fontSize: '18px' }}>AI Workflow Chat</h1>
              <p style={{ margin: '0', color: '#a0a0a0', fontSize: '12px' }}>
                Create workflows with natural language
              </p>
            </div>
          </div>
          
          <button style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            padding: '10px 15px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            🔄 New Chat
          </button>
        </div>
      </header>

      <div style={{
        flex: 1,
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px'
      }}>
        {/* Chat Area */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 140px)'
        }}>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                {message.role === 'assistant' && (
                  <div style={{
                    width: '36px',
                    height: '36px',
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    flexShrink: 0
                  }}>
                    🤖
                  </div>
                )}
                
                <div style={{
                  background: message.role === 'user' 
                    ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: message.role === 'user' 
                    ? 'none'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '16px',
                  color: 'white',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  order: message.role === 'user' ? -1 : 1
                }}>
                  {message.content}
                </div>

                {message.role === 'user' && (
                  <div style={{
                    width: '36px',
                    height: '36px',
                    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    flexShrink: 0
                  }}>
                    👤
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                maxWidth: '80%'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}>
                  🤖
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '4px'
                  }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: '8px',
                          height: '8px',
                          background: '#8b5cf6',
                          borderRadius: '50%',
                          animation: `bounce 1.4s infinite ${i * 0.2}s`
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ color: '#a0a0a0', fontSize: '14px' }}>
                    AI is thinking...
                  </span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} style={{
            padding: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe the workflow you want to create..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                style={{
                  background: !inputValue.trim() || isLoading
                    ? 'rgba(107, 114, 128, 0.5)'
                    : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  color: 'white',
                  cursor: !inputValue.trim() || isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isLoading ? '⏳' : '📤'} Send
              </button>
            </div>
          </form>
        </div>

        {/* Workflow Actions Sidebar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Workflow Status */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <span style={{ fontSize: '20px' }}>🔄</span>
              <h3 style={{ margin: '0', fontSize: '16px' }}>Workflow Actions</h3>
            </div>
            
            <div style={{
              background: `${getStatusColor(workflowStatus)}20`,
              border: `1px solid ${getStatusColor(workflowStatus)}40`,
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: getStatusColor(workflowStatus),
                borderRadius: '50%'
              }} />
              <span style={{
                fontSize: '12px',
                color: getStatusColor(workflowStatus),
                textTransform: 'capitalize',
                fontWeight: '600'
              }}>
                {workflowStatus}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button style={{
                background: workflowStatus === 'draft' 
                  ? 'rgba(107, 114, 128, 0.3)' 
                  : 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '10px',
                padding: '12px',
                color: workflowStatus === 'draft' ? '#9ca3af' : '#3b82f6',
                cursor: workflowStatus === 'draft' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                width: '100%'
              }}>
                💾 Save Workflow
              </button>
              
              <button style={{
                background: workflowStatus === 'draft' 
                  ? 'rgba(107, 114, 128, 0.3)' 
                  : 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '10px',
                padding: '12px',
                color: workflowStatus === 'draft' ? '#9ca3af' : '#8b5cf6',
                cursor: workflowStatus === 'draft' ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                width: '100%'
              }}>
                🚀 Deploy to n8n
              </button>
            </div>
          </div>

          {/* Tips */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '16px',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <span style={{ fontSize: '20px' }}>💡</span>
              <h4 style={{ margin: '0', fontSize: '16px' }}>Pro Tips</h4>
            </div>
            
            <ul style={{
              margin: '0',
              padding: '0',
              listStyle: 'none',
              fontSize: '12px',
              color: '#a0a0a0',
              lineHeight: '1.6'
            }}>
              <li style={{ marginBottom: '8px' }}>
                🎯 Be specific about data sources and formats
              </li>
              <li style={{ marginBottom: '8px' }}>
                ⏰ Mention timing and scheduling requirements
              </li>
              <li style={{ marginBottom: '8px' }}>
                🔧 Include conditions and error handling
              </li>
              <li>
                📤 Specify desired output destinations
              </li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
