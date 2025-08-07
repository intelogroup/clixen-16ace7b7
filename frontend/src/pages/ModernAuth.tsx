import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, getErrorMessage } from '../lib/supabase';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { SparklesIcon, EnvelopeIcon, LockClosedIcon, UserIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function ModernAuth() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('🔐 [AUTH] Starting password reset for email:', formData.email.substring(0, 5) + '***@' + formData.email.split('@')[1]);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
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
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log(`🔐 [AUTH] Starting ${isSignUp ? 'registration' : 'login'} for email:`, formData.email.substring(0, 5) + '***@' + formData.email.split('@')[1]);

    try {
      if (isSignUp) {
        console.log('📝 [AUTH] Attempting user registration...');
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name
            }
          }
        });

        if (error) {
          console.error('❌ [AUTH] Registration error:', error.message, error.status);
          throw error;
        }
        
        console.log('✅ [AUTH] Registration successful. User needs email confirmation:', !!data.user && !data.session);
        toast.success('Check your email to confirm your account!');
        setIsSignUp(false);
      } else {
        console.log('🔑 [AUTH] Attempting user login...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (error) {
          console.error('❌ [AUTH] Login error:', error.message, error.status);
          throw error;
        }
        
        console.log('✅ [AUTH] Login successful. Session established:', !!data.session);
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('💥 [AUTH] Authentication failed:', error);
      const friendlyMessage = getErrorMessage(error);
      toast.error(friendlyMessage);
      
      // Clear password on failed login
      if (error.message?.includes('Invalid login credentials')) {
        setFormData({ ...formData, password: '' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast.error(`${provider} login failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden relative flex items-center justify-center">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -100, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"
        />
      </div>

      {/* Back to Home */}
      <Link
        to="/"
        className="absolute top-8 left-8 flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
      >
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back</span>
      </Link>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25"
            >
              <SparklesIcon className="w-8 h-8 text-white" />
            </motion.div>
          </div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold mb-2">
              {isPasswordReset ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-400">
              {isPasswordReset ? 'Enter your email to receive a password reset link' : isSignUp ? 'Start building amazing workflows' : 'Continue your automation journey'}
            </p>
          </motion.div>

          {/* OAuth Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3 mb-6"
          >
            <button
              onClick={() => handleOAuthLogin('google')}
              className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              onClick={() => handleOAuthLogin('github')}
              className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 group"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </motion.div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-black/50 text-gray-400">Or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onSubmit={isPasswordReset ? handlePasswordReset : handleSubmit}
            className="space-y-4"
          >
            {isSignUp && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all duration-300 placeholder-gray-500"
                  required={isSignUp}
                />
              </div>
            )}

            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all duration-300 placeholder-gray-500"
                required
              />
            </div>

            {!isPasswordReset && (
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all duration-300 placeholder-gray-500"
                  required
                />
              </div>
            )}

            {!isPasswordReset && !isSignUp && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsPasswordReset(true)}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isPasswordReset ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Toggle Sign Up/In */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="text-gray-400">
              {isPasswordReset ? 'Remember your password?' : isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => {
                  if (isPasswordReset) {
                    setIsPasswordReset(false);
                  } else {
                    setIsSignUp(!isSignUp);
                  }
                }}
                className="ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                {isPasswordReset ? 'Sign In' : isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </motion.div>

          {/* Terms */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center text-xs text-gray-500"
          >
            By continuing, you agree to our{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300">Privacy Policy</a>
          </motion.div>
        </motion.div>

        {/* Features badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 flex justify-center items-center space-x-6"
        >
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>SSL Secured</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>GDPR Compliant</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}