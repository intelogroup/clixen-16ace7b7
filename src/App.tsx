import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Pages
import StandardLanding from './pages/StandardLanding';
import StandardAuth from './pages/StandardAuth';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import ProfessionalChat from './pages/ProfessionalChat';
import Chat from './pages/Chat';
import DatabaseDrivenChat from './pages/DatabaseDrivenChat';
import OAuthCallback from './pages/OAuthCallback';
import NotFound from './pages/NotFound';

// Components
import ProfessionalLayout from './components/ProfessionalLayout';
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
          style: {
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
      
      <Routes>
        <Route path="/" element={<StandardLanding />} />
        <Route path="/auth" element={<StandardAuth />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<ProfessionalLayout />}>
            <Route path="/dashboard" element={<ProfessionalDashboard />} />
            <Route path="/chat" element={<ProfessionalChat />} />
            <Route path="/advanced-chat" element={<Chat />} />
            <Route path="/database-chat" element={<DatabaseDrivenChat />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
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
