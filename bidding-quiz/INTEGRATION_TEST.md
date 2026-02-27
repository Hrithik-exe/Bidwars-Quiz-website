# Integration Test Guide

This guide helps you test the complete application integration before deployment.

## Prerequisites

1. Firebase project is set up
2. `js/firebase-config.js` is updated with your credentials
3. Running a local web server

## Test Scenarios

### Test 1: Join Game Flow

**Steps:**
1. Open the application in your browser
2. Enter a player name (e.g., "Player1")
3. Click "JOIN GAME"

**Expected Results:**
- ✓ Success message appears
- ✓ Game interface loads with phase indicator
- ✓ Leaderboard shows your player
- ✓ Admin login form is visible at bottom
- ✓ Game is in "WAITING" phase

### Test 2: Multiple Players

**Steps:**
1. Open the application in a second browser tab
2. Enter a different name (e.g., "Player2")
3. Join the game

**Expected Results:**
- ✓ Both players appear in leaderboard
- ✓ Player count updates in real-time
- ✓ Both players see "WAITING" phase

### Test 3: Admin Authentication

**Steps:**
1. In one tab, click "Login as Admin"
2. Enter the admin password (default: "quiz2024")
3. Click "Login as Admin"

**Expected Results:**
- ✓ Success message appears
- ✓ Admin controls panel appears (floating on screen)
- ✓ Admin login form disappears
- ✓ Admin panel shows current phase and round

### Test 4: Start Game

**Steps:**
1. As admin, click "Start Game" button

**Expected Results:**
- ✓ Phase changes to "SPINNING"
- ✓ Round changes to 1
- ✓ Wheel animation starts
- ✓ All players see the spinning wheel
- ✓ Timer shows 5 seconds

### Test 5: Spinning Phase

**Steps:**
1. Wait for wheel to finish spinning (5 seconds)

**Expected Results:**
- ✓ Wheel stops on a topic
- ✓ Phase automatically changes to "BIDDING"
- ✓ Topic is displayed
- ✓ Timer shows 30 seconds

### Test 6: Bidding Phase

**Steps:**
1. In Player1 tab, enter a bid (e.g., 1000)
2. Click "SUBMIT BID"
3. In Player2 tab, enter a different bid (e.g., 500)
4. Click "SUBMIT BID"

**Expected Results:**
- ✓ Bid is accepted
- ✓ Confirmation message appears
- ✓ "Waiting for other players..." message shows
- ✓ After 30 seconds, phase changes to "QUESTION"

### Test 7: Question Phase

**Steps:**
1. Read the question
2. Select an answer (A, B, C, or D)
3. Click "SUBMIT ANSWER"
4. Repeat in other player tabs

**Expected Results:**
- ✓ Question and choices are displayed
- ✓ Bid summary shows your bid
- ✓ Answer selection highlights
- ✓ Submit button enables after selection
- ✓ Confirmation appears after submission
- ✓ After 20 seconds, phase changes to "RESULTS"

### Test 8: Results Phase

**Steps:**
1. Wait for results to load

**Expected Results:**
- ✓ Correct/Wrong indicator shows
- ✓ Correct answer is displayed
- ✓ Your bid amount is shown
- ✓ Score change is calculated correctly:
  - Correct: +2x bid
  - Wrong: -1x bid
- ✓ New score is displayed
- ✓ Leaderboard updates with new scores
- ✓ Rank changes are shown (↑, ↓, →)
- ✓ After 10 seconds, phase changes to "SPINNING" for next round

### Test 9: Multiple Rounds

**Steps:**
1. Play through several rounds (3-5 rounds)

**Expected Results:**
- ✓ Round number increments each time
- ✓ Different topics are selected (no repeats)
- ✓ Scores accumulate correctly
- ✓ Leaderboard rankings update
- ✓ Timers work for each phase

### Test 10: Game Completion

**Steps:**
1. Continue playing until round 10 completes
2. Wait for results phase to finish

**Expected Results:**
- ✓ Phase changes to "FINISHED"
- ✓ Winner screen appears
- ✓ Winner is announced (highest score)
- ✓ Final rankings are displayed
- ✓ Medals show for top 3 (🥇🥈🥉)
- ✓ If admin, "RESET GAME" button appears

