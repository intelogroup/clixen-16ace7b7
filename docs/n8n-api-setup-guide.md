# n8n API Key Setup Guide

## 🎯 Current Status
- **n8n Instance**: ✅ Running at http://18.221.12.50:5678
- **Health Check**: ✅ Responding correctly
- **API Access**: ❌ Requires proper API key setup

## 🔧 Setting Up n8n API Key

### Step 1: Access n8n Web Interface
1. Open your browser and navigate to: `http://18.221.12.50:5678`
2. If prompted, create an admin account or log in

### Step 2: Navigate to Settings
1. Click on your profile icon (top right)
2. Select "Settings" from the dropdown menu
3. Go to "API" or "Personal API Keys" section

### Step 3: Generate API Key
1. Click "Create API Key" or "Generate New Key"
2. Provide a name like "Clixen Integration Key"
3. Copy the generated API key immediately (it won't be shown again)

### Step 4: Test the API Key
```bash
# Test the new API key
curl -X GET "http://18.221.12.50:5678/api/v1/workflows" \
  -H "X-N8N-API-KEY: YOUR_NEW_API_KEY" \
  -H "Content-Type: application/json"
```

### Step 5: Update Environment Variables
Update your `.env` file with the new API key:
```
VITE_N8N_API_KEY=your_new_api_key_here
```

## 🚨 Current API Key Issue
The existing API key `b38356d3-075f-4b69-9b31-dc90c71ba40a` returns "unauthorized" error.
This suggests:
1. The key may have expired
2. The key was not properly configured
3. API access needs to be enabled in n8n settings

## 📋 Production Checklist
- [ ] Generate new API key through web interface
- [ ] Test API key with curl command
- [ ] Update environment variables
- [ ] Test workflow creation via API
- [ ] Test workflow execution via API
- [ ] Document the new API key in secure storage

## 🔒 Security Best Practices
1. **Never commit API keys to repository**
2. **Store API keys in environment variables only**
3. **Rotate API keys regularly**
4. **Use different API keys for different environments**
5. **Monitor API key usage and access logs**

## 🧪 API Testing Commands

### List Workflows
```bash
curl -X GET "http://18.221.12.50:5678/api/v1/workflows" \
  -H "X-N8N-API-KEY: YOUR_API_KEY"
```

### Get Workflow Details
```bash
curl -X GET "http://18.221.12.50:5678/api/v1/workflows/WORKFLOW_ID" \
  -H "X-N8N-API-KEY: YOUR_API_KEY"
```

### Execute Workflow
```bash
curl -X POST "http://18.221.12.50:5678/api/v1/workflows/WORKFLOW_ID/execute" \
  -H "X-N8N-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Create Webhook Test
```bash
curl -X POST "http://18.221.12.50:5678/webhook-test/YOUR_WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 🎯 Next Steps
1. **Immediate**: Access n8n web interface and generate API key
2. **Testing**: Verify all API endpoints work with new key
3. **Integration**: Update Clixen application with new API key
4. **Documentation**: Record API key in secure credential store
5. **Monitoring**: Set up API usage monitoring and alerts

## 📊 Expected API Responses

### Successful Workflow List Response
```json
{
  "data": [
    {
      "id": "workflow-id",
      "name": "Workflow Name",
      "active": true,
      "createdAt": "2025-08-03T22:00:00.000Z",
      "updatedAt": "2025-08-03T22:00:00.000Z"
    }
  ]
}
```

### API Key Error Response
```json
{
  "message": "unauthorized"
}
```

This indicates the API key is invalid or not properly configured.