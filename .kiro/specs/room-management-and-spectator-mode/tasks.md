# Implementation Plan: Room Management and Spectator Mode

## Overview

This implementation plan builds a room management system for the multiplayer bidding quiz game. The system enables users to create and join game rooms using unique 6-character codes, automatically terminates inactive rooms after 10 minutes, and restricts admin users to spectator-only mode. Implementation follows an incremental approach: build core room management classes, integrate with existing game components, add UI for room selection, implement spectator restrictions, and add comprehensive testing.

## Tasks

- [x] 1. Create RoomCodeGenerator class with validation
  - Create new file `bidding-quiz/js/room-code-generator.js`
  - Implement base-32 alphabet (excluding 0, O, 1, I, L)
  - Implement `generate()` method with Firebase uniqueness check and retry logic (max 10 attempts)
  - Implement `validate()` method for format checking (6 chars, valid alphabet)
  - Export class for use by RoomManager
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.3_

- [ ]* 1.1 Write property tests for RoomCodeGenerator
  - **Property 24: Room Code Length** - All generated codes are exactly 6 characters
  - **Property 25: Room Code Character Set** - All characters are from valid alphabet
  - **Property 35: Room Code Format Validation** - Validation correctly identifies valid/invalid formats
  - **Property 33: Room Code Collision Handling** - System regenerates on collision until unique
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 10.3_

- [x] 2. Create InactivityTracker class
  - Create new file `bidding-quiz/js/inactivity-tracker.js`
  - Implement constructor accepting RoomManager reference
  - Implement `start()` method with 60-second interval
  - Implement `checkInactiveRooms()` method to query active rooms and calculate inactivity duration
  - Implement `stop()` method to clear interval
  - Call `roomManager.terminateRoom()` for rooms exceeding 10-minute threshold
  - _Requirements: 4.5, 5.1, 5.2_

- [ ]* 2.1 Write property tests for InactivityTracker
  - **Property 16: Inactivity Duration Calculation** - Duration equals current time minus lastActivityAt
  - **Property 17: Inactivity Threshold Detection** - Rooms older than 10 minutes are marked for termination
  - _Requirements: 4.5, 5.2_

- [x] 3. Create RoomManager class with core room operations
  - Create new file `bidding-quiz/js/room-manager.js`
  - Implement constructor initializing RoomCodeGenerator and InactivityTracker
  - Implement `createRoom()` method: generate code, initialize Firebase room with status 'active', timestamps, phase 'waiting'
  - Implement `getRoomInfo()` method to query room by code
  - Implement `updateActivity()` method to write current timestamp to Firebase
  - Implement error handling with retry logic for Firebase operations (max 3 attempts)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.4, 10.1_

- [ ]* 3.1 Write property tests for room creation
  - **Property 1: Room Code Uniqueness** - All generated room codes are unique across active rooms
  - **Property 2: Room Creation Persistence** - Querying Firebase after creation returns the room
  - **Property 3: Initial Room Phase** - New rooms have phase 'waiting'
  - **Property 4: Creation Timestamp Recording** - createdAt timestamp is within reasonable window
  - **Property 27: Initial Room Status** - New rooms have status 'active'
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1_

- [x] 4. Implement room joining and spectator logic in RoomManager
  - Implement `joinRoom()` method: validate code format, check room exists, verify status is 'active', check capacity
  - Add spectator handling: if isAdmin, add to spectators list; otherwise use PlayerManager
  - Implement `isSpectator()` method to check if userId exists in spectators list
  - Update activity timestamp on successful join
  - Return roomId, playerId (or null for spectators), and error messages
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.6, 7.3, 7.4, 8.4_

- [ ]* 4.1 Write property tests for room joining
  - **Property 5: Room Existence Verification** - System verifies room exists before adding player
  - **Property 6: Non-Existent Room Error** - Invalid codes return appropriate error
  - **Property 7: Player Addition on Valid Join** - Player appears in room's players list
  - **Property 8: Activity Update on Join** - lastActivityAt timestamp increases
  - **Property 9: Admin Spectator Assignment** - Admins added to spectators, not players
  - **Property 26: Format Validation Before Query** - Format validation occurs before Firebase query
  - **Property 30: Join Prevention During Termination** - Terminating rooms reject new joins
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 7.3, 7.4, 8.4_

