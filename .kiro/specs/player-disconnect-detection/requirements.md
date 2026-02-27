# Requirements Document: Player Disconnect Detection

## Introduction

This document specifies the requirements for real-time player disconnect detection in the bidding quiz application. The system must automatically detect when players disconnect (browser close, internet loss, navigation away), remove them from active games, and terminate game sessions when all players have left. The system provides UI notifications for disconnect events and integrates with the existing room management infrastructure.

## Glossary

- **PresenceTracker**: Component that manages player online/offline status in Firebase
- **DisconnectDetector**: Component that monitors presence changes and triggers player removal
- **DisconnectNotifier**: Component that displays UI notifications for disconnect events
- **Player**: Active participant in a game (excludes spectators)
- **Spectator**: Observer who can view but not participate in a game
- **Heartbeat**: Periodic timestamp update indicating player is still connected
- **Stale_Connection**: Connection where heartbeat has not updated within threshold period
- **Active_Player_Count**: Number of non-spectator players currently in a room
- **Presence_Data**: Firebase record containing player online status and timestamps
- **Disconnect_Hook**: Firebase onDisconnect() callback that executes when connection is lost

## Requirements

### Requirement 1: Player Presence Registration

**User Story:** As a player, I want my connection status to be tracked when I join a room, so that the system knows when I'm online or offline.

#### Acceptance Criteria

1. WHEN a player joins a room, THE PresenceTracker SHALL create presence data with online status, lastSeen timestamp, connectedAt timestamp, playerId, and playerName
2. WHEN a player joins a room, THE PresenceTracker SHALL register Firebase onDisconnect hooks to mark the player offline when connection is lost
3. WHEN a player joins a room, THE PresenceTracker SHALL start a heartbeat timer that updates the lastSeen timestamp every 30 seconds
4. WHEN presence registration completes, THE PresenceTracker SHALL store the presence data at path presence/{roomId}/{playerId}
5. IF presence registration fails due to network error, THEN THE PresenceTracker SHALL return an error object and not start the heartbeat timer

### Requirement 2: Automatic Disconnect Detection

**User Story:** As a player, I want to be automatically removed from the game when I disconnect, so that the game can continue without waiting for me.

#### Acceptance Criteria

1. WHEN a player's connection is lost, THE Firebase onDisconnect hook SHALL update the player's presence to mark online as false and update lastSeen timestamp
2. WHEN a player's presence changes to offline, THE DisconnectDetector SHALL remove the player from the game via PlayerManager
3. WHEN a player is removed due to disconnect, THE DisconnectDetector SHALL delete the presence data at presence/{roomId}/{playerId}
4. WHEN a player is removed due to disconnect, THE DisconnectDetector SHALL stop the heartbeat timer for that player
5. WHEN a player disconnects, THE DisconnectNotifier SHALL display a notification showing the player's name and disconnect status

### Requirement 3: Stale Connection Detection

**User Story:** As a system administrator, I want connections that stop sending heartbeats to be detected and removed, so that ghost players don't remain in games.

#### Acceptance Criteria

1. THE DisconnectDetector SHALL check for stale connections every 60 seconds for each monitored room
2. WHEN checking for stale connections, THE DisconnectDetector SHALL query all presence records for the room
3. WHEN a player's lastSeen timestamp is more than 90 seconds old and online status is true, THE DisconnectDetector SHALL treat it as a disconnect and trigger handleDisconnect
4. WHEN a stale connection is detected, THE DisconnectNotifier SHALL display a connection unstable notification
5. IF no presence records exist for a room, THEN THE stale connection check SHALL complete without errors

### Requirement 4: Room Termination on Empty

**User Story:** As a system administrator, I want game rooms to automatically terminate when all players leave, so that resources are freed and room codes can be reused.

#### Acceptance Criteria

1. WHEN a player is removed from a room, THE DisconnectDetector SHALL query the active player count for that room
2. WHEN calculating active player count, THE DisconnectDetector SHALL exclude spectators from the count
3. WHEN the active player count reaches zero, THE DisconnectDetector SHALL trigger room termination via RoomManager with reason "All players disconnected"
4. WHEN room termination is triggered, THE DisconnectNotifier SHALL display a room terminating notification
5. IF room termination fails, THEN THE error SHALL be logged and the room SHALL remain active for inactivity tracker cleanup

### Requirement 5: Manual Player Disconnect

**User Story:** As a player, I want to manually leave a room, so that I can exit gracefully without waiting for timeout.

#### Acceptance Criteria

1. WHEN a player manually leaves a room, THE PresenceTracker SHALL remove the presence data at presence/{roomId}/{playerId}
2. WHEN a player manually leaves a room, THE PresenceTracker SHALL stop the heartbeat timer for that player
3. WHEN a player manually leaves a room, THE PresenceTracker SHALL cancel the Firebase onDisconnect hooks for that player
4. WHEN manual disconnect completes, THE presence data SHALL no longer exist in Firebase
5. WHEN manual disconnect is called for a non-existent player, THE PresenceTracker SHALL complete without errors

### Requirement 6: Heartbeat Updates

**User Story:** As a connected player, I want my connection status to be continuously updated, so that the system knows I'm still active.

#### Acceptance Criteria

1. WHEN a heartbeat timer fires, THE PresenceTracker SHALL update the lastSeen timestamp at presence/{roomId}/{playerId}/lastSeen to the current time
2. THE heartbeat timer SHALL fire every 30 seconds for each registered player
3. IF a heartbeat update fails due to network error, THEN THE error SHALL be logged and the heartbeat timer SHALL continue running
4. WHEN a player is unregistered, THE heartbeat timer SHALL be cleared and no further updates SHALL occur
5. WHILE a player is registered, THE lastSeen timestamp SHALL be updated at least once every 30 seconds

