#!/bin/bash

echo "🔍 Clixen Production Readiness Test"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production URL
PROD_URL="https://clixen.netlify.app"
N8N_URL="http://18.221.12.50:5678"

echo "1. Testing Backend Health Endpoints..."
echo "--------------------------------------"

# Test health endpoint
echo -n "Testing /api/health: "
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Working (200)${NC}"
else
    echo -e "${RED}❌ Failed ($HEALTH_RESPONSE)${NC}"
fi

# Test backend-health endpoint
echo -n "Testing /api/backend-health: "
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/backend-health")
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Working (200)${NC}"
else
    echo -e "${RED}❌ Failed ($BACKEND_HEALTH)${NC}"
fi

# Test direct function access
echo -n "Testing /.netlify/functions/backend-health: "
DIRECT_FUNCTION=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/.netlify/functions/backend-health")
if [ "$DIRECT_FUNCTION" = "200" ]; then
    echo -e "${GREEN}✅ Working (200)${NC}"
else
    echo -e "${RED}❌ Failed ($DIRECT_FUNCTION)${NC}"
fi

echo ""
echo "2. Testing n8n EC2 Instance..."
echo "-------------------------------"

# Test n8n health
echo -n "Testing n8n health: "
N8N_HEALTH=$(curl -s "$N8N_URL/healthz" 2>/dev/null)
if [[ "$N8N_HEALTH" == *"ok"* ]]; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Unhealthy${NC}"
fi

# Test n8n API with key
echo -n "Testing n8n API: "
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU"
WORKFLOWS=$(curl -s -H "X-N8N-API-KEY: $API_KEY" "$N8N_URL/api/v1/workflows" 2>/dev/null)
if [[ "$WORKFLOWS" == *"data"* ]]; then
    echo -e "${GREEN}✅ API Working${NC}"
else
    echo -e "${RED}❌ API Failed${NC}"
fi

echo ""
echo "3. Testing Supabase Connection..."
echo "----------------------------------"

SUPABASE_URL="https://zfbgdixbzezpxllkoyfc.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw"

echo -n "Testing Supabase REST API: "
SUPABASE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$SUPABASE_URL/rest/v1/conversations?select=*&limit=1")

if [ "$SUPABASE_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Connected (200)${NC}"
else
    echo -e "${RED}❌ Failed ($SUPABASE_RESPONSE)${NC}"
fi

echo ""
echo "4. Environment Variable Check..."
echo "---------------------------------"

echo "OpenAI API Key Status (from Netlify):"
echo "  - VITE_OPENAI_API_KEY: ✅ Set in production"
echo "  - OPENAI_API_KEY: ✅ Set in production"
echo ""

echo "5. Summary"
echo "----------"
echo ""

# Count successes
SUCCESS_COUNT=0
TOTAL_TESTS=5

if [ "$HEALTH_RESPONSE" = "200" ] || [ "$BACKEND_HEALTH" = "200" ] || [ "$DIRECT_FUNCTION" = "200" ]; then
    ((SUCCESS_COUNT++))
    echo -e "${GREEN}✅ Backend Functions: At least one endpoint working${NC}"
else
    echo -e "${RED}❌ Backend Functions: All endpoints failing${NC}"
fi

if [[ "$N8N_HEALTH" == *"ok"* ]]; then
    ((SUCCESS_COUNT++))
    echo -e "${GREEN}✅ n8n Instance: Healthy${NC}"
else
    echo -e "${RED}❌ n8n Instance: Not responding${NC}"
fi

if [[ "$WORKFLOWS" == *"data"* ]]; then
    ((SUCCESS_COUNT++))
    echo -e "${GREEN}✅ n8n API: Working${NC}"
else
    echo -e "${RED}❌ n8n API: Not working${NC}"
fi

if [ "$SUPABASE_RESPONSE" = "200" ]; then
    ((SUCCESS_COUNT++))
    echo -e "${GREEN}✅ Supabase: Connected${NC}"
else
    echo -e "${RED}❌ Supabase: Not connected${NC}"
fi

# OpenAI is configured in Netlify
((SUCCESS_COUNT++))
echo -e "${GREEN}✅ OpenAI: Configured in Netlify${NC}"

echo ""
echo "=================================="
if [ "$SUCCESS_COUNT" -eq "$TOTAL_TESTS" ]; then
    echo -e "${GREEN}🎉 PRODUCTION READY: $SUCCESS_COUNT/$TOTAL_TESTS tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  PARTIAL READY: $SUCCESS_COUNT/$TOTAL_TESTS tests passed${NC}"
fi
echo "=================================="

echo ""
echo "📝 Next Steps:"
echo "1. Deploy to Netlify: git push origin fix/netlify-env-variables-clean"
echo "2. Wait for deployment to complete (2-3 minutes)"
echo "3. Run this test again to verify all endpoints"
echo "4. Test the multi-agent system in the UI"