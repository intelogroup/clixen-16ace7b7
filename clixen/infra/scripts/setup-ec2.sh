#!/bin/bash

# Clixen EC2 Setup Script
# This script configures NGINX, SSL, and n8n for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}       Clixen Infrastructure Setup      ${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}This script must be run as root or with sudo${NC}"
    exit 1
fi

# 1. Install NGINX if not already installed
echo -e "${YELLOW}[1/7] Installing NGINX...${NC}"
if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo -e "${GREEN}✅ NGINX installed${NC}"
else
    echo -e "${GREEN}✅ NGINX already installed${NC}"
fi

# 2. Install Certbot for SSL
echo -e "${YELLOW}[2/7] Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✅ Certbot installed${NC}"
else
    echo -e "${GREEN}✅ Certbot already installed${NC}"
fi

# 3. Stop n8n temporarily to free port 5678
echo -e "${YELLOW}[3/7] Stopping n8n container...${NC}"
docker stop n8n 2>/dev/null || true

# 4. Configure NGINX for n8n
echo -e "${YELLOW}[4/7] Configuring NGINX...${NC}"
cp /home/ubuntu/clixen/infra/nginx/n8n.conf /etc/nginx/sites-available/n8n.clixen.com
ln -sf /etc/nginx/sites-available/n8n.clixen.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
echo -e "${GREEN}✅ NGINX configured${NC}"

# 5. Obtain SSL certificate
echo -e "${YELLOW}[5/7] Obtaining SSL certificate...${NC}"
certbot --nginx -d n8n.clixen.com --non-interactive --agree-tos --email admin@clixen.com --redirect
echo -e "${GREEN}✅ SSL certificate obtained${NC}"

# 6. Set up auto-renewal
echo -e "${YELLOW}[6/7] Setting up SSL auto-renewal...${NC}"
cat > /etc/cron.d/certbot-renewal << EOF
0 0,12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
echo -e "${GREEN}✅ Auto-renewal configured${NC}"

# 7. Update n8n configuration and restart
echo -e "${YELLOW}[7/7] Updating n8n configuration...${NC}"
cat > /home/ubuntu/n8n/.env << EOF
# n8n Configuration for Clixen
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_SECURE_COOKIE=true
WEBHOOK_URL=https://n8n.clixen.com/
N8N_EDITOR_BASE_URL=https://n8n.clixen.com/
GENERIC_TIMEZONE=UTC
NODE_ENV=production
EXECUTIONS_MODE=regular
N8N_METRICS=true
N8N_LOG_LEVEL=info
N8N_BASIC_AUTH_ACTIVE=false
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
EOF

# Restart n8n with new configuration
docker stop n8n 2>/dev/null || true
docker rm n8n 2>/dev/null || true
docker run -d \
  --name n8n \
  --restart always \
  -p 127.0.0.1:5678:5678 \
  --env-file /home/ubuntu/n8n/.env \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n:latest

echo -e "${GREEN}✅ n8n restarted with new configuration${NC}"

# Verify setup
echo -e "${BLUE}Verifying setup...${NC}"
sleep 5

if curl -s https://n8n.clixen.com/healthz > /dev/null; then
    echo -e "${GREEN}✅ n8n is accessible at https://n8n.clixen.com${NC}"
else
    echo -e "${YELLOW}⚠️  n8n might still be starting. Check in a few seconds.${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    Setup completed successfully!       ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update DNS to point n8n.clixen.com to this server's IP"
echo "2. Access n8n at https://n8n.clixen.com"
echo "3. Configure n8n API key for Clixen backend"