/**
 * Timer Module
 * 
 * This module handles phase countdown timers with client-side calculation
 * based on server timestamps to avoid continuous Firebase writes.
 * 
 * Exports:
 * - PhaseTimer: Class for managing phase countdown timers
 * - PHASE_DURATIONS: Object mapping phases to their durations in seconds
 */

/**
 * Phase durations in seconds
 */
export const PHASE_DURATIONS = {
  waiting: null,      // No timer
  spinning: 5,        // 5 seconds
  bidding: 30,        // 30 seconds
  question: 20,       // 20 seconds
  results: 10,        // 10 seconds
  finished: null      // No timer
};

/**
 * PhaseTimer class for managing countdown timers
 * Calculates remaining time client-side from server timestamp
 */
export class PhaseTimer {
  /**
   * Create a new PhaseTimer instance
   * @param {number} durationSeconds - Duration of the timer in seconds
   */
  constructor(durationSeconds) {
    this.duration = durationSeconds * 1000; // Convert to milliseconds
    this.startTime = null;
    this.intervalId = null;
    this.tickCallbacks = [];
    this.expireCallbacks = [];
  }

  /**
   * Start the timer from a server start time
   * @param {number} serverStartTime - Server timestamp when phase started (milliseconds)
   */
  start(serverStartTime) {
    // Stop any existing timer
    this.stop();
    
    this.startTime = serverStartTime;
    
    // Calculate initial remaining time
    const now = Date.now();
    const elapsed = now - this.startTime;
    const remaining = Math.max(0, this.duration - elapsed);
    
    // If timer already expired, call expire immediately
    if (remaining <= 0) {
      this._notifyExpire();
      return;
    }
    
    // Notify initial tick
    this._notifyTick(Math.ceil(remaining / 1000));
    
    // Update every 100ms for smooth countdown
    this.intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.startTime;
      const remaining = Math.max(0, this.duration - elapsed);
      
      // Notify tick callbacks every second (when seconds change)
      const secondsRemaining = Math.ceil(remaining / 1000);
      this._notifyTick(secondsRemaining);
      
      // Check if timer expired
      if (remaining <= 0) {
        this.stop();
        this._notifyExpire();
      }
    }, 100);
  }

  /**
   * Stop the timer and clear interval
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Reset the timer (stop and clear start time)
   */
  reset() {
    this.stop();
    this.startTime = null;
  }

  /**
   * Get remaining time in seconds
   * @returns {number} Remaining seconds (0 if timer not started or expired)
   */
  getRemainingTime() {
    if (!this.startTime) {
      return 0;
    }
    
    const now = Date.now();
    const elapsed = now - this.startTime;
    const remaining = Math.max(0, this.duration - elapsed);
    
    return Math.ceil(remaining / 1000);
  }

  /**
   * Check if timer has expired
   * @returns {boolean} True if timer expired, false otherwise
   */
  isExpired() {
    return this.getRemainingTime() <= 0;
  }

  /**
   * Register a callback for timer tick (called every second)
   * @param {Function} callback - Function to call with secondsRemaining parameter
   */
  onTick(callback) {
    if (typeof callback === 'function') {
      this.tickCallbacks.push(callback);
    }
  }

  /**
   * Register a callback for timer expiration
   * @param {Function} callback - Function to call when timer reaches zero
   */
  onExpire(callback) {
    if (typeof callback === 'function') {
      this.expireCallbacks.push(callback);
    }
  }

  /**
   * Notify all tick callbacks
   * @param {number} secondsRemaining - Seconds remaining on timer
   * @private
   */
  _notifyTick(secondsRemaining) {
    this.tickCallbacks.forEach(callback => {
      try {
        callback(secondsRemaining);
      } catch (error) {
        console.error('Error in tick callback:', error);
      }
    });
  }

  /**
   * Notify all expire callbacks
   * @private
   */
  _notifyExpire() {
    this.expireCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in expire callback:', error);
      }
    });
  }

  /**
   * Synchronize timer with server time
   * Useful for late joiners or reconnections
   * @param {number} phaseStartTime - Server timestamp when phase started
   */
  syncWithServerTime(phaseStartTime) {
    if (this.intervalId) {
      // Timer already running, restart with new start time
      this.start(phaseStartTime);
    } else {
      // Timer not running, just update start time
      this.startTime = phaseStartTime;
    }
  }
}
