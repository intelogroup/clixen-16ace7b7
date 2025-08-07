#!/bin/bash

# Clixen Production Operations Toolkit
# Comprehensive operations management for production systems

set -e

echo "🛠️ Clixen Production Operations Toolkit"
echo "======================================="
echo "Date: $(date)"
echo "Environment: ${ENVIRONMENT:-production}"
echo ""

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-zfbgdixbzezpxllkoyfc}"
EC2_HOST="${EC2_HOST:-18.221.12.50}"
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
                "text": "'"$emoji Clixen Operations $status"'",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Clixen Production Operations*\n'"$emoji Status: $status"'\n📝 '"$message"'\n🌐 Environment: '"$ENVIRONMENT"'\n🕐 Time: '"$(date)"'"
                        }
                    }
                ]
            }' || true
    fi
}

# System health check
system_health_check() {
    log "🏥 Running comprehensive system health check..."
    
    # Check health API endpoint
    local health_response=$(curl -s "$VITE_SUPABASE_URL/functions/v1/health-check?action=all" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" || echo '{"status": "error"}')
    
    local health_status=$(echo "$health_response" | jq -r '.status // "unknown"')
    
    echo "🔍 Health Check Results:"
    echo "========================"
    
    if [[ "$health_status" == "healthy" ]]; then
        success "System is healthy"
    elif [[ "$health_status" == "degraded" ]]; then
        warning "System is degraded"
        echo "$health_response" | jq '.alerts[]?' 2>/dev/null || true
    else
        error "System health check failed"
    fi
    
    # Check individual services
    local services=("frontend" "database" "n8n" "edge_functions")
    
    for service in "${services[@]}"; do
        case $service in
            "frontend")
                check_frontend_health
                ;;
            "database")
                check_database_health
                ;;
            "n8n")
                check_n8n_health
                ;;
            "edge_functions")
                check_edge_functions_health
                ;;
        esac
    done
    
    success "System health check completed"
}

# Check frontend health
check_frontend_health() {
    log "🌐 Checking frontend health..."
    
    local frontend_url
    if [[ "$ENVIRONMENT" == "production" ]]; then
        frontend_url="https://clixen.netlify.app"
    else
        frontend_url="https://staging--clixen.netlify.app"
    fi
    
    local status_code=$(curl -s -w "%{http_code}" -o /dev/null "$frontend_url" || echo "000")
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" "$frontend_url" || echo "0")
    
    if [[ "$status_code" == "200" ]]; then
        success "Frontend is healthy (${response_time}s response time)"
    else
        warning "Frontend health check failed (HTTP: $status_code)"
    fi
}