- [x] 5. Implement room termination and cleanup in RoomManager
  - Implement `terminateRoom()` method: set status to 'terminating', log event, trigger cleanup
  - Integrate with existing cleanup system to remove player records and room data
  - Set status to 'terminated' after cleanup completes
  - Implement retry logic for cleanup failures (max 3 attempts with exponential backoff)
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 8.2, 8.3, 10.4_

- [ ]* 5.1 Write property tests for room termination
  - **Property 18: Termination Triggers Cleanup** - Marked rooms trigger cleanup system
  - **Property 19: Cleanup Data Removal** - All player and room data removed from Firebase
  - **Property 20: Termination Logging** - Log entry created with room code, reason, timestamp
  - **Property 28: Terminating Status Transition** - Status transitions from 'active' to 'terminating'
  - **Property 29: Terminated Status Finalization** - Status set to 'terminated' or room removed
  - **Property 34: Cleanup Retry on Error** - System logs and retries cleanup on error
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 8.2, 8.3, 10.4_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Modify GameState class for multi-room support
  - Update constructor to accept `roomId` parameter (default "room1" for backward compatibility)
  - Add `roomManager` property (set by app initialization)
  - Update `setPhase()` method to call `roomManager.updateActivity()` on phase transitions
  - Preserve all existing phase transition logic and cleanup functionality
  - _Requirements: 4.3, 6.1, 6.3_

- [ ]* 7.1 Write property tests for GameState integration
  - **Property 14: Activity Update on Phase Transition** - Phase changes update lastActivityAt
  - **Property 21: Finished Phase Cleanup Integration** - Finished state invokes cleanup system
  - **Property 22: Phase Transition Preservation** - All phase transitions function correctly
  - _Requirements: 4.3, 6.1, 6.3_

- [x] 8. Modify PlayerManager class for multi-room and spectator support
  - Update constructor to accept `roomId` parameter (default "room1" for backward compatibility)
  - Add `roomManager` property (set by app initialization)
  - Update `submitBid()` to check spectator status and reject if true
  - Update `submitAnswer()` to check spectator status and reject if true
  - Update `joinGame()` to call `roomManager.updateActivity()` on player join
  - Return appropriate error messages for spectator action attempts
  - _Requirements: 3.4, 3.5, 4.2, 6.2_

- [ ]* 8.1 Write property tests for PlayerManager spectator restrictions
  - **Property 11: Spectator Action Prevention** - Spectators cannot submit bids or answers
  - **Property 12: Spectator Capacity Exclusion** - Spectators don't affect player count
  - **Property 13: Activity Update on Player Actions** - Player actions update lastActivityAt
  - _Requirements: 3.4, 3.5, 3.6, 4.2_

- [x] 9. Update Firebase data structure for multi-room support
  - Update Firebase rules to support `rooms/{roomId}/` structure
  - Add `roomCodes/` mapping for code-to-roomId lookups
  - Add `spectators/` collection under each room
  - Ensure backward compatibility with existing single-room structure
  - Update security rules to allow spectator read access
  - _Requirements: 3.3, 6.5, 9.1, 9.2, 9.3, 9.4_

- [ ]* 9.1 Write property tests for spectator visibility
  - **Property 10: Spectator Read Access** - Spectators can read all game state without errors
  - **Property 32: Real-Time Spectator Updates** - Spectators receive real-time updates via Firebase
  - _Requirements: 3.3, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10. Create room selection UI
  - Create new file `bidding-quiz/room-selection.html` with room creation and joining interface
  - Add "Create New Room" button that calls `roomManager.createRoom()`
  - Add "Join Existing Room" form with room code input and player name input
  - Add admin checkbox for spectator mode selection
  - Display generated room code prominently after creation
  - Show error messages for invalid codes or connection failures
  - Style UI to match existing game aesthetic
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 7.3, 10.1, 10.2_

