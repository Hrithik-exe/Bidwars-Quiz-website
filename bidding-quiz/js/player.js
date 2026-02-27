/**
 * Player Management Module
 * 
 * This module handles player data management, including player creation,
 * validation, and Firebase operations for the multiplayer bidding quiz.
 * 
 * Exports:
 * - Player: Class representing an individual player
 * - PlayerManager: Class for managing all players in a game room
 */

import { db } from './firebase-config.js';
import { ref, set, update, get, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { PresenceTracker } from './presence-tracker.js';

/**
 * Hardcoded admin password
 * Change this before deployment for security
 */
const ADMIN_PASSWORD = "quiz2024";

/**
 * Player class representing an individual player in the game
 */
export class Player {
  /**
   * Create a new Player instance
   * @param {string} playerId - Unique identifier for the player
   * @param {string} name - Display name of the player
   * @param {number} score - Current score (default: 5000)
   */
  constructor(playerId, name, score = 5000) {
    this._id = playerId;
    this._name = name;
    this._score = score;
  }

  /**
   * Get player's unique ID
   * @returns {string} Player ID
   */
  getId() {
    return this._id;
  }

  /**
   * Get player's display name
   * @returns {string} Player name
   */
  getName() {
    return this._name;
  }

  /**
   * Get player's current score
   * @returns {number} Current score
   */
  getScore() {
    return this._score;
  }
}

/**
 * PlayerManager class for managing all players in a game room
 */
export class PlayerManager {
  /**
   * Create a new PlayerManager instance
   * @param {string} roomId - The game room ID (default: "room1")
   */
  constructor(roomId = "room1") {
    this.roomId = roomId;
    this.players = new Map();
    this.roomManager = null; // Set by app initialization
    this.presenceTracker = new PresenceTracker(); // Initialize presence tracker
  }

  /**
   * Generate a unique player ID using crypto.randomUUID() with fallback
   * @returns {string} Unique player ID
   * @private
   */
  _generatePlayerId() {
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
   * Check if a player name is already taken in the room
   * @param {string} name - Name to check
   * @returns {Promise<boolean>} True if name is taken, false otherwise
   */
  async isNameTaken(name) {
    const playersRef = ref(db, `rooms/${this.roomId}/players`);
    const snapshot = await get(playersRef);
    
    if (!snapshot.exists()) {
      return false;
    }
    
    const players = snapshot.val();
    return Object.values(players).some(player => player.name === name);
  }

  /**
   * Check if a player can join the game (only allowed in "waiting" phase)
   * @returns {Promise<boolean>} True if player can join, false otherwise
   */
  async canPlayerJoin() {
    const phaseRef = ref(db, `rooms/${this.roomId}/phase`);
    const snapshot = await get(phaseRef);
    
    // If phase doesn't exist yet, assume waiting phase (game not started)
    if (!snapshot.exists()) {
      return true;
    }
    
    const currentPhase = snapshot.val();
    return currentPhase === 'waiting';
  }

  /**
   * Add a new player to the game
   * @param {string} name - Player's display name
   * @returns {Promise<{success: boolean, playerId?: string, player?: Player, error?: string}>}
   */
  async joinGame(name) {
    try {
      // Validate name is not empty
      if (!name || name.trim().length === 0) {
        return {
          success: false,
          error: 'Name cannot be empty'
        };
      }

      // Check if player can join (phase must be "waiting")
      const canJoin = await this.canPlayerJoin();
      if (!canJoin) {
        return {
          success: false,
          error: 'Cannot join game in progress. Please wait for the next game.'
        };
      }

      // Check if name is already taken
      const nameTaken = await this.isNameTaken(name);
      if (nameTaken) {
        return {
          success: false,
          error: 'Name already taken. Please choose a different name.'
        };
      }

      // Generate unique player ID
      const playerId = this._generatePlayerId();

      // Create player data structure
      const playerData = {
        name: name.trim(),
        score: 5000,
        currentBid: 0,
        currentAnswer: null,
        isAdmin: false,
        joinedAt: Date.now()
      };

      // Write player data to Firebase
      const playerRef = ref(db, `rooms/${this.roomId}/players/${playerId}`);
      await set(playerRef, playerData);

      // Create Player instance
      const player = new Player(playerId, playerData.name, playerData.score);
      this.players.set(playerId, player);

      // Register player presence
      const presenceResult = await this.presenceTracker.registerPlayer(playerId, this.roomId);
      if (!presenceResult.success) {
        console.error('Failed to register presence:', presenceResult.error);
        // Continue anyway - presence is not critical for joining
      }

      // Update activity timestamp
      if (this.roomManager) {
        await this.roomManager.updateActivity(this.roomId);
      }

      return {
        success: true,
        playerId: playerId,
        player: player
      };
    } catch (error) {
      console.error('Error joining game:', error);
      return {
        success: false,
        error: 'Failed to join game. Please try again.'
      };
    }
  }

  /**
   * Authenticate a player as admin
   * @param {string} playerId - Player ID to authenticate
   * @param {string} password - Admin password to verify
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async authenticateAdmin(playerId, password) {
    try {
      // Validate inputs
      if (!playerId || !password) {
        return {
          success: false,
          error: 'Player ID and password are required'
        };
      }

      // Check if password is correct
      if (password !== ADMIN_PASSWORD) {
        return {
          success: false,
          error: 'Incorrect password'
        };
      }

      // Verify player exists
      const playerRef = ref(db, `rooms/${this.roomId}/players/${playerId}`);
      const snapshot = await get(playerRef);
      
      if (!snapshot.exists()) {
        return {
          success: false,
          error: 'Player not found'
        };
      }

      // Set isAdmin flag in Firebase
      const adminRef = ref(db, `rooms/${this.roomId}/players/${playerId}/isAdmin`);
      await set(adminRef, true);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error authenticating admin:', error);
      return {
        success: false,
        error: 'Failed to authenticate. Please try again.'
      };
    }
  }

  /**
   * Check if a player is an admin
   * @param {string} playerId - Player ID to check
   * @returns {Promise<boolean>} True if player is admin, false otherwise
   */
  async isAdmin(playerId) {
    try {
      const adminRef = ref(db, `rooms/${this.roomId}/players/${playerId}/isAdmin`);
      const snapshot = await get(adminRef);
      return snapshot.exists() ? snapshot.val() : false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Submit a bid for the current round
   * @param {string} playerId - Player ID submitting the bid
   * @param {number} bidAmount - Amount to bid
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async submitBid(playerId, bidAmount) {
    try {
      // Check if player is spectator
      if (this.roomManager && await this.roomManager.isSpectator(this.roomId, playerId)) {
        return {
          success: false,
          error: 'Spectators cannot submit bids'
        };
      }

      // Get player's current score
      const playerRef = ref(db, `rooms/${this.roomId}/players/${playerId}`);
      const playerSnapshot = await get(playerRef);
      
      if (!playerSnapshot.exists()) {
        return {
          success: false,
          error: 'Player not found'
        };
      }

      const playerData = playerSnapshot.val();
      const currentScore = playerData.score;

      // Validate bid amount
      if (bidAmount <= 0) {
        return {
          success: false,
          error: 'Bid must be greater than zero'
        };
      }

      if (bidAmount > currentScore) {
        return {
          success: false,
          error: 'Bid cannot exceed your current score'
        };
      }

      // Get current round number
      const roundRef = ref(db, `rooms/${this.roomId}/roundNumber`);
      const roundSnapshot = await get(roundRef);
      const roundNumber = roundSnapshot.exists() ? roundSnapshot.val() : 1;

      // Write bid to player's currentBid
      const currentBidRef = ref(db, `rooms/${this.roomId}/players/${playerId}/currentBid`);
      await set(currentBidRef, bidAmount);

      // Write bid to round bids
      const roundBidRef = ref(db, `rooms/${this.roomId}/rounds/${roundNumber}/bids/${playerId}`);
      await set(roundBidRef, bidAmount);

      // Update activity timestamp
      if (this.roomManager) {
        await this.roomManager.updateActivity(this.roomId);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error submitting bid:', error);
      return {
        success: false,
        error: 'Failed to submit bid. Please try again.'
      };
    }
  }

  /**
   * Get all bids for the current round
   * @returns {Promise<Object>} Object mapping player IDs to bid amounts
   */
  async getCurrentRoundBids() {
    try {
      // Get current round number
      const roundRef = ref(db, `rooms/${this.roomId}/roundNumber`);
      const roundSnapshot = await get(roundRef);
      const roundNumber = roundSnapshot.exists() ? roundSnapshot.val() : 1;

      // Get bids for current round
      const bidsRef = ref(db, `rooms/${this.roomId}/rounds/${roundNumber}/bids`);
      const bidsSnapshot = await get(bidsRef);

      return bidsSnapshot.exists() ? bidsSnapshot.val() : {};
    } catch (error) {
      console.error('Error getting round bids:', error);
      return {};
    }
  }

  /**
   * Submit an answer for the current round
   * @param {string} playerId - Player ID submitting the answer
   * @param {number} answerIndex - Index of selected answer (0-3)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async submitAnswer(playerId, answerIndex) {
    try {
      // Check if player is spectator
      if (this.roomManager && await this.roomManager.isSpectator(this.roomId, playerId)) {
        return {
          success: false,
          error: 'Spectators cannot submit answers'
        };
      }

      // Validate answer index
      if (typeof answerIndex !== 'number' || answerIndex < 0 || answerIndex > 3) {
        return {
          success: false,
          error: 'Invalid answer selection'
        };
      }

      // Verify player exists
      const playerRef = ref(db, `rooms/${this.roomId}/players/${playerId}`);
      const playerSnapshot = await get(playerRef);
      
      if (!playerSnapshot.exists()) {
        return {
          success: false,
          error: 'Player not found'
        };
      }

      // Get current round number
      const roundRef = ref(db, `rooms/${this.roomId}/roundNumber`);
      const roundSnapshot = await get(roundRef);
      const roundNumber = roundSnapshot.exists() ? roundSnapshot.val() : 1;

      // Write answer to player's currentAnswer
      const currentAnswerRef = ref(db, `rooms/${this.roomId}/players/${playerId}/currentAnswer`);
      await set(currentAnswerRef, answerIndex);

      // Write answer to round answers
      const roundAnswerRef = ref(db, `rooms/${this.roomId}/rounds/${roundNumber}/answers/${playerId}`);
      await set(roundAnswerRef, answerIndex);

      // Update activity timestamp
      if (this.roomManager) {
        await this.roomManager.updateActivity(this.roomId);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error submitting answer:', error);
      return {
        success: false,
        error: 'Failed to submit answer. Please try again.'
      };
    }
  }

  /**
   * Get all answers for the current round
   * @returns {Promise<Object>} Object mapping player IDs to answer indices
   */
  async getCurrentRoundAnswers() {
    try {
      // Get current round number
      const roundRef = ref(db, `rooms/${this.roomId}/roundNumber`);
      const roundSnapshot = await get(roundRef);
      const roundNumber = roundSnapshot.exists() ? roundSnapshot.val() : 1;

      // Get answers for current round
      const answersRef = ref(db, `rooms/${this.roomId}/rounds/${roundNumber}/answers`);
      const answersSnapshot = await get(answersRef);

      return answersSnapshot.exists() ? answersSnapshot.val() : {};
    } catch (error) {
      console.error('Error getting round answers:', error);
      return {};
    }
  }
}

  /**
   * Remove a player from the game
   * Removes player from Firebase and local state, and cleans up presence
   * @param {string} playerId - Player ID to remove
   * @param {string} roomId - Room identifier (optional, uses this.roomId if not provided)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async removePlayer(playerId, roomId = null) {
    try {
      const targetRoomId = roomId || this.roomId;

      // Validate inputs
      if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
        return {
          success: false,
          error: 'Invalid playerId'
        };
      }

      if (!targetRoomId || typeof targetRoomId !== 'string' || targetRoomId.trim().length === 0) {
        return {
          success: false,
          error: 'Invalid roomId'
        };
      }

      // Remove player from Firebase
      const playerRef = ref(db, `rooms/${targetRoomId}/players/${playerId}`);
      await set(playerRef, null);

      // Remove player from local players Map
      this.players.delete(playerId);

      // Unregister presence
      await this.presenceTracker.unregisterPlayer(playerId, targetRoomId);

      // Update activity timestamp
      if (this.roomManager) {
        await this.roomManager.updateActivity(targetRoomId);
      }

      console.log(`Player ${playerId} removed from room ${targetRoomId}`);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error removing player:', error);
      return {
        success: false,
        error: 'Failed to remove player'
      };
    }
  }
