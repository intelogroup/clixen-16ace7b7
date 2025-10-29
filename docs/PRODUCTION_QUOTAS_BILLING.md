# Production Quotas & Billing Guide

**Application:** Clixen - AI Voice Calendar Assistant  
**Last Updated:** October 29, 2025

---

## 📊 API Usage Estimates

### Per-User Daily Usage (Average)

| Service | Requests/Day | Monthly | Notes |
|---------|--------------|---------|-------|
| **Google Calendar API** | 20-50 | 600-1,500 | List events, create, update, delete |
| **Gemini AI (1.5 Flash)** | 30-100 | 900-3,000 | Chat messages, intent analysis |
| **Speech-to-Text** | 10-30 | 300-900 | Voice commands |
| **Text-to-Speech** | 10-30 | 300-900 | Voice responses |
| **Firebase Auth** | 1-3 | 30-90 | Token verification |
| **Firestore Reads** | 20-50 | 600-1,500 | Conversation history, settings |
| **Firestore Writes** | 5-15 | 150-450 | Save conversations, settings |

### Initial Launch Estimates

**Month 1:** 100-500 users
- Calendar API: 60K-750K requests/month
- Gemini: 90K-1.5M requests/month
- Speech services: 30K-450K requests/month

**Month 3:** 500-2,000 users
- Calendar API: 300K-3M requests/month
- Gemini: 450K-6M requests/month  
- Speech services: 150K-1.8M requests/month

**Month 6:** 2,000-10,000 users
- Calendar API: 1.2M-15M requests/month
- Gemini: 1.8M-30M requests/month
- Speech services: 600K-9M requests/month

---

## 💰 Cost Estimates

### Google Cloud Services Pricing (as of Oct 2025)

#### 1. Gemini API (Vertex AI)

**Gemini 1.5 Flash:**
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- Free tier: First 15 requests/minute

**Estimated Monthly Costs:**
- 100 users: $20-50/month
- 500 users: $100-250/month
- 2,000 users: $400-1,000/month
- 10,000 users: $2,000-5,000/month

#### 2. Google Calendar API

**Quota:**
- 1,000,000 queries per day (free)
- 500 queries per 100 seconds per user

**Cost:** FREE (within quota limits)

**Estimated Usage:**
- Month 1: 60K-750K/month → Well within free tier
- Month 6: 1.2M-15M/month → May need quota increase request

#### 3. Cloud Speech-to-Text

**Standard Model:**
- $0.006 per 15 seconds of audio
- First 60 minutes free per month

**Estimated Monthly Costs:**
- 100 users: $10-30/month
- 500 users: $50-150/month
- 2,000 users: $200-600/month
- 10,000 users: $1,000-3,000/month

#### 4. Cloud Text-to-Speech

**Standard Voices:**
- $4.00 per 1M characters
- First 4M characters free per month

**Neural2 Voices:**
- $16.00 per 1M characters

**Estimated Monthly Costs:**
- 100 users: $5-15/month
- 500 users: $25-75/month
- 2,000 users: $100-300/month
- 10,000 users: $500-1,500/month

#### 5. Firebase (Authentication + Firestore)

**Firebase Authentication:**
- FREE (unlimited users)

**Firestore:**
- Document reads: $0.06 per 100K
- Document writes: $0.18 per 100K
- Storage: $0.18/GB/month
- Network egress: $0.12/GB

**Estimated Monthly Costs:**
- 100 users: $5-10/month
- 500 users: $20-40/month
- 2,000 users: $80-160/month
- 10,000 users: $400-800/month

#### 6. Cloud Run (Hosting)

**Pricing:**
- CPU: $0.00002400/vCPU-second
- Memory: $0.00000250/GiB-second
- Requests: First 2M free, then $0.40 per million

**Estimated Monthly Costs:**
- 100 users: $10-30/month
- 500 users: $50-100/month
- 2,000 users: $200-400/month
- 10,000 users: $1,000-2,000/month

---

## 📈 Total Monthly Cost Projections

| Users | Low Estimate | High Estimate | Average |
|-------|--------------|---------------|---------|
| 100 | $50 | $135 | $90 |
| 500 | $245 | $615 | $430 |
| 2,000 | $980 | $2,460 | $1,720 |
| 10,000 | $4,900 | $12,300 | $8,600 |

