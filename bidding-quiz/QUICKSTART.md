# Quick Start Guide

Get your Multiplayer Bidding Quiz up and running in 5 minutes!

## Step 1: Firebase Setup (2 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Enable Realtime Database:
   - Click "Realtime Database" in left menu
   - Click "Create Database"
   - Choose "Start in test mode"
   - Click "Enable"

## Step 2: Get Firebase Config (1 minute)

1. Click the gear icon → "Project settings"
2. Scroll to "Your apps" section
3. Click the web icon `</>`
4. Copy the `firebaseConfig` object

## Step 3: Update Configuration (1 minute)

1. Open `js/firebase-config.js`
2. Replace the placeholder values with your Firebase config:

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 4: Test Locally (1 minute)

### Option A: Python
```bash
cd bidding-quiz
python -m http.server 8000
```

### Option B: Node.js
```bash
npx http-server -p 8000
```

Open `http://localhost:8000` in your browser.

## Step 5: Deploy to GitHub Pages (Optional)

1. Create a new GitHub repository
2. Upload all files from `bidding-quiz` folder
3. Go to Settings → Pages
4. Select "main" branch and "/" root
5. Click "Save"

Your game will be live at: `https://yourusername.github.io/repo-name/`

## First Game Test

1. Open the app in 2 browser tabs
2. Join as "Player1" in tab 1
3. Join as "Player2" in tab 2
4. In tab 1, click "Login as Admin"
5. Enter password: `quiz2024`
6. Click "Start Game"
7. Play through a round!

## Default Settings

- **Admin Password**: `quiz2024` (change in `js/player.js`)
- **Starting Score**: 5000 points
- **Number of Rounds**: 10
- **Phase Timers**:
  - Spinning: 5 seconds
  - Bidding: 30 seconds
  - Question: 20 seconds
  - Results: 10 seconds

## Need Help?

- **Full Documentation**: See `README.md`
- **Deployment Guide**: See `DEPLOYMENT_CHECKLIST.md`
- **Testing Guide**: See `INTEGRATION_TEST.md`

## Troubleshooting

**Can't connect to Firebase?**
- Check your `firebaseConfig` is correct
- Verify Realtime Database is enabled
- Check browser console for errors

**Module errors?**
- Make sure you're using a web server
- Don't open `index.html` directly in browser

**Players can't join?**
- Game must be in "waiting" phase
- Check Firebase security rules allow writes

## That's It!

You're ready to play! 🎉

Share your GitHub Pages URL with friends and start quizzing!
