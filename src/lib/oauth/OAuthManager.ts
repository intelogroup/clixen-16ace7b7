import { supabase } from '../supabase';

export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  scopes?: string[];
  token_type?: string;
}

export interface OAuthService {
  name: string;
  displayName: string;
  icon?: string;
  requiredScopes: string[];
  optionalScopes?: string[];
  authUrl: string;
  tokenUrl: string;
  clientId?: string;
}

export interface PermissionCheck {
  service: string;
  hasAccess: boolean;
  currentScopes?: string[];
  requiredScopes: string[];
  missingScopes?: string[];
}

// Service configurations
const OAUTH_SERVICES: Record<string, OAuthService> = {
  google: {
    name: 'google',
    displayName: 'Google',
    icon: '🔍',
    requiredScopes: [],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID
  },
  microsoft: {
    name: 'microsoft',
    displayName: 'Microsoft',
    icon: '📊',
    requiredScopes: [],
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID
  },
  dropbox: {
    name: 'dropbox',
    displayName: 'Dropbox',
    icon: '📦',
    requiredScopes: [],
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    clientId: import.meta.env.VITE_DROPBOX_CLIENT_ID
  }
};

// Scope mappings for common services
const SCOPE_MAPPINGS: Record<string, Record<string, string[]>> = {
  google: {
    gmail_read: ['https://www.googleapis.com/auth/gmail.readonly'],
    gmail_send: ['https://www.googleapis.com/auth/gmail.send'],
    drive_read: ['https://www.googleapis.com/auth/drive.readonly'],
    drive_write: ['https://www.googleapis.com/auth/drive.file'],
    calendar_read: ['https://www.googleapis.com/auth/calendar.readonly'],
    calendar_write: ['https://www.googleapis.com/auth/calendar'],
    sheets_read: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    sheets_write: ['https://www.googleapis.com/auth/spreadsheets']
  },
  microsoft: {
    mail_read: ['Mail.Read'],
    mail_send: ['Mail.Send'],
    files_read: ['Files.Read'],
    files_write: ['Files.ReadWrite'],
    calendar_read: ['Calendars.Read'],
    calendar_write: ['Calendars.ReadWrite']
  },
  dropbox: {
    files_read: ['files.metadata.read'],
    files_write: ['files.content.write'],
    sharing: ['sharing.write']
  }
};

export class OAuthManager {
  private static instance: OAuthManager;

  private constructor() {}

  static getInstance(): OAuthManager {
    if (!OAuthManager.instance) {
      OAuthManager.instance = new OAuthManager();
    }
    return OAuthManager.instance;
  }

