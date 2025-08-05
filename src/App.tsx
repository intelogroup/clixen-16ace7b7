import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Pages
import ModernLanding from './pages/ModernLanding';
import ModernAuth from './pages/ModernAuth';
import EnhancedDashboard from './pages/EnhancedDashboard';
import StandardChat from './pages/StandardChat';
import Chat from './pages/Chat';
import DatabaseDrivenChat from './pages/DatabaseDrivenChat';
import OAuthCallback from './pages/OAuthCallback';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const { loading } = useAuth();

  // Environment variable check
  if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('your-project')) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Configuration Error</h1>
          <p className="text-red-400 mb-6">Missing VITE_SUPABASE_URL environment variable</p>
          <div className="text-sm text-zinc-400 space-y-2">
            <p>Environment: {import.meta.env.MODE}</p>
            <p>URL: {window.location.href}</p>
            <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 bg-white text-black px-4 py-2 rounded-md hover:bg-white/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'font-mono',
          style: {
            background: '#0a0a0a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
      
      <Routes>
        <Route path="/" element={<ModernLanding />} />
        <Route path="/auth" element={<ModernAuth />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<EnhancedDashboard />} />
            <Route path="/chat" element={<StandardChat />} />
            <Route path="/advanced-chat" element={<Chat />} />
            <Route path="/database-chat" element={<DatabaseDrivenChat />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
