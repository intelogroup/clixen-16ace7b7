import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, getErrorMessage } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value && !validatePassword(value)) {
      setPasswordError('Password must be at least 6 characters');
    } else {
      setPasswordError('');
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        console.log('🔍 [AUTH] Checking existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ [AUTH] Session check error:', error.message);
          return;
        }
        
        if (session) {
          console.log('✅ [AUTH] Existing session found, redirecting to dashboard');
          navigate('/dashboard');
        } else {
          console.log('ℹ️ [AUTH] No existing session, showing login form');
        }
      } catch (error: any) {
        console.error('💥 [AUTH] Session check failed:', error);
      }
    };
    checkUser();
  }, [navigate]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    console.log('🔐 [AUTH] Starting password reset for email:', email.substring(0, 5) + '***@' + email.split('@')[1]);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });
      
      if (error) {
        console.error('❌ [AUTH] Password reset error:', error.message, error.status);
        throw error;
      }
      
      console.log('✅ [AUTH] Password reset email sent successfully');
      toast.success('Password reset link sent to your email!');
      setIsPasswordReset(false);
    } catch (error: any) {
      console.error('💥 [AUTH] Password reset failed:', error);
      const friendlyMessage = getErrorMessage(error);
      toast.error(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (!validatePassword(password)) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    console.log(`🔐 [AUTH] Starting ${isSignUp ? 'registration' : 'login'} for email:`, email.substring(0, 5) + '***@' + email.split('@')[1]);

    try {
      if (isSignUp) {
        console.log('📝 [AUTH] Attempting user registration...');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) {
          console.error('❌ [AUTH] Registration error:', error.message, error.status);
          throw error;
        }
        
        console.log('✅ [AUTH] Registration successful. User needs email confirmation:', !!data.user && !data.session);
        
        if (data.user && !data.session) {
          toast.success('Check your email for the confirmation link!');
        } else if (data.session) {
          toast.success('Account created and signed in successfully!');
          navigate('/dashboard');
        }
      } else {
        console.log('🔑 [AUTH] Attempting user login...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('❌ [AUTH] Login error:', error.message, error.status);
          throw error;
        }
        
        console.log('✅ [AUTH] Login successful. Session established:', !!data.session);
        toast.success('Signed in successfully!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('💥 [AUTH] Authentication failed:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error.details
      });
      
      const friendlyMessage = getErrorMessage(error);
      toast.error(friendlyMessage);
      
      // Clear sensitive form data on certain errors
      if (error.message?.includes('Invalid login credentials')) {
        setPassword('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    console.log('🌐 [AUTH] Starting Google OAuth flow...');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        console.error('❌ [AUTH] Google OAuth error:', error.message, error.status);
        throw error;
      }
      
      console.log('🔄 [AUTH] Google OAuth redirect initiated:', data.url);
    } catch (error: any) {
      console.error('💥 [AUTH] Google authentication failed:', error);
      const friendlyMessage = getErrorMessage(error);
      toast.error(friendlyMessage || 'Google authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold font-mono">
              clixen<span className="text-zinc-500">.ai</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold font-mono mb-2">
            {isPasswordReset ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-zinc-400">
            {isPasswordReset 
              ? 'Enter your email to receive a password reset link'
              : isSignUp 
              ? 'Start building AI-powered workflows'
              : 'Sign in to your Clixen account'
            }
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={isPasswordReset ? handlePasswordReset : handleAuth}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-zinc-500 text-white bg-black focus:outline-none focus:ring-2 sm:text-sm ${
                    emailError ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-white/20 focus:ring-white focus:border-white'
                  }`}
                  placeholder="you@example.com"
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-400">{emailError}</p>
                )}
              </div>
            </div>

            {!isPasswordReset && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={handlePasswordChange}
                    className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-zinc-500 text-white bg-black focus:outline-none focus:ring-2 sm:text-sm ${
                      passwordError ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-white/20 focus:ring-white focus:border-white'
                    }`}
                    placeholder="Enter your password"
                  />
                  {passwordError && (
                    <p className="mt-1 text-sm text-red-400">{passwordError}</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-white hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  isPasswordReset ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            </div>
          </form>

          {!isPasswordReset && !isSignUp && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsPasswordReset(true)}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {!isPasswordReset && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-zinc-900/50 text-zinc-400">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleAuth}
                className="w-full inline-flex justify-center py-2 px-4 border border-white/20 rounded-md shadow-sm bg-black text-sm font-medium text-white hover:bg-white/5 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="ml-2">Google</span>
              </button>
            </div>
          </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                if (isPasswordReset) {
                  setIsPasswordReset(false);
                } else {
                  setIsSignUp(!isSignUp);
                }
              }}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {isPasswordReset 
                ? 'Back to sign in'
                : isSignUp 
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}