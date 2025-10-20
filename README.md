# Seminar Management System

A comprehensive web application for managing speaker invitations, seminar scheduling, and event coordination for the Barcelona Collaboratorium for Theoretical Modelling and Predictive Biology.

## 🎯 Features

- **Multi-role user management** (Organizers, Senior Fellows, Fellows)
- **Speaker proposal and voting system** with priority ranking
- **Automated invitation workflow** with personalized links
- **Interactive calendar** for date and availability management
- **Meeting scheduler** with iCal export
- **Email template generation** for invitations and travel arrangements
- **Real-time alerts** for overdue responses and upcoming events
- **Statistics dashboard** for past speakers and analytics

---

## 👥 User Roles & Permissions

```
┌─────────────────┬──────────────┬──────────────┬──────────────┐
│                 │  Organizer   │ Senior Fellow│    Fellow    │
├─────────────────┼──────────────┼──────────────┼──────────────┤
│ Manage Dates    │      ✅      │      ❌      │      ❌      │
│ Invite Users    │      ✅      │      ❌      │      ❌      │
│ Accept Speakers │      ✅      │      ❌      │      ❌      │
│ Propose Speaker │      ✅      │      ✅      │      ❌      │
│ Vote on Speakers│      ✅      │      ✅      │      ✅      │
│ Mark Availability│     ✅      │      ✅      │      ✅      │
│ Host Seminars   │      ✅      │      ✅      │      ✅      │
└─────────────────┴──────────────┴──────────────┴──────────────┘
```

---

## ⚡ Quick Start Guide

### What do you need to do?

```
├─ 📅 Add seminar dates?
│  └─► Available Dates tab (Organizer only)
│
├─ 🗓️ Mark your availability?
│  └─► My Availability tab (All users)
│
├─ 👤 Suggest a speaker?
│  └─► Propose Speaker tab (Senior Fellows & Organizers)
│
├─ 👍 Vote on proposals?
│  └─► Dashboard → Proposed Speakers section (All users)
│
├─ ✉️ Send invitation?
│  └─► Dashboard → Click "Invite" (Organizer only)
│
├─ ✈️ Arrange travel?
│  └─► Dashboard → Actions button → Send email → ✅ Check box
│
├─ 📆 Schedule meetings?
│  └─► Dashboard → Agenda button → Click time slots
│
└─ ✏️ Edit speaker info?
   └─► Dashboard → Edit button
```

---

## 🔑 Key Principle

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  HOST AVAILABILITY = SPEAKER'S AVAILABLE DATE OPTIONS     ║
║                                                           ║
║        If you can't host on a date                        ║
║        → Speaker won't see it as available                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

**Important:** Always keep your availability calendar updated. Speakers can only select dates where their suggested host is marked as available.

---

## 📋 Workflows

### 1️⃣ Setup (Organizers Only)

#### User Invitations
```
User Invitations tab → Create Invitation → Fill form → Copy link → Send via email
```

New users receive an invitation link to complete their registration.

#### Available Dates
```
Available Dates tab → Click calendar date → Mark as:
  • Available (green) - open for seminars
  • Conflicting (orange) - not available
→ Add location notes
```

---

### 2️⃣ Speaker Proposal, Voting & Priority Ranking

```
Senior Fellow/Organizer              All Users                 System
        │                                │                         │
        ▼                                ▼                         ▼
┌──────────────────┐          ┌──────────────────┐     ┌──────────────────┐
│ Propose Speaker  │          │   Dashboard      │     │  Auto-ranks by:  │
│ • Name, email    │          │   (Proposed)     │     │                  │
│ • Suggest host   │────►     │                  │────►│  1. Vote count   │
│ • Preferred date │          │ Click 👍 to vote │     │  2. Priority     │
│ • Priority level │          │                  │     │     (High/Med/   │
│   (High/Med/Low) │          │                  │     │      Low)        │
└──────────────────┘          └──────────────────┘     └──────────────────┘
                                       │
                                       ▼
                              Sorted: Most votes first,
                              then by priority level
```

