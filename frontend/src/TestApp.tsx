import React from 'react';

export default function TestApp() {
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea, #764ba2)', 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀 Clixen AI</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>Modern UI is Loading...</p>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '3px solid rgba(255,255,255,0.3)', 
          borderTop: '3px solid white', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '2rem auto'
        }} />
      </div>
    </div>
  );
}
