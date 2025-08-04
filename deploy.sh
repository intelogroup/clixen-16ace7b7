#!/bin/bash

# Clixen AI Platform - Deployment Script for Existing Netlify Site
# Site: sparkly-kitten-5c6fd9
# Repository: https://github.com/intelogroup/clixen.git
# Branch: terragon/test-app-frontend-netlify-supabase-mcp

echo "🚀 Deploying Clixen AI Platform to Netlify..."
echo "Target Site: sparkly-kitten-5c6fd9"
echo "Repository: https://github.com/intelogroup/clixen.git"
echo "Branch: terragon/test-app-frontend-netlify-supabase-mcp"
echo ""

# Verify build works locally first
echo "1. Running local build to verify..."
npm install
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Local build successful!"
else
    echo "❌ Local build failed. Please fix errors before deploying."
    exit 1
fi

echo ""
echo "2. Build verification complete. Ready for Netlify deployment!"
echo ""
echo "📋 NEXT STEPS - Complete these in Netlify Dashboard:"
echo ""
echo "STEP 1: Connect Repository"
echo "- Go to: https://app.netlify.com/projects/sparkly-kitten-5c6fd9/settings"
echo "- Navigate to 'Build & deploy' → 'Repository'"
echo "- Connect to: https://github.com/intelogroup/clixen.git"
echo "- Set branch: terragon/test-app-frontend-netlify-supabase-mcp"
echo ""
echo "STEP 2: Configure Build Settings"
echo "- Build command: npm install && npm run build"
echo "- Publish directory: dist"
echo "- Functions directory: netlify/functions"
echo ""
echo "STEP 3: Set Environment Variables"
echo "- Go to 'Environment variables'"
echo "- Copy variables from: /tmp/netlify-env-vars.txt"
echo "- Add your OpenAI API key to: VITE_OPENAI_API_KEY"
echo ""
echo "STEP 4: Deploy"
echo "- Click 'Deploy site' or 'Trigger deploy'"
echo ""
echo "Expected URL after deployment:"
echo "https://sparkly-kitten-5c6fd9.netlify.app"
echo ""
echo "🎯 Your project is ready for deployment!"