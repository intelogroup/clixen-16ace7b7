#!/bin/bash

# Deploy Edge Functions using Supabase Management API with curl
# Based on 2025 API documentation

PROJECT_REF="zfbgdixbzezpxllkoyfc"
ACCESS_TOKEN="sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f"
BASE_URL="https://api.supabase.com/v1"

echo "🎯 Starting Edge Function deployment via Management API (curl)..."

# Function to deploy a single Edge Function
deploy_function() {
    local func_name=$1
    local func_path="supabase/functions/$func_name"
    
    if [ ! -d "$func_path" ]; then
        echo "⚠️  Function directory not found: $func_path"
        return 1
    fi
    
    if [ ! -f "$func_path/index.ts" ]; then
        echo "⚠️  Function index.ts not found: $func_path/index.ts"
        return 1
    fi
    
    echo "🚀 Deploying $func_name..."
    
    # Create a temporary form data
    local temp_file=$(mktemp)
    
    # Create multipart form data
    curl -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -F "source=@$func_path/index.ts" \
        -F "slug=$func_name" \
        -F "verify_jwt=true" \
        "$BASE_URL/projects/$PROJECT_REF/functions/deploy?slug=$func_name" \
        --output "$temp_file" \
        --write-out "%{http_code}\n" \
        --silent
    
    local http_code=$(tail -1 "$temp_file")
    local response=$(head -n -1 "$temp_file")
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo "✅ Successfully deployed $func_name"
        echo "   Response: $response"
        rm "$temp_file"
        return 0
    else
        echo "❌ Failed to deploy $func_name (HTTP $http_code)"
        echo "   Response: $response"
        rm "$temp_file"
        return 1
    fi
}

# Deploy all functions
functions=("ai-chat-system" "api-operations" "ai-chat-sessions" "ai-chat-stream")
success_count=0
total_count=${#functions[@]}

for func in "${functions[@]}"; do
    if deploy_function "$func"; then
        ((success_count++))
    fi
    echo ""
    sleep 1  # Small delay between deployments
done

echo "📊 Deployment Summary:"
echo "  ✅ Successful: $success_count"
echo "  ❌ Failed: $((total_count - success_count))"
echo "  📈 Success Rate: $((success_count * 100 / total_count))%"

if [ $success_count -eq $total_count ]; then
    echo "🎉 All functions deployed successfully!"
    exit 0
else
    echo "⚠️  Some functions failed to deploy"
    exit 1
fi