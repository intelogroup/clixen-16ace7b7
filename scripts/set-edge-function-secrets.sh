#!/bin/bash

# Script to set Edge Function secrets in Supabase
# These will be available as environment variables in Edge Functions

echo "🔐 Setting Edge Function secrets..."

# Get the OpenAI API key from environment or prompt
if [ -z "$OPENAI_API_KEY" ]; then
  echo "Please enter your OpenAI API key:"
  read -s OPENAI_API_KEY
fi

# Set OpenAI API key as Edge Function secret
echo "Setting OPENAI_API_KEY..."
supabase secrets set OPENAI_API_KEY=$OPENAI_API_KEY --project-ref zfbgdixbzezpxllkoyfc

# Set n8n API key as Edge Function secret
echo "Setting N8N_API_KEY..."
supabase secrets set N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU" --project-ref zfbgdixbzezpxllkoyfc

# Set n8n API URL as Edge Function secret (optional)
echo "Setting N8N_API_URL..."
supabase secrets set N8N_API_URL="http://18.221.12.50:5678/api/v1" --project-ref zfbgdixbzezpxllkoyfc

echo "✅ Edge Function secrets have been set!"
echo ""
echo "These secrets are now available in your Edge Functions as environment variables:"
echo "  - Deno.env.get('OPENAI_API_KEY')"
echo "  - Deno.env.get('N8N_API_KEY')"
echo "  - Deno.env.get('N8N_API_URL')"
echo ""
echo "The Edge Functions will automatically use these environment variables before falling back to database lookups."