**Note:** Estimates assume average usage. Power users may consume 3-5x more.

---

## 🎯 Google for Startups Credits

### Eligibility for $350K Credits

**Requirements:**
- AI-first startup using Vertex AI/Gemini
- Seed to Series A funding
- Founded within last 10 years
- < $5,000 in prior Google Cloud credits

**How to Apply:**
1. Visit: https://cloud.google.com/startup/ai
2. Complete application with:
   - Company overview
   - Product description
   - Architecture diagram
   - Funding details (if applicable)
3. If VC-backed, request referral from your investor

**What's Covered:**
- ✅ Gemini API / Vertex AI
- ✅ Speech-to-Text / Text-to-Speech
- ✅ Cloud Run hosting
- ✅ Firestore database
- ✅ Cloud Storage
- ❌ Google Calendar API (already free)
- ❌ Third-party services

**Credit Allocation:**
- Year 1: Up to $200K
- Year 2: Up to $150K
- Total: Up to $350K over 2 years

---

## ⚙️ Quota Configuration

### 1. Google Calendar API Quotas

**Default Quotas:**
- Queries per day: 1,000,000
- Queries per 100 seconds per user: 500

**Monitoring:**
```bash
# Check quota usage
gcloud alpha services quota list \
  --service=calendar-json.googleapis.com \
  --consumer=projects/YOUR_PROJECT_ID
```

**Request Increase:**
1. Go to Google Cloud Console → APIs & Services → Quotas
2. Filter for "Calendar API"
3. Select quota to increase
4. Click "Edit Quotas"
5. Justify increase request
6. Submit (usually approved within 1-3 business days)

**Recommended Increases for Production:**
- Queries per day: 5,000,000 (for 2K+ users)
- Queries per 100 seconds per user: 1,000 (for power users)

### 2. Gemini API Rate Limits

**Free Tier:**
- 15 requests per minute
- 1,500 requests per day
- 1M tokens per day

**Paid Tier (Vertex AI):**
- 300 requests per minute per project
- No daily limit (pay-as-you-go)

**Implementation:**
```javascript
// backend/server/services/gemini/client.js
const RATE_LIMIT = {
  maxRequests: 300,
  perMinutes: 1,
  perUser: 100 // per 15 minutes
};

// Implement rate limiting middleware
```

### 3. Speech-to-Text Limits

**Default:**
- 1,000 requests per minute
- 10,000 requests per day

**Request Increase:**
- Go to Quotas page in Cloud Console
- Filter for "Speech-to-Text API"
- Request increase for production workload

### 4. Firebase Quotas

**Firestore:**
- 20K document writes per day (free tier)
- 50K document reads per day (free tier)
- 1 GB storage (free tier)

**Production (Blaze Plan):**
- Unlimited reads/writes (pay-per-use)
- Automatic scaling

**Monitoring:**
```bash
# Check Firestore usage
firebase projects:list
firebase ext:info firestore
```

---

## 🚨 Billing Alerts & Budgets

### Set Up Billing Alerts

**In Google Cloud Console:**

1. **Navigate to Billing → Budgets & alerts**

2. **Create Budget:**
```yaml
Budget Name: Clixen Production Budget
Projects: clixen-production
Budget Amount: $1,000 USD per month
```

3. **Alert Thresholds:**
```yaml
- 50% of budget ($500) → Email warning
- 75% of budget ($750) → Email + Slack alert
- 90% of budget ($900) → Email + Slack + PagerDuty
- 100% of budget ($1,000) → CRITICAL alert + Rate limit consideration
```

4. **Alert Recipients:**
```
- dev@clixen.app
- billing@clixen.app
- founder@clixen.app
```

### Implement Usage Monitoring

**Cloud Monitoring Dashboard:**

```yaml
Dashboard: "Clixen API Usage"
Widgets:
  - Calendar API requests per day
  - Gemini API requests per minute
  - Speech-to-Text minutes used
  - Text-to-Speech characters processed
  - Firestore read/write operations
  - Cloud Run CPU/Memory usage
  - Cost projection (daily/monthly)
```

**Alert Policies:**

```yaml
- Alert: "Calendar API approaching quota"
  Condition: > 800K requests per day
  Notification: Email + Slack

- Alert: "Gemini API high usage"
  Condition: > 200 requests per minute
  Notification: Email

- Alert: "Unexpected cost spike"
  Condition: Daily cost > $100
  Notification: Email + Slack + SMS
```

