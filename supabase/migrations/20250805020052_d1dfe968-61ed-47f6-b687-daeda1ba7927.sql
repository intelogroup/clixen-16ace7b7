-- SECURITY FIX: Add search_path protection to all remaining functions
CREATE OR REPLACE FUNCTION public.update_rate_limits(p_user_id uuid, p_request_type text DEFAULT 'chat'::text, p_cost_cents integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO ai_chat_rate_limits (
        user_id, request_type, 
        requests_this_minute, requests_this_hour, requests_this_day,
        cost_this_day_cents
    ) VALUES (
        p_user_id, p_request_type, 1, 1, 1, p_cost_cents
    )
    ON CONFLICT (user_id, request_type)
    DO UPDATE SET
        requests_this_minute = ai_chat_rate_limits.requests_this_minute + 1,
        requests_this_hour = ai_chat_rate_limits.requests_this_hour + 1,
        requests_this_day = ai_chat_rate_limits.requests_this_day + 1,
        cost_this_day_cents = ai_chat_rate_limits.cost_this_day_cents + p_cost_cents,
        updated_at = NOW();
END;
$function$;

-- Fix remaining functions with search_path
CREATE OR REPLACE FUNCTION public.create_chat_session(p_user_id uuid, p_title text DEFAULT 'New AI Chat Session'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO ai_chat_sessions (user_id, title)
    VALUES (p_user_id, p_title)
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_user_message(p_user_id uuid, p_session_id uuid, p_content text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_message_id UUID;
BEGIN
    INSERT INTO ai_chat_messages (session_id, user_id, role, content)
    VALUES (p_session_id, p_user_id, 'user', p_content)
    RETURNING id INTO v_message_id;
    
    -- Update session timestamp
    UPDATE ai_chat_sessions
    SET updated_at = NOW()
    WHERE id = p_session_id AND user_id = p_user_id;
    
    RETURN v_message_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_chat_history(p_user_id uuid, p_session_id uuid, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_messages JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'role', role,
            'content', content,
            'created_at', created_at,
            'agent_type', agent_type,
            'agent_status', agent_status,
            'token_count', token_count,
            'cost_cents', cost_cents
        ) ORDER BY created_at ASC
    ) INTO v_messages
    FROM (
        SELECT *
        FROM ai_chat_messages
        WHERE session_id = p_session_id AND user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT p_limit
    ) recent_messages;
    
    RETURN COALESCE(v_messages, '[]'::jsonb);
END;
$function$;

-- Enable RLS on missing tables
ALTER TABLE api_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_audit_log ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for security
CREATE POLICY "Service role only can access api_configurations" ON api_configurations
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their audit logs" ON oauth_audit_log
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs" ON oauth_audit_log
FOR INSERT WITH CHECK (true);