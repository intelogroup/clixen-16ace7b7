#!/bin/bash

# Clixen Deployment Rollback Script
# Emergency rollback for production deployments

set -e

echo "🔄 Clixen Deployment Rollback"
echo "============================="
echo "Date: $(date)"
echo "Environment: ${ENVIRONMENT:-production}"
echo ""

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-zfbgdixbzezpxllkoyfc}"
NETLIFY_SITE_ID="${NETLIFY_SITE_ID:-}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    local emoji="$3"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d '{
                "text": "'"$emoji Clixen Rollback $status"'",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Clixen Production Rollback*\n'"$emoji Status: $status"'\n📝 '"$message"'\n🌐 Environment: '"$ENVIRONMENT"'\n🕐 Time: '"$(date)"'"
                        }
                    }
                ]
            }' || true
    fi
}

# Get deployment history
get_deployment_history() {
    log "📋 Getting deployment history..."
    
    if [[ -n "$NETLIFY_AUTH_TOKEN" ]] && [[ -n "$NETLIFY_SITE_ID" ]]; then
        # Get Netlify deployment history
        curl -s -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
            "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys" \
            | jq -r '.[] | select(.state == "ready") | "\(.id) \(.created_at) \(.commit_ref) \(.deploy_url)"' \
            | head -5
    else
        warning "No Netlify credentials available for deployment history"
    fi
}

# Rollback frontend deployment
rollback_frontend() {
    local deploy_id="$1"
    
    log "🌐 Rolling back frontend deployment..."
    
    if [[ -z "$deploy_id" ]]; then
        # Get the previous successful deployment automatically
        if [[ -n "$NETLIFY_AUTH_TOKEN" ]] && [[ -n "$NETLIFY_SITE_ID" ]]; then
            deploy_id=$(curl -s -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
                "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys" \
                | jq -r '.[] | select(.state == "ready") | .id' | head -2 | tail -1)
        fi
    fi
    
    if [[ -n "$deploy_id" ]] && [[ -n "$NETLIFY_AUTH_TOKEN" ]]; then
        log "Rolling back to deployment: $deploy_id"
        
        local rollback_response=$(curl -s -X POST \
            -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
            "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys/$deploy_id/restore")
        
        if echo "$rollback_response" | grep -q '"state"'; then
            success "Frontend rollback initiated"
        else
            error "Frontend rollback failed"
        fi
    else
        warning "No deployment ID provided or missing Netlify credentials"
    fi
}

# Rollback Edge Functions
rollback_edge_functions() {
    local commit_hash="$1"
    
    log "⚡ Rolling back Edge Functions..."
    
    if [[ -n "$commit_hash" ]]; then
        # Checkout previous version
        git checkout "$commit_hash" -- supabase/functions/
        
        # Redeploy functions
        local functions=(
            "ai-chat-system"
            "ai-chat-sessions"
            "api-operations"
            "workflow-deployment-service"
            "monitoring-api"
        )
        
        for func in "${functions[@]}"; do
            if [[ -d "supabase/functions/$func" ]]; then
                log "Rolling back $func..."
                supabase functions deploy "$func" --project-ref "$SUPABASE_PROJECT_REF" || warning "Failed to rollback $func"
            fi
        done
        
        success "Edge Functions rollback completed"
    else
        warning "No commit hash provided for Edge Functions rollback"
    fi
}

# Rollback database migrations
rollback_database() {
    local migration_version="$1"
    
    log "🗄️ Rolling back database migrations..."
    
    if [[ -n "$migration_version" ]]; then
        # Connect to database and rollback migration
        # Note: This would need to be implemented based on your migration system
        warning "Database rollback to version $migration_version not implemented"
    else
        log "No database migration rollback requested"
    fi
}

# Verify rollback success
verify_rollback() {
    log "✅ Verifying rollback success..."
    
    # Test frontend
    local frontend_url
    if [[ "$ENVIRONMENT" == "production" ]]; then
        frontend_url="https://clixen.netlify.app"
    else
        frontend_url="https://staging--clixen.netlify.app"
    fi
    
    local frontend_status=$(curl -s -w "%{http_code}" -o /dev/null "$frontend_url") || echo "000"
    if [[ "$frontend_status" == "200" ]]; then
        success "Frontend is accessible after rollback"
    else
        error "Frontend is not accessible after rollback (HTTP: $frontend_status)"
    fi
    
    # Test backend
    local api_url="$VITE_SUPABASE_URL/functions/v1/monitoring-api"
    local api_response=$(curl -s "$api_url" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "health"}' || echo '{"error": "failed"}')
    
    if echo "$api_response" | grep -q '"status":\s*"healthy"'; then
        success "Backend API is healthy after rollback"
    else
        warning "Backend API health check failed after rollback"
    fi
    
    success "Rollback verification completed"
}

