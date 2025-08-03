import React, { useState, useEffect } from 'react';
import { X, Shield, CheckCircle, AlertCircle, ExternalLink, Key, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OAuthManager, { PermissionCheck } from '../lib/oauth/OAuthManager';
import CentralizedAPIManager, { APIConfig } from '../lib/api/CentralizedAPIManager';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  requiredPermissions: PermissionCheck[];
  centralizedAPIs?: string[];
  workflowDescription?: string;
  onPermissionsGranted: () => void;
}

const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  userId,
  requiredPermissions,
  centralizedAPIs = [],
  workflowDescription,
  onPermissionsGranted
}) => {
  const [grantingService, setGrantingService] = useState<string | null>(null);
  const [grantedServices, setGrantedServices] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [availableCentralAPIs, setAvailableCentralAPIs] = useState<APIConfig[]>([]);

  useEffect(() => {
    // Check which centralized APIs are available
    const apis = CentralizedAPIManager.getAvailableAPIs();
    setAvailableCentralAPIs(apis.filter(api => centralizedAPIs.includes(api.name)));
  }, [centralizedAPIs]);

  const handleGrantAccess = async (service: string, scopes: string[]) => {
    try {
      setGrantingService(service);
      setError(null);

      // Generate OAuth URL and redirect
      const authUrl = await OAuthManager.initiateOAuthFlow(
        userId,
        service,
        scopes,
        { workflowDescription }
      );

      // Open OAuth window
      const authWindow = window.open(authUrl, 'oauth', 'width=600,height=700');
      
      // Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'oauth_complete' && event.data.service === service) {
          setGrantedServices(prev => new Set([...prev, service]));
          setGrantingService(null);
          
          // Check if all permissions are granted
          if (grantedServices.size + 1 === requiredPermissions.length) {
            onPermissionsGranted();
          }
          
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Check if window was closed without completing OAuth
      const checkWindow = setInterval(() => {
        if (authWindow && authWindow.closed) {
          clearInterval(checkWindow);
          setGrantingService(null);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);
    } catch (err) {
      console.error('Error granting access:', err);
      setError(err instanceof Error ? err.message : 'Failed to grant access');
      setGrantingService(null);
    }
  };

  const getServiceIcon = (service: string) => {
    const icons: Record<string, string> = {
      google: '🔍',
      microsoft: '📊',
      dropbox: '📦',
      github: '🐙',
      slack: '💼',
      notion: '📝'
    };
    return icons[service] || '🔗';
  };

  const getScopeDescription = (service: string, scopes: string[]) => {
    const descriptions: Record<string, Record<string, string>> = {
      google: {
        'https://www.googleapis.com/auth/gmail.readonly': 'Read your emails',
        'https://www.googleapis.com/auth/gmail.send': 'Send emails on your behalf',
        'https://www.googleapis.com/auth/drive.readonly': 'View files in your Google Drive',
        'https://www.googleapis.com/auth/drive.file': 'Create and modify files in Google Drive',
        'https://www.googleapis.com/auth/calendar.readonly': 'View your calendar events',
        'https://www.googleapis.com/auth/calendar': 'Create and modify calendar events',
        'https://www.googleapis.com/auth/spreadsheets.readonly': 'View your Google Sheets',
        'https://www.googleapis.com/auth/spreadsheets': 'Edit your Google Sheets'
      },
      microsoft: {
        'Mail.Read': 'Read your emails',
        'Mail.Send': 'Send emails on your behalf',
        'Files.Read': 'View your OneDrive files',
        'Files.ReadWrite': 'Create and modify OneDrive files',
        'Calendars.Read': 'View your calendar',
        'Calendars.ReadWrite': 'Create and modify calendar events'
      },
      dropbox: {
        'files.metadata.read': 'View your Dropbox files',
        'files.content.write': 'Upload and modify files',
        'sharing.write': 'Share files and folders'
      }
    };

    const serviceDescriptions = descriptions[service] || {};
    return scopes.map(scope => serviceDescriptions[scope] || scope).join(', ');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="w-6 h-6 text-blue-500" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Additional Permissions Required
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {workflowDescription && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Your workflow:</strong> {workflowDescription}
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* OAuth Permissions */}
              {requiredPermissions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Service Permissions
                  </h3>
                  <div className="space-y-4">
                    {requiredPermissions.map((permission) => (
                      <div
                        key={permission.service}
                        className={`border rounded-lg p-4 transition-all ${
                          grantedServices.has(permission.service)
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-2xl">{getServiceIcon(permission.service)}</span>
                              <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                                {permission.service}
                              </h4>
                              {grantedServices.has(permission.service) && (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              This workflow needs to: {getScopeDescription(permission.service, permission.requiredScopes)}
                            </p>
                            {permission.missingScopes && permission.missingScopes.length > 0 && (
                              <div className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                                Missing permissions: {permission.missingScopes.length} scope(s)
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            {!grantedServices.has(permission.service) && (
                              <button
                                onClick={() => handleGrantAccess(permission.service, permission.requiredScopes)}
                                disabled={grantingService !== null}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                  grantingService === permission.service
                                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                              >
                                {grantingService === permission.service ? (
                                  <span className="flex items-center space-x-2">
                                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                                    <span>Connecting...</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center space-x-2">
                                    <ExternalLink className="w-4 h-4" />
                                    <span>Grant Access</span>
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Centralized APIs */}
              {availableCentralAPIs.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Platform Services
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="flex items-start space-x-3 mb-3">
                      <Cloud className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          The following services are provided by our platform and don't require additional authentication:
                        </p>
                        <div className="space-y-2">
                          {availableCentralAPIs.map((api) => (
                            <div key={api.name} className="flex items-center space-x-3">
                              <span className="text-xl">{api.icon}</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {api.displayName}
                              </span>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Note */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Key className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <strong>Your security is our priority:</strong> We only request the minimum permissions needed for your workflow. 
                      Tokens are encrypted and stored securely. You can revoke access at any time from your account settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {grantedServices.size} of {requiredPermissions.length} permissions granted
                </p>
                <div className="space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  {grantedServices.size === requiredPermissions.length && (
                    <button
                      onClick={onPermissionsGranted}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      Continue with Workflow
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PermissionModal;