# Requirements Document

## Introduction

This document specifies the requirements for a real-time multiplayer bidding quiz web application. The system enables up to 60 concurrent players to participate in a 10-round quiz game where players bid points on their confidence before answering questions. The application runs entirely client-side using Firebase Realtime Database and is deployable to GitHub Pages static hosting.

## Glossary

- **Quiz_Application**: The complete browser-based multiplayer quiz game system
- **Firebase_Client**: The Firebase Realtime Database client library loaded via CDN
- **Game_Room**: A Firebase database node containing all state for one game session
- **Player**: A human participant identified by unique ID and display name
- **Admin**: A player with elevated privileges to control game flow
- **Game_Phase**: The current state in the game state machine (waiting, spinning, bidding, question, results, finished)
- **Round**: One complete cycle of topic selection, bidding, question answering, and results
- **Topic**: A category from which a question is drawn
- **Spinning_Wheel**: An animated UI component that randomly selects an unused topic
- **Bid**: A point amount wagered by a player before seeing the question
- **Question**: A multiple-choice query presented to all players
- **Score**: A player's current point total
- **Leaderboard**: A sorted display of all players ranked by score
- **Phase_Timer**: A countdown mechanism that automatically advances game phases
- **Used_Topics**: A collection of topics already selected in the current game
- **Admin_Password**: A hardcoded credential for admin authentication
- **Player_ID**: A unique identifier generated for each player upon joining
- **Phase_Start_Time**: A Firebase timestamp marking when the current phase began
- **Bid_Summary**: An aggregate view of all player bids after bidding phase ends
- **Correct_Answer**: The validated solution to the current question
- **Winner**: The player with the highest score after 10 rounds

## Requirements

### Requirement 1: Static Hosting Compatibility

**User Story:** As a developer, I want the application to run on GitHub Pages, so that I can deploy without server infrastructure.

#### Acceptance Criteria

1. THE Quiz_Application SHALL load all dependencies via CDN links
2. THE Quiz_Application SHALL execute all game logic in the browser
3. THE Quiz_Application SHALL function when index.html is opened directly in a browser
4. THE Quiz_Application SHALL function when deployed to GitHub Pages
5. THE Quiz_Application SHALL NOT require Node.js, Express, PHP, npm packages, or backend servers
6. THE Quiz_Application SHALL NOT require build tools or bundlers
7. THE Quiz_Application SHALL use only HTML, CSS, and Vanilla JavaScript ES Modules

### Requirement 2: Firebase Integration

**User Story:** As a developer, I want to integrate Firebase Realtime Database, so that players can synchronize game state in real-time.

#### Acceptance Criteria

1. THE Firebase_Client SHALL be imported from gstatic.com/firebasejs/10.7.1/
2. THE Quiz_Application SHALL store Firebase configuration in firebase-config.js
3. THE Quiz_Application SHALL structure data as rooms/{roomId}/phase, rooms/{roomId}/roundNumber, rooms/{roomId}/currentTopic, rooms/{roomId}/phaseStartTime, rooms/{roomId}/players/{playerId}, rooms/{roomId}/usedTopics, rooms/{roomId}/rounds/{roundN}
4. THE Quiz_Application SHALL store player data as name, score, currentBid, currentAnswer under each player node
5. THE Quiz_Application SHALL store round data as bids, answers, results under each round node

### Requirement 3: Player Join System

**User Story:** As a player, I want to join a game with my name, so that I can participate in the quiz.

#### Acceptance Criteria

1. WHEN a player submits a name, THE Quiz_Application SHALL generate a unique Player_ID
2. WHEN a player submits a name, THE Quiz_Application SHALL add the player to Firebase with initial Score of 5000
3. WHEN a player submits a duplicate name, THE Quiz_Application SHALL reject the submission with an error message
4. WHILE Game_Phase is not "waiting", THE Quiz_Application SHALL prevent new players from joining
5. WHEN a player successfully joins, THE Quiz_Application SHALL display the game interface

### Requirement 4: Game Phase State Machine

**User Story:** As a player, I want the game to progress through structured phases, so that gameplay is organized and predictable.

#### Acceptance Criteria

1. THE Quiz_Application SHALL support Game_Phases: "waiting", "spinning", "bidding", "question", "results", "finished"
2. THE Quiz_Application SHALL store the current Game_Phase in Firebase
3. WHEN Game_Phase changes in Firebase, THE Quiz_Application SHALL update all connected clients
4. THE Quiz_Application SHALL transition phases in order: waiting → spinning → bidding → question → results → (repeat or finished)
5. WHERE a player is Admin, THE Quiz_Application SHALL allow manual phase transitions
6. WHERE a player is not Admin, THE Quiz_Application SHALL prevent manual phase transitions

