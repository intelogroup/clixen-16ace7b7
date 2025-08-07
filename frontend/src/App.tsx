import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Standard MVP components
const StandardAuth = React.lazy(() => import('./pages/StandardAuth'));
const StandardDashboard = React.lazy(() => import('./pages/StandardDashboard'));
const StandardChat = React.lazy(() => import('./pages/StandardChat'));

// Basic components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
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
        {/* Public routes */}
        <Route path="/auth" element={
          <React.Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="h-8 w-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" /></div>}>
            <StandardAuth />
          </React.Suspense>
        } />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route 
              path="/dashboard" 
              element={
                <React.Suspense fallback={<div className="flex items-center justify-center p-8"><div className="h-6 w-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" /></div>}>
                  <StandardDashboard />
                </React.Suspense>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <React.Suspense fallback={<div className="flex items-center justify-center p-8"><div className="h-6 w-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" /></div>}>
                  <StandardChat />
                </React.Suspense>
              } 
            />
            <Route 
              path="/chat/:id" 
              element={
                <React.Suspense fallback={<div className="flex items-center justify-center p-8"><div className="h-6 w-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" /></div>}>
                  <StandardChat />
                </React.Suspense>
              } 
            />
          </Route>
        </Route>

        {/* Default redirects - Start with auth for unauthenticated users */}
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
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
