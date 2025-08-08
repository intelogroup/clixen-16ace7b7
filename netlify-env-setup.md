# Netlify Environment Variables Setup

## Required Environment Variables

To complete the deployment, you need to set the following environment variables in your Netlify dashboard:

### Step 1: Access Netlify Dashboard
1. Go to https://app.netlify.com/
2. Navigate to your site settings
3. Go to "Environment Variables" section

### Step 2: Add Required Variables

**Required Environment Variables:**

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key  
- `VITE_N8N_API_URL` - Your n8n instance API URL
- `VITE_N8N_API_KEY` - Your n8n API key

**Important Security Note:**
- DO NOT set `VITE_OPENAI_API_KEY` in Netlify environment variables
- OpenAI API key should only be configured in Supabase Edge Functions
- This prevents API key exposure in frontend code

**Values:** Refer to the CLAUDE.md file for the actual values to use (except OpenAI key).

### Step 3: Deploy Contexts
Set these variables for all deploy contexts:
- **Production**
- **Deploy Previews** 
- **Branch Deploys**

### Step 4: Trigger Redeploy
After setting the environment variables, trigger a new deploy by pushing to main branch or using the "Trigger deploy" button in Netlify dashboard.

## Security Note
These variables are now stored securely in Netlify's environment variable system instead of being hardcoded in the repository, which resolves the secrets scanning issue.