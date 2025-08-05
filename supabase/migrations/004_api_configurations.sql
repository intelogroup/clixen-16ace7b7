-- API Configurations Table
-- Secure storage for API keys and service configurations

CREATE TABLE IF NOT EXISTS api_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE, -- 'openai', 'n8n', 'twilio', etc.
  api_key TEXT NOT NULL, -- Encrypted API key
  is_active BOOLEAN DEFAULT true,
  environment TEXT DEFAULT 'production', -- 'development', 'staging', 'production'
  rate_limit INTEGER, -- Requests per minute
  metadata JSONB DEFAULT '{}', -- Additional service-specific configuration
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_api_configurations_service ON api_configurations(service_name, is_active);
CREATE INDEX idx_api_configurations_env ON api_configurations(environment, is_active);

-- Enable Row Level Security
ALTER TABLE api_configurations ENABLE ROW LEVEL SECURITY;

-- Only service role can access API configurations (already exists in your migration)
-- This ensures API keys are only accessible from Edge Functions with service role
CREATE POLICY IF NOT EXISTS "Service role only can access api_configurations" ON api_configurations
FOR ALL USING (auth.role() = 'service_role');

-- Function to safely get API key (with caching consideration)
CREATE OR REPLACE FUNCTION get_api_key(p_service_name TEXT, p_environment TEXT DEFAULT 'production')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_api_key TEXT;
BEGIN
  -- Get active API key for the service
  SELECT api_key INTO v_api_key
  FROM api_configurations
  WHERE service_name = p_service_name
    AND environment = p_environment
    AND is_active = true
  LIMIT 1;
  
  -- Update last used timestamp
  IF v_api_key IS NOT NULL THEN
    UPDATE api_configurations
    SET last_used_at = NOW()
    WHERE service_name = p_service_name
      AND environment = p_environment
      AND is_active = true;
  END IF;
  
  RETURN v_api_key;
END;
$$;

-- Function to rotate API key (deactivate old, add new)
CREATE OR REPLACE FUNCTION rotate_api_key(
  p_service_name TEXT,
  p_new_api_key TEXT,
  p_environment TEXT DEFAULT 'production'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Deactivate existing keys
  UPDATE api_configurations
  SET is_active = false,
      updated_at = NOW()
  WHERE service_name = p_service_name
    AND environment = p_environment
    AND is_active = true;
  
  -- Insert new key
  INSERT INTO api_configurations (service_name, api_key, environment)
  VALUES (p_service_name, p_new_api_key, p_environment)
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;

-- Audit table for API key access (optional but recommended)
CREATE TABLE IF NOT EXISTS api_key_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'accessed', 'rotated', 'created', 'deactivated'
  edge_function_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX idx_api_key_audit_service ON api_key_audit_log(service_name, created_at DESC);
CREATE INDEX idx_api_key_audit_action ON api_key_audit_log(action, created_at DESC);

-- Function to log API key access
CREATE OR REPLACE FUNCTION log_api_key_access(
  p_service_name TEXT,
  p_action TEXT,
  p_edge_function_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO api_key_audit_log (service_name, action, edge_function_name, metadata)
  VALUES (p_service_name, p_action, p_edge_function_name, p_metadata);
END;
$$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_configurations_updated_at
  BEFORE UPDATE ON api_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Initial API keys can be inserted manually or via Supabase dashboard
-- Example (DO NOT commit real keys):
-- INSERT INTO api_configurations (service_name, api_key) VALUES
--   ('openai', 'sk-...'),
--   ('n8n', 'your-n8n-api-key'),
--   ('supabase', 'your-service-role-key');

COMMENT ON TABLE api_configurations IS 'Secure storage for API keys and service configurations. Only accessible via service role.';
COMMENT ON COLUMN api_configurations.api_key IS 'Encrypted API key. Consider using Supabase Vault for additional security in the future.';