import React from 'react';

export default function MinimalApp() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      color: 'white'
    }}>
      <div style={{
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        padding: '60px 40px',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        maxWidth: '600px'
      }}>
        <div style={{
          fontSize: '60px',
          marginBottom: '20px'
        }}>
          🚀
        </div>
        
        <h1 style={{
          fontSize: '48px',
          margin: '0 0 20px',
          background: 'linear-gradient(135deg, #fff, #f0f0f0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Clixen AI
        </h1>
        
        <p style={{
          fontSize: '20px',
          opacity: 0.9,
          marginBottom: '40px'
        }}>
          Modern AI-Powered Workflow Automation Platform
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginTop: '40px'
        }}>
          <div style={{
            padding: '30px 20px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '30px', marginBottom: '10px' }}>🤖</div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px' }}>AI Chat</h3>
            <p style={{ margin: '0', fontSize: '14px', opacity: 0.8 }}>
              Natural language workflow creation
            </p>
          </div>
          
          <div style={{
            padding: '30px 20px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '30px', marginBottom: '10px' }}>⚡</div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px' }}>Automation</h3>
            <p style={{ margin: '0', fontSize: '14px', opacity: 0.8 }}>
              Connect services and automate tasks
            </p>
          </div>
          
          <div style={{
            padding: '30px 20px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '30px', marginBottom: '10px' }}>🚀</div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px' }}>Deploy</h3>
            <p style={{ margin: '0', fontSize: '14px', opacity: 0.8 }}>
              Deploy to n8n instantly
            </p>
          </div>
        </div>
        
        <button
          style={{
            marginTop: '40px',
            padding: '15px 40px',
            fontSize: '18px',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Get Started →
        </button>
        
        <div style={{
          marginTop: '30px',
          fontSize: '14px',
          opacity: 0.7
        }}>
          Powered by Modern Magic UI Design
        </div>
      </div>
    </div>
  );
}
