#!/bin/bash

# SSH command to explore n8n environment
SSH_CMD="ssh -i /root/repo/sliplane_ssh_key -p 22222 service_r1w9ajv2l7ui@default-server-uu5nr7.sliplane.app"

echo "=== Exploring n8n Container ==="
echo ""

echo "1. Current directory and user:"
$SSH_CMD "pwd; whoami" 2>/dev/null | tail -n +2

echo ""
echo "2. N8N Process Information:"
$SSH_CMD "ps aux | grep n8n | head -5" 2>/dev/null | tail -n +2

echo ""
echo "3. Environment Variables (n8n related):"
$SSH_CMD "env | grep -i n8n | head -10" 2>/dev/null | tail -n +2

echo ""
echo "4. File System Structure:"
$SSH_CMD "ls -la / | head -15" 2>/dev/null | tail -n +2

echo ""
echo "5. N8N Data Directory:"
$SSH_CMD "ls -la /home/node/.n8n 2>/dev/null || ls -la ~/.n8n 2>/dev/null || echo 'N8N directory not found in expected locations'" 2>/dev/null | tail -n +2

echo ""
echo "6. Recent Logs:"
$SSH_CMD "tail -n 20 /var/log/n8n.log 2>/dev/null || journalctl -u n8n -n 20 2>/dev/null || echo 'Standard log locations not accessible'" 2>/dev/null | tail -n +2