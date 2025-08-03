import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  session: Session | null;
}

export default function ProtectedRoute({ session }: ProtectedRouteProps) {
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}