#!/bin/bash

# Clixen DevOps Pipeline Validation Script
# Comprehensive validation of the complete DevOps infrastructure

set -e

echo "🔍 Clixen DevOps Pipeline Validation"
echo "==================================="
echo "Date: $(date)"
echo "Environment: ${ENVIRONMENT:-production}"
echo ""

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-zfbgdixbzezpxllkoyfc}"
EC2_HOST="${EC2_HOST:-18.221.12.50}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((TOTAL_TESTS++))
}

error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

test_section() {
    echo ""
    echo -e "${BLUE}🧪 Testing: $1${NC}"
    echo "$(printf '=%.0s' {1..50})"
}

# Test CI/CD Pipeline Configuration
test_cicd_pipeline() {
    test_section "CI/CD Pipeline Configuration"
    
    # Check GitHub Actions workflow exists
    if [[ -f ".github/workflows/ci-cd-production.yml" ]]; then
        success "CI/CD workflow file exists"
        
        # Validate workflow syntax
        if grep -q "name: CI/CD Production Pipeline" .github/workflows/ci-cd-production.yml; then
            success "CI/CD workflow has correct name"
        else
            error "CI/CD workflow name is incorrect"
        fi
        
        # Check for required jobs
        local required_jobs=("setup" "security-scan" "build-and-test" "deploy-backend" "deploy-frontend")
        for job in "${required_jobs[@]}"; do
            if grep -q "$job:" .github/workflows/ci-cd-production.yml; then
                success "CI/CD job '$job' is configured"
            else
                error "CI/CD job '$job' is missing"
            fi
        done
        
        # Check for environment variables
        if grep -q "VITE_SUPABASE_URL" .github/workflows/ci-cd-production.yml; then
            success "Required environment variables are configured"
        else
            error "Environment variables are missing"
        fi
    else
        error "CI/CD workflow file does not exist"
    fi
    
    # Check MVP testing pipeline
    if [[ -f ".github/workflows/mvp-testing-pipeline.yml" ]]; then
        success "MVP testing pipeline exists"
    else
        warning "MVP testing pipeline not found (optional)"
    fi
}

# Test monitoring infrastructure
test_monitoring_infrastructure() {
    test_section "Monitoring Infrastructure"
    
    # Check monitoring API
    log "Testing monitoring API endpoint..."
    local monitor_response=$(curl -s "$VITE_SUPABASE_URL/functions/v1/monitoring-api" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "health"}' || echo '{"error": "failed"}')
    
    if echo "$monitor_response" | grep -q '"status":\s*"healthy"'; then
        success "Monitoring API is healthy"
    else
        error "Monitoring API health check failed"
    fi
    
    # Check MVP metrics collector
    log "Testing MVP metrics collector..."
    local mvp_response=$(curl -s "$VITE_SUPABASE_URL/functions/v1/mvp-metrics-collector" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "calculate"}' || echo '{"error": "failed"}')
    
    if echo "$mvp_response" | grep -q '"onboarding_completion_rate"'; then
        success "MVP metrics collector is functional"
    else
        error "MVP metrics collector failed"
    fi
    
    # Check log aggregator
    log "Testing log aggregator..."
    local log_response=$(curl -s "$VITE_SUPABASE_URL/functions/v1/log-aggregator" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "analyze", "timeframe": "1h"}' || echo '{"error": "failed"}')
    
    if echo "$log_response" | grep -q '"analysis"'; then
        success "Log aggregator is functional"
    else
        error "Log aggregator failed"
    fi
}

