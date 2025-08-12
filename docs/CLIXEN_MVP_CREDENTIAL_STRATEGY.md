# 🔐 Clixen MVP Credential Management Strategy

**Status**: ✅ APPROVED | **Version**: 1.0 | **Last Updated**: August 2025

## 🎯 Executive Summary

Clixen's MVP (50-user beta) implements a phased credential management approach optimizing for speed-to-market while maintaining acceptable security for beta users.

## 📊 Three-Phase Implementation Strategy

### **Phase 1: MVP Launch (Weeks 1-2)**
- **Focus**: No-credential and shared-API-key services only
- **Complexity**: Low
- **Development Time**: 2 weeks
- **Cost**: ~$265/month for 50 users

### **Phase 2: Post-MVP Enhancement (Month 2)**
- **Focus**: Per-user OAuth for high-demand services (Google, Notion, GitHub)
- **Complexity**: Medium
- **Development Time**: 3-4 weeks
- **Cost**: Users provide own credentials

### **Phase 3: Enterprise Evolution (Month 3+)**
- **Focus**: n8n Enterprise or custom isolation layer
- **Complexity**: High
- **Development Time**: 6-8 weeks
- **Cost**: Enterprise licensing or infrastructure investment

## 🔒 Security Architecture for MVP

### **Credential Storage Layers**

```typescript
// 1. Shared Credentials (Admin-Managed)
interface SharedCredential {
  service: 'openai' | 'sendgrid' | 'telegram' | 'weather';
  credential_type: 'api_key' | 'token' | 'webhook_url';
  encrypted_value: string;  // Stored in Supabase Vault
  rate_limit_per_user: number;
  cost_per_operation?: number;
}

// 2. User Credentials (Phase 2)
interface UserCredential {
  user_id: string;
  service: string;
  credential_type: 'oauth' | 'personal_api_key';
  encrypted_data: string;  // Supabase Vault encrypted
  expires_at?: timestamp;
  refresh_token?: string;
}

// 3. Workflow Isolation
interface WorkflowCredentialMapping {
  workflow_id: string;
  user_id: string;
  credentials_used: string[];  // Audit trail
  naming_convention: `[USR-${string}]-${string}`;
}
```

### **Database Schema**

```sql
-- Services registry
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- 'no_auth', 'shared_key', 'oauth_required'
  requires_oauth BOOLEAN DEFAULT false,
  global_key_available BOOLEAN DEFAULT false,
  rate_limit_per_user INTEGER,
  cost_per_operation DECIMAL(10,4),
  enabled_for_mvp BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User credentials (Phase 2)
CREATE TABLE user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  credential_type TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,  -- Vault encrypted
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_id)
);

-- RLS Policies
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only manage their own credentials"
ON user_credentials FOR ALL
USING (auth.uid() = user_id);

-- Usage tracking for shared services
CREATE TABLE service_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  service_id UUID REFERENCES services(id),
  workflow_id TEXT NOT NULL,
  operation_count INTEGER DEFAULT 1,
  estimated_cost DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting
CREATE TABLE rate_limits (
  user_id UUID REFERENCES auth.users(id),
  service_id UUID REFERENCES services(id),
  hour_bucket TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, service_id, hour_bucket)
);
```

## 🚀 MVP Service Categories

### **Category A: No Credentials Required (Priority: HIGHEST)**

These nodes work without any authentication and form the backbone of most workflows:

| **Node** | **Use Cases** | **Value Score** |
|----------|---------------|-----------------|
| HTTP Request | API calls, webhooks, REST operations | 10/10 |
| Code (JS/Python) | Data transformation, custom logic | 10/10 |
| Set | Variable management | 9/10 |
| IF/Switch | Conditional logic | 9/10 |
| Merge/Split | Data flow control | 8/10 |
| Schedule Trigger | Cron jobs, automation | 9/10 |
| Webhook | Receive external data | 9/10 |
| Wait | Timing control | 7/10 |
| Date & Time | Timestamp operations | 7/10 |
| Crypto | Hashing, encoding | 6/10 |

### **Category B: Shared API Key Safe (Priority: HIGH)**

Services where a single API key can safely serve all users:

| **Service** | **Monthly Cost (50 users)** | **Implementation** |
|-------------|----------------------------|-------------------|
| OpenAI | $200-300 | Ready ✅ |
| Anthropic | $150-250 | Week 1 |
| SendGrid | $15 (free tier) | Week 1 |
| Telegram Bot | Free | Week 1 |
| Discord Webhook | Free | Week 1 |
| Slack Webhook | Free | Week 1 |
| Weather API | Free tier | Week 2 |
| Currency API | Free tier | Week 2 |
| RSS Feed | Free | Week 2 |

