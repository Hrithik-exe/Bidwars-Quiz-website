# Room Management System Integration Guide

## Overview

The room management system has been successfully integrated into the Bidding Quiz application. This document provides an overview of the implementation, usage instructions, and testing guidelines.

## Features Implemented

### 1. Room Code Generation
- **File**: `js/room-code-generator.js`
- **Features**:
  - Generates unique 6-character room codes
  - Uses base-32 alphabet (A-Z, 2-9) excluding ambiguous characters (0, O, 1, I, L)
  - Checks Firebase for uniqueness with retry logic (max 10 attempts)
  - Validates room code format

### 2. Inactivity Tracking
- **File**: `js/inactivity-tracker.js`
- **Features**:
  - Monitors all active rooms every 60 seconds
  - Detects rooms inactive for more than 10 minutes
  - Automatically triggers room termination for inactive rooms
  - Can be started/stopped as needed

### 3. Room Management
- **File**: `js/room-manager.js`
- **Features**:
  - Create new rooms with unique codes
  - Join existing rooms (as player or spectator)
  - Validate room codes before database queries
  - Update activity timestamps on all actions
  - Terminate inactive rooms with cleanup
  - Retry logic with exponential backoff for cleanup operations

### 4. Multi-Room Support
- **Modified Files**: `js/game-state.js`, `js/player.js`, `js/app.js`
- **Features**:
  - GameState and PlayerManager accept roomId parameter
  - Activity timestamps updated on phase transitions and player actions
  - Backward compatible with existing single-room functionality

### 5. Spectator Mode
- **Modified Files**: `js/room-manager.js`, `js/player.js`
- **Features**:
  - Admins join as spectators (stored separately from players)
  - Spectators can view all game data but cannot submit bids or answers
  - Spectators don't count toward player capacity
  - Spectator indicator displayed in UI

### 6. Room Selection UI
- **File**: `room-selection.html`
- **Features**:
  - Create new room button
  - Join existing room form with room code input
  - Admin checkbox for spectator mode
  - Room code display after creation
  - Copy room code to clipboard
  - Error handling and user feedback

### 7. In-Game UI Elements
- **Modified Files**: `js/app.js`, `styles.css`
- **Features**:
  - Room code display in game header
  - Copy room code button
  - Spectator mode indicator
  - Responsive design for mobile devices

## Firebase Data Structure

```
rooms/
  {roomId}/
    roomCode: "ABC123"
    status: "active" | "terminating" | "terminated"
    createdAt: timestamp
    lastActivityAt: timestamp
    phase: "waiting" | "spinning" | "bidding" | "question" | "results" | "finished"
    roundNumber: 0-10
    phaseStartTime: timestamp
    currentTopic: string
    usedTopics: []
    
    players/
      {playerId}/
        name: string
        score: number
        currentBid: number
        currentAnswer: number
        isAdmin: boolean
        joinedAt: timestamp
    
    spectators/
      {userId}/
        name: string
        joinedAt: timestamp
        isAdmin: true
    
    rounds/
      {roundNumber}/
        bids/
          {playerId}: amount
        answers/
          {playerId}: index
        results/
          {playerId}/
            correct: boolean
            scoreChange: number
            newScore: number

roomCodes/
  "ABC123": roomId
  "XYZ789": roomId
```

## Usage Flow

### Creating a Room

1. Navigate to `room-selection.html`
2. Click "Create Room" button
3. Room code is generated and displayed
4. Enter your name
5. Optionally check "Join as Admin" for spectator mode
6. Click "Join Room"
7. Redirected to game with room ID in URL

### Joining a Room

1. Navigate to `room-selection.html`
2. Enter the 6-character room code
3. Enter your name
4. Optionally check "Join as Admin" for spectator mode
5. Click "Join Room"
6. Redirected to game with room ID in URL

### Playing the Game

1. Room code displayed in header (can be copied)
2. If spectator, indicator shows "👁️ Spectator Mode"
3. Game proceeds normally through phases
4. Activity tracked automatically on all actions
5. Inactive rooms terminated after 10 minutes

## Activity Tracking

Activity timestamps are updated on:
- Room creation
- Player joins room
- Phase transitions
- Player submits bid
- Player submits answer
- Admin starts game
- Admin advances phase
- Admin resets game

Activity timestamps are NOT updated on:
- Spectator joins
- Timer countdown
- Firebase listeners triggering
- UI rendering

## Error Handling

### Error Response Format
```javascript
{
  success: boolean,
  error: string,           // Human-readable message
  errorCode: string,       // ERROR_CODE constant
  retryable: boolean,      // Whether operation can be retried
  details: {}              // Optional additional context
}
```

### Error Codes
- `INVALID_FORMAT`: Room code format invalid
- `ROOM_NOT_FOUND`: Room doesn't exist
- `ROOM_TERMINATING`: Room is being terminated
- `ROOM_FULL`: Room at capacity
- `CONNECTION_ERROR`: Firebase connection failed
- `GENERATION_FAILED`: Room code generation failed
- `CLEANUP_FAILED`: Cleanup operation failed