### Test 11: Admin Controls

**Steps:**
1. As admin, test each control button:
   - Click "Spin Wheel" (in waiting phase)
   - Click "Next Phase" (in any phase)
   - Click "Reset Game"

**Expected Results:**
- ✓ "Spin Wheel" transitions to spinning phase
- ✓ "Next Phase" advances to next phase
- ✓ "Reset Game" shows confirmation dialog
- ✓ After confirming reset:
  - All scores reset to 5000
  - Round resets to 0
  - Phase resets to "WAITING"
  - Used topics are cleared
  - Page reloads

### Test 12: Timer Functionality

**Steps:**
1. Observe timers during each phase
2. Let timers expire without taking action

**Expected Results:**
- ✓ Timer counts down correctly
- ✓ Timer turns red when < 10 seconds
- ✓ Timer pulses when < 5 seconds
- ✓ Phase auto-advances when timer expires
- ✓ Timer syncs across all player tabs

### Test 13: Edge Cases

**Test 13a: Bid Validation**
- Try bidding 0 → Error: "Bid must be greater than zero"
- Try bidding more than score → Error: "Bid cannot exceed your current score"
- Try bidding negative → Error shown

**Test 13b: Name Validation**
- Try joining with empty name → Error: "Name cannot be empty"
- Try joining with duplicate name → Error: "Name already taken"
- Try joining during active game → Error: "Cannot join game in progress"

**Test 13c: Admin Actions**
- Try admin actions without being admin → Error: "Only admins can..."
- Try starting game when already started → Error shown

### Test 14: Real-time Synchronization

**Steps:**
1. Open 3+ browser tabs with different players
2. Perform actions in one tab
3. Observe updates in other tabs

**Expected Results:**
- ✓ Phase changes sync instantly
- ✓ Leaderboard updates in real-time
- ✓ Player count updates immediately
- ✓ Timer syncs across all tabs
- ✓ All players see same game state

### Test 15: Mobile Responsiveness

**Steps:**
1. Open on mobile device or use browser dev tools
2. Test all game phases

**Expected Results:**
- ✓ Layout adapts to screen size
- ✓ Buttons are touch-friendly
- ✓ Text is readable
- ✓ Leaderboard is accessible
- ✓ All features work on mobile

## Scoring Verification

Test these scoring scenarios:

| Scenario | Bid | Answer | Expected Score Change |
|----------|-----|--------|----------------------|
| Correct answer | 1000 | Correct | +2000 |
| Wrong answer | 1000 | Wrong | -1000 |
| Correct answer | 500 | Correct | +1000 |
| Wrong answer | 500 | Wrong | -500 |

Starting score: 5000

## Browser Compatibility

Test on:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Performance Checks

- [ ] Page loads in < 3 seconds
- [ ] No console errors
- [ ] Firebase reads/writes are efficient
- [ ] Animations are smooth
- [ ] No memory leaks (check dev tools)

## Common Issues and Solutions

### Issue: "Cannot read property of undefined"
**Cause**: Player data not loaded yet
**Solution**: Add null checks in code

### Issue: Timer doesn't sync
**Cause**: System clock differences
**Solution**: Use server timestamp (already implemented)

### Issue: Phase doesn't advance
**Cause**: Timer callback not firing
**Solution**: Check browser console for errors

### Issue: Leaderboard doesn't update
**Cause**: Firebase listener not set up
**Solution**: Verify `initializeLeaderboard()` is called

## Test Completion Checklist

- [ ] All 15 test scenarios pass
- [ ] No console errors
- [ ] All browsers tested
- [ ] Mobile tested
- [ ] Scoring verified
- [ ] Timers work correctly
- [ ] Real-time sync works
- [ ] Admin controls work
- [ ] Reset functionality works
- [ ] Edge cases handled

## Ready for Deployment?

If all tests pass, you're ready to deploy to GitHub Pages!

Follow the steps in `DEPLOYMENT_CHECKLIST.md`.