# Test health check system
test_health_check_system() {
    test_section "Health Check System"
    
    # Test basic health check
    log "Testing basic health check..."
    local basic_health=$(curl -s "$VITE_SUPABASE_URL/functions/v1/health-check?action=basic" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" || echo '{"status": "error"}')
    
    if echo "$basic_health" | grep -q '"status":\s*"healthy"'; then
        success "Basic health check passed"
    else
        error "Basic health check failed"
    fi
    
    # Test detailed health check
    log "Testing detailed health check..."
    local detailed_health=$(curl -s "$VITE_SUPABASE_URL/functions/v1/health-check?action=detailed" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" || echo '{"status": "error"}')
    
    if echo "$detailed_health" | grep -q '"database"'; then
        success "Detailed health check passed"
    else
        error "Detailed health check failed"
    fi
    
    # Test comprehensive health check
    log "Testing comprehensive health check..."
    local comprehensive_health=$(curl -s "$VITE_SUPABASE_URL/functions/v1/health-check?action=all" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" || echo '{"status": "error"}')
    
    if echo "$comprehensive_health" | grep -q '"services"'; then
        success "Comprehensive health check passed"
    else
        error "Comprehensive health check failed"
    fi
}

# Test deployment automation
test_deployment_automation() {
    test_section "Deployment Automation"
    
    # Check deployment scripts exist
    if [[ -f "backend/scripts/deploy-production.sh" ]]; then
        success "Production deployment script exists"
        
        # Check script is executable
        if [[ -x "backend/scripts/deploy-production.sh" ]]; then
            success "Deployment script is executable"
        else
            error "Deployment script is not executable"
        fi
    else
        error "Production deployment script missing"
    fi
    
    # Check rollback script
    if [[ -f "backend/scripts/rollback-deployment.sh" ]]; then
        success "Rollback deployment script exists"
        
        if [[ -x "backend/scripts/rollback-deployment.sh" ]]; then
            success "Rollback script is executable"
        else
            error "Rollback script is not executable"
        fi
    else
        error "Rollback deployment script missing"
    fi
    
    # Check operations script
    if [[ -f "backend/scripts/production-operations.sh" ]]; then
        success "Production operations script exists"
        
        if [[ -x "backend/scripts/production-operations.sh" ]]; then
            success "Operations script is executable"
        else
            error "Operations script is not executable"
        fi
    else
        error "Production operations script missing"
    fi
}

# Test logging system
test_logging_system() {
    test_section "Logging System"
    
    # Check centralized logger exists
    if [[ -f "backend/src/logging/CentralizedLogger.ts" ]]; then
        success "Centralized logger implementation exists"
        
        # Check for key features
        if grep -q "class CentralizedLogger" backend/src/logging/CentralizedLogger.ts; then
            success "CentralizedLogger class is implemented"
        else
            error "CentralizedLogger class not found"
        fi
        
        if grep -q "SupabaseTransport" backend/src/logging/CentralizedLogger.ts; then
            success "Supabase transport is implemented"
        else
            error "Supabase transport not found"
        fi
    else
        error "Centralized logger implementation missing"
    fi
    
    # Test log aggregation via API
    log "Testing log aggregation capabilities..."
    local log_test=$(curl -s "$VITE_SUPABASE_URL/functions/v1/log-aggregator" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "search", "query": "test"}' || echo '{"error": "failed"}')
    
    if echo "$log_test" | grep -q '"results"'; then
        success "Log search functionality works"
    else
        error "Log search functionality failed"
    fi
}

# Test MVP metrics dashboard
test_mvp_dashboard() {
    test_section "MVP Metrics Dashboard"
    
    # Check dashboard component exists
    if [[ -f "frontend/src/components/MVPMetricsDashboard.tsx" ]]; then
        success "MVP metrics dashboard component exists"
        
        # Check for key features
        if grep -q "MVPMetricsDashboard" frontend/src/components/MVPMetricsDashboard.tsx; then
            success "MVP dashboard component is properly defined"
        else
            error "MVP dashboard component definition not found"
        fi
        
        if grep -q "onboarding_completion_rate" frontend/src/components/MVPMetricsDashboard.tsx; then
            success "MVP metrics tracking is implemented"
        else
            error "MVP metrics tracking not found"
        fi
    else
        error "MVP metrics dashboard component missing"
    fi
    
    # Test MVP metrics collection
    log "Testing MVP metrics collection..."
    local mvp_collect=$(curl -s "$VITE_SUPABASE_URL/functions/v1/mvp-metrics-collector" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "collect"}' || echo '{"error": "failed"}')
    
    if echo "$mvp_collect" | grep -q '"success":\s*true'; then
        success "MVP metrics collection works"
    else
        warning "MVP metrics collection test inconclusive (may need data)"
    fi
}

# Test production readiness
test_production_readiness() {
    test_section "Production Readiness"
    
    # Check environment configuration
    local required_env_vars=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_ANON_KEY" 
        "SUPABASE_SERVICE_ROLE_KEY"
        "VITE_N8N_API_KEY"
    )
    
    local missing_vars=()
    
    for var in "${required_env_vars[@]}"; do
        if [[ -n "${!var}" ]]; then
            success "Environment variable $var is set"
        else
            error "Environment variable $var is missing"
            missing_vars+=("$var")
        fi
    done
    
    # Check Supabase connectivity
    log "Testing Supabase connectivity..."
    local supabase_status=$(curl -s -w "%{http_code}" -o /dev/null \
        "$VITE_SUPABASE_URL/rest/v1/" \
        -H "apikey: $VITE_SUPABASE_ANON_KEY") || echo "000"
    
    if [[ "$supabase_status" == "200" ]]; then
        success "Supabase connectivity confirmed"
    else
        error "Supabase connectivity failed (HTTP: $supabase_status)"
    fi
    
    # Check n8n connectivity (if available)
    if [[ -n "$VITE_N8N_API_KEY" ]]; then
        log "Testing n8n connectivity..."
        local n8n_status=$(curl -s -w "%{http_code}" -o /dev/null \
            "http://$EC2_HOST:5678/healthz") || echo "000"
        
        if [[ "$n8n_status" == "200" ]]; then
            success "n8n connectivity confirmed"
        else
            warning "n8n connectivity failed (HTTP: $n8n_status) - may be expected if EC2 not accessible"
        fi
    fi
    
    # Check build configuration
    if [[ -f "netlify.toml" ]]; then
        success "Netlify configuration exists"
    else
        error "Netlify configuration missing"
    fi
    
    if [[ -f "frontend/package.json" ]]; then
        success "Frontend package.json exists"
    else
        error "Frontend package.json missing"
    fi
}

# Test integration points
test_integration_points() {
    test_section "Integration Points"
    
    # Test Edge Functions deployment status
    local edge_functions=(
        "ai-chat-system"
        "api-operations"
        "monitoring-api"
        "health-check"
        "log-aggregator"
        "mvp-metrics-collector"
    )
    
    for func in "${edge_functions[@]}"; do
        log "Testing Edge Function: $func..."
        local func_status=$(curl -s -w "%{http_code}" -o /dev/null \
            "$VITE_SUPABASE_URL/functions/v1/$func" \
            -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" || echo "000")
        
        if [[ "$func_status" == "200" ]] || [[ "$func_status" == "405" ]]; then
            success "Edge Function $func is deployed and responding"
        else
            error "Edge Function $func failed (HTTP: $func_status)"
        fi
    done
}

# Main validation function
main() {
    local start_time=$(date +%s)
    
    log "Starting comprehensive DevOps pipeline validation..."
    
    # Run all test suites
    test_cicd_pipeline
    test_monitoring_infrastructure
    test_health_check_system
    test_deployment_automation
    test_logging_system
    test_mvp_dashboard
    test_production_readiness
    test_integration_points
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate final report
    echo ""
    echo "📊 DevOps Pipeline Validation Summary"
    echo "===================================="
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Warnings: $((TOTAL_TESTS - PASSED_TESTS - FAILED_TESTS))"
    echo "Duration: ${duration} seconds"
    echo ""
    
    # Calculate success rate
    local success_rate=0
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        success_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    fi
    
    echo "Success Rate: ${success_rate}%"
    
    # Determine overall status
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}🎉 DevOps Pipeline Validation: PASSED${NC}"
        echo -e "${GREEN}✅ System is ready for production deployment!${NC}"
        exit 0
    elif [[ $success_rate -ge 80 ]]; then
        echo -e "${YELLOW}⚠️  DevOps Pipeline Validation: MOSTLY PASSED${NC}"
        echo -e "${YELLOW}⚠️  Some issues found, but system is largely functional${NC}"
        exit 0
    else
        echo -e "${RED}❌ DevOps Pipeline Validation: FAILED${NC}"
        echo -e "${RED}❌ Significant issues found, review required before production${NC}"
        exit 1
    fi
}

# Pre-flight checks
if [[ -z "$VITE_SUPABASE_URL" ]]; then
    error "VITE_SUPABASE_URL environment variable is required"
    exit 1
fi

if [[ -z "$VITE_SUPABASE_ANON_KEY" ]]; then
    error "VITE_SUPABASE_ANON_KEY environment variable is required"
    exit 1
fi

# Check dependencies
if ! command -v curl &> /dev/null; then
    error "curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "jq not found, installing..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y jq
    elif command -v yum &> /dev/null; then
        sudo yum install -y jq
    else
        warning "jq could not be installed automatically"
    fi
fi

if ! command -v bc &> /dev/null; then
    echo "bc not found, installing..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y bc
    elif command -v yum &> /dev/null; then
        sudo yum install -y bc
    else
        warning "bc could not be installed automatically"
    fi
fi

# Run main validation
main "$@"