- [ ]* 10.1 Write unit tests for room selection UI
  - Test room creation button click handler
  - Test room joining form submission
  - Test error message display for invalid codes
  - Test admin checkbox behavior
  - _Requirements: 1.1, 2.1, 2.2, 3.1_

- [x] 11. Modify BiddingQuizApp for room management integration
  - Update constructor to accept optional `roomId` parameter
  - Initialize RoomManager instance
  - Show room selection screen if no roomId provided
  - Implement `handleCreateRoom()` method
  - Implement `handleJoinRoom()` method with admin/spectator support
  - Pass roomId to GameState and PlayerManager constructors
  - Set roomManager reference on GameState and PlayerManager instances
  - Start InactivityTracker after initialization
  - _Requirements: 1.1, 2.1, 3.1, 5.1, 6.1_

- [ ]* 11.1 Write integration tests for BiddingQuizApp
  - Test complete room lifecycle: create → join → play → finish → cleanup
  - Test multi-room scenario with multiple concurrent rooms
  - Test admin joining as spectator
  - Test inactivity termination after 10 minutes
  - _Requirements: 1.1, 2.1, 3.1, 5.1, 5.2, 6.1_

- [x] 12. Add in-game UI elements for room management
  - Display current room code prominently in game header
  - Add spectator status indicator for admin users
  - Show termination notice when room status is 'terminating'
  - Add "Copy Room Code" button for easy sharing
  - Update existing UI to show spectator count separately from player count
  - _Requirements: 3.3, 3.6, 8.5_

- [ ]* 12.1 Write unit tests for in-game UI elements
  - Test room code display
  - Test spectator indicator visibility
  - Test termination notice display
  - Test copy room code functionality
  - _Requirements: 3.3, 8.5_

- [x] 13. Implement activity timestamp persistence
  - Ensure all activity updates write to `rooms/{roomId}/lastActivityAt` in Firebase
  - Add Firebase listener for lastActivityAt changes (for debugging/monitoring)
  - Verify timestamps are stored as Unix milliseconds
  - Add error handling for timestamp write failures
  - _Requirements: 4.4, 4.5_

- [ ]* 13.1 Write property tests for activity persistence
  - **Property 15: Activity Timestamp Persistence** - Timestamps persisted to correct Firebase path
  - _Requirements: 4.4_

- [x] 14. Integrate with existing cleanup system
  - Ensure RoomManager calls existing cleanup functions when terminating rooms
  - Preserve manual admin cleanup controls
  - Add room status check to cleanup system (don't clean 'active' rooms)
  - Update cleanup logging to include room code and termination reason
  - _Requirements: 5.3, 6.1, 6.4_

- [ ]* 14.1 Write property tests for cleanup integration
  - **Property 23: Manual Cleanup Preservation** - Admin cleanup controls execute correctly
  - _Requirements: 6.4_

- [x] 15. Add error handling and user feedback
  - Implement error response format: `{success, error, errorCode, retryable, details}`
  - Add user-friendly error messages for all failure scenarios
  - Display connection errors with retry suggestions
  - Show capacity errors with alternative room suggestions
  - Log all errors to console with full context
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 15.1 Write unit tests for error handling
  - Test validation error responses
  - Test state error responses
  - Test permission error responses
  - Test system error responses with retry logic
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Integration and final wiring
  - Wire all components together in app initialization
  - Verify room creation flow end-to-end
  - Verify room joining flow end-to-end
  - Verify spectator mode restrictions work correctly
  - Verify inactivity termination triggers after 10 minutes
  - Verify existing game flow remains unaffected
  - Test with multiple concurrent rooms
  - _Requirements: All requirements_

- [ ]* 17.1 Write end-to-end integration tests
  - Test complete user journey: create room → share code → join → play → finish
  - Test spectator journey: join as admin → observe game → verify no player actions
  - Test inactivity journey: create room → wait 10 minutes → verify termination
  - Test multi-room journey: create 3 rooms → join different players → verify isolation
  - _Requirements: All requirements_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at reasonable breaks
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and UI components
- The implementation preserves backward compatibility with existing single-room functionality
- All new classes use ES6 module exports for clean integration
- Firebase structure changes are additive and don't break existing data
