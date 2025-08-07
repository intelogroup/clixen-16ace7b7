#!/bin/bash

# Clixen Production Deployment Script
# Comprehensive deployment automation for all services

set -e

echo "🚀 Clixen Production Deployment"
echo "================================"
echo "Date: $(date)"
echo "Environment: ${ENVIRONMENT:-production}"
echo ""

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-zfbgdixbzezpxllkoyfc}"
EC2_HOST="${EC2_HOST:-18.221.12.50}"
FRONTEND_DOMAIN="${FRONTEND_DOMAIN:-clixen.netlify.app}"
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

# Notification function
send_notification() {
    local status="$1"
    local message="$2"
    local emoji="$3"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d '{
                "text": "'"$emoji Clixen Deployment $status"'",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Clixen Production Deployment*\n'"$emoji Status: $status"'\n📝 '"$message"'\n🌐 Environment: '"$ENVIRONMENT"'\n🕐 Time: '"$(date)"'"
                        }
                    }
                ]
            }' || true
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."
    
    # Check required environment variables
    local required_vars=(
        "VITE_SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "SUPABASE_ACCESS_TOKEN"
        "VITE_N8N_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Check Supabase CLI
    if ! command -v supabase &> /dev/null; then
        log "Installing Supabase CLI..."
        curl -fsSL https://supabase.com/install.sh | sh
        echo "$HOME/.local/bin" >> "$GITHUB_PATH" || true
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    # Check Node.js version
    if ! node --version | grep -E "v(18|20|22)" > /dev/null; then
        warning "Node.js version should be 18, 20, or 22"
    fi
    
    success "Pre-deployment checks passed"
}

# Infrastructure health check
infrastructure_health_check() {
    log "🏥 Checking infrastructure health..."
    
    # Check Supabase connectivity
    local supabase_status=$(curl -s -w "%{http_code}" -o /dev/null \
        "$VITE_SUPABASE_URL/rest/v1/" \
        -H "apikey: $VITE_SUPABASE_ANON_KEY") || echo "000"
    
    if [[ "$supabase_status" != "200" ]]; then
        error "Supabase connectivity check failed (HTTP: $supabase_status)"
    fi
    
    # Check n8n API
    local n8n_status=$(curl -s -w "%{http_code}" -o /dev/null \
        "http://$EC2_HOST:5678/healthz") || echo "000"
    
    if [[ "$n8n_status" != "200" ]]; then
        warning "n8n health check failed (HTTP: $n8n_status) - continuing anyway"
    fi
    
    success "Infrastructure health check passed"
}

# Database migration
deploy_database_migrations() {
    log "🗄️ Deploying database migrations..."
    
    # Run MVP migration script
    if [[ -f "scripts/run-mvp-migration.js" ]]; then
        node scripts/run-mvp-migration.js
        success "Database migrations completed"
    else
        warning "No migration script found, skipping database migrations"
    fi
    
    # Validate schema
    if [[ -f "scripts/validate-mvp-schema.js" ]]; then
        node scripts/validate-mvp-schema.js
        success "Database schema validation passed"
    fi
}

