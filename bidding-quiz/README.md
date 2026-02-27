# Multiplayer Bidding Quiz

A real-time multiplayer quiz game where players bid on their confidence level before answering questions. Built with vanilla JavaScript and Firebase Realtime Database.

## Features

- **Real-time Multiplayer**: Multiple players can join and play simultaneously
- **Bidding Mechanism**: Players bid points based on their confidence
- **Dynamic Scoring**: Correct answers earn 2x the bid, wrong answers lose 1x the bid
- **10 Rounds**: Game progresses through 10 rounds with different topics
- **Admin Controls**: Admin can manage game flow and reset the game
- **Live Leaderboard**: Real-time score updates and rankings
- **Phase Timers**: Automatic phase transitions with countdown timers
- **Spinning Wheel**: Animated topic selection

## Game Flow

1. **Join Screen**: Players enter their name to join
2. **Waiting Phase**: Players wait for admin to start the game
3. **Spinning Phase** (5s): Wheel spins to select a topic
4. **Bidding Phase** (30s): Players place their bids
5. **Question Phase** (20s): Players answer the question
6. **Results Phase** (10s): Show results and score changes
7. **Repeat**: Steps 3-6 repeat for 10 rounds
8. **Winner Screen**: Final rankings and winner announcement

## Setup Instructions

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable **Realtime Database**:
   - Go to "Build" → "Realtime Database"
   - Click "Create Database"
   - Choose "Start in test mode" (for development)
   - Select your preferred location
4. Get your Firebase configuration:
   - Go to Project Settings (gear icon)
   - Scroll down to "Your apps"
   - Click the web icon (</>)
   - Copy the configuration object

### 2. Update Firebase Configuration

Edit `js/firebase-config.js` and replace the placeholder values with your actual Firebase credentials:

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Update Admin Password

Edit `js/player.js` and change the admin password:

```javascript
const ADMIN_PASSWORD = "your_secure_password_here";
```

### 4. Firebase Security Rules

Set up security rules in Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

**Note**: These are permissive rules for development. For production, implement proper authentication and authorization.

## Deployment to GitHub Pages

### Option 1: Using GitHub Web Interface

1. Create a new repository on GitHub
2. Upload all files from the `bidding-quiz` folder
3. Go to repository Settings → Pages
4. Under "Source", select "Deploy from a branch"
5. Select the `main` branch and `/ (root)` folder
6. Click "Save"
7. Your site will be available at `https://yourusername.github.io/repository-name/`

### Option 2: Using Git Command Line

```bash
# Initialize git repository
cd bidding-quiz
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Multiplayer Bidding Quiz"

# Add remote repository
git remote add origin https://github.com/yourusername/repository-name.git

# Push to GitHub
git branch -M main
git push -u origin main

# Enable GitHub Pages in repository settings
```

## Local Development

To test locally, you need a local web server (due to ES6 modules):

### Using Python:
```bash
cd bidding-quiz
python -m http.server 8000
```

### Using Node.js (http-server):
```bash
npm install -g http-server
cd bidding-quiz
http-server -p 8000
```

Then open `http://localhost:8000` in your browser.

## Project Structure

```
bidding-quiz/
├── index.html              # Main HTML file
├── styles.css              # All styles
├── README.md               # This file
├── js/
│   ├── app.js              # Main application integration
│   ├── firebase-config.js  # Firebase configuration
│   ├── game-state.js       # Game state management
│   ├── player.js           # Player management
│   ├── ui.js               # UI rendering
│   ├── wheel.js            # Spinning wheel
│   ├── questions.js        # Questions data
│   └── timer.js            # Timer management
└── demo files/             # Various demo/test files
```

## How to Play

### For Players:

1. **Join the Game**:
   - Enter your name on the join screen
   - Wait for the admin to start the game

2. **During Bidding Phase**:
   - Review the topic
   - Enter a bid amount (up to your current score)
   - Higher bids mean higher risk and reward
   - Submit your bid before time runs out

3. **During Question Phase**:
   - Read the question carefully
   - Select your answer (A, B, C, or D)
   - Submit before time runs out

4. **Scoring**:
   - Correct answer: +2x your bid
   - Wrong answer: -1x your bid
   - Starting score: 5000 points

### For Admin:

1. **Become Admin**:
   - Join the game as a regular player
   - Click "Login as Admin" at the bottom
   - Enter the admin password

2. **Admin Controls**:
   - **Start Game**: Begin the game (only in waiting phase)
   - **Spin Wheel**: Manually trigger wheel spin
   - **Next Phase**: Skip to next phase (for testing)
   - **Reset Game**: Reset all scores and start over

## Customization

### Adding More Questions

Edit `js/questions.js` to add or modify questions:

```javascript
export const QUESTIONS = {
  "Your Topic Name": {
    question: "Your question text?",
    choices: ["Option A", "Option B", "Option C", "Option D"],
    correctAnswer: 0  // Index of correct answer (0-3)
  },
  // Add more topics...
};
```

### Changing Phase Durations

Edit `js/timer.js` to adjust phase timers:

```javascript
export const PHASE_DURATIONS = {
  spinning: 5,    // 5 seconds
  bidding: 30,    // 30 seconds
  question: 20,   // 20 seconds
  results: 10     // 10 seconds
};
```

### Modifying Topics

Edit `js/wheel.js` to change the wheel topics:

```javascript
export const TOPICS = [
  'Your Topic 1',
  'Your Topic 2',
  // ... add 10 topics total
];
```

## Troubleshooting

### Firebase Connection Issues

- Verify your Firebase configuration is correct
- Check that Realtime Database is enabled
- Ensure security rules allow read/write access
- Check browser console for error messages

### Module Loading Errors

- Ensure you're using a web server (not opening HTML directly)
- Check that all file paths are correct
- Verify all imports use `.js` extensions

### Timer Not Working

- Check that `phaseStartTime` is being written to Firebase
- Verify system clock is synchronized
- Check browser console for timer errors

### Players Can't Join

- Verify game is in "waiting" phase
- Check Firebase connection
- Ensure player names are unique

## Browser Compatibility

- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

Requires ES6 module support and modern JavaScript features.

## License

This project is open source and available for educational purposes.

## Credits

Built with:
- Firebase Realtime Database
- Vanilla JavaScript (ES6+)
- CSS3 Animations
