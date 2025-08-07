import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getErrorMessage } from '../lib/supabase';
import { Button, Input } from '../components/ui';

export default function StandardAuth() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password
        });
        
        if (error) throw error;
        
        alert('Check your email to confirm your account!');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        
        if (error) throw error;
        
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
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
    setFormData({ email: '', password: '' });
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
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
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
            placeholder="Enter your password"
            disabled={loading}
            required
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={loading}
            disabled={loading || !formData.email || !formData.password}
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