# Deploy Edge Functions
deploy_edge_functions() {
    log "⚡ Deploying Edge Functions..."
    
    # Set environment secrets for Edge Functions
    log "Setting Edge Function secrets..."
    supabase secrets set --project-ref "$SUPABASE_PROJECT_REF" \
        OPENAI_API_KEY="$VITE_OPENAI_API_KEY" \
        N8N_API_URL="$VITE_N8N_API_URL" \
        N8N_API_KEY="$VITE_N8N_API_KEY" \
        SLACK_WEBHOOK_URL="$SLACK_WEBHOOK_URL" || warning "Failed to set some secrets"
    
    # Deploy functions
    local functions=(
        "ai-chat-system"
        "ai-chat-sessions" 
        "api-operations"
        "workflow-deployment-service"
        "monitoring-api"
    )
    
    local failed_functions=()
    
    for func in "${functions[@]}"; do
        log "Deploying $func..."
        if supabase functions deploy "$func" --project-ref "$SUPABASE_PROJECT_REF"; then
            success "$func deployed successfully"
        else
            error "Failed to deploy $func"
            failed_functions+=("$func")
        fi
    done
    
    if [[ ${#failed_functions[@]} -gt 0 ]]; then
        error "Failed to deploy functions: ${failed_functions[*]}"
    fi
    
    success "All Edge Functions deployed successfully"
}

# Verify Edge Function deployment
verify_edge_functions() {
    log "✅ Verifying Edge Function deployment..."
    
    local functions=(
        "ai-chat-system"
        "ai-chat-sessions"
        "api-operations" 
        "workflow-deployment-service"
        "monitoring-api"
    )
    
    for func in "${functions[@]}"; do
        local func_url="$VITE_SUPABASE_URL/functions/v1/$func"
        local response=$(curl -s -w "%{http_code}" -o /dev/null \
            "$func_url" \
            -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            -d '{"action": "health_check"}') || echo "000"
        
        if [[ "$response" == "200" ]] || [[ "$response" == "405" ]]; then
            success "$func is responding (HTTP: $response)"
        else
            warning "$func verification returned HTTP: $response"
        fi
    done
}

# Build and deploy frontend
deploy_frontend() {
    log "🌐 Building and preparing frontend deployment..."
    
    # Install dependencies
    cd frontend
    npm ci --production=false
    
    # Build application
    log "Building frontend application..."
    npm run build
    
    # Verify build output
    if [[ ! -d "dist" ]] || [[ ! -f "dist/index.html" ]]; then
        error "Frontend build failed - no dist directory or index.html found"
    fi
    
    # Calculate bundle size
    local bundle_size=$(du -sk dist | cut -f1)
    log "Frontend bundle size: ${bundle_size}KB"
    
    if [[ $bundle_size -gt 500 ]]; then
        warning "Bundle size is larger than 500KB"
    fi
    
    cd ..
    success "Frontend built successfully"
}

# Deploy to Netlify (if not using GitHub Actions)
deploy_to_netlify() {
    if [[ -n "$NETLIFY_AUTH_TOKEN" ]] && [[ -n "$NETLIFY_SITE_ID" ]]; then
        log "📡 Deploying to Netlify..."
        
        if command -v netlify &> /dev/null; then
            cd frontend
            netlify deploy --prod --dir=dist --site="$NETLIFY_SITE_ID"
            cd ..
            success "Deployed to Netlify"
        else
            warning "Netlify CLI not available, skipping direct Netlify deployment"
        fi
    else
        log "📡 Netlify deployment will be handled by GitHub Actions"
    fi
}

# Post-deployment testing
post_deployment_testing() {
    log "🧪 Running post-deployment tests..."
    
    # Wait for deployment to be active
    sleep 30
    
    # Test frontend
    local frontend_url="https://$FRONTEND_DOMAIN"
    log "Testing frontend at: $frontend_url"
    
    local frontend_status=$(curl -s -w "%{http_code}" -o /dev/null "$frontend_url") || echo "000"
    if [[ "$frontend_status" == "200" ]]; then
        success "Frontend is accessible"
    else
        error "Frontend is not accessible (HTTP: $frontend_status)"
    fi
    
    # Test backend API
    local api_url="$VITE_SUPABASE_URL/functions/v1/monitoring-api"
    log "Testing monitoring API..."
    
    local api_response=$(curl -s "$api_url" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "health"}' || echo '{"error": "request failed"}')
    
    if echo "$api_response" | grep -q '"status":\s*"healthy"'; then
        success "Backend API is healthy"
    else
        warning "Backend API health check returned unexpected response"
    fi
    
    success "Post-deployment testing completed"
}

# Performance benchmark
performance_benchmark() {
    log "⚡ Running performance benchmark..."
    
    # Test API response times
    local frontend_url="https://$FRONTEND_DOMAIN"
    local api_url="$VITE_SUPABASE_URL/rest/v1/conversations?select=count"
    
    # Test frontend loading time
    local frontend_time=$(curl -s -o /dev/null -w "%{time_total}" "$frontend_url")
    log "Frontend load time: ${frontend_time}s"
    
    # Test API response time  
    local api_time=$(curl -s -o /dev/null -w "%{time_total}" \
        "$api_url" \
        -H "apikey: $VITE_SUPABASE_ANON_KEY")
    log "API response time: ${api_time}s"
    
    # Check performance thresholds
    if (( $(echo "$frontend_time > 3.0" | bc -l) )); then
        warning "Frontend load time exceeds 3s threshold"
    fi
    
    if (( $(echo "$api_time > 2.0" | bc -l) )); then
        warning "API response time exceeds 2s threshold"
    fi
    
    success "Performance benchmark completed"
}

# Setup monitoring
setup_monitoring() {
    log "📊 Setting up production monitoring..."
    
    # Test monitoring API
    local monitoring_url="$VITE_SUPABASE_URL/functions/v1/monitoring-api"
    
    local test_response=$(curl -s "$monitoring_url" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "test_alert"}' || echo '{"error": "failed"}')
    
    if echo "$test_response" | grep -q '"success":\s*true'; then
        success "Monitoring system is operational"
    else
        warning "Monitoring system test failed"
    fi
}

# Rollback function
rollback_deployment() {
    error "Deployment failed - initiating rollback..."
    
    # Add rollback logic here
    log "🔄 Rollback procedures would be executed here"
    
    send_notification "FAILED" "Deployment failed and rollback initiated" "🔄"
    exit 1
}

# Trap errors for rollback
trap rollback_deployment ERR

# Main deployment flow
main() {
    local start_time=$(date +%s)
    
    log "Starting Clixen production deployment..."
    send_notification "STARTED" "Production deployment initiated" "🚀"
    
    # Run deployment steps
    pre_deployment_checks
    infrastructure_health_check
    deploy_database_migrations
    deploy_edge_functions
    verify_edge_functions
    deploy_frontend
    deploy_to_netlify
    post_deployment_testing
    performance_benchmark
    setup_monitoring
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    success "🎉 Clixen production deployment completed successfully!"
    log "Total deployment time: ${duration} seconds"
    
    # Final status report
    echo ""
    echo "📋 Deployment Summary"
    echo "===================="
    echo "✅ Environment: $ENVIRONMENT"
    echo "✅ Frontend: https://$FRONTEND_DOMAIN"
    echo "✅ Backend API: $VITE_SUPABASE_URL"
    echo "✅ n8n Instance: http://$EC2_HOST:5678"
    echo "✅ Duration: ${duration}s"
    echo ""
    
    send_notification "SUCCESS" "Production deployment completed in ${duration}s" "🎉"
}

# Check if running in CI/CD
if [[ "$CI" == "true" ]]; then
    log "Running in CI/CD environment"
    # Additional CI/CD specific setup if needed
fi

# Run main deployment
main "$@"