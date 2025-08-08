#!/bin/bash

# Clixen MVP - Subagent Setup Verification Script

set -e

echo "🔍 Verifying Subagent Setup for Clixen MVP"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Expected subagents
SUBAGENTS=(
    "database-architecture-agent"
    "frontend-development-agent" 
    "authentication-security-agent"
    "api-integration-agent"
    "workflow-orchestration-agent"
    "testing-qa-agent"
    "devops-deployment-agent"
    "performance-optimization-agent"
    "documentation-knowledge-agent"
    "search-discovery-agent"
    "analytics-monitoring-agent"
    "code-quality-agent"
    "infrastructure-agent"
    "ai-llm-integration-agent"
    "browser-automation-agent"
)

# Check if .claude/agents directory exists
print_status "Checking .claude/agents directory..."
if [ -d "/root/repo/.claude/agents" ]; then
    print_success ".claude/agents directory exists"
else
    print_error ".claude/agents directory not found"
    exit 1
fi

# Verify each subagent file
print_status "Verifying subagent files..."
FOUND_AGENTS=0
MISSING_AGENTS=()

for agent in "${SUBAGENTS[@]}"; do
    agent_file="/root/repo/.claude/agents/${agent}.md"
    if [ -f "$agent_file" ]; then
        print_success "✓ ${agent}.md found"
        FOUND_AGENTS=$((FOUND_AGENTS + 1))
        
        # Check if file has YAML frontmatter
        if head -1 "$agent_file" | grep -q "^---$"; then
            print_success "  ✓ YAML frontmatter present"
        else
            print_warning "  ⚠ Missing YAML frontmatter"
        fi
        
        # Check if file has tools defined
        if grep -q "^tools:" "$agent_file"; then
            tools_line=$(grep "^tools:" "$agent_file" | head -1)
            tool_count=$(echo "$tools_line" | grep -o "mcp" | wc -l)
            if [ "$tool_count" -ge 3 ]; then
                print_success "  ✓ Has $tool_count MCP tools configured"
            else
                print_warning "  ⚠ Only $tool_count MCP tools configured (expected 6)"
            fi
        else
            print_warning "  ⚠ No tools defined"
        fi
    else
        print_error "✗ ${agent}.md missing"
        MISSING_AGENTS+=("$agent")
    fi
done

# Summary
echo ""
print_status "VERIFICATION SUMMARY"
print_status "==================="
echo "Found agents: $FOUND_AGENTS/15"
echo "Missing agents: ${#MISSING_AGENTS[@]}"

if [ ${#MISSING_AGENTS[@]} -gt 0 ]; then
    print_warning "Missing subagents:"
    for agent in "${MISSING_AGENTS[@]}"; do
        echo "  - $agent"
    done
fi

# Check configuration files
print_status "Checking configuration files..."
config_files=(
    "/root/repo/.claude/enhanced-mcp-configuration.json"
    "/root/repo/.claude/claude-desktop-config.json"
    "/root/repo/.claude/mcp-configuration.json"
    "/root/repo/.claude/SUBAGENT_MCP_ENHANCEMENT_SUMMARY.md"
)

for config_file in "${config_files[@]}"; do
    if [ -f "$config_file" ]; then
        print_success "✓ $(basename "$config_file") exists"
    else
        print_error "✗ $(basename "$config_file") missing"
    fi
done

# Check if installation script is executable
install_script="/root/repo/.claude/install-test-mcp-servers.sh"
if [ -f "$install_script" ]; then
    if [ -x "$install_script" ]; then
        print_success "✓ Installation script is executable"
    else
        print_warning "⚠ Installation script exists but not executable"
    fi
else
    print_error "✗ Installation script missing"
fi

# Final status
echo ""
if [ "$FOUND_AGENTS" -eq 15 ] && [ ${#MISSING_AGENTS[@]} -eq 0 ]; then
    print_success "🎉 ALL SUBAGENTS CONFIGURED SUCCESSFULLY!"
    echo ""
    print_status "Next steps:"
    echo "  1. Install required MCP servers: ./.claude/install-test-mcp-servers.sh"
    echo "  2. Obtain API keys for services that require them"
    echo "  3. Copy enhanced configuration to Claude Desktop"
    echo "  4. Test subagent functionality in your Claude Code environment"
else
    print_warning "⚠ Subagent setup incomplete. Please review missing components."
fi

exit 0