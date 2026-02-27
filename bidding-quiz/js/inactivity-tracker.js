/**
 * Inactivity Tracker Module
 * 
 * This module monitors room activity and triggers automatic termination
 * for rooms that have been inactive for more than 10 minutes.
 * 
 * Exports:
 * - InactivityTracker: Class for monitoring room inactivity
 */

import { db } from './firebase-config.js';
import { ref, get, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

/**
 * InactivityTracker class for monitoring room inactivity
 */
export class InactivityTracker {
  /**
   * Create a new InactivityTracker instance
   * @param {Object} roomManager - RoomManager instance to call terminateRoom on
   */
  constructor(roomManager) {
    this.roomManager = roomManager;
    this.checkInterval = 60000; // 60 seconds
    this.inactivityThreshold = 600000; // 10 minutes (600,000 milliseconds)
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Start monitoring for inactive rooms
   * Sets up interval to check all rooms every 60 seconds
   */
  start() {
    if (this.isRunning) {
      console.warn('InactivityTracker is already running');
      return;
    }

    console.log('Starting InactivityTracker...');
    this.isRunning = true;

    // Run initial check immediately
    this.checkInactiveRooms();

    // Set up interval for periodic checks
    this.intervalId = setInterval(() => {
      this.checkInactiveRooms();
    }, this.checkInterval);

    console.log(`InactivityTracker started (checking every ${this.checkInterval / 1000}s)`);
  }

  /**
   * Stop monitoring
   * Clears the interval timer
   */
  stop() {
    if (!this.isRunning) {
      console.warn('InactivityTracker is not running');
      return;
    }

    console.log('Stopping InactivityTracker...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('InactivityTracker stopped');
  }

  /**
   * Check all active rooms for inactivity
   * Queries Firebase for rooms with status 'active' and checks their lastActivityAt timestamp
   * @returns {Promise<void>}
   */
  async checkInactiveRooms() {
    try {
      const currentTime = Date.now();
      
      // Get all rooms
      const roomsRef = ref(db, 'rooms');
      const snapshot = await get(roomsRef);

      if (!snapshot.exists()) {
        // No rooms exist
        return;
      }

      const rooms = snapshot.val();
      const roomIds = Object.keys(rooms);

      console.log(`Checking ${roomIds.length} rooms for inactivity...`);

      // Check each room
      for (const roomId of roomIds) {
        const room = rooms[roomId];

        // Skip if room is not active
        if (room.status !== 'active') {
          continue;
        }

        // Check if room has lastActivityAt timestamp
        if (!room.lastActivityAt) {
          console.warn(`Room ${roomId} has no lastActivityAt timestamp`);
          continue;
        }

        // Calculate inactivity duration
        const inactivityDuration = currentTime - room.lastActivityAt;

        // Check if room exceeds inactivity threshold
        if (inactivityDuration > this.inactivityThreshold) {
          const inactivityMinutes = Math.floor(inactivityDuration / 60000);
          console.log(`Room ${roomId} (${room.roomCode}) inactive for ${inactivityMinutes} minutes - triggering termination`);

          // Trigger room termination
          await this.roomManager.terminateRoom(roomId, `Inactivity timeout (${inactivityMinutes} minutes)`);
        }
      }
    } catch (error) {
      console.error('Error checking inactive rooms:', error);
      // Don't throw - continue monitoring on next interval
    }
  }

  /**
   * Get the inactivity threshold in milliseconds
   * @returns {number} Inactivity threshold
   */
  getInactivityThreshold() {
    return this.inactivityThreshold;
  }

  /**
   * Get the check interval in milliseconds
   * @returns {number} Check interval
   */
  getCheckInterval() {
    return this.checkInterval;
  }

  /**
   * Check if tracker is currently running
   * @returns {boolean} True if running, false otherwise
   */
  isActive() {
    return this.isRunning;
  }
}
