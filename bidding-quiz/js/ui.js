/**
 * UI Management Module
 * 
 * This module handles all UI rendering and user interactions for the
 * multiplayer bidding quiz application.
 * 
 * Exports:
 * - UIManager: Class for managing UI rendering and interactions
 */

import { PlayerManager } from './player.js';
import { db } from './firebase-config.js';
import { ref, onValue, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

/**
 * UIManager class for managing all UI rendering and interactions
 */
export class UIManager {
  /**
   * Create a new UIManager instance
   * @param {string} roomId - The game room ID (default: "room1")
   */
  constructor(roomId = "room1") {
    this.roomId = roomId;
    this.playerManager = new PlayerManager(roomId);
    this.currentPlayerId = localStorage.getItem('currentPlayerId') || null;
    this.mainContent = document.getElementById('main-content');
    this.errorContainer = document.getElementById('error-container');
    
    // Set up player count listener
    this._setupPlayerCountListener();
  }

  /**
   * Set up Firebase listener for player count updates
   * Updates any element with id 'player-count' in real-time
   * @private
   */
  _setupPlayerCountListener() {
    const playersRef = ref(db, `rooms/${this.roomId}/players`);
    onValue(playersRef, (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      this._updatePlayerCountDisplay(count);
    });
  }

  /**
   * Update player count display in the DOM
   * @param {number} count - Number of players
   * @private
   */
  _updatePlayerCountDisplay(count) {
    const playerCountElements = document.querySelectorAll('.player-count');
    playerCountElements.forEach(element => {
      element.textContent = `${count} player${count !== 1 ? 's' : ''} connected`;
    });
  }

  /**
   * Get current player count from Firebase
   * @returns {Promise<number>} Number of players currently in the room
   */
  async getPlayerCount() {
    const playersRef = ref(db, `rooms/${this.roomId}/players`);
    const snapshot = await get(playersRef);
    return snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
  }

  /**
   * Set up Firebase listener for real-time leaderboard updates
   * Optimized to update only changed elements, not full re-render
   * @private
   */
  _setupLeaderboardListener() {
    const playersRef = ref(db, `rooms/${this.roomId}/players`);
    onValue(playersRef, (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }
      
      const playersData = snapshot.val();
      const players = Object.entries(playersData).map(([id, data]) => ({
        id,
        name: data.name,
        score: data.score
      }));
      
      // Update leaderboard in the DOM
      this.updateLeaderboard(players);
    });
  }

  /**
   * Initialize leaderboard with Firebase listener
   * Call this method when the game interface is rendered
   */
  initializeLeaderboard() {
    this._setupLeaderboardListener();
  }

  /**
   * Render the join screen with name input and submit button
   */
  renderJoinScreen() {
    this.mainContent.innerHTML = `
      <div class="join-screen">
        <h1 class="text-center">MULTIPLAYER BIDDING QUIZ</h1>
        
        <form id="join-form" class="join-form">
          <input 
            type="text" 
            id="player-name" 
            placeholder="Enter your name"
            maxlength="20"
            autocomplete="off"
            autofocus
            required
          />
          
          <button type="submit" id="join-button" class="join-button">
            JOIN GAME
          </button>
          
          <p id="player-count" class="player-count">
            0 players connected
          </p>
        </form>
      </div>
    `;

    // Add event listeners
    const form = document.getElementById('join-form');
    const nameInput = document.getElementById('player-name');
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleJoinSubmit(nameInput.value);
    });

    // Handle Enter key submission
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
      }
    });
  }

  /**
   * Handle join form submission
   * @param {string} name - Player name from input
   */
  async handleJoinSubmit(name) {
    const joinButton = document.getElementById('join-button');
    const nameInput = document.getElementById('player-name');
    
    // Show loading state
    this.showLoading(joinButton, 'Joining...');
    this.disableInput('player-name');
    
    try {
      // Attempt to join the game
      const result = await this.playerManager.joinGame(name);
      
      if (result.success) {
        // Store player ID for later use
        this.currentPlayerId = result.playerId;
        
        // Clear any existing errors
        this.clearError();
        
        // TODO: Transition to game interface
        // For now, just show a success message
        this.showSuccess('Successfully joined the game!');
        
        console.log('Player joined successfully:', result.playerId);
      } else {
        // Show error message
        this.showError(result.error);
        
        // Re-enable form
        this.hideLoading(joinButton, 'JOIN GAME');
        this.enableInput('player-name');
        nameInput.focus();
      }
    } catch (error) {
      console.error('Error during join:', error);
      this.showError('An unexpected error occurred. Please try again.');
      
      // Re-enable form
      this.hideLoading(joinButton, 'JOIN GAME');
      this.enableInput('player-name');
      nameInput.focus();
    }
  }

  /**
   * Show loading state on a button
   * @param {HTMLElement} button - Button element
   * @param {string} text - Loading text to display
   */
  showLoading(button, text) {
    button.disabled = true;
    button.textContent = text;
  }

  /**
   * Hide loading state on a button
   * @param {HTMLElement} button - Button element
   * @param {string} text - Original button text
   */
  hideLoading(button, text) {
    button.disabled = false;
    button.textContent = text;
  }

  /**
   * Disable an input field
   * @param {string} inputId - ID of the input element
   */
  disableInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.disabled = true;
    }
  }

  /**
   * Enable an input field
   * @param {string} inputId - ID of the input element
   */
  enableInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.disabled = false;
    }
  }

  /**
   * Show an error message
   * @param {string} message - Error message to display
   * @param {number} duration - Auto-dismiss duration in ms (default: 5000)
   */
  showError(message, duration = 5000) {
    this.clearError();
    
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.innerHTML = `
      <span class="error-icon">⚠</span>
      <span class="error-text">${message}</span>
      <button class="error-dismiss" onclick="document.getElementById('error-container').innerHTML = ''">×</button>
    `;
    
    this.errorContainer.appendChild(errorEl);
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => this.clearError(), duration);
    }
  }

  /**
   * Show a success message
   * @param {string} message - Success message to display
   * @param {number} duration - Auto-dismiss duration in ms (default: 3000)
   */
  showSuccess(message, duration = 3000) {
    this.clearError();
    
    const successEl = document.createElement('div');
    successEl.className = 'error-message success-message';
    successEl.innerHTML = `
      <span class="error-icon">✓</span>
      <span class="error-text">${message}</span>
    `;
    
    this.errorContainer.appendChild(successEl);
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => this.clearError(), duration);
    }
  }

  /**
   * Clear all error/success messages
   */
  clearError() {
    this.errorContainer.innerHTML = '';
  }

  /**
   * Show confirmation dialog
   * @param {string} message - Confirmation message
   * @returns {Promise<boolean>} - True if confirmed, false if cancelled
   */
  showConfirmation(message) {
    return new Promise((resolve) => {
      // Create confirmation dialog
      const dialogHTML = `
        <div class="confirmation-dialog-overlay" id="confirmation-dialog">
          <div class="confirmation-dialog">
            <p class="confirmation-message">${message}</p>
            <div class="confirmation-buttons">
              <button id="confirm-yes" type="button" class="confirm-button">Yes</button>
              <button id="confirm-no" type="button" class="cancel-button">No</button>
            </div>
          </div>
        </div>
      `;

      // Add dialog to page
      document.body.insertAdjacentHTML('beforeend', dialogHTML);

      // Add event listeners
      const yesButton = document.getElementById('confirm-yes');
      const noButton = document.getElementById('confirm-no');
      const dialog = document.getElementById('confirmation-dialog');

      const cleanup = () => {
        if (dialog && dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
        }
      };

      yesButton.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      noButton.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      // Close on overlay click
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          cleanup();
          resolve(false);
        }
      });
    });
  }


  /**
   * Render the leaderboard with sorted players
   * @param {Array} players - Array of player objects with id, name, and score
   * @param {string} currentPlayerId - ID of the current player to highlight
   * @returns {string} HTML string for the leaderboard
   */
  renderLeaderboard(players, currentPlayerId = null) {
    // Sort players by score in descending order
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    // Generate leaderboard HTML
    const leaderboardItems = sortedPlayers.map((player, index) => {
      const rank = index + 1;
      const isCurrentPlayer = player.id === currentPlayerId;
      const highlightClass = isCurrentPlayer ? 'current-player' : '';
      
      return `
        <div class="leaderboard-item ${highlightClass}" data-player-id="${player.id}">
          <span class="rank">${rank}</span>
          <span class="name">${isCurrentPlayer ? 'You' : player.name}</span>
          <span class="score">${player.score}</span>
        </div>
      `;
    }).join('');
    
    return `
      <div class="leaderboard">
        <h3>Leaderboard</h3>
        <div class="leaderboard-list">
          ${leaderboardItems}
        </div>
      </div>
    `;
  }

  /**
   * Render phase indicator component
   * Displays current phase name and phase-specific instructions
   * @param {string} phase - Current game phase
   * @param {number} roundNumber - Current round number (0-10)
   * @param {number} secondsRemaining - Seconds remaining on timer (optional)
   * @returns {string} HTML string for phase indicator
   */
  renderPhaseIndicator(phase, roundNumber = 0, secondsRemaining = null) {
    // Phase-specific instructions
    const phaseInstructions = {
      'waiting': 'Waiting for game to start',
      'spinning': 'Selecting topic...',
      'bidding': 'Place your bid',
      'question': 'Answer the question',
      'results': 'Round results',
      'finished': 'Game over'
    };

    const instruction = phaseInstructions[phase] || '';
    const phaseName = phase ? phase.toUpperCase() : 'WAITING';
    const roundDisplay = roundNumber > 0 ? `Round ${roundNumber}/10` : 'Round 0/10';

    // Timer display (if provided)
    const timerHTML = secondsRemaining !== null ? this.renderTimer(secondsRemaining) : '';

    return `
      <div class="phase-indicator phase-${phase}">
        <div class="phase-header">
          <span class="round-number">${roundDisplay}</span>
          <span class="phase-name">${phaseName}</span>
          <span id="timer-container">${timerHTML}</span>
        </div>
        <div class="phase-instruction">${instruction}</div>
      </div>
    `;
  }

  /**
   * Update phase indicator in the DOM
   * @param {string} phase - Current game phase
   * @param {number} roundNumber - Current round number
   */
  updatePhaseIndicator(phase, roundNumber = 0) {
    const phaseContainer = document.getElementById('phase-indicator-container');
    if (!phaseContainer) {
      return;
    }

    phaseContainer.innerHTML = this.renderPhaseIndicator(phase, roundNumber);
  }

  /**
   * Update leaderboard in the DOM
   * Optimized to update only changed elements, not full re-render
   * @param {Array} players - Array of player objects
   */
  updateLeaderboard(players) {
    const leaderboardContainer = document.getElementById('leaderboard-container');
    if (!leaderboardContainer) {
      return;
    }
    
    // Sort players by score in descending order
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    // Check if leaderboard exists, if not create it
    let leaderboardList = leaderboardContainer.querySelector('.leaderboard-list');
    if (!leaderboardList) {
      leaderboardContainer.innerHTML = this.renderLeaderboard(players, this.currentPlayerId);
      return;
    }
    
    // Get existing items
    const existingItems = Array.from(leaderboardList.querySelectorAll('.leaderboard-item'));
    
    // Update existing items or create new ones
    sortedPlayers.forEach((player, index) => {
      const rank = index + 1;
      const isCurrentPlayer = player.id === this.currentPlayerId;
      const existingItem = existingItems.find(item => item.dataset.playerId === player.id);
      
      if (existingItem) {
        // Update existing item
        const rankEl = existingItem.querySelector('.rank');
        const nameEl = existingItem.querySelector('.name');
        const scoreEl = existingItem.querySelector('.score');
        
        if (rankEl && rankEl.textContent !== rank.toString()) {
          rankEl.textContent = rank;
        }
        
        if (nameEl) {
          const displayName = isCurrentPlayer ? 'You' : player.name;
          if (nameEl.textContent !== displayName) {
            nameEl.textContent = displayName;
          }
        }
        
        if (scoreEl && scoreEl.textContent !== player.score.toString()) {
          scoreEl.textContent = player.score;
        }
        
        // Update highlight class
        if (isCurrentPlayer && !existingItem.classList.contains('current-player')) {
          existingItem.classList.add('current-player');
        } else if (!isCurrentPlayer && existingItem.classList.contains('current-player')) {
          existingItem.classList.remove('current-player');
        }
        
        // Move to correct position if needed
        const currentPosition = Array.from(leaderboardList.children).indexOf(existingItem);
        if (currentPosition !== index) {
          if (index === 0) {
            leaderboardList.prepend(existingItem);
          } else {
            const referenceNode = leaderboardList.children[index];
            leaderboardList.insertBefore(existingItem, referenceNode);
          }
        }
      } else {
        // Create new item
        const newItem = document.createElement('div');
        newItem.className = `leaderboard-item ${isCurrentPlayer ? 'current-player' : ''}`;
        newItem.dataset.playerId = player.id;
        newItem.innerHTML = `
          <span class="rank">${rank}</span>
          <span class="name">${isCurrentPlayer ? 'You' : player.name}</span>
          <span class="score">${player.score}</span>
        `;
        
        if (index < leaderboardList.children.length) {
          leaderboardList.insertBefore(newItem, leaderboardList.children[index]);
        } else {
          leaderboardList.appendChild(newItem);
        }
      }
    });
    
    // Remove items for players who left
    const currentPlayerIds = new Set(sortedPlayers.map(p => p.id));
    existingItems.forEach(item => {
      if (!currentPlayerIds.has(item.dataset.playerId)) {
        item.remove();
      }
    });
  }

  /**
   * Render admin login form
   * @returns {string} HTML string for admin login form
   */
  renderAdminLoginForm() {
    return `
      <div class="admin-login-form">
        <h4>Admin Login</h4>
        <input 
          type="password" 
          id="admin-password" 
          placeholder="Enter admin password"
          autocomplete="off"
        />
        <button id="admin-login-button" type="button">
          Login as Admin
        </button>
      </div>
    `;
  }

  /**
   * Render admin controls panel
   * @param {string} currentPhase - Current game phase
   * @param {number} currentRound - Current round number
   * @returns {string} HTML string for admin controls
   */
  renderAdminControls(currentPhase = 'waiting', currentRound = 0) {
    return `
      <div class="admin-panel" id="admin-panel">
        <h4>Admin Controls</h4>
        <button id="admin-start-game" type="button">Start Game</button>
        <button id="admin-spin-wheel" type="button" aria-label="Spin the wheel to select a topic">Spin Wheel</button>
        <button id="admin-next-phase" type="button">Next Phase</button>
        <button id="admin-reset-game" type="button">Reset Game</button>
        <div class="admin-info">
          <p>Phase: <span id="admin-phase-display">${currentPhase}</span></p>
          <p>Round: <span id="admin-round-display">${currentRound}</span>/10</p>
        </div>
        
        <div class="admin-cleanup-panel" id="cleanup-panel">
          <h4>Data Management</h4>
          <div class="data-stats">
            <div class="stat">
              <span class="stat-label">Players:</span>
              <span class="stat-value" id="player-count">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">Rounds:</span>
              <span class="stat-value" id="round-count">0</span>
            </div>
          </div>
          <button id="manual-cleanup-btn" class="btn-cleanup" type="button">Cleanup Game Data</button>
          <div class="cleanup-status" id="cleanup-status"></div>
        </div>
      </div>
    `;
  }

  /**
   * Show admin controls in the DOM
   * @param {string} currentPhase - Current game phase
   * @param {number} currentRound - Current round number
   */
  showAdminControls(currentPhase = 'waiting', currentRound = 0) {
    // Check if admin panel already exists
    let adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
      // Update existing panel
      this.updateAdminInfo(currentPhase, currentRound);
      return;
    }

    // Create admin panel
    const panelHTML = this.renderAdminControls(currentPhase, currentRound);
    document.body.insertAdjacentHTML('beforeend', panelHTML);

    // Add event listeners (these will be connected to game state in the main app)
    // For now, just log actions
    document.getElementById('admin-start-game').addEventListener('click', () => {
      console.log('Admin: Start Game clicked');
      // This will be connected to GameState.startGame() in the main app
    });

    document.getElementById('admin-spin-wheel').addEventListener('click', () => {
      console.log('Admin: Spin Wheel clicked');
      // This will be connected to GameState.transitionToSpinning() in the main app
    });

    document.getElementById('admin-next-phase').addEventListener('click', () => {
      console.log('Admin: Next Phase clicked');
      // This will be connected to phase transition logic in the main app
    });

    document.getElementById('admin-reset-game').addEventListener('click', async () => {
      console.log('Admin: Reset Game clicked');
      
      // Show confirmation dialog
      const confirmed = await this.showConfirmation('Are you sure you want to reset the game? This will reset all scores and start a new game.');
      
      if (confirmed) {
        // Trigger reset game callback if set
        if (this.onResetGame) {
          this.onResetGame();
        }
      }
    });
  }

  /**
   * Hide admin controls from the DOM
   */
  hideAdminControls() {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
      adminPanel.remove();
    }
  }

  /**
   * Update admin info display (phase and round)
   * @param {string} phase - Current game phase
   * @param {number} round - Current round number
   */
  updateAdminInfo(phase, round) {
    const phaseDisplay = document.getElementById('admin-phase-display');
    const roundDisplay = document.getElementById('admin-round-display');

    if (phaseDisplay) {
      phaseDisplay.textContent = phase;
    }

    if (roundDisplay) {
      roundDisplay.textContent = round;
    }
  }

  /**
   * Handle admin login
   * @param {string} password - Admin password entered by user
   */
  async handleAdminLogin(password) {
    if (!this.currentPlayerId) {
      this.showError('You must join the game first');
      return;
    }

    const loginButton = document.getElementById('admin-login-button');
    const passwordInput = document.getElementById('admin-password');

    // Show loading state
    this.showLoading(loginButton, 'Authenticating...');
    this.disableInput('admin-password');

    try {
      // Attempt to authenticate as admin
      const result = await this.playerManager.authenticateAdmin(this.currentPlayerId, password);

      if (result.success) {
        // Clear password input
        if (passwordInput) {
          passwordInput.value = '';
        }

        // Show success message
        this.showSuccess('Admin authentication successful!');

        // Show admin controls
        this.showAdminControls();

        // Remove login form
        const loginForm = document.querySelector('.admin-login-form');
        if (loginForm) {
          loginForm.remove();
        }
      } else {
        // Show error message
        this.showError(result.error);

        // Re-enable form
        this.hideLoading(loginButton, 'Login as Admin');
        this.enableInput('admin-password');
        if (passwordInput) {
          passwordInput.value = '';
          passwordInput.focus();
        }
      }
    } catch (error) {
      console.error('Error during admin login:', error);
      this.showError('An unexpected error occurred. Please try again.');

      // Re-enable form
      this.hideLoading(loginButton, 'Login as Admin');
      this.enableInput('admin-password');
      if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
      }
    }
  }

  /**
   * Render bidding screen with bid input and submit button
   * @param {string} topic - Current topic for the round
   * @param {number} playerScore - Current player's score
   * @param {number} roundNumber - Current round number
   * @returns {string} HTML string for bidding screen
   */
  renderBiddingScreen(topic, playerScore, roundNumber = 1) {
    return `
      <div class="bidding-screen">
        <div class="topic-display">
          <h2>Topic: ${topic}</h2>
        </div>
        
        <div class="player-score-display">
          <p>Your Score: <span class="score-value">${playerScore}</span></p>
        </div>
        
        <div class="bidding-box">
          <h3>How confident are you?</h3>
          
          <div class="bid-input-group">
            <label for="bid-amount">Bid amount:</label>
            <input 
              type="number" 
              id="bid-amount" 
              min="1" 
              max="${playerScore}"
              placeholder="Enter bid"
              autocomplete="off"
            />
          </div>
          
          <button id="submit-bid-button" type="button" class="submit-bid-button">
            SUBMIT BID
          </button>
          
          <div id="bid-error" class="bid-error"></div>
          
          <div class="scoring-rules">
            <p>• Correct: +2x your bid</p>
            <p>• Wrong: -1x your bid</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Initialize bidding screen with event listeners
   * @param {string} topic - Current topic
   * @param {number} playerScore - Current player's score
   * @param {number} roundNumber - Current round number
   */
  initializeBiddingScreen(topic, playerScore, roundNumber = 1) {
    // Render the bidding screen
    const biddingHTML = this.renderBiddingScreen(topic, playerScore, roundNumber);
    const contentArea = document.getElementById('game-content');
    if (contentArea) {
      contentArea.innerHTML = biddingHTML;
    }

    // Add event listeners
    const bidInput = document.getElementById('bid-amount');
    const submitButton = document.getElementById('submit-bid-button');

    if (bidInput && submitButton) {
      // Real-time validation on input
      bidInput.addEventListener('input', () => {
        this.validateBidInput(bidInput.value, playerScore);
      });

      // Submit on button click
      submitButton.addEventListener('click', () => {
        this.handleBidSubmit(bidInput.value, playerScore);
      });

      // Submit on Enter key
      bidInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleBidSubmit(bidInput.value, playerScore);
        }
      });

      // Focus on input
      bidInput.focus();
    }
  }

  /**
   * Validate bid input in real-time
   * @param {string} bidValue - Bid value from input
   * @param {number} playerScore - Current player's score
   * @returns {boolean} True if valid, false otherwise
   */
  validateBidInput(bidValue, playerScore) {
    const bidError = document.getElementById('bid-error');
    if (!bidError) return false;

    const bid = parseFloat(bidValue);

    // Clear error if input is empty
    if (bidValue === '') {
      bidError.textContent = '';
      return false;
    }

    // Check if bid is a valid number
    if (isNaN(bid)) {
      bidError.textContent = 'Please enter a valid number';
      return false;
    }

    // Check if bid is greater than zero
    if (bid <= 0) {
      bidError.textContent = 'Bid must be greater than zero';
      return false;
    }

    // Check if bid exceeds current score
    if (bid > playerScore) {
      bidError.textContent = 'Bid cannot exceed your current score';
      return false;
    }

    // Valid bid
    bidError.textContent = '';
    return true;
  }

  /**
   * Handle bid submission
   * @param {string} bidValue - Bid value from input
   * @param {number} playerScore - Current player's score
   */
  async handleBidSubmit(bidValue, playerScore) {
    const bid = parseFloat(bidValue);
    const submitButton = document.getElementById('submit-bid-button');
    const bidInput = document.getElementById('bid-amount');
    const bidError = document.getElementById('bid-error');

    // Validate bid
    if (!this.validateBidInput(bidValue, playerScore)) {
      return;
    }

    // Prevent double submission
    if (submitButton && submitButton.disabled) {
      return;
    }

    // Show loading state
    if (submitButton) {
      this.showLoading(submitButton, 'Submitting...');
    }
    if (bidInput) {
      this.disableInput('bid-amount');
    }

    try {
      // Submit bid to Firebase
      const result = await this.playerManager.submitBid(this.currentPlayerId, bid);

      if (result.success) {
        // Show confirmation message
        const biddingBox = document.querySelector('.bidding-box');
        if (biddingBox) {
          biddingBox.innerHTML = `
            <div class="bid-confirmation">
              <h3>✓ Bid Submitted</h3>
              <p class="bid-amount-display">You bid: <strong>${bid}</strong> points</p>
              <p class="waiting-message">Waiting for other players...</p>
            </div>
          `;
        }

        // Clear any errors
        this.clearError();
      } else {
        // Show error message
        if (bidError) {
          bidError.textContent = result.error;
        }

        // Re-enable form
        if (submitButton) {
          this.hideLoading(submitButton, 'SUBMIT BID');
        }
        if (bidInput) {
          this.enableInput('bid-amount');
          bidInput.focus();
        }
      }
    } catch (error) {
      console.error('Error submitting bid:', error);
      
      if (bidError) {
        bidError.textContent = 'Failed to submit bid. Please try again.';
      }

      // Re-enable form
      if (submitButton) {
        this.hideLoading(submitButton, 'SUBMIT BID');
      }
      if (bidInput) {
        this.enableInput('bid-amount');
        bidInput.focus();
      }
    }
  }

  /**
   * Render bid summary display
   * @param {number} playerBid - Current player's bid
   * @param {Object} allBids - Object mapping player IDs to bid amounts
   * @returns {string} HTML string for bid summary
   */
  renderBidSummary(playerBid, allBids = {}) {
    // Calculate aggregate statistics
    const bidValues = Object.values(allBids);
    const bidCount = bidValues.length;

    let avgBid = 0;
    let maxBid = 0;
    let minBid = 0;

    if (bidCount > 0) {
      avgBid = Math.round(bidValues.reduce((sum, bid) => sum + bid, 0) / bidCount);
      maxBid = Math.max(...bidValues);
      minBid = Math.min(...bidValues);
    }

    return `
      <div class="bid-summary">
        <h3>Bid Summary</h3>
        <div class="bid-summary-content">
          <p class="player-bid">You bid: <strong>${playerBid}</strong> points</p>
          ${bidCount > 1 ? `
            <p>Average bid: <strong>${avgBid}</strong> points</p>
            <p>Highest bid: <strong>${maxBid}</strong> points</p>
            <p>Lowest bid: <strong>${minBid}</strong> points</p>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Update bid summary in the DOM
   * @param {number} playerBid - Current player's bid
   * @param {Object} allBids - Object mapping player IDs to bid amounts
   */
  updateBidSummary(playerBid, allBids = {}) {
    const bidSummaryContainer = document.getElementById('bid-summary-container');
    if (!bidSummaryContainer) {
      return;
    }

    bidSummaryContainer.innerHTML = this.renderBidSummary(playerBid, allBids);
  }

  /**
   * Render question screen with question text and multiple choice options
   * @param {string} topic - Current topic
   * @param {string} question - Question text
   * @param {Array<string>} choices - Array of 4 answer choices
   * @param {number} playerBid - Current player's bid
   * @param {Object} allBids - All player bids for bid summary
   * @returns {string} HTML string for question screen
   */
  renderQuestionScreen(topic, question, choices, playerBid, allBids = {}) {
    const choicesHTML = choices.map((choice, index) => {
      const letter = String.fromCharCode(65 + index); // A, B, C, D
      return `
        <div class="answer-choice" data-answer-index="${index}">
          <input 
            type="radio" 
            id="answer-${index}" 
            name="answer" 
            value="${index}"
            class="answer-radio"
          />
          <label for="answer-${index}" class="answer-label">
            <span class="answer-letter">${letter}.</span>
            <span class="answer-text">${choice}</span>
          </label>
        </div>
      `;
    }).join('');

    return `
      <div class="question-screen">
        <div class="topic-display-small">
          <p>${topic}</p>
        </div>
        
        <div class="question-display">
          <h2>${question}</h2>
        </div>
        
        <div class="answers-box">
          ${choicesHTML}
        </div>
        
        <button id="submit-answer-button" type="button" class="submit-answer-button" disabled>
          SUBMIT ANSWER
        </button>
        
        <div id="answer-error" class="answer-error"></div>
        
        ${this.renderBidSummary(playerBid, allBids)}
      </div>
    `;
  }

  /**
   * Initialize question screen with event listeners
   * @param {string} topic - Current topic
   * @param {string} question - Question text
   * @param {Array<string>} choices - Array of 4 answer choices
   * @param {number} playerBid - Current player's bid
   * @param {Object} allBids - All player bids
   */
  initializeQuestionScreen(topic, question, choices, playerBid, allBids = {}) {
    // Render the question screen
    const questionHTML = this.renderQuestionScreen(topic, question, choices, playerBid, allBids);
    const contentArea = document.getElementById('game-content');
    if (contentArea) {
      contentArea.innerHTML = questionHTML;
    }

    // Add event listeners for answer selection
    const answerChoices = document.querySelectorAll('.answer-choice');
    const submitButton = document.getElementById('submit-answer-button');

    answerChoices.forEach(choice => {
      choice.addEventListener('click', () => {
        // Get the radio button inside this choice
        const radio = choice.querySelector('.answer-radio');
        if (radio && !radio.disabled) {
          radio.checked = true;
          
          // Remove selected class from all choices
          answerChoices.forEach(c => c.classList.remove('selected'));
          
          // Add selected class to clicked choice
          choice.classList.add('selected');
          
          // Enable submit button
          if (submitButton) {
            submitButton.disabled = false;
          }
        }
      });
    });

    // Handle radio button change
    const radioButtons = document.querySelectorAll('.answer-radio');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          // Remove selected class from all choices
          answerChoices.forEach(c => c.classList.remove('selected'));
          
          // Add selected class to parent choice
          const parentChoice = radio.closest('.answer-choice');
          if (parentChoice) {
            parentChoice.classList.add('selected');
          }
          
          // Enable submit button
          if (submitButton) {
            submitButton.disabled = false;
          }
        }
      });
    });

    // Submit button click handler
    if (submitButton) {
      submitButton.addEventListener('click', () => {
        const selectedRadio = document.querySelector('.answer-radio:checked');
        if (selectedRadio) {
          this.handleAnswerSubmit(parseInt(selectedRadio.value));
        }
      });
    }

    // Handle Enter key submission
    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && submitButton && !submitButton.disabled) {
        e.preventDefault();
        submitButton.click();
      }
    });
  }

  /**
   * Handle answer submission
   * @param {number} answerIndex - Index of selected answer (0-3)
   */
  async handleAnswerSubmit(answerIndex) {
    const submitButton = document.getElementById('submit-answer-button');
    const answerChoices = document.querySelectorAll('.answer-choice');
    const radioButtons = document.querySelectorAll('.answer-radio');
    const answerError = document.getElementById('answer-error');

    // Validate answer index
    if (answerIndex < 0 || answerIndex > 3) {
      if (answerError) {
        answerError.textContent = 'Invalid answer selection';
      }
      return;
    }

    // Prevent double submission
    if (submitButton && submitButton.disabled) {
      return;
    }

    // Show loading state
    if (submitButton) {
      this.showLoading(submitButton, 'Submitting...');
    }

    // Disable all inputs
    radioButtons.forEach(radio => {
      radio.disabled = true;
    });
    answerChoices.forEach(choice => {
      choice.style.pointerEvents = 'none';
    });

    try {
      // Submit answer to Firebase
      const result = await this.submitAnswer(answerIndex);

      if (result.success) {
        // Show confirmation message
        const answersBox = document.querySelector('.answers-box');
        if (answersBox) {
          // Keep the selected answer visible but show confirmation
          const confirmationDiv = document.createElement('div');
          confirmationDiv.className = 'answer-confirmation';
          confirmationDiv.innerHTML = `
            <p>✓ Answer Submitted</p>
            <p class="waiting-message">Waiting for other players...</p>
          `;
          answersBox.parentNode.insertBefore(confirmationDiv, answersBox.nextSibling);
        }

        // Hide submit button
        if (submitButton) {
          submitButton.style.display = 'none';
        }

        // Clear any errors
        this.clearError();
      } else {
        // Show error message
        if (answerError) {
          answerError.textContent = result.error;
        }

        // Re-enable form
        if (submitButton) {
          this.hideLoading(submitButton, 'SUBMIT ANSWER');
        }
        radioButtons.forEach(radio => {
          radio.disabled = false;
        });
        answerChoices.forEach(choice => {
          choice.style.pointerEvents = 'auto';
        });
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      
      if (answerError) {
        answerError.textContent = 'Failed to submit answer. Please try again.';
      }

      // Re-enable form
      if (submitButton) {
        this.hideLoading(submitButton, 'SUBMIT ANSWER');
      }
      radioButtons.forEach(radio => {
        radio.disabled = false;
      });
      answerChoices.forEach(choice => {
        choice.style.pointerEvents = 'auto';
      });
    }
  }

  /**
   * Submit answer to Firebase
   * @param {number} answerIndex - Index of selected answer (0-3)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async submitAnswer(answerIndex) {
    if (!this.currentPlayerId) {
      return {
        success: false,
        error: 'Player ID not found'
      };
    }

    return await this.playerManager.submitAnswer(this.currentPlayerId, answerIndex);
  }

  /**
   * Render results screen with correct/incorrect indicator, score changes, and leaderboard
   * @param {boolean} isCorrect - Whether the current player answered correctly
   * @param {string} correctAnswerText - Text of the correct answer
   * @param {number} playerBid - Current player's bid
   * @param {number} scoreChange - Score change for current player
   * @param {number} newScore - New score for current player
   * @param {Array} players - Array of all players with updated scores
   * @param {Object} allResults - Results for all players (for rank changes)
   * @returns {string} HTML string for results screen
   */
  renderResultsScreen(isCorrect, correctAnswerText, playerBid, scoreChange, newScore, players, allResults = {}) {
    // Calculate rank changes
    const playersWithRankChanges = this._calculateRankChanges(players, allResults);
    
    // Result indicator
    const resultIcon = isCorrect ? '✓' : '✗';
    const resultText = isCorrect ? 'CORRECT!' : 'WRONG!';
    const resultClass = isCorrect ? 'result-correct' : 'result-wrong';
    
    // Score change display
    const scoreChangeSign = scoreChange >= 0 ? '+' : '';
    const scoreChangeClass = scoreChange >= 0 ? 'score-positive' : 'score-negative';
    
    return `
      <div class="results-screen">
        <div class="result-indicator ${resultClass}">
          <h2>${resultIcon} ${resultText}</h2>
        </div>
        
        <div class="correct-answer-display">
          <p>The correct answer was: <strong>${correctAnswerText}</strong></p>
        </div>
        
        <div class="player-results">
          <p class="player-bid-display">Your bid: <strong>${playerBid}</strong> points</p>
          <p class="score-change-display ${scoreChangeClass}">
            Score change: <strong>${scoreChangeSign}${scoreChange}</strong>
          </p>
          <p class="new-score-display">New score: <strong>${newScore}</strong></p>
        </div>
        
        <div id="results-leaderboard-container">
          ${this.renderLeaderboardWithRankChanges(playersWithRankChanges, this.currentPlayerId)}
        </div>
      </div>
    `;
  }

  /**
   * Calculate rank changes for players based on previous and current scores
   * @param {Array} players - Array of player objects with current scores
   * @param {Object} results - Results object with score changes
   * @returns {Array} Players with rank change indicators
   * @private
   */
  _calculateRankChanges(players, results) {
    // Calculate previous scores (before this round)
    const previousPlayers = players.map(player => {
      const result = results[player.id];
      const previousScore = result ? result.newScore - result.scoreChange : player.score;
      return {
        ...player,
        previousScore: previousScore
      };
    });
    
    // Sort by previous scores to get previous ranks
    const previousRanking = [...previousPlayers].sort((a, b) => b.previousScore - a.previousScore);
    const previousRanks = {};
    previousRanking.forEach((player, index) => {
      previousRanks[player.id] = index + 1;
    });
    
    // Sort by current scores to get current ranks
    const currentRanking = [...players].sort((a, b) => b.score - a.score);
    
    // Add rank change indicators
    return currentRanking.map((player, index) => {
      const currentRank = index + 1;
      const previousRank = previousRanks[player.id] || currentRank;
      
      let rankChange = '';
      if (currentRank < previousRank) {
        rankChange = '↑'; // Moved up
      } else if (currentRank > previousRank) {
        rankChange = '↓'; // Moved down
      } else {
        rankChange = '→'; // No change
      }
      
      return {
        ...player,
        rankChange: rankChange,
        rankDiff: previousRank - currentRank
      };
    });
  }

  /**
   * Render leaderboard with rank change indicators
   * @param {Array} players - Array of player objects with rankChange property
   * @param {string} currentPlayerId - ID of the current player to highlight
   * @returns {string} HTML string for leaderboard with rank changes
   */
  renderLeaderboardWithRankChanges(players, currentPlayerId = null) {
    const leaderboardItems = players.map((player, index) => {
      const rank = index + 1;
      const isCurrentPlayer = player.id === currentPlayerId;
      const highlightClass = isCurrentPlayer ? 'current-player' : '';
      
      // Rank change indicator with styling
      let rankChangeClass = '';
      if (player.rankChange === '↑') {
        rankChangeClass = 'rank-up';
      } else if (player.rankChange === '↓') {
        rankChangeClass = 'rank-down';
      } else {
        rankChangeClass = 'rank-same';
      }
      
      return `
        <div class="leaderboard-item ${highlightClass}" data-player-id="${player.id}">
          <span class="rank">${rank}</span>
          <span class="name">${isCurrentPlayer ? 'You' : player.name}</span>
          <span class="score">${player.score}</span>
          <span class="rank-change ${rankChangeClass}">${player.rankChange}</span>
        </div>
      `;
    }).join('');
    
    return `
      <div class="leaderboard">
        <h3>Leaderboard</h3>
        <div class="leaderboard-list">
          ${leaderboardItems}
        </div>
      </div>
    `;
  }

  /**
   * Initialize results screen with data from Firebase
   * @param {string} topic - Current topic
   * @param {string} correctAnswerText - Text of the correct answer
   * @param {number} correctAnswerIndex - Index of the correct answer
   */
  async initializeResultsScreen(topic, correctAnswerText, correctAnswerIndex) {
    try {
      // Get current player's data
      const playersRef = ref(db, `rooms/${this.roomId}/players/${this.currentPlayerId}`);
      const playerSnapshot = await get(playersRef);
      
      if (!playerSnapshot.exists()) {
        this.showError('Player data not found');
        return;
      }
      
      const playerData = playerSnapshot.val();
      
      // Get round results
      const roundNumber = await this._getCurrentRound();
      const resultsRef = ref(db, `rooms/${this.roomId}/rounds/${roundNumber}/results/${this.currentPlayerId}`);
      const resultsSnapshot = await get(resultsRef);
      
      if (!resultsSnapshot.exists()) {
        this.showError('Results not found');
        return;
      }
      
      const result = resultsSnapshot.val();
      
      // Get all players for leaderboard
      const allPlayersRef = ref(db, `rooms/${this.roomId}/players`);
      const allPlayersSnapshot = await get(allPlayersRef);
      
      const allPlayersData = allPlayersSnapshot.exists() ? allPlayersSnapshot.val() : {};
      const players = Object.entries(allPlayersData).map(([id, data]) => ({
        id,
        name: data.name,
        score: data.score
      }));
      
      // Get all results for rank change calculation
      const allResultsRef = ref(db, `rooms/${this.roomId}/rounds/${roundNumber}/results`);
      const allResultsSnapshot = await get(allResultsRef);
      const allResults = allResultsSnapshot.exists() ? allResultsSnapshot.val() : {};
      
      // Get player's bid
      const bidRef = ref(db, `rooms/${this.roomId}/rounds/${roundNumber}/bids/${this.currentPlayerId}`);
      const bidSnapshot = await get(bidRef);
      const playerBid = bidSnapshot.exists() ? bidSnapshot.val() : 0;
      
      // Render results screen
      const resultsHTML = this.renderResultsScreen(
        result.correct,
        correctAnswerText,
        playerBid,
        result.scoreChange,
        result.newScore,
        players,
        allResults
      );
      
      const contentArea = document.getElementById('game-content');
      if (contentArea) {
        contentArea.innerHTML = resultsHTML;
      }
    } catch (error) {
      console.error('Error initializing results screen:', error);
      this.showError('Failed to load results. Please refresh the page.');
    }
  }

  /**
   * Get current round number from Firebase
   * @returns {Promise<number>} Current round number
   * @private
   */
  async _getCurrentRound() {
    const roundRef = ref(db, `rooms/${this.roomId}/roundNumber`);
    const snapshot = await get(roundRef);
    return snapshot.exists() ? snapshot.val() : 0;
  }

  /**
   * Render timer display component
   * @param {number} secondsRemaining - Seconds remaining on timer
   * @returns {string} HTML string for timer display
   */
  renderTimer(secondsRemaining) {
    // Format time as M:SS
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Determine styling based on remaining time
    let timerClass = 'timer';
    if (secondsRemaining < 5) {
      timerClass += ' timer-critical'; // Pulsing animation
    } else if (secondsRemaining < 10) {
      timerClass += ' timer-warning'; // Red text
    }
    
    return `
      <div class="${timerClass}">
        <span class="timer-icon">⏱</span>
        <span class="timer-value">${formattedTime}</span>
      </div>
    `;
  }

  /**
   * Update timer display in the DOM
   * @param {number} secondsRemaining - Seconds remaining on timer
   */
  updateTimer(secondsRemaining) {
    const timerContainer = document.getElementById('timer-container');
    if (!timerContainer) {
      return;
    }
    
    timerContainer.innerHTML = this.renderTimer(secondsRemaining);
  }

  /**
   * Initialize timer display with a timer instance
   * Sets up tick callback to update UI every second
   * @param {PhaseTimer} timer - Timer instance to display
   */
  initializeTimer(timer) {
    if (!timer) {
      return;
    }
    
    // Set up tick callback to update display
    timer.onTick((secondsRemaining) => {
      this.updateTimer(secondsRemaining);
    });
    
    // Initial display
    const initialTime = timer.getRemainingTime();
    this.updateTimer(initialTime);
  }

  /**
   * Clear timer display from the DOM
   */
  clearTimer() {
    const timerContainer = document.getElementById('timer-container');
    if (timerContainer) {
      timerContainer.innerHTML = '';
    }
  }

  /**
   * Render winner screen with final rankings and celebration
   * @param {Object} winner - Winner object with playerId, name, and score
   * @param {Array} rankings - Array of all players with final rankings
   * @param {boolean} isAdmin - Whether current player is admin
   * @returns {string} HTML string for winner screen
   */
  renderWinnerScreen(winner, rankings, isAdmin = false) {
    if (!winner) {
      return `
        <div class="winner-screen">
          <h1>🏆 GAME OVER 🏆</h1>
          <p>No winner could be determined.</p>
        </div>
      `;
    }

    // Generate rankings HTML with medal emojis for top 3
    const rankingsHTML = rankings.map((player) => {
      const isCurrentPlayer = player.playerId === this.currentPlayerId;
      const highlightClass = isCurrentPlayer ? 'current-player' : '';
      
      // Add medal emojis for top 3
      let medalEmoji = '';
      if (player.rank === 1) {
        medalEmoji = '🥇 ';
      } else if (player.rank === 2) {
        medalEmoji = '🥈 ';
      } else if (player.rank === 3) {
        medalEmoji = '🥉 ';
      }
      
      return `
        <div class="leaderboard-item ${highlightClass}" data-player-id="${player.playerId}">
          <span class="rank">${player.rank}.</span>
          <span class="name">${medalEmoji}${isCurrentPlayer ? 'You' : player.name}</span>
          <span class="score">${player.score.toLocaleString()}</span>
        </div>
      `;
    }).join('');

    // Admin reset button (only shown if user is admin)
    const adminResetButton = isAdmin ? `
      <button id="admin-reset-game-winner" type="button" class="reset-game-button">
        RESET GAME
      </button>
    ` : '';

    return `
      <div class="winner-screen">
        <h1 class="game-over-heading">🏆 GAME OVER 🏆</h1>
        
        <div class="winner-announcement">
          <h2>WINNER: ${winner.name}</h2>
          <p class="winner-score">Final Score: <strong>${winner.score.toLocaleString()}</strong></p>
        </div>
        
        <div class="final-rankings">
          <h3>FINAL RANKINGS</h3>
          <div class="leaderboard-list">
            ${rankingsHTML}
          </div>
        </div>
        
        ${adminResetButton}
      </div>
    `;
  }

  /**
   * Initialize winner screen with data from Firebase
   * @param {boolean} isAdmin - Whether current player is admin
   */
  async initializeWinnerScreen(isAdmin = false) {
    try {
      // Get winner from game state
      // This will be called from the main app with GameState instance
      // For now, we'll fetch the data directly
      const playersRef = ref(db, `rooms/${this.roomId}/players`);
      const playersSnapshot = await get(playersRef);
      
      if (!playersSnapshot.exists()) {
        this.showError('No players found');
        return;
      }
      
      const playersData = playersSnapshot.val();
      
      // Convert to array and sort by score
      const playersArray = Object.entries(playersData).map(([id, data]) => ({
        playerId: id,
        name: data.name,
        score: data.score || 0
      }));
      
      playersArray.sort((a, b) => b.score - a.score);
      
      // Add rank numbers
      const rankings = playersArray.map((player, index) => ({
        ...player,
        rank: index + 1
      }));
      
      // Winner is the first player (highest score)
      const winner = rankings[0];
      
      // Render winner screen
      const winnerHTML = this.renderWinnerScreen(winner, rankings, isAdmin);
      
      const contentArea = document.getElementById('game-content');
      if (contentArea) {
        contentArea.innerHTML = winnerHTML;
      }
      
      // Add event listener for admin reset button if present
      if (isAdmin) {
        const resetButton = document.getElementById('admin-reset-game-winner');
        if (resetButton) {
          resetButton.addEventListener('click', async () => {
            console.log('Admin: Reset Game clicked from winner screen');
            
            // Show confirmation dialog
            const confirmed = await this.showConfirmation('Are you sure you want to reset the game? This will reset all scores and start a new game.');
            
            if (confirmed) {
              // Trigger reset game callback if set
              if (this.onResetGame) {
                this.onResetGame();
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error initializing winner screen:', error);
      this.showError('Failed to load winner screen. Please refresh the page.');
    }
  }

  /**
   * Show winner screen with provided winner and rankings data
   * This is a convenience method that can be called with pre-fetched data
   * @param {Object} winner - Winner object with playerId, name, and score
   * @param {Array} rankings - Array of all players with final rankings
   * @param {boolean} isAdmin - Whether current player is admin
   */
  showWinnerScreen(winner, rankings, isAdmin = false) {
    const winnerHTML = this.renderWinnerScreen(winner, rankings, isAdmin);
    
    const contentArea = document.getElementById('game-content');
    if (contentArea) {
      contentArea.innerHTML = winnerHTML;
    }
    
    // Add event listener for admin reset button if present
    if (isAdmin) {
      const resetButton = document.getElementById('admin-reset-game-winner');
      if (resetButton) {
        resetButton.addEventListener('click', async () => {
          console.log('Admin: Reset Game clicked from winner screen');
          
          // Show confirmation dialog
          const confirmed = await this.showConfirmation('Are you sure you want to reset the game? This will reset all scores and start a new game.');
          
          if (confirmed) {
            // Trigger reset game callback if set
            if (this.onResetGame) {
              this.onResetGame();
            }
          }
        });
      }
    }
  }

  /**
   * Update data usage statistics display
   * @param {number} playerCount - Current player count
   * @param {number} roundCount - Current round count
   */
  updateDataUsageStats(playerCount, roundCount) {
    const playerCountEl = document.getElementById('player-count');
    const roundCountEl = document.getElementById('round-count');
    
    if (playerCountEl) {
      playerCountEl.textContent = playerCount;
    }
    
    if (roundCountEl) {
      roundCountEl.textContent = roundCount;
    }
  }

  /**
   * Show cleanup success message
   * @param {number} recordCount - Number of records removed
   */
  showCleanupSuccess(recordCount) {
    const statusEl = document.getElementById('cleanup-status');
    if (statusEl) {
      statusEl.className = 'cleanup-status success';
      statusEl.innerHTML = `
        <strong>Success!</strong> Removed ${recordCount} player record${recordCount !== 1 ? 's' : ''}.
      `;
      statusEl.style.display = 'block';
      
      // Hide after 5 seconds
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 5000);
    }
  }

  /**
   * Show cleanup error message
   * @param {string} errorMsg - Error message to display
   */
  showCleanupError(errorMsg) {
    const statusEl = document.getElementById('cleanup-status');
    if (statusEl) {
      statusEl.className = 'cleanup-status error';
      statusEl.innerHTML = `
        <div class="error-message">
          <strong>Cleanup Failed:</strong> ${errorMsg}<br>
          <small>Please try again or contact support if the issue persists.</small>
        </div>
      `;
      statusEl.style.display = 'block';
    }
  }

  /**
   * Initialize cleanup controls
   * Sets up event listeners and real-time stats updates
   * @param {GameState} gameState - GameState instance
   * @param {string} playerId - Current player ID
   */
  initializeCleanupControls(gameState, playerId) {
    const cleanupBtn = document.getElementById('manual-cleanup-btn');
    
    if (!cleanupBtn) {
      return; // Cleanup controls not present (not admin)
    }
    
    // Set up manual cleanup button
    cleanupBtn.addEventListener('click', async () => {
      // Show confirmation dialog
      const confirmed = await this.showConfirmation(
        'This will permanently remove all player records. Continue?'
      );
      
      if (!confirmed) {
        return;
      }
      
      // Disable button during cleanup
      cleanupBtn.disabled = true;
      cleanupBtn.textContent = 'Cleaning up...';
      
      try {
        // Trigger manual cleanup
        const result = await gameState.manualCleanup(playerId);
        
        if (result.success) {
          this.showCleanupSuccess(result.count);
        } else {
          this.showCleanupError(result.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Error during manual cleanup:', error);
        this.showCleanupError(error.message);
      } finally {
        // Re-enable button
        cleanupBtn.disabled = false;
        cleanupBtn.textContent = 'Cleanup Game Data';
      }
    });
    
    // Set up real-time stats updates
    this.setupDataUsageMonitoring(gameState);
  }

  /**
   * Set up real-time data usage monitoring
   * Updates stats display when data changes
   * @param {GameState} gameState - GameState instance
   */
  async setupDataUsageMonitoring(gameState) {
    // Initial stats load
    const stats = await gameState.getDataUsageStats();
    this.updateDataUsageStats(stats.playerCount, stats.roundCount);
    
    // Listen for player changes
    gameState.onPlayersChange(async () => {
      const stats = await gameState.getDataUsageStats();
      this.updateDataUsageStats(stats.playerCount, stats.roundCount);
    });
    
    // Listen for round changes
    gameState.onRoundChange(async () => {
      const stats = await gameState.getDataUsageStats();
      this.updateDataUsageStats(stats.playerCount, stats.roundCount);
    });
  }
}


