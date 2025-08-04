#!/bin/bash

# Netlify Environment Variables Verification Script
# This script verifies that all required backend environment variables are set

echo "🔍 Verifying Netlify backend environment variables..."
echo "Site ID: 25d322b9-42d3-4b1a-b921-ba7ac240ec8b"
echo ""

# Check if authenticated
if ! netlify status > /dev/null 2>&1; then
    echo "❌ Not authenticated with Netlify. Please run 'netlify login' first."
    exit 1
fi

SITE_ID="25d322b9-42d3-4b1a-b921-ba7ac240ec8b"

echo "📋 Checking backend environment variables..."

# Required backend variables
REQUIRED_VARS=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY" 
    "SUPABASE_SERVICE_ROLE_KEY"
    "SUPABASE_JWT_SECRET"
    "DATABASE_URL"
    "SUPABASE_ACCESS_TOKEN"
    "N8N_API_URL"
    "N8N_API_KEY"
    "OPENAI_API_KEY"
)

# Get current environment variables
echo "Fetching environment variables from Netlify..."
ENV_OUTPUT=$(netlify env:list --context production --site "$SITE_ID" --json 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch environment variables. Check your authentication and site access."
    exit 1
fi

echo ""
echo "✅ Successfully connected to Netlify site"
echo ""

# Check each required variable
MISSING_VARS=()
FOUND_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if echo "$ENV_OUTPUT" | grep -q "\"key\": \"$var\""; then
        echo "✅ $var - Found"
        FOUND_VARS+=("$var")
    else
        echo "❌ $var - Missing"
        MISSING_VARS+=("$var")
    fi
done

echo ""
echo "📊 Summary:"
echo "Found: ${#FOUND_VARS[@]} variables"
echo "Missing: ${#MISSING_VARS[@]} variables"

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo ""
    echo "🎉 All backend environment variables are properly configured!"
    echo ""
    echo "💡 Next steps:"
    echo "1. Trigger a new deployment to ensure variables are loaded"
    echo "2. Test your serverless functions that depend on these variables"
    echo "3. Check function logs for any authentication or connection issues"
else
    echo ""
    echo "⚠️  Missing variables need to be set:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "🔧 To set missing variables:"
    echo "1. Run: ./set-netlify-backend-env.sh"
    echo "2. Or manually add them via the Netlify dashboard"
    exit 1
fi

echo ""
echo "🔗 Useful links:"
echo "Dashboard: https://app.netlify.com/sites/$SITE_ID/settings/env"
echo "Site URL: https://clixen.netlify.app"