# Implementation Plan: Multiplayer Bidding Quiz Application

## Overview

This implementation plan breaks down the multiplayer bidding quiz application into discrete, actionable coding tasks. The application is a real-time browser-based game supporting up to 60 concurrent players across 10 rounds of trivia with a bidding mechanic. Built with vanilla JavaScript ES Modules and Firebase Realtime Database, it deploys to GitHub Pages without build tools.

The implementation follows a modular architecture with six core modules: firebase-config.js, game-state.js, player.js, ui.js, wheel.js, and timer.js. The UI follows a black and white minimalist aesthetic with responsive design for mobile and desktop.

## Development Strategy

Implementation proceeds in this order to enable incremental testing and early validation:
1. Project structure and Firebase setup
2. Player join system (first user-facing feature)
3. Real-time leaderboard (validates Firebase sync)
4. Game phase state machine (core game logic)
5. Bidding system (first gameplay mechanic)
6. Question and scoring system (core gameplay loop)
7. Wheel animation (visual polish)
8. Timer system (automatic progression)
9. Admin controls and game reset
10. Error handling and edge cases
11. Responsive design and performance optimization

## Tasks

- [x] 1. Set up project structure and Firebase configuration
  - Create directory structure with index.html, styles.css, and js/ folder
  - Create firebase-config.js with Firebase SDK import and configuration object
  - Initialize Firebase app and export database reference
  - Create basic HTML structure with CDN imports for Firebase SDK 10.7.1
  - Add meta tags for responsive design and charset
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2_

- [x] 2. Implement player join system
  - [x] 2.1 Create player.js module with Player and PlayerManager classes
    - Implement Player class with constructor, getters for id/name/score
    - Implement PlayerManager with joinGame(), isNameTaken(), canPlayerJoin() methods
    - Generate unique Player_ID using crypto.randomUUID() or fallback
    - Write player data to Firebase: rooms/{roomId}/players/{playerId} with name, score (5000), currentBid (0), currentAnswer (null)
    - _Requirements: 3.1, 3.2, 2.3, 2.4_
  
  - [ ]* 2.2 Write property test for player join
    - **Property 1: Player join creates unique ID with 5000 points**
    - **Validates: Requirements 3.1, 3.2**
  
  - [x] 2.3 Implement duplicate name validation
    - Check existing player names in Firebase before allowing join
    - Return error if name already exists
    - Display error message in UI
    - _Requirements: 3.3, 20.3_
  
  - [ ]* 2.4 Write property test for duplicate name rejection
    - **Property 2: Duplicate names are rejected**
    - **Validates: Requirements 3.3**
  
  - [x] 2.5 Implement phase-based join restriction
    - Check current game phase before allowing join
    - Only allow join when phase is "waiting"
    - Display appropriate error message for other phases
    - _Requirements: 3.4_
  
  - [ ]* 2.6 Write property test for join phase restriction
    - **Property 3: Join only allowed in waiting phase**
    - **Validates: Requirements 3.4**
  
  - [x] 2.7 Create join screen UI
    - Render join form with name input and submit button
    - Style with black/white minimalist design
    - Add autofocus to input, handle Enter key submission
    - Display player count below join button
    - Show loading state during Firebase write
    - _Requirements: 3.5, 18.8, 21.1, 21.3_

- [x] 3. Implement real-time leaderboard
  - [x] 3.1 Create leaderboard rendering in ui.js
    - Implement renderLeaderboard() function
    - Sort players by score in descending order
    - Display rank, name, and score for each player
    - Highlight current player with border
    - Make scrollable if more than 10 players
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6_
  
  - [x] 3.2 Set up Firebase listener for player score changes
    - Listen to rooms/{roomId}/players path
    - Update leaderboard in real-time when any score changes
    - Optimize to update only changed elements, not full re-render
    - _Requirements: 11.4, 19.3_
  
  - [ ]* 3.3 Write property test for leaderboard sorting
    - **Property 16: Leaderboard sorted by score**
    - **Validates: Requirements 11.2, 11.3**
  
  - [x] 3.4 Implement player count display
    - Count player nodes in Firebase
    - Display total count in UI
    - Update in real-time when players join/disconnect
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [ ]* 3.5 Write property test for player count accuracy
    - **Property 20: Player count accuracy**
    - **Validates: Requirements 13.1, 13.3**