  /**
   * Detect required OAuth scopes from workflow description
   */
  async detectRequiredScopes(workflowDescription: string): Promise<Map<string, string[]>> {
    const requiredScopes = new Map<string, string[]>();
    const description = workflowDescription.toLowerCase();

    // Google service detection
    if (description.includes('gmail') || description.includes('email')) {
      const scopes = [];
      if (description.includes('read') || description.includes('check')) {
        scopes.push(...SCOPE_MAPPINGS.google.gmail_read);
      }
      if (description.includes('send') || description.includes('reply')) {
        scopes.push(...SCOPE_MAPPINGS.google.gmail_send);
      }
      if (scopes.length > 0) {
        requiredScopes.set('google', scopes);
      }
    }

    if (description.includes('google drive') || description.includes('gdrive')) {
      const scopes = requiredScopes.get('google') || [];
      if (description.includes('upload') || description.includes('create') || description.includes('save')) {
        scopes.push(...SCOPE_MAPPINGS.google.drive_write);
      } else {
        scopes.push(...SCOPE_MAPPINGS.google.drive_read);
      }
      requiredScopes.set('google', [...new Set(scopes)]);
    }

    if (description.includes('google sheets') || description.includes('spreadsheet')) {
      const scopes = requiredScopes.get('google') || [];
      if (description.includes('update') || description.includes('write') || description.includes('add')) {
        scopes.push(...SCOPE_MAPPINGS.google.sheets_write);
      } else {
        scopes.push(...SCOPE_MAPPINGS.google.sheets_read);
      }
      requiredScopes.set('google', [...new Set(scopes)]);
    }

    if (description.includes('calendar')) {
      const scopes = requiredScopes.get('google') || [];
      if (description.includes('create') || description.includes('schedule') || description.includes('add')) {
        scopes.push(...SCOPE_MAPPINGS.google.calendar_write);
      } else {
        scopes.push(...SCOPE_MAPPINGS.google.calendar_read);
      }
      requiredScopes.set('google', [...new Set(scopes)]);
    }

    // Microsoft service detection
    if (description.includes('outlook') || (description.includes('microsoft') && description.includes('mail'))) {
      const scopes = [];
      if (description.includes('send')) {
        scopes.push(...SCOPE_MAPPINGS.microsoft.mail_send);
      } else {
        scopes.push(...SCOPE_MAPPINGS.microsoft.mail_read);
      }
      requiredScopes.set('microsoft', scopes);
    }

    if (description.includes('onedrive')) {
      const scopes = requiredScopes.get('microsoft') || [];
      if (description.includes('upload') || description.includes('save')) {
        scopes.push(...SCOPE_MAPPINGS.microsoft.files_write);
      } else {
        scopes.push(...SCOPE_MAPPINGS.microsoft.files_read);
      }
      requiredScopes.set('microsoft', [...new Set(scopes)]);
    }

    // Dropbox detection
    if (description.includes('dropbox')) {
      const scopes = [];
      if (description.includes('share')) {
        scopes.push(...SCOPE_MAPPINGS.dropbox.sharing);
      }
      if (description.includes('upload') || description.includes('save')) {
        scopes.push(...SCOPE_MAPPINGS.dropbox.files_write);
      } else {
        scopes.push(...SCOPE_MAPPINGS.dropbox.files_read);
      }
      requiredScopes.set('dropbox', scopes);
    }

    return requiredScopes;
  }

  /**
   * Check existing permissions for a user
   */
  async checkExistingPermissions(userId: string, requiredScopes: Map<string, string[]>): Promise<PermissionCheck[]> {
    const checks: PermissionCheck[] = [];

    for (const [service, scopes] of requiredScopes.entries()) {
      try {
        const { data, error } = await supabase
          .from('user_oauth_tokens')
          .select('scopes, expires_at')
          .eq('user_id', userId)
          .eq('service', service)
          .single();

        if (error || !data) {
          // No token exists
          checks.push({
            service,
            hasAccess: false,
            requiredScopes: scopes,
            missingScopes: scopes
          });
        } else {
          // Check if token is expired
          const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
          
          if (isExpired) {
            checks.push({
              service,
              hasAccess: false,
              currentScopes: data.scopes,
              requiredScopes: scopes,
              missingScopes: scopes
            });
          } else {
            // Check if all required scopes are present
            const currentScopes = data.scopes || [];
            const missingScopes = scopes.filter(scope => !currentScopes.includes(scope));
            
            checks.push({
              service,
              hasAccess: missingScopes.length === 0,
              currentScopes,
              requiredScopes: scopes,
              missingScopes: missingScopes.length > 0 ? missingScopes : undefined
            });
          }
        }
      } catch (err) {
        console.error(`Error checking permissions for ${service}:`, err);
        checks.push({
          service,
          hasAccess: false,
          requiredScopes: scopes,
          missingScopes: scopes
        });
      }
    }

    return checks;
  }

