# Implementation Plan: Player Disconnect Detection

## Overview

This plan implements real-time player disconnect detection using Firebase's presence system. The implementation includes three core components (PresenceTracker, DisconnectDetector, DisconnectNotifier) that integrate with existing PlayerManager and RoomManager classes. The system automatically removes disconnected players, terminates empty rooms, and provides UI notifications for all disconnect events.

## Tasks

- [x] 1. Create PresenceTracker class with Firebase presence management
  - Create new file `bidding-quiz/js/presence-tracker.js`
  - Implement `registerPlayer()` method to create presence data and set up onDisconnect hooks
  - Implement `unregisterPlayer()` method to remove presence and cancel hooks
  - Implement `startHeartbeat()` method with 30-second interval timer
  - Implement `stopHeartbeat()` method to clear interval timers
  - Implement `isPlayerOnline()` method to query presence status
  - Store heartbeat intervals in Map keyed by playerId
  - Export PresenceTracker class
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 6.1, 6.2, 6.4, 7.1, 7.2, 7.3, 7.4_

- [ ]* 1.1 Write property test for PresenceTracker
  - **Property 1: Presence Consistency**
  - **Validates: Requirements 10.1**
  - Generate random player/room combinations
  - Assert presence exists after registration
  - Assert presence removed after unregistration

- [x] 2. Create DisconnectDetector class with monitoring and removal logic
  - Create new file `bidding-quiz/js/disconnect-detector.js`
  - Implement `startMonitoring()` method to set up Firebase listeners and stale connection interval
  - Implement `stopMonitoring()` method to remove listeners and clear intervals
  - Implement `handleDisconnect()` method to remove player, cleanup presence, and check player count
  - Implement `checkStaleConnections()` method to detect connections with lastSeen > 90 seconds
  - Implement `getActivePlayerCount()` method that excludes spectators
  - Store Firebase listeners and intervals in Maps keyed by roomId
  - Export DisconnectDetector class
  - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 8.1, 8.2, 8.3, 8.4, 13.1, 13.2, 13.4_

- [ ]* 2.1 Write property test for DisconnectDetector stale connection detection
  - **Property 5: Stale Connection Removal**
  - **Validates: Requirements 3.3**
  - Generate random player/room combinations with old lastSeen timestamps
  - Run checkStaleConnections()
  - Assert all stale players removed

- [ ]* 2.2 Write property test for room termination trigger
  - **Property 3: Room Termination Trigger**
  - **Validates: Requirements 4.3**
  - Generate room with N players
  - Disconnect all players
  - Assert room termination triggered exactly once

- [ ]* 2.3 Write property test for spectator exclusion
  - **Property 7: Spectator Exclusion**
  - **Validates: Requirements 13.1, 13.4**
  - Generate room with players and spectators
  - Assert active player count excludes spectators
  - Disconnect all players
  - Assert room terminates despite spectators remaining

- [x] 3. Create DisconnectNotifier class for UI notifications
  - Create new file `bidding-quiz/js/disconnect-notifier.js`
  - Implement `notifyPlayerDisconnected()` method to show player disconnect toast
  - Implement `notifyRoomTerminating()` method to show room termination warning
  - Implement `notifyConnectionUnstable()` method to show connection warning
  - Use existing notification system (check for toast/notification utility in codebase)
  - Export DisconnectNotifier class
  - _Requirements: 2.5, 3.4, 4.4, 9.1, 9.2, 9.3, 9.4_

- [x] 4. Integrate PresenceTracker with PlayerManager
  - Import PresenceTracker in `bidding-quiz/js/player.js`
  - Add presenceTracker instance to PlayerManager constructor
  - Call `presenceTracker.registerPlayer()` in `joinGame()` method after successful player creation
  - Call `presenceTracker.unregisterPlayer()` in player removal logic (add removePlayer method if needed)
  - Handle presence registration errors and return appropriate error messages
  - _Requirements: 1.5, 10.1, 10.2, 14.1, 14.2_

