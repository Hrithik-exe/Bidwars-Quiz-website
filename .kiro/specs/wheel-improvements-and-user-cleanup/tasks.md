# Implementation Plan: Wheel Improvements and User Cleanup

## Overview

This implementation enhances the multiplayer bidding quiz game with improved wheel functionality and automatic Firebase data cleanup. The work is divided into three main areas: (1) wheel visual and animation enhancements, (2) accessibility and performance improvements, and (3) automatic cleanup system with admin controls.

## Tasks

- [x] 1. Set up wheel enhancement infrastructure
  - Create CSS classes for wheel visual states (used, available, selected, spinning)
  - Add ARIA live region element to wheel component DOM
  - Initialize new SpinningWheel properties (usedTopics Set, ariaLiveRegion, highlightTimeout, animationFrameId)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2_

- [ ]* 1.1 Write property tests for wheel visual states
  - **Property 4: Distinct Segment Colors**
  - **Property 8: Used Topic Visual State**
  - **Validates: Requirements 1.4, 3.1, 3.2**

- [ ] 2. Implement enhanced wheel rendering with used topics
  - [x] 2.1 Implement renderWithUsedTopics method
    - Render wheel segments with visual distinction for used vs available topics
    - Apply reduced opacity and grayscale filter to used topic segments
    - Display topic count overlay showing remaining available topics
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 2.2 Write property tests for topic rendering
    - **Property 9: Available Topic Count Accuracy**
    - **Validates: Requirements 3.3**
  
  - [x] 2.3 Implement updateTopicCountDisplay method
    - Calculate and display count of remaining topics
    - Show "No topics available" message when all topics used
    - _Requirements: 3.3, 3.4_

- [ ] 3. Implement enhanced wheel animation system
  - [x] 3.1 Implement calculateEnhancedRotation method
    - Calculate rotation ensuring minimum 3 full rotations (1080 degrees)
    - Ensure precise alignment with target topic segment (within 1 degree)
    - Add randomization for spin duration between 3-7 seconds
    - _Requirements: 2.2, 2.3, 2.4_
  
  - [ ]* 3.2 Write property tests for animation calculations
    - **Property 5: Animation Duration Bounds**
    - **Property 6: Minimum Rotation Requirement**
    - **Property 7: Precise Segment Alignment**
    - **Validates: Requirements 2.2, 2.3, 2.4**
  
  - [x] 3.3 Implement spinWithEnhancedAnimation method
    - Use CSS transforms with cubic-bezier easing for realistic deceleration
    - Apply wheel--spinning CSS class during animation
    - Track animation timing with spinStartTime property
    - Return Promise that resolves with selected topic
    - _Requirements: 2.1, 2.2, 1.2_
  
  - [ ]* 3.4 Write property tests for animation behavior
    - **Property 2: Spinning Indicator Presence**
    - **Validates: Requirements 1.2**

- [ ] 4. Implement wheel selection feedback system
  - [x] 4.1 Implement highlightSelectedTopic method
    - Apply wheel-segment--selected CSS class to selected segment
    - Display topic name in prominent overlay element
    - Maintain highlight for 2 seconds minimum
    - Remove highlight after duration expires
    - _Requirements: 1.1, 1.3_
  
  - [ ]* 4.2 Write property tests for selection feedback
    - **Property 1: Wheel Highlight Duration**
    - **Property 3: Topic Overlay Display**
    - **Validates: Requirements 1.1, 1.3**

- [ ] 5. Implement wheel accessibility features
  - [x] 5.1 Implement announceToScreenReader method
    - Update ARIA live region with announcement messages
    - Announce "Selecting topic" when spin starts
    - Announce selected topic name when spin completes
    - _Requirements: 8.1, 8.3, 8.4_
  
  - [x] 5.2 Add ARIA labels to wheel interactive elements
    - Add aria-label attributes to spin button and wheel container
    - Add aria-live="polite" to announcement region
    - _Requirements: 8.2_
  
  - [ ]* 5.3 Write property tests for accessibility
    - **Property 22: ARIA Live Region Updates**
    - **Property 23: ARIA Labels on Interactive Elements**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [ ] 6. Optimize wheel performance
  - [x] 6.1 Implement CSS transform-based animations
    - Use transform: rotate() instead of position properties
    - Leverage hardware acceleration with will-change: transform
    - Minimize DOM manipulations during animation
    - _Requirements: 9.1, 9.4_
  
  - [x] 6.2 Add performance monitoring
    - Track frame rate using requestAnimationFrame timestamps
    - Log warning if frame rate drops below 30 FPS
    - Measure and log initial render time
    - _Requirements: 9.2, 9.3_
  
  - [ ]* 6.3 Write property tests for performance
    - **Property 24: Animation Frame Rate**
    - **Property 25: Initial Render Performance**
    - **Property 26: Limited DOM Mutations During Animation**
    - **Validates: Requirements 9.2, 9.3, 9.4**

