#!/bin/bash

# Critical User Isolation Fix Script
# Updates all n8n workflows with [USR-terragon] prefix

API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0"
BASE_URL="https://n8nio-n8n-7xzf6n.sliplane.app/api/v1"

# Array of workflow IDs and their new names
declare -A WORKFLOWS=(
    ["0HNKws4h3CvUdvZl"]="[USR-terragon] My workflow 2"
    ["2uuhHaPoYHokINJD"]="[USR-terragon] SSH-INVESTIGATION Folder Test"
    ["AOv9zhBBOc2hUP6P"]="[USR-terragon] Project Test Workflow"
    ["OLMMb0pmaxh1dqb8"]="[USR-terragon] My workflow"
    ["XJZOpihXHTEOYtL6"]="[USR-terragon] Weather Alert System"
    ["cHRjITLR0bx7Ibot"]="[USR-terragon] Weather Monitor"
    ["cw8SXCoX22NTOwnv"]="[USR-terragon] Weather Monitor Clean"
    ["lUz1jnEsmRNuzPyf"]="[USR-terragon] My workflow 3"
    ["sFdsEc4QhC6JyNGV"]="[USR-terragon] Test Folder Project"
)

echo "🚀 Starting Critical User Isolation Fixes..."
echo "📊 Processing ${#WORKFLOWS[@]} workflows..."

for workflow_id in "${!WORKFLOWS[@]}"; do
    new_name="${WORKFLOWS[$workflow_id]}"
    echo "🔄 Processing: $workflow_id → $new_name"
    
    # Get current workflow
    curl -s -X GET "$BASE_URL/workflows/$workflow_id" \
        -H "X-N8N-API-KEY: $API_KEY" \
        -H "accept: application/json" > "/tmp/workflow_$workflow_id.json"
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to fetch workflow $workflow_id"
        continue
    fi
    
    # Extract only the essential fields for update
    jq --arg new_name "$new_name" '{
        name: $new_name,
        nodes: .nodes,
        connections: .connections,
        settings: .settings
    }' "/tmp/workflow_$workflow_id.json" > "/tmp/update_$workflow_id.json"
    
    # Update workflow
    result=$(curl -s -X PUT "$BASE_URL/workflows/$workflow_id" \
        -H "X-N8N-API-KEY: $API_KEY" \
        -H "accept: application/json" \
        -H "Content-Type: application/json" \
        -d @"/tmp/update_$workflow_id.json")
    
    updated_name=$(echo "$result" | jq -r '.name // "null"')
    
    if [ "$updated_name" = "$new_name" ]; then
        echo "✅ SUCCESS: $workflow_id updated to '$new_name'"
    else
        echo "❌ FAILED: $workflow_id - API response: $result" | head -c 100
    fi
    
    # Clean up temp files
    rm -f "/tmp/workflow_$workflow_id.json" "/tmp/update_$workflow_id.json"
    
    # Small delay to avoid API rate limits
    sleep 0.5
done

echo ""
echo "🎯 User Isolation Fix Complete!"
echo "🔍 Verifying results..."

# Verify the fixes
curl -s -X GET "$BASE_URL/workflows" \
    -H "X-N8N-API-KEY: $API_KEY" \
    -H "accept: application/json" | jq '.data[] | {id: .id, name: .name}' | grep -i "USR-terragon" | wc -l > /tmp/usr_count.txt

usr_count=$(cat /tmp/usr_count.txt)
echo "📊 Workflows with [USR-terragon] prefix: $usr_count/9"

if [ "$usr_count" -eq 9 ]; then
    echo "🎉 SUCCESS: All workflows properly isolated!"
else
    echo "⚠️  WARNING: Only $usr_count/9 workflows updated. Manual review needed."
fi

rm -f /tmp/usr_count.txt