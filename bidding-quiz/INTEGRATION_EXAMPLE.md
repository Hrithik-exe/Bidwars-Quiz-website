# Integration Example: Game Reset Functionality

This document shows how to integrate the game reset functionality into your main application.

## Complete Integration Example

Here's how to wire up the reset functionality in your main `index.html` or application entry point:

```javascript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { firebaseConfig, db } from './js/firebase-config.js';
import { UIManager } from './js/ui.js';
import { GameState } from './js/game-state.js';

// Initialize your application
const roomId = 'room1'; // or get from URL parameter
const uiManager = new UIManager(roomId);
const gameState = new GameState(roomId);

// Store current player ID (set this when player joins)
let currentPlayerId = null;

// Set up the reset game callback
uiManager.onResetGame = async () => {
  console.log('Reset game requested by player:', currentPlayerId);
  
  // Call the resetGame method from GameState
  const result = await gameState.resetGame(currentPlayerId);
  
  if (result.success) {
    // Show success message
    uiManager.showSuccess('Game reset successfully! Starting new game...');
    
    // Optional: Transition to waiting screen
    // You might want to re-render the UI to show the waiting state
    setTimeout(() => {
      // Refresh the page or re-render the waiting screen
      window.location.reload(); // Simple approach
      // OR
      // uiManager.renderWaitingScreen(); // If you have this method
    }, 1500);
  } else {
    // Show error message
    uiManager.showError(result.error || 'Failed to reset game. Please try again.');
  }
};

// Example: When player joins the game
async function handlePlayerJoin(playerName) {
  // Your existing join logic...
  const result = await playerManager.joinGame(playerName);
  
  if (result.success) {
    currentPlayerId = result.playerId;
    
    // Show game interface
    uiManager.renderGameInterface();
    
    // If player is admin, show admin controls
    const isAdmin = await gameState.isAdmin(currentPlayerId);
    if (isAdmin) {
      uiManager.showAdminControls();
    }
  }
}

// Example: When showing winner screen
async function showWinnerScreen() {
  const isAdmin = await gameState.isAdmin(currentPlayerId);
  
  // Get winner and rankings data
  const winner = await gameState.getWinner();
  const rankings = await gameState.getRankings();
  
  // Show winner screen with reset button if admin
  uiManager.showWinnerScreen(winner, rankings, isAdmin);
}
```

## Step-by-Step Integration

### Step 1: Import Required Modules

```javascript
import { UIManager } from './js/ui.js';
import { GameState } from './js/game-state.js';
```

### Step 2: Initialize Instances

```javascript
const roomId = 'your-room-id';
const uiManager = new UIManager(roomId);
const gameState = new GameState(roomId);
```

### Step 3: Set Up Reset Callback

```javascript
uiManager.onResetGame = async () => {
  const result = await gameState.resetGame(currentPlayerId);
  
  if (result.success) {
    uiManager.showSuccess('Game reset successfully!');
    // Handle post-reset actions
  } else {
    uiManager.showError(result.error);
  }
};
```

### Step 4: Show Admin Controls

When a player is identified as admin:

```javascript
const isAdmin = await gameState.isAdmin(currentPlayerId);
if (isAdmin) {
  uiManager.showAdminControls('waiting', 0);
}
```

### Step 5: Show Winner Screen with Reset Button

At the end of the game:

```javascript
const isAdmin = await gameState.isAdmin(currentPlayerId);
uiManager.showWinnerScreen(winner, rankings, isAdmin);
```

## Testing the Integration

### Manual Test Steps

1. **Setup:**
   - Configure Firebase in `firebase-config.js`
   - Deploy or run locally
   - Open in browser

2. **Join as Admin:**
   - Join the game with a player name
   - Authenticate as admin (if you have admin login)
   - Verify admin controls appear

3. **Play Through Game:**
   - Start the game
   - Play through all 10 rounds
   - Reach the winner screen

4. **Test Reset:**
   - Click "RESET GAME" button on winner screen
   - Verify confirmation dialog appears
   - Click "Yes" to confirm
   - Verify game resets to waiting state
   - Verify all scores are 5000
   - Verify round is 0

5. **Test Admin Panel Reset:**
   - During any phase, click "Reset Game" in admin panel
   - Verify confirmation dialog appears
   - Click "Yes" to confirm
   - Verify game resets

6. **Test Cancellation:**
   - Click reset button
   - Click "No" in confirmation dialog
   - Verify game state unchanged

### Automated Test

Run the automated test suite:

```bash
# Open in browser
open bidding-quiz/test-reset.html
```

Expected results:
- All tests should pass
- No errors in console
- Firebase data should be properly reset

## Common Issues and Solutions

### Issue 1: Reset Button Not Appearing

**Cause:** Player is not admin

**Solution:** Ensure player has `isAdmin: true` in Firebase:
```javascript
await set(ref(db, `rooms/${roomId}/players/${playerId}/isAdmin`), true);
```

### Issue 2: Confirmation Dialog Not Showing

**Cause:** CSS not loaded or JavaScript error

**Solution:** 
- Check browser console for errors
- Verify `styles.css` is loaded
- Verify `showConfirmation` method exists in UIManager

### Issue 3: Reset Doesn't Work

**Cause:** Callback not set or player not admin

**Solution:**
- Verify `uiManager.onResetGame` is set
- Verify player has admin privileges
- Check browser console for error messages

### Issue 4: Players Disconnected After Reset

**Cause:** Page reload or navigation

**Solution:**
- Don't reload the page after reset
- Re-render the waiting screen instead
- Keep player connections alive

## Best Practices

1. **Always Show Confirmation:**
   - Never reset without user confirmation
   - Use clear, descriptive messages

2. **Handle Errors Gracefully:**
   - Show user-friendly error messages
   - Log detailed errors to console
   - Provide retry options

3. **Preserve Player Data:**
   - Keep player names and admin status
   - Only reset game-specific data
   - Maintain player connections

4. **Update All Clients:**
   - Firebase will automatically sync reset state
   - All connected clients will see the reset
   - No manual broadcast needed

5. **Test Thoroughly:**
   - Test with multiple players
   - Test admin and non-admin scenarios
   - Test cancellation flow
   - Test error cases

## Security Considerations

1. **Admin-Only Access:**
   - Reset is restricted to admin users
   - Non-admin attempts are rejected
   - Check is performed server-side (Firebase)

2. **Confirmation Required:**
   - Prevents accidental resets
   - User must explicitly confirm
   - Can be cancelled at any time

3. **Firebase Security Rules:**
   - Implement proper security rules
   - Restrict write access to admin users
   - Validate data on server side

Example Firebase Security Rules:
```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        "phase": {
          ".write": "root.child('rooms').child($roomId).child('players').child(auth.uid).child('isAdmin').val() === true"
        },
        "roundNumber": {
          ".write": "root.child('rooms').child($roomId).child('players').child(auth.uid).child('isAdmin').val() === true"
        }
      }
    }
  }
}
```

## Next Steps

After integrating the reset functionality:

1. Test with real users
2. Monitor Firebase usage
3. Gather user feedback
4. Consider adding:
   - Reset confirmation with reason
   - Reset history/audit log
   - Scheduled resets
   - Auto-reset after inactivity
