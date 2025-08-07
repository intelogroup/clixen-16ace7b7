import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getErrorMessage } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import toast from 'react-hot-toast';

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
            // User is confirmed, navigate to dashboard
            toast.success('Account created successfully! Welcome to Clixen.');
            navigate('/dashboard', { replace: true });
          } else {
            // User needs to confirm email
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
          // Navigation will happen automatically via AuthContext
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
  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  // Check if form is valid
  const isFormValid = formData.email && formData.password && (!isSignUp || formData.fullName);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
        borderRadius: '50%',
        animation: 'float 6s ease-in-out infinite'
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite reverse'
      }} />

      {/* Floating UI elements */}
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '15%',
        width: '60px',
        height: '60px',
        background: 'rgba(139, 92, 246, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        animation: 'float 4s ease-in-out infinite'
      }}>
        ✨
      </div>

      <div style={{
        position: 'absolute',
        bottom: '30%',
        left: '15%',
        width: '50px',
        height: '50px',
        background: 'rgba(59, 130, 246, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        animation: 'float 5s ease-in-out infinite'
      }}>
        🤖
      </div>

      {/* Main auth container */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '450px',
        width: '100%',
        color: 'white',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '32px',
            boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)'
          }}>
            ⚡
          </div>
          
          <h1 style={{
            fontSize: '32px',
            margin: '0 0 10px',
            background: 'linear-gradient(135deg, #fff, #f0f0f0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {isSignUp ? 'Join Clixen' : 'Welcome Back'}
          </h1>
          
          <p style={{ color: '#a0a0a0', margin: '0' }}>
            {isSignUp 
              ? 'Start building AI-powered workflows'
              : 'Sign in to your workspace'
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Full Name (Sign Up Only) */}
          {isSignUp && (
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#a0a0a0',
                fontSize: '18px'
              }}>
                👤
              </div>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Full name"
                required={isSignUp}
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 50px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                  e.target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          )}

          {/* Email */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#a0a0a0',
              fontSize: '18px'
            }}>
              📧
            </div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email address"
              required
              style={{
                width: '100%',
                padding: '16px 16px 16px 50px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#a0a0a0',
              fontSize: '18px'
            }}>
              🔒
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={isSignUp ? "Create a strong password" : "Password"}
              required
              minLength={isSignUp ? 8 : undefined}
              style={{
                width: '100%',
                padding: '16px 50px 16px 50px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#a0a0a0',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {/* Password Strength (Sign Up Only) */}
          {isSignUp && formData.password && (
            <div style={{ margin: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                <span style={{ color: '#a0a0a0' }}>Password strength</span>
                <span style={{ color: strengthColors[passwordStrength] || '#ef4444' }}>
                  {strengthLabels[passwordStrength] || 'Weak'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    style={{
                      height: '4px',
                      flex: 1,
                      borderRadius: '2px',
                      background: index < passwordStrength ? strengthColors[passwordStrength] : 'rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.3s ease'
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
            style={{
              width: '100%',
              padding: '16px',
              background: loading || !isFormValid 
                ? 'rgba(107, 114, 128, 0.5)' 
                : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading || !isFormValid ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!loading && isFormValid) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              <>
                {isSignUp ? 'Create Account' : 'Sign In'}
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <p style={{ color: '#a0a0a0', margin: '0 0 10px' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </p>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b5cf6',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </div>

        {/* Features (Sign Up Only) */}
        {isSignUp && (
          <div style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '15px', textAlign: 'center' }}>
              ⭐ What you get with Clixen
            </h3>
            <div style={{ display: 'grid', gap: '10px', fontSize: '12px' }}>
              {[
                { icon: '🤖', text: 'AI-powered workflow automation' },
                { icon: '🪄', text: 'Natural language workflow creation' },
                { icon: '🛡️', text: 'Enterprise-grade security' },
                { icon: '🚀', text: 'Deploy to n8n instantly' }
              ].map((feature, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#e0e0e0'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: 'rgba(139, 92, 246, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>
                    {feature.icon}
                  </div>
                  {feature.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
