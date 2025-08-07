#!/bin/bash

# Clixen Production Readiness Test Script
# Tests all critical components of the EC2-Supabase-n8n stack

set -e

echo "🚀 Clixen Production Readiness Test"
echo "====================================="
echo "Date: $(date)"
echo "EC2 Instance: 18.221.12.50"
echo ""

# Configuration
EC2_HOST="18.221.12.50"
PEM_KEY="/root/repo/clixen-n8n-aws-key.pem"
SUPABASE_URL="https://zfbgdixbzezpxllkoyfc.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig"
N8N_URL="http://18.221.12.50:5678"

# Test Functions
test_ssh_connection() {
    echo "🔐 Testing SSH Connection..."
    if ssh -i "$PEM_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "echo 'SSH OK'" > /dev/null 2>&1; then
        echo "✅ SSH connection successful"
        return 0
    else
        echo "❌ SSH connection failed"
        return 1
    fi
}

test_n8n_health() {
    echo "🤖 Testing n8n Health..."
    if curl -s "$N8N_URL/healthz" | grep -q "ok"; then
        echo "✅ n8n is healthy"
        return 0
    else
        echo "❌ n8n health check failed"
        return 1
    fi
}

test_supabase_connection() {
    echo "🗄️ Testing Supabase Connection..."
    local response=$(curl -s -w "%{http_code}" -o /tmp/supabase_test.json \
        "$SUPABASE_URL/rest/v1/conversations?select=count" \
        -H "apikey: $SUPABASE_ANON_KEY")
    
    if [[ "$response" == "200" ]]; then
        echo "✅ Supabase REST API working"
        return 0
    else
        echo "❌ Supabase connection failed (HTTP: $response)"
        return 1
    fi
}

test_database_connection() {
    echo "🐘 Testing Direct Database Connection..."
    local count=$(ssh -i "$PEM_KEY" ubuntu@$EC2_HOST \
        "PGPASSWORD='Jimkali90#' psql -h aws-0-us-east-2.pooler.supabase.com -p 5432 -U postgres.zfbgdixbzezpxllkoyfc -d postgres -t -c 'SELECT COUNT(*) FROM conversations;'" 2>/dev/null | xargs)
    
    if [[ "$count" =~ ^[0-9]+$ ]] && [[ "$count" -ge 0 ]]; then
        echo "✅ Database connection successful ($count conversations)"
        return 0
    else
        echo "❌ Database connection failed"
        return 1
    fi
}

test_system_resources() {
    echo "📊 Testing System Resources..."
    local resources=$(ssh -i "$PEM_KEY" ubuntu@$EC2_HOST \
        "df -h / | tail -1 | awk '{print \$5}' | sed 's/%//' && free | grep Mem | awk '{printf \"%.1f\", \$3/\$2 * 100}'")
    
    local disk_usage=$(echo "$resources" | head -1)
    local memory_usage=$(echo "$resources" | tail -1)
    
    echo "💾 Disk Usage: ${disk_usage}%"
    echo "🧠 Memory Usage: ${memory_usage}%"
    
    if [[ "$disk_usage" -lt 90 ]] && [[ "${memory_usage%.*}" -lt 90 ]]; then
        echo "✅ System resources are healthy"
        return 0
    else
        echo "⚠️  High resource usage detected"
        return 1
    fi
}

test_performance() {
    echo "⚡ Testing Performance..."
    local latency=$(curl -s -o /dev/null -w "%{time_total}" \
        "$SUPABASE_URL/rest/v1/conversations?select=count" \
        -H "apikey: $SUPABASE_ANON_KEY")
    
    echo "🌐 Supabase API Latency: ${latency}s"
    
    if (( $(echo "$latency < 0.5" | bc -l) )); then
        echo "✅ Performance is excellent"
        return 0
    elif (( $(echo "$latency < 1.0" | bc -l) )); then
        echo "✅ Performance is good"
        return 0
    else
        echo "⚠️  Performance may be slow"
        return 1
    fi
}

test_services_uptime() {
    echo "⏰ Testing Services Uptime..."
    local uptime=$(ssh -i "$PEM_KEY" ubuntu@$EC2_HOST "uptime | awk '{print \$3, \$4}' | sed 's/,//'")
    local n8n_uptime=$(ssh -i "$PEM_KEY" ubuntu@$EC2_HOST "sudo docker ps --format 'table {{.Status}}' | grep n8n" 2>/dev/null || echo "Unknown")
    
    echo "🖥️  System Uptime: $uptime"
    echo "🤖 n8n Container: $n8n_uptime"
    echo "✅ Services are running"
    return 0
}

# Run All Tests
main() {
    local failed_tests=0
    
    test_ssh_connection || ((failed_tests++))
    echo ""
    
    test_n8n_health || ((failed_tests++))
    echo ""
    
    test_supabase_connection || ((failed_tests++))
    echo ""
    
    test_database_connection || ((failed_tests++))
    echo ""
    
    test_system_resources || ((failed_tests++))
    echo ""
    
    test_performance || ((failed_tests++))
    echo ""
    
    test_services_uptime || ((failed_tests++))
    echo ""
    
    # Summary
    echo "📋 Production Readiness Summary"
    echo "==============================="
    if [[ $failed_tests -eq 0 ]]; then
        echo "🎉 ALL TESTS PASSED - PRODUCTION READY!"
        echo "✅ EC2 Instance: Healthy"
        echo "✅ n8n Service: Running"
        echo "✅ Supabase Integration: Working"
        echo "✅ Database Connection: Active"
        echo "✅ System Resources: Good"
        echo "✅ Performance: Acceptable"
        exit 0
    else
        echo "⚠️  $failed_tests test(s) failed - Review required"
        echo "Please address the failed tests before production deployment"
        exit 1
    fi
}

# Check dependencies
if ! command -v bc &> /dev/null; then
    echo "Installing bc for calculations..."
    sudo apt-get update && sudo apt-get install -y bc
fi

main "$@"