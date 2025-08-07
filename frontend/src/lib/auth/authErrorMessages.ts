import { AuthError } from '@supabase/supabase-js';

export interface AuthErrorInfo {
  title: string;
  message: string;
  action?: string;
  severity: 'error' | 'warning' | 'info';
}

export const getAuthErrorInfo = (error: AuthError | Error | any): AuthErrorInfo => {
  const errorMessage = error?.message || error?.error_description || 'Unknown error';
  const errorCode = error?.error || error?.code;

  // Supabase specific error codes
  switch (errorCode) {
    case 'email_not_confirmed':
      return {
        title: 'Email Not Verified',
        message: 'Please check your email and click the verification link before signing in.',
        action: 'Check your email inbox and spam folder',
        severity: 'warning'
      };

    case 'invalid_credentials':
      return {
        title: 'Invalid Credentials',
        message: 'The email or password you entered is incorrect. Please try again.',
        action: 'Double-check your email and password',
        severity: 'error'
      };

    case 'email_address_invalid':
      return {
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        action: 'Check the email format (example@domain.com)',
        severity: 'error'
      };

    case 'signup_disabled':
      return {
        title: 'Sign Up Disabled',
        message: 'New account creation is temporarily disabled.',
        action: 'Try signing in if you already have an account',
        severity: 'warning'
      };

    case 'email_address_not_authorized':
      return {
        title: 'Email Not Authorized',
        message: 'This email address is not authorized to create an account.',
        action: 'Contact support if you believe this is an error',
        severity: 'error'
      };

    case 'too_many_requests':
      return {
        title: 'Too Many Attempts',
        message: 'Too many requests. Please wait a moment before trying again.',
        action: 'Wait 60 seconds and try again',
        severity: 'warning'
      };

    case 'weak_password':
      return {
        title: 'Weak Password',
        message: 'Your password is too weak. Please choose a stronger password.',
        action: 'Use at least 8 characters with uppercase, lowercase, numbers, and symbols',
        severity: 'error'
      };

    case 'password_too_short':
      return {
        title: 'Password Too Short',
        message: 'Password must be at least 6 characters long.',
        action: 'Choose a longer password',
        severity: 'error'
      };

    case 'user_already_registered':
      return {
        title: 'Account Already Exists',
        message: 'An account with this email already exists.',
        action: 'Try signing in instead, or use password reset if needed',
        severity: 'info'
      };

    default:
      break;
  }

  // Check error message patterns for more specific handling
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes('email') && lowerMessage.includes('already') && lowerMessage.includes('registered')) {
    return {
      title: 'Account Already Exists',
      message: 'An account with this email already exists.',
      action: 'Try signing in instead, or use password reset if needed',
      severity: 'info'
    };
  }

  if (lowerMessage.includes('password') && (lowerMessage.includes('invalid') || lowerMessage.includes('wrong'))) {
    return {
      title: 'Incorrect Password',
      message: 'The password you entered is incorrect.',
      action: 'Try again or reset your password if you forgot it',
      severity: 'error'
    };
  }

  if (lowerMessage.includes('email') && lowerMessage.includes('invalid')) {
    return {
      title: 'Invalid Email',
      message: 'Please enter a valid email address.',
      action: 'Check the email format (example@domain.com)',
      severity: 'error'
    };
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      action: 'Check your internet connection and try again',
      severity: 'warning'
    };
  }

  if (lowerMessage.includes('timeout')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long. Please try again.',
      action: 'Check your connection and try again',
      severity: 'warning'
    };
  }

  if (lowerMessage.includes('rate') && lowerMessage.includes('limit')) {
    return {
      title: 'Too Many Attempts',
      message: 'You\'ve made too many requests. Please wait before trying again.',
      action: 'Wait a few minutes and try again',
      severity: 'warning'
    };
  }

  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      action: 'Check your credentials and try again',
      severity: 'error'
    };
  }

  // Generic fallback
  return {
    title: 'Authentication Error',
    message: errorMessage || 'Something went wrong during authentication.',
    action: 'Please try again or contact support if the problem persists',
    severity: 'error'
  };
};

export const formatAuthError = (error: AuthError | Error | any): string => {
  const info = getAuthErrorInfo(error);
  let message = info.message;
  
  if (info.action) {
    message += ` ${info.action}`;
  }
  
  return message;
};

export const getAuthErrorSeverity = (error: AuthError | Error | any): 'error' | 'warning' | 'info' => {
  return getAuthErrorInfo(error).severity;
};