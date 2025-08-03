import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import OAuthManager from '../lib/oauth/OAuthManager';

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');
  const [service, setService] = useState<string>('');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        throw new Error(errorDescription || error);
      }

      if (!code || !state) {
        throw new Error('Missing authorization code or state');
      }

      setMessage('Exchanging authorization code...');

      // Handle OAuth callback
      const result = await OAuthManager.handleOAuthCallback(code, state);
      
      setService(result.service);
      setStatus('success');
      setMessage(`Successfully connected to ${result.service}!`);

      // Notify parent window if in popup
      if (window.opener) {
        window.opener.postMessage({
          type: 'oauth_complete',
          service: result.service,
          workflowContext: result.workflowContext
        }, window.location.origin);
        
        // Close popup after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        // Redirect to chat page if not in popup
        setTimeout(() => {
          navigate('/chat', {
            state: {
              oauthComplete: true,
              service: result.service,
              workflowContext: result.workflowContext
            }
          });
        }, 2000);
      }
    } catch (err) {
      console.error('OAuth callback error:', err);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Authentication failed');
      
      // Close popup or redirect after error
      setTimeout(() => {
        if (window.opener) {
          window.close();
        } else {
          navigate('/chat');
        }
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {/* Status Icon */}
          <div className="mb-6 flex justify-center">
            {status === 'processing' && (
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {status === 'processing' && 'Connecting...'}
            {status === 'success' && 'Connected!'}
            {status === 'error' && 'Connection Failed'}
          </h1>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </p>

          {/* Service Badge */}
          {service && status === 'success' && (
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {service.charAt(0).toUpperCase() + service.slice(1)}
              </span>
            </div>
          )}

          {/* Auto-close message */}
          {window.opener && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
              This window will close automatically...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;