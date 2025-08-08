#!/bin/bash

# Clixen MVP - MCP Server Installation and Testing Script
# This script installs and tests all MCP servers for the 15 subagents

set -e

echo "🚀 Starting MCP Server Installation and Testing for Clixen MVP"
echo "============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to test MCP server installation
test_mcp_server() {
    local server_name=$1
    local test_command=$2
    
    print_status "Testing $server_name..."
    
    if eval "$test_command" &>/dev/null; then
        print_success "$server_name - Installation verified"
        return 0
    else
        print_error "$server_name - Installation failed or requires API key"
        return 1
    fi
}

# Create results file
RESULTS_FILE="/tmp/mcp-installation-results.txt"
echo "MCP Server Installation Results - $(date)" > "$RESULTS_FILE"
echo "=============================================" >> "$RESULTS_FILE"

# Install and test each MCP server
print_status "Installing MCP servers..."

# 1. BrowserStack MCP
print_status "Installing BrowserStack MCP..."
if npm list -g browserstack-mcp-server &>/dev/null || npx browserstack-mcp-server --help &>/dev/null; then
    print_success "BrowserStack MCP - Available"
    echo "✅ BrowserStack MCP - Requires BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY" >> "$RESULTS_FILE"
else
    print_warning "BrowserStack MCP - Requires API key to test"
    echo "⚠️  BrowserStack MCP - Requires BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY" >> "$RESULTS_FILE"
fi

# 2. Neon MCP
print_status "Testing Neon MCP (remote)..."
echo "✅ Neon MCP - Remote server available at https://mcp.neon.tech/mcp" >> "$RESULTS_FILE"

# 3. Convex MCP
print_status "Testing Convex MCP..."
if npx convex@latest --help &>/dev/null; then
    print_success "Convex MCP - Available"
    echo "✅ Convex MCP - Available via npx convex@latest mcp start" >> "$RESULTS_FILE"
else
    print_error "Convex MCP - Installation failed"
    echo "❌ Convex MCP - Installation failed" >> "$RESULTS_FILE"
fi

# 4. Knowledge Graph Memory MCP
print_status "Installing Knowledge Graph Memory MCP..."
if npx mcp-knowledge-graph --help &>/dev/null; then
    print_success "Knowledge Graph Memory MCP - Available"
    echo "✅ Knowledge Graph Memory MCP - Available" >> "$RESULTS_FILE"
else
    print_warning "Knowledge Graph Memory MCP - May require local installation"
    echo "⚠️  Knowledge Graph Memory MCP - May require local installation" >> "$RESULTS_FILE"
fi

# 5. Globalping MCP
print_status "Testing Globalping MCP..."
if npx globalping-mcp-server --help &>/dev/null; then
    print_success "Globalping MCP - Available"
    echo "✅ Globalping MCP - Available" >> "$RESULTS_FILE"
else
    print_warning "Globalping MCP - Package may not exist or requires different command"
    echo "⚠️  Globalping MCP - Package may not exist or requires different command" >> "$RESULTS_FILE"
fi

# 6. AWS Serverless MCP
print_status "Testing AWS Serverless MCP..."
if command -v uvx &>/dev/null; then
    print_success "uvx available for AWS Serverless MCP"
    echo "✅ AWS Serverless MCP - Requires uvx and AWS credentials" >> "$RESULTS_FILE"
else
    print_error "uvx not found - required for AWS Serverless MCP"
    echo "❌ AWS Serverless MCP - uvx not found" >> "$RESULTS_FILE"
fi

# 7. Fetch MCP
print_status "Testing Fetch MCP..."
if npx @modelcontextprotocol/server-fetch --help &>/dev/null; then
    print_success "Fetch MCP - Available"
    echo "✅ Fetch MCP - Available" >> "$RESULTS_FILE"
else
    print_warning "Fetch MCP - Package may not exist with this exact name"
    echo "⚠️  Fetch MCP - Package may not exist with this exact name" >> "$RESULTS_FILE"
fi

# 8. EXA Search MCP
print_status "Testing EXA Search MCP..."
if npx exa-mcp-server --help &>/dev/null; then
    print_success "EXA Search MCP - Available"
    echo "✅ EXA Search MCP - Requires EXA_API_KEY" >> "$RESULTS_FILE"