### **Category C: OAuth Required (Priority: POST-MVP)**

Services requiring per-user authentication - deferred to Phase 2:

| **Service** | **Complexity** | **Target Phase** |
|-------------|---------------|------------------|
| Google Sheets/Gmail | High | Phase 2 (Month 2) |
| Microsoft 365 | High | Phase 3 |
| Notion | Medium | Phase 2 |
| GitHub | Medium | Phase 2 |
| Airtable | Medium | Phase 2 |
| Salesforce | Very High | Phase 3 |
| Twitter/X | Very High | Not Planned |

## 💰 Cost Projections

### **MVP Phase (50 Users)**

```javascript
const mvpMonthlyCosts = {
  openai: 250,        // ~10 requests/user/day
  sendgrid: 15,       // Free tier
  telegram: 0,        // Free
  infrastructure: 50, // EC2 + Supabase
  total: 315          // ~$6.30 per user
};
```

### **Rate Limiting Strategy**

```typescript
const rateLimits = {
  openai: {
    per_hour: 10,
    per_day: 100,
    per_month: 2000
  },
  sendgrid: {
    per_hour: 5,
    per_day: 50,
    per_month: 1000
  },
  shared_default: {
    per_hour: 20,
    per_day: 200,
    per_month: 5000
  }
};
```

## 🛠️ Implementation Guidelines

### **Week 1: Core Infrastructure**
1. Deploy credential-free nodes (HTTP, Code, Logic)
2. Implement shared OpenAI integration
3. Add SendGrid for emails
4. Set up rate limiting system

### **Week 2: Enhanced Services**
1. Add Telegram/Discord notifications
2. Implement RSS/Weather/Currency APIs
3. Create usage monitoring dashboard
4. Beta user onboarding

### **Month 2: OAuth Implementation**
1. Google OAuth setup
2. Supabase Vault integration
3. Per-user credential UI
4. Token refresh automation

## ⚠️ Known Limitations & Mitigations

### **MVP Limitations**

| **Limitation** | **Impact** | **Mitigation** |
|---------------|-----------|---------------|
| Shared n8n instance | Credentials visible in admin | User naming convention |
| No per-user isolation | Potential data leakage | Workflow prefixing |
| Shared rate limits | One user affects others | Per-user tracking |
| Limited service support | Can't use Google/Slack | Clear communication |

### **User Communication Template**

```markdown
## Clixen Beta Limitations

During our 50-user beta phase:

✅ **What Works Great:**
- HTTP APIs and webhooks
- AI-powered automation (OpenAI/Claude)
- Email and messaging notifications
- Scheduled workflows
- Custom code execution

⏳ **Coming Soon (Phase 2):**
- Google Sheets/Gmail integration
- Notion connectivity
- GitHub automation
- Personal API keys

🔒 **Security Note:**
Your workflows are isolated using naming conventions.
Beta environment uses shared infrastructure.
Production version will have full isolation.
```

## 📈 Success Metrics

### **MVP Success Criteria**
- [ ] 80% of users create first workflow within 10 minutes
- [ ] <$350/month total operational cost
- [ ] Zero credential leakage incidents
- [ ] 90% workflow deployment success rate
- [ ] <3 second average workflow generation time

### **Monitoring Dashboard**
```typescript
interface MVPMetrics {
  daily_active_users: number;
  workflows_created: number;
  api_costs: {
    openai: number;
    sendgrid: number;
    total: number;
  };
  rate_limit_hits: number;
  deployment_success_rate: number;
  average_generation_time: number;
}
```

## 🔄 Migration Path to Production

### **Phase 2 → Phase 3 Evolution**
1. **Option A**: n8n Enterprise Edition
   - Built-in user isolation
   - Credential permissions
   - ~$500/month for 50 users

2. **Option B**: Multi-Instance Architecture
   - Separate n8n instance per user group
   - Container orchestration
   - ~$200/month infrastructure

3. **Option C**: Custom Isolation Layer
   - Build credential proxy service
   - Implement fine-grained permissions
   - 6-8 week development

## 📝 Decision Log

| **Date** | **Decision** | **Rationale** |
|----------|-------------|--------------|
| 2025-08 | Skip OAuth for MVP | 2-week faster launch |
| 2025-08 | Use shared OpenAI key | $6/user vs $30/user |
| 2025-08 | Implement rate limiting | Prevent cost overruns |
| 2025-08 | User workflow prefixing | Simple isolation method |

---

**Document maintained by**: Clixen Engineering Team  
**Next Review**: Post-MVP Launch (Month 2)  
**Contact**: engineering@clixen.app