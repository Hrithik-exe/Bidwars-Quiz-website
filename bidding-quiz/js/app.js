/**
 * Main Application Integration Module
 * 
 * This module integrates all components of the multiplayer bidding quiz:
 * - Firebase configuration and database
 * - Game state management and phase transitions
 * - Player management and authentication
 * - UI rendering and user interactions
 * - Spinning wheel and topic selection
 * - Questions and answer handling
 * - Timer management and synchronization
 * 
 * Game Flow:
 * 1. Join Screen → Player enters name and joins
 * 2. Waiting Phase → Players wait for admin to start game
 * 3. Spinning Phase → Wheel spins to select topic (5s)
 * 4. Bidding Phase → Players place bids (30s)
 * 5. Question Phase → Players answer question (20s)
 * 6. Results Phase → Show results and score changes (10s)
 * 7. Repeat steps 3-6 for 10 rounds total
 * 8. Finished Phase → Show winner and final rankings
 */

import { db } from './firebase-config.js';
import { GameState, PHASES } from './game-state.js';
import { PlayerManager } from './player.js';
import { UIManager } from './ui.js';
import { SpinningWheel, TOPICS } from './wheel.js';
import { getQuestionByTopic } from './questions.js';
import { PhaseTimer } from './timer.js';
import { RoomManager } from './room-manager.js';

/**
 * Main Application Class
 */
class BiddingQuizApp {
  /**
   * Initialize the application
   * @param {string} roomId - Game room ID (optional, will show room selection if not provided)
   */
  constructor(roomId = null) {
    // Initialize room manager first
    this.roomManager = new RoomManager();
    
    // Check if roomId is provided or in URL params
    if (!roomId) {
      const urlParams = new URLSearchParams(window.location.search);
      roomId = urlParams.get('room') || localStorage.getItem('currentRoomId');
    }
    
    this.roomId = roomId;
    
    // If no room ID, redirect to room selection
    if (!this.roomId) {
      this.showRoomSelection();
      return;
    }
    
    // Initialize managers with roomId
    this.gameState = new GameState(this.roomId);
    this.playerManager = new PlayerManager(this.roomId);
    this.uiManager = new UIManager(this.roomId);
    this.wheel = new SpinningWheel(this.roomId);
    
    // Set roomManager reference on GameState and PlayerManager
    this.gameState.roomManager = this.roomManager;
    this.playerManager.roomManager = this.roomManager;
    
    // Initialize disconnect detector with PlayerManager
    this.roomManager.initializeDisconnectDetector(this.playerManager);
    
    // Store current player info
    this.currentPlayerId = localStorage.getItem('currentPlayerId') || null;
    this.isAdmin = localStorage.getItem('isAdmin') === 'true' || false;
    this.isSpectator = this.isAdmin; // Admins are spectators
    
    // Store current game data
    this.currentTopic = null;
    this.currentQuestion = null;
    
    // Set up event listeners
    this._setupGameStateListeners();
    this._setupUICallbacks();
    
    // Start inactivity tracking
    this.roomManager.startInactivityTracking();
    
    console.log('Bidding Quiz App initialized for room:', this.roomId);
  }

  /**
   * Show room selection screen
   * Redirects to room-selection.html
   */
  showRoomSelection() {
    console.log('No room ID provided, redirecting to room selection...');
    window.location.href = 'room-selection.html';
  }

  /**
   * Set up game state listeners for phase changes
   * @private
   */
  _setupGameStateListeners() {
    // Listen to phase changes
    this.gameState.onPhaseChange((phase) => {
      console.log(`Phase changed to: ${phase}`);
      this._handlePhaseChange(phase);
    });

    // Listen to round changes
    this.gameState.onRoundChange((round) => {
      console.log(`Round changed to: ${round}`);
      this._updatePhaseIndicator();
    });

    // Listen to topic changes
    this.gameState.onTopicChange((topic) => {
      console.log(`Topic changed to: ${topic}`);
      this.currentTopic = topic;
    });

    // Listen to players changes (for leaderboard updates)
    this.gameState.onPlayersChange((players) => {
      const playersArray = Object.entries(players).map(([id, data]) => ({
        id,
        name: data.name,
        score: data.score
      }));
      this.uiManager.updateLeaderboard(playersArray);
    });
  }

  /**
   * Set up UI callbacks for user interactions
   * @private
   */
  _setupUICallbacks() {
    // Override the join submit handler to store player ID
    const originalHandleJoinSubmit = this.uiManager.handleJoinSubmit.bind(this.uiManager);
    this.uiManager.handleJoinSubmit = async (name) => {
      const result = await this.playerManager.joinGame(name);
      
      if (result.success) {
        // Store player ID in memory and localStorage
        this.currentPlayerId = result.playerId;
        this.uiManager.currentPlayerId = result.playerId;
        localStorage.setItem('currentPlayerId', result.playerId);
        
        // Clear any existing errors
        this.uiManager.clearError();
        
        // Show success message
        this.uiManager.showSuccess('Successfully joined the game!');
        
        // Transition to game interface
        this._renderGameInterface();
        
        console.log('Player joined successfully:', result.playerId);
      } else {
        // Show error message
        this.uiManager.showError(result.error);
        
        // Re-enable form
        const joinButton = document.getElementById('join-button');
        const nameInput = document.getElementById('player-name');
        if (joinButton) {
          this.uiManager.hideLoading(joinButton, 'JOIN GAME');
        }
        if (nameInput) {
          this.uiManager.enableInput('player-name');
          nameInput.focus();
        }
      }
    };

    // Set up reset game callback
    this.uiManager.onResetGame = async () => {
      await this._handleResetGame();
    };
  }

  /**
   * Render the main game interface after joining
   * @private
   */
  _renderGameInterface() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // Get room code from localStorage
    const roomCode = localStorage.getItem('currentRoomCode') || 'UNKNOWN';

    mainContent.innerHTML = `
      <div class="game-interface">
        <div class="room-info-header">
          <div class="room-code-display">
            <span class="room-code-label">Room Code:</span>
            <span class="room-code-value" id="room-code-display">${roomCode}</span>
            <button class="copy-room-code-btn" id="copy-room-code-btn" title="Copy room code">📋</button>
          </div>
          ${this.isSpectator ? '<div class="spectator-indicator">👁️ Spectator Mode</div>' : ''}
        </div>
        
        <div id="phase-indicator-container"></div>
        
        <div class="game-layout">
          <div id="game-content" class="game-content">
            <!-- Phase-specific content will be rendered here -->
          </div>
          
          <div id="leaderboard-container" class="leaderboard-sidebar">
            <!-- Leaderboard will be rendered here -->
          </div>
        </div>
        
        ${!this.isAdmin ? `
          <div id="admin-login-container" class="admin-login-container">
            ${this.uiManager.renderAdminLoginForm()}
          </div>
        ` : ''}
      </div>
    `;

    // Set up copy room code button
    const copyBtn = document.getElementById('copy-room-code-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(roomCode).then(() => {
          this.uiManager.showSuccess('Room code copied to clipboard!');
        }).catch(() => {
          this.uiManager.showError('Failed to copy room code');
        });
      });
    }

    // Set up admin login handler (if not already admin)
    if (!this.isAdmin) {
      const adminLoginButton = document.getElementById('admin-login-button');
      const adminPasswordInput = document.getElementById('admin-password');
      
      if (adminLoginButton && adminPasswordInput) {
        adminLoginButton.addEventListener('click', async () => {
          await this._handleAdminLogin(adminPasswordInput.value);
        });

        adminPasswordInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            adminLoginButton.click();
          }
        });
      }
    } else {
      // User is already admin - show admin controls immediately
      this._showAdminControls();
    }

    // Initialize leaderboard listener
    this.uiManager.initializeLeaderboard();

    // Render current phase
    const currentPhase = this.gameState.getCurrentPhase();
    if (currentPhase) {
      this._handlePhaseChange(currentPhase);
    } else {
      // Default to waiting phase
      this._renderWaitingPhase();
    }

    // Update phase indicator
    this._updatePhaseIndicator();
  }

  /**
   * Handle admin login
   * @param {string} password - Admin password
   * @private
   */
  async _handleAdminLogin(password) {
    if (!this.currentPlayerId) {
      this.uiManager.showError('You must join the game first');
      return;
    }

    const loginButton = document.getElementById('admin-login-button');
    const passwordInput = document.getElementById('admin-password');

    // Show loading state
    if (loginButton) {
      this.uiManager.showLoading(loginButton, 'Authenticating...');
    }
    if (passwordInput) {
      this.uiManager.disableInput('admin-password');
    }

    try {
      const result = await this.playerManager.authenticateAdmin(this.currentPlayerId, password);

      if (result.success) {
        this.isAdmin = true;
        
        // Clear password input
        if (passwordInput) {
          passwordInput.value = '';
        }

        // Show success message
        this.uiManager.showSuccess('Admin authentication successful!');

        // Show admin controls
        this._showAdminControls();

        // Remove login form
        const loginContainer = document.getElementById('admin-login-container');
        if (loginContainer) {
          loginContainer.remove();
        }
      } else {
        // Show error message
        this.uiManager.showError(result.error);

        // Re-enable form
        if (loginButton) {
          this.uiManager.hideLoading(loginButton, 'Login as Admin');
        }
        if (passwordInput) {
          this.uiManager.enableInput('admin-password');
          passwordInput.value = '';
          passwordInput.focus();
        }
      }
    } catch (error) {
      console.error('Error during admin login:', error);
      this.uiManager.showError('An unexpected error occurred. Please try again.');

      // Re-enable form
      if (loginButton) {
        this.uiManager.hideLoading(loginButton, 'Login as Admin');
      }
      if (passwordInput) {
        this.uiManager.enableInput('admin-password');
        passwordInput.value = '';
        passwordInput.focus();
      }
    }
  }

  /**
   * Show admin controls and connect to game state methods
   * @private
   */
  _showAdminControls() {
    const currentPhase = this.gameState.getCurrentPhase() || 'waiting';
    const currentRound = this.gameState.getCurrentRound();
    
    this.uiManager.showAdminControls(currentPhase, currentRound);

    // Connect admin control buttons to game state methods
    const startGameButton = document.getElementById('admin-start-game');
    const spinWheelButton = document.getElementById('admin-spin-wheel');
    const nextPhaseButton = document.getElementById('admin-next-phase');
    const resetGameButton = document.getElementById('admin-reset-game');

    if (startGameButton) {
      startGameButton.addEventListener('click', async () => {
        await this._handleStartGame();
      });
    }

    if (spinWheelButton) {
      spinWheelButton.addEventListener('click', async () => {
        await this._handleSpinWheel();
      });
    }

    if (nextPhaseButton) {
      nextPhaseButton.addEventListener('click', async () => {
        await this._handleNextPhase();
      });
    }

    if (resetGameButton) {
      resetGameButton.addEventListener('click', async () => {
        const confirmed = await this.uiManager.showConfirmation(
          'Are you sure you want to reset the game? This will reset all scores and start a new game.'
        );
        
        if (confirmed) {
          await this._handleResetGame();
        }
      });
    }
    
    // Initialize cleanup controls
    this.uiManager.initializeCleanupControls(this.gameState, this.currentPlayerId);
  }

  /**
   * Handle start game button (admin only)
   * @private
   */
  async _handleStartGame() {
    if (!this.isAdmin) {
      this.uiManager.showError('Only admins can start the game');
      return;
    }

    const result = await this.gameState.startGame(this.currentPlayerId);
    
    if (result.success) {
      this.uiManager.showSuccess('Game started!');
    } else {
      this.uiManager.showError(result.error);
    }
  }

  /**
   * Handle spin wheel button (admin only)
   * @private
   */
  async _handleSpinWheel() {
    if (!this.isAdmin) {
      this.uiManager.showError('Only admins can spin the wheel');
      return;
    }

    await this.gameState.transitionToSpinning();
  }

  /**
   * Handle next phase button (admin only)
   * @private
   */
  async _handleNextPhase() {
    if (!this.isAdmin) {
      this.uiManager.showError('Only admins can advance phases');
      return;
    }

    const result = await this.gameState.advancePhase(this.currentPlayerId);
    
    if (result.success) {
      this.uiManager.showSuccess('Phase advanced!');
    } else {
      this.uiManager.showError(result.error);
    }
  }

  /**
   * Handle reset game button (admin only)
   * @private
   */
  async _handleResetGame() {
    if (!this.isAdmin) {
      this.uiManager.showError('Only admins can reset the game');
      return;
    }

    const result = await this.gameState.resetGame(this.currentPlayerId);
    
    if (result.success) {
      this.uiManager.showSuccess('Game reset successfully!');
      
      // Refresh the page to reset UI state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      this.uiManager.showError(result.error);
    }
  }

  /**
   * Handle phase changes and render appropriate screens
   * @param {string} phase - New phase
   * @private
   */
  async _handlePhaseChange(phase) {
    // Update phase indicator
    this._updatePhaseIndicator();

    // Update admin controls if visible
    if (this.isAdmin) {
      const currentRound = this.gameState.getCurrentRound();
      this.uiManager.updateAdminInfo(phase, currentRound);
    }

    // Render phase-specific content
    switch (phase) {
      case PHASES.WAITING:
        this._renderWaitingPhase();
        break;
      
      case PHASES.SPINNING:
        await this._renderSpinningPhase();
        break;
      
      case PHASES.BIDDING:
        await this._renderBiddingPhase();
        break;
      
      case PHASES.QUESTION:
        await this._renderQuestionPhase();
        break;
      
      case PHASES.RESULTS:
        await this._renderResultsPhase();
        break;
      
      case PHASES.FINISHED:
        await this._renderFinishedPhase();
        break;
      
      default:
        console.warn(`Unknown phase: ${phase}`);
    }

    // Set up timer for this phase
    this._setupPhaseTimer();
  }

  /**
   * Update phase indicator in the UI
   * @private
   */
  _updatePhaseIndicator() {
    const phase = this.gameState.getCurrentPhase() || 'waiting';
    const round = this.gameState.getCurrentRound();
    this.uiManager.updatePhaseIndicator(phase, round);
  }

  /**
   * Set up timer for current phase
   * @private
   */
  _setupPhaseTimer() {
    const timer = this.gameState.getCurrentTimer();
    if (timer) {
      this.uiManager.initializeTimer(timer);
    } else {
      this.uiManager.clearTimer();
    }
  }

  /**
   * Render waiting phase screen
   * @private
   */
  _renderWaitingPhase() {
    const gameContent = document.getElementById('game-content');
    if (!gameContent) return;

    gameContent.innerHTML = `
      <div class="waiting-screen">
        <h2>Waiting for game to start...</h2>
        <p class="player-count"></p>
        <p class="waiting-instruction">
          ${this.isAdmin ? 'Click "Start Game" to begin!' : 'Waiting for admin to start the game.'}
        </p>
      </div>
    `;
  }

  /**
   * Render spinning phase screen
   * @private
   */
  async _renderSpinningPhase() {
    const gameContent = document.getElementById('game-content');
    if (!gameContent) return;

    // Clear content and render wheel
    gameContent.innerHTML = '<div id="wheel-container-main"></div>';
    
    const wheelContainer = document.getElementById('wheel-container-main');
    if (wheelContainer) {
      this.wheel.render(wheelContainer);
      
      // Spin the wheel (will automatically select topic and write to Firebase)
      const selectedTopic = await this.wheel.spin();
      
      if (selectedTopic) {
        console.log(`Wheel selected topic: ${selectedTopic}`);
        this.currentTopic = selectedTopic;
      }
    }
  }

  /**
   * Render bidding phase screen
   * @private
   */
  async _renderBiddingPhase() {
    // Get current topic
    const topic = this.gameState.getCurrentTopic() || this.currentTopic;
    
    if (!topic) {
      console.error('No topic available for bidding phase');
      return;
    }

    // Get current player's score
    const players = await this.gameState.getPlayers();
    const playerData = players[this.currentPlayerId];
    
    if (!playerData) {
      console.error('Player data not found');
      return;
    }

    const playerScore = playerData.score;
    const roundNumber = this.gameState.getCurrentRound();

    // Initialize bidding screen
    this.uiManager.initializeBiddingScreen(topic, playerScore, roundNumber);
  }

  /**
   * Render question phase screen
   * @private
   */
  async _renderQuestionPhase() {
    // Get current topic
    const topic = this.gameState.getCurrentTopic() || this.currentTopic;
    
    if (!topic) {
      console.error('No topic available for question phase');
      return;
    }

    // Get question for this topic
    const questionData = getQuestionByTopic(topic);
    
    if (!questionData) {
      console.error(`No question found for topic: ${topic}`);
      return;
    }

    this.currentQuestion = questionData;

    // Get current player's bid
    const roundNumber = this.gameState.getCurrentRound();
    const bids = await this.playerManager.getCurrentRoundBids();
    const playerBid = bids[this.currentPlayerId] || 0;

    // Initialize question screen
    this.uiManager.initializeQuestionScreen(
      topic,
      questionData.question,
      questionData.choices,
      playerBid,
      bids
    );
  }

  /**
   * Render results phase screen
   * @private
   */
  async _renderResultsPhase() {
    if (!this.currentQuestion) {
      console.error('No question data available for results');
      return;
    }

    // Calculate and update scores
    const correctAnswerIndex = this.currentQuestion.correctAnswer;
    const results = await this.gameState.processRoundResults(correctAnswerIndex);

    // Get correct answer text
    const correctAnswerText = this.currentQuestion.choices[correctAnswerIndex];

    // Initialize results screen
    await this.uiManager.initializeResultsScreen(
      this.currentQuestion.topic,
      correctAnswerText,
      correctAnswerIndex
    );
  }

  /**
   * Render finished phase screen (winner screen)
   * @private
   */
  async _renderFinishedPhase() {
    // Get winner and rankings
    const winner = await this.gameState.identifyWinner();
    const rankings = await this.gameState.getFinalRankings();

    // Show winner screen
    this.uiManager.showWinnerScreen(winner, rankings, this.isAdmin);
  }

  /**
   * Start the application
   */
  async start() {
    console.log('Starting Bidding Quiz App...');
    
    // If no room ID, we already redirected in constructor
    if (!this.roomId) {
      return;
    }
    
    // Hide loading indicator
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }

    // Show main content
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.display = 'block';
    }

    // If player already joined (has ID), render game interface
    if (this.currentPlayerId) {
      this._renderGameInterface();
      console.log('App started - Game interface rendered');
    } else {
      // Otherwise, show join screen
      this.uiManager.renderJoinScreen();
      console.log('App started - Join screen rendered');
    }
  }

  /**
   * Cleanup method to stop monitoring and release resources
   * Should be called when app is destroyed or page is unloaded
   */
  cleanup() {
    console.log('Cleaning up BiddingQuizApp...');
    
    // Stop disconnect monitoring
    if (this.roomManager && this.roomManager.disconnectDetector && this.roomId) {
      this.roomManager.disconnectDetector.stopMonitoring(this.roomId);
    }
    
    // Stop inactivity tracking
    if (this.roomManager) {
      this.roomManager.stopInactivityTracking();
    }
  }
}

// Initialize and start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new BiddingQuizApp();
  app.start();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    app.cleanup();
  });
});

// Export for testing/debugging
export { BiddingQuizApp };
// Deployment fix v1.0.2