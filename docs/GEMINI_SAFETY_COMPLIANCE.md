# Gemini AI Safety & Compliance Guidelines

**Document Version:** 1.0  
**Last Updated:** October 29, 2025  
**Application:** Clixen - AI Voice Calendar Assistant

---

## 📋 Executive Summary

This document outlines Clixen's compliance with Google's Vertex AI / Gemini API Terms of Service, Generative AI Prohibited Use Policy, and safety best practices. We implement content filtering, safety settings, and responsible AI practices to ensure safe, reliable service for our users.

---

## ✅ Compliance with Google Vertex AI Terms

### 1. Acceptable Use

**Clixen's Use Case:**
- ✅ Personal productivity tool (calendar management)
- ✅ Natural language processing for user commands
- ✅ Context-aware conversation about calendar events
- ✅ Time-sensitive scheduling assistance

**We DO NOT:**
- ❌ Generate harmful, illegal, or abusive content
- ❌ Use AI for surveillance or discriminatory purposes
- ❌ Impersonate humans or mislead users about AI nature
- ❌ Process sensitive personal data of third parties without consent
- ❌ Use output to train competing models
- ❌ Bypass safety mechanisms or content filters

### 2. Prohibited Use Cases

Clixen explicitly **prohibits** and **prevents** the following use cases per Google's Generative AI Prohibited Use Policy:

| Prohibited Use | Prevention Mechanism |
|----------------|----------------------|
| Child Sexual Abuse Material (CSAM) | Content filtering enabled; immediate blocking |
| Illegal activity coordination | User prompts screened; no illegal action support |
| Harassment, bullying, or threats | Safety filters block abusive content generation |
| Deceptive practices (fraud, phishing) | No external communication features; calendar-only |
| Malware or hacking tools | No code execution; sandboxed environment |
| Misinformation campaigns | Calendar data only; no news/political content |
| Adult content generation | Calendar-focused; strict content filters |
| Hate speech or incitement to violence | Gemini safety settings: BLOCK_MEDIUM_AND_ABOVE |

---

## 🛡️ Safety Configuration

### Gemini Safety Settings

```javascript
// Applied to all Gemini API calls in Clixen
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];
```

**Implementation Location:**
- `backend/server/services/gemini/client.js`
- `backend/server/services/gemini/chat.js`
- `backend/server/services/gemini/streaming.js`

### Content Filtering Pipeline

**Input Filtering (User → AI):**
1. **Length Validation:** Max 5000 characters per message
2. **Pattern Detection:** Block known abuse patterns (profanity, threats)
3. **Intent Analysis:** Validate command relates to calendar functionality
4. **PII Sanitization:** Remove unnecessary personally identifiable information

**Output Filtering (AI → User):**
1. **Safety Filter Check:** Gemini safety settings automatically applied
2. **Response Validation:** Ensure response is calendar-related
3. **Error Handling:** Gracefully handle blocked/flagged responses
4. **Audit Logging:** Log blocked content for monitoring

**Implementation:**
```javascript
// backend/server/utils/intentAnalyzer.js
function validateUserInput(message) {
  // Length check
  if (message.length > 5000) {
    throw new Error('Message too long');
  }
  
  // Basic profanity/abuse detection
  const abusivePatterns = /regex_patterns_here/gi;
  if (abusivePatterns.test(message)) {
    throw new Error('Inappropriate content detected');
  }
  
  // Calendar relevance check
  const isCalendarRelated = analyzeIntent(message);
  if (!isCalendarRelated) {
    return { warning: 'Command may not be calendar-related' };
  }
  
  return { valid: true };
}
```

---

## 🎯 Responsible AI Practices

### 1. Transparency

**User Awareness:**
- ✅ Clear disclosure that Clixen uses AI (Gemini)
- ✅ "Powered by Google Gemini AI" displayed in UI
- ✅ Explanation of AI limitations in documentation
- ✅ Privacy Policy explains data processing

**AI Limitations Communicated:**
- AI responses may contain errors
- Users should verify critical appointments
- AI cannot guarantee perfect understanding
- Calendar modifications require user initiation

### 2. User Control

**Users Can:**
- ✅ Review AI-generated responses before executing
- ✅ Confirm destructive actions (event deletion)
- ✅ Edit or cancel AI suggestions
- ✅ Provide feedback on incorrect responses
- ✅ Delete conversation history at any time
- ✅ Revoke calendar access immediately

**Confirmation Required For:**
- Deleting multiple events
- Modifying recurring events
- Adding external attendees to meetings
- Clearing calendar data

### 3. Data Minimization

**What We Process:**
- ✅ Calendar events (read-only caching, max 24h)
- ✅ User voice commands (processed immediately, deleted within 24h)
- ✅ Conversation context (retained 90 days, user-deletable)

**What We DO NOT Process:**
- ❌ Email content (no Gmail access requested)
- ❌ Drive files (no Drive access)
- ❌ Location history beyond calendar event locations
- ❌ Third-party user data without explicit consent

**Data Retention:**
```javascript
// Automatic cleanup policies
const DATA_RETENTION = {
  calendarCache: '24 hours',
  voiceRecordings: '24 hours', 
  conversationHistory: '90 days',
  analyticsLogs: '30 days'
};
```

### 4. Bias Mitigation