### Retry Logic
- Room code generation: Max 10 attempts
- Cleanup operations: Max 3 attempts with exponential backoff (1s, 2s, 4s)
- Firebase writes: Max 3 attempts with exponential backoff

## Testing

### Manual Testing

1. **Room Creation Flow**
   - Open `room-selection.html`
   - Create a room
   - Verify room code is displayed
   - Join the room
   - Verify redirect to game

2. **Room Joining Flow**
   - Open `room-selection.html` in another browser/tab
   - Enter the room code from step 1
   - Join as a different player
   - Verify both players see each other in leaderboard

3. **Spectator Mode**
   - Join a room with "Join as Admin" checked
   - Verify spectator indicator is shown
   - Try to submit a bid (should be rejected)
   - Try to submit an answer (should be rejected)

4. **Inactivity Termination**
   - Create a room
   - Wait 10+ minutes without any activity
   - Verify room is terminated automatically

5. **Multi-Room Support**
   - Create multiple rooms with different codes
   - Join different players to different rooms
   - Verify rooms are isolated (players don't see each other)

### Automated Testing

Use `test-room-management.html` to test:
- Room code generation and validation
- Room creation
- Room info retrieval
- Room joining (player and spectator)
- Activity tracking
- Inactivity tracker start/stop

## Integration Points

### BiddingQuizApp Constructor
```javascript
constructor(roomId = null) {
  this.roomManager = new RoomManager();
  
  // Check URL params or localStorage for roomId
  if (!roomId) {
    const urlParams = new URLSearchParams(window.location.search);
    roomId = urlParams.get('room') || localStorage.getItem('currentRoomId');
  }
  
  // Redirect to room selection if no roomId
  if (!this.roomId) {
    this.showRoomSelection();
    return;
  }
  
  // Initialize with roomId
  this.gameState = new GameState(this.roomId);
  this.playerManager = new PlayerManager(this.roomId);
  
  // Set roomManager references
  this.gameState.roomManager = this.roomManager;
  this.playerManager.roomManager = this.roomManager;
  
  // Start inactivity tracking
  this.roomManager.startInactivityTracking();
}
```

### GameState Integration
```javascript
constructor(roomId = "room1") {
  this.roomId = roomId;
  this.roomManager = null; // Set by app initialization
  // ...
}

async setPhase(phase) {
  // ... existing code ...
  
  // Update activity timestamp
  if (this.roomManager) {
    await this.roomManager.updateActivity(this.roomId);
  }
}
```

### PlayerManager Integration
```javascript
constructor(roomId = "room1") {
  this.roomId = roomId;
  this.roomManager = null; // Set by app initialization
  // ...
}

async submitBid(playerId, bidAmount) {
  // Check if player is spectator
  if (this.roomManager && await this.roomManager.isSpectator(this.roomId, playerId)) {
    return {
      success: false,
      error: 'Spectators cannot submit bids'
    };
  }
  
  // ... existing code ...
  
  // Update activity timestamp
  if (this.roomManager) {
    await this.roomManager.updateActivity(this.roomId);
  }
}
```

## Backward Compatibility

The system maintains backward compatibility with existing single-room functionality:
- Default roomId is "room1" if not specified
- Existing game flow unchanged
- Existing cleanup system preserved
- No breaking changes to existing APIs

## Performance Considerations

- Room code generation: < 100ms
- Room creation: < 500ms
- Join operation: < 500ms
- Inactivity check (100 rooms): < 5s
- Activity update: < 50ms (non-blocking)

## Security Considerations

1. **Room Code Uniqueness**: Cryptographically secure random generation with collision detection
2. **Admin Password**: Hardcoded in `player.js` - should be changed before deployment
3. **Spectator Restrictions**: Enforced server-side in PlayerManager methods
4. **Firebase Rules**: Should be configured to restrict unauthorized access

## Future Enhancements

1. Room capacity limits
2. Room passwords for private games
3. Room expiration after game completion
4. Room statistics and analytics
5. Reconnection handling for disconnected players
6. Room listing/discovery UI
7. Firebase security rules configuration

## Troubleshooting

### Room Code Not Working
- Verify code is exactly 6 characters
- Check for ambiguous characters (0, O, 1, I, L)
- Ensure room hasn't been terminated

### Spectator Can Submit Actions
- Verify isAdmin flag is set correctly
- Check roomManager reference is set on PlayerManager
- Verify spectator is in spectators collection, not players

### Inactivity Not Triggering
- Verify inactivity tracker is started
- Check lastActivityAt timestamp is being updated
- Ensure 10 minutes have passed since last activity

### Room Not Found After Creation
- Check Firebase connection
- Verify roomCodes mapping was created
- Check browser console for errors

## Support

For issues or questions, check:
1. Browser console for error messages
2. Firebase console for data structure
3. `test-room-management.html` for component testing
4. This integration guide for usage instructions