  /**
   * Initiate OAuth flow for a service
   */
  async initiateOAuthFlow(
    userId: string, 
    service: string, 
    scopes: string[], 
    workflowContext?: any
  ): Promise<string> {
    const serviceConfig = OAUTH_SERVICES[service];
    if (!serviceConfig) {
      throw new Error(`Unknown OAuth service: ${service}`);
    }

    // Generate state token
    const stateCode = this.generateStateCode();
    
    // Store state in database
    const { error } = await supabase
      .from('oauth_flow_states')
      .insert({
        state_code: stateCode,
        user_id: userId,
        service,
        requested_scopes: scopes,
        redirect_url: `${window.location.origin}/auth/callback`,
        workflow_context: workflowContext
      });

    if (error) {
      throw new Error(`Failed to initiate OAuth flow: ${error.message}`);
    }

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: serviceConfig.clientId || '',
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: 'code',
      scope: scopes.join(' '),
      state: stateCode,
      access_type: 'offline', // For refresh tokens
      prompt: 'consent' // Force consent to get refresh token
    });

    return `${serviceConfig.authUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code: string, state: string): Promise<any> {
    // Retrieve state from database
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_flow_states')
      .select('*')
      .eq('state_code', state)
      .single();

    if (stateError || !stateData) {
      throw new Error('Invalid OAuth state');
    }

    // Check if state is expired
    if (new Date(stateData.expires_at) < new Date()) {
      throw new Error('OAuth state expired');
    }

    const serviceConfig = OAUTH_SERVICES[stateData.service];
    if (!serviceConfig) {
      throw new Error(`Unknown OAuth service: ${stateData.service}`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(serviceConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: serviceConfig.clientId || '',
        client_secret: import.meta.env[`VITE_${stateData.service.toUpperCase()}_CLIENT_SECRET`] || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: stateData.redirect_url
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();

    // Store tokens in database
    await this.storeTokens(
      stateData.user_id,
      stateData.service,
      tokens,
      stateData.requested_scopes
    );

    // Clean up state
    await supabase
      .from('oauth_flow_states')
      .delete()
      .eq('state_code', state);

    return {
      service: stateData.service,
      workflowContext: stateData.workflow_context
    };
  }

  /**
   * Store OAuth tokens
   */
  async storeTokens(
    userId: string,
    service: string,
    tokens: any,
    scopes: string[]
  ): Promise<void> {
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error } = await supabase
      .from('user_oauth_tokens')
      .upsert({
        user_id: userId,
        service,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_at: expiresAt,
        scopes,
        metadata: {
          scope: tokens.scope,
          token_type: tokens.token_type
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,service'
      });

    if (error) {
      throw new Error(`Failed to store tokens: ${error.message}`);
    }
  }

  /**
   * Get valid token for a service
   */
  async getValidToken(userId: string, service: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('user_oauth_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .eq('service', service)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if token needs refresh
    if (data.expires_at && new Date(data.expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
      // Token expires in less than 5 minutes, refresh it
      if (data.refresh_token) {
        return await this.refreshToken(userId, service, data.refresh_token);
      }
    }

    return data.access_token;
  }

  /**
   * Refresh OAuth token
   */
  private async refreshToken(userId: string, service: string, refreshToken: string): Promise<string> {
    const serviceConfig = OAUTH_SERVICES[service];
    if (!serviceConfig) {
      throw new Error(`Unknown OAuth service: ${service}`);
    }

    const response = await fetch(serviceConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: serviceConfig.clientId || '',
        client_secret: import.meta.env[`VITE_${service.toUpperCase()}_CLIENT_SECRET`] || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokens = await response.json();

    // Update tokens in database
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await supabase
      .from('user_oauth_tokens')
      .update({
        access_token: tokens.access_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('service', service);

    return tokens.access_token;
  }

  /**
   * Revoke OAuth access
   */
  async revokeAccess(userId: string, service: string): Promise<void> {
    const { error } = await supabase
      .from('user_oauth_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('service', service);

    if (error) {
      throw new Error(`Failed to revoke access: ${error.message}`);
    }
  }

  /**
   * Generate secure state code
   */
  private generateStateCode(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

export default OAuthManager.getInstance();