- [x] 7. Checkpoint - Ensure wheel enhancements work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Set up cleanup system infrastructure
  - [x] 8.1 Add cleanup properties to GameState class
    - Initialize cleanupTimer, cleanupInProgress, finalRankingsCache properties
    - Set maxCleanupRetries to 3
    - Initialize cleanupRetryCount to 0
    - _Requirements: 4.1, 4.2, 10.1_
  
  - [x] 8.2 Create cleanup logging utility
    - Implement function to create cleanup log entries with timestamp, operation type, records removed
    - Log to console with structured format
    - _Requirements: 4.3, 5.4_

- [ ] 9. Implement player cleanup system
  - [x] 9.1 Implement cacheFinalRankings method
    - Fetch current player rankings from Firebase
    - Store in finalRankingsCache property
    - Return Promise that resolves when cache complete
    - _Requirements: 4.2_
  
  - [x] 9.2 Implement cleanupPlayerRecords method
    - Cache final rankings before cleanup
    - Remove all player records from Firebase path rooms/{roomId}/players
    - Log cleanup operation with timestamp and player count
    - Return success status and count of records removed
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 9.3 Write property tests for player cleanup
    - **Property 10: Player Record Removal**
    - **Property 11: Rankings Preservation**
    - **Property 12: Cleanup Operation Logging**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  
  - [x] 9.4 Implement getCachedRankings method
    - Return finalRankingsCache or empty array if not cached
    - _Requirements: 4.2_

- [ ] 10. Implement cleanup retry logic with exponential backoff
  - [x] 10.1 Implement retryCleanupWithBackoff method
    - Retry failed cleanup operations with exponential backoff (1s, 2s, 4s delays)
    - Track retry attempts with cleanupRetryCount
    - Stop after maxCleanupRetries (3) attempts
    - Log each retry attempt and outcome
    - _Requirements: 4.4, 10.1, 10.2, 10.3_
  
  - [ ]* 10.2 Write property tests for retry logic
    - **Property 13: Cleanup Retry on Failure**
    - **Property 27: Exponential Backoff Retry**
    - **Property 28: Retry Outcome Logging**
    - **Validates: Requirements 4.4, 10.1, 10.2, 10.3**
  
  - [x] 10.3 Add error handling for permanent failures
    - Display error message to admin after all retries exhausted
    - Include manual intervention instructions in error message
    - Log permanent failure with error details
    - _Requirements: 10.4_
  
  - [ ]* 10.4 Write property test for permanent failure handling
    - **Property 29: Permanent Failure Admin Alert**
    - **Validates: Requirements 10.4**

- [ ] 11. Implement room data cleanup system
  - [x] 11.1 Implement scheduleRoomCleanup method
    - Start 5-minute timer after player cleanup completes
    - Store timer ID in cleanupTimer property
    - Cancel existing timer if already scheduled
    - _Requirements: 5.1_
  
  - [x] 11.2 Implement cleanupRoomData method
    - Remove rounds, usedTopics, currentTopic, phase, roundNumber fields from Firebase
    - Set all removed fields to null
    - Write lastCleanedAt timestamp to Firebase
    - Log cleanup operation with timestamp and data size
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 11.3 Write property tests for room cleanup
    - **Property 14: Timed Room Cleanup Trigger**
    - **Property 15: Room Data Field Removal**
    - **Property 16: Cleanup Timestamp Preservation**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 12. Implement automatic cleanup trigger
  - [x] 12.1 Implement triggerAutomaticCleanup method
    - Call cacheFinalRankings before cleanup
    - Call cleanupPlayerRecords with retry logic
    - Call scheduleRoomCleanup after player cleanup succeeds
    - Handle cleanup failures with retryCleanupWithBackoff
    - _Requirements: 4.1, 4.2, 4.4, 5.1_
  
  - [x] 12.2 Hook automatic cleanup to phase transitions
    - Listen for phase changes to "finished" in GameState
    - Trigger triggerAutomaticCleanup when game finishes
    - Ensure cleanup only runs once per game
    - _Requirements: 4.1_

- [x] 13. Checkpoint - Ensure automatic cleanup works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement admin cleanup controls UI
  - [x] 14.1 Create admin cleanup panel HTML
    - Add cleanup panel with data stats display (player count, round count)
    - Add "Cleanup Game Data" button (visible to admins only)
    - Add cleanup status message area
    - _Requirements: 6.1, 7.1, 7.2_
  
  - [x] 14.2 Create cleanup confirmation dialog
    - Add modal dialog with confirmation message
    - Add "Yes, Cleanup" and "Cancel" buttons
    - Style modal with overlay and centered content
    - _Requirements: 6.3_
  
  - [x] 14.3 Add CSS styles for admin controls
    - Style cleanup panel, buttons, and stats display
    - Style confirmation modal and overlay
    - Ensure responsive design for mobile devices

- [ ] 15. Implement admin cleanup functionality
  - [x] 15.1 Implement manualCleanup method
    - Verify player is admin before allowing cleanup
    - Show confirmation dialog before executing cleanup
    - Call cleanupPlayerRecords immediately on confirmation
    - Display success message with count of records removed
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 15.2 Write property tests for manual cleanup
    - **Property 17: Cleanup Confirmation Dialog**
    - **Property 18: Cleanup Success Message**
    - **Validates: Requirements 6.3, 6.4**
  
  - [x] 15.3 Wire manual cleanup button to manualCleanup method
    - Add click event listener to cleanup button
    - Show confirmation dialog on click
    - Execute cleanup on confirmation
    - Handle errors and display error messages

- [ ] 16. Implement data usage monitoring
  - [x] 16.1 Implement getDataUsageStats method
    - Query Firebase for current player count in room
    - Query Firebase for total round count
    - Return object with playerCount and roundCount
    - _Requirements: 7.1, 7.2_
  
  - [x] 16.2 Implement real-time stats updates
    - Listen for Firebase changes to players and rounds paths
    - Update data stats display when changes detected
    - Ensure updates reflect within 2 seconds of changes
    - _Requirements: 7.3, 7.4_
  
  - [ ]* 16.3 Write property tests for data monitoring
    - **Property 19: Data Usage Stats Accuracy**
    - **Property 20: Real-time Stats Updates**
    - **Property 21: Post-Cleanup Stats Update Timing**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
  
  - [x] 16.3 Wire stats display to getDataUsageStats
    - Call getDataUsageStats on admin panel render
    - Update player-count and round-count elements
    - Refresh stats after cleanup operations

- [ ] 17. Add error handling for edge cases
  - [x] 17.1 Handle wheel animation errors
    - Handle case when no topics available (disable spin, show message)
    - Handle Firebase read failures (assume all topics available, log error)
    - Handle animation performance degradation (log warning, continue)
    - _Requirements: 3.4_
  
  - [x] 17.2 Handle cleanup operation errors
    - Handle partial cleanup failures (track failed records, retry individually)
    - Handle timer scheduling failures (log error, allow manual cleanup)
    - Handle concurrent cleanup attempts (use cleanupInProgress flag)
    - _Requirements: 4.4, 10.1, 10.4_
  
  - [x] 17.3 Handle admin control errors
    - Handle permission verification failures (deny cleanup, log error)
    - Handle rankings cache failures (abort cleanup, retry after cache succeeds)
    - Handle incomplete data removal (verify paths, retry failed paths)
    - _Requirements: 6.1, 4.2_
  
  - [ ]* 17.4 Write unit tests for error conditions
    - Test Firebase connection lost during cleanup
    - Test invalid admin credentials
    - Test cleanup timeout scenarios
    - Test malformed Firebase data
    - Test missing DOM elements

- [ ] 18. Final integration and testing
  - [x] 18.1 Integration test: Complete game flow with cleanup
    - Start game, play 10 rounds, verify automatic cleanup triggers
    - Verify player records removed immediately
    - Verify room data removed after 5 minutes
    - Verify final rankings preserved and displayed
    - _Requirements: 4.1, 4.2, 5.1_
  
  - [x] 18.2 Integration test: Manual cleanup flow
    - Admin triggers manual cleanup
    - Verify confirmation dialog appears
    - Verify cleanup executes on confirmation
    - Verify success message displays with record count
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 18.3 Integration test: Wheel enhancements
    - Spin wheel multiple times with various used topics
    - Verify visual feedback, animations, and accessibility
    - Verify performance metrics meet requirements
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 8.1, 9.2_
  
  - [ ]* 18.4 Run full property-based test suite
    - Execute all 29 property tests with 100 iterations each
    - Verify all properties pass
    - Review and fix any failures

- [x] 19. Final checkpoint - Ensure all features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and error conditions
- Use Firebase emulator for testing cleanup operations
- Use browser Performance API for wheel performance testing
- All cleanup operations use exponential backoff retry logic (1s, 2s, 4s delays)
- Admin controls are only visible to authenticated admin users
