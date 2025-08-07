-- ============================================================================
-- Clixen MVP Audit Logging System
-- ============================================================================
-- Comprehensive audit logging for all critical operations
-- Author: Database Architect Agent
-- Date: 2025-01-08
-- Version: MVP 1.0

-- ============================================================================
-- AUDIT TABLES
-- ============================================================================

-- General audit log for all table changes
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  
  -- Change tracking
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  
  -- Context
  client_ip INET,
  user_agent TEXT,
  source TEXT DEFAULT 'app', -- 'app', 'api', 'admin', 'system'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security events audit
CREATE TABLE IF NOT EXISTS security_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'failed_login', 'permission_denied', etc.
  severity TEXT DEFAULT 'info' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Event details
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API usage audit (for rate limiting and monitoring)
CREATE TABLE IF NOT EXISTS api_usage_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- API call details
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  
  -- Request details
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  
  -- Rate limiting
  rate_limit_key TEXT,
  rate_limit_remaining INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT INDEXES
-- ============================================================================

CREATE INDEX idx_audit_log_table_name ON audit_log(table_name, created_at DESC);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_log_record_id ON audit_log(record_id, table_name);
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

CREATE INDEX idx_security_audit_user_id ON security_audit(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_security_audit_event_type ON security_audit(event_type, created_at DESC);
CREATE INDEX idx_security_audit_severity ON security_audit(severity, created_at DESC);

CREATE INDEX idx_api_usage_audit_user_id ON api_usage_audit(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_api_usage_audit_endpoint ON api_usage_audit(endpoint, created_at DESC);
CREATE INDEX idx_api_usage_audit_status_code ON api_usage_audit(status_code, created_at DESC);

-- ============================================================================
-- AUDIT TRIGGER FUNCTIONS
-- ============================================================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[] := ARRAY[]::TEXT[];
  field_name TEXT;
BEGIN
  -- Skip if this is the audit table itself
  IF TG_TABLE_NAME IN ('audit_log', 'security_audit', 'api_usage_audit', 'telemetry_events') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Build old and new data
  IF TG_OP = 'DELETE' THEN
    old_data = to_jsonb(OLD);
    new_data = NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_data = NULL;
    new_data = to_jsonb(NEW);
  ELSE -- UPDATE
    old_data = to_jsonb(OLD);
    new_data = to_jsonb(NEW);
    
    -- Find changed fields
    FOR field_name IN SELECT jsonb_object_keys(new_data) LOOP
      IF old_data->field_name IS DISTINCT FROM new_data->field_name THEN
        changed_fields := changed_fields || field_name;
      END IF;
    END LOOP;
  END IF;
  
  -- Insert audit record
  INSERT INTO audit_log (
    table_name, record_id, user_id, action, 
    old_values, new_values, changed_fields
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id, auth.uid()),
    TG_OP,
    old_data,
    new_data,
    changed_fields
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Security event logging function
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_severity TEXT DEFAULT 'info',
  p_description TEXT DEFAULT '',
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_audit (
    user_id, event_type, severity, description, details,
    ip_address, user_agent, session_id
  ) VALUES (
    p_user_id, p_event_type, p_severity, p_description, p_details,
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent',
    current_setting('request.jwt.claims', true)::jsonb->>'session_id'
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- API usage logging function
CREATE OR REPLACE FUNCTION log_api_usage(
  p_user_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_request_size_bytes INTEGER DEFAULT NULL,
  p_response_size_bytes INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usage_id UUID;
BEGIN
  INSERT INTO api_usage_audit (
    user_id, endpoint, method, status_code,
    response_time_ms, request_size_bytes, response_size_bytes
  ) VALUES (
    p_user_id, p_endpoint, p_method, p_status_code,
    p_response_time_ms, p_request_size_bytes, p_response_size_bytes
  ) RETURNING id INTO v_usage_id;
  
  RETURN v_usage_id;
END;
$$;

-- ============================================================================
-- APPLY AUDIT TRIGGERS TO CRITICAL TABLES
-- ============================================================================

-- User profiles audit
CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Projects audit  
CREATE TRIGGER audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Workflows audit (critical for MVP)
CREATE TRIGGER audit_workflows
  AFTER INSERT OR UPDATE OR DELETE ON workflows
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Deployments audit (critical for MVP)
CREATE TRIGGER audit_deployments
  AFTER INSERT OR UPDATE OR DELETE ON deployments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Chat sessions audit
CREATE TRIGGER audit_chat_sessions
  AFTER INSERT OR UPDATE OR DELETE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================================================
-- SECURITY EVENT TRIGGERS
-- ============================================================================

-- Trigger for failed RLS policy access
CREATE OR REPLACE FUNCTION log_rls_violation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM log_security_event(
    auth.uid(),
    'rls_violation',
    'high',
    'Attempted unauthorized access to ' || TG_TABLE_NAME,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id)
    )
  );
  
  RETURN NULL; -- Block the operation
END;
$$;

-- ============================================================================
-- ADVANCED AUDIT FUNCTIONS
-- ============================================================================

-- Function to get audit trail for a specific record
CREATE OR REPLACE FUNCTION get_audit_trail(
  p_table_name TEXT,
  p_record_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  action TEXT,
  user_id UUID,
  user_email TEXT,
  changed_fields TEXT[],
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.action,
    a.user_id,
    up.email as user_email,
    a.changed_fields,
    a.old_values,
    a.new_values,
    a.created_at
  FROM audit_log a
  LEFT JOIN user_profiles up ON a.user_id = up.id
  WHERE a.table_name = p_table_name
    AND a.record_id = p_record_id
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_actions INTEGER,
  projects_modified INTEGER,
  workflows_modified INTEGER,
  chat_sessions_created INTEGER,
  deployments_attempted INTEGER,
  last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ := NOW() - (p_days_back || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_actions,
    COUNT(DISTINCT a.record_id) FILTER (WHERE a.table_name = 'projects')::INTEGER as projects_modified,
    COUNT(DISTINCT a.record_id) FILTER (WHERE a.table_name = 'workflows')::INTEGER as workflows_modified,
    COUNT(DISTINCT a.record_id) FILTER (WHERE a.table_name = 'chat_sessions' AND a.action = 'INSERT')::INTEGER as chat_sessions_created,
    COUNT(DISTINCT a.record_id) FILTER (WHERE a.table_name = 'deployments' AND a.action = 'INSERT')::INTEGER as deployments_attempted,
    MAX(a.created_at) as last_activity
  FROM audit_log a
  WHERE a.user_id = p_user_id
    AND a.created_at >= v_start_date;
END;
$$;

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
  p_time_window_minutes INTEGER DEFAULT 60,
  p_threshold_actions INTEGER DEFAULT 100
)
RETURNS TABLE(
  user_id UUID,
  user_email TEXT,
  action_count INTEGER,
  unique_records INTEGER,
  first_action TIMESTAMPTZ,
  last_action TIMESTAMPTZ,
  risk_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time TIMESTAMPTZ := NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH user_activity AS (
    SELECT 
      a.user_id,
      COUNT(*) as action_count,
      COUNT(DISTINCT a.record_id) as unique_records,
      MIN(a.created_at) as first_action,
      MAX(a.created_at) as last_action,
      COUNT(DISTINCT a.table_name) as tables_accessed
    FROM audit_log a
    WHERE a.created_at >= v_start_time
      AND a.user_id IS NOT NULL
    GROUP BY a.user_id
    HAVING COUNT(*) >= p_threshold_actions
  )
  SELECT 
    ua.user_id,
    up.email,
    ua.action_count::INTEGER,
    ua.unique_records::INTEGER,
    ua.first_action,
    ua.last_action,
    CASE 
      WHEN ua.action_count > p_threshold_actions * 2 THEN 90
      WHEN ua.action_count > p_threshold_actions * 1.5 THEN 70
      WHEN ua.unique_records < ua.action_count * 0.1 THEN 80 -- Too many actions on few records
      ELSE 50
    END::INTEGER as risk_score
  FROM user_activity ua
  JOIN user_profiles up ON ua.user_id = up.id
  ORDER BY ua.action_count DESC;
END;
$$;

-- ============================================================================
-- MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to archive old audit logs
CREATE OR REPLACE FUNCTION archive_old_audit_logs(p_days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete old audit logs but keep critical ones longer
  DELETE FROM audit_log
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
    AND table_name NOT IN ('workflows', 'deployments'); -- Keep workflow/deployment audits longer
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Archive security audits older than 2 years
  DELETE FROM security_audit
  WHERE created_at < NOW() - '2 years'::INTERVAL
    AND severity NOT IN ('high', 'critical'); -- Keep high/critical events longer
  
  -- Archive API usage older than 90 days
  DELETE FROM api_usage_audit
  WHERE created_at < NOW() - '90 days'::INTERVAL;
  
  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- ENABLE RLS ON AUDIT TABLES
-- ============================================================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_audit ENABLE ROW LEVEL SECURITY;

-- Only service role and admin can access audit logs
CREATE POLICY "Service role can access all audit logs" ON audit_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own audit logs" ON audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can access security audit" ON security_audit
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own security audit" ON security_audit
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can access API audit" ON api_usage_audit
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own API usage" ON api_usage_audit
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON audit_log TO authenticated;
GRANT SELECT ON security_audit TO authenticated;
GRANT SELECT ON api_usage_audit TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all table changes';
COMMENT ON TABLE security_audit IS 'Security-focused event logging for monitoring';
COMMENT ON TABLE api_usage_audit IS 'API usage tracking for rate limiting and analytics';

COMMENT ON FUNCTION audit_trigger() IS 'Generic trigger function for auditing table changes';
COMMENT ON FUNCTION log_security_event(UUID, TEXT, TEXT, TEXT, JSONB) IS 'Logs security events with context';
COMMENT ON FUNCTION get_audit_trail(TEXT, UUID, INTEGER) IS 'Returns audit history for a specific record';
COMMENT ON FUNCTION detect_suspicious_activity(INTEGER, INTEGER) IS 'Detects potentially suspicious user activity patterns';