- [x] 4. Checkpoint - Ensure join and leaderboard work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement game phase state machine
  - [x] 5.1 Create game-state.js module with GameState class
    - Implement constructor with roomId parameter
    - Define phase constants: waiting, spinning, bidding, question, results, finished
    - Implement getCurrentPhase(), getCurrentRound(), getCurrentTopic() methods
    - Set up Firebase listeners for phase, roundNumber, currentTopic changes
    - _Requirements: 4.1, 4.2, 2.3_
  
  - [x] 5.2 Implement phase transition methods
    - Create setPhase() method to write phase to Firebase
    - Implement transitionToSpinning(), transitionToBidding(), transitionToQuestion(), transitionToResults(), transitionToFinished()
    - Enforce phase order: waiting → spinning → bidding → question → results → (spinning or finished)
    - Write phaseStartTime timestamp to Firebase on each transition
    - _Requirements: 4.4, 12.1, 17.1_
  
  - [ ]* 5.3 Write property test for phase transitions
    - **Property 5: Phase transitions follow state machine**
    - **Validates: Requirements 4.4**
  
  - [ ]* 5.4 Write property test for phase persistence
    - **Property 6: Phase changes persist to Firebase**
    - **Validates: Requirements 4.2, 4.3**
  
  - [x] 5.5 Implement round management
    - Store roundNumber in Firebase (0-10)
    - Implement advanceToNextRound() to increment roundNumber
    - Transition to "finished" when roundNumber reaches 10
    - Display current round number in UI
    - _Requirements: 6.1, 6.3, 6.4, 6.5_
  
  - [ ]* 5.6 Write property test for round increments
    - **Property 10: Round number increments correctly**
    - **Validates: Requirements 6.3**
  
  - [x] 5.7 Create phase indicator UI component
    - Display current phase name in header
    - Update in real-time when phase changes
    - Show phase-specific instructions
    - Apply distinct styling per phase
    - _Requirements: 27.1, 27.2, 27.3, 27.4_

- [x] 6. Implement admin authentication and controls
  - [x] 6.1 Add admin authentication to PlayerManager
    - Define hardcoded ADMIN_PASSWORD constant
    - Implement authenticateAdmin(playerId, password) method
    - Set isAdmin flag in Firebase on successful authentication
    - Return error on incorrect password
    - _Requirements: 5.1, 5.4_
  
  - [x] 6.2 Create admin control UI
    - Render admin controls panel with buttons: Start Game, Spin Wheel, Next Phase, Reset Game
    - Show/hide based on isAdmin flag
    - Position as fixed panel (bottom-right desktop, bottom mobile)
    - Display current phase and round info
    - _Requirements: 5.2, 5.3_
  
  - [x] 6.3 Implement admin-only phase control
    - Check isAdmin before allowing phase transitions
    - Implement startGame() to set phase to "spinning" and round to 1
    - Implement manual phase advance for admin
    - Reject phase control actions from non-admin players
    - _Requirements: 4.5, 4.6, 5.5_
  
  - [ ]* 6.4 Write property test for admin privileges
    - **Property 7: Admin can control phases, non-admin cannot**
    - **Validates: Requirements 4.5, 4.6, 5.5**