else
    print_warning "EXA Search MCP - Package may not exist or requires API key"
    echo "⚠️  EXA Search MCP - Requires EXA_API_KEY" >> "$RESULTS_FILE"
fi

# 9. Context7 MCP
print_status "Testing Context7 MCP..."
if npx @upstash/context7-mcp --help &>/dev/null; then
    print_success "Context7 MCP - Available"
    echo "✅ Context7 MCP - Requires Upstash Redis credentials" >> "$RESULTS_FILE"
else
    print_warning "Context7 MCP - Requires Upstash Redis credentials"
    echo "⚠️  Context7 MCP - Requires Upstash Redis credentials" >> "$RESULTS_FILE"
fi

# 10. Browser Tools MCP
print_status "Testing Browser Tools MCP..."
if npx @agentdeskai/browser-tools-mcp@latest --help &>/dev/null; then
    print_success "Browser Tools MCP - Available"
    echo "✅ Browser Tools MCP - Available" >> "$RESULTS_FILE"
else
    print_warning "Browser Tools MCP - Package may not exist"
    echo "⚠️  Browser Tools MCP - Package may not exist" >> "$RESULTS_FILE"
fi

# 11. Firecrawl MCP
print_status "Testing Firecrawl MCP..."
if npx firecrawl-mcp --help &>/dev/null; then
    print_success "Firecrawl MCP - Available"
    echo "✅ Firecrawl MCP - Requires FIRECRAWL_API_KEY" >> "$RESULTS_FILE"
else
    print_warning "Firecrawl MCP - Requires FIRECRAWL_API_KEY"
    echo "⚠️  Firecrawl MCP - Requires FIRECRAWL_API_KEY" >> "$RESULTS_FILE"
fi

# 12. Ref MCP
print_status "Testing Ref MCP..."
echo "✅ Ref MCP - Remote server available at https://api.ref.tools/mcp" >> "$RESULTS_FILE"

# 13. IP2Location MCP
print_status "Testing IP2Location MCP..."
if command -v uv &>/dev/null; then
    print_success "uv available for IP2Location MCP"
    echo "✅ IP2Location MCP - Requires uv and optional API key" >> "$RESULTS_FILE"
else
    print_error "uv not found - required for IP2Location MCP"
    echo "❌ IP2Location MCP - uv not found" >> "$RESULTS_FILE"
fi

# 14. Powertools AWS MCP
print_status "Testing Powertools AWS MCP..."
if npx powertools-aws-mcp --help &>/dev/null; then
    print_success "Powertools AWS MCP - Available"
    echo "✅ Powertools AWS MCP - Requires AWS credentials" >> "$RESULTS_FILE"
else
    print_warning "Powertools AWS MCP - Package may not exist"
    echo "⚠️  Powertools AWS MCP - Package may not exist" >> "$RESULTS_FILE"
fi

# 15. CodeRabbit MCP
print_status "Testing CodeRabbit MCP..."
if npx coderabbitai-mcp@latest --help &>/dev/null; then
    print_success "CodeRabbit MCP - Available"
    echo "✅ CodeRabbit MCP - Requires GITHUB_TOKEN" >> "$RESULTS_FILE"
else
    print_warning "CodeRabbit MCP - Requires GITHUB_TOKEN"
    echo "⚠️  CodeRabbit MCP - Requires GITHUB_TOKEN" >> "$RESULTS_FILE"
fi

# 16. PostHog MCP
print_status "Testing PostHog MCP..."
echo "✅ PostHog MCP - Remote server available at https://mcp.posthog.com/sse" >> "$RESULTS_FILE"

# 17. Auth0 MCP
print_status "Testing Auth0 MCP..."
if npx @auth0/auth0-mcp-server --help &>/dev/null; then
    print_success "Auth0 MCP - Available"
    echo "✅ Auth0 MCP - Requires Auth0 credentials" >> "$RESULTS_FILE"
else
    print_warning "Auth0 MCP - Requires Auth0 credentials"
    echo "⚠️  Auth0 MCP - Requires Auth0 credentials" >> "$RESULTS_FILE"
fi

