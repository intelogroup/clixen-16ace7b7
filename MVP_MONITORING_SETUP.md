# Clixen MVP Monitoring Dashboard Setup

## 📊 MVP Success Metrics Dashboard

### Core Metrics to Track (Phase 5)

#### 1. User Onboarding Success (Target: ≥70%)
**Definition**: Percentage of users who complete first workflow within 10 minutes
**Tracking**:
- User registration timestamp
- First workflow creation timestamp  
- Time difference calculation
- Success = time_diff ≤ 10 minutes

**SQL Query**:
```sql
-- MVP Onboarding Success Rate
WITH user_onboarding AS (
  SELECT 
    u.id as user_id,
    u.created_at as signup_time,
    MIN(w.created_at) as first_workflow_time,
    EXTRACT(EPOCH FROM (MIN(w.created_at) - u.created_at))/60 as minutes_to_first_workflow
  FROM auth.users u
  LEFT JOIN mvp_workflows w ON u.id = w.user_id
  WHERE u.created_at >= '2025-08-08'  -- Beta trial start
  GROUP BY u.id, u.created_at
)
SELECT 
  COUNT(*) as total_users,
  COUNT(first_workflow_time) as users_with_workflows,
  COUNT(CASE WHEN minutes_to_first_workflow <= 10 THEN 1 END) as successful_onboarding,
  ROUND(
    COUNT(CASE WHEN minutes_to_first_workflow <= 10 THEN 1 END) * 100.0 / 
    COUNT(first_workflow_time), 2
  ) as onboarding_success_rate
FROM user_onboarding;
```

#### 2. Workflow Persistence (Target: ≥90%)
**Definition**: Percentage of generated workflows that are saved and retrievable
**Tracking**:
- Total workflow generation attempts
- Successfully saved workflows
- Workflows retrievable from dashboard

**SQL Query**:
```sql
-- Workflow Persistence Rate
SELECT 
  COUNT(*) as total_workflows_created,
  COUNT(CASE WHEN status != 'failed' THEN 1 END) as saved_workflows,
  ROUND(
    COUNT(CASE WHEN status != 'failed' THEN 1 END) * 100.0 / COUNT(*), 2
  ) as persistence_rate,
  COUNT(CASE WHEN status = 'deployed' THEN 1 END) as deployed_workflows
FROM mvp_workflows 
WHERE created_at >= '2025-08-08';
```

#### 3. Deployment Success (Target: ≥80%)
**Definition**: Percentage of workflows successfully deployed to n8n
**Tracking**:
- Workflow deployment attempts
- Successful n8n API responses  
- Workflow activation status

**SQL Query**:
```sql
-- Deployment Success Rate  
SELECT 
  COUNT(CASE WHEN status IN ('deployed', 'active') THEN 1 END) as successful_deployments,
  COUNT(CASE WHEN status IN ('deployed', 'active', 'failed', 'error') THEN 1 END) as total_attempts,
  ROUND(
    COUNT(CASE WHEN status IN ('deployed', 'active') THEN 1 END) * 100.0 /
    COUNT(CASE WHEN status IN ('deployed', 'active', 'failed', 'error') THEN 1 END), 2
  ) as deployment_success_rate
FROM mvp_workflows 
WHERE created_at >= '2025-08-08'
  AND status IN ('deployed', 'active', 'failed', 'error');
```

#### 4. Basic Telemetry Events
**Key Events to Track**:
- User signups
- Project creation
- Workflow generation requests
- Deployment attempts
- User sessions
- Error occurrences

---

## 🔧 Implementation Setup

### 1. Supabase Analytics Tables

```sql
-- Create analytics tracking table
CREATE TABLE IF NOT EXISTS mvp_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_mvp_analytics_user_id ON mvp_analytics(user_id);
CREATE INDEX idx_mvp_analytics_event_type ON mvp_analytics(event_type);
CREATE INDEX idx_mvp_analytics_created_at ON mvp_analytics(created_at);

-- Enable RLS
ALTER TABLE mvp_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics
CREATE POLICY "Users can view own analytics" ON mvp_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert analytics" ON mvp_analytics
  FOR INSERT WITH CHECK (true);  -- Allow system inserts

-- Grant permissions
GRANT SELECT, INSERT ON mvp_analytics TO authenticated;
GRANT SELECT ON mvp_analytics TO service_role;
```

### 2. Frontend Analytics Integration

**File**: `/frontend/src/lib/analytics.ts`
```typescript
import { supabase } from './supabase';

interface AnalyticsEvent {
  event_type: string;
  event_data?: Record<string, any>;
  session_id?: string;
}

class Analytics {
  private sessionId: string;
  
  constructor() {
    this.sessionId = this.generateSessionId();
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async track(event_type: string, event_data?: Record<string, any>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('mvp_analytics').insert({
        user_id: user?.id,
        event_type,
        event_data: event_data || {},
        session_id: this.sessionId
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
}

export const analytics = new Analytics();

// Helper functions for common events
export const trackUserSignup = () => analytics.track('user_signup');
export const trackProjectCreate = (projectName: string) => 
  analytics.track('project_create', { project_name: projectName });
export const trackWorkflowGenerate = (prompt: string) => 
  analytics.track('workflow_generate', { prompt_length: prompt.length });
export const trackWorkflowDeploy = (workflowId: string, success: boolean) => 
  analytics.track('workflow_deploy', { workflow_id: workflowId, success });
export const trackError = (error: string, context?: string) => 
  analytics.track('error_occurred', { error, context });
```

