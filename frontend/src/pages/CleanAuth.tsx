import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthForm, FormField } from '../components/ui/form-field';
import { LoadingButton } from '../components/LoadingButton';
import { useForm, CommonValidations } from '../hooks/useForm';

export default function CleanAuth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

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
    try {
      if (isSignUp) {
        await signUp(values.email, values.password);
        toast.success('Account created! Please check your email to verify.');
      } else {
        await signIn(values.email, values.password);
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
      throw error; // Re-throw to keep form in submitting state if needed
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
        disabled={!form.isValid}
        className="w-full"
      >
        {isSignUp ? 'Create Account' : 'Sign In'}
      </LoadingButton>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {isSignUp 
            ? 'Already have an account? Sign in' 
            : "Don't have an account? Sign up"
          }
        </button>
      </div>
      {/* Test credentials */}
      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <p className="text-xs text-gray-600 mb-2">Test credentials:</p>
        <p className="text-xs text-gray-500">Email: jayveedz19@gmail.com</p>
        <p className="text-xs text-gray-500">Password: Goldyear2023#</p>
      </div>
    </AuthForm>
  );
}