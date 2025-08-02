#!/bin/bash

# Deploy corrected build to production EC2 instance

echo "Deploying Clixen with fixed Supabase configuration to production..."

# Build with correct environment variables
cd /root/repo/clixen/apps/web
export VITE_SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
export VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw

echo "Building production bundle..."
pnpm run build

echo "Creating deployment package..."
cd dist
tar -czf /tmp/clixen-frontend.tar.gz *

echo "Deployment package created at /tmp/clixen-frontend.tar.gz"
echo ""
echo "To deploy to production EC2:"
echo "1. Copy the package to EC2:"
echo "   scp /tmp/clixen-frontend.tar.gz ubuntu@18.221.12.50:/tmp/"
echo ""
echo "2. SSH to EC2 and extract:"
echo "   ssh ubuntu@18.221.12.50"
echo "   sudo rm -rf /var/www/html/*"
echo "   sudo tar -xzf /tmp/clixen-frontend.tar.gz -C /var/www/html/"
echo "   sudo systemctl reload nginx"
echo ""
echo "3. Test authentication at http://18.221.12.50"