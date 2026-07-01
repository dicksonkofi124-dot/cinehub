# Firebase Setup Guide for CineHub Movie Requests

To enable Google OAuth authentication for the movie request system, you need to set up a Firebase project.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "cinehub-requests")
4. Accept the terms and click "Continue"
5. Select or create a Google Analytics account (optional)
6. Click "Create project"

## Step 2: Enable Google Sign-In

1. In your Firebase project, go to "Authentication" → "Sign-in method"
2. Click on "Google"
3. Enable the toggle
4. Enter a project support email
5. Click "Save"

## Step 3: Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (`</>`)
4. Enter app name (e.g., "CineHub Web")
5. Register the app
6. Copy the firebaseConfig object

## Step 4: Update requests.html

Replace the placeholder firebaseConfig in `requests.html` with your actual config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 5: Add Authorized Domains

1. In Firebase Console → Authentication → Settings
2. Under "Authorized domains", add:
   - localhost (for local testing)
   - Your production domain (e.g., cinehub-jet-ten.vercel.app)

## Testing

Once configured, users can:
1. Navigate to the "Request Movies" page
2. Click "Sign in with Google"
3. Submit movie requests
4. View their request history

## Alternative: Simple Authentication (No Firebase)

If you prefer not to use Firebase, you can use a simple email-based system. Let me know if you'd like this alternative.