**Steps:**
1. **Propose:** Fill speaker details, select host and priority
2. **Vote:** All users vote with 👍 button
3. **Rank:** System automatically sorts by votes, then priority

---

### 3️⃣ Invitation Process (Organizer Only)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Organizer   │────►│   Speaker    │────►│    System    │────►│  Dashboard   │
│ Clicks       │     │ Receives     │     │ Updates      │     │ Shows        │
│ "Invite"     │     │ email + link │     │ status       │     │ response     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
    │                      │                      │
    ▼                      ▼                      ▼
Copy email           View calendar          ✅ Accepted
template             (only dates where      or
                     host is available)     ❌ Declined
                     Select date
                     Enter title/abstract
                     Accept/Decline
```

**Process:**
1. Organizer clicks **Invite** on proposal
2. System generates email with unique invitation link
3. Speaker accesses link, views available dates, and responds
4. Dashboard shows acceptance/decline notification

---

### 4️⃣ Confirmed Speaker Management

```
                    ┌──────────────────────┐
                    │  Confirmed Speaker   │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
      ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
      │   Actions   │  │   Agenda    │  │    Edit     │
      └─────────────┘  └─────────────┘  └─────────────┘
              │                │                │
              ▼                ▼                ▼
      Send travel      Schedule          Update talk
      arrangements     meetings          title/date/host
              │                │
              ▼                ▼
      ✅ Check when    Share .ics
      complete         calendar
```

**Actions Panel:**
- Track invitation and response status
- Send travel arrangement emails
- Mark tasks complete with checkboxes

**Agenda Panel:**
- Schedule 1-on-1 meetings (15-min intervals, 8am-8pm)
- View 3-day calendar (day before, seminar day, day after)
- Export to .ics format or email to speaker

**Edit Panel:**
- Update talk title and abstract
- Change assigned date
- Reassign host (only shows available hosts for selected date)

---

## 🔔 Automated Alerts

| When | You See |
|------|---------|
| Speaker accepts/declines | 📬 Recent Response alert |
| 7 days before seminar | 🍽️ Lunch reservation reminder |
| Invitation overdue | ⚠️ Overdue badge (red background) |

---

## 📊 Dashboard Color Guide

| Color | Meaning |
|-------|---------|
| 🟢 Green | Available dates |
| 🟠 Orange | Conflicts exist / Some fellows unavailable |
| 🔵 Blue | Locked by speaker |
| 🔴 Red | Overdue invitation |
| 🟡 Yellow | Travel arrangements pending |
| ⚪ White | Default/Normal state |

---

## 🛠️ Technology Stack

- **Frontend:** React, Recharts (charts), Lucide React (icons)
- **Backend:** Firebase (Authentication, Firestore)
- **Styling:** Tailwind CSS
- **Calendar:** Custom implementation with iCal export
- **Libraries:** 
  - `country-list` for country data
  - `html2canvas` for statistics export

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/elc08/seminar-management_react.git

# Navigate to project directory
cd seminar-management_react

# Install dependencies
npm install

# Set up Firebase configuration
# Create src/firebase.js with your Firebase config

# Start development server
npm start
```

---

## 🔧 Configuration

### Firebase Setup

Create `src/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Tailwind Configuration

Ensure `tailwind.config.js` includes custom colors:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'primary': '#d63447',
        'primary-dark': '#2c3e50',
        'accent': '#00BCD4',
      }
    }
  }
}
```

---

## 📚 Database Schema

### Collections

#### `speakers`
- Speaker proposals and confirmed speakers
- Status: Proposed, Invited, Accepted, Declined
- Includes actions checklist and votes

#### `available_dates`
- Seminar dates with availability status
- Lock mechanism for accepted speakers

#### `user_roles`
- User information and role assignments
- Roles: Organizer, Senior Fellow, Fellow

#### `invitations`
- User invitation tokens
- Expiration tracking

#### `agendas`
- Meeting schedules for confirmed speakers
- 3-day calendars with customizable events

#### `user_availability`
- Individual availability per date
- Conflict notes

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- Barcelona Collaboratorium for Theoretical Modelling and Predictive Biology
- All contributors and users of the system