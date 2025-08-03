#!/bin/bash
# HTTPS Setup for Clixen Production Deployment

echo "🔒 Setting up HTTPS for Clixen production deployment..."

cat << 'EOF'
# HTTPS Setup Commands for Production Server (18.221.12.50)

# 1. Install Certbot for Let's Encrypt SSL
sudo apt update
sudo apt install -y certbot python3-certbot-apache

# 2. Configure domain (if using custom domain)
# Replace 'clixen.com' with your actual domain
# sudo certbot --apache -d clixen.com -d www.clixen.com

# 3. For IP-based setup (current), create self-signed cert for development
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/clixen-selfsigned.key \
  -out /etc/ssl/certs/clixen-selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Clixen/CN=18.221.12.50"

# 4. Create Apache SSL configuration
sudo tee /etc/apache2/sites-available/clixen-ssl.conf > /dev/null << 'APACHE_CONF'
<VirtualHost *:443>
    ServerName 18.221.12.50
    DocumentRoot /var/www/html

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/clixen-selfsigned.crt
    SSLCertificateKeyFile /etc/ssl/private/clixen-selfsigned.key

    # Security headers for Supabase integration
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options SAMEORIGIN
    Header always set Referrer-Policy strict-origin-when-cross-origin

    # CORS headers for Supabase (if needed)
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

    ErrorLog ${APACHE_LOG_DIR}/clixen_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/clixen_ssl_access.log combined
</VirtualHost>
APACHE_CONF

# 5. Enable SSL module and site
sudo a2enmod ssl
sudo a2enmod headers
sudo a2ensite clixen-ssl
sudo systemctl restart apache2

# 6. Update Supabase allowed origins
echo "📝 Update Supabase Dashboard:"
echo "   Settings → API → Allowed Origins → Add: https://18.221.12.50"

echo "✅ HTTPS setup complete!"
echo "🔗 Test at: https://18.221.12.50"

EOF

echo "✅ HTTPS setup script created!"
echo "📝 Run these commands on production server for SSL encryption"