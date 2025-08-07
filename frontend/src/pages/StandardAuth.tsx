import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff,
  Zap,
  Loader2
} from 'lucide-react';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import { validatePassword } from '../lib/validation/passwordValidation';
import AuthErrorDisplay from '../components/AuthErrorDisplay';
import { formatAuthError, getAuthErrorSeverity } from '../lib/auth/authErrorMessages';
import LoadingButton from '../components/LoadingButton';
import { useAuthOperation } from '../lib/hooks/useLoadingState';
import { ValidatedEmailInput, ValidatedPasswordInput, ValidatedNameInput } from '../components/ValidatedInput';
import { designTokens } from '../styles/design-tokens';

export default function StandardAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [authError, setAuthError] = useState<any>(null);

  // Create auth operation with retry logic
  const performAuth = async () => {
    if (isSignUp) {
      if (!formData.name) {
        throw new Error('Please enter your name');
      }

      // Validate password strength for sign-ups
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        throw new Error('Please create a stronger password. Check the requirements below.');
      }
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name
          }
        }
      });

      if (error) throw error;
      
      toast.success('Check your email to confirm your account!');
      setIsSignUp(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;
      
      toast.success('Welcome back!');
      // Navigate to intended destination or default to dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  };

  const [authLoadingState, authActions] = useAuthOperation(performAuth, {
    onError: (error) => {
      setAuthError(error);
      const severity = getAuthErrorSeverity(error);
      const message = formatAuthError(error);
      
      if (severity === 'error') {
        toast.error(message);
      } else if (severity === 'warning') {
        toast(message, { icon: '⚠️' });
      } else {
        toast(message, { icon: 'ℹ️' });
      }
    },
    onRetry: (attempt, error) => {
      toast(`Retrying authentication (${attempt})...`, { icon: '🔄' });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null); // Clear previous errors

    if (!formData.email || !formData.password) {
      setAuthError({ message: 'Please fill in all required fields' });
      return;
    }

    await authActions.execute();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear errors when user starts typing
    if (authError) {
      setAuthError(null);
    }
    
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setAuthError(null); // Clear errors when switching modes
    setFormData({ email: '', password: '', name: '' }); // Reset form
    authActions.reset(); // Reset loading state
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 mb-8">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ 
                  backgroundColor: designTokens.colors.primary[500],
                  color: designTokens.colors.white
                }}
              >
                <Zap className="w-5 h-5" />
              </div>
              <span 
                className="text-xl font-bold"
                style={{ color: designTokens.colors.gray[900] }}
              >
                clixen<span style={{ color: designTokens.colors.gray[500] }}>.ai</span>
              </span>
            </Link>

            {/* Header */}
            <div className="mb-8">
              <h1 
                className="font-bold mb-2"
                style={{ 
                  fontSize: designTokens.typography.sizes['3xl'],
                  color: designTokens.colors.gray[900]
                }}
              >
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h1>
              <p style={{ color: designTokens.colors.gray[600] }}>
                {isSignUp 
                  ? 'Start building AI-powered workflows in minutes'
                  : 'Sign in to your Clixen account'
                }
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Display */}
              {authError && (
                <AuthErrorDisplay 
                  error={authError}
                  onDismiss={() => setAuthError(null)}
                />
              )}
              {isSignUp && (
                <ValidatedNameInput
                  id="name"
                  name="name"
                  label="Full Name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  onValidatedChange={(value, isValid, error) => {
                    // You can add additional validation logic here
                  }}
                  disabled={authLoadingState.isLoading || authLoadingState.isRetrying}
                  required
                />
              )}

              <ValidatedEmailInput
                id="email"
                name="email"
                label="Email Address"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                onValidatedChange={(value, isValid, error) => {
                  // Email validation handled by component
                }}
                disabled={authLoadingState.isLoading || authLoadingState.isRetrying}
                required
              />

              <ValidatedPasswordInput
                id="password"
                name="password"
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                onValidatedChange={(value, isValid, error) => {
                  // Password validation handled by component
                }}
                disabled={authLoadingState.isLoading || authLoadingState.isRetrying}
                required
              />

              {/* Password Strength Indicator for Sign Up */}
              {isSignUp && formData.password && (
                <PasswordStrengthIndicator 
                  password={formData.password}
                  className="mt-3"
                />
              )}

              <LoadingButton
                type="submit"
                loadingState={authLoadingState}
                onRetry={authActions.retry}
                loadingText={isSignUp ? 'Creating Account...' : 'Signing In...'}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight className="w-5 h-5" />
              </LoadingButton>
            </form>

            {/* Toggle between sign in/up */}
            <div className="mt-6 text-center">
              <p style={{ color: designTokens.colors.gray[600] }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={toggleMode}
                  className="font-medium hover:underline focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: designTokens.colors.primary[500] }}
                  disabled={authLoadingState.isLoading || authLoadingState.isRetrying}
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </div>

            {/* Footer links */}
            <div className="mt-8 text-center">
              <div className="flex justify-center gap-6 text-sm text-gray-500">
                <a href="#" className="hover:text-gray-700 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-gray-700 transition-colors">
                  Terms of Service
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Feature Showcase */}
      <div className="hidden lg:flex flex-1 bg-gray-50 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-lg"
        >
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Build workflows with natural language
            </h2>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Transform your ideas into powerful n8n automations using AI. 
              No coding required – just describe what you want.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">AI-Powered Generation</h4>
                  <p className="text-sm text-gray-600">Describe workflows in plain English</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Auto Deployment</h4>
                  <p className="text-sm text-gray-600">Instantly deploy to your n8n instance</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-3 h-3 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Real-time Testing</h4>
                  <p className="text-sm text-gray-600">Test and validate with live data</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Join 50,000+ users automating their workflows</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
