/**
 * Room Code Generator Module
 * 
 * This module generates unique 6-character room codes using a base-32 alphabet
 * (excluding ambiguous characters like 0, O, 1, I, L) for easy verbal communication.
 * 
 * Exports:
 * - RoomCodeGenerator: Class for generating and validating room codes
 */

import { db } from './firebase-config.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

/**
 * RoomCodeGenerator class for generating and validating room codes
 */
export class RoomCodeGenerator {
  /**
   * Create a new RoomCodeGenerator instance
   */
  constructor() {
    // Base-32 alphabet excluding ambiguous characters (0, O, 1, I, L)
    // Total: 30 characters (26 letters - 3 excluded + 10 digits - 2 excluded)
    this.alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    this.codeLength = 6;
    this.maxRetries = 10;
  }

  /**
   * Generate a unique 6-character room code
   * Checks Firebase for uniqueness and retries if collision occurs
   * @returns {Promise<string>} Unique room code
   * @throws {Error} If unable to generate unique code after max retries
   */
  async generate() {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      // Generate random code
      const code = this._generateRandomCode();
      
      // Check if code is unique
      const isUnique = await this._checkUniqueness(code);
      
      if (isUnique) {
        console.log(`Generated unique room code: ${code}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`);
        return code;
      }
      
      console.warn(`Room code collision detected: ${code} (attempt ${attempt + 1}/${this.maxRetries})`);
    }
    
    // Max retries exceeded
    throw new Error(`Failed to generate unique room code after ${this.maxRetries} attempts`);
  }

  /**
   * Generate a random 6-character code from the alphabet
   * @returns {string} Random 6-character code
   * @private
   */
  _generateRandomCode() {
    let code = '';
    const alphabetLength = this.alphabet.length;
    
    // Use crypto.getRandomValues for cryptographically secure randomness
    const randomValues = new Uint8Array(this.codeLength);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < this.codeLength; i++) {
      // Map random byte to alphabet index
      const index = randomValues[i] % alphabetLength;
      code += this.alphabet[index];
    }
    
    return code;
  }

  /**
   * Check if a room code is unique in Firebase
   * @param {string} code - Code to check
   * @returns {Promise<boolean>} True if code is unique, false if already exists
   * @private
   */
  async _checkUniqueness(code) {
    try {
      // Check if code exists in roomCodes mapping
      const roomCodeRef = ref(db, `roomCodes/${code}`);
      const snapshot = await get(roomCodeRef);
      
      // Code is unique if it doesn't exist
      return !snapshot.exists();
    } catch (error) {
      console.error('Error checking room code uniqueness:', error);
      // On error, assume not unique to be safe
      return false;
    }
  }

  /**
   * Validate room code format
   * Checks if code is 6 characters and contains only valid alphabet characters
   * @param {string} code - Code to validate
   * @returns {boolean} True if valid format, false otherwise
   */
  validate(code) {
    // Check if code is a string
    if (typeof code !== 'string') {
      return false;
    }
    
    // Check length
    if (code.length !== this.codeLength) {
      return false;
    }
    
    // Check all characters are in alphabet
    for (let i = 0; i < code.length; i++) {
      if (!this.alphabet.includes(code[i])) {
        return false;
      }
    }
    
    return true;
  }
}
