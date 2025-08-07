-- CRITICAL SECURITY FIXES

-- Fix 1: Add missing RLS policies for analytics tables
ALTER TABLE ai_chat_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_errors ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for ai_chat_analytics (service role only for system analytics)
CREATE POLICY "Service role can access analytics" ON ai_chat_analytics
FOR ALL USING (auth.role() = 'service_role');

-- Add RLS policies for api_usage_analytics (users can view their own analytics) 
CREATE POLICY "Users can view their own API usage analytics" ON api_usage_analytics
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage API usage analytics" ON api_usage_analytics
FOR ALL USING (auth.role() = 'service_role');

-- Add RLS policies for queue_errors (service role only for system errors)
CREATE POLICY "Service role can access queue errors" ON queue_errors
FOR ALL USING (auth.role() = 'service_role');

-- Fix 2: Add search_path protection to remaining functions without it
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_plan text;
  limits jsonb;
BEGIN
  -- Get user's plan
  SELECT plan_type INTO user_plan
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get plan limits
  SELECT jsonb_build_object(
    'plan_type', plan_type,
    'max_workflows', max_workflows,
    'max_executions', max_executions,
    'max_credentials', max_credentials,
    'features', features
  ) INTO limits
  FROM plan_limits
  WHERE plan_type = COALESCE(user_plan, 'free');
  
  RETURN limits;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_user_workflow_count(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles 
  SET workflow_count = workflow_count + 1 
  WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_user_execution_count(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles 
  SET execution_count = execution_count + 1 
  WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_user_execution_count(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles 
  SET 
    execution_count = 0,
    last_execution_reset = now()
  WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_workflow_analytics()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Update daily analytics when an execution is completed
    IF (NEW.status IN ('success', 'error') AND NEW.stopped_at IS NOT NULL) THEN
        INSERT INTO workflow_analytics (
            workflow_id,
            workflow_name,
            date,
            total_executions,
            successful_executions,
            failed_executions,
            avg_duration,
            min_duration,
            max_duration,
            total_duration,
            success_rate
        ) VALUES (
            NEW.workflow_id,
            NEW.workflow_name,
            DATE(NEW.started_at),
            1,
            CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'error' THEN 1 ELSE 0 END,
            COALESCE(NEW.duration, 0),
            COALESCE(NEW.duration, 0),
            COALESCE(NEW.duration, 0),
            COALESCE(NEW.duration, 0),
            CASE WHEN NEW.status = 'success' THEN 100.0 ELSE 0.0 END
        )
        ON CONFLICT (workflow_id, date) DO UPDATE SET
            total_executions = workflow_analytics.total_executions + 1,
            successful_executions = workflow_analytics.successful_executions + 
                CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END,
            failed_executions = workflow_analytics.failed_executions + 
                CASE WHEN NEW.status = 'error' THEN 1 ELSE 0 END,
            total_duration = workflow_analytics.total_duration + COALESCE(NEW.duration, 0),
            avg_duration = (workflow_analytics.total_duration + COALESCE(NEW.duration, 0)) / 
                (workflow_analytics.total_executions + 1),
            min_duration = LEAST(workflow_analytics.min_duration, COALESCE(NEW.duration, 0)),
            max_duration = GREATEST(workflow_analytics.max_duration, COALESCE(NEW.duration, 0)),
            success_rate = ((workflow_analytics.successful_executions + 
                CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END) * 100.0) / 
                (workflow_analytics.total_executions + 1),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$function$;