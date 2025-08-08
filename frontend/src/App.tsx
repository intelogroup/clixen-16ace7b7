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
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(30, 41, 59, 0.95)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
            style: {
              border: '1px solid rgba(16, 185, 129, 0.2)',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
            style: {
              border: '1px solid rgba(239, 68, 68, 0.2)',
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
    <ErrorBoundary showDetails={true}>
      <NotificationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}
