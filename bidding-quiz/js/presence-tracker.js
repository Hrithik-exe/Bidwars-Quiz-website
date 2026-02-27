/**
 * Presence Tracker Module
 * 
 * This module manages player presence state in Firebase and sets up disconnect hooks.
 * It tracks when players are online/offline, manages heartbeat updates, and handles
 * automatic disconnect detection using Firebase's onDisconnect() API.
 * 
 * Exports:
 * - PresenceTracker: Class for managing player presence
 */

import { db } from './firebase-config.js';
import { ref, set, update, get, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

/**
 * PresenceTracker class for managing player presence in Firebase
 */
export class PresenceTracker {
  /**
   * Create a new PresenceTracker instance
   * @param {Database} database - Firebase database reference
   */
  constructor(database = db) {
    this.db = database;
    this.heartbeatIntervals = new Map(); // Map<playerId, intervalId>
    this.HEARTBEAT_INTERVAL = 30000; // 30 seconds
  }

  /**
   * Register a player's presence in the room
   * Sets up onDisconnect hooks and starts heartbeat
   * @param {string} playerId - Player identifier
   * @param {string} roomId - Room identifier
   * @returns {Promise<{success: boolean, error?: string, errorCode?: string}>}
   */
  async registerPlayer(playerId, roomId) {
    try {
      // Validate inputs
      if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
        return {
          success: false,
          error: 'Invalid playerId',
          errorCode: 'INVALID_INPUT'
        };
      }

      if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
        return {
          success: false,
          error: 'Invalid roomId',
          errorCode: 'INVALID_INPUT'
        };
      }

      // Get player name from room data
      const playerRef = ref(this.db, `rooms/${roomId}/players/${playerId}`);
      const playerSnapshot = await get(playerRef);

      if (!playerSnapshot.exists()) {
        return {
          success: false,
          error: 'Player not found in room',
          errorCode: 'PLAYER_NOT_FOUND'
        };
      }

      const playerData = playerSnapshot.val();
      const playerName = playerData.name;

      const currentTime = Date.now();

      // Create presence data
      const presenceData = {
        online: true,
        lastSeen: currentTime,
        connectedAt: currentTime,
        playerId: playerId,
        playerName: playerName
      };

      // Write presence data to Firebase
      const presencePath = `presence/${roomId}/${playerId}`;
      const presenceRef = ref(this.db, presencePath);
      await set(presenceRef, presenceData);

      // Set up onDisconnect hooks
      const disconnectRef = ref(this.db, presencePath);
      
      // Hook: Update online status and lastSeen when disconnected
      await onDisconnect(disconnectRef).update({
        online: false,
        lastSeen: serverTimestamp()
      });

      // Start heartbeat
      this.startHeartbeat(playerId, roomId);

      console.log(`Presence registered for player ${playerId} in room ${roomId}`);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error registering player presence:', error);
      
      return {
        success: false,
        error: 'Failed to register presence',
        errorCode: 'CONNECTION_ERROR'
      };
    }
  }

  /**
   * Unregister a player's presence (manual disconnect)
   * Removes presence data and cancels disconnect hooks
   * @param {string} playerId - Player identifier
   * @param {string} roomId - Room identifier
   * @returns {Promise<void>}
   */
  async unregisterPlayer(playerId, roomId) {
    try {
      // Validate inputs
      if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
        console.warn('Invalid playerId in unregisterPlayer');
        return;
      }

      if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
        console.warn('Invalid roomId in unregisterPlayer');
        return;
      }

      // Stop heartbeat
      this.stopHeartbeat(playerId);

      // Cancel onDisconnect hooks
      const presencePath = `presence/${roomId}/${playerId}`;
      const presenceRef = ref(this.db, presencePath);
      await onDisconnect(presenceRef).cancel();

      // Remove presence data
      await set(presenceRef, null);

      console.log(`Presence unregistered for player ${playerId} in room ${roomId}`);
    } catch (error) {
      console.error('Error unregistering player presence:', error);
      // Don't throw - allow cleanup to continue
    }
  }

  /**
   * Start heartbeat updates for a player
   * Updates lastSeen timestamp every 30 seconds
   * @param {string} playerId - Player identifier
   * @param {string} roomId - Room identifier
   * @returns {void}
   */
  startHeartbeat(playerId, roomId) {
    // Validate inputs
    if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
      console.warn('Invalid playerId in startHeartbeat');
      return;
    }

    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
      console.warn('Invalid roomId in startHeartbeat');
      return;
    }

    // Stop existing heartbeat if any
    this.stopHeartbeat(playerId);

    // Create interval for heartbeat updates
    const intervalId = setInterval(async () => {
      try {
        const currentTime = Date.now();
        const lastSeenPath = `presence/${roomId}/${playerId}/lastSeen`;
        const lastSeenRef = ref(this.db, lastSeenPath);
        await set(lastSeenRef, currentTime);
      } catch (error) {
        console.error(`Error updating heartbeat for player ${playerId}:`, error);
        // Don't stop the interval - continue trying
      }
    }, this.HEARTBEAT_INTERVAL);

    // Store interval ID
    this.heartbeatIntervals.set(playerId, intervalId);

    console.log(`Heartbeat started for player ${playerId}`);
  }

  /**
   * Stop heartbeat updates for a player
   * Clears the interval timer
   * @param {string} playerId - Player identifier
   * @returns {void}
   */
  stopHeartbeat(playerId) {
    const intervalId = this.heartbeatIntervals.get(playerId);
    
    if (intervalId) {
      clearInterval(intervalId);
      this.heartbeatIntervals.delete(playerId);
      console.log(`Heartbeat stopped for player ${playerId}`);
    }
  }

  /**
   * Check if a player is currently online
   * Queries presence data from Firebase
   * @param {string} playerId - Player identifier
   * @param {string} roomId - Room identifier
   * @returns {Promise<boolean>}
   */
  async isPlayerOnline(playerId, roomId) {
    try {
      // Validate inputs
      if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
        return false;
      }

      if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
        return false;
      }

      // Query presence data
      const presencePath = `presence/${roomId}/${playerId}`;
      const presenceRef = ref(this.db, presencePath);
      const snapshot = await get(presenceRef);

      if (!snapshot.exists()) {
        return false;
      }

      const presenceData = snapshot.val();
      return presenceData.online === true;
    } catch (error) {
      console.error('Error checking player online status:', error);
      return false;
    }
  }
}
