import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import {
  getUserSessions,
  createNewSession,
  updateSessionTitle,
  archiveSession,
  deleteSession,
  getSessionDetails
} from '../ai-chat-system/session-manager.ts';

// Session management endpoints for AI chat system
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    // Extract user_id from Authorization header or request body
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    // Try to get user_id from request body for POST requests
    let requestBody: any = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        requestBody = await req.json();
        userId = requestBody.user_id;
      } catch (e) {
        // Body parsing failed, continue without it
      }
    }
    
    // Try to get user_id from query params for GET requests
    if (!userId && req.method === 'GET') {
      userId = url.searchParams.get('user_id');
    }
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Route handlers
    switch (req.method) {
      case 'GET':
        if (path === 'list' || path === 'ai-chat-sessions') {
          // Get all sessions for user
          const sessions = await getUserSessions(userId);
          return new Response(
            JSON.stringify({ sessions }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } else {
          // Get specific session details
          const sessionId = url.searchParams.get('session_id');
          if (!sessionId) {
            return new Response(
              JSON.stringify({ error: 'Session ID is required' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          const session = await getSessionDetails(sessionId, userId);
          if (!session) {
            return new Response(
              JSON.stringify({ error: 'Session not found' }),
              { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          return new Response(
            JSON.stringify({ session }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

      case 'POST':
        if (path === 'create' || path === 'ai-chat-sessions') {
          // Create new session
          const { first_message, title } = requestBody;
          const session = await createNewSession(userId, first_message || title);
          
          if (!session) {
            return new Response(
              JSON.stringify({ error: 'Failed to create session' }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          return new Response(
            JSON.stringify({ session }),
            { 
              status: 201, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        break;

      case 'PUT':
        if (path === 'update-title') {
          // Update session title
          const { session_id, title } = requestBody;
          
          if (!session_id || !title) {
            return new Response(
              JSON.stringify({ error: 'Session ID and title are required' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          const success = await updateSessionTitle(session_id, userId, title);
          
          return new Response(
            JSON.stringify({ success }),
            { 
              status: success ? 200 : 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } else if (path === 'archive') {
          // Archive session
          const { session_id } = requestBody;
          
          if (!session_id) {
            return new Response(
              JSON.stringify({ error: 'Session ID is required' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          const success = await archiveSession(session_id, userId);
          
          return new Response(
            JSON.stringify({ success }),
            { 
              status: success ? 200 : 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        break;

      case 'DELETE':
        // Delete session
        const sessionId = url.searchParams.get('session_id') || requestBody.session_id;
        
        if (!sessionId) {
          return new Response(
            JSON.stringify({ error: 'Session ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        const success = await deleteSession(sessionId, userId);
        
        return new Response(
          JSON.stringify({ success }),
          { 
            status: success ? 200 : 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { 
            status: 405, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    // Fallback for unmatched routes
    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Session management error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});