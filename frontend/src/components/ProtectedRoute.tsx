import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading, user } = useAuth();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [hasValidated, setHasValidated] = useState(false);

  // Additional validation to prevent race conditions
  useEffect(() => {
    if (!loading) {
      // Small delay to ensure auth state has stabilized
      const validateTimer = setTimeout(() => {
        setIsValidating(false);
        setHasValidated(true);
      }, 100);

      return () => clearTimeout(validateTimer);
    }
  }, [loading]);

  // Show loading spinner during initial auth check or validation
  if (loading || isValidating || !hasValidated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Strict authentication check - require both session and user
  if (!session || !user || !session.access_token) {
    console.log('🔒 Protected route: Redirecting to auth - Missing:', {
      hasSession: !!session,
      hasUser: !!user,
      hasAccessToken: !!(session?.access_token),
    });
    
    // Preserve the intended destination for post-login redirect
    return (
      <Navigate 
        to="/auth" 
        state={{ from: location.pathname + location.search }} 
        replace 
      />
    );
  }

  // Validate session is not expired
  if (session.expires_at && session.expires_at * 1000 < Date.now()) {
    console.log('🔒 Protected route: Session expired, redirecting to auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  console.log('✅ Protected route: Authentication verified for user:', user.email);

  // Render children if provided, otherwise use Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
}
