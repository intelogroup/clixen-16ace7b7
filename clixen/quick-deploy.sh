#!/bin/bash

# Clixen Quick Deployment Script for EC2
# Run this on your EC2 instance to deploy Clixen MVP

set -e

echo "🚀 Clixen Quick Deploy - MVP Setup"
echo "=================================="

# Check if running on EC2
if [ ! -f /home/ubuntu/.ssh/authorized_keys ]; then
    echo "⚠️  This script should be run on your EC2 instance"
    exit 1
fi

# Step 1: Update n8n configuration
echo "📝 Step 1: Configuring n8n..."
cat > /home/ubuntu/n8n-clixen.env << 'EOF'
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://18.221.12.50:5678/
N8N_METRICS=true
N8N_API_ENABLED=true
N8N_API_PREFIX=/api/v1
EXECUTIONS_MODE=regular
N8N_ENCRYPTION_KEY=your-encryption-key-here
EOF

# Restart n8n with API enabled
docker stop n8n 2>/dev/null || true
docker rm n8n 2>/dev/null || true
docker run -d \
  --name n8n \
  --restart always \
  -p 5678:5678 \
  --env-file /home/ubuntu/n8n-clixen.env \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n:latest

echo "✅ n8n configured and running"

# Step 2: Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Step 2: Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed"
fi

# Step 3: Clone and setup Clixen
echo "📥 Step 3: Setting up Clixen..."
cd /home/ubuntu
if [ ! -d "clixen" ]; then
    # Use the uploaded files
    echo "Using local Clixen files..."
else
    cd clixen
fi

# Step 4: Create test environment file
echo "🔧 Step 4: Creating test configuration..."
cat > .env.test << 'EOF'
# Test Configuration - UPDATE THESE VALUES
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-openai-key
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=generate-from-n8n-ui
EOF

# Step 5: Test n8n API
echo "🧪 Step 5: Testing n8n API..."
echo "Checking n8n health..."
if curl -s http://localhost:5678/healthz | grep -q "ok"; then
    echo "✅ n8n is healthy"
else
    echo "❌ n8n is not responding"
fi

# Step 6: Instructions
echo ""
echo "=================================="
echo "🎉 MVP Setup Complete!"
echo "=================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Get n8n API Key:"
echo "   - Open http://18.221.12.50:5678"
echo "   - Go to Settings → API"
echo "   - Generate API key"
echo ""
echo "2. Configure Environment:"
echo "   - Edit .env.test with your actual keys:"
echo "     nano .env.test"
echo ""
echo "3. Get OpenAI API Key:"
echo "   - Visit https://platform.openai.com/api-keys"
echo "   - Create new key with GPT-4 access"
echo ""
echo "4. Setup Supabase:"
echo "   - Create project at https://supabase.com"
echo "   - Get URL and anon key from Settings → API"
echo ""
echo "5. Deploy Database:"
echo "   - Run migrations from apps/edge/supabase/migrations/"
echo ""
echo "6. Test Workflow Generation:"
echo "   curl -X POST http://localhost:5678/api/v1/workflows/test"
echo ""
echo "=================================="
echo "📚 Documentation: /home/ubuntu/clixen/DEPLOYMENT.md"
echo "🆘 Issues? Check: docker logs n8n"
echo "==================================

"