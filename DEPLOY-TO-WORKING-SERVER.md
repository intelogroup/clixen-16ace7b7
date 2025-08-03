# 🚀 Deploy Correct Build to Working Server (18.221.12.50)

## ✅ **DNS Update Required (Do This First)**

**In your DNS provider, update the A record:**

```dns
# DELETE these records:
A    @    35.185.228.248    ❌ DELETE
A    @    8.221.12.50       ❌ DELETE

# ADD this record:  
A    @    18.221.12.50      ✅ ADD
```

## 📦 **Frontend Deployment**

### **Option A: Manual Deployment (If you have SSH access to 18.221.12.50)**

1. **Copy the correct build** to the working server:
   ```bash
   # From our current server, the correct build is at:
   /root/repo/clixen/apps/web/dist/
   
   # Copy to working server (if you have SSH access):
   scp -r /root/repo/clixen/apps/web/dist/* root@18.221.12.50:/var/www/html/
   ```

2. **Backup current build** (on 18.221.12.50):
   ```bash
   ssh root@18.221.12.50 "cp -r /var/www/html /var/www/html.backup"
   ```

### **Option B: Download and Upload Method**

If you can't SSH between servers, download the correct build:

1. **Download the deployment package:**
   ```bash
   # The correct build is available at:
   # /tmp/clixen-frontend-correct.tar.gz
   
   # You can download this file and upload it to 18.221.12.50
   ```

2. **Extract on working server:**
   ```bash
   # On 18.221.12.50:
   cd /var/www/html
   rm -rf * # Remove old files
   tar -xzf clixen-frontend-correct.tar.gz --strip-components=1
   ```

## 🔧 **Key Differences in Correct Build**

### **Current (Wrong) Build on 18.221.12.50:**
- ❌ Contains: `https://your-project.supabase.co` (placeholder)
- ❌ Authentication will fail

### **New (Correct) Build:**
- ✅ Contains: `https://zfbgdixbzezpxllkoyfc.supabase.co` (real URL)
- ✅ Authentication will work perfectly

## 🌐 **After Deployment**

### **1. Test DNS Propagation:**
```bash
dig clixen.app @8.8.8.8
# Should show: 18.221.12.50
```

### **2. Test Domain Access:**
```bash
curl http://clixen.app
# Should return Clixen frontend
```

### **3. Update Supabase CORS:**
Add to Supabase allowed origins:
- `http://clixen.app`
- `http://www.clixen.app`

### **4. Test Authentication:**
- Open `http://clixen.app` in browser
- Click "Get Started"
- Try login/signup
- Should work without "Failed to fetch" errors

## 📋 **Deployment Checklist**

- [ ] DNS A record updated to 18.221.12.50
- [ ] DNS propagated (dig test passes)
- [ ] Correct build deployed to /var/www/html/
- [ ] Supabase CORS updated
- [ ] Authentication tested and working
- [ ] Domain accessible at clixen.app

## 🎯 **Expected Result**

After completion:
- ✅ `http://clixen.app` → Clixen application
- ✅ `http://www.clixen.app` → Clixen application  
- ✅ Authentication working perfectly
- ✅ Professional domain ready for users

---

**Timeline:** 5-10 minutes after DNS propagation