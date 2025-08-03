# 🌐 Complete Domain Setup for clixen.app

## 🔍 **Current Status**

**DNS Status**: ⚠️ **Multiple A Records Detected**
```bash
clixen.app.     14400   IN  A   35.185.228.248  ✅ YOUR SERVER
clixen.app.     14400   IN  A   84.32.84.32     ❌ PARKING PAGE
```

**Issues to Fix:**
1. ❌ Remove parking page IP from DNS
2. ❌ AWS Security Group still blocking external access

## 📋 **Step-by-Step Fix**

### **Step 1: Fix DNS Records**
**Access your domain provider's DNS panel and:**

1. **Remove** the A record pointing to `84.32.84.32`
2. **Keep** the A record pointing to `35.185.228.248`
3. **Add** www subdomain record:
   ```dns
   www.clixen.app    A    35.185.228.248
   ```

### **Step 2: Verify DNS (After Changes)**
```bash
# Should show ONLY your server IP:
dig clixen.app @8.8.8.8
# Expected result: 35.185.228.248 ONLY
```

### **Step 3: AWS Security Group (Critical)**
**Ensure these INBOUND rules exist:**
- Type: HTTP, Port: 80, Source: 0.0.0.0/0
- Type: HTTPS, Port: 443, Source: 0.0.0.0/0

### **Step 4: Test Domain Access**
```bash
# After DNS + Security Group fixes:
curl http://clixen.app         # Should work
curl http://www.clixen.app     # Should work
```

### **Step 5: Install SSL Certificate**
```bash
# After domain is working:
sudo certbot --apache -d clixen.app -d www.clixen.app
```

### **Step 6: Update Supabase CORS**
**Add to Supabase allowed origins:**
- `http://clixen.app`
- `https://clixen.app`
- `http://www.clixen.app`
- `https://www.clixen.app`

## 🎯 **Expected Results**

After completing all steps:

✅ **http://clixen.app** → Clixen application  
✅ **https://clixen.app** → Clixen application (secure)  
✅ **Authentication working** → No "Failed to fetch" errors  
✅ **Professional domain** → Ready for production users  

## 🔧 **Server Configuration (Already Complete)**

- ✅ Apache virtual hosts configured for clixen.app
- ✅ Security headers for Supabase integration  
- ✅ CORS headers enabled
- ✅ SSL configuration ready
- ✅ Environment variables properly set

## ⏰ **Timeline**

1. **DNS Fix**: 5-15 minutes propagation
2. **AWS Security Group**: Immediate after saving
3. **SSL Certificate**: 2-3 minutes via certbot
4. **Supabase CORS**: Immediate
5. **Total**: ~20-30 minutes for complete setup

---

**Priority**: Fix DNS records first, then AWS Security Group, then SSL.