### Cost Optimization Script

```javascript
// scripts/monitor-costs.js
const { Monitoring } = require('@google-cloud/monitoring');

async function checkDailyCosts() {
  const client = new Monitoring.MetricServiceClient();
  
  // Query billing data
  const [timeSeries] = await client.listTimeSeries({
    name: client.projectPath(projectId),
    filter: 'metric.type="serviceruntime.googleapis.com/api/request_count"',
    interval: {
      endTime: { seconds: Date.now() / 1000 },
      startTime: { seconds: (Date.now() / 1000) - 86400 }
    }
  });
  
  // Calculate costs
  const costs = calculateCosts(timeSeries);
  
  // Alert if over threshold
  if (costs.total > DAILY_BUDGET) {
    await sendAlert(`Daily cost exceeded: $${costs.total}`);
  }
}

// Run every hour
setInterval(checkDailyCosts, 3600000);
```

---

## 📋 Production Launch Checklist

### Before Launch

- [ ] **Enable Billing** on Google Cloud project
- [ ] **Set up budgets** and billing alerts
- [ ] **Request quota increases** for anticipated load
- [ ] **Apply for Google for Startups credits** (if eligible)
- [ ] **Enable Cloud Monitoring** and create dashboards
- [ ] **Set up cost alerts** at 50%, 75%, 90%, 100%
- [ ] **Test rate limiting** and error handling
- [ ] **Configure auto-scaling** for Cloud Run
- [ ] **Set up backup billing payment method**
- [ ] **Document cost optimization strategies**

### First Week Monitoring

- [ ] Check actual vs. estimated usage daily
- [ ] Adjust rate limits if needed
- [ ] Monitor for quota errors
- [ ] Review billing dashboard
- [ ] Optimize inefficient API calls

### Monthly Review

- [ ] Analyze cost breakdown by service
- [ ] Identify optimization opportunities
- [ ] Update usage projections
- [ ] Review and adjust budgets
- [ ] Plan for scaling

---

## 🔧 Cost Optimization Tips

### 1. Caching Strategy

```javascript
// Aggressive caching for calendar data
const CACHE_TTL = {
  calendarList: 3600,      // 1 hour
  events: 1800,             // 30 minutes
  freeBusy: 300,            // 5 minutes
  settings: 86400           // 24 hours
};
```

**Savings:** 30-50% reduction in Calendar API calls

### 2. Batch Requests

```javascript
// Instead of 10 individual calendar queries
const events = await Promise.all([
  calendar.events.list({ calendarId: 'primary', ... }),
  calendar.events.list({ calendarId: 'work', ... }),
  // ...
]);

// Use batch API (1 request)
const batch = calendar.batch();
calendars.forEach(cal => {
  batch.add(calendar.events.list({ calendarId: cal.id }));
});
const results = await batch.execute();
```

**Savings:** 70-90% reduction in API calls

### 3. Gemini Model Selection

- Use **Gemini 1.5 Flash** for simple queries (5x cheaper than Pro)
- Use **Gemini 1.5 Pro** only for complex scheduling logic
- Implement prompt caching for repeated instructions

**Savings:** 60-80% reduction in Gemini costs

### 4. Speech Services Optimization

- Use **streaming** instead of batch transcription
- Implement **voice activity detection** (don't process silence)
- Use **standard voices** instead of Neural2 for non-critical responses

**Savings:** 40-60% reduction in speech costs

### 5. Firestore Optimization

- Use **subcollections** to reduce read operations
- Implement **pagination** (limit: 10-20 docs per query)
- Cache user settings client-side
- Use **transactions** to reduce write operations

**Savings:** 50-70% reduction in Firestore costs

---

## 📞 Support & Escalation

**For Quota Increases:**
- Google Cloud Console → Quotas page
- Typical approval time: 1-3 business days
- Provide justification and usage projections

**For Billing Issues:**
- Email: cloud-billing@google.com
- Support: console.cloud.google.com/support
- Phone: Available for paid support plans

**For Startup Credits:**
- Apply: cloud.google.com/startup/ai
- Questions: startups@google.com
- Partner referrals: Via your VC firm

---

**Prepared by:** Clixen Development Team  
**Next Review:** November 29, 2025  
**Version:** 1.0.0
