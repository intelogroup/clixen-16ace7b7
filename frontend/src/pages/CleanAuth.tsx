import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthForm, FormField } from '../components/ui/form-field';
import { LoadingButton } from '../components/LoadingButton';
import { useForm, CommonValidations } from '../hooks/useForm';

export default function CleanAuth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signIn, signUp, user, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect authenticated users to their intended destination
  useEffect(() => {
    if (user) {
      const redirectTo = (location.state as any)?.from || '/dashboard';
      console.log('✅ Auth page: User already authenticated, redirecting to:', redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, location.state]);

  const form = useForm({
    email: { 
      initialValue: '', 
      validation: CommonValidations.email 
    },
    password: { 
      initialValue: '', 
      validation: CommonValidations.password 
    }
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    clearError();
    
    try {
      if (isSignUp) {
        const result = await signUp(values.email, values.password);
        if (result.success) {
          toast.success(result.message || 'Account created! Please check your email to verify.');
          // Switch to sign in mode after successful signup
          setIsSignUp(false);
          form.reset();
        } else {
          toast.error(result.message || 'Failed to create account');
        }
      } else {
        const result = await signIn(values.email, values.password);
        if (result.success) {
          toast.success('Welcome back!');
          
          // Redirect to intended destination or default to dashboard
          const redirectTo = (location.state as any)?.from || '/dashboard';
          console.log('✅ Sign in successful, redirecting to:', redirectTo);
          navigate(redirectTo, { replace: true });
        } else {
          toast.error(result.message || 'Failed to sign in');
        }
      }
    } catch (error: any) {
      console.error('🔒 Authentication error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <AuthForm 
      title={isSignUp ? 'Create Account' : 'Sign In'}
      subtitle={isSignUp ? 'Get started with Clixen' : 'Welcome back to Clixen'}
    >
      <FormField
        label="Email address"
        type="email"
        placeholder="Enter your email"
        value={form.values.email}
        onChange={(value) => form.setValue('email', value)}
        error={form.touched.email ? form.errors.email : undefined}
        required
      />

      <div className="relative">
        <FormField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          value={form.values.password}
          onChange={(value) => form.setValue('password', value)}
          error={form.touched.password ? form.errors.password : undefined}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <LoadingButton
        onClick={handleSubmit}
        loadingText={isSignUp ? 'Creating Account...' : 'Signing In...'}
        disabled={!form.isValid || isSubmitting}
        className="w-full"
      >
        {isSignUp ? 'Create Account' : 'Sign In'}
      </LoadingButton>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            clearError();
            form.reset();
          }}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {isSignUp 
            ? 'Already have an account? Sign in' 
            : "Don't have an account? Sign up"
          }
        </button>
      </div>
      {/* Help text */}
      {!isSignUp && (
        <div className="mt-8 p-4 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-800 mb-1">New to Clixen?</p>
          <p className="text-xs text-blue-600">Click "Sign up" above to create a new account.</p>
        </div>
      )}
      {isSignUp && (
        <div className="mt-8 p-4 bg-green-50 rounded-md">
          <p className="text-xs text-green-800 mb-1">Password Requirements:</p>
          <p className="text-xs text-green-600">• At least 6 characters long</p>
          <p className="text-xs text-green-600">• Mix of letters and numbers recommended</p>
        </div>
      )}
    </AuthForm>
  );
}