import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getAuthErrorInfo } from './auth/authErrorMessages';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Auth session error:', error);
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }

        setInitialized(true);
        setLoading(false);

        // Set up auth state change listener only after initial session check
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;

          console.log('Auth state change:', event, session?.user?.email);
          
          setSession(session);
          setUser(session?.user ?? null);
          
          // Handle session persistence (Supabase already handles this internally)
          if (event === 'SIGNED_OUT') {
            // Clear any custom stored data
            localStorage.removeItem('clixen-auth-token');
            localStorage.removeItem('clixen-user-preferences');
          }

          // Ensure loading is false after auth state changes
          if (initialized) {
            setLoading(false);
          }
        });

        subscription = authSubscription;
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setInitialized(true);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [initialized]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) {
        const errorInfo = getAuthErrorInfo(error);
        const errorMessage = errorInfo.message + (errorInfo.action ? ` ${errorInfo.action}` : '');
        setError(errorMessage);
        setLoading(false);
        return { success: false, message: errorMessage };
      }
      
      // Session will be set automatically by the auth state change listener
      setLoading(false);
      return { success: true };
    } catch (error: any) {
      console.error('Sign in error:', error);
      const errorMessage = error?.message || 'Failed to sign in. Please try again.';
      setError(errorMessage);
      setLoading(false);
      return { success: false, message: errorMessage };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate password strength
      if (password.length < 6) {
        const errorMessage = 'Password must be at least 6 characters long';
        setError(errorMessage);
        setLoading(false);
        return { success: false, message: errorMessage };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });
      
      if (error) {
        const errorInfo = getAuthErrorInfo(error);
        const errorMessage = errorInfo.message + (errorInfo.action ? ` ${errorInfo.action}` : '');
        setError(errorMessage);
        setLoading(false);
        return { success: false, message: errorMessage };
      }
      
      // Check if email confirmation is required
      if (data?.user && !data.session) {
        setLoading(false);
        return { success: true, message: 'Please check your email to confirm your account.' };
      }
      
      setLoading(false);
      return { success: true };
    } catch (error: any) {
      console.error('Sign up error:', error);
      const errorMessage = error?.message || 'Failed to create account. Please try again.';
      setError(errorMessage);
      setLoading(false);
      return { success: false, message: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        // Still clear local state even on error
        setSession(null);
        setUser(null);
        localStorage.removeItem('clixen-auth-token');
        localStorage.removeItem('clixen-user-preferences');
        setLoading(false);
        throw error;
      }
      // Auth state change will handle clearing session/user state
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear local state even if network request fails
      setSession(null);
      setUser(null);
      localStorage.removeItem('clixen-auth-token');
      localStorage.removeItem('clixen-user-preferences');
      setLoading(false);
      throw error;
    }
  };

  const clearError = () => setError(null);

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};