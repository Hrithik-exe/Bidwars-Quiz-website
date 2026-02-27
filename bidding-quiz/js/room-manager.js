/**
 * Room Manager Module
 * 
 * This module manages game rooms, including creation, joining, termination,
 * and activity tracking. Integrates with RoomCodeGenerator for unique codes
 * and InactivityTracker for automatic cleanup.
 * 
 * Exports:
 * - RoomManager: Class for managing game rooms
 */

import { db } from './firebase-config.js';
import { ref, set, update, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { RoomCodeGenerator } from './room-code-generator.js';
import { InactivityTracker } from './inactivity-tracker.js';

/**
 * Error codes for room operations
 */
export const ERROR_CODES = {
  INVALID_FORMAT: 'INVALID_FORMAT',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_TERMINATING: 'ROOM_TERMINATING',
  ROOM_FULL: 'ROOM_FULL',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  GENERATION_FAILED: 'GENERATION_FAILED',
  CLEANUP_FAILED: 'CLEANUP_FAILED'
};

/**
 * RoomManager class for managing game rooms
 */
export class RoomManager {
  /**
   * Create a new RoomManager instance
   */
  constructor() {
    this.codeGenerator = new RoomCodeGenerator();
    this.inactivityTracker = new InactivityTracker(this);
    this.maxRetries = 3;
  }

  /**
   * Create a new game room
   * Generates unique room code and initializes room in Firebase
   * @returns {Promise<{success: boolean, roomCode?: string, roomId?: string, error?: string, errorCode?: string}>}
   */
  async createRoom() {
    try {
      // Generate unique room code
      const roomCode = await this.codeGenerator.generate();
      
      // Generate room ID (UUID)
      const roomId = this._generateRoomId();
      
      // Initialize room data
      const roomData = {
        roomCode: roomCode,
        status: 'active',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        phase: 'waiting',
        roundNumber: 0,
        phaseStartTime: null,
        currentTopic: null,
        usedTopics: []
      };
      
      // Write room data to Firebase
      const updates = {};
      updates[`rooms/${roomId}`] = roomData;
      updates[`roomCodes/${roomCode}`] = roomId;
      
      await update(ref(db), updates);
      
      console.log(`Room created: ${roomCode} (${roomId})`);
      
      return {
        success: true,
        roomCode: roomCode,
        roomId: roomId
      };
    } catch (error) {
      console.error('Error creating room:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to create room',
        errorCode: error.message.includes('unique') ? ERROR_CODES.GENERATION_FAILED : ERROR_CODES.CONNECTION_ERROR,
        retryable: true
      };
    }
  }

  /**
   * Get room information by room code
   * @param {string} roomCode - 6-character room code
   * @returns {Promise<{exists: boolean, roomId?: string, status?: string, error?: string, errorCode?: string}>}
   */
  async getRoomInfo(roomCode) {
    try {
      // Validate room code format
      if (!this.codeGenerator.validate(roomCode)) {
        return {
          exists: false,
          error: 'Invalid room code format. Code must be 6 characters (A-Z, 2-9, excluding 0, O, 1, I, L)',
          errorCode: ERROR_CODES.INVALID_FORMAT,
          retryable: false
        };
      }
      
      // Look up room ID from room code
      const roomCodeRef = ref(db, `roomCodes/${roomCode}`);
      const codeSnapshot = await get(roomCodeRef);
      
      if (!codeSnapshot.exists()) {
        return {
          exists: false,
          error: 'Room not found. Please check the code and try again.',
          errorCode: ERROR_CODES.ROOM_NOT_FOUND,
          retryable: false
        };
      }
      
      const roomId = codeSnapshot.val();
      
      // Get room data
      const roomRef = ref(db, `rooms/${roomId}`);
      const roomSnapshot = await get(roomRef);
      
      if (!roomSnapshot.exists()) {
        return {
          exists: false,
          error: 'Room data not found',
          errorCode: ERROR_CODES.ROOM_NOT_FOUND,
          retryable: false
        };
      }
      
      const roomData = roomSnapshot.val();
      
      return {
        exists: true,
        roomId: roomId,
        status: roomData.status,
        phase: roomData.phase,
        createdAt: roomData.createdAt,
        lastActivityAt: roomData.lastActivityAt
      };
    } catch (error) {
      console.error('Error getting room info:', error);
      
      return {
        exists: false,
        error: 'Failed to retrieve room information',
        errorCode: ERROR_CODES.CONNECTION_ERROR,
        retryable: true
      };
    }
  }

  /**
   * Update room activity timestamp
   * Writes current timestamp to rooms/{roomId}/lastActivityAt
   * @param {string} roomId - Room identifier
   * @returns {Promise<void>}
   */
  async updateActivity(roomId) {
    try {
      const activityRef = ref(db, `rooms/${roomId}/lastActivityAt`);
      await set(activityRef, Date.now());
    } catch (error) {
      console.error(`Error updating activity for room ${roomId}:`, error);
      // Don't throw - activity updates are non-critical
    }
  }

  /**
   * Generate a unique room ID using crypto.randomUUID() with fallback
   * @returns {string} Unique room ID
   * @private
   */
  _generateRoomId() {
    // Use crypto.randomUUID() if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback: Generate UUID v4 manually
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Join an existing room
   * @param {string} roomCode - 6-character room code
   * @param {string} playerName - Player's display name
   * @param {boolean} isAdmin - Whether player is admin (spectator mode)
   * @returns {Promise<{success: boolean, roomId?: string, playerId?: string, error?: string, errorCode?: string}>}
   */
  async joinRoom(roomCode, playerName, isAdmin = false) {
    try {
      // Validate room code format first (before database query)
      if (!this.codeGenerator.validate(roomCode)) {
        return {
          success: false,
          error: 'Invalid room code format. Code must be 6 characters (A-Z, 2-9, excluding 0, O, 1, I, L)',
          errorCode: ERROR_CODES.INVALID_FORMAT,
          retryable: false
        };
      }

      // Validate player name
      if (!playerName || playerName.trim().length === 0) {
        return {
          success: false,
          error: 'Player name cannot be empty',
          errorCode: ERROR_CODES.INVALID_FORMAT,
          retryable: false
        };
      }

      // Get room info
      const roomInfo = await this.getRoomInfo(roomCode);
      
      if (!roomInfo.exists) {
        return {
          success: false,
          error: roomInfo.error,
          errorCode: roomInfo.errorCode,
          retryable: roomInfo.retryable
        };
      }

      const roomId = roomInfo.roomId;
      const roomStatus = roomInfo.status;

      // Check if room is active (not terminating or terminated)
      if (roomStatus !== 'active') {
        return {
          success: false,
          error: 'Cannot join room. Room is no longer active.',
          errorCode: ERROR_CODES.ROOM_TERMINATING,
          retryable: false
        };
      }

      // If admin, add to spectators list
      if (isAdmin) {
        const userId = this._generateRoomId(); // Reuse UUID generator
        
        const spectatorData = {
          name: playerName.trim(),
          joinedAt: Date.now(),
          isAdmin: true
        };

        // Write spectator data
        const spectatorRef = ref(db, `rooms/${roomId}/spectators/${userId}`);
        await set(spectatorRef, spectatorData);

        // Update activity timestamp
        await this.updateActivity(roomId);

        console.log(`Admin ${playerName} joined room ${roomCode} as spectator`);

        return {
          success: true,
          roomId: roomId,
          playerId: userId // Return userId for spectators
        };
      }

      // For non-admin players, we need to integrate with PlayerManager
      // For now, return success with roomId and let the caller handle player creation
      // This will be fully integrated in later tasks
      
      // Update activity timestamp
      await this.updateActivity(roomId);

      return {
        success: true,
        roomId: roomId,
        playerId: null // Will be set by PlayerManager
      };
    } catch (error) {
      console.error('Error joining room:', error);
      
      return {
        success: false,
        error: 'Failed to join room. Please try again.',
        errorCode: ERROR_CODES.CONNECTION_ERROR,
        retryable: true
      };
    }
  }

  /**
   * Check if user is spectator
   * @param {string} roomId - Room identifier
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>}
   */
  async isSpectator(roomId, userId) {
    try {
      const spectatorRef = ref(db, `rooms/${roomId}/spectators/${userId}`);
      const snapshot = await get(spectatorRef);
      return snapshot.exists();
    } catch (error) {
      console.error('Error checking spectator status:', error);
      return false;
    }
  }

  /**
   * Mark room for termination and trigger cleanup
   * @param {string} roomId - Room identifier
   * @param {string} reason - Termination reason
   * @returns {Promise<void>}
   */
  async terminateRoom(roomId, reason) {
    try {
      console.log(`Terminating room ${roomId}: ${reason}`);

      // Get room data to check if it exists
      const roomRef = ref(db, `rooms/${roomId}`);
      const snapshot = await get(roomRef);
      
      if (!snapshot.exists()) {
        console.warn(`Room ${roomId} does not exist, skipping termination`);
        return;
      }

      const roomData = snapshot.val();
      
      // Check if room is already terminating or terminated
      if (roomData.status === 'terminating' || roomData.status === 'terminated') {
        console.log(`Room ${roomId} is already ${roomData.status}, skipping`);
        return;
      }

      // Set room status to 'terminating'
      const statusRef = ref(db, `rooms/${roomId}/status`);
      await set(statusRef, 'terminating');

      // Log termination event
      this._logTermination(roomId, reason);

      // Trigger cleanup with retry logic
      const cleanupResult = await this._retryCleanupWithBackoff(
        () => this._cleanupRoomData(roomId),
        0
      );

      if (cleanupResult.success) {
        // Set status to 'terminated' or remove room entirely
        await this._finalizeTermination(roomId);
        console.log(`Room ${roomId} terminated successfully`);
      } else {
        console.error(`Room ${roomId} cleanup failed after retries:`, cleanupResult.error);
      }
    } catch (error) {
      console.error(`Error terminating room ${roomId}:`, error);
    }
  }

  /**
   * Clean up room data (players, rounds, etc.)
   * @param {string} roomId - Room identifier
   * @returns {Promise<{success: boolean, error?: string}>}
   * @private
   */
  async _cleanupRoomData(roomId) {
    try {
      // Remove all room data
      const updates = {
        [`rooms/${roomId}/players`]: null,
        [`rooms/${roomId}/spectators`]: null,
        [`rooms/${roomId}/rounds`]: null,
        [`rooms/${roomId}/usedTopics`]: null,
        [`rooms/${roomId}/currentTopic`]: null,
        [`rooms/${roomId}/phaseStartTime`]: null
      };

      await update(ref(db), updates);

      console.log(`Cleaned up data for room ${roomId}`);
      return { success: true };
    } catch (error) {
      console.error(`Error cleaning up room ${roomId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Finalize room termination
   * Sets status to 'terminated' and removes room code mapping
   * @param {string} roomId - Room identifier
   * @returns {Promise<void>}
   * @private
   */
  async _finalizeTermination(roomId) {
    try {
      // Get room code to remove mapping
      const roomRef = ref(db, `rooms/${roomId}`);
      const snapshot = await get(roomRef);

      if (snapshot.exists()) {
        const roomData = snapshot.val();
        const roomCode = roomData.roomCode;

        // Remove room code mapping
        if (roomCode) {
          const roomCodeRef = ref(db, `roomCodes/${roomCode}`);
          await set(roomCodeRef, null);
        }

        // Set status to terminated
        const statusRef = ref(db, `rooms/${roomId}/status`);
        await set(statusRef, 'terminated');
      }
    } catch (error) {
      console.error(`Error finalizing termination for room ${roomId}:`, error);
    }
  }

  /**
   * Retry cleanup with exponential backoff
   * @param {Function} cleanupFn - Cleanup function to retry
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {Promise<any>}
   * @private
   */
  async _retryCleanupWithBackoff(cleanupFn, attempt = 0) {
    try {
      const result = await cleanupFn();

      if (result.success) {
        if (attempt > 0) {
          console.log(`Cleanup succeeded on retry attempt ${attempt + 1}`);
        }
        return result;
      }

      // If cleanup failed and we haven't exceeded max retries
      if (attempt < this.maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Cleanup failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this._retryCleanupWithBackoff(cleanupFn, attempt + 1);
      }

      // Max retries exceeded
      console.error(`Cleanup failed after ${this.maxRetries} attempts`);
      return result;
    } catch (error) {
      console.error(`Error in retry attempt ${attempt + 1}:`, error);

      if (attempt < this.maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._retryCleanupWithBackoff(cleanupFn, attempt + 1);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Log termination event
   * @param {string} roomId - Room identifier
   * @param {string} reason - Termination reason
   * @private
   */
  _logTermination(roomId, reason) {
    const logEntry = {
      timestamp: Date.now(),
      roomId: roomId,
      reason: reason,
      operation: 'room_termination'
    };

    console.log('Room termination:', logEntry);
  }

  /**
   * Start the inactivity tracker
   * Should be called after app initialization
   */
  startInactivityTracking() {
    this.inactivityTracker.start();
  }

  /**
   * Stop the inactivity tracker
   * Should be called on app cleanup
   */
  stopInactivityTracking() {
    this.inactivityTracker.stop();
  }
}