### Requirement 5: Admin Authentication and Control

**User Story:** As an admin, I want to control game flow, so that I can manage the quiz session.

#### Acceptance Criteria

1. WHEN a player enters the correct Admin_Password, THE Quiz_Application SHALL grant admin privileges
2. WHERE a player is Admin, THE Quiz_Application SHALL display controls to start game, trigger wheel spin, move between phases, and reset game
3. WHERE a player is not Admin, THE Quiz_Application SHALL hide admin controls
4. THE Quiz_Application SHALL store Admin_Password as a hardcoded value in the codebase
5. WHERE a player is Admin, THE Quiz_Application SHALL allow modification of Game_Phase in Firebase

### Requirement 6: Round Management

**User Story:** As a player, I want to play exactly 10 rounds, so that the game has a defined structure and endpoint.

#### Acceptance Criteria

1. THE Quiz_Application SHALL conduct exactly 10 rounds per game
2. THE Quiz_Application SHALL select one unique Topic per round
3. THE Quiz_Application SHALL increment roundNumber in Firebase after each round completes
4. WHEN roundNumber reaches 10 and results are displayed, THE Quiz_Application SHALL transition Game_Phase to "finished"
5. THE Quiz_Application SHALL display the current round number to all players

### Requirement 7: Topic Selection with Spinning Wheel

**User Story:** As a player, I want to see an animated wheel select the topic, so that topic selection is engaging and random.

#### Acceptance Criteria

1. WHEN Game_Phase transitions to "spinning", THE Spinning_Wheel SHALL animate using CSS and JavaScript
2. THE Spinning_Wheel SHALL randomly select one Topic from the set of unused topics
3. WHEN a Topic is selected, THE Quiz_Application SHALL add it to Used_Topics in Firebase
4. WHEN a Topic is selected, THE Quiz_Application SHALL store it as currentTopic in Firebase
5. THE Quiz_Application SHALL prevent selection of topics already in Used_Topics
6. THE Quiz_Application SHALL display 10 unique predefined topics on the wheel

### Requirement 8: Bidding System

**User Story:** As a player, I want to bid points on my confidence, so that I can risk more for higher rewards.

#### Acceptance Criteria

1. WHEN Game_Phase is "bidding", THE Quiz_Application SHALL display a bid input to each player
2. WHEN a player submits a bid, THE Quiz_Application SHALL validate that the bid amount does not exceed the player's current Score
3. WHEN a player submits a bid, THE Quiz_Application SHALL validate that the bid amount is greater than zero
4. WHEN a player submits a valid bid, THE Quiz_Application SHALL store it as currentBid in Firebase
5. WHEN a player submits a bid, THE Quiz_Application SHALL disable the bid input to prevent duplicate submissions
6. IF a player submits an invalid bid, THEN THE Quiz_Application SHALL display an error message and allow resubmission

### Requirement 9: Question Display and Answer Submission

**User Story:** As a player, I want to answer multiple-choice questions, so that I can earn or lose points based on my bid.

#### Acceptance Criteria

1. WHEN Game_Phase is "question", THE Quiz_Application SHALL display the Question and answer choices to all players
2. THE Quiz_Application SHALL store questions in a structured JSON object
3. WHEN a player selects an answer, THE Quiz_Application SHALL store it as currentAnswer in Firebase
4. WHEN a player submits an answer, THE Quiz_Application SHALL disable answer inputs to prevent duplicate submissions
5. THE Quiz_Application SHALL display one Question per Topic per round

### Requirement 10: Scoring System

**User Story:** As a player, I want my score to update based on correct answers and bids, so that I can track my performance.

#### Acceptance Criteria

1. WHEN a player answers correctly, THE Quiz_Application SHALL increase the player's Score by (Bid × 2)
2. WHEN a player answers incorrectly, THE Quiz_Application SHALL decrease the player's Score by Bid
3. THE Quiz_Application SHALL calculate score changes during the "results" Game_Phase
4. THE Quiz_Application SHALL update each player's Score in Firebase after calculation
5. THE Quiz_Application SHALL display the updated Score to each player

### Requirement 11: Real-Time Leaderboard

**User Story:** As a player, I want to see a live leaderboard, so that I can track my ranking against other players.

#### Acceptance Criteria

1. THE Leaderboard SHALL be visible to all players at all times
2. THE Leaderboard SHALL display players sorted in descending order by Score
3. THE Leaderboard SHALL display rank numbers for each player
4. WHEN any player's Score changes in Firebase, THE Leaderboard SHALL update in real-time
5. THE Leaderboard SHALL highlight the current player's entry
6. THE Leaderboard SHALL display player names and scores

### Requirement 12: Phase Timer System

**User Story:** As a player, I want automatic phase transitions, so that the game progresses smoothly without manual intervention.

