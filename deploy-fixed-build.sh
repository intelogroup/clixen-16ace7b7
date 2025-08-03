#!/bin/bash

echo "🚀 Deploying corrected Clixen build with proper Supabase URLs..."

# Create deployment package  
cd /root/repo/clixen/apps/web/dist
tar -czf /tmp/clixen-fixed-final.tar.gz *

echo "📦 Created deployment package: /tmp/clixen-fixed-final.tar.gz"

# Commands for production server deployment
cat << 'EOF'

🔧 Run these commands on the production server (18.221.12.50):

# 1. Clean old files completely
sudo rm -rf /var/www/html/*

# 2. Copy and extract new build
scp /tmp/clixen-fixed-final.tar.gz ubuntu@18.221.12.50:/tmp/
ssh ubuntu@18.221.12.50 "sudo tar -xzf /tmp/clixen-fixed-final.tar.gz -C /var/www/html/"

# 3. Restart Apache to clear any caches
ssh ubuntu@18.221.12.50 "sudo systemctl restart apache2"

# 4. Verify deployment
curl -I http://18.221.12.50

🧪 Test authentication at: http://18.221.12.50
📧 Credentials: jayveedz19@gmail.com / Jimkali90#

EOF

echo "✅ Deployment package ready!"