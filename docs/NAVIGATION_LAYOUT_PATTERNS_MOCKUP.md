# Clixen MVP - Navigation & Layout Patterns Mockup

## 🎯 **User Journey: App Navigation & Layout Consistency**

### **Flow Overview**
```
Header Navigation → Page Layouts → Mobile Navigation → Responsive Patterns
```

---

## 🧭 **Pattern 1: Global Header Navigation**

### **1a: Standard Header (Desktop)**
```
┌─────────────────────────────────────────────────────────────┐
│ [Clixen 🔄] [Workflow Automation]    [Create Workflow] [👤] │
├─────────────────────────────────────────────────────────────┤
```

**Header Components Breakdown:**
```
┌─────────────────────────────────────────────────────────────┐
│ Logo Area          Breadcrumb          Actions      Profile │
│ ├─[Clixen]         ├─[Workflow Auto]   ├─[+ Create] ├─[👤] │
│ └─[🔄 Status]      └─[Context info]    └─[Primary]  └─[Menu]│
└─────────────────────────────────────────────────────────────┘
```

### **1b: Context-Aware Header States**

**Dashboard Header:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Clixen 🟢] [Dashboard]            [Create Workflow] [👤▼] │
└─────────────────────────────────────────────────────────────┘
```

**Chat Header:**
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back] [🤖 Workflow Chat] [Draft]      [⚙️] [💾] [👤▼] │
└─────────────────────────────────────────────────────────────┘
```

**Workflow Detail Header:**
```
┌─────────────────────────────────────────────────────────────┐
│ [← Dashboard] [Daily Email Reminder] [Active]   [Actions▼] │
└─────────────────────────────────────────────────────────────┘
```

### **1c: User Profile Dropdown**
```
┌─────────────────────────────────────────────────────────────┐
│                                         [Create Workflow] [👤▼]
├─────────────────────────────────────────────────────────────┤
│                                                      ┌──────┐
│                                                      │[👤]  │
│                                                      │John D│
│                                                      ├──────┤
│                                                      │📊 Da.│
│                                                      │⚙️ Set│
│                                                      │🔔 Al.│
│                                                      │📞 Su.│
│                                                      │──────│
│                                                      │🚪 Sig│
│                                                      └──────┘
```

**Expanded Profile Menu:**
```
┌─────────────────────────────────────────────────────────────┐
│                                         [Create Workflow] [👤▼]
├─────────────────────────────────────────────────────────────┤
│                                              ┌─────────────┐
│                                              │ [👤] John D │
│                                              │ john@ex.com │
│                                              │ Free Plan   │
│                                              ├─────────────┤
│                                              │ 📊 Dashboard│
│                                              │ ⚙️ Settings │
│                                              │ 🔔 Alerts   │
│                                              │ 💰 Billing  │
│                                              │ 📞 Support  │
│                                              │ 📖 Help     │
│                                              ├─────────────┤
│                                              │ 🚪 Sign Out │
│                                              └─────────────┘
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 **Pattern 2: Mobile Navigation**

### **2a: Mobile Header (Collapsed)**
```
┌─────────────────┐
│[☰] Clixen [👤] │
├─────────────────┤
```

### **2b: Mobile Menu (Expanded)**
```
┌─────────────────┐
│[✕] Clixen [👤] │
├─────────────────┤
│                 │
│🏠 Dashboard     │
│💬 New Chat     │
│📊 Analytics    │
│⚙️ Settings     │
│🔔 Alerts       │
│                 │
│───────────────  │
│                 │
│📞 Support      │
│📖 Help         │
│🚪 Sign Out     │
│                 │
│───────────────  │
│                 │
│👤 John Doe     │
│📧 john@ex.com  │
│💰 Free Plan    │
└─────────────────┘
```

### **2c: Mobile Context Navigation**
```
Chat Screen:
┌─────────────────┐
│[← Back] 🤖 [⚙️] │
├─────────────────┤

Workflow Detail:
┌─────────────────┐
│[←] Email [⋮]    │
├─────────────────┤

