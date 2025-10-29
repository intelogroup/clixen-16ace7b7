# OAuth Verification Package for Clixen

**Prepared for:** Google Cloud Console OAuth Consent Screen Verification  
**Application:** Clixen - AI Voice Calendar Assistant  
**Domain:** clixen.app  
**Date:** October 29, 2025

---

## 📋 Quick Verification Checklist

- [ ] **Domain verified** in Google Search Console (clixen.app)
- [ ] **OAuth consent screen** completed with all required fields
- [ ] **Privacy Policy** published at https://clixen.app/privacy
- [ ] **Terms of Service** published at https://clixen.app/terms
- [ ] **Support email** configured and monitored
- [ ] **App logo** (120x120px minimum) uploaded
- [ ] **Scopes declared** in Google Cloud Console
- [ ] **Demo video** recorded and uploaded (unlisted YouTube)
- [ ] **Scope justifications** prepared (see below)
- [ ] **Test accounts** ready for verification team
- [ ] **Branding** compliant with Google guidelines

---

## 🎯 Application Overview

**Name:** Clixen  
**Type:** AI-Powered Voice Calendar Assistant  
**Purpose:** Help users manage their Google Calendar through natural language voice commands and text chat

**Core Features:**
- Voice-to-text calendar commands
- Natural language event creation/modification
- Intelligent scheduling assistance
- Conflict detection and resolution
- Multi-calendar management

**Technology Stack:**
- Google Calendar API (for calendar access)
- Google Gemini AI (for natural language understanding)
- Google Cloud Speech-to-Text & Text-to-Speech
- Firebase Authentication
- Node.js backend with WebSocket real-time communication

---

## 🔐 Requested Scopes & Justifications

### ✅ Non-Sensitive Scopes (Pre-approved)

#### 1. `openid`
**Category:** Non-sensitive  
**Purpose:** Basic authentication  
**Justification:** Required for secure user authentication via Google Sign-In. Used to generate unique user identifiers.

#### 2. `profile`
**Category:** Non-sensitive  
**Purpose:** User profile information  
**Justification:** Used to display user's name in the application interface and personalize greetings.

#### 3. `email`
**Category:** Non-sensitive  
**Purpose:** User email address  
**Justification:** Required to identify users uniquely and send important account notifications. Email is used as the primary identifier for storing per-user OAuth tokens.

---

### ⚠️ Sensitive Scopes (Require Verification)

#### 4. `https://www.googleapis.com/auth/calendar.events`
**Category:** Sensitive  
**Scope Level:** Read and write calendar events  
**Why This Scope?** This is the minimum necessary scope to provide our core functionality.

**Detailed Justification:**
Clixen needs this scope to:

1. **Read Calendar Events**
   - Display user's schedule when asked "What's on my calendar today?"
   - Check for conflicts before creating new events
   - Answer queries about specific meetings or appointments
   - Show free/busy times for scheduling assistance

2. **Create Calendar Events**
   - Create events based on voice commands like "Schedule a meeting with John tomorrow at 3pm"
   - Add reminders and notifications as requested
   - Set event details (title, description, location, attendees)

3. **Modify Calendar Events**
   - Update event times when user says "Move my 2pm meeting to 4pm"
   - Change event details (title, location, description)
   - Add or remove attendees from existing events

4. **Delete Calendar Events**
   - Remove events when user says "Cancel my dentist appointment"
   - Clean up duplicate or incorrect events

**User-Initiated Actions Only:**
All calendar operations are triggered explicitly by user voice commands or chat messages. The application never autonomously modifies calendar data without user instruction.

**Example Use Cases:**
- User: "What meetings do I have tomorrow?" → **Read events**
- User: "Schedule a team standup every Monday at 9am" → **Create recurring event**
- User: "Move my 3pm call to Friday" → **Update event**
- User: "Cancel all my meetings next week" → **Delete multiple events**

**Why Not a Narrower Scope?**
`calendar.events.readonly` is insufficient because users need to create, modify, and delete events—not just read them. The core value proposition of Clixen is calendar *management*, not just viewing.

---

#### 5. `https://www.googleapis.com/auth/calendar` (Full Calendar Access)
**Category:** Sensitive  
**Scope Level:** Full read/write access to all calendar data  
**Why This Scope?** Required for advanced features that `calendar.events` alone cannot provide.

