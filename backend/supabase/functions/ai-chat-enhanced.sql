-- Enhanced AI chat function that retrieves user's OpenAI API key
CREATE OR REPLACE FUNCTION handle_ai_chat_enhanced(
  user_id_param uuid,
  message_param text,
  agent_type_param text DEFAULT 'assistant',
  stream_param boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_api_key text;
  response jsonb;
BEGIN
  -- Get user's OpenAI API key
  SELECT openai_api_key INTO user_api_key
  FROM api_keys
  WHERE user_id = user_id_param;
  
  IF user_api_key IS NULL THEN
    -- Return error if no API key
    RETURN jsonb_build_object(
      'error', true,
      'message', 'No OpenAI API key configured. Please add your API key in settings.',
      'code', 'NO_API_KEY'
    );
  END IF;
  
  -- Here you would normally call the AI service with the user's API key
  -- For now, return a placeholder indicating the key was found
  RETURN jsonb_build_object(
    'success', true,
    'message', 'API key found and ready to use',
    'agent_type', agent_type_param,
    'has_key', true
  );
END;
$$;