- [x] 5. Add player removal method to PlayerManager
  - Implement `removePlayer()` method in PlayerManager class
  - Remove player from Firebase at `rooms/{roomId}/players/{playerId}`
  - Remove player from local players Map
  - Call `presenceTracker.unregisterPlayer()` to cleanup presence
  - Update room activity timestamp
  - Return success/error result
  - _Requirements: 2.2, 10.2, 14.3_

- [x] 6. Integrate DisconnectDetector with RoomManager and PlayerManager
  - Import DisconnectDetector and DisconnectNotifier in `bidding-quiz/js/room-manager.js`
  - Add disconnectDetector and notifier instances to RoomManager constructor
  - Call `disconnectDetector.startMonitoring()` after room creation in `createRoom()`
  - Call `disconnectDetector.stopMonitoring()` in `terminateRoom()` before cleanup
  - Pass PlayerManager and RoomManager references to DisconnectDetector constructor
  - Set notifier on DisconnectDetector instance
  - _Requirements: 4.3, 8.1, 8.3, 14.3, 14.4_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integrate disconnect detection with BiddingQuizApp
  - Locate BiddingQuizApp main class file
  - Import PresenceTracker, DisconnectDetector, and DisconnectNotifier
  - Initialize disconnect detection components in app constructor
  - Pass roomId to DisconnectDetector.startMonitoring() when room is active
  - Call DisconnectDetector.stopMonitoring() in app cleanup/destroy method
  - Ensure PlayerManager has reference to PresenceTracker
  - _Requirements: 8.1, 8.3, 14.5_

- [x] 9. Add error handling for Firebase connection failures
  - Add try-catch blocks in PresenceTracker.registerPlayer() for connection errors
  - Return error object with CONNECTION_ERROR code on failure
  - Add error logging in DisconnectDetector.handleDisconnect() for player removal failures
  - Continue with presence cleanup even if player removal fails
  - Add error logging in heartbeat update failures (non-blocking)
  - _Requirements: 1.5, 11.1, 11.2, 11.3, 11.4_

- [x] 10. Add data validation for presence data
  - Validate playerId and roomId are non-empty strings in all methods
  - Validate presence data structure before writing to Firebase
  - Ensure online is boolean, lastSeen and connectedAt are valid timestamps > 0
  - Validate playerName is non-empty string
  - Return validation errors with appropriate error messages
  - _Requirements: 10.3, 10.4_

- [ ]* 10.1 Write unit tests for data validation
  - Test validation rejects empty playerId
  - Test validation rejects empty roomId
  - Test validation rejects invalid timestamps
  - Test validation rejects invalid online status

- [x] 11. Implement Firebase security rules for presence data
  - Create or update Firebase security rules file
  - Add rules to restrict presence writes to authenticated users only
  - Allow read access to all presence data in a room
  - Validate presence data structure in security rules
  - Document security rules in comments
  - _Requirements: Security Considerations_

- [x] 12. Add performance optimizations
  - Use Firebase multi-path updates for atomic presence changes
  - Batch presence updates where possible
  - Ensure single listener per room for presence changes
  - Add memory cleanup for intervals and listeners on component destruction
  - Verify heartbeat frequency is 30 seconds and stale check is 60 seconds
  - _Requirements: 6.2, 12.1, 12.2, 12.3, Performance Considerations_

- [ ]* 12.1 Write performance tests
  - Test presence registration completes within 200ms
  - Test heartbeat update completes within 50ms
  - Test stale connection check for 10 players completes within 500ms
  - Test disconnect detection triggers within 5 seconds

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The design uses JavaScript, so all implementation will be in JavaScript
- Integration points: PlayerManager.joinGame(), RoomManager.createRoom(), RoomManager.terminateRoom()
- Firebase paths: `presence/{roomId}/{playerId}`, `rooms/{roomId}/players/{playerId}`, `rooms/{roomId}/spectators/{userId}`