# Check database health
check_database_health() {
    log "🗄️ Checking database health..."
    
    # Test Supabase REST API
    local api_status=$(curl -s -w "%{http_code}" -o /dev/null \
        "$VITE_SUPABASE_URL/rest/v1/conversations?select=count" \
        -H "apikey: $VITE_SUPABASE_ANON_KEY" || echo "000")
    
    if [[ "$api_status" == "200" ]]; then
        success "Database API is healthy"
    else
        warning "Database API health check failed (HTTP: $api_status)"
    fi
    
    # Test direct database connection via Edge Function
    local db_test=$(curl -s "$VITE_SUPABASE_URL/functions/v1/health-check?action=detailed" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" | jq -r '.database.status // "unknown"')
    
    if [[ "$db_test" == "healthy" ]]; then
        success "Database connection is healthy"
    else
        warning "Database connection health check failed"
    fi
}

# Check n8n health
check_n8n_health() {
    log "🤖 Checking n8n health..."
    
    local n8n_status=$(curl -s -w "%{http_code}" -o /dev/null \
        "http://$EC2_HOST:5678/healthz" || echo "000")
    
    if [[ "$n8n_status" == "200" ]]; then
        success "n8n is healthy"
        
        # Check n8n API
        local api_status=$(curl -s -w "%{http_code}" -o /dev/null \
            "http://$EC2_HOST:5678/api/v1/workflows" \
            -H "X-N8N-API-KEY: $VITE_N8N_API_KEY" || echo "000")
        
        if [[ "$api_status" == "200" ]]; then
            success "n8n API is healthy"
        else
            warning "n8n API health check failed (HTTP: $api_status)"
        fi
    else
        warning "n8n health check failed (HTTP: $n8n_status)"
    fi
}

# Check Edge Functions health
check_edge_functions_health() {
    log "⚡ Checking Edge Functions health..."
    
    local functions=(
        "ai-chat-system"
        "api-operations"
        "monitoring-api"
        "health-check"
        "log-aggregator"
    )
    
    local failed_functions=()
    
    for func in "${functions[@]}"; do
        local func_status=$(curl -s -w "%{http_code}" -o /dev/null \
            "$VITE_SUPABASE_URL/functions/v1/$func" \
            -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            -d '{"action": "health_check"}' || echo "000")
        
        if [[ "$func_status" == "200" ]] || [[ "$func_status" == "405" ]]; then
            success "$func is healthy"
        else
            warning "$func health check failed (HTTP: $func_status)"
            failed_functions+=("$func")
        fi
    done
    
    if [[ ${#failed_functions[@]} -gt 0 ]]; then
        warning "Failed functions: ${failed_functions[*]}"
    fi
}

# Performance monitoring
performance_monitoring() {
    log "📊 Running performance monitoring..."
    
    # Get monitoring data
    local monitoring_data=$(curl -s "$VITE_SUPABASE_URL/functions/v1/monitoring-api" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "dashboard"}' || echo '{}')
    
    # Extract key metrics
    local error_rate=$(echo "$monitoring_data" | jq -r '.performance_metrics.response_time_p95 // 0')
    local response_time=$(echo "$monitoring_data" | jq -r '.performance_metrics.error_rate // 0')
    
    echo "🎯 Performance Metrics:"
    echo "======================"
    echo "Response Time P95: ${response_time}ms"
    echo "Error Rate: $(echo "$error_rate * 100" | bc -l 2>/dev/null || echo "$error_rate")%"
    
    # Check thresholds
    if (( $(echo "$response_time > 2000" | bc -l 2>/dev/null || echo "0") )); then
        warning "High response times detected (>${response_time}ms)"
    fi
    
    if (( $(echo "$error_rate > 0.05" | bc -l 2>/dev/null || echo "0") )); then
        warning "High error rate detected (>5%)"
    fi
    
    success "Performance monitoring completed"
}

# Resource monitoring
resource_monitoring() {
    log "💾 Checking system resources..."
    
    # Check EC2 instance resources
    if ssh -i ~/.ssh/clixen-key.pem -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
        ubuntu@$EC2_HOST "echo 'Connected'" > /dev/null 2>&1; then
        
        local resources=$(ssh -i ~/.ssh/clixen-key.pem ubuntu@$EC2_HOST \
            "df -h / | tail -1 | awk '{print \$5}' | sed 's/%//'; free | grep Mem | awk '{printf \"%.1f\", \$3/\$2 * 100}'; uptime | awk '{print \$3, \$4}' | sed 's/,//'")
        
        local disk_usage=$(echo "$resources" | head -1)
        local memory_usage=$(echo "$resources" | sed -n '2p')
        local uptime=$(echo "$resources" | tail -1)
        
        echo "🖥️ EC2 Instance Resources:"
        echo "========================="
        echo "Disk Usage: ${disk_usage}%"
        echo "Memory Usage: ${memory_usage}%"
        echo "Uptime: $uptime"
        
        # Check resource thresholds
        if [[ "$disk_usage" -gt 85 ]]; then
            warning "High disk usage: ${disk_usage}%"
        fi
        
        if [[ "${memory_usage%.*}" -gt 85 ]]; then
            warning "High memory usage: ${memory_usage}%"
        fi
        
        # Check Docker containers
        local containers=$(ssh -i ~/.ssh/clixen-key.pem ubuntu@$EC2_HOST \
            "sudo docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -v NAMES")
        
        echo ""
        echo "🐳 Docker Containers:"
        echo "===================="
        echo "$containers"
        
    else
        warning "Unable to connect to EC2 instance for resource monitoring"
    fi
}

# Log analysis
log_analysis() {
    log "📝 Running log analysis..."
    
    local log_data=$(curl -s "$VITE_SUPABASE_URL/functions/v1/log-aggregator" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "analyze", "timeframe": "1h"}' || echo '{}')
    
    local total_logs=$(echo "$log_data" | jq -r '.analysis.total_logs // 0')
    local error_rate=$(echo "$log_data" | jq -r '.analysis.error_rate // 0')
    local top_errors=$(echo "$log_data" | jq -c '.analysis.top_errors[0:3] // []')
    
    echo "📊 Log Analysis (Last Hour):"
    echo "============================"
    echo "Total Logs: $total_logs"
    echo "Error Rate: $(echo "$error_rate * 100" | bc -l 2>/dev/null || echo "$error_rate")%"
    
    if [[ "$top_errors" != "[]" ]]; then
        echo ""
        echo "Top Errors:"
        echo "$top_errors" | jq -r '.[] | "- \(.message) (\(.count) times)"' 2>/dev/null || echo "No error details available"
    fi
    
    success "Log analysis completed"
}

# Backup operations
backup_operations() {
    log "💾 Running backup operations..."
    
    # Database backup (using Supabase CLI or pg_dump)
    log "Creating database backup..."
    
    # Create backup directory
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Export critical data
    local tables=("conversations" "projects" "workflows" "users" "monitoring_metrics")
    
    for table in "${tables[@]}"; do
        log "Backing up $table..."
        
        local backup_file="$backup_dir/${table}.json"
        curl -s "$VITE_SUPABASE_URL/rest/v1/$table" \
            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
            -H "Content-Type: application/json" \
            > "$backup_file" || warning "Failed to backup $table"
        
        if [[ -f "$backup_file" ]] && [[ -s "$backup_file" ]]; then
            success "Backed up $table ($(wc -l < "$backup_file") records)"
        else
            warning "Backup for $table is empty or failed"
        fi
    done
    
    # Create configuration backup
    log "Backing up configuration..."
    
    cat > "$backup_dir/config.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "environment": "$ENVIRONMENT",
    "supabase_url": "$VITE_SUPABASE_URL",
    "n8n_url": "$VITE_N8N_API_URL",
    "ec2_host": "$EC2_HOST"
}
EOF
    
    success "Backup operations completed: $backup_dir"
}

# Security check
security_check() {
    log "🔒 Running security check..."
    
    # Check for exposed secrets
    log "Checking for exposed secrets..."
    
    local secret_patterns=(
        "sk-[A-Za-z0-9]{20,}"  # OpenAI API keys
        "eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*"  # JWT tokens
        "AKIA[0-9A-Z]{16}"  # AWS access keys
    )
    
    for pattern in "${secret_patterns[@]}"; do
        if grep -r "$pattern" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" \
           --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -5; then
            warning "Potential secrets found in code - please review"
        fi
    done
    
    # Check SSL/TLS certificates
    log "Checking SSL certificates..."
    
    local domains=("clixen.netlify.app" "zfbgdixbzezpxllkoyfc.supabase.co")
    
    for domain in "${domains[@]}"; do
        local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null \
            | openssl x509 -noout -dates 2>/dev/null || echo "Certificate check failed")
        
        if echo "$cert_info" | grep -q "notAfter"; then
            local expiry=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
            success "$domain SSL certificate valid until: $expiry"
        else
            warning "$domain SSL certificate check failed"
        fi
    done
    
    success "Security check completed"
}

# Cleanup operations
cleanup_operations() {
    log "🧹 Running cleanup operations..."
    
    # Clean old logs
    log "Cleaning old application logs..."
    
    local cleanup_response=$(curl -s "$VITE_SUPABASE_URL/rest/v1/application_logs" \
        -X DELETE \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -G -d "timestamp=lt.$(date -d '30 days ago' -u +%Y-%m-%dT%H:%M:%S.%3NZ)" || echo "cleanup failed")
    
    if [[ "$cleanup_response" != "cleanup failed" ]]; then
        success "Cleaned logs older than 30 days"
    else
        warning "Log cleanup failed"
    fi
    
    # Clean old monitoring metrics
    log "Cleaning old monitoring metrics..."
    
    local metrics_cleanup=$(curl -s "$VITE_SUPABASE_URL/rest/v1/monitoring_metrics" \
        -X DELETE \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -G -d "timestamp=lt.$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%S.%3NZ)" || echo "cleanup failed")
    
    if [[ "$metrics_cleanup" != "cleanup failed" ]]; then
        success "Cleaned metrics older than 7 days"
    else
        warning "Metrics cleanup failed"
    fi
    
    success "Cleanup operations completed"
}

# Usage information
usage() {
    echo "Usage: $0 [health|performance|resources|logs|backup|security|cleanup|all]"
    echo ""
    echo "Operations:"
    echo "  health      - Comprehensive system health check"
    echo "  performance - Performance monitoring and analysis"
    echo "  resources   - System resource monitoring"
    echo "  logs        - Log analysis and insights"
    echo "  backup      - Backup critical data and configuration"
    echo "  security    - Security check and validation"
    echo "  cleanup     - Cleanup old data and logs"
    echo "  all         - Run all operations (default)"
    echo ""
    echo "Environment variables:"
    echo "  ENVIRONMENT         - Target environment (production/staging)"
    echo "  SUPABASE_PROJECT_REF - Supabase project reference"
    echo "  EC2_HOST            - EC2 instance hostname"
    echo "  SLACK_WEBHOOK_URL   - Slack webhook for notifications"
    echo ""
    exit 1
}

# Main function
main() {
    local operation="${1:-all}"
    local start_time=$(date +%s)
    
    send_notification "STARTED" "Production operations started: $operation" "🛠️"
    
    case $operation in
        "health")
            system_health_check
            ;;
        "performance")
            performance_monitoring
            ;;
        "resources")
            resource_monitoring
            ;;
        "logs")
            log_analysis
            ;;
        "backup")
            backup_operations
            ;;
        "security")
            security_check
            ;;
        "cleanup")
            cleanup_operations
            ;;
        "all")
            system_health_check
            performance_monitoring
            resource_monitoring
            log_analysis
            backup_operations
            security_check
            cleanup_operations
            ;;
        "-h"|"--help"|"help")
            usage
            ;;
        *)
            error "Invalid operation: $operation"
            ;;
    esac
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "📋 Operations Summary"
    echo "===================="
    echo "✅ Operation: $operation"
    echo "✅ Environment: $ENVIRONMENT"
    echo "✅ Duration: ${duration}s"
    echo "✅ Status: Completed"
    echo ""
    
    send_notification "COMPLETED" "Production operations completed: $operation (${duration}s)" "✅"
    success "🎉 Production operations completed successfully!"
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

# Setup SSH key if available
if [[ -n "$EC2_PEM_KEY" ]]; then
    mkdir -p ~/.ssh
    echo "$EC2_PEM_KEY" > ~/.ssh/clixen-key.pem
    chmod 600 ~/.ssh/clixen-key.pem
fi

# Run main function
main "$@"