Settings Page:
┌─────────────────┐
│[←] Settings     │
├─────────────────┤
```

---

## 🏗 **Pattern 3: Page Layout Structure**

### **3a: Dashboard Layout**
```
┌─────────────────────────────────────────────────────────────┐
│                    HEADER                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PAGE TITLE AREA                    QUICK ACTIONS          │
│  ├─ Main heading                    ├─ Primary button      │
│  ├─ Subtitle/description            ├─ Secondary actions   │
│  └─ Context information             └─ Search/filters      │
│                                                             │
│  MAIN CONTENT AREA                                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │  WORKFLOW GRID/LIST                                     ││
│  │  ├─ Empty state (if no workflows)                      ││
│  │  ├─ Workflow cards/rows                                ││
│  │  ├─ Pagination (if needed)                             ││
│  │  └─ Loading states                                     ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  FOOTER AREA                                                │
│  └─ Status information, tips, or branding                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **3b: Chat Interface Layout**
```
┌─────────────────────────────────────────────────────────────┐
│                  CHAT HEADER                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CHAT MESSAGES AREA (Scrollable)                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │  [🤖] AI Message bubble                                 ││
│  │       ├─ Message content                               ││
│  │       ├─ Timestamp                                     ││
│  │       └─ Action buttons (if any)                       ││
│  │                                                         ││
│  │                  [👤] User message bubble              ││
│  │                       ├─ Message content               ││
│  │                       └─ Timestamp                     ││
│  │                                                         ││
│  │  [🤖] AI Response with workflow creation               ││
│  │       ├─ Progress indicators                           ││
│  │       ├─ Workflow summary                              ││
│  │       └─ Action buttons                                ││
│  │                                                         ││
│  │  AUTO-SCROLL TO BOTTOM                                 ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  MESSAGE INPUT AREA (Fixed bottom)                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Message input field...] [📎] [🎤] [Send →]            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **3c: Workflow Detail Layout**
```
┌─────────────────────────────────────────────────────────────┐
│                 WORKFLOW HEADER                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WORKFLOW OVERVIEW CARD                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Title, status, key metrics, quick actions               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  MAIN CONTENT TABS/SECTIONS                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [📊 Overview] [📈 Analytics] [⚙️ Settings] [💬 Chat]    ││
│  ├─────────────────────────────────────────────────────────┤│
│  │                                                         ││
│  │  TAB CONTENT AREA                                       ││
│  │  ├─ Execution history                                   ││
│  │  ├─ Performance metrics                                 ││
│  │  ├─ Error logs                                          ││
│  │  └─ Configuration details                               ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 **Pattern 4: Responsive Breakpoints**

### **4a: Desktop Layout (1200px+)**
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] [Breadcrumb]              [Actions] [Profile]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Title & Description                    Search & Filters   │
│                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │   Workflow 1    │ │   Workflow 2    │ │  Workflow 3   │ │
│  │   [Details]     │ │   [Details]     │ │  [Details]    │ │
│  └─────────────────┘ └─────────────────┘ └───────────────┘ │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │   Workflow 4    │ │   Workflow 5    │ │  + New        │ │
│  │   [Details]     │ │   [Details]     │ │  Workflow     │ │
│  └─────────────────┘ └─────────────────┘ └───────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **4b: Tablet Layout (768px - 1199px)**
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] [Breadcrumb]           [Actions] [☰]                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Title & Description                                        │
│  Search & Filters                                           │
│                                                             │
│  ┌───────────────────────────┐ ┌─────────────────────────┐ │
│  │       Workflow 1          │ │      Workflow 2         │ │
│  │       [Details]           │ │      [Details]          │ │
│  └───────────────────────────┘ └─────────────────────────┘ │
│  ┌───────────────────────────┐ ┌─────────────────────────┐ │
│  │       Workflow 3          │ │      + New Workflow     │ │
│  │       [Details]           │ │      [Create]           │ │
│  └───────────────────────────┘ └─────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **4c: Mobile Layout (320px - 767px)**
```
┌─────────────────┐
│[☰] Clixen [👤] │
├─────────────────┤
│                 │
│ Your Workflows  │
│ 3 workflows     │
│ [🔍 Search...] │
│                 │
│┌───────────────┐│
││  Workflow 1   ││
││  [Details]    ││
││  Status info  ││
│└───────────────┘│
│┌───────────────┐│
││  Workflow 2   ││
││  [Details]    ││
││  Status info  ││
│└───────────────┘│
│┌───────────────┐│
││+ New Workflow ││
││  [Create]     ││
│└───────────────┘│
│                 │
│ [Load More...] │
└─────────────────┘
```

---

## ⚡ **Pattern 5: Loading & Empty States**

### **5a: Loading States**

**Page Loading:**
```
┌─────────────────────────────────────────────────────────────┐
│                    HEADER                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your Workflows                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                     🔄                                  ││
│  │               Loading workflows...                      ││
│  │                                                         ││
│  │         ████████████████████████                       ││
│  │                  Please wait                            ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Card Loading (Skeleton):**
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [○] ████████████████████████████████        [░][░][░] ││
│  │     ████████████████████████                          ││
│  │                                                         ││
│  │     ░ ████ • ████ • ██████ ░                          ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [○] ████████████████████████████████        [░][░][░] ││
│  │     ████████████████████████                          ││
│  │                                                         ││
│  │     ░ ████ • ████ • ██████ ░                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### **5b: Empty States**

**No Workflows:**
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐│
│  │                     [➕]                                ││
│  │                                                         ││
│  │           Create your first workflow                    ││
│  │                                                         ││
│  │   Transform your ideas into automated workflows using   ││
│  │   natural language. Just describe what you want to     ││
│  │   automate and let AI build it for you.                ││
│  │                                                         ││
│  │         [➕ Create Your First Workflow]                 ││
│  │                                                         ││
│  │   Examples: "Send daily email reports", "Backup files  ││
│  │   to cloud", "Monitor website uptime"                  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**No Search Results:**
```
┌─────────────────────────────────────────────────────────────┐
│  Search: "backup"                                    [X]    │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                     🔍                                  ││
│  │                                                         ││
│  │            No workflows match "backup"                  ││
│  │                                                         ││
│  │     Try a different search term or create a new        ││
│  │     workflow that matches what you're looking for.     ││
│  │                                                         ││
│  │         [Clear Search] [Create "backup" Workflow]       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 **Pattern 6: Visual Design System**

