/**
 * Game State Management Module
 * 
 * This module manages the central game state and Firebase synchronization
 * for the multiplayer bidding quiz application.
 * 
 * Exports:
 * - GameState: Class for managing game state and phase transitions
 */

import { db } from './firebase-config.js';
import { ref, set, update, get, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { PhaseTimer, PHASE_DURATIONS } from './timer.js';

/**
 * Game phase constants
 */
export const PHASES = {
  WAITING: 'waiting',
  SPINNING: 'spinning',
  BIDDING: 'bidding',
  QUESTION: 'question',
  RESULTS: 'results',
  FINISHED: 'finished'
};

/**
 * Create a cleanup log entry and log to console
 * @param {string} operation - Operation type ('player_cleanup' | 'room_cleanup')
 * @param {string} roomId - Room identifier
 * @param {number} recordsRemoved - Count of records deleted
 * @param {boolean} success - Operation success status
 * @param {string} [error] - Error message if failed
 * @param {number} [retryAttempt] - Retry attempt number if applicable
 */
function logCleanupOperation(operation, roomId, recordsRemoved, success, error = null, retryAttempt = null) {
  const logEntry = {
    timestamp: Date.now(),
    operation,
    roomId,
    recordsRemoved,
    success,
    ...(error && { error }),
    ...(retryAttempt !== null && { retryAttempt })
  };
  
  const logLevel = success ? 'info' : 'error';
  const prefix = success ? '✓' : '✗';
  const retryInfo = retryAttempt !== null ? ` (attempt ${retryAttempt + 1}/${3})` : '';
  
  console[logLevel](
    `${prefix} Cleanup ${operation}${retryInfo}:`,
    `Room: ${roomId},`,
    `Records: ${recordsRemoved},`,
    `Success: ${success}`,
    error ? `Error: ${error}` : ''
  );
  
  return logEntry;
}

/**
 * GameState class for managing game state and phase transitions
 */
export class GameState {
  /**
   * Create a new GameState instance
   * @param {string} roomId - The game room ID (default: "room1")
   */
  constructor(roomId = "room1") {
    this.roomId = roomId;
    this.roomRef = ref(db, `rooms/${this.roomId}`);
    this.roomManager = null; // Set by app initialization
    
    // Callback storage for listeners
    this.phaseChangeCallbacks = [];
    this.roundChangeCallbacks = [];
    this.playersChangeCallbacks = [];
    this.topicChangeCallbacks = [];
    
    // Current state cache
    this.currentPhase = null;
    this.currentRound = 0;
    this.currentTopic = null;
    
    // Timer management
    this.currentTimer = null;
    
    // Cleanup management
    this.cleanupTimer = null;
    this.cleanupInProgress = false;
    this.finalRankingsCache = null;
    this.cleanupRetryCount = 0;
    this.maxCleanupRetries = 3;
    
    // Set up Firebase listeners
    this._setupListeners();
  }

  /**
   * Set up Firebase listeners for state changes
   * @private
   */
  _setupListeners() {
    // Listen to phase changes
    const phaseRef = ref(db, `rooms/${this.roomId}/phase`);
    onValue(phaseRef, (snapshot) => {
      if (snapshot.exists()) {
        this.currentPhase = snapshot.val();
        this._notifyPhaseChange(this.currentPhase);
      }
    });

    // Listen to round number changes
    const roundRef = ref(db, `rooms/${this.roomId}/roundNumber`);
    onValue(roundRef, (snapshot) => {
      if (snapshot.exists()) {
        this.currentRound = snapshot.val();
        this._notifyRoundChange(this.currentRound);
      }
    });

    // Listen to current topic changes
    const topicRef = ref(db, `rooms/${this.roomId}/currentTopic`);
    onValue(topicRef, (snapshot) => {
      if (snapshot.exists()) {
        this.currentTopic = snapshot.val();
        this._notifyTopicChange(this.currentTopic);
      }
    });

    // Listen to players changes
    const playersRef = ref(db, `rooms/${this.roomId}/players`);
    onValue(playersRef, (snapshot) => {
      if (snapshot.exists()) {
        const players = snapshot.val();
        this._notifyPlayersChange(players);
      }
    });

    // Listen to phaseStartTime changes to start timer
    const phaseStartRef = ref(db, `rooms/${this.roomId}/phaseStartTime`);
    onValue(phaseStartRef, (snapshot) => {
      if (snapshot.exists() && this.currentPhase) {
        const phaseStartTime = snapshot.val();
        this._startPhaseTimer(this.currentPhase, phaseStartTime);
      }
    });
  }

  /**
   * Register a callback for phase changes
   * @param {Function} callback - Function to call when phase changes
   */
  onPhaseChange(callback) {
    this.phaseChangeCallbacks.push(callback);
  }

  /**
   * Register a callback for round changes
   * @param {Function} callback - Function to call when round changes
   */
  onRoundChange(callback) {
    this.roundChangeCallbacks.push(callback);
  }

  /**
   * Register a callback for players changes
   * @param {Function} callback - Function to call when players change
   */
  onPlayersChange(callback) {
    this.playersChangeCallbacks.push(callback);
  }

  /**
   * Register a callback for topic changes
   * @param {Function} callback - Function to call when topic changes
   */
  onTopicChange(callback) {
    this.topicChangeCallbacks.push(callback);
  }

  /**
   * Notify all phase change callbacks
   * @param {string} phase - New phase
   * @private
   */
  _notifyPhaseChange(phase) {
    this.phaseChangeCallbacks.forEach(callback => callback(phase));
  }

  /**
   * Notify all round change callbacks
   * @param {number} round - New round number
   * @private
   */
  _notifyRoundChange(round) {
    this.roundChangeCallbacks.forEach(callback => callback(round));
  }

  /**
   * Notify all players change callbacks
   * @param {Object} players - Players data
   * @private
   */
  _notifyPlayersChange(players) {
    this.playersChangeCallbacks.forEach(callback => callback(players));
  }

  /**
   * Notify all topic change callbacks
   * @param {string} topic - New topic
   * @private
   */
  _notifyTopicChange(topic) {
    this.topicChangeCallbacks.forEach(callback => callback(topic));
  }

  /**
   * Get the current game phase
   * @returns {string|null} Current phase or null if not set
   */
  getCurrentPhase() {
    return this.currentPhase;
  }

  /**
   * Get the current round number
   * @returns {number} Current round number (0-10)
   */
  getCurrentRound() {
    return this.currentRound;
  }

  /**
   * Get the current topic
   * @returns {string|null} Current topic or null if not set
   */
  getCurrentTopic() {
    return this.currentTopic;
  }

  /**
   * Get all players from Firebase
   * @returns {Promise<Object>} Players data object
   */
  async getPlayers() {
    const playersRef = ref(db, `rooms/${this.roomId}/players`);
    const snapshot = await get(playersRef);
    return snapshot.exists() ? snapshot.val() : {};
  }

  /**
   * Get used topics from Firebase
   * @returns {Promise<Array<string>>} Array of used topic names
   */
  async getUsedTopics() {
    const usedTopicsRef = ref(db, `rooms/${this.roomId}/usedTopics`);
    const snapshot = await get(usedTopicsRef);
    return snapshot.exists() ? snapshot.val() : [];
  }

  /**
   * Get phase start time from Firebase
   * @returns {Promise<number|null>} Phase start timestamp or null
   */
  async getPhaseStartTime() {
    const phaseStartRef = ref(db, `rooms/${this.roomId}/phaseStartTime`);
    const snapshot = await get(phaseStartRef);
    return snapshot.exists() ? snapshot.val() : null;
  }

  /**
   * Set the game phase in Firebase
   * @param {string} phase - Phase to set (must be one of PHASES constants)
   * @returns {Promise<void>}
   */
  async setPhase(phase) {
    // Validate phase
    if (!Object.values(PHASES).includes(phase)) {
      throw new Error(`Invalid phase: ${phase}`);
    }

    // Write phase and phaseStartTime to Firebase
    const updates = {
      [`rooms/${this.roomId}/phase`]: phase,
      [`rooms/${this.roomId}/phaseStartTime`]: Date.now()
    };

    await update(ref(db), updates);
    
    // Update activity timestamp
    if (this.roomManager) {
      await this.roomManager.updateActivity(this.roomId);
    }
  }

  /**
   * Transition to spinning phase
   * @returns {Promise<void>}
   */
  async transitionToSpinning() {
    await this.setPhase(PHASES.SPINNING);
  }

  /**
   * Transition to bidding phase
   * @returns {Promise<void>}
   */
  async transitionToBidding() {
    // Enforce phase order: can only transition from spinning
    if (this.currentPhase !== PHASES.SPINNING) {
      console.warn(`Cannot transition to bidding from ${this.currentPhase}`);
      return;
    }
    await this.setPhase(PHASES.BIDDING);
  }

  /**
   * Transition to question phase
   * @returns {Promise<void>}
   */
  async transitionToQuestion() {
    // Enforce phase order: can only transition from bidding
    if (this.currentPhase !== PHASES.BIDDING) {
      console.warn(`Cannot transition to question from ${this.currentPhase}`);
      return;
    }
    await this.setPhase(PHASES.QUESTION);
  }

  /**
   * Transition to results phase
   * @returns {Promise<void>}
   */
  async transitionToResults() {
    // Enforce phase order: can only transition from question
    if (this.currentPhase !== PHASES.QUESTION) {
      console.warn(`Cannot transition to results from ${this.currentPhase}`);
      return;
    }
    await this.setPhase(PHASES.RESULTS);
  }

  /**
   * Transition to finished phase
   * Triggers automatic cleanup of player records
   * @returns {Promise<void>}
   */
  async transitionToFinished() {
    // Enforce phase order: can only transition from results
    if (this.currentPhase !== PHASES.RESULTS) {
      console.warn(`Cannot transition to finished from ${this.currentPhase}`);
      return;
    }
    await this.setPhase(PHASES.FINISHED);
    
    // Trigger automatic cleanup
    await this.triggerAutomaticCleanup();
  }

  /**
   * Advance to the next round
   * Increments roundNumber in Firebase
   * Transitions to "finished" if roundNumber reaches 10
   * @returns {Promise<void>}
   */
  async advanceToNextRound() {
    const nextRound = this.currentRound + 1;
    
    // Update round number in Firebase
    const roundRef = ref(db, `rooms/${this.roomId}/roundNumber`);
    await set(roundRef, nextRound);
    
    // If we've completed 10 rounds, transition to finished
    if (nextRound >= 10) {
      await this.transitionToFinished();
    } else {
      // Otherwise, transition back to spinning for next round
      await this.transitionToSpinning();
    }
  }

  /**
   * Set the round number in Firebase
   * @param {number} roundNumber - Round number to set (0-10)
   * @returns {Promise<void>}
   */
  async setRound(roundNumber) {
    if (roundNumber < 0 || roundNumber > 10) {
      throw new Error(`Invalid round number: ${roundNumber}. Must be between 0 and 10.`);
    }
    
    const roundRef = ref(db, `rooms/${this.roomId}/roundNumber`);
    await set(roundRef, roundNumber);
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
   * Start the game (admin only)
   * Sets phase to "spinning" and round to 1
   * @param {string} playerId - Player ID attempting to start the game
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async startGame(playerId) {
    try {
      // Check if player is admin
      const isPlayerAdmin = await this.isAdmin(playerId);
      if (!isPlayerAdmin) {
        return {
          success: false,
          error: 'Only admins can start the game'
        };
      }

      // Set round to 1 and phase to spinning
      const updates = {
        [`rooms/${this.roomId}/roundNumber`]: 1,
        [`rooms/${this.roomId}/phase`]: PHASES.SPINNING,
        [`rooms/${this.roomId}/phaseStartTime`]: Date.now()
      };

      await update(ref(db), updates);

      // Update activity timestamp
      if (this.roomManager) {
        await this.roomManager.updateActivity(this.roomId);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error starting game:', error);
      return {
        success: false,
        error: 'Failed to start game. Please try again.'
      };
    }
  }

  /**
   * Manually advance to the next phase (admin only)
   * @param {string} playerId - Player ID attempting to advance phase
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async advancePhase(playerId) {
    try {
      // Check if player is admin
      const isPlayerAdmin = await this.isAdmin(playerId);
      if (!isPlayerAdmin) {
        return {
          success: false,
          error: 'Only admins can advance phases'
        };
      }

      // Determine next phase based on current phase
      const currentPhase = this.currentPhase;
      let nextPhase = null;

      switch (currentPhase) {
        case PHASES.WAITING:
          nextPhase = PHASES.SPINNING;
          break;
        case PHASES.SPINNING:
          nextPhase = PHASES.BIDDING;
          break;
        case PHASES.BIDDING:
          nextPhase = PHASES.QUESTION;
          break;
        case PHASES.QUESTION:
          nextPhase = PHASES.RESULTS;
          break;
        case PHASES.RESULTS:
          // Check if we should finish or continue
          if (this.currentRound >= 10) {
            nextPhase = PHASES.FINISHED;
          } else {
            nextPhase = PHASES.SPINNING;
            // Increment round
            await this.setRound(this.currentRound + 1);
          }
          break;
        case PHASES.FINISHED:
          return {
            success: false,
            error: 'Game is finished. Use Reset Game to start over.'
          };
        default:
          return {
            success: false,
            error: 'Unknown phase'
          };
      }

      // Set the next phase (this will also update activity via setPhase)
      await this.setPhase(nextPhase);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error advancing phase:', error);
      return {
        success: false,
        error: 'Failed to advance phase. Please try again.'
      };
    }
  }

  /**
   * Reset the game (admin only)
   * Sets phase to "waiting", round to 0, clears used topics, resets scores
   * @param {string} playerId - Player ID attempting to reset the game
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async resetGame(playerId) {
    try {
      // Check if player is admin
      const isPlayerAdmin = await this.isAdmin(playerId);
      if (!isPlayerAdmin) {
        return {
          success: false,
          error: 'Only admins can reset the game'
        };
      }

      // Get all players
      const playersRef = ref(db, `rooms/${this.roomId}/players`);
      const playersSnapshot = await get(playersRef);

      // Prepare updates
      const updates = {
        [`rooms/${this.roomId}/phase`]: PHASES.WAITING,
        [`rooms/${this.roomId}/roundNumber`]: 0,
        [`rooms/${this.roomId}/usedTopics`]: [],
        [`rooms/${this.roomId}/currentTopic`]: null,
        [`rooms/${this.roomId}/phaseStartTime`]: null,
        [`rooms/${this.roomId}/rounds`]: null
      };

      // Reset all player scores to 5000 and clear bids/answers
      if (playersSnapshot.exists()) {
        const players = playersSnapshot.val();
        Object.keys(players).forEach(pId => {
          updates[`rooms/${this.roomId}/players/${pId}/score`] = 5000;
          updates[`rooms/${this.roomId}/players/${pId}/currentBid`] = 0;
          updates[`rooms/${this.roomId}/players/${pId}/currentAnswer`] = null;
        });
      }

      // Apply all updates
      await update(ref(db), updates);

      // Update activity timestamp
      if (this.roomManager) {
        await this.roomManager.updateActivity(this.roomId);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error resetting game:', error);
      return {
        success: false,
        error: 'Failed to reset game. Please try again.'
      };
    }
  }

  /**
   * Calculate results for all players in the current round
   * For correct answers: newScore = currentScore + (bid × 2)
   * For incorrect answers: newScore = currentScore - bid
   * @param {number} correctAnswer - Index of the correct answer (0-3)
   * @returns {Promise<Object>} Object mapping player IDs to their results
   */
  async calculateResults(correctAnswer) {
    try {
      // Get all players
      const players = await this.getPlayers();
      
      // Get current round number
      const roundNumber = this.currentRound;
      
      // Get answers and bids for this round
      const answersRef = ref(db, `rooms/${this.roomId}/rounds/${roundNumber}/answers`);
      const bidsRef = ref(db, `rooms/${this.roomId}/rounds/${roundNumber}/bids`);
      
      const answersSnapshot = await get(answersRef);
      const bidsSnapshot = await get(bidsRef);
      
      const answers = answersSnapshot.exists() ? answersSnapshot.val() : {};
      const bids = bidsSnapshot.exists() ? bidsSnapshot.val() : {};
      
      // Calculate results for each player who submitted an answer
      const results = {};
      
      for (const playerId in answers) {
        if (!players[playerId]) {
          continue; // Skip if player doesn't exist
        }
        
        const playerAnswer = answers[playerId];
        const playerBid = bids[playerId] || 0;
        const currentScore = players[playerId].score || 0;
        
        // Check if answer is correct
        const isCorrect = playerAnswer === correctAnswer;
        
        // Calculate score change
        let scoreChange = 0;
        if (isCorrect) {
          scoreChange = playerBid * 2; // Correct: +2x bid
        } else {
          scoreChange = -playerBid; // Incorrect: -1x bid
        }
        
        // Calculate new score
        const newScore = currentScore + scoreChange;
        
        // Store result
        results[playerId] = {
          correct: isCorrect,
          scoreChange: scoreChange,
          newScore: newScore
        };
      }
      
      return results;
    } catch (error) {
      console.error('Error calculating results:', error);
      throw error;
    }
  }

  /**
   * Update scores in Firebase based on calculated results
   * Writes updated scores to rooms/{roomId}/players/{playerId}/score
   * Stores round results at rooms/{roomId}/rounds/{roundNumber}/results/{playerId}
   * @param {Object} results - Results object from calculateResults()
   * @returns {Promise<void>}
   */
  async updateScores(results) {
    try {
      const roundNumber = this.currentRound;
      const updates = {};
      
      // Prepare batch updates for all players
      for (const playerId in results) {
        const result = results[playerId];
        
        // Update player score
        updates[`rooms/${this.roomId}/players/${playerId}/score`] = result.newScore;
        
        // Store round results
        updates[`rooms/${this.roomId}/rounds/${roundNumber}/results/${playerId}`] = {
          correct: result.correct,
          scoreChange: result.scoreChange,
          newScore: result.newScore
        };
      }
      
      // Apply all updates in a single batch
      await update(ref(db), updates);
      
      console.log(`Scores updated for round ${roundNumber}`);
    } catch (error) {
      console.error('Error updating scores:', error);
      throw error;
    }
  }

  /**
   * Calculate and update scores for the current round
   * This is a convenience method that combines calculateResults and updateScores
   * Should be called during the results phase
   * @param {number} correctAnswer - Index of the correct answer (0-3)
   * @returns {Promise<Object>} Results object mapping player IDs to their results
   */
  async processRoundResults(correctAnswer) {
    try {
      // Calculate results
      const results = await this.calculateResults(correctAnswer);
      
      // Update scores in Firebase
      await this.updateScores(results);
      
      return results;
    } catch (error) {
      console.error('Error processing round results:', error);
      throw error;
    }
  }

  /**
   * Start phase timer based on current phase and start time
   * @param {string} phase - Current game phase
   * @param {number} phaseStartTime - Server timestamp when phase started
   * @private
   */
  _startPhaseTimer(phase, phaseStartTime) {
    // Stop any existing timer
    if (this.currentTimer) {
      this.currentTimer.stop();
      this.currentTimer = null;
    }

    // Get duration for this phase
    const duration = PHASE_DURATIONS[phase];
    
    // If phase has no timer (waiting, finished), don't start one
    if (duration === null || duration === undefined) {
      return;
    }

    // Create and start new timer
    this.currentTimer = new PhaseTimer(duration);
    
    // Set up timer callbacks
    this.currentTimer.onExpire(() => {
      this._handleTimerExpire();
    });

    // Start timer with server start time
    this.currentTimer.start(phaseStartTime);
    
    console.log(`Timer started for ${phase} phase: ${duration} seconds`);
  }

  /**
   * Handle timer expiration - trigger automatic phase transition
   * @private
   */
  async _handleTimerExpire() {
    console.log(`Timer expired for ${this.currentPhase} phase`);
    
    try {
      switch (this.currentPhase) {
        case PHASES.SPINNING:
          // Transition to bidding after wheel animation
          await this.transitionToBidding();
          break;
          
        case PHASES.BIDDING:
          // Transition to question after bidding time expires
          await this.transitionToQuestion();
          break;
          
        case PHASES.QUESTION:
          // Transition to results after question time expires
          await this.transitionToResults();
          break;
          
        case PHASES.RESULTS:
          // Check if we should finish or continue to next round
          if (this.currentRound >= 10) {
            await this.transitionToFinished();
          } else {
            await this.advanceToNextRound();
          }
          break;
          
        default:
          console.warn(`No automatic transition defined for phase: ${this.currentPhase}`);
      }
    } catch (error) {
      console.error('Error handling timer expiration:', error);
    }
  }

  /**
   * Get the current timer instance
   * @returns {PhaseTimer|null} Current timer or null if no timer active
   */
  getCurrentTimer() {
    return this.currentTimer;
  }

  /**
   * Get remaining time on current timer
   * @returns {number} Remaining seconds (0 if no timer active)
   */
  getRemainingTime() {
    if (!this.currentTimer) {
      return 0;
    }
    return this.currentTimer.getRemainingTime();
  }

  /**
   * Identify the winner after game completion
   * Finds the player with the maximum score after round 10
   * In case of ties, selects the first player with max score
   * @returns {Promise<{playerId: string, name: string, score: number}|null>} Winner object or null if no players
   */
  async identifyWinner() {
    try {
      // Get all players
      const players = await this.getPlayers();
      
      if (!players || Object.keys(players).length === 0) {
        console.warn('No players found to identify winner');
        return null;
      }
      
      // Convert to array and find player with maximum score
      const playersArray = Object.entries(players).map(([id, data]) => ({
        playerId: id,
        name: data.name,
        score: data.score || 0
      }));
      
      // Sort by score in descending order
      playersArray.sort((a, b) => b.score - a.score);
      
      // Return the first player (highest score)
      const winner = playersArray[0];
      
      console.log(`Winner identified: ${winner.name} with ${winner.score} points`);
      
      return winner;
    } catch (error) {
      console.error('Error identifying winner:', error);
      return null;
    }
  }

  /**
   * Get final rankings of all players
   * Returns players sorted by score in descending order
   * @returns {Promise<Array<{playerId: string, name: string, score: number, rank: number}>>} Array of players with rankings
   */
  async getFinalRankings() {
    try {
      // Get all players
      const players = await this.getPlayers();
      
      if (!players || Object.keys(players).length === 0) {
        return [];
      }
      
      // Convert to array
      const playersArray = Object.entries(players).map(([id, data]) => ({
        playerId: id,
        name: data.name,
        score: data.score || 0
      }));
      
      // Sort by score in descending order
      playersArray.sort((a, b) => b.score - a.score);
      
      // Add rank numbers
      const rankings = playersArray.map((player, index) => ({
        ...player,
        rank: index + 1
      }));
      
      return rankings;
    } catch (error) {
      console.error('Error getting final rankings:', error);
      return [];
    }
  }

  /**
   * Cache final rankings before cleanup
   * Stores rankings in memory for display after player records are removed
   * @returns {Promise<void>}
   */
  async cacheFinalRankings() {
    try {
      const rankings = await this.getFinalRankings();
      this.finalRankingsCache = rankings;
      console.log(`Cached final rankings for ${rankings.length} players`);
    } catch (error) {
      console.error('Error caching final rankings:', error);
      throw error; // Re-throw to prevent cleanup if caching fails
    }
  }

  /**
   * Get cached final rankings
   * Returns cached rankings or empty array if not cached
   * @returns {Array} Cached rankings or empty array
   */
  getCachedRankings() {
    return this.finalRankingsCache || [];
  }

  /**
   * Remove all player records from Firebase
   * Preserves final rankings in cache before deletion
   * @returns {Promise<{success: boolean, count: number, error?: string}>}
   */
  async cleanupPlayerRecords() {
    try {
      // Cache rankings before cleanup
      await this.cacheFinalRankings();
      
      // Get current player count
      const players = await this.getPlayers();
      const playerCount = players ? Object.keys(players).length : 0;
      
      if (playerCount === 0) {
        console.log('No players to cleanup');
        logCleanupOperation('player_cleanup', this.roomId, 0, true);
        return { success: true, count: 0 };
      }
      
      // Remove all player records
      const playersRef = ref(db, `rooms/${this.roomId}/players`);
      await set(playersRef, null);
      
      // Log successful cleanup
      logCleanupOperation('player_cleanup', this.roomId, playerCount, true);
      
      return { success: true, count: playerCount };
    } catch (error) {
      const errorMsg = error.message || 'Unknown error';
      logCleanupOperation('player_cleanup', this.roomId, 0, false, errorMsg);
      return { success: false, count: 0, error: errorMsg };
    }
  }

  /**
   * Retry cleanup with exponential backoff
   * Retries failed cleanup operations with increasing delays (1s, 2s, 4s)
   * @param {Function} cleanupFn - Cleanup function to retry
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {Promise<any>}
   */
  async retryCleanupWithBackoff(cleanupFn, attempt = 0) {
    try {
      const result = await cleanupFn();
      
      if (result.success) {
        if (attempt > 0) {
          console.log(`Cleanup succeeded on retry attempt ${attempt + 1}`);
        }
        this.cleanupRetryCount = 0; // Reset retry count on success
        return result;
      }
      
      // If cleanup failed and we haven't exceeded max retries
      if (attempt < this.maxCleanupRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Cleanup failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxCleanupRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryCleanupWithBackoff(cleanupFn, attempt + 1);
      }
      
      // Max retries exceeded
      console.error(`Cleanup failed after ${this.maxCleanupRetries} attempts`);
      return result;
    } catch (error) {
      console.error(`Error in retry attempt ${attempt + 1}:`, error);
      
      if (attempt < this.maxCleanupRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryCleanupWithBackoff(cleanupFn, attempt + 1);
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule room data cleanup after 5 minutes
   * Starts timer that will trigger cleanupRoomData
   * @returns {void}
   */
  scheduleRoomCleanup() {
    // Cancel existing timer if present
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }
    
    console.log('Scheduling room cleanup in 5 minutes');
    
    // Schedule cleanup for 5 minutes (300000ms)
    this.cleanupTimer = setTimeout(async () => {
      console.log('5-minute timer expired, triggering room cleanup');
      await this.retryCleanupWithBackoff(() => this.cleanupRoomData());
    }, 300000);
  }

  /**
   * Remove all room data except timestamp marker
   * Sets all game fields to null and adds lastCleanedAt timestamp
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async cleanupRoomData() {
    try {
      const updates = {
        [`rooms/${this.roomId}/rounds`]: null,
        [`rooms/${this.roomId}/usedTopics`]: null,
        [`rooms/${this.roomId}/currentTopic`]: null,
        [`rooms/${this.roomId}/phase`]: null,
        [`rooms/${this.roomId}/roundNumber`]: null,
        [`rooms/${this.roomId}/phaseStartTime`]: null,
        [`rooms/${this.roomId}/lastCleanedAt`]: Date.now()
      };
      
      await update(ref(db), updates);
      
      // Log successful cleanup
      logCleanupOperation('room_cleanup', this.roomId, Object.keys(updates).length - 1, true);
      
      return { success: true };
    } catch (error) {
      const errorMsg = error.message || 'Unknown error';
      logCleanupOperation('room_cleanup', this.roomId, 0, false, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Trigger automatic cleanup on game finish
   * Called when transitioning to FINISHED phase
   * @returns {Promise<void>}
   */
  async triggerAutomaticCleanup() {
    if (this.cleanupInProgress) {
      console.log('Cleanup already in progress, skipping');
      return;
    }
    
    this.cleanupInProgress = true;
    
    try {
      console.log('Starting automatic cleanup process');
      
      // Cleanup player records with retry logic
      const result = await this.retryCleanupWithBackoff(() => this.cleanupPlayerRecords());
      
      if (result.success) {
        console.log(`Player cleanup completed: ${result.count} records removed`);
        
        // Schedule room cleanup for 5 minutes later
        this.scheduleRoomCleanup();
      } else {
        console.error('Player cleanup failed after all retries:', result.error);
        // Display error to admin
        this._displayCleanupError(result.error);
      }
    } catch (error) {
      console.error('Error in automatic cleanup:', error);
      this._displayCleanupError(error.message);
    } finally {
      this.cleanupInProgress = false;
    }
  }

  /**
   * Manual cleanup trigger (admin only)
   * Immediately removes player records after confirmation
   * @param {string} playerId - Admin player ID
   * @returns {Promise<{success: boolean, count: number, error?: string}>}
   */
  async manualCleanup(playerId) {
    try {
      // Verify admin status
      const isAdmin = await this.isAdmin(playerId);
      if (!isAdmin) {
        console.error('Permission denied: Only admins can trigger manual cleanup');
        return { success: false, count: 0, error: 'Permission denied' };
      }
      
      if (this.cleanupInProgress) {
        return { success: false, count: 0, error: 'Cleanup already in progress' };
      }
      
      this.cleanupInProgress = true;
      
      // Execute cleanup with retry logic
      const result = await this.retryCleanupWithBackoff(() => this.cleanupPlayerRecords());
      
      this.cleanupInProgress = false;
      
      return result;
    } catch (error) {
      this.cleanupInProgress = false;
      console.error('Error in manual cleanup:', error);
      return { success: false, count: 0, error: error.message };
    }
  }

  /**
   * Get current data usage statistics
   * Returns player count and round count
   * @returns {Promise<{playerCount: number, roundCount: number}>}
   */
  async getDataUsageStats() {
    try {
      // Get player count
      const players = await this.getPlayers();
      const playerCount = players ? Object.keys(players).length : 0;
      
      // Get round count
      const roundsRef = ref(db, `rooms/${this.roomId}/rounds`);
      const roundsSnapshot = await get(roundsRef);
      const rounds = roundsSnapshot.exists() ? roundsSnapshot.val() : {};
      const roundCount = Object.keys(rounds).length;
      
      return { playerCount, roundCount };
    } catch (error) {
      console.error('Error getting data usage stats:', error);
      return { playerCount: 0, roundCount: 0 };
    }
  }

  /**
   * Display cleanup error to admin
   * Shows error message with manual intervention instructions
   * @private
   * @param {string} errorMsg - Error message to display
   */
  _displayCleanupError(errorMsg) {
    const statusElement = document.getElementById('cleanup-status');
    if (statusElement) {
      statusElement.innerHTML = `
        <div class="error-message">
          <strong>Cleanup Failed:</strong> ${errorMsg}<br>
          <small>Please try manual cleanup or contact support if the issue persists.</small>
        </div>
      `;
      statusElement.style.display = 'block';
    }
  }
}


