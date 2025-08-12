import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        setLoading(false);
        throw new Error(error.message);
      }
      
      // Session will be set automatically by the auth state change listener
      // Don't set loading to false here - let auth state change handle it
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign up error:', error);
        setLoading(false);
        throw new Error(error.message);
      }
      
      // For signup, we typically don't get a session immediately (email confirmation)
      setLoading(false);
    } catch (error) {
      console.error('Sign up error:', error);
      setLoading(false);
      throw error;
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

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};