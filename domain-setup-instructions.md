# 🌐 Domain Setup Instructions for clixen.app

## ✅ Server Configuration Complete

**Domain**: `clixen.app`  
**Server IP**: `35.185.228.248`  
**Nameservers**: `ns1.dns-parking.com`, `ns2.dns-parking.com`

## 🔧 DNS Configuration Required

### **Add these DNS records via your domain provider:**

```dns
# Main domain A record
Type: A
Name: @ (or blank)
Value: 35.185.228.248
TTL: 300 (5 minutes for testing)

# WWW subdomain A record  
Type: A
Name: www
Value: 35.185.228.248
TTL: 300
```

### **Alternative CNAME for WWW:**
```dns
Type: CNAME
Name: www
Value: clixen.app
TTL: 300
```

## ✅ Apache Configuration Updated

### **HTTP Virtual Host** (Port 80):
- ✅ ServerName: `clixen.app`
- ✅ ServerAlias: `www.clixen.app`, `35.185.228.248` 
- ✅ Security headers configured for Supabase integration
- ✅ CORS headers enabled

### **HTTPS Virtual Host** (Port 443):
- ✅ ServerName: `clixen.app`
- ✅ ServerAlias: `www.clixen.app`
- ✅ SSL certificate ready (self-signed for now)
- ✅ Security headers configured

## 🚀 Next Steps

### 1. **Configure DNS Records**
Add the A records above in your DNS provider's control panel.

### 2. **Wait for DNS Propagation** (5-15 minutes)
Test with: `nslookup clixen.app` or `dig clixen.app`

### 3. **Test Domain Access**
```bash
# Should work after DNS propagation:
curl http://clixen.app
curl http://www.clixen.app
```

### 4. **Get Proper SSL Certificate** (after DNS works)
```bash
# Install Let's Encrypt certificate:
sudo certbot --apache -d clixen.app -d www.clixen.app
```

### 5. **Update Supabase CORS Settings**
Add to Supabase allowed origins:
- `http://clixen.app`
- `https://clixen.app`
- `http://www.clixen.app`
- `https://www.clixen.app`

## 🎯 Expected Result

After DNS propagation:
- ✅ `http://clixen.app` → Clixen frontend
- ✅ `http://www.clixen.app` → Clixen frontend  
- ✅ Authentication working without "Failed to fetch" errors
- ✅ Professional domain for production use

## 📝 Current Status

- ✅ **Server Configuration**: Complete
- ✅ **Apache Virtual Hosts**: Configured  
- ✅ **Security Headers**: Enabled
- ⏳ **DNS Records**: Waiting for configuration
- ⏳ **SSL Certificate**: Will install after DNS works
- ⏳ **Supabase CORS**: Will update after domain works

---

**Timeline**: DNS typically propagates within 5-15 minutes after adding records.