#### Acceptance Criteria

1. WHEN a Game_Phase begins, THE Quiz_Application SHALL store Phase_Start_Time in Firebase
2. THE Phase_Timer SHALL calculate remaining time locally on each client using Phase_Start_Time
3. THE Phase_Timer SHALL display a countdown to all players
4. WHEN Phase_Timer reaches zero, THE Quiz_Application SHALL automatically transition to the next Game_Phase
5. THE Quiz_Application SHALL assign time limits: bidding (30 seconds), question (20 seconds), results (10 seconds), spinning (5 seconds)

### Requirement 13: Player Count Display

**User Story:** As a player, I want to see how many players are connected, so that I know the game's participation level.

#### Acceptance Criteria

1. THE Quiz_Application SHALL count the number of player nodes in Firebase
2. THE Quiz_Application SHALL display the total number of connected players
3. WHEN a player joins or disconnects, THE Quiz_Application SHALL update the player count in real-time

### Requirement 14: Bid Summary Display

**User Story:** As a player, I want to see what others bid, so that I can understand the risk distribution.

#### Acceptance Criteria

1. WHEN Game_Phase transitions from "bidding" to "question", THE Quiz_Application SHALL display a Bid_Summary
2. THE Bid_Summary SHALL show all player bids in aggregate or individual form
3. THE Bid_Summary SHALL remain visible during "question" and "results" phases

### Requirement 15: Results Phase Display

**User Story:** As a player, I want to see the correct answer and score changes, so that I can learn and track progress.

#### Acceptance Criteria

1. WHEN Game_Phase is "results", THE Quiz_Application SHALL reveal the Correct_Answer
2. WHEN Game_Phase is "results", THE Quiz_Application SHALL display each player's score change
3. WHEN Game_Phase is "results", THE Quiz_Application SHALL display whether each player answered correctly or incorrectly
4. THE Quiz_Application SHALL display results for 10 seconds before transitioning to the next round

### Requirement 16: Game Completion and Winner Display

**User Story:** As a player, I want to see who won after 10 rounds, so that the game has a satisfying conclusion.

#### Acceptance Criteria

1. WHEN Game_Phase is "finished", THE Quiz_Application SHALL display a winner celebration screen
2. THE Quiz_Application SHALL identify the Winner as the player with the highest Score
3. THE Quiz_Application SHALL display final rankings of all players
4. WHERE a player is Admin, THE Quiz_Application SHALL display a reset button on the winner screen

### Requirement 17: Game Reset Functionality

**User Story:** As an admin, I want to reset the game, so that I can start a new session with the same players.

#### Acceptance Criteria

1. WHERE a player is Admin, THE Quiz_Application SHALL provide a reset game control
2. WHEN Admin triggers reset, THE Quiz_Application SHALL set Game_Phase to "waiting"
3. WHEN Admin triggers reset, THE Quiz_Application SHALL set roundNumber to 0
4. WHEN Admin triggers reset, THE Quiz_Application SHALL clear Used_Topics
5. WHEN Admin triggers reset, THE Quiz_Application SHALL reset all player Scores to 5000
6. WHEN Admin triggers reset, THE Quiz_Application SHALL clear all round data

### Requirement 18: Responsive Design

**User Story:** As a player, I want the application to work on my device, so that I can play on mobile or desktop.

#### Acceptance Criteria

1. THE Quiz_Application SHALL display correctly on mobile phone screens
2. THE Quiz_Application SHALL display correctly on desktop screens
3. THE Quiz_Application SHALL use Flexbox or CSS Grid for layout
4. THE Quiz_Application SHALL display all essential elements: current round, current topic, countdown timer, player score, bid input, question and answers, leaderboard, phase indicator

### Requirement 19: Performance Optimization for 60 Players

**User Story:** As a player in a large game, I want smooth performance, so that the application remains responsive.

#### Acceptance Criteria

1. THE Quiz_Application SHALL prevent double bid submission by disabling inputs after submission
2. THE Quiz_Application SHALL prevent double answer submission by disabling inputs after submission
3. THE Quiz_Application SHALL avoid full UI re-renders on small Firebase updates
4. THE Quiz_Application SHALL avoid continuous database writes during normal operation
5. THE Quiz_Application SHALL handle up to 60 concurrent players with smooth performance
6. WHEN a player disconnects, THE Quiz_Application SHALL handle the disconnection gracefully without errors

### Requirement 20: Input Validation

**User Story:** As a player, I want clear feedback on invalid inputs, so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN a player submits a bid exceeding their Score, THE Quiz_Application SHALL display an error message
2. WHEN a player submits a bid of zero or negative value, THE Quiz_Application SHALL display an error message
3. WHEN a player submits a duplicate name, THE Quiz_Application SHALL display an error message
4. THE Quiz_Application SHALL validate all user inputs before writing to Firebase

