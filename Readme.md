# Seminar Management System

A comprehensive web application for managing academic seminars, speaker invitations, and scheduling. Built with React and Firebase.

## Features

### For Organizers
- **Dashboard**: Overview of all speakers across different stages (Proposed, Invited, Accepted)
- **Speaker Management**: Review, accept, or reject speaker proposals
- **Date Management**: Create and manage available seminar dates
- **User Management**: Invite and manage Senior Fellows and other Organizers
- **Email Integration**: Automated email drafts for speaker invitations
- **Full Control**: Edit confirmed speakers and manage the entire seminar pipeline

### For Senior Fellows
- **Propose Speakers**: Submit speaker proposals with priority rankings
- **Edit Proposals**: Modify or delete your proposed speakers (before organizer approval)
- **Dashboard View**: See all proposed speakers from the entire community
- **Track Status**: Monitor your proposals through invitation, acceptance, and scheduling

### For Invited Speakers
- **Simple Interface**: Accept or decline invitations via personalized link
- **Date Selection**: Choose from available dates
- **Talk Details**: Submit talk title and abstract
- **No Account Required**: Access via secure token link

## Tech Stack

- **Frontend**: React 18
- **Backend**: Firebase
  - Authentication (Email/Password)
  - Firestore Database
  - Security Rules
- **Deployment**: Vercel
- **Styling**: Inline CSS (no external dependencies)

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Vercel account (for deployment)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/seminar-management-system.git
   cd seminar-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication with Email/Password
   - Create a Firestore Database
   - Get your Firebase config credentials

4. **Create Firebase configuration file**
   
   Create a file `src/firebase.js`:
   ```javascript
   import { initializeApp } from 'firebase/app';
   import { getAuth } from 'firebase/auth';
   import { getFirestore } from 'firebase/firestore';

   const firebaseConfig = {
     apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
     authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
     projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
     storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
     appId: process.env.REACT_APP_FIREBASE_APP_ID
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   export const db = getFirestore(app);
   ```

5. **Create environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

6. **Configure Firestore Security Rules**
   
   In Firebase Console, go to Firestore Database → Rules and add:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /user_roles/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null;
       }
       
       match /speakers/{speakerId} {
         allow read: if request.auth != null;
         allow create: if request.auth != null;
         allow update: if request.auth != null;
         allow delete: if request.auth != null;
       }
       
       match /available_dates/{dateId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       
       match /invitations/{invitationId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

7. **Create the first Organizer account**
   
   Manually add a document to the `user_roles` collection in Firestore:
   - Collection: `user_roles`
   - Document ID: Use the Firebase Auth UID of your account
   - Fields:
     ```json
     {
       "email": "your-email@example.com",
       "full_name": "Your Name",
       "role": "Organizer",
       "createdAt": [current timestamp]
     }
     ```
   
   Then create an Authentication user with the same email.

8. **Run the development server**
   ```bash
   npm start
   ```
   
   Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variables in the Vercel dashboard
   - Deploy!

3. **Configure Firebase**
   - Add your Vercel domain to Firebase Authentication → Authorized domains

## Database Structure

### Collections

#### `user_roles`
- `email` (string)
- `full_name` (string)
- `role` (string): "Organizer" or "Senior Fellow"
- `createdAt` (timestamp)

#### `speakers`
- `full_name` (string)
- `email` (string)
- `affiliation` (string)
- `area_of_expertise` (string)
- `ranking` (string): "High Priority", "Medium Priority", "Low Priority"
- `status` (string): "Proposed", "Invited", "Accepted", "Declined"
- `host` (string)
- `proposed_by_id` (string)
- `proposed_by_name` (string)
- `access_token` (string)
- `talk_title` (string, optional)
- `talk_abstract` (string, optional)
- `assigned_date` (timestamp, optional)
- `invitation_sent_date` (timestamp, optional)
- `response_deadline` (timestamp, optional)
- `createdAt` (timestamp)

#### `available_dates`
- `date` (timestamp)
- `host` (string)
- `notes` (string, optional)
- `available` (boolean)
- `locked_by_id` (string, optional)
- `talk_title` (string, optional)
- `createdAt` (timestamp)

#### `invitations`
- `email` (string)
- `full_name` (string)
- `role` (string)
- `token` (string)
- `invited_by_id` (string)
- `invited_by_name` (string)
- `used` (boolean)
- `used_at` (timestamp, optional)
- `expires_at` (timestamp)
- `createdAt` (timestamp)

## User Workflow

### Organizer Workflow
1. Add available dates for seminars
2. Invite Senior Fellows to the system
3. Review speaker proposals from Senior Fellows
4. Accept proposals and send invitation emails to speakers
5. Monitor speaker responses
6. Manage confirmed speakers and their schedules

### Senior Fellow Workflow
1. Receive invitation email and create account
2. Propose speakers with details and priority
3. View all community proposals on dashboard
4. Edit or delete own proposals (before organizer approval)
5. Track proposal status

### Speaker Workflow
1. Receive invitation email with unique link
2. Click link to view invitation
3. Choose preferred date from available options
4. Enter talk title and abstract
5. Accept or decline invitation

## Security

- **Authentication**: Firebase Authentication with email/password
- **Authorization**: Role-based access control (Organizer vs Senior Fellow)
- **Token-based Access**: Speakers access system via secure, unique tokens
- **Firestore Rules**: Database access controlled by security rules
- **Environment Variables**: Sensitive credentials stored securely

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Acknowledgments

- Built for the Collaboratorium for Theoretical Modelling and Predictive Biology, Barcelona
- Powered by Firebase and Vercel
- React community for excellent documentation

---

**Note**: Remember to never commit your `.env` file or Firebase credentials to version control. Always use environment variables for sensitive information.