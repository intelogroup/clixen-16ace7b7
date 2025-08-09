# Clixen MVP - Project & Workflow Management Mockup

## 🎯 **User Journey: Workflow Management & Organization**

### **Flow Overview**
```
Dashboard → Workflow Details → Edit/Settings → Status Management → Archive/Delete
```

---

## 📊 **Screen 1: Dashboard States (CleanDashboard.tsx Extended)**

### **1a: Dashboard with Multiple Workflows**
```
┌─────────────────────────────────────────────────────────────┐
│ [Clixen] [Workflow Automation]    [Create Workflow] [👤]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your Workflows                              [🔍____________]│
│  5 workflows ready to automate your tasks                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [✅] Daily Analytics Reminder Email        [📋][🗑][⋮] ││
│  │      Send daily email reminders to check analytics     ││
│  │      🟢 Active • Created Aug 9 • 15 executions •       ││
│  │      Last run Aug 8                                     ││
│  └─────────────────────────────────────────────────────────┘│
│  │ [⏸] Weekly Backup Automation              [📋][🗑][⋮] ││
│  │      Backup files to Google Drive every Sunday         ││
│  │      🔵 Paused • Created Aug 7 • 3 executions •        ││
│  │      Last run Aug 6                                     ││
│  └─────────────────────────────────────────────────────────┘│
│  │ [❌] Slack Integration Test                [📋][🗑][⋮] ││
│  │      Test workflow for Slack notifications             ││
│  │      🔴 Failed • Created Aug 6 • 0 executions •        ││
│  │      Error: Invalid webhook URL                        ││
│  └─────────────────────────────────────────────────────────┘│
│  │ [⏳] Customer Survey Automation            [📋][🗑][⋮] ││
│  │      Send follow-up surveys after purchases            ││
│  │      🟡 Draft • Created Aug 5 • Not deployed           ││
│  └─────────────────────────────────────────────────────────┘│
│  │ [✅] Website Monitor                       [📋][🗑][⋮] ││
│  │      Monitor website uptime and send alerts            ││
│  │      🟢 Active • Created Aug 4 • 120 executions •      ││
│  │      Last run 5 min ago                                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│         Powered by AI • Built for automation • 5 workflows │
└─────────────────────────────────────────────────────────────┘
```

### **1b: Search/Filter Results**
```
┌─────────────────────────────────────────────────────────────┐
│  Your Workflows                       [🔍 backup________] X │
│  1 workflow matches "backup"                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [⏸] Weekly Backup Automation              [📋][🗑][⋮] ││
│  │      Backup files to Google Drive every Sunday         ││
│  │      🔵 Paused • Created Aug 7 • 3 executions •        ││
│  │      Last run Aug 6                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [Clear search] or [Create new backup workflow]            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Screen 2: Workflow Actions Menu (On Hover/Click)**

### **Quick Actions Dropdown**
```
┌─────────────────────────────────────────────────────────────┐
│  │ [✅] Daily Analytics Reminder Email        [📋][🗑][⋮] ││
│  │      Send daily email reminders...                     ││
│  │      🟢 Active • Created Aug 9 • 15 executions         ││
│  │                                                         ││
│  │      ┌─────────────────────────────────────────────┐   ││
│  │      │ [▶️] View Execution History                 │   ││
│  │      │ [⏸] Pause Workflow                         │   ││
│  │      │ [🔧] Edit Workflow Settings                 │   ││
│  │      │ [📋] Duplicate Workflow                     │   ││
│  │      │ [📊] View Analytics                         │   ││
│  │      │ [🔗] Copy Webhook URL                       │   ││
│  │      │ [📤] Export Workflow                        │   ││
│  │      │ ─────────────────────────────────────────   │   ││
│  │      │ [🗑] Delete Workflow                        │   ││
│  │      └─────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 **Screen 3: Workflow Details View**

