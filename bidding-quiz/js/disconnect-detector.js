/**
 * Disconnect Detector Module
 * 
 * This module monitors presence changes and triggers player removal and room termination.
 * It listens to Firebase presence changes, detects when players go offline, removes
 * disconnected players from the game, monitors player count, and triggers room termination
 * when all players have left.
 * 
 * Exports:
 * - DisconnectDetector: Class for monitoring disconnects
 */

import { db } from './firebase-config.js';
import { ref, onValue, get, off } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

/**
 * DisconnectDetector class for monitoring player disconnects
 */
export class DisconnectDetector {
  /**
   * Create a new DisconnectDetector instance
   * @param {Database} database - Firebase database reference
   * @param {PlayerManager} playerManager - Player manager instance
   * @param {RoomManager} roomManager - Room manager instance
   */
  constructor(database = db, playerManager = null, roomManager = null) {
    this.db = database;
    this.playerManager = playerManager;
    this.roomManager = roomManager;
    this.notifier = null;
    
    this.presenceListeners = new Map(); // Map<roomId, unsubscribe function>
    this.staleCheckIntervals = new Map(); // Map<roomId, intervalId>
    
    this.STALE_THRESHOLD = 90000; // 90 seconds
    this.STALE_CHECK_INTERVAL = 60000; // 60 seconds
  }

  /**
   * Set the notifier for UI notifications
   * @param {DisconnectNotifier} notifier - Notifier instance
   */
  setNotifier(notifier) {
    this.notifier = notifier;
  }

  /**
   * Start monitoring disconnects for a room
   * Sets up Firebase listeners and stale connection checks
   * @param {string} roomId - Room identifier
   * @returns {void}
   */
  startMonitoring(roomId) {
    // Validate input
    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
      console.warn('Invalid roomId in startMonitoring');
      return;
    }

    // Don't start if already monitoring
    if (this.presenceListeners.has(roomId)) {
      console.log(`Already monitoring room ${roomId}`);
      return;
    }

    console.log(`Starting disconnect monitoring for room ${roomId}`);

    // Set up Firebase listener for presence changes
    const presencePath = `presence/${roomId}`;
    const presenceRef = ref(this.db, presencePath);
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const presenceData = snapshot.val();
        