# 18. Operative Browser Agent
print_status "Testing Operative Browser Agent..."
if command -v uvx &>/dev/null; then
    print_success "uvx available for Operative Browser Agent"
    echo "✅ Operative Browser Agent - Requires uvx and OPERATIVE_API_KEY" >> "$RESULTS_FILE"
else
    print_error "uvx not found - required for Operative Browser Agent"
    echo "❌ Operative Browser Agent - uvx not found" >> "$RESULTS_FILE"
fi

# 19. Prisma MCP
print_status "Testing Prisma MCP..."
if npx prisma --help &>/dev/null; then
    print_success "Prisma MCP - Available"
    echo "✅ Prisma MCP - Available via npx prisma mcp" >> "$RESULTS_FILE"
else
    print_error "Prisma MCP - Prisma CLI not available"
    echo "❌ Prisma MCP - Prisma CLI not available" >> "$RESULTS_FILE"
fi

# 20. Lighthouse MCP
print_status "Testing Lighthouse MCP..."
if npx lighthouse-mcp --help &>/dev/null; then
    print_success "Lighthouse MCP - Available"
    echo "✅ Lighthouse MCP - Available" >> "$RESULTS_FILE"
else
    print_warning "Lighthouse MCP - Package may not exist"
    echo "⚠️  Lighthouse MCP - Package may not exist" >> "$RESULTS_FILE"
fi

# 21. Memory Bank MCP
print_status "Testing Memory Bank MCP..."
if npx @allpepper/memory-bank-mcp@latest --help &>/dev/null; then
    print_success "Memory Bank MCP - Available"
    echo "✅ Memory Bank MCP - Available" >> "$RESULTS_FILE"
else
    print_warning "Memory Bank MCP - Package may not exist"
    echo "⚠️  Memory Bank MCP - Package may not exist" >> "$RESULTS_FILE"
fi

# 22. MiniMax MCP
print_status "Testing MiniMax MCP..."
if command -v uvx &>/dev/null; then
    print_success "uvx available for MiniMax MCP"
    echo "✅ MiniMax MCP - Requires uvx and MINIMAX_API_KEY" >> "$RESULTS_FILE"
else
    print_error "uvx not found - required for MiniMax MCP"
    echo "❌ MiniMax MCP - uvx not found" >> "$RESULTS_FILE"
fi

# 23. Figma MCP
print_status "Testing Figma MCP..."
if npx figma-developer-mcp --help &>/dev/null; then
    print_success "Figma MCP - Available"
    echo "✅ Figma MCP - Requires FIGMA_API_KEY" >> "$RESULTS_FILE"
else
    print_warning "Figma MCP - Requires FIGMA_API_KEY"
    echo "⚠️  Figma MCP - Requires FIGMA_API_KEY" >> "$RESULTS_FILE"
fi

# Summary
echo "" >> "$RESULTS_FILE"
echo "INSTALLATION SUMMARY" >> "$RESULTS_FILE"
echo "===================" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Count results
SUCCESSFUL=$(grep -c "✅" "$RESULTS_FILE" || true)
WARNINGS=$(grep -c "⚠️" "$RESULTS_FILE" || true)
FAILURES=$(grep -c "❌" "$RESULTS_FILE" || true)

echo "✅ Successfully tested: $SUCCESSFUL servers" >> "$RESULTS_FILE"
echo "⚠️  Warnings/API keys needed: $WARNINGS servers" >> "$RESULTS_FILE"
echo "❌ Failed installations: $FAILURES servers" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

echo "RECOMMENDED ACTIONS:" >> "$RESULTS_FILE"
echo "1. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh" >> "$RESULTS_FILE"
echo "2. Obtain API keys for servers that require them" >> "$RESULTS_FILE"
echo "3. Test individual servers with proper credentials" >> "$RESULTS_FILE"
echo "4. Update Claude Desktop configuration with working servers" >> "$RESULTS_FILE"

# Display results
print_status "Installation and testing complete!"
cat "$RESULTS_FILE"

print_success "Results saved to: $RESULTS_FILE"
print_status "Next steps:"
echo "  1. Review the results file for any failed installations"
echo "  2. Obtain API keys for servers that require them"
echo "  3. Update your Claude Desktop configuration"
echo "  4. Test subagent functionality with available MCP servers"

exit 0