### **3a: Active Workflow Details**
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to Dashboard] Daily Analytics Reminder Email [⚙️] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📋 Workflow Information                                 │ │
│ │                                                         │ │
│ │ Name: Daily Analytics Reminder Email                   │ │
│ │ Status: 🟢 Active                                       │ │
│ │ Created: August 9, 2025                                │ │
│ │ Last Modified: August 9, 2025                          │ │
│ │ n8n Workflow ID: [USR-u123] Daily Analytics Reminder   │ │
│ │                                                         │ │
│ │ Schedule: Monday-Friday at 9:00 AM EST                 │ │
│ │ Next Execution: Tomorrow, 9:00 AM EST                  │ │
│ │ Total Executions: 15                                   │ │
│ │ Success Rate: 100% (15/15)                             │ │
│ │ Last Execution: August 8, 2025 at 9:00 AM              │ │
│ │                                                         │ │
│ │ [⏸ Pause] [🔧 Edit] [📋 Duplicate] [🗑 Delete]         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📊 Execution History (Last 10 runs)                    │ │
│ │                                                         │ │
│ │ Aug 8, 9:00 AM  ✅ Success   124ms   📧 Email sent     │ │
│ │ Aug 7, 9:00 AM  ✅ Success   98ms    📧 Email sent     │ │
│ │ Aug 6, 9:00 AM  ✅ Success   156ms   📧 Email sent     │ │
│ │ Aug 5, 9:00 AM  ✅ Success   87ms    📧 Email sent     │ │
│ │ Aug 2, 9:00 AM  ✅ Success   145ms   📧 Email sent     │ │
│ │ Aug 1, 9:00 AM  ✅ Success   102ms   📧 Email sent     │ │
│ │ Jul 31, 9:00 AM ✅ Success   134ms   📧 Email sent     │ │
│ │ Jul 30, 9:00 AM ✅ Success   92ms    📧 Email sent     │ │
│ │ Jul 29, 9:00 AM ✅ Success   178ms   📧 Email sent     │ │
│ │ Jul 28, 9:00 AM ✅ Success   112ms   📧 Email sent     │ │
│ │                                                         │ │
│ │ [View All Executions] [Download Execution Log]         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💬 Chat History                                         │ │
│ │                                                         │ │
│ │ [View conversation that created this workflow]          │ │
│ │ [Continue conversation to modify workflow]              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **3b: Failed Workflow Details (Error State)**
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to Dashboard] Slack Integration Test [⚙️]          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📋 Workflow Information                                 │ │
│ │                                                         │ │
│ │ Name: Slack Integration Test                            │ │
│ │ Status: 🔴 Failed                                       │ │
│ │ Created: August 6, 2025                                │ │
│ │ Last Modified: August 6, 2025                          │ │
│ │ n8n Workflow ID: [USR-u123] Slack Integration Test     │ │
│ │                                                         │ │
│ │ Schedule: Manual trigger                                │ │
│ │ Total Executions: 0                                    │ │
│ │ Success Rate: N/A (No successful runs)                 │ │
│ │                                                         │ │
│ │ ❌ Current Issues:                                      │ │
│ │   • Invalid webhook URL format                         │ │
│ │   • Missing Slack bot token                            │ │
│ │   • Channel permissions not configured                 │ │
│ │                                                         │ │
│ │ [🔧 Fix Issues] [📋 Duplicate] [🗑 Delete]             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🚨 Error Log                                            │ │
│ │                                                         │ │
│ │ Aug 6, 2:30 PM  ❌ Deploy Failed                       │ │
│ │ Error: Webhook URL validation failed                   │ │
│ │ Details: URL format must be https://hooks.slack.com... │ │
│ │                                                         │ │
│ │ Aug 6, 2:25 PM  ❌ Deploy Failed                       │ │
│ │ Error: Missing required Slack token                    │ │
│ │ Details: Bot token required for channel access         │ │
│ │                                                         │ │
│ │ [View Full Error Log] [Download Troubleshooting Guide] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💡 Suggested Fixes                                      │ │
│ │                                                         │ │
│ │ 1. [Fix Webhook URL] - Update to valid Slack webhook   │ │
│ │ 2. [Configure Bot Token] - Add Slack bot credentials   │ │
│ │ 3. [Test Connection] - Verify Slack permissions        │ │
│ │                                                         │ │
│ │ [Start Auto-Fix Wizard] [Chat with AI for Help]        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ **Screen 4: Workflow Settings & Configuration**

