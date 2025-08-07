#!/bin/bash

# Clixen MVP - Edge Functions Deployment Script
# Deploys all Edge Functions to Supabase with proper error handling

set -e  # Exit on any error

# Configuration
PROJECT_REF="zfbgdixbzezpxllkoyfc"
FUNCTIONS_DIR="supabase/functions"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check requirements
check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI is not installed. Please install it first."
        echo "Install with: npm install -g supabase"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -d "$FUNCTIONS_DIR" ]; then
        log_error "Functions directory not found. Make sure you're in the backend directory."
        exit 1
    fi
    
    # Check Supabase CLI version
    SUPABASE_VERSION=$(supabase --version 2>/dev/null | head -n1 || echo "unknown")
    log_info "Supabase CLI version: $SUPABASE_VERSION"
    
    log_success "Requirements check passed"
}

# List available functions
list_functions() {
    log_info "Available Edge Functions:"
    
    for func_dir in $(find $FUNCTIONS_DIR -mindepth 1 -maxdepth 1 -type d -name "*-api" -o -name "ai-*" -o -name "api-operations" | sort); do
        func_name=$(basename "$func_dir")
        if [ -f "$func_dir/index.ts" ]; then
            echo "  ✓ $func_name"
        else
            echo "  ✗ $func_name (missing index.ts)"
        fi
    done
}

# Deploy single function
deploy_function() {
    local func_name=$1
    local func_path="$FUNCTIONS_DIR/$func_name"
    
    if [ ! -d "$func_path" ]; then
        log_error "Function '$func_name' not found in $func_path"
        return 1
    fi
    
    if [ ! -f "$func_path/index.ts" ]; then
        log_error "Function '$func_name' missing index.ts file"
        return 1
    fi
    
    log_info "Deploying function: $func_name"
    
    # Deploy with timeout and error handling
    if timeout 300s supabase functions deploy "$func_name" --project-ref "$PROJECT_REF" 2>&1; then
        log_success "Successfully deployed: $func_name"
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            log_error "Deployment timeout (5 minutes) for: $func_name"
        else
            log_error "Failed to deploy: $func_name (exit code: $exit_code)"
        fi
        return $exit_code
    fi
}

# Deploy all MVP functions
deploy_all_functions() {
    log_info "Starting deployment of all MVP Edge Functions..."
    
    # List of functions in deployment order (dependencies first)
    local functions=(
        "_shared"  # Shared utilities
        "projects-api"
        "workflows-api" 
        "chat-api"
        "telemetry-api"
        "api-operations"  # Enhanced legacy function
        "ai-chat-system"  # Existing AI system
        "ai-chat-sessions"  # Existing chat sessions
        "ai-chat-stream"  # Existing streaming
    )
    
    local deployed=0
    local failed=0
    local skipped=0
    
    for func_name in "${functions[@]}"; do
        local func_path="$FUNCTIONS_DIR/$func_name"
        
        # Skip if function doesn't exist or is not a real function
        if [ "$func_name" == "_shared" ]; then
            log_info "Skipping _shared (utilities only)"
            ((skipped++))
            continue
        fi
        
        if [ ! -d "$func_path" ] || [ ! -f "$func_path/index.ts" ]; then
            log_warning "Skipping $func_name (not found or incomplete)"
            ((skipped++))
            continue
        fi
        
        if deploy_function "$func_name"; then
            ((deployed++))
        else
            ((failed++))
        fi
        
        # Brief pause between deployments
        sleep 2
    done
    
    echo ""
    log_info "Deployment Summary:"
    echo "  ✓ Deployed: $deployed"
    echo "  ✗ Failed: $failed"  
    echo "  - Skipped: $skipped"
    
    if [ $failed -eq 0 ]; then
        log_success "All functions deployed successfully! 🎉"
        return 0
    else
        log_error "$failed function(s) failed to deploy"
        return 1
    fi
}

# Verify deployments
verify_deployments() {
    log_info "Verifying function deployments..."
    
    local base_url="https://$PROJECT_REF.supabase.co/functions/v1"
    local functions_to_test=(
        "projects-api"
        "workflows-api"
        "chat-api" 
        "telemetry-api"
        "api-operations"
    )
    
    local working=0
    local total=0
    
    for func_name in "${functions_to_test[@]}"; do
        ((total++))
        log_info "Testing $func_name..."
        
        # Test with OPTIONS request (CORS preflight)
        if curl -s -f -X OPTIONS "$base_url/$func_name" \
           -H "Access-Control-Request-Method: GET" \
           -H "Access-Control-Request-Headers: authorization" \
           --max-time 10 &>/dev/null; then
            log_success "$func_name is responding"
            ((working++))
        else
            log_error "$func_name is not responding or has issues"
        fi
    done
    
    echo ""
    log_info "Verification Summary: $working/$total functions responding"
    
    if [ $working -eq $total ]; then
        log_success "All functions are responding correctly! ✅"
    else
        log_warning "Some functions may have issues. Check logs for details."
    fi
}

# Show function URLs
show_function_urls() {
    log_info "Function URLs:"
    echo ""
    
    local base_url="https://$PROJECT_REF.supabase.co/functions/v1"
    local functions=(
        "projects-api"
        "workflows-api"
        "chat-api"
        "telemetry-api" 
        "api-operations"
        "ai-chat-system"
    )
    
    for func_name in "${functions[@]}"; do
        echo "  🔗 $func_name: $base_url/$func_name"
    done
    
    echo ""
    echo "📚 API Documentation: See backend/docs/API_DOCUMENTATION.md"
}

# Set required environment variables
set_environment_variables() {
    log_info "Setting Edge Function secrets..."
    
    # Check if environment variables are set locally
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        log_warning "SUPABASE_SERVICE_ROLE_KEY not found in environment"
        log_info "You may need to set Edge Function secrets manually"
        return 1
    fi
    
    # Set secrets (this requires manual intervention in most cases)
    log_info "Note: Set these secrets in your Supabase dashboard:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - N8N_API_URL"
    echo "  - N8N_API_KEY"
    echo "  - OPENAI_API_KEY (optional fallback)"
    
    return 0
}

# Main script execution
main() {
    echo "🚀 Clixen MVP - Edge Functions Deployment"
    echo "========================================"
    echo ""
    
    # Parse command line arguments
    case "${1:-deploy}" in
        "check")
            check_requirements
            list_functions
            ;;
        "deploy")
            check_requirements
            
            if [ -n "$2" ]; then
                # Deploy specific function
                deploy_function "$2"
            else
                # Deploy all functions
                deploy_all_functions
            fi
            ;;
        "verify")
            verify_deployments
            ;;
        "urls")
            show_function_urls
            ;;
        "secrets")
            set_environment_variables
            ;;
        "all")
            check_requirements
            deploy_all_functions && verify_deployments
            show_function_urls
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command] [function_name]"
            echo ""
            echo "Commands:"
            echo "  check     - Check requirements and list functions"
            echo "  deploy    - Deploy all functions or specific function"
            echo "  verify    - Verify deployed functions are working"
            echo "  urls      - Show function URLs"
            echo "  secrets   - Guide for setting environment secrets"
            echo "  all       - Deploy all and verify (recommended)"
            echo "  help      - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Deploy all functions"
            echo "  $0 deploy projects-api  # Deploy specific function"
            echo "  $0 all                  # Deploy all and verify"
            echo "  $0 check                # Check status"
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"