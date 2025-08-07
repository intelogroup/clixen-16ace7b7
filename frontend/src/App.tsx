import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { AppLoading, PageLoading } from './components/LoadingStates';
import { NotificationProvider, ErrorBoundary } from './components/Notifications';

// Modern MVP components
const ModernAuth = React.lazy(() => import('./pages/ModernAuth'));
const ModernDashboard = React.lazy(() => import('./pages/ModernDashboard'));
const ModernChat = React.lazy(() => import('./pages/ModernChat'));

// Basic components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const { loading, user } = useAuth();

  if (loading) {
    return <AppLoading />;
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
          <React.Suspense fallback={<AppLoading />}>
            <ModernAuth />
          </React.Suspense>
        } />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route
              path="/dashboard"
              element={
                <React.Suspense fallback={<PageLoading message="Loading dashboard..." />}>
                  <ModernDashboard />
                </React.Suspense>
              }
            />
            <Route
              path="/chat"
              element={
                <React.Suspense fallback={<PageLoading message="Loading chat..." />}>
                  <ModernChat />
                </React.Suspense>
              }
            />
            <Route
              path="/chat/:id"
              element={
                <React.Suspense fallback={<PageLoading message="Loading chat..." />}>
                  <ModernChat />
                </React.Suspense>
              }
            />
          </Route>
        </Route>

        {/* Default redirects - Handle auth state properly */}
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
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