### Requirement 7: Presence Status Queries

**User Story:** As a developer, I want to query whether a player is currently online, so that I can make decisions based on connection status.

#### Acceptance Criteria

1. WHEN querying if a player is online, THE PresenceTracker SHALL read the presence data at presence/{roomId}/{playerId}
2. WHEN presence data exists with online equals true, THE PresenceTracker SHALL return true
3. WHEN presence data exists with online equals false, THE PresenceTracker SHALL return false
4. WHEN presence data does not exist, THE PresenceTracker SHALL return false
5. THE isPlayerOnline query SHALL complete within 200 milliseconds under normal network conditions

### Requirement 8: Disconnect Monitoring Lifecycle

**User Story:** As a room host, I want disconnect monitoring to start when the room is created and stop when the room ends, so that resources are properly managed.

#### Acceptance Criteria

1. WHEN startMonitoring is called for a room, THE DisconnectDetector SHALL create a Firebase listener for presence changes at presence/{roomId}
2. WHEN startMonitoring is called for a room, THE DisconnectDetector SHALL start a stale connection check interval that runs every 60 seconds
3. WHEN stopMonitoring is called for a room, THE DisconnectDetector SHALL remove the Firebase listener for that room
4. WHEN stopMonitoring is called for a room, THE DisconnectDetector SHALL clear the stale connection check interval
5. WHEN stopMonitoring is called for a room that is not being monitored, THE DisconnectDetector SHALL complete without errors

### Requirement 9: UI Notifications

**User Story:** As a player, I want to see notifications when other players disconnect, so that I understand what's happening in the game.

#### Acceptance Criteria

1. WHEN a player disconnects, THE DisconnectNotifier SHALL display a toast notification containing the player's name
2. WHEN a room is terminating due to all players leaving, THE DisconnectNotifier SHALL display a room terminating notification
3. WHEN a connection is detected as unstable, THE DisconnectNotifier SHALL display a connection unstable warning with the player's name
4. THE notifications SHALL be displayed using the existing notification system
5. THE notifications SHALL automatically dismiss after a reasonable timeout period

### Requirement 10: Data Consistency

**User Story:** As a developer, I want presence data to remain consistent with player data, so that the system state is always accurate.

#### Acceptance Criteria

1. WHEN a player exists in rooms/{roomId}/players/{playerId}, THE presence data SHALL exist at presence/{roomId}/{playerId}
2. WHEN a player is removed from rooms/{roomId}/players/{playerId}, THE presence data SHALL be removed from presence/{roomId}/{playerId}
3. WHEN presence data exists for a player, THE playerId and playerName fields SHALL match the player data in the room
4. WHEN presence data is created, THE online field SHALL be boolean, lastSeen SHALL be a valid timestamp greater than zero, and connectedAt SHALL be a valid timestamp greater than zero
5. WHEN a player reconnects after disconnect, THE new presence data SHALL replace any stale presence data

### Requirement 11: Error Handling and Recovery

**User Story:** As a system administrator, I want the disconnect detection system to handle errors gracefully, so that temporary issues don't break the game.

#### Acceptance Criteria

1. WHEN Firebase connection is lost during presence registration, THE PresenceTracker SHALL return an error object with success false and error code CONNECTION_ERROR
2. WHEN player removal fails during disconnect handling, THE DisconnectDetector SHALL log the error and continue with presence cleanup
3. WHEN room termination fails, THE error SHALL be logged and the room SHALL remain active for fallback cleanup mechanisms
4. WHEN multiple heartbeat updates fail consecutively, THE stale connection detector SHALL eventually detect and handle the disconnect
5. WHEN multiple players disconnect simultaneously, THE DisconnectDetector SHALL handle each disconnect independently without race conditions

### Requirement 12: Performance Requirements

**User Story:** As a player, I want disconnect detection to be fast and efficient, so that it doesn't impact game performance.

#### Acceptance Criteria

1. THE presence registration operation SHALL complete within 200 milliseconds under normal network conditions
2. THE disconnect detection SHALL trigger player removal within 5 seconds of connection loss
3. THE heartbeat update operation SHALL complete within 50 milliseconds under normal network conditions
4. WHEN checking stale connections for a room with 10 players, THE operation SHALL complete within 500 milliseconds
5. THE room termination trigger SHALL complete within 1 second of the last player disconnect

### Requirement 13: Spectator Handling

**User Story:** As a spectator, I want my disconnect to be handled without affecting the game, so that players can continue even if I leave.

#### Acceptance Criteria

1. WHEN calculating active player count, THE DisconnectDetector SHALL exclude players with spectator status from the count
2. WHEN all regular players disconnect but spectators remain, THE room SHALL be terminated
3. WHEN a spectator disconnects, THE presence data SHALL be removed but room termination SHALL not be triggered based on spectator count
4. WHEN querying active player count, THE result SHALL equal the total player count minus the spectator count
5. THE spectator status SHALL be determined by checking the player's role in rooms/{roomId}/players/{playerId}

### Requirement 14: Integration with Existing Systems

**User Story:** As a developer, I want disconnect detection to integrate seamlessly with existing room and player management, so that the codebase remains maintainable.

#### Acceptance Criteria

1. WHEN PlayerManager adds a player, THE PresenceTracker SHALL be called to register the player's presence
2. WHEN PlayerManager removes a player, THE PresenceTracker SHALL be called to unregister the player's presence
3. WHEN DisconnectDetector needs to remove a player, THE DisconnectDetector SHALL call PlayerManager.removePlayer
4. WHEN DisconnectDetector needs to terminate a room, THE DisconnectDetector SHALL call RoomManager.terminateRoom
5. THE disconnect detection components SHALL use the existing Firebase database reference from firebase-config.js