### **6a: Color Palette & Status Indicators**
```
STATUS COLORS:
🟢 Active/Success: #10B981 (Green)
🔵 Paused/Info: #3B82F6 (Blue)  
🟡 Draft/Warning: #F59E0B (Amber)
🔴 Failed/Error: #EF4444 (Red)
⚪ Inactive/Neutral: #6B7280 (Gray)

BRAND COLORS:
Primary: #3B82F6 (Blue)
Secondary: #6366F1 (Indigo)
Accent: #8B5CF6 (Purple)
Background: #F9FAFB (Light Gray)
```

### **6b: Typography Scale**
```
HEADINGS:
H1: 2.5rem (40px) - Page titles
H2: 2rem (32px) - Section titles  
H3: 1.5rem (24px) - Card titles
H4: 1.25rem (20px) - Subsections

BODY TEXT:
Large: 1.125rem (18px) - Important content
Normal: 1rem (16px) - Standard text
Small: 0.875rem (14px) - Meta information
Tiny: 0.75rem (12px) - Timestamps, labels
```

### **6c: Spacing System**
```
SPACING SCALE:
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 3rem (48px)
3xl: 4rem (64px)

COMPONENT SPACING:
- Card padding: lg (24px)
- Section margins: xl (32px)
- Button padding: sm md (8px 16px)
- Input padding: sm md (8px 16px)
```

---

## 📱 **Pattern 7: Mobile-Specific Patterns**

### **7a: Touch-Optimized Interface**
```
TOUCH TARGETS:
Minimum size: 44px × 44px
Buttons: 48px × 48px minimum
Links in text: 44px × 44px minimum
Icon buttons: 48px × 48px

GESTURE SUPPORT:
- Pull to refresh on lists
- Swipe actions on workflow cards  
- Long press for context menus
- Pinch to zoom on diagrams (future)
```

### **7b: Mobile Form Patterns**
```
┌─────────────────┐
│ Workflow Name   │
│[_____________] │
│                 │
│ Description     │
│[_____________] │
│[_____________] │
│                 │
│ Schedule        │
│[Daily      ▼]   │
│                 │
│ Time            │
│[09:00 AM   ▼]   │
│                 │
│[Save] [Cancel]  │
└─────────────────┘
```

### **7c: Mobile Action Patterns**
```
Swipe Actions:
┌─────────────────┐
│← Daily Email    │ (Swipe right)
│  [Edit] [Delete]│
│                 │
│  Backup ←       │ (Swipe left) 
│  [Pause] [Info] │
└─────────────────┘

Bottom Sheet Menu:
┌─────────────────┐
│                 │
│ ═══════════════ │
│ Workflow Actions│
│                 │
│ 🔧 Edit Settings│
│ ⏸ Pause/Resume │
│ 📋 Duplicate    │
│ 📊 View Stats   │
│ 🗑 Delete       │
│                 │
│ [Cancel]        │
└─────────────────┘
```

---

## 🔑 **Key Navigation Principles**

### **Consistency Rules**
- **Header always present** with consistent branding and actions
- **Back navigation** always available and predictable
- **Context preservation** when switching between sections
- **Visual hierarchy** maintained across all screen sizes

### **Accessibility Standards**
- **Keyboard navigation** support for all interactive elements
- **Screen reader compatibility** with proper ARIA labels
- **High contrast** color combinations for readability
- **Touch target sizing** meets accessibility guidelines

### **Performance Optimization**
- **Progressive loading** for large lists and complex pages
- **Skeleton screens** during content loading
- **Efficient state management** to prevent unnecessary re-renders
- **Mobile-first responsive** design for faster mobile loading

### **User Experience Focus**
- **Clear visual feedback** for all user actions
- **Contextual help** available where needed
- **Error prevention** through good UI design
- **Consistent interaction patterns** across the application

This comprehensive navigation and layout system ensures users can efficiently navigate the Clixen application across all devices while maintaining a consistent, professional, and accessible user experience.