-- Create error_logs table for comprehensive error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error', 'critical')),
  message text NOT NULL,
  context jsonb,
  stack text,
  user_agent text,
  url text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

-- Create api_keys table for storing user API keys securely
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  openai_api_key text,
  encrypted_openai_key text, -- For future encryption
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create RLS policies for api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own API keys
CREATE POLICY "Users can view own api keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own API keys
CREATE POLICY "Users can insert own api keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys
CREATE POLICY "Users can update own api keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own api keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for error_logs
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own error logs
CREATE POLICY "Users can view own error logs" ON error_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert error logs
CREATE POLICY "Service role can insert error logs" ON error_logs
  FOR INSERT WITH CHECK (true);

-- Create function to get user's OpenAI API key
CREATE OR REPLACE FUNCTION get_user_openai_key(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text;
BEGIN
  -- Only allow users to get their own key
  IF auth.uid() != user_id_param THEN
    RETURN NULL;
  END IF;
  
  SELECT openai_api_key INTO api_key
  FROM api_keys
  WHERE user_id = user_id_param;
  
  RETURN api_key;
END;
$$;

-- Create function to set user's OpenAI API key
CREATE OR REPLACE FUNCTION set_user_openai_key(user_id_param uuid, api_key_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to set their own key
  IF auth.uid() != user_id_param THEN
    RETURN false;
  END IF;
  
  INSERT INTO api_keys (user_id, openai_api_key, updated_at)
  VALUES (user_id_param, api_key_param, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    openai_api_key = EXCLUDED.openai_api_key,
    updated_at = EXCLUDED.updated_at;
  
  RETURN true;
END;
$$;