        // Check each player's presence
        Object.entries(presenceData).forEach(([playerId, presence]) => {
          // If player went offline, handle disconnect
          if (presence.online === false) {
            this.handleDisconnect(playerId, roomId);
          }
        });
      }
    });

    // Store unsubscribe function
    this.presenceListeners.set(roomId, unsubscribe);

    // Start stale connection check interval
    const intervalId = setInterval(() => {
      this.checkStaleConnections(roomId);
    }, this.STALE_CHECK_INTERVAL);

    this.staleCheckIntervals.set(roomId, intervalId);
  }

  /**
   * Stop monitoring disconnects for a room
   * Removes Firebase listeners and clears intervals
   * @param {string} roomId - Room identifier
   * @returns {void}
   */
  stopMonitoring(roomId) {
    // Validate input
    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
      console.warn('Invalid roomId in stopMonitoring');
      return;
    }

    console.log(`Stopping disconnect monitoring for room ${roomId}`);

    // Remove Firebase listener
    const unsubscribe = this.presenceListeners.get(roomId);
    if (unsubscribe) {
      // Call unsubscribe function to remove listener
      unsubscribe();
      this.presenceListeners.delete(roomId);
    }

    // Clear stale check interval
    const intervalId = this.staleCheckIntervals.get(roomId);
    if (intervalId) {
      clearInterval(intervalId);
      this.staleCheckIntervals.delete(roomId);
    }
  }

  /**
   * Handle a player disconnect event
   * Removes player from game, cleans up presence, and checks player count
   * @param {string} playerId - Player identifier
   * @param {string} roomId - Room identifier
   * @returns {Promise<void>}
   */
  async handleDisconnect(playerId, roomId) {
    try {
      console.log(`Handling disconnect for player ${playerId} in room ${roomId}`);

      // Get player info before removal
      const playerRef = ref(this.db, `rooms/${roomId}/players/${playerId}`);
      const playerSnapshot = await get(playerRef);

      if (!playerSnapshot.exists()) {
        console.log(`Player ${playerId} already removed from room ${roomId}`);
        return;
      }

      const playerData = playerSnapshot.val();
      const playerName = playerData.name;

      // Remove player from game via PlayerManager
      if (this.playerManager) {
        try {
          await this.playerManager.removePlayer(playerId, roomId);
        } catch (error) {
          console.error(`Error removing player ${playerId}:`, error);
          // Continue with presence cleanup even if removal fails
        }
      }

      // Show notification
      if (this.notifier) {
        this.notifier.notifyPlayerDisconnected(playerName);
      }

      // Check remaining player count
      const activeCount = await this.getActivePlayerCount(roomId);

      if (activeCount === 0) {
        console.log(`No players left in room ${roomId}, terminating room`);
        
        // Show termination notification
        if (this.notifier) {
          this.notifier.notifyRoomTerminating();
        }

        // Trigger room termination
        if (this.roomManager) {
          try {
            await this.roomManager.terminateRoom(roomId, 'All players disconnected');
          } catch (error) {
            console.error(`Error terminating room ${roomId}:`, error);
            // Log but don't throw - room will be cleaned up by inactivity tracker
          }
        }
      }
    } catch (error) {
      console.error(`Error handling disconnect for player ${playerId}:`, error);
      // Don't throw - allow other disconnects to be processed
    }
  }

  /**
   * Check for stale connections (heartbeat timeout)
   * Detects players with lastSeen > 90 seconds ago
   * @param {string} roomId - Room identifier
   * @returns {Promise<void>}
   */
  async checkStaleConnections(roomId) {
    try {
      const currentTime = Date.now();

      // Get all presence records for room
      const presencePath = `presence/${roomId}`;
      const presenceRef = ref(this.db, presencePath);
      const snapshot = await get(presenceRef);

      if (!snapshot.exists()) {
        // No players in room
        return;
      }

      const presenceRecords = snapshot.val();

      // Check each player for stale connection
      for (const [playerId, presence] of Object.entries(presenceRecords)) {
        const timeSinceLastSeen = currentTime - presence.lastSeen;

        // Check if connection is stale
        if (presence.online === true && timeSinceLastSeen > this.STALE_THRESHOLD) {
          console.log(`Stale connection detected for player ${playerId} (${timeSinceLastSeen}ms since last seen)`);
          
          // Show unstable connection notification
          if (this.notifier) {
            this.notifier.notifyConnectionUnstable(presence.playerName);
          }

          // Treat as disconnect
          await this.handleDisconnect(playerId, roomId);
        }
      }
    } catch (error) {
      console.error(`Error checking stale connections for room ${roomId}:`, error);
      // Don't throw - allow next check to proceed
    }
  }

  /**
   * Get count of active players in room (excludes spectators)
   * @param {string} roomId - Room identifier
   * @returns {Promise<number>}
   */
  async getActivePlayerCount(roomId) {
    try {
      // Validate input
      if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
        return 0;
      }

      // Get all players in room
      const playersRef = ref(this.db, `rooms/${roomId}/players`);
      const playersSnapshot = await get(playersRef);

      if (!playersSnapshot.exists()) {
        return 0;
      }

      const players = playersSnapshot.val();

      // Get spectators
      const spectatorsRef = ref(this.db, `rooms/${roomId}/spectators`);
      const spectatorsSnapshot = await get(spectatorsRef);

      const spectatorIds = new Set();
      if (spectatorsSnapshot.exists()) {
        const spectators = spectatorsSnapshot.val();
        Object.keys(spectators).forEach(id => spectatorIds.add(id));
      }

      // Count players excluding spectators
      let activeCount = 0;
      for (const playerId of Object.keys(players)) {
        if (!spectatorIds.has(playerId)) {
          activeCount++;
        }
      }

      return activeCount;
    } catch (error) {
      console.error(`Error getting active player count for room ${roomId}:`, error);
      return 0;
    }
  }
}
