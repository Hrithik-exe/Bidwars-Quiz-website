# Cleanup System Test Documentation

## Overview

This document describes the testing approach for the automatic Firebase cleanup system implemented in the wheel-improvements-and-user-cleanup spec.

## Test Files

### 1. Integration Tests (`test-cleanup-integration.html`)

Comprehensive integration tests covering the complete cleanup system workflow.

#### Test 1: Automatic Cleanup on Game Finish
- **Purpose**: Verify automatic cleanup triggers when game transitions to FINISHED phase
- **Steps**:
  1. Create test room with 3 players
  2. Set phase to RESULTS, round to 10
  3. Transition to FINISHED phase
  4. Verify player records removed
  5. Verify rankings cached
  6. Verify room cleanup timer scheduled
- **Expected**: All player records removed, rankings preserved, timer set

#### Test 2: Manual Cleanup Flow
- **Purpose**: Verify admin can manually trigger cleanup
- **Steps**:
  1. Create test room with 3 players
  2. Call manualCleanup() as admin
  3. Verify cleanup result
  4. Verify player records removed
- **Expected**: Cleanup succeeds, returns correct count, all players removed

#### Test 3: Rankings Preservation
- **Purpose**: Verify final rankings cached before cleanup
- **Steps**:
  1. Create test players with different scores
  2. Get rankings before cleanup
  3. Cache rankings
  4. Cleanup players
  5. Get cached rankings
  6. Compare rankings
- **Expected**: Cached rankings match original rankings

#### Test 4: Room Cleanup Timer
- **Purpose**: Verify room cleanup scheduled for 5 minutes
- **Steps**:
  1. Create test room
  2. Schedule room cleanup
  3. Verify timer set
  4. Cancel timer (test mode)
- **Expected**: Timer scheduled successfully

#### Test 5: Cleanup Retry Logic
- **Purpose**: Verify exponential backoff retry on failures
- **Steps**:
  1. Create test function that fails twice then succeeds
  2. Call retryCleanupWithBackoff
  3. Measure duration and attempts
  4. Verify success after retries
- **Expected**: 3 attempts, ~3 seconds duration (1s + 2s delays), success

#### Test 6: Data Usage Stats
- **Purpose**: Verify stats accurately reflect Firebase data
- **Steps**:
  1. Create 3 players and 2 rounds
  2. Get data usage stats
  3. Verify counts
- **Expected**: playerCount=3, roundCount=2

### 2. Admin UI Tests (`test-admin-cleanup-ui.html`)

Visual tests for admin cleanup panel UI components.

#### Features Tested:
- Admin panel rendering with cleanup section
- Data usage stats display (player count, round count)
- Manual cleanup button functionality
- Success/error message display
- Real-time stats updates
- Button state management (disabled during cleanup)

#### Test Controls:
- **Show Admin Panel**: Renders admin panel with cleanup controls
- **Update Stats**: Updates displayed stats to test values
- **Show Success**: Displays success message
- **Show Error**: Displays error message
- **Simulate Cleanup**: Full cleanup simulation with UI updates

## Running the Tests

### Integration Tests

1. Open `test-cleanup-integration.html` in a browser
2. Ensure Firebase is configured and accessible
3. Click individual test buttons to run each test
4. Check console for detailed logs
5. Verify test results (PASS/FAIL) displayed on page

**Note**: Tests use a separate test room (`test-cleanup-room`) and clean up after themselves.

### Admin UI Tests

1. Open `test-admin-cleanup-ui.html` in a browser
2. Click "Show Admin Panel" to render the UI
3. Use test controls to verify UI behavior
4. Check console for operation logs

## Manual Testing Checklist

### Automatic Cleanup Flow

- [ ] Start a game with multiple players
- [ ] Play through 10 rounds
- [ ] Verify game transitions to FINISHED phase
- [ ] Check Firebase: player records should be removed
- [ ] Verify final rankings still displayed on screen
- [ ] Wait 5 minutes: room data should be cleaned up
- [ ] Check console logs for cleanup operations

### Manual Cleanup Flow

- [ ] Join game as admin
- [ ] Open admin panel (should see cleanup section)
- [ ] Verify data stats show current player/round counts
- [ ] Click "Cleanup Game Data" button
- [ ] Verify confirmation dialog appears
- [ ] Click "Yes, Cleanup"
- [ ] Verify success message with record count
- [ ] Check Firebase: player records should be removed
- [ ] Verify stats update to show 0 players

### Error Handling

- [ ] Disconnect from Firebase during cleanup
- [ ] Verify retry logic attempts cleanup 3 times
- [ ] Verify error message displayed after max retries
- [ ] Verify cleanup can be retried manually
- [ ] Test non-admin attempting manual cleanup (should fail)

### Real-time Stats Updates

- [ ] Open admin panel
- [ ] Add players in another tab/window
- [ ] Verify player count updates automatically
- [ ] Complete rounds
- [ ] Verify round count updates automatically
- [ ] Trigger cleanup
- [ ] Verify stats update within 2 seconds

## Expected Behavior

### Automatic Cleanup Timeline

1. **Game Finishes** (Round 10 complete, transition to FINISHED)
   - Player records removed immediately
   - Final rankings cached in memory
   - Room cleanup timer starts (5 minutes)

2. **5 Minutes Later**
   - Room data fields set to null
   - `lastCleanedAt` timestamp written
   - Cleanup logged to console

### Cleanup Retry Behavior

- **Attempt 1**: Immediate
- **Attempt 2**: After 1 second delay
- **Attempt 3**: After 2 second delay (total 3 seconds)
- **After 3 failures**: Error logged, admin alerted

### Data Preserved

- Final rankings (cached in memory)
- Room structure (with `lastCleanedAt` timestamp)

### Data Removed

- All player records (`rooms/{roomId}/players`)
- Round history (`rooms/{roomId}/rounds`)
- Used topics (`rooms/{roomId}/usedTopics`)
- Current topic (`rooms/{roomId}/currentTopic`)
- Phase (`rooms/{roomId}/phase`)
- Round number (`rooms/{roomId}/roundNumber`)

## Troubleshooting

### Tests Fail to Connect to Firebase

- Verify `firebase-config.js` is properly configured
- Check browser console for Firebase errors
- Ensure Firebase Realtime Database rules allow test operations

### Cleanup Doesn't Trigger

- Check console logs for errors
- Verify game reached FINISHED phase
- Check `cleanupInProgress` flag (prevents concurrent cleanup)
- Verify Firebase connection is active

### Stats Don't Update

- Check Firebase listeners are active
- Verify admin panel is rendered
- Check console for listener errors
- Ensure `initializeCleanupControls` was called

## Performance Considerations

- Cleanup operations should complete within 5 seconds for typical data sizes
- Stats updates should reflect within 2 seconds of Firebase changes
- Retry delays use exponential backoff (1s, 2s, 4s)
- Room cleanup timer is 5 minutes (300,000ms)

## Security Notes

- Only admins can trigger manual cleanup
- Permission verification happens server-side (Firebase rules)
- Cleanup operations fail closed (deny by default on errors)
- All cleanup operations are logged for audit trail