**Detailed Justification:**
Clixen needs this scope to:

1. **Multi-Calendar Support**
   - List all of user's calendars (work, personal, shared calendars)
   - Check availability across multiple calendars simultaneously
   - Find free time slots considering all calendars

2. **Conflict Detection**
   - Scan across all calendars to detect scheduling conflicts
   - Prevent double-booking when user has multiple calendars
   - Alert users before creating overlapping events

3. **Calendar Settings & Metadata**
   - Access calendar timezone settings for accurate time conversions
   - Read calendar names and descriptions for intelligent filtering
   - Respect calendar-specific settings (working hours, default reminders)

4. **Smart Scheduling**
   - Find optimal meeting times across multiple calendars
   - Suggest alternative times when conflicts exist
   - Consider calendar priorities and categories

**Example Use Cases:**
- User: "When am I free this week?" → **Scan all calendars for availability**
- User: "Schedule a 1-hour meeting with Sarah when we're both free" → **Check multiple users' calendars**
- User: "Do I have any conflicts tomorrow?" → **Cross-calendar conflict check**

**Why Not Just `calendar.events`?**
The `calendar.events` scope only provides access to events within a single calendar at a time. It does not allow:
- Listing all user calendars
- Accessing calendar metadata and settings
- Efficient multi-calendar queries for availability checking

**Alternative Considered:**
We initially attempted to use only `calendar.events`, but found that:
- Users expect the assistant to check all their calendars (work + personal + shared)
- Conflict detection requires cross-calendar visibility
- Timezone handling requires calendar settings access

**Mitigation:**
- We only read calendar settings; we do not modify calendar metadata
- Event operations still use `calendar.events` level permissions
- Users can selectively grant access to specific calendars during OAuth flow

---

## 🎥 Demo Video Script

**Video Title:** "Clixen OAuth Consent Flow & Calendar Feature Demo"  
**Duration:** 2-3 minutes  
**Visibility:** Unlisted (for verification only)

### Script Outline:

**[0:00-0:20] Introduction**
- Show Clixen landing page at https://clixen.app
- Click "Sign In with Google" button
- Highlight the app name "Clixen" clearly visible

**[0:20-0:45] OAuth Consent Flow**
- Google Sign-In page appears
- Show the OAuth consent screen with:
  - App name: "Clixen"
  - OAuth Client ID visible in browser address bar
  - Scopes listed: Calendar access, profile, email
- Select a Google account
- Click "Allow" to grant permissions

**[0:45-1:00] Post-Authentication**
- User is redirected to Clixen dashboard
- Show successful authentication message
- Display user profile (name, email) from `profile` and `email` scopes

**[1:00-1:30] Reading Calendar Events (calendar.events scope)**
- User asks: "What's on my schedule today?"
- Show calendar events displayed in the interface
- Events pulled from Google Calendar using the API

**[1:30-2:00] Creating Calendar Events (calendar.events scope)**
- User says: "Schedule a team meeting tomorrow at 2pm"
- Show event being created
- Open Google Calendar in another tab to verify event was created

**[2:00-2:30] Multi-Calendar Features (calendar full scope)**
- User asks: "When am I free this week?"
- Show availability across multiple calendars (work + personal)
- Demonstrate conflict detection across calendars

**[2:30-2:45] Modifying & Deleting Events (calendar.events scope)**
- User: "Move my 2pm meeting to 3pm"
- Show event being updated
- User: "Cancel my dentist appointment"
- Show event being deleted

**[2:45-3:00] Closing**
- Show user can revoke access via app settings
- Display Privacy Policy and Terms of Service links
- Thank you message

### Technical Requirements:
- Record in HD (1080p minimum)
- Show full browser window (not just application area)
- Ensure OAuth client ID is visible in browser address bar during consent
- Use a real Google account (test account recommended)
- Demonstrate actual API calls, not mock data
- Show English language throughout

---

## 🔍 Verification Timeline

**Typical Verification Process:**
1. **Submit application** via Google Cloud Console (Day 0)
2. **Initial review** by Google Trust & Safety team (1-2 business days)
3. **Requests for clarification** if needed (respond within 5 business days)
4. **Final review** and approval (2-3 business days after clarifications)
5. **Total estimated time:** 3-5 business days (up to 2 weeks if clarifications needed)

---

## 📝 Additional Documentation Links

These will be provided in the verification form:

