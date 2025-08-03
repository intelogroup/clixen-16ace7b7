import React from 'react';

export default function AppDebug() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#000', 
      color: '#fff', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'monospace',
      padding: '20px'
    }}>
      <h1>🚀 Clixen Debug Mode</h1>
      <p>✅ React is loading successfully!</p>
      <p>🔗 Current URL: {window.location.href}</p>
      <p>📍 Current Path: {window.location.pathname}</p>
      <p>🌍 Environment: {import.meta.env.MODE}</p>
      <p>🔑 Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
      <p>🗝️ Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
      
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <h2>Navigation Test</h2>
        <a href="/" style={{ color: '#fff', margin: '0 10px' }}>Home</a>
        <a href="/auth" style={{ color: '#fff', margin: '0 10px' }}>Auth</a>
        <a href="/dashboard" style={{ color: '#fff', margin: '0 10px' }}>Dashboard</a>
        <a href="/chat" style={{ color: '#fff', margin: '0 10px' }}>Chat</a>
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '12px', opacity: 0.7 }}>
        <p>Timestamp: {new Date().toISOString()}</p>
        <p>User Agent: {navigator.userAgent}</p>
      </div>
    </div>
  );
}