### **Basic Settings Panel**
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back] Daily Analytics Reminder Email - Settings         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📝 Basic Settings                                       │ │
│ │                                                         │ │
│ │ Workflow Name                                           │ │
│ │ [Daily Analytics Reminder Email_______________]         │ │
│ │                                                         │ │
│ │ Description                                             │ │
│ │ [Send daily email reminders to check analytics_____]   │ │
│ │ [dashboard at 9 AM on weekdays________________]         │ │
│ │                                                         │ │
│ │ Status                                                  │ │
│ │ ● Active  ○ Paused  ○ Draft                            │ │
│ │                                                         │ │
│ │ Tags (Optional)                                         │ │
│ │ [daily] [analytics] [email] [+ Add tag]                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⏰ Schedule Settings                                     │ │
│ │                                                         │ │
│ │ Trigger Type: ● Schedule  ○ Webhook  ○ Manual          │ │
│ │                                                         │ │
│ │ Schedule: ● Custom  ○ Hourly  ○ Daily  ○ Weekly        │ │
│ │                                                         │ │
│ │ Days: ☑ Mon ☑ Tue ☑ Wed ☑ Thu ☑ Fri ☐ Sat ☐ Sun      │ │
│ │ Time: [09]:[00] [AM ▼] Timezone: [EST ▼]               │ │
│ │                                                         │ │
│ │ Next execution: Tomorrow, August 10 at 9:00 AM EST     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📧 Email Configuration                                  │ │
│ │                                                         │ │
│ │ Recipient Email                                         │ │
│ │ [john@example.com_________________________]             │ │
│ │                                                         │ │
│ │ Subject Line                                            │ │
│ │ [Daily Analytics Check___________________]              │ │
│ │                                                         │ │
│ │ Email Content                                           │ │
│ │ [Don't forget to check your analytics dashboard!___]    │ │
│ │ [https://analytics.mycompany.com_______________]        │ │
│ │                                                         │ │
│ │ ☑ Include timestamp  ☑ Add unsubscribe link           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [💾 Save Changes] [🔄 Reset] [❌ Cancel] [🧪 Test Workflow]│
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 **Screen 5: Workflow Analytics Dashboard**

### **Performance Analytics View**
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back] Daily Analytics Reminder - Analytics [📊]         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📈 Performance Overview (Last 30 days)                 │ │
│ │                                                         │ │
│ │ Total Executions: 23        Success Rate: 100%         │ │
│ │ Avg. Execution Time: 127ms   Last Run: 2h ago          │ │
│ │                                                         │ │
│ │   Executions   |                                       │ │
│ │     23 ▲       |  ████████████████████████             │ │
│ │     20         |  ███████████████████                  │ │
│ │     15         |  ████████████                         │ │
│ │     10         |  ███████                              │ │
│ │      5         |  ████                                 │ │
│ │      0 ────────┼─────────────────────────────────────  │ │
│ │           Aug 1   Aug 8   Aug 15   Aug 22   Aug 29    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🚀 Execution Details                                    │ │
│ │                                                         │ │
│ │ Fastest Execution: 67ms    (Aug 15, 9:00 AM)           │ │
│ │ Slowest Execution: 234ms   (Aug 3, 9:00 AM)            │ │
│ │ Most Recent: 156ms         (Aug 8, 9:00 AM)            │ │
│ │                                                         │ │
│ │ 📅 Execution Pattern:                                   │ │
│ │ Mon: 5 runs  Tue: 5 runs  Wed: 4 runs  Thu: 5 runs    │ │
│ │ Fri: 4 runs  Sat: 0 runs  Sun: 0 runs                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📧 Email Delivery Stats                                 │ │
│ │                                                         │ │
│ │ Total Emails Sent: 23      Delivery Rate: 100%         │ │
│ │ Bounced Emails: 0          Delivery Failures: 0        │ │
│ │                                                         │ │
│ │ Recent deliveries:                                      │ │
│ │ • Aug 8, 9:00 AM - Delivered successfully              │ │
│ │ • Aug 7, 9:00 AM - Delivered successfully              │ │
│ │ • Aug 6, 9:00 AM - Delivered successfully              │ │
│ │ • Aug 5, 9:00 AM - Delivered successfully              │ │
│ │                                                         │ │
│ │ [View Full Delivery Log]                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [📄 Export Report] [📊 Advanced Analytics] [🔔 Set Alerts]│
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂 **Screen 6: Bulk Management Actions**

### **Multi-Select Dashboard State**
```
┌─────────────────────────────────────────────────────────────┐
│ [Clixen] [Workflow Automation]    [Create Workflow] [👤]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your Workflows              [☑ Select All] [Actions ▼]    │
│  5 workflows, 3 selected                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │☑[✅] Daily Analytics Reminder Email        [📋][🗑][⋮] ││
│  │     Send daily email reminders to check analytics      ││
│  │     🟢 Active • Created Aug 9 • 15 executions          ││
│  └─────────────────────────────────────────────────────────┘│
│  │☑[⏸] Weekly Backup Automation              [📋][🗑][⋮] ││
│  │     Backup files to Google Drive every Sunday          ││
│  │     🔵 Paused • Created Aug 7 • 3 executions           ││
│  └─────────────────────────────────────────────────────────┘│
│  │☐[❌] Slack Integration Test                [📋][🗑][⋮] ││
│  │     Test workflow for Slack notifications              ││
│  │     🔴 Failed • Created Aug 6 • 0 executions           ││
│  └─────────────────────────────────────────────────────────┘│
│  │☑[⏳] Customer Survey Automation            [📋][🗑][⋮] ││
│  │     Send follow-up surveys after purchases             ││
│  │     🟡 Draft • Created Aug 5 • Not deployed            ││
│  └─────────────────────────────────────────────────────────┘│
│  │☐[✅] Website Monitor                       [📋][🗑][⋮] ││
│  │     Monitor website uptime and send alerts             ││
│  │     🟢 Active • Created Aug 4 • 120 executions         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📦 Bulk Actions (3 workflows selected)                 │ │
│ │                                                         │ │
│ │ [⏸ Pause All] [▶️ Activate All] [📋 Duplicate All]     │ │
│ │ [🏷 Add Tags] [📤 Export Selected] [🗑 Delete All]      │ │ 
│ │                                                         │ │
│ │ [❌ Cancel Selection] [☑ Select All]                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│         Powered by AI • Built for automation • 5 workflows │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏷 **Screen 7: Workflow Organization Features**

### **Tag Management Interface**
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back] Workflow Tags & Organization                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏷 Available Tags                                       │ │
│ │                                                         │ │
│ │ [daily] (2 workflows)      [email] (3 workflows)       │ │
│ │ [backup] (1 workflow)      [analytics] (2 workflows)   │ │
│ │ [monitoring] (1 workflow)  [test] (1 workflow)         │ │
│ │ [automation] (5 workflows) [scheduled] (4 workflows)   │ │
│ │                                                         │ │
│ │ [+ Create New Tag]                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📊 Filter by Tags                                       │ │
│ │                                                         │ │
│ │ Active filters: [daily] [X] [email] [X]                │ │
│ │ Showing 2 workflows                                     │ │
│ │                                                         │ │
│ │ Clear all filters  |  Save this view                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📂 Workflow Collections                                 │ │
│ │                                                         │ │
│ │ 📁 Daily Automations (2 workflows)                     │ │
│ │    • Daily Analytics Reminder Email                    │ │
│ │    • Morning Task Notifications                        │ │
│ │                                                         │ │
│ │ 📁 Data & Backups (2 workflows)                        │ │
│ │    • Weekly Backup Automation                          │ │
│ │    • Database Health Monitor                           │ │
│ │                                                         │ │
│ │ 📁 Communication (1 workflow)                          │ │
│ │    • Slack Integration Test                             │ │
│ │                                                         │ │
│ │ [+ Create New Collection]                               │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 **Mobile Workflow Management**

### **Mobile Dashboard with Actions**
```
┌─────────────────┐
│[Clixen] [+] [👤]│
├─────────────────┤
│                 │
│ Your Workflows  │
│ 5 workflows     │
│                 │
│┌───────────────┐│
││[✅] Daily Ana.││
││📧 Email Remi. ││
││               ││
││🟢 Active      ││
││15 executions  ││
││               ││
││[⏸][📋][🗑][⋮]││
│└───────────────┘│
│┌───────────────┐│
││[⏸] Backup    ││
││💾 Google Dr.  ││
││🔵 Paused 3 ex.││
││[▶️][📋][🗑][⋮]││
│└───────────────┘│
│                 │
│ [Search] [Tags] │
│ [+ New Workflow]│
└─────────────────┘
```

### **Mobile Workflow Detail**
```
┌─────────────────┐
│[←] Analytics Rem│
├─────────────────┤
│                 │
│ 📋 Info         │
│ Status: Active  │
│ Runs: 15        │
│ Success: 100%   │
│ Next: Tomorrow  │
│ 9:00 AM EST     │
│                 │
│ [⏸][🔧][📋][🗑] │
│                 │
│ 📊 Recent Runs  │
│ Aug 8 ✅ 124ms  │
│ Aug 7 ✅ 98ms   │
│ Aug 6 ✅ 156ms  │
│                 │
│ [View All]      │
│                 │
│ 💬 Chat History │
│ [View Original] │
│ [Modify]        │
└─────────────────┘
```

---

## 🔑 **Key Management Features**

### **Status Management**
- **Visual Status Indicators**: Color-coded status badges
- **Quick Status Changes**: One-click pause/resume
- **Status History**: Track status changes over time

### **Workflow Organization**
- **Search & Filter**: Find workflows quickly
- **Tagging System**: Organize by purpose/type
- **Bulk Actions**: Manage multiple workflows
- **Collections**: Group related workflows

### **Performance Monitoring**
- **Execution History**: Detailed run logs
- **Performance Metrics**: Speed, success rates
- **Error Tracking**: Failed execution details
- **Usage Analytics**: Trends and patterns

### **Maintenance Operations**
- **Settings Management**: Edit workflow configuration
- **Duplicate/Clone**: Copy successful workflows
- **Archive/Delete**: Clean up old workflows
- **Export/Backup**: Save workflow definitions

This comprehensive project and workflow management system ensures users can efficiently organize, monitor, and maintain their automated workflows at scale.