# Create rollback checkpoint
create_rollback_checkpoint() {
    log "📍 Creating rollback checkpoint..."
    
    local checkpoint_data='{
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
        "environment": "'$ENVIRONMENT'",
        "git_commit": "'$(git rev-parse HEAD)'",
        "git_branch": "'$(git rev-parse --abbrev-ref HEAD)'",
        "deployment_id": "'${DEPLOYMENT_ID:-unknown}'",
        "rollback_reason": "'${ROLLBACK_REASON:-manual}'"
    }'
    
    # Store checkpoint in database
    local checkpoint_response=$(curl -s "$VITE_SUPABASE_URL/rest/v1/rollback_checkpoints" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$checkpoint_data" || echo '{"error": "failed"}')
    
    if echo "$checkpoint_response" | grep -q "error"; then
        warning "Failed to create rollback checkpoint in database"
    else
        success "Rollback checkpoint created"
    fi
}

# Emergency rollback (automated)
emergency_rollback() {
    log "🚨 Initiating emergency rollback..."
    
    send_notification "STARTED" "Emergency rollback initiated" "🚨"
    
    # Get last known good deployment
    rollback_frontend
    
    # Rollback Edge Functions to last commit
    local last_commit=$(git log --oneline -2 | tail -1 | cut -d' ' -f1)
    rollback_edge_functions "$last_commit"
    
    verify_rollback
    
    send_notification "COMPLETED" "Emergency rollback completed" "✅"
    success "🎉 Emergency rollback completed"
}

# Interactive rollback
interactive_rollback() {
    log "🔄 Starting interactive rollback..."
    
    echo "Available rollback options:"
    echo "1. Frontend only"
    echo "2. Backend (Edge Functions) only" 
    echo "3. Database migrations"
    echo "4. Full rollback (frontend + backend)"
    echo "5. Emergency rollback (automatic)"
    echo ""
    
    read -p "Select rollback type (1-5): " rollback_type
    
    case $rollback_type in
        1)
            echo "Frontend deployment history:"
            get_deployment_history
            echo ""
            read -p "Enter deployment ID to rollback to (or press Enter for previous): " deploy_id
            rollback_frontend "$deploy_id"
            ;;
        2)
            read -p "Enter git commit hash to rollback to: " commit_hash
            rollback_edge_functions "$commit_hash"
            ;;
        3)
            read -p "Enter migration version to rollback to: " migration_version
            rollback_database "$migration_version"
            ;;
        4)
            read -p "Enter deployment ID for frontend: " deploy_id
            read -p "Enter git commit hash for backend: " commit_hash
            rollback_frontend "$deploy_id"
            rollback_edge_functions "$commit_hash"
            ;;
        5)
            emergency_rollback
            return
            ;;
        *)
            error "Invalid option selected"
            ;;
    esac
    
    verify_rollback
    success "🎉 Interactive rollback completed"
}

# Main function
main() {
    local start_time=$(date +%s)
    
    create_rollback_checkpoint
    
    # Check if automated or interactive
    if [[ "$1" == "emergency" ]] || [[ "$EMERGENCY_ROLLBACK" == "true" ]]; then
        emergency_rollback
    elif [[ "$1" == "auto" ]]; then
        rollback_frontend "$2"
        rollback_edge_functions "$3"
        verify_rollback
    else
        interactive_rollback
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "📋 Rollback Summary"
    echo "=================="
    echo "✅ Environment: $ENVIRONMENT"
    echo "✅ Duration: ${duration}s"
    echo "✅ Status: Completed"
    echo ""
    
    send_notification "SUCCESS" "Rollback completed successfully in ${duration}s" "🎉"
}

# Usage information
usage() {
    echo "Usage: $0 [emergency|auto <deploy_id> <commit_hash>|interactive]"
    echo ""
    echo "Options:"
    echo "  emergency           - Automatic emergency rollback"
    echo "  auto <id> <hash>    - Automated rollback with specific versions"
    echo "  interactive         - Interactive rollback with options"
    echo "  (no args)           - Interactive mode (default)"
    echo ""
    echo "Environment variables:"
    echo "  NETLIFY_AUTH_TOKEN  - Netlify authentication token"
    echo "  NETLIFY_SITE_ID     - Netlify site ID"
    echo "  SUPABASE_ACCESS_TOKEN - Supabase access token"
    echo "  SLACK_WEBHOOK_URL   - Slack webhook for notifications"
    echo ""
    exit 1
}

# Check for help flag
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    usage
fi

# Pre-flight checks
if [[ -z "$VITE_SUPABASE_URL" ]]; then
    error "VITE_SUPABASE_URL environment variable is required"
fi

if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    error "SUPABASE_SERVICE_ROLE_KEY environment variable is required"
fi

# Run main function
main "$@"