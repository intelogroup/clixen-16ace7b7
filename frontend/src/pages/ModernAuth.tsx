import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle, AlertCircle } from 'lucide-react';

export default function ModernAuth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      if (isSignUp) {
        // Sign up with Supabase
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              display_name: formData.fullName
            }
          }
        });

        if (error) {
          console.error('Sign up error:', error);
          toast.error(getErrorMessage(error));
          return;
        }

        if (data.user) {
          if (data.user.email_confirmed_at) {
            toast.success('Account created successfully! Welcome to Clixen.');
            navigate('/dashboard', { replace: true });
          } else {
            toast.success('Account created! Please check your email for a confirmation link.');
          }
        }
      } else {
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          console.error('Sign in error:', error);
          toast.error(getErrorMessage(error));
          return;
        }

        if (data.user) {
          toast.success('Welcome back! Redirecting to your dashboard...');
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e'];

  // Check if form is valid
  const isFormValid = formData.email && formData.password && (!isSignUp || formData.fullName);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl text-white font-bold">C</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          
          <p className="text-gray-600">
            {isSignUp 
              ? 'Start building AI-powered workflows'
              : 'Sign in to your workspace'
            }
          </p>
        </div>

        {/* Form Card */}
        <div className="clean-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name (Sign Up Only) */}
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required={isSignUp}
                    className="input-clean pl-10"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className="input-clean pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
                  required
                  minLength={isSignUp ? 8 : undefined}
                  className="input-clean pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Password Strength (Sign Up Only) */}
            {isSignUp && formData.password && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Password strength</span>
                  <span style={{ color: strengthColors[passwordStrength] || '#ef4444' }}>
                    {strengthLabels[passwordStrength] || 'Weak'}
                  </span>
                </div>
                <div className="flex space-x-1">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className="h-2 flex-1 rounded-full transition-colors duration-300"
                      style={{
                        backgroundColor: index < passwordStrength ? strengthColors[passwordStrength] : '#e5e7eb'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`btn-clean btn-primary w-full ${
                loading || !isFormValid ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="spinner-clean mr-2" />
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                disabled={loading}
                className={`ml-1 text-blue-500 hover:text-blue-600 font-medium ${
                  loading ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>

        {/* Features (Sign Up Only) */}
        {isSignUp && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              What you get with Clixen
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { icon: '🤖', title: 'AI-powered automation', desc: 'Create workflows with natural language' },
                { icon: '🔗', title: 'Connect services', desc: 'Integrate with your favorite tools' },
                { icon: '⚡', title: 'Deploy instantly', desc: 'Deploy to n8n with one click' },
                { icon: '🛡️', title: 'Secure & reliable', desc: 'Enterprise-grade security' }
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-100">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-lg">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">{feature.title}</h4>
                    <p className="text-gray-600 text-xs">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            By signing in, you agree to our{' '}
            <a href="#" className="text-blue-500 hover:text-blue-600">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-blue-500 hover:text-blue-600">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