1. **Privacy Policy:** https://clixen.app/privacy
2. **Terms of Service:** https://clixen.app/terms
3. **Support Contact:** support@clixen.app
4. **Demo Video:** [YouTube unlisted link - to be added]
5. **Homepage:** https://clixen.app
6. **Documentation:** https://github.com/intelogroup/clixen-16ace7b7

---

## 🧪 Test Accounts

**For Google Verification Team:**

We recommend using any Google account for testing. The application supports:
- Personal Gmail accounts (@gmail.com)
- Google Workspace accounts (custom domains)
- Multiple calendar configurations

**Test Scenarios to Verify:**
1. Complete OAuth flow from landing page
2. Voice command: "What's on my calendar today?"
3. Create event: "Schedule a meeting tomorrow at 10am"
4. Check availability: "When am I free this week?"
5. Modify event: "Move my 10am meeting to 11am"
6. Delete event: "Cancel my meeting tomorrow"
7. Revoke access via app settings

---

## 📊 Expected User Volume

**Initial Launch:**
- **Month 1:** 100-500 users
- **Month 3:** 500-2,000 users
- **Month 6:** 2,000-10,000 users

**Data Usage:**
- Average: 10-50 Calendar API calls per user per day
- Peak: Up to 200 calls per user per day (heavy users)
- Calendar data cached temporarily (24 hours max), then deleted

---

## 🛡️ Security & Compliance

**Token Storage:**
- OAuth tokens stored encrypted at rest (AES-256)
- Tokens stored per-user in isolated secure storage
- Automatic token refresh to maintain access
- Users can revoke access at any time

**Data Handling:**
- Calendar data cached temporarily for conversation context only
- No permanent storage of calendar event content
- Voice recordings processed and deleted within 24 hours
- Compliance with GDPR, CCPA, and Google API Terms

**Google API Compliance:**
- Adherence to Google API Services User Data Policy
- Limited Use requirements followed strictly
- No sale or sharing of user data
- No use of data for advertising or training ML models

---

## ✅ Branding Compliance

**Google Sign-In Branding:**
- Using official "Sign in with Google" button
- Proper button styling per Google brand guidelines
- No misleading association with Google

**Google Calendar Branding:**
- Clear disclosure: "Powered by Google Calendar"
- No use of Google logo without permission
- References to "Google Calendar" for descriptive purposes only

---

## 📧 Verification Submission Notes

**Additional Information for Reviewers:**

**1. Why does Clixen need calendar access?**
Clixen is a calendar management assistant. Without calendar access, it cannot provide its core functionality of helping users manage their schedules through voice commands.

**2. How is user data protected?**
- End-to-end encryption for all communications
- Minimal data retention (temporary caching only)
- OAuth tokens stored securely with automatic expiration
- Regular security audits and updates

**3. Data retention:**
- Calendar events: Cached up to 24 hours, then deleted
- Voice recordings: Processed immediately, deleted within 24 hours
- Conversation history: Retained 90 days, user-deletable
- Authentication tokens: Until user revokes or account deletion

**4. User control:**
Users have full control over their data:
- Revoke calendar access at any time
- Delete conversation history
- Export data before account deletion
- Request data deletion (GDPR/CCPA rights)

**5. Third-party data sharing:**
We do NOT share calendar data with third parties except:
- Google Cloud Platform (infrastructure and AI services) - under DPA
- No marketing, advertising, or analytics partners receive calendar data

---

## 📞 Contact Information

**Developer Contact:**
- **Email:** dev@clixen.app
- **Support Email:** support@clixen.app
- **Privacy Contact:** privacy@clixen.app
- **Legal Contact:** legal@clixen.app

**Company Information:**
- **Name:** [Your Company Name]
- **Website:** https://clixen.app
- **GitHub:** https://github.com/intelogroup/clixen-16ace7b7

---

## 🚀 Post-Verification Steps

Once verification is approved:

1. ✅ Update OAuth consent screen status to "Published"
2. ✅ Remove "Unverified app" warnings from sign-in flow
3. ✅ Enable app for all Google account users
4. ✅ Monitor verification status in Google Cloud Console
5. ✅ Set up ongoing compliance monitoring
6. ✅ Plan for annual re-verification (if required)

---

**Prepared by:** Clixen Development Team  
**Last Updated:** October 29, 2025  
**Version:** 1.0