- [x] 7. Implement topic selection and spinning wheel
  - [x] 7.1 Create wheel.js module with SpinningWheel class
    - Define 10 predefined topics: Science & Technology, World History, Geography, Literature & Arts, Sports & Games, Music & Entertainment, Food & Culture, Nature & Animals, Mathematics & Logic, Current Events
    - Implement render() to create wheel HTML with 10 segments
    - Implement getAvailableTopics() to filter out usedTopics
    - _Requirements: 7.6, 6.2_
  
  - [x] 7.2 Implement topic selection logic
    - Implement selectRandomTopic() to choose from unused topics
    - Write selected topic to Firebase: rooms/{roomId}/currentTopic
    - Add selected topic to Firebase: rooms/{roomId}/usedTopics array
    - Prevent selection of topics already in usedTopics
    - _Requirements: 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 7.3 Write property test for unique topics
    - **Property 8: Topics are unique per game**
    - **Validates: Requirements 6.2, 7.3, 7.4, 7.5**
  
  - [ ]* 7.4 Write property test for unused topic selection
    - **Property 9: Topic selection from unused set**
    - **Validates: Requirements 7.2**
  
  - [x] 7.5 Implement wheel spinning animation
    - Create CSS animation with transform: rotate()
    - Calculate random rotation between 1080° and 1800° (3-5 spins)
    - Use cubic-bezier easing for natural deceleration
    - Set animation duration to 5 seconds
    - Calculate final position to land on selected topic
    - _Requirements: 7.1_
  
  - [x] 7.6 Integrate wheel with game state
    - Trigger wheel animation when phase transitions to "spinning"
    - Auto-transition to "bidding" phase after 5 seconds
    - Display spinning screen with wheel during animation
    - _Requirements: 4.4, 12.5_

- [x] 8. Checkpoint - Ensure phase system and wheel work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement bidding system
  - [x] 9.1 Create bidding UI in ui.js
    - Render bid input (number type) and submit button
    - Display current topic and player score
    - Show scoring rules: correct = +2x bid, wrong = -1x bid
    - Disable input after submission with confirmation message
    - _Requirements: 8.1, 8.5_
  
  - [x] 9.2 Implement bid validation
    - Validate bid > 0 and bid ≤ current score
    - Display specific error messages for invalid bids
    - Allow resubmission on validation failure
    - Prevent submission of invalid bids to Firebase
    - _Requirements: 8.2, 8.3, 8.6, 20.1, 20.2, 20.4_
  
  - [ ]* 9.3 Write property test for bid validation
    - **Property 11: Bid validation**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.6**
  
  - [x] 9.4 Implement bid submission to Firebase
    - Write bid to rooms/{roomId}/players/{playerId}/currentBid
    - Also write to rooms/{roomId}/rounds/{roundNumber}/bids/{playerId}
    - Disable input immediately after submission
    - Prevent double submission with flag variable
    - _Requirements: 8.4, 19.1_
  
  - [x] 9.5 Create bid summary display
    - Calculate aggregate bid statistics: average, max, min
    - Display player's own bid prominently
    - Show bid summary when transitioning from bidding to question phase
    - Keep visible during question and results phases
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [ ]* 9.6 Write property test for bid summary
    - **Property 21: Bid summary contains all bids**
    - **Validates: Requirements 14.2**

- [x] 10. Implement question system and answer submission
  - [x] 10.1 Create questions data structure
    - Define QUESTIONS object with 10 topics as keys
    - Each question has: question (string), choices (array), correctAnswer (index 0-3)
    - Ensure each topic maps to exactly one question
    - Store questions locally in JavaScript, not in Firebase
    - _Requirements: 9.2, 25.1, 25.2, 25.3_
  
  - [ ]* 10.2 Write property test for question structure
    - **Property 26: Question data structure validation**
    - **Validates: Requirements 25.1, 25.2, 25.4**
  
  - [x] 10.3 Create question display UI
    - Render question text and multiple choice options
    - Display topic name at top
    - Implement answer selection (radio buttons or clickable boxes)
    - Highlight selected answer with inverted colors
    - Show submit button, enable only when answer selected
    - _Requirements: 9.1, 9.5_
  
  - [x] 10.4 Implement answer submission
    - Write answer index to rooms/{roomId}/players/{playerId}/currentAnswer
    - Also write to rooms/{roomId}/rounds/{roundNumber}/answers/{playerId}
    - Disable inputs after submission with confirmation message
    - Prevent double submission
    - _Requirements: 9.3, 9.4, 19.2_
  
  - [ ]* 10.5 Write property test for answer submission
    - **Property 12: Answer submission stores correctly**
    - **Validates: Requirements 9.3**