### Requirement 21: Loading and Connection States

**User Story:** As a player, I want to know when the application is connecting, so that I don't interact prematurely.

#### Acceptance Criteria

1. WHILE Firebase_Client is connecting, THE Quiz_Application SHALL display a loading state
2. WHEN Firebase_Client connection fails, THE Quiz_Application SHALL display an error message
3. WHEN Firebase_Client successfully connects, THE Quiz_Application SHALL hide the loading state and display the join interface

### Requirement 22: Phase Transition Smoothness

**User Story:** As a player, I want smooth transitions between phases, so that the experience feels polished.

#### Acceptance Criteria

1. WHEN Game_Phase changes, THE Quiz_Application SHALL apply CSS transitions to UI elements
2. THE Quiz_Application SHALL provide visual feedback during phase transitions
3. THE Quiz_Application SHALL complete phase transitions within 500 milliseconds

### Requirement 23: Optional Sound Effects

**User Story:** As a player, I want to toggle sound effects, so that I can control audio based on my environment.

#### Acceptance Criteria

1. THE Quiz_Application SHALL provide a sound effects toggle control
2. WHERE sound effects are enabled, THE Quiz_Application SHALL play audio on key events (wheel spin, correct answer, wrong answer, phase transitions)
3. WHERE sound effects are disabled, THE Quiz_Application SHALL not play any audio
4. THE Quiz_Application SHALL persist the sound preference in browser local storage

### Requirement 24: Modular Code Architecture

**User Story:** As a developer, I want modular code organization, so that the codebase is maintainable.

#### Acceptance Criteria

1. THE Quiz_Application SHALL organize code into files: firebase-config.js, game-state.js, player.js, ui.js, wheel.js, timer.js
2. THE Quiz_Application SHALL separate logic by responsibility: Firebase configuration, game state management, player management, UI rendering, wheel animation, timer logic
3. THE Quiz_Application SHALL use ES Modules for code organization
4. THE Quiz_Application SHALL include comments explaining complex logic

### Requirement 25: Question Data Structure

**User Story:** As a developer, I want questions stored in structured JSON, so that they are easy to manage and extend.

#### Acceptance Criteria

1. THE Quiz_Application SHALL store questions in a JSON object with fields: topic, question, choices, correctAnswer
2. THE Quiz_Application SHALL associate each Topic with exactly one Question
3. THE Quiz_Application SHALL define 10 unique topics with corresponding questions
4. THE Quiz_Application SHALL validate that each Question has at least 2 choices and exactly one Correct_Answer

### Requirement 26: Error Handling UI

**User Story:** As a player, I want clear error messages, so that I can understand and resolve issues.

#### Acceptance Criteria

1. WHEN a Firebase operation fails, THE Quiz_Application SHALL display a user-friendly error message
2. WHEN a validation error occurs, THE Quiz_Application SHALL display the specific validation failure reason
3. THE Quiz_Application SHALL display errors in a consistent UI component (toast, modal, or inline message)
4. THE Quiz_Application SHALL automatically dismiss error messages after 5 seconds or allow manual dismissal

### Requirement 27: Phase Indicator Display

**User Story:** As a player, I want to see the current phase, so that I know what action is expected.

#### Acceptance Criteria

1. THE Quiz_Application SHALL display the current Game_Phase name to all players
2. THE Quiz_Application SHALL update the phase indicator in real-time when Game_Phase changes
3. THE Quiz_Application SHALL use distinct visual styling for each Game_Phase
4. THE Quiz_Application SHALL display phase-specific instructions (e.g., "Place your bid", "Answer the question")

### Requirement 28: Disconnect Handling

**User Story:** As a player, I want the game to continue if someone disconnects, so that one player's connection issue doesn't disrupt everyone.

#### Acceptance Criteria

1. WHEN a player disconnects, THE Quiz_Application SHALL retain the player's data in Firebase
2. WHEN a player disconnects, THE Quiz_Application SHALL continue game progression for remaining players
3. WHEN a disconnected player reconnects, THE Quiz_Application SHALL restore their session using their Player_ID
4. THE Quiz_Application SHALL not require all players to submit bids or answers before phase transitions

### Requirement 29: Firebase Security Considerations

**User Story:** As a developer, I want to document security limitations, so that users understand the trust model.

#### Acceptance Criteria

1. THE Quiz_Application documentation SHALL state that Firebase security rules must be configured separately
2. THE Quiz_Application documentation SHALL note that client-side validation can be bypassed
3. THE Quiz_Application documentation SHALL recommend using Firebase security rules to prevent cheating
4. THE Quiz_Application SHALL implement client-side validation as a user experience enhancement, not a security measure
