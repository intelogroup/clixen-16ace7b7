# OpenAI API Key Setup for Clixen

## Important: Do NOT commit API keys to the repository!

To enable full AI functionality in the Clixen chat system, you need to set the OpenAI API key in Netlify's environment variables.

## Setting the API Key in Netlify

### Option 1: Via Netlify Dashboard (Recommended)
1. Go to https://app.netlify.com
2. Select your Clixen site
3. Go to Site settings → Environment variables
4. Add the following variables:
   - `VITE_OPENAI_API_KEY`: Your OpenAI API key
   - `OPENAI_API_KEY`: Your OpenAI API key (for serverless functions)
5. Click "Save"
6. Trigger a new deployment (push any commit or use "Clear cache and deploy site")

### Option 2: Via Netlify CLI
```bash
# First, set your auth token
export NETLIFY_AUTH_TOKEN="your-netlify-token"

# Link to your site
netlify link --id your-site-id

# Set the environment variables
netlify env:set VITE_OPENAI_API_KEY "your-openai-api-key" --context production
netlify env:set OPENAI_API_KEY "your-openai-api-key" --context production

# Trigger a new build
netlify deploy --build --prod
```

## Testing the Integration

After setting the API key and redeploying:

1. Visit https://clixen.netlify.app
2. Login with your credentials
3. Navigate to the Chat page
4. Send a test message
5. You should see real AI responses instead of demo mode

## Security Notes

- NEVER commit API keys to Git
- Use environment variables for all sensitive data
- Rotate API keys regularly
- Monitor usage in OpenAI dashboard

## Troubleshooting

If AI is still in demo mode after setting the key:
1. Clear browser cache
2. Check deployment logs in Netlify
3. Verify environment variables are set in Netlify dashboard
4. Ensure the deployment completed successfully
5. Check browser console for any errors