- [x] 11. Implement scoring system
  - [x] 11.1 Create score calculation logic
    - Implement calculateResults() in game-state.js
    - For correct answers: newScore = currentScore + (bid × 2)
    - For incorrect answers: newScore = currentScore - bid
    - Calculate for all players who submitted answers
    - _Requirements: 10.1, 10.2_
  
  - [ ]* 11.2 Write property test for correct answer scoring
    - **Property 13: Correct answer scoring**
    - **Validates: Requirements 10.1**
  
  - [ ]* 11.3 Write property test for incorrect answer scoring
    - **Property 14: Incorrect answer scoring**
    - **Validates: Requirements 10.2**
  
  - [x] 11.4 Update scores in Firebase
    - Write updated scores to rooms/{roomId}/players/{playerId}/score
    - Store round results: rooms/{roomId}/rounds/{roundNumber}/results/{playerId} with correct (boolean), scoreChange (number), newScore (number)
    - Trigger score updates during results phase
    - _Requirements: 10.3, 10.4, 10.5_
  
  - [ ]* 11.5 Write property test for score persistence
    - **Property 15: Score changes persist to Firebase**
    - **Validates: Requirements 10.3, 10.4**
  
  - [x] 11.6 Create results display UI
    - Show correct/incorrect indicator (✓ or ✗)
    - Display correct answer
    - Show player's bid, score change, and new score
    - Display updated leaderboard with rank changes
    - Use visual indicators for rank movement (↑↓→)
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 12. Checkpoint - Ensure full game loop works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement timer system
  - [x] 13.1 Create timer.js module with PhaseTimer class
    - Implement constructor with phase duration parameter
    - Implement start(serverStartTime) method
    - Calculate remaining time: max(0, duration - (now - startTime))
    - Update every 100ms for smooth countdown
    - _Requirements: 12.2_
  
  - [ ]* 13.2 Write property test for timer calculation
    - **Property 18: Timer calculation from start time**
    - **Validates: Requirements 12.2**
  
  - [x] 13.3 Implement timer callbacks
    - Call onTick(secondsRemaining) every second
    - Call onExpire() when timer reaches zero
    - Implement stop() and reset() methods
    - Clear interval on stop to prevent memory leaks
    - _Requirements: 12.3_
  
  - [x] 13.4 Integrate timer with phase transitions
    - Start timer when phase changes and phaseStartTime is written
    - Use phase-specific durations: spinning (5s), bidding (30s), question (20s), results (10s)
    - Trigger automatic phase transition on timer expiration
    - Handle late joiners by calculating remaining time from phaseStartTime
    - _Requirements: 12.4, 12.5_
  
  - [ ]* 13.5 Write property test for timer expiration
    - **Property 19: Timer expiration triggers transition**
    - **Validates: Requirements 12.4**
  
  - [x] 13.6 Create timer display UI
    - Render countdown in header (format: M:SS)
    - Use monospace font for consistent width
    - Apply red text when < 10 seconds
    - Add pulsing animation when < 5 seconds
    - _Requirements: 12.3, 18.8_

