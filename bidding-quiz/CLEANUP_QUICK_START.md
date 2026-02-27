# Cleanup System Quick Start Guide

## What is the Cleanup System?

The cleanup system automatically removes player records and game data from Firebase when games finish, helping reduce storage costs and prevent stale data accumulation.

## How It Works

### Automatic Cleanup (No Action Required)

When a game finishes (after 10 rounds):

1. **Immediately**: All player records are removed from Firebase
2. **Final rankings are preserved** in memory for display
3. **After 5 minutes**: All room data is cleaned up

### Manual Cleanup (Admin Only)

Admins can trigger immediate cleanup:

1. Open the admin panel (visible when logged in as admin)
2. View current data usage in the "Data Management" section
3. Click "Cleanup Game Data" button
4. Confirm in the dialog
5. Success message shows number of records removed

## Admin Panel Features

### Data Usage Stats
- **Players**: Current number of players in the room
- **Rounds**: Total number of completed rounds
- Updates in real-time as data changes

### Cleanup Button
- Immediately removes all player records
- Requires confirmation before executing
- Shows success/error messages
- Disabled during cleanup operation

## What Gets Removed

### Player Cleanup (Immediate)
- ❌ All player records (`/rooms/{roomId}/players`)
- ✅ Final rankings (cached in memory for display)

### Room Cleanup (After 5 Minutes)
- ❌ Round history (`/rooms/{roomId}/rounds`)
- ❌ Used topics (`/rooms/{roomId}/usedTopics`)
- ❌ Current topic (`/rooms/{roomId}/currentTopic`)
- ❌ Phase (`/rooms/{roomId}/phase`)
- ❌ Round number (`/rooms/{roomId}/roundNumber`)
- ✅ Cleanup timestamp (`/rooms/{roomId}/lastCleanedAt`)

## Error Handling

The system automatically handles errors:

- **Retry Logic**: Failed cleanups retry 3 times with delays (1s, 2s, 4s)
- **Error Messages**: Admins see clear error messages with instructions
- **Logging**: All operations logged to console for debugging

## Testing

### Integration Tests
Open `test-cleanup-integration.html` in a browser to run:
- Automatic cleanup flow
- Manual cleanup flow
- Rankings preservation
- Retry logic
- Data usage stats

### UI Tests
Open `test-admin-cleanup-ui.html` in a browser to test:
- Admin panel rendering
- Stats display
- Success/error messages
- Button interactions

## Troubleshooting

### Cleanup Doesn't Trigger
- ✅ Verify game reached FINISHED phase (round 10 complete)
- ✅ Check console for errors
- ✅ Ensure Firebase connection is active
- ✅ Try manual cleanup as admin

### Stats Don't Update
- ✅ Verify admin panel is visible
- ✅ Check Firebase listeners are active
- ✅ Refresh the page
- ✅ Check console for errors

### Manual Cleanup Fails
- ✅ Verify you're logged in as admin
- ✅ Check Firebase connection
- ✅ Wait for any in-progress cleanup to complete
- ✅ Check console for detailed error messages

## Console Logs

The system logs all operations to the console:

```
✓ Cleanup player_cleanup: Room: room1, Records: 3, Success: true
✓ Cleanup room_cleanup: Room: room1, Records: 6, Success: true
```

Failed operations show:
```
✗ Cleanup player_cleanup (attempt 1/3): Room: room1, Records: 0, Success: false Error: Connection failed
```

## Security

- ✅ Only admins can trigger manual cleanup
- ✅ Permission verification happens before cleanup
- ✅ All operations logged for audit trail
- ✅ Fail-closed error handling (deny by default)

## Performance

- **Cleanup Duration**: < 5 seconds for typical data
- **Stats Update**: < 2 seconds after changes
- **Room Cleanup Delay**: 5 minutes after player cleanup
- **Retry Delays**: 1s, 2s, 4s (exponential backoff)

## Need Help?

1. Check console logs for detailed error messages
2. Review `CLEANUP_SYSTEM_TESTS.md` for testing procedures
3. See `CLEANUP_IMPLEMENTATION_SUMMARY.md` for technical details
4. Contact support if issues persist

## Quick Commands

### View Current Stats (Console)
```javascript
const gameState = new GameState('room1');
const stats = await gameState.getDataUsageStats();
console.log(stats); // { playerCount: 3, roundCount: 5 }
```

### Manual Cleanup (Console)
```javascript
const gameState = new GameState('room1');
const result = await gameState.manualCleanup('your-player-id');
console.log(result); // { success: true, count: 3 }
```

### Get Cached Rankings (Console)
```javascript
const gameState = new GameState('room1');
const rankings = gameState.getCachedRankings();
console.log(rankings); // Array of player rankings
```

---

**Status**: ✅ System is active and monitoring all games
**Version**: 1.0.0
**Last Updated**: 2024