### 3. Real-time Monitoring Dashboard

**File**: `/admin-dashboard.html` (Simple dashboard for monitoring)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clixen MVP Monitoring Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric-card { 
            border: 1px solid #ddd; 
            padding: 20px; 
            margin: 10px; 
            border-radius: 8px;
            display: inline-block;
            width: 300px;
            vertical-align: top;
        }
        .metric-value { font-size: 2em; font-weight: bold; color: #2ecc71; }
        .metric-target { color: #95a5a6; font-size: 0.9em; }
        .alert { background: #e74c3c; color: white; padding: 10px; border-radius: 4px; }
        .success { background: #27ae60; color: white; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🚀 Clixen MVP Beta Trial Dashboard</h1>
    <div id="last-updated">Last Updated: <span id="timestamp">Loading...</span></div>
    
    <div id="metrics-container">
        <div class="metric-card">
            <h3>User Onboarding Success</h3>
            <div class="metric-value" id="onboarding-rate">--</div>
            <div class="metric-target">Target: ≥70%</div>
            <div id="onboarding-status"></div>
        </div>
        
        <div class="metric-card">
            <h3>Workflow Persistence</h3>
            <div class="metric-value" id="persistence-rate">--</div>
            <div class="metric-target">Target: ≥90%</div>
            <div id="persistence-status"></div>
        </div>
        
        <div class="metric-card">
            <h3>Deployment Success</h3>
            <div class="metric-value" id="deployment-rate">--</div>
            <div class="metric-target">Target: ≥80%</div>
            <div id="deployment-status"></div>
        </div>
        
        <div class="metric-card">
            <h3>Active Users (24h)</h3>
            <div class="metric-value" id="active-users">--</div>
            <div class="metric-target">Beta Trial: 50 max</div>
        </div>
        
        <div class="metric-card">
            <h3>Total Workflows</h3>
            <div class="metric-value" id="total-workflows">--</div>
            <div class="metric-target">Growth tracking</div>
        </div>
        
        <div class="metric-card">
            <h3>Error Rate (24h)</h3>
            <div class="metric-value" id="error-rate">--</div>
            <div class="metric-target">Target: <5%</div>
            <div id="error-status"></div>
        </div>
    </div>
    
    <h2>📈 Trends (Last 7 Days)</h2>
    <canvas id="trends-chart" width="800" height="400"></canvas>
    
    <h2>🔍 Recent Activity</h2>
    <div id="recent-activity">Loading...</div>
    
    <script>
        // Dashboard implementation
        const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
        
        async function fetchMetrics() {
            // This would connect to Supabase and fetch real metrics
            // For now, showing sample implementation structure
            
            document.getElementById('timestamp').textContent = new Date().toISOString();
            
            // Sample data - replace with real Supabase queries
            updateMetric('onboarding-rate', '85%', 85 >= 70);
            updateMetric('persistence-rate', '92%', 92 >= 90);  
            updateMetric('deployment-rate', '78%', 78 >= 80);
            updateMetric('active-users', '23', true);
            updateMetric('total-workflows', '156', true);
            updateMetric('error-rate', '3.2%', 3.2 < 5);
        }
        
        function updateMetric(id, value, isSuccess) {
            document.getElementById(id).textContent = value;
            const statusId = id.replace('-rate', '-status').replace('active-users', 'users-status').replace('total-workflows', 'workflows-status').replace('error-rate', 'error-status');
            const statusElement = document.getElementById(statusId);
            if (statusElement) {
                statusElement.className = isSuccess ? 'success' : 'alert';
                statusElement.textContent = isSuccess ? '✓ On Target' : '⚠ Below Target';
            }
        }
        
        // Initialize dashboard
        fetchMetrics();
        setInterval(fetchMetrics, 60000); // Update every minute
    </script>
</body>
</html>
```

---

## 📋 Daily Monitoring Checklist

### Morning Check (9 AM daily)
- [ ] Review overnight signups and onboarding success
- [ ] Check workflow creation and deployment rates
- [ ] Identify any error spikes or service issues  
- [ ] Review user feedback from previous day
- [ ] Verify system uptime and performance

### Afternoon Check (2 PM daily)
- [ ] Check current user activity levels
- [ ] Review new workflow types and success patterns
- [ ] Monitor n8n system resources and performance
- [ ] Check for any security alerts or unusual activity
- [ ] Update team on daily metrics progress

### End of Day Report (6 PM daily)
- [ ] Generate daily metrics summary
- [ ] Document any issues encountered and resolutions
- [ ] Plan any necessary adjustments for next day
- [ ] Send daily summary to stakeholders
- [ ] Backup critical metrics data

---

## 🚨 Alert Thresholds & Escalation

### Critical Alerts (Immediate Response)
- **System Down**: Any core service unavailable >5 minutes
- **Security Incident**: Unauthorized access attempts detected
- **Data Loss**: User workflows not saving properly
- **Mass Errors**: Error rate >20% for >10 minutes

### Warning Alerts (Response within 4 hours)  
- **Performance**: Page load times >5 seconds consistently
- **Onboarding**: Success rate drops below 60%
- **Deployments**: Success rate drops below 70%
- **User Complaints**: Multiple similar issues reported

### Trend Alerts (Daily Review)
- **Declining Engagement**: DAU dropping >20% week-over-week
- **Low Adoption**: New user signups <5/day for 3+ days
- **Feature Issues**: Specific workflow types failing >30%

---

This monitoring setup provides comprehensive tracking of MVP success metrics while remaining simple enough to implement and maintain during the beta trial period.