**Awareness:**
- AI models may reflect biases in training data
- Clixen's calendar-focused use case minimizes bias exposure
- No demographic profiling or personalization based on protected characteristics

**Mitigation Steps:**
- Neutral language in prompts and responses
- No assumptions about user demographics
- Equal functionality for all users
- Regular review of AI outputs for fairness

---

## 🔍 Monitoring & Incident Response

### Safety Monitoring

**Automated Monitoring:**
- Safety filter trigger rate (target: < 0.1%)
- Blocked content categories and frequency
- Error rates and model failures
- User feedback on inappropriate responses

**Manual Review:**
- Weekly review of flagged content
- Monthly safety audit
- User-reported issues prioritized
- Continuous improvement of filters

### Incident Response Plan

**If Harmful Content Generated:**

1. **Immediate (< 5 minutes):**
   - Block content from reaching user
   - Log incident with full context
   - Alert development team

2. **Short-term (< 24 hours):**
   - Investigate root cause
   - Update content filters if needed
   - Notify affected users (if applicable)

3. **Long-term (< 7 days):**
   - Implement permanent fix
   - Update safety settings
   - Report to Google if Gemini API issue
   - Document in incident log

**Escalation Path:**
1. On-call engineer
2. Security team
3. Legal/compliance (if GDPR/regulatory impact)
4. Google Vertex AI support (if model issue)

---

## 📊 Safety Metrics & KPIs

| Metric | Target | Frequency |
|--------|--------|-----------|
| Safety filter block rate | < 0.1% | Daily |
| User-reported inappropriate content | 0 per 1000 users | Weekly |
| AI error rate | < 2% | Daily |
| Response time degradation (safety overhead) | < 50ms | Continuous |
| False positive (over-blocking) | < 0.5% | Weekly |

**Dashboard:**
- Real-time monitoring in application logs
- Weekly safety report emailed to team
- Monthly review with stakeholders

---

## 🔐 Data Security for AI Processing

### Data Flow

```
User Input → Input Validation → Gemini API (TLS 1.3 encrypted)
                                      ↓
                              Safety Filters Applied
                                      ↓
Response ← Output Validation ← Gemini Response
```

### Security Measures

1. **Encryption:**
   - All data in transit: TLS 1.3
   - All data at rest: AES-256
   - API keys stored in environment variables (never in code)

2. **Access Control:**
   - Gemini API key restricted to Clixen backend only
   - No client-side access to AI models
   - Rate limiting per user (100 requests/15 minutes)

3. **Audit Logging:**
   - All AI requests logged (without PII)
   - Safety filter triggers logged
   - Blocked content logged for review
   - Logs retained 90 days, then deleted

---

## 📝 Prohibited Content Examples

**Clixen will BLOCK these types of requests:**

❌ "Generate a fake doctor's note for tomorrow"  
❌ "Help me plan an illegal activity"  
❌ "Create a threatening message for my coworker"  
❌ "Write adult content in my calendar notes"  
❌ "How do I hack into someone's email?"

**Clixen ALLOWS calendar-appropriate requests:**

✅ "What's on my schedule today?"  
✅ "Schedule a team meeting next Tuesday at 2pm"  
✅ "Find me free time this week for a 1-hour workout"  
✅ "Cancel my dentist appointment tomorrow"  
✅ "Remind me to call John on Friday"

---

## 🎓 Team Training

**All team members complete:**
- Google's Responsible AI practices course
- Gemini API safety documentation review
- Clixen-specific safety policy training
- Incident response simulation

**Refresher Training:**
- Quarterly safety policy updates
- Annual comprehensive review
- After any safety incident

---

## 📞 Contact & Reporting

**For Safety Concerns:**
- **Email:** safety@clixen.app
- **Response Time:** < 24 hours
- **Escalation:** security@clixen.app

**For Gemini API Issues:**
- Report to Google Cloud Support
- Reference Clixen project ID
- Include incident details and logs

---

## 🔄 Continuous Improvement

### Regular Reviews

- **Monthly:** Safety metrics review
- **Quarterly:** Policy updates based on new Google guidelines
- **Annually:** Comprehensive safety audit

### Feedback Loop

1. User reports inappropriate content
2. Incident logged and reviewed
3. Filters updated if needed
4. User notified of resolution
5. Documented for future prevention

---

## ✅ Compliance Checklist

- [x] Gemini safety settings configured (BLOCK_MEDIUM_AND_ABOVE)
- [x] Content filtering implemented (input & output)
- [x] User consent obtained (Privacy Policy, ToS)
- [x] Data minimization practiced
- [x] Audit logging enabled
- [x] Incident response plan documented
- [x] Team training completed
- [x] Monitoring dashboard active
- [x] Prohibited use cases blocked
- [x] Transparency provided to users

---

## 📚 References

- [Google Generative AI Prohibited Use Policy](https://policies.google.com/terms/generative-ai/use-policy)
- [Vertex AI Terms of Service](https://cloud.google.com/vertex-ai/docs/generative-ai/learn/responsible-ai)
- [Gemini API Safety Settings Documentation](https://ai.google.dev/docs/safety_setting_gemini)
- [Google Cloud Responsible AI Practices](https://cloud.google.com/responsible-ai)

---

**Approved by:** Clixen Development Team  
**Next Review Date:** November 29, 2025  
**Version:** 1.0.0
