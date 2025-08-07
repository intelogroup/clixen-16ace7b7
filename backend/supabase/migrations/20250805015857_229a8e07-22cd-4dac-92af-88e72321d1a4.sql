-- SECURITY FIX: Remove hardcoded OpenAI API key and secure the function
CREATE OR REPLACE FUNCTION public.call_openai_api(p_user_id uuid, p_session_id uuid, p_messages jsonb, p_model text DEFAULT 'gpt-4'::text, p_max_tokens integer DEFAULT 4000, p_temperature numeric DEFAULT 0.7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_config RECORD;
    v_api_key TEXT;
    v_request_body JSONB;
    v_response JSONB;
    v_http_response RECORD;
    v_usage JSONB;
    v_content TEXT;
    v_total_tokens INTEGER;
    v_cost_cents INTEGER;
    v_processing_start TIMESTAMPTZ;
    v_processing_time_ms INTEGER;
BEGIN
    v_processing_start := NOW();
    
    -- Get OpenAI configuration
    SELECT * INTO v_config 
    FROM ai_chat_config 
    WHERE (user_id = p_user_id OR config_type = 'global')
    ORDER BY user_id NULLS LAST
    LIMIT 1;
    
    IF v_config IS NULL THEN
        RAISE EXCEPTION 'No OpenAI configuration found';
    END IF;
    
    -- SECURITY FIX: Retrieve API key from Supabase secrets instead of hardcoding
    -- This will be handled by the edge function calling this function
    -- For now, return error if no API key is provided externally
    RAISE EXCEPTION 'OpenAI API calls must be made through secure edge functions';
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return structured error response
        INSERT INTO ai_chat_messages (
            session_id, user_id, role, content, model,
            agent_type, agent_status, metadata
        ) VALUES (
            p_session_id, p_user_id, 'system', 
            'Error: ' || SQLERRM, p_model,
            'error_handler', 'error',
            jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE)
        );
        
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'success', false,
            'processing_time_ms', EXTRACT(EPOCH FROM (NOW() - v_processing_start)) * 1000
        );
END;
$function$;

-- SECURITY FIX: Add search_path protection to other critical functions
CREATE OR REPLACE FUNCTION public.check_rate_limits(p_user_id uuid, p_request_type text DEFAULT 'chat'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_limits RECORD;
    v_config RECORD;
BEGIN
    -- Get current rate limit status
    SELECT * INTO v_limits
    FROM ai_chat_rate_limits
    WHERE user_id = p_user_id AND request_type = p_request_type;
    
    -- Get rate limit configuration
    SELECT * INTO v_config
    FROM ai_chat_config
    WHERE (user_id = p_user_id OR config_type = 'global')
    ORDER BY user_id NULLS LAST
    LIMIT 1;
    
    IF v_config IS NULL THEN
        RAISE EXCEPTION 'No configuration found for rate limiting';
    END IF;
    
    -- Initialize if not exists
    IF v_limits IS NULL THEN
        INSERT INTO ai_chat_rate_limits (user_id, request_type)
        VALUES (p_user_id, p_request_type);
        RETURN true;
    END IF;
    
    -- Check minute limit
    IF v_limits.minute_window < DATE_TRUNC('minute', NOW()) THEN
        -- Reset minute counter
        UPDATE ai_chat_rate_limits
        SET minute_window = DATE_TRUNC('minute', NOW()),
            requests_this_minute = 0
        WHERE user_id = p_user_id AND request_type = p_request_type;
    ELSIF v_limits.requests_this_minute >= v_config.requests_per_minute THEN
        RAISE EXCEPTION 'Rate limit exceeded: % requests per minute', v_config.requests_per_minute;
    END IF;
    
    -- Check hour limit
    IF v_limits.hour_window < DATE_TRUNC('hour', NOW()) THEN
        UPDATE ai_chat_rate_limits
        SET hour_window = DATE_TRUNC('hour', NOW()),
            requests_this_hour = 0
        WHERE user_id = p_user_id AND request_type = p_request_type;
    ELSIF v_limits.requests_this_hour >= v_config.requests_per_hour THEN
        RAISE EXCEPTION 'Rate limit exceeded: % requests per hour', v_config.requests_per_hour;
    END IF;
    
    -- Check daily cost limit
    IF v_limits.day_window < DATE_TRUNC('day', NOW()) THEN
        UPDATE ai_chat_rate_limits
        SET day_window = DATE_TRUNC('day', NOW()),
            requests_this_day = 0,
            cost_this_day_cents = 0
        WHERE user_id = p_user_id AND request_type = p_request_type;
    ELSIF v_limits.cost_this_day_cents >= v_config.daily_cost_limit_cents THEN
        RAISE EXCEPTION 'Daily cost limit exceeded: $%.2f', v_config.daily_cost_limit_cents::decimal / 100;
    END IF;
    
    RETURN true;
END;
$function$;