- [x] 14. Implement game completion and winner display
  - [x] 14.1 Create winner identification logic
    - Find player with maximum score after round 10
    - Handle ties by selecting first player with max score
    - Store winner information for display
    - _Requirements: 16.2_
  
  - [ ]* 14.2 Write property test for winner selection
    - **Property 22: Winner has highest score**
    - **Validates: Requirements 16.2**
  
  - [x] 14.3 Create winner screen UI
    - Display "GAME OVER" heading
    - Show winner name and final score prominently
    - Display full leaderboard with final rankings
    - Add medal emojis for top 3 (🥇🥈🥉)
    - Show admin reset button if user is admin
    - _Requirements: 16.1, 16.3, 16.4_

- [x] 15. Implement game reset functionality
  - [x] 15.1 Create resetGame() method in game-state.js
    - Set phase to "waiting"
    - Set roundNumber to 0
    - Clear usedTopics array
    - Reset all player scores to 5000
    - Clear all round data (bids, answers, results)
    - Clear currentTopic and phaseStartTime
    - _Requirements: 17.2, 17.3, 17.4, 17.5, 17.6_
  
  - [ ]* 15.2 Write property test for game reset
    - **Property 23: Game reset restores initial state**
    - **Validates: Requirements 17.2, 17.3, 17.4, 17.5, 17.6**
  
  - [x] 15.3 Add reset button to admin controls
    - Show reset button in admin panel
    - Add confirmation dialog before reset
    - Trigger resetGame() on confirmation
    - _Requirements: 17.1_

- [x] 16. Implement error handling and edge cases
  - [x] 16.1 Create ErrorHandler class in ui.js
    - Implement showError(message, type, duration) method
    - Create error message UI component with icon and dismiss button
    - Auto-dismiss after 5 seconds or allow manual dismiss
    - Position at top of screen with slide-in animation
    - _Requirements: 26.1, 26.2, 26.3, 26.4_
  
  - [x] 16.2 Add Firebase connection error handling
    - Display loading state while connecting
    - Show error message on connection failure
    - Implement retry logic with exponential backoff (3 attempts)
    - Provide manual "Retry Connection" button
    - _Requirements: 21.1, 21.2, 21.3_
  
  - [x] 16.3 Handle player disconnection gracefully
    - Retain player data in Firebase on disconnect
    - Continue game for remaining players
    - Allow reconnection with same Player_ID
    - Don't block phase transitions on missing submissions
    - _Requirements: 19.6, 28.1, 28.2, 28.3, 28.4_
  
  - [ ]* 16.4 Write property test for disconnection handling
    - **Property 24: Disconnection preserves player data**
    - **Validates: Requirements 19.6, 28.1, 28.3**
  
  - [ ]* 16.5 Write property test for phase transitions without all submissions
    - **Property 25: Phase transitions don't require all submissions**
    - **Validates: Requirements 28.2, 28.4**
  
  - [x] 16.6 Handle edge cases
    - Reject join during active game with appropriate message
    - Handle admin disconnection (game continues with auto-transitions)
    - Allow negative scores (player can recover)
    - Handle zero players remaining (preserve state)
    - Handle browser tab inactive (timer continues in background)
    - _Requirements: 19.4_

- [x] 17. Checkpoint - Ensure error handling works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Implement responsive design and styling
  - [x] 18.1 Create black and white minimalist CSS
    - Define color palette: #000000 (black), #FFFFFF (white), #CCCCCC (gray borders)
    - Set up typography: system fonts, 16px base, 1.6 line-height
    - Define spacing scale: 4px, 8px, 16px, 24px, 32px, 48px
    - Style buttons: black background, white text, hover invert
    - Style inputs: white background, black border, 8px padding
    - _Requirements: 18.1, 18.2, 18.3, 18.8_
  
  - [x] 18.2 Implement mobile responsive layout
    - Use CSS media query for < 768px breakpoint
    - Single column layout on mobile
    - Collapse leaderboard to top 5 + current player
    - Reduce font sizes by 10%
    - Full-width buttons
    - 16px padding
    - _Requirements: 18.1_
  
  - [x] 18.3 Implement desktop layout
    - Two column layout: main content (70%) + leaderboard (30%)
    - Use CSS Grid for main layout
    - Max width 1200px, centered
    - 32px padding
    - Full leaderboard visible
    - _Requirements: 18.2_
  
  - [x] 18.4 Add smooth phase transitions
    - Apply CSS transitions to UI elements (300ms ease)
    - Fade in/out between screens
    - Slide animations for error messages
    - Complete transitions within 500ms
    - _Requirements: 22.1, 22.2, 22.3_

- [ ] 19. Implement optional sound effects
  - [ ] 19.1 Create sound effects toggle
    - Add toggle control in UI (checkbox or button)
    - Store preference in localStorage
    - Load preference on page load
    - _Requirements: 23.1, 23.4_
  
  - [ ]* 19.2 Write property test for sound preference persistence
    - **Property 27: Sound preference persistence**
    - **Validates: Requirements 23.4**
  
  - [ ] 19.3 Add sound effect triggers
    - Play sound on wheel spin (if enabled)
    - Play sound on correct answer (if enabled)
    - Play sound on wrong answer (if enabled)
    - Play sound on phase transitions (if enabled)
    - Use Web Audio API or HTML5 audio elements
    - _Requirements: 23.2, 23.3_

- [x] 20. Implement performance optimizations
  - [x] 20.1 Optimize Firebase listeners
    - Use scoped listeners for specific paths
    - Detach listeners when components unmount
    - Use .once() for static data (questions)
    - Batch related writes with Firebase transactions
    - _Requirements: 19.3, 19.4_
  
  - [x] 20.2 Optimize UI rendering
    - Update only changed DOM elements
    - Use textContent instead of innerHTML where possible
    - Cache DOM element references
    - Implement efficient leaderboard updates (update scores only, not full re-render)
    - _Requirements: 19.3, 19.5_
  
  - [x] 20.3 Add input debouncing
    - Debounce bid input validation (300ms)
    - Prevent rapid Firebase writes
    - Disable buttons during submission
    - _Requirements: 19.1, 19.2, 19.4_

- [ ] 21. Verify Firebase data structure compliance
  - [ ]* 21.1 Write property test for Firebase schema
    - **Property 4: Firebase data structure compliance**
    - **Validates: Requirements 2.3, 2.4, 2.5**

- [x] 22. Create modular code organization
  - [x] 22.1 Ensure ES Module structure
    - Verify all modules use export/import syntax
    - Confirm firebase-config.js exports config and db
    - Confirm game-state.js exports GameState class
    - Confirm player.js exports Player and PlayerManager classes
    - Confirm ui.js exports UIManager class
    - Confirm wheel.js exports SpinningWheel class
    - Confirm timer.js exports PhaseTimer class
    - _Requirements: 24.1, 24.2, 24.3_
  
  - [x] 22.2 Add code comments
    - Document complex logic (timer calculation, score calculation, wheel animation)
    - Add JSDoc comments for public methods
    - Explain Firebase data structure in comments
    - _Requirements: 24.4_

- [x] 23. Final checkpoint - Full game test
  - Ensure all tests pass, ask the user if questions arise.

- [x] 24. Create documentation
  - [x] 24.1 Add README.md
    - Document setup instructions
    - Explain Firebase configuration steps
    - List browser compatibility requirements
    - Include deployment instructions for GitHub Pages
    - Note security limitations and recommendations
    - _Requirements: 29.1, 29.2, 29.3, 29.4_
  
  - [x] 24.2 Add inline documentation
    - Document admin password location and how to change it
    - Explain timer synchronization approach
    - Document question data structure format
    - Add comments for Firebase security rules recommendations

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All 29 requirements and 27 correctness properties are covered
- Implementation uses vanilla JavaScript ES Modules with no build tools
- Firebase Realtime Database provides real-time synchronization
- Black and white minimalist UI aesthetic throughout
- Responsive design supports mobile and desktop
- Optimized for 60 concurrent players
