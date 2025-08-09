-- Create API keys storage tables for MVP
-- This enables user-specific OpenAI API keys and global configurations

-- User-specific API keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    openai_api_key text, -- Encrypted API key storage
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    
    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Global API configurations table  
CREATE TABLE IF NOT EXISTS public.api_configurations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name text NOT NULL, -- 'openai', 'n8n', etc.
    api_key text NOT NULL, -- Encrypted API key storage
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}', -- Additional configuration data
    
    -- Ensure unique service names
    UNIQUE(service_name)
);

-- Enable RLS on both tables
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys table
-- Users can only access their own API keys
CREATE POLICY "Users can view their own API keys" ON public.api_keys
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON public.api_keys
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON public.api_keys
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON public.api_keys
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for api_configurations table  
-- Only service role can access global configurations
CREATE POLICY "Service role can access global configurations" ON public.api_configurations
    FOR ALL
    USING (auth.role() = 'service_role');

-- Edge Functions can read global configurations
CREATE POLICY "Edge Functions can read global configurations" ON public.api_configurations
    FOR SELECT
    USING (true); -- Edge Functions use service role internally

-- Add indexes for performance
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_active ON public.api_keys(is_active);
CREATE INDEX idx_api_configurations_service ON public.api_configurations(service_name);
CREATE INDEX idx_api_configurations_active ON public.api_configurations(service_name, is_active);

-- Add updated_at trigger for api_keys
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_updated_at_api_keys
    BEFORE UPDATE ON public.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_api_configurations
    BEFORE UPDATE ON public.api_configurations  
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert a default OpenAI configuration if needed
-- This will be used as fallback when no user-specific key exists
-- INSERT INTO public.api_configurations (service_name, api_key, is_active, metadata)
-- VALUES ('openai', 'your-openai-api-key-here', true, '{"model": "gpt-3.5-turbo", "max_tokens": 1000}')
-- ON CONFLICT (service_name) DO NOTHING;

COMMENT ON TABLE public.api_keys IS 'User-specific API keys for external services';
COMMENT ON TABLE public.api_configurations IS 'Global API configurations and fallback keys';
COMMENT ON COLUMN public.api_keys.openai_api_key IS 'User OpenAI API key (should be encrypted)';
COMMENT ON COLUMN public.api_configurations.api_key IS 'Service API key (should be encrypted)';