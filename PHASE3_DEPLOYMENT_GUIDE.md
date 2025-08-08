# Phase 3: 2-Way Sync Implementation - Deployment Guide

## Overview
Phase 3 implements a robust 2-way synchronization system between Supabase and n8n, enabling real-time workflow status updates, execution tracking, and seamless data consistency.

## Architecture
```
User Action → Supabase (RLS) → Edge Function → n8n API
                ↓                              ↓
         [Source of Truth]            [Execution Engine]

Dashboard ← Supabase (RLS) ← Sync Service ← n8n Status
               ↑
        [Real-time Updates]
```

## Deployment Steps

### 1. Database Migration
Run the sync schema migration to add required columns and tables:

```bash
# Navigate to backend directory
cd /root/repo/backend

# Run the migration
psql -h db.zfbgdixbzezpxllkoyfc.supabase.co -U postgres -d postgres -f supabase/migrations/20250108_workflow_sync_schema.sql

# Or use Supabase CLI if configured
supabase db push
```

**Migration adds:**
- `execution_count`, `successful_executions`, `failed_executions` columns to `mvp_workflows`
- `last_execution_at`, `last_execution_status`, `last_sync_at` columns
- `sync_logs` table for tracking sync operations
- Indexes for performance
- RLS policies for security
- Realtime publication for live updates

### 2. Deploy Edge Function
Deploy the new workflow-sync Edge Function:

```bash
# Deploy the function
supabase functions deploy workflow-sync

# Set environment variables if needed
supabase secrets set N8N_API_URL=http://18.221.12.50:5678/api/v1
supabase secrets set N8N_API_KEY=your-n8n-api-key
```

### 3. Frontend Deployment
The frontend changes are already integrated. Deploy to Netlify:

```bash
# Build and deploy
npm run build
git push origin feature/n8n-integration-secure

# Or manual deployment
netlify deploy --prod --dir=dist
```

### 4. Environment Variables
Ensure these environment variables are set:

**Supabase Edge Functions:**
- `N8N_API_URL`: http://18.221.12.50:5678/api/v1
- `N8N_API_KEY`: Your n8n API key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

**Frontend (Netlify):**
- `VITE_SUPABASE_URL`: https://zfbgdixbzezpxllkoyfc.supabase.co
- `VITE_SUPABASE_ANON_KEY`: Your anon key
- `VITE_N8N_API_URL`: http://18.221.12.50:5678/api/v1

## Testing the Sync System

### 1. Manual Sync Testing

```bash
# Test sync endpoint directly
curl -X POST https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/workflow-sync \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync_all_workflows"}'
```

### 2. User Journey Testing

**Test Scenario 1: Workflow Creation & Sync**
1. Create a new workflow in the chat interface
2. Verify it appears in the dashboard
3. Check n8n interface - workflow should be deployed with `[USR-]` prefix
4. Execute the workflow in n8n
5. Click sync button in dashboard - execution count should update
6. Verify real-time updates work (green dot on sync button)

**Test Scenario 2: Real-time Updates**
1. Open dashboard in two browser tabs
2. Create workflow in tab 1
3. Verify it appears in tab 2 without refresh
4. Execute workflow in n8n
5. Sync in one tab - both should update

**Test Scenario 3: Error Handling**
1. Disconnect from internet
2. Try to sync - should show graceful error message
3. Reconnect - sync should work again
4. Stop n8n service temporarily
5. Try to sync - should show n8n unavailable message

### 3. Performance Testing

```bash
# Create test script
cat > test-sync-performance.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zfbgdixbzezpxllkoyfc.supabase.co',
  'your-anon-key'
);

async function testSyncPerformance() {
  const startTime = Date.now();
  
  const { data, error } = await supabase.functions.invoke('workflow-sync', {
    body: { action: 'sync_all_workflows' }
  });
  
  const duration = Date.now() - startTime;
  
  console.log('Sync Performance Test:');
  console.log(`Duration: ${duration}ms`);
  console.log('Result:', data);
  
  if (error) {
    console.error('Error:', error);
  }
}

testSyncPerformance();
EOF

node test-sync-performance.js
```

### 4. Load Testing

**Test with Multiple Users:**
```bash
# Create multiple test users and workflows
# Run concurrent sync operations
# Monitor performance and error rates
```

**Expected Performance:**
- Single user sync: < 2 seconds
- 10 workflows sync: < 5 seconds
- Real-time updates: < 1 second latency
- Dashboard load: < 3 seconds

## Monitoring & Maintenance

### 1. Sync Logs
Monitor sync operations via the `sync_logs` table:

```sql
-- Recent sync operations
SELECT * FROM sync_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Sync success rate
SELECT 
  sync_type,
  status,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration
FROM sync_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY sync_type, status;
```

### 2. Error Monitoring
Set up alerts for:
- Sync failure rate > 10%
- Average sync time > 5 seconds
- Real-time connection failures
- n8n API errors

### 3. Cleanup Jobs
Set up scheduled cleanup:

```bash
# Add to crontab or GitHub Actions
# Run daily cleanup
curl -X POST https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/workflow-sync \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "cleanup_workflows"}'
```

## Troubleshooting

### Common Issues

**1. Real-time not working**
- Check Supabase realtime is enabled on `mvp_workflows` table
- Verify WebSocket connection in browser dev tools
- Check RLS policies allow user access

**2. Sync timing out**
- Check n8n service is running
- Verify API key is correct
- Check network connectivity
- Look at sync_logs for specific errors

**3. Execution counts not updating**
- Verify workflows have `n8n_workflow_id` set
- Check n8n API permissions
- Ensure workflow has been executed in n8n
- Run manual sync to test

**4. Dashboard not refreshing**
- Check browser console for errors
- Verify Supabase connection
- Test manual refresh vs. real-time updates
- Check if user has proper permissions

### Debug Commands

```bash
# Check Edge Function logs
supabase functions logs workflow-sync

# Test database connection
psql -h db.zfbgdixbzezpxllkoyfc.supabase.co -U postgres -c "SELECT COUNT(*) FROM mvp_workflows;"

# Test n8n API
curl -H "X-N8N-API-KEY: YOUR_KEY" http://18.221.12.50:5678/api/v1/workflows

# Check realtime connection
# In browser console:
window.supabase.realtime.isConnected()
```

## Success Criteria

✅ **Sync Performance:**
- User sync completes in < 2 seconds
- Dashboard loads in < 3 seconds
- Real-time updates arrive in < 1 second

✅ **Reliability:**
- Sync success rate > 95%
- Graceful degradation on errors
- Automatic reconnection on failures

✅ **User Experience:**
- Seamless workflow status updates
- Clear error messages
- No data loss during sync failures

✅ **Data Consistency:**
- Supabase remains source of truth
- Execution counts match n8n
- No duplicate workflows

## Next Steps

After successful deployment:

1. **Monitor for 24 hours** - Check error rates and performance
2. **Run full user journey tests** - End-to-end workflow testing
3. **Set up alerting** - Monitor sync health and performance
4. **Document for team** - Update team docs with new features
5. **Plan Phase 4** - Advanced features or optimization

The 2-way sync system provides a robust foundation for the 50-user MVP trial, ensuring data consistency and real-time updates while maintaining the security and user isolation implemented in previous phases.