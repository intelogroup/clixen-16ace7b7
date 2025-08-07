import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getErrorMessage } from '../lib/supabase';
import { Button, Input } from '../components/ui';
import { useAuth } from '../lib/AuthContext';
import { Zap, CheckCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StandardAuth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName || null
            }
          }
        });

        if (error) throw error;

        // Create user profile
        if (data.user) {
          try {
            await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                email: formData.email,
                full_name: formData.fullName || null,
                plan_type: 'free',
                workflow_count: 0,
                execution_count: 0
              });
          } catch (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't fail the signup if profile creation fails
          }
        }

        setSuccess('Account created! Please check your email to confirm your account.');
        toast.success('Account created successfully!');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (error) throw error;

        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccess(null);
    setFormData({ email: '', password: '', fullName: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-gray-600">
            {isSignUp 
              ? 'Start building AI-powered workflows'
              : 'Sign in to your account'
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Full Name Input (Sign Up Only) */}
          {isSignUp && (
            <Input
              label="Full Name"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              disabled={loading}
            />
          )}

          {/* Email Input */}
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            disabled={loading}
            required
          />

          {/* Password Input */}
          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
            disabled={loading}
            required
          />

          {/* Password Requirements (Sign Up Only) */}
          {isSignUp && formData.password && (
            <div className="text-xs text-gray-600 space-y-1">
              <div className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle size={12} />
                At least 8 characters
              </div>
              <div className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle size={12} />
                One uppercase letter
              </div>
              <div className={`flex items-center gap-2 ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle size={12} />
                One number
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={loading}
            disabled={loading || !formData.email || !formData.password || (isSignUp && formData.password.length < 8)}
            rightIcon={!loading ? <ArrowRight size={16} /> : undefined}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={toggleMode}
              className="text-purple-600 hover:text-purple-500 font-medium"
              disabled={loading}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
