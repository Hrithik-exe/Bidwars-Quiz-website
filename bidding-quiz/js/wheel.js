/**
 * Spinning Wheel Module
 * 
 * This module manages the spinning wheel animation and topic selection
 * for the multiplayer bidding quiz application.
 * 
 * Exports:
 * - SpinningWheel: Class for rendering and animating the topic selection wheel
 * - TOPICS: Array of predefined topics
 */

import { db } from './firebase-config.js';
import { ref, set, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

/**
 * Predefined topics for the quiz
 */
export const TOPICS = [
  'Science & Technology',
  'World History',
  'Geography',
  'Literature & Arts',
  'Sports & Games',
  'Music & Entertainment',
  'Food & Culture',
  'Nature & Animals',
  'Mathematics & Logic',
  'Current Events'
];

/**
 * SpinningWheel class for topic selection and animation
 */
export class SpinningWheel {
  /**
   * Create a new SpinningWheel instance
   * @param {string} roomId - The game room ID
   * @param {Function} onComplete - Callback when wheel animation completes
   */
  constructor(roomId, onComplete = null) {
    this.roomId = roomId;
    this.onComplete = onComplete;
    this.wheelElement = null;
    this.isSpinning = false;
    this.selectedTopic = null;
    
    // New properties for wheel enhancements
    this.usedTopics = new Set();
    this.ariaLiveRegion = null;
    this.highlightTimeout = null;
    this.animationFrameId = null;
    this.spinStartTime = null;
    
    // Performance monitoring properties
    this.frameTimestamps = [];
    this.renderStartTime = null;
    this.isMonitoringPerformance = false;
  }

  /**
   * Get available topics (topics not yet used)
   * @returns {Promise<Array<string>>} Array of available topic names
   */
  async getAvailableTopics() {
    try {
      const usedTopicsRef = ref(db, `rooms/${this.roomId}/usedTopics`);
      const snapshot = await get(usedTopicsRef);
      const usedTopics = snapshot.exists() ? snapshot.val() : [];
      
      // Filter out used topics
      return TOPICS.filter(topic => !usedTopics.includes(topic));
    } catch (error) {
      // Handle Firebase read failures: assume all topics available, log error
      console.error('Firebase read failure - assuming all topics available:', error);
      return TOPICS;
    }
  }

  /**
   * Select a random topic from available topics
   * @returns {Promise<string|null>} Selected topic or null if no topics available
   */
  async selectRandomTopic() {
    const availableTopics = await this.getAvailableTopics();
    
    // Handle case when no topics available
    if (availableTopics.length === 0) {
      console.error('No available topics remaining - cannot spin wheel');
      this.announceToScreenReader('No topics available');
      return null;
    }
    
    // Select random topic
    const randomIndex = Math.floor(Math.random() * availableTopics.length);
    const selectedTopic = availableTopics[randomIndex];
    
    // Store selected topic
    this.selectedTopic = selectedTopic;
    
    // Write to Firebase
    await this.writeTopicToFirebase(selectedTopic);
    
    return selectedTopic;
  }

  /**
   * Write selected topic to Firebase
   * @param {string} topic - The selected topic
   * @private
   */
  async writeTopicToFirebase(topic) {
    try {
      // Get current used topics
      const usedTopicsRef = ref(db, `rooms/${this.roomId}/usedTopics`);
      const snapshot = await get(usedTopicsRef);
      const usedTopics = snapshot.exists() ? snapshot.val() : [];
      
      // Add new topic to used topics
      const updatedUsedTopics = [...usedTopics, topic];
      
      // Update Firebase with both currentTopic and usedTopics
      const updates = {
        [`rooms/${this.roomId}/currentTopic`]: topic,
        [`rooms/${this.roomId}/usedTopics`]: updatedUsedTopics
      };
      
      await update(ref(db), updates);
    } catch (error) {
      console.error('Error writing topic to Firebase:', error);
      throw error;
    }
  }

  /**
   * Render the wheel HTML
   * @param {HTMLElement} containerElement - Container to render wheel into
   */
  render(containerElement) {
    return this.measureRenderTime(() => {
      if (!containerElement) {
        console.error('Container element is required');
        return;
      }
      
      // Create wheel container
      const wheelContainer = document.createElement('div');
      wheelContainer.className = 'wheel-container';
      wheelContainer.innerHTML = `
        <div class="wheel-pointer">▼</div>
        <div class="wheel" id="spinning-wheel" aria-label="Topic selection wheel">
          ${TOPICS.map((topic, index) => `
            <div class="wheel-segment" style="transform: rotate(${index * 36}deg)">
              <span class="wheel-segment-text">${topic}</span>
            </div>
          `).join('')}
        </div>
        <div class="wheel-status">Selecting topic...</div>
        <div class="wheel-aria-live" role="status" aria-live="polite" aria-atomic="true"></div>
      `;
      
      // Clear container and add wheel
      containerElement.innerHTML = '';
      containerElement.appendChild(wheelContainer);
      
      // Store reference to wheel element
      this.wheelElement = document.getElementById('spinning-wheel');
      
      // Store reference to ARIA live region
      this.ariaLiveRegion = wheelContainer.querySelector('.wheel-aria-live');
    });
  }

  /**
   * Render wheel with visual distinction for used topics
   * @param {HTMLElement} containerElement - Container to render wheel into
   * @param {Array<string>} usedTopics - Topics already used in the game
   */
  renderWithUsedTopics(containerElement, usedTopics = []) {
    return this.measureRenderTime(() => {
      if (!containerElement) {
        console.error('Container element is required');
        return;
      }
      
      // Update internal used topics set
      this.usedTopics = new Set(usedTopics);
      
      // Calculate available topics count
      const availableCount = TOPICS.length - usedTopics.length;
      
      // Create wheel container
      const wheelContainer = document.createElement('div');
      wheelContainer.className = 'wheel-container';
      wheelContainer.innerHTML = `
        <div class="wheel-pointer">▼</div>
        <div class="wheel" id="spinning-wheel" aria-label="Topic selection wheel">
          ${TOPICS.map((topic, index) => {
            const isUsed = usedTopics.includes(topic);
            const segmentClass = isUsed ? 'wheel-segment wheel-segment--used' : 'wheel-segment wheel-segment--available';
            return `
              <div class="${segmentClass}" data-topic="${topic}" style="transform: rotate(${index * 36}deg)">
                <span class="wheel-segment-text">${topic}</span>
              </div>
            `;
          }).join('')}
          <div class="wheel-topic-overlay" id="wheel-topic-overlay"></div>
        </div>
        <div class="wheel-status">
          ${availableCount > 0 
            ? `${availableCount} topic${availableCount !== 1 ? 's' : ''} remaining` 
            : 'No topics available'}
        </div>
        <div class="wheel-aria-live" role="status" aria-live="polite" aria-atomic="true"></div>
      `;
      
      // Clear container and add wheel
      containerElement.innerHTML = '';
      containerElement.appendChild(wheelContainer);
      
      // Store reference to wheel element
      this.wheelElement = document.getElementById('spinning-wheel');
      
      // Store reference to ARIA live region
      this.ariaLiveRegion = wheelContainer.querySelector('.wheel-aria-live');
    });
  }
  /**
   * Update the topic count display without re-rendering the wheel
   * Shows "X topics remaining" or "No topics available"
   */
  updateTopicCountDisplay() {
    // Find the wheel status element
    const statusElement = this.wheelElement?.parentElement?.querySelector('.wheel-status');

    if (!statusElement) {
      console.warn('Wheel status element not found');
      return;
    }

    // Calculate available topics count
    const availableCount = TOPICS.length - this.usedTopics.size;

    // Update the display text
    if (availableCount === 0) {
      statusElement.textContent = 'No topics available';
    } else if (availableCount === 1) {
      statusElement.textContent = '1 topic remaining';
    } else {
      statusElement.textContent = `${availableCount} topics remaining`;
    }
  }

  /**
   * Spin the wheel and select a topic
   * Uses CSS transform-based animation with hardware acceleration
   * @returns {Promise<string|null>} Selected topic
   */
  async spin() {
    if (this.isSpinning) {
      console.warn('Wheel is already spinning');
      return null;
    }
    
    this.isSpinning = true;
    
    try {
      // Select random topic first
      const selectedTopic = await this.selectRandomTopic();
      
      // Handle case when no topics available
      if (!selectedTopic) {
        this.isSpinning = false;
        // Disable spin by showing message in status
        const statusElement = this.wheelElement?.parentElement?.querySelector('.wheel-status');
        if (statusElement) {
          statusElement.textContent = 'No topics available - cannot spin';
        }
        return null;
      }
      
      // Calculate rotation
      const rotation = this.calculateRotation(selectedTopic);
      
      // Apply animation using requestAnimationFrame for optimal performance
      // Batches DOM changes to minimize reflows and leverage hardware acceleration
      if (this.wheelElement) {
        requestAnimationFrame(() => {
          // CSS transform with will-change: transform enables GPU acceleration
          this.wheelElement.style.transform = `rotate(${rotation}deg)`;
          this.wheelElement.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        });
      }
      
      // Wait for animation to complete (5 seconds)
      // No DOM manipulations during animation - pure CSS transform
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      this.isSpinning = false;
      
      // Call completion callback
      if (this.onComplete) {
        this.onComplete(selectedTopic);
      }
      
      return selectedTopic;
    } catch (error) {
      console.error('Error spinning wheel:', error);
      this.isSpinning = false;
      return null;
    }
  }

  /**
   * Calculate rotation degrees to land on selected topic
   * @param {string} topic - The selected topic
   * @returns {number} Rotation in degrees
   * @private
   */
  calculateRotation(topic) {
    // Find index of selected topic
    const topicIndex = TOPICS.indexOf(topic);
    
    if (topicIndex === -1) {
      console.error('Topic not found in TOPICS array');
      return 1440; // Default to 4 full spins
    }
    
    // Each segment is 36 degrees (360 / 10)
    const segmentAngle = 36;
    
    // Calculate target angle for this segment
    const targetAngle = topicIndex * segmentAngle;
    
    // Add 3-5 full spins (1080° to 1800°)
    const fullSpins = 1080 + Math.floor(Math.random() * 721); // Random between 1080 and 1800
    
    // Total rotation = full spins + target angle
    const totalRotation = fullSpins + targetAngle;
    
    return totalRotation;
  }

  /**
   * Calculate enhanced rotation with improved physics and precise alignment
   * Ensures minimum 3 full rotations (1080 degrees) and precise landing on target topic
   * @param {string} topic - The selected topic
   * @returns {{rotation: number, duration: number}} Rotation in degrees and duration in seconds
   */
  calculateEnhancedRotation(topic) {
    // Find index of selected topic
    const topicIndex = TOPICS.indexOf(topic);
    
    if (topicIndex === -1) {
      console.error('Topic not found in TOPICS array');
      return { rotation: 1440, duration: 5 }; // Default to 4 full spins, 5 seconds
    }
    
    // Each segment is 36 degrees (360 / 10 topics)
    const segmentAngle = 36;
    
    // Calculate the center angle of the target segment
    // The pointer is at the top (0 degrees), so we need to rotate to align the segment center with the pointer
    const segmentCenterAngle = topicIndex * segmentAngle + (segmentAngle / 2);
    
    // Minimum 3 full rotations (1080 degrees)
    const minRotation = 1080;
    
    // Add random additional full rotations (0-3 extra full rotations = 0-1080 degrees)
    const extraRotations = Math.floor(Math.random() * 4) * 360;
    
    // Calculate total rotation to land precisely on target segment
    // We need to account for the current rotation (assume starting at 0)
    const totalRotation = minRotation + extraRotations + segmentCenterAngle;
    
    // Randomize spin duration between 3-7 seconds
    const duration = 3 + Math.random() * 4; // Random between 3 and 7 seconds
    
    return {
      rotation: totalRotation,
      duration: duration
    };
  }

  /**
   * Spin wheel with enhanced easing and timing
   * Uses cubic-bezier easing for realistic deceleration
   * Optimized for hardware acceleration with minimal DOM manipulations
   * @returns {Promise<string|null>} Selected topic
   */
  async spinWithEnhancedAnimation() {
    if (this.isSpinning) {
      console.warn('Wheel is already spinning');
      return null;
    }

    this.isSpinning = true;

    // Start performance monitoring
    this.startPerformanceMonitoring();

    // Announce to screen readers that topic selection is starting
    this.announceToScreenReader('Selecting topic');

    try {
      // Select random topic first
      const selectedTopic = await this.selectRandomTopic();

      // Handle case when no topics available
      if (!selectedTopic) {
        this.isSpinning = false;
        this.stopPerformanceMonitoring();
        // Disable spin by showing message in status
        const statusElement = this.wheelElement?.parentElement?.querySelector('.wheel-status');
        if (statusElement) {
          statusElement.textContent = 'No topics available - cannot spin';
        }
        return null;
      }

      // Calculate enhanced rotation with duration
      const { rotation, duration } = this.calculateEnhancedRotation(selectedTopic);

      // Track animation start time
      this.spinStartTime = Date.now();

      // Batch DOM manipulations to minimize reflows
      // Apply all changes in a single operation for optimal performance
      if (this.wheelElement) {
        // Use requestAnimationFrame to ensure changes happen in the next frame
        // This leverages hardware acceleration and prevents layout thrashing
        requestAnimationFrame(() => {
          this.wheelElement.classList.add('wheel--spinning');
          
          // Apply transform and transition in one operation
          // CSS transform uses GPU acceleration via will-change: transform
          this.wheelElement.style.transform = `rotate(${rotation}deg)`;
          this.wheelElement.style.transition = `transform ${duration}s cubic-bezier(0.33, 1, 0.68, 1)`;
        });
      }

      // Wait for animation to complete
      // No DOM manipulations occur during this period - pure CSS animation
      await new Promise(resolve => setTimeout(resolve, duration * 1000));

      // Stop performance monitoring
      this.stopPerformanceMonitoring();

      // Remove spinning class after animation completes
      if (this.wheelElement) {
        this.wheelElement.classList.remove('wheel--spinning');
      }

      this.isSpinning = false;

      // Announce the selected topic to screen readers
      this.announceToScreenReader(`Selected topic: ${selectedTopic}`);

      // Call completion callback
      if (this.onComplete) {
        this.onComplete(selectedTopic);
      }

      return selectedTopic;
    } catch (error) {
      console.error('Error spinning wheel:', error);
      this.isSpinning = false;

      // Stop performance monitoring on error
      this.stopPerformanceMonitoring();

      // Remove spinning class on error
      if (this.wheelElement) {
        this.wheelElement.classList.remove('wheel--spinning');
      }

      return null;
    }
  }

  /**
   * Highlight the selected topic segment
   * Applies visual feedback by highlighting the segment and displaying the topic name
   * @param {string} topic - Selected topic name
   * @param {number} duration - Highlight duration in milliseconds (default: 2000ms)
   */
  highlightSelectedTopic(topic, duration = 2000) {
    if (!this.wheelElement) {
      console.warn('Wheel element not found');
      return;
    }

    // Find the segment for the selected topic
    const segments = this.wheelElement.querySelectorAll('.wheel-segment');
    let selectedSegment = null;

    segments.forEach(segment => {
      const segmentTopic = segment.getAttribute('data-topic');
      if (segmentTopic === topic) {
        selectedSegment = segment;
      }
    });

    if (!selectedSegment) {
      console.warn(`Segment for topic "${topic}" not found`);
      return;
    }

    // Apply the selected CSS class to the segment
    selectedSegment.classList.add('wheel-segment--selected');

    // Display topic name in the overlay element
    const overlay = this.wheelElement.querySelector('.wheel-topic-overlay');
    if (overlay) {
      overlay.textContent = topic;
      overlay.style.display = 'block';
    }

    // Clear any existing highlight timeout
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }

    // Set timeout to remove highlight after duration
    this.highlightTimeout = setTimeout(() => {
      // Remove the selected class
      selectedSegment.classList.remove('wheel-segment--selected');

      // Hide the overlay
      if (overlay) {
        overlay.style.display = 'none';
        overlay.textContent = '';
      }

      // Clear the timeout reference
      this.highlightTimeout = null;
    }, duration);
  }

  /**
   * Update ARIA live region with announcement for screen readers
   * @param {string} message - Message to announce to screen readers
   */
  announceToScreenReader(message) {
    if (!this.ariaLiveRegion) {
      console.warn('ARIA live region not found');
      return;
    }

    // Update the ARIA live region with the message
    this.ariaLiveRegion.textContent = message;
  }

  /**
   * Update the wheel with available topics
   * @param {Array<string>} availableTopics - Array of available topics
   */
  updateTopics(availableTopics) {
    if (!this.wheelElement) {
      console.warn('Wheel element not found');
      return;
    }
    
    // Re-render wheel with updated topics
    // This is a simple implementation - could be optimized
    const container = this.wheelElement.parentElement.parentElement;
    this.render(container);
  }

  /**
   * Render wheel with player names as segments
   * @param {HTMLElement} containerElement - Container to render wheel into
   * @param {Array<{id: string, name: string, score: number}>} players - Array of player objects
   */
  renderWithPlayerNames(containerElement, players = []) {
    return this.measureRenderTime(() => {
      if (!containerElement) {
        console.error('Container element is required');
        return;
      }
      
      if (!players || players.length === 0) {
        console.warn('No players provided for wheel');
        containerElement.innerHTML = '<div class="wheel-status">No players available</div>';
        return;
      }
      
      // Calculate segment angle based on number of players
      const segmentAngle = 360 / players.length;
      
      // Generate colors for each player
      const colors = this.generatePlayerColors(players.length);
      
      // Create wheel container
      const wheelContainer = document.createElement('div');
      wheelContainer.className = 'wheel-container';
      wheelContainer.innerHTML = `
        <div class="wheel-pointer">▼</div>
        <div class="wheel wheel-players" id="spinning-wheel" aria-label="Player selection wheel">
          ${players.map((player, index) => `
            <div class="wheel-segment wheel-segment-player" 
                 data-player-id="${player.id}" 
                 data-player-name="${player.name}"
                 style="transform: rotate(${index * segmentAngle}deg); 
                        --segment-angle: ${segmentAngle}deg;
                        --segment-color: ${colors[index]};">
              <span class="wheel-segment-text">${player.name}</span>
            </div>
          `).join('')}
          <div class="wheel-topic-overlay" id="wheel-topic-overlay"></div>
        </div>
        <div class="wheel-status">${players.length} player${players.length !== 1 ? 's' : ''} in game</div>
        <div class="wheel-aria-live" role="status" aria-live="polite" aria-atomic="true"></div>
      `;
      
      // Clear container and add wheel
      containerElement.innerHTML = '';
      containerElement.appendChild(wheelContainer);
      
      // Store reference to wheel element
      this.wheelElement = document.getElementById('spinning-wheel');
      
      // Store reference to ARIA live region
      this.ariaLiveRegion = wheelContainer.querySelector('.wheel-aria-live');
      
      // Store players for spinning
      this.currentPlayers = players;
    });
  }

  /**
   * Generate distinct colors for player segments
   * @param {number} count - Number of colors to generate
   * @returns {Array<string>} Array of color strings
   * @private
   */
  generatePlayerColors(count) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
      '#E63946', '#457B9D', '#F77F00', '#06FFA5', '#9D4EDD'
    ];
    
    // If we need more colors than predefined, generate them
    if (count > colors.length) {
      for (let i = colors.length; i < count; i++) {
        const hue = (i * 137.508) % 360; // Golden angle for good distribution
        colors.push(`hsl(${hue}, 70%, 60%)`);
      }
    }
    
    return colors.slice(0, count);
  }

  /**
   * Spin wheel and select a random player
   * @returns {Promise<{id: string, name: string}|null>} Selected player or null
   */
  async spinForPlayer() {
    if (this.isSpinning) {
      console.warn('Wheel is already spinning');
      return null;
    }
    
    if (!this.currentPlayers || this.currentPlayers.length === 0) {
      console.error('No players available for selection');
      return null;
    }
    
    this.isSpinning = true;
    
    // Announce to screen readers
    this.announceToScreenReader('Selecting player');
    
    try {
      // Select random player
      const randomIndex = Math.floor(Math.random() * this.currentPlayers.length);
      const selectedPlayer = this.currentPlayers[randomIndex];
      
      // Calculate rotation for player wheel
      const segmentAngle = 360 / this.currentPlayers.length;
      const targetAngle = randomIndex * segmentAngle + (segmentAngle / 2);
      
      // Add 3-5 full spins
      const fullSpins = 1080 + Math.floor(Math.random() * 721);
      const totalRotation = fullSpins + targetAngle;
      
      // Randomize duration
      const duration = 3 + Math.random() * 4;
      
      // Apply animation
      if (this.wheelElement) {
        requestAnimationFrame(() => {
          this.wheelElement.classList.add('wheel--spinning');
          this.wheelElement.style.transform = `rotate(${totalRotation}deg)`;
          this.wheelElement.style.transition = `transform ${duration}s cubic-bezier(0.33, 1, 0.68, 1)`;
        });
      }
      
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, duration * 1000));
      
      // Remove spinning class
      if (this.wheelElement) {
        this.wheelElement.classList.remove('wheel--spinning');
      }
      
      this.isSpinning = false;
      
      // Announce result
      this.announceToScreenReader(`Selected player: ${selectedPlayer.name}`);
      
      // Highlight selected player
      this.highlightSelectedPlayer(selectedPlayer.id);
      
      // Call completion callback
      if (this.onComplete) {
        this.onComplete(selectedPlayer);
      }
      
      return selectedPlayer;
    } catch (error) {
      console.error('Error spinning wheel for player:', error);
      this.isSpinning = false;
      
      if (this.wheelElement) {
        this.wheelElement.classList.remove('wheel--spinning');
      }
      
      return null;
    }
  }

  /**
   * Highlight the selected player segment
   * @param {string} playerId - Selected player ID
   * @param {number} duration - Highlight duration in milliseconds (default: 2000ms)
   */
  highlightSelectedPlayer(playerId, duration = 2000) {
    if (!this.wheelElement) {
      console.warn('Wheel element not found');
      return;
    }

    // Find the segment for the selected player
    const segments = this.wheelElement.querySelectorAll('.wheel-segment-player');
    let selectedSegment = null;
    let playerName = '';

    segments.forEach(segment => {
      const segmentPlayerId = segment.getAttribute('data-player-id');
      if (segmentPlayerId === playerId) {
        selectedSegment = segment;
        playerName = segment.getAttribute('data-player-name');
      }
    });

    if (!selectedSegment) {
      console.warn(`Segment for player "${playerId}" not found`);
      return;
    }

    // Apply the selected CSS class
    selectedSegment.classList.add('wheel-segment--selected');

    // Display player name in overlay
    const overlay = this.wheelElement.querySelector('.wheel-topic-overlay');
    if (overlay) {
      overlay.textContent = playerName;
      overlay.style.display = 'block';
    }

    // Clear any existing highlight timeout
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }

    // Set timeout to remove highlight
    this.highlightTimeout = setTimeout(() => {
      selectedSegment.classList.remove('wheel-segment--selected');

      if (overlay) {
        overlay.style.display = 'none';
        overlay.textContent = '';
      }

      this.highlightTimeout = null;
    }, duration);
  }
  /**
   * Render wheel with player names as segments
   * @param {HTMLElement} containerElement - Container to render wheel into
   * @param {Array<{id: string, name: string, score: number}>} players - Array of player objects
   */
  renderWithPlayerNames(containerElement, players = []) {
    return this.measureRenderTime(() => {
      if (!containerElement) {
        console.error('Container element is required');
        return;
      }

      if (!players || players.length === 0) {
        console.warn('No players provided for wheel');
        containerElement.innerHTML = '<div class="wheel-status">No players available</div>';
        return;
      }

      // Calculate segment angle based on number of players
      const segmentAngle = 360 / players.length;

      // Generate colors for each player
      const colors = this.generatePlayerColors(players.length);

      // Create wheel container
      const wheelContainer = document.createElement('div');
      wheelContainer.className = 'wheel-container';
      wheelContainer.innerHTML = `
        <div class="wheel-pointer">▼</div>
        <div class="wheel wheel-players" id="spinning-wheel" aria-label="Player selection wheel">
          ${players.map((player, index) => `
            <div class="wheel-segment wheel-segment-player"
                 data-player-id="${player.id}"
                 data-player-name="${player.name}"
                 style="transform: rotate(${index * segmentAngle}deg);
                        --segment-angle: ${segmentAngle}deg;
                        --segment-color: ${colors[index]};">
              <span class="wheel-segment-text">${player.name}</span>
            </div>
          `).join('')}
          <div class="wheel-topic-overlay" id="wheel-topic-overlay"></div>
        </div>
        <div class="wheel-status">${players.length} player${players.length !== 1 ? 's' : ''} in game</div>
        <div class="wheel-aria-live" role="status" aria-live="polite" aria-atomic="true"></div>
      `;

      // Clear container and add wheel
      containerElement.innerHTML = '';
      containerElement.appendChild(wheelContainer);

      // Store reference to wheel element
      this.wheelElement = document.getElementById('spinning-wheel');

      // Store reference to ARIA live region
      this.ariaLiveRegion = wheelContainer.querySelector('.wheel-aria-live');

      // Store players for spinning
      this.currentPlayers = players;
    });
  }

  /**
   * Generate distinct colors for player segments
   * @param {number} count - Number of colors to generate
   * @returns {Array<string>} Array of color strings
   * @private
   */
  generatePlayerColors(count) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
      '#E63946', '#457B9D', '#F77F00', '#06FFA5', '#9D4EDD'
    ];

    // If we need more colors than predefined, generate them
    if (count > colors.length) {
      for (let i = colors.length; i < count; i++) {
        const hue = (i * 137.508) % 360; // Golden angle for good distribution
        colors.push(`hsl(${hue}, 70%, 60%)`);
      }
    }

    return colors.slice(0, count);
  }

  /**
   * Spin wheel and select a random player
   * @returns {Promise<{id: string, name: string}|null>} Selected player or null
   */
  async spinForPlayer() {
    if (this.isSpinning) {
      console.warn('Wheel is already spinning');
      return null;
    }

    if (!this.currentPlayers || this.currentPlayers.length === 0) {
      console.error('No players available for selection');
      return null;
    }

    this.isSpinning = true;

    // Announce to screen readers
    this.announceToScreenReader('Selecting player');

    try {
      // Select random player
      const randomIndex = Math.floor(Math.random() * this.currentPlayers.length);
      const selectedPlayer = this.currentPlayers[randomIndex];

      // Calculate rotation for player wheel
      const segmentAngle = 360 / this.currentPlayers.length;
      const targetAngle = randomIndex * segmentAngle + (segmentAngle / 2);

      // Add 3-5 full spins
      const fullSpins = 1080 + Math.floor(Math.random() * 721);
      const totalRotation = fullSpins + targetAngle;

      // Randomize duration
      const duration = 3 + Math.random() * 4;

      // Apply animation
      if (this.wheelElement) {
        requestAnimationFrame(() => {
          this.wheelElement.classList.add('wheel--spinning');
          this.wheelElement.style.transform = `rotate(${totalRotation}deg)`;
          this.wheelElement.style.transition = `transform ${duration}s cubic-bezier(0.33, 1, 0.68, 1)`;
        });
      }

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, duration * 1000));

      // Remove spinning class
      if (this.wheelElement) {
        this.wheelElement.classList.remove('wheel--spinning');
      }

      this.isSpinning = false;

      // Announce result
      this.announceToScreenReader(`Selected player: ${selectedPlayer.name}`);

      // Highlight selected player
      this.highlightSelectedPlayer(selectedPlayer.id);

      // Call completion callback
      if (this.onComplete) {
        this.onComplete(selectedPlayer);
      }

      return selectedPlayer;
    } catch (error) {
      console.error('Error spinning wheel for player:', error);
      this.isSpinning = false;

      if (this.wheelElement) {
        this.wheelElement.classList.remove('wheel--spinning');
      }

      return null;
    }
  }

  /**
   * Highlight the selected player segment
   * @param {string} playerId - Selected player ID
   * @param {number} duration - Highlight duration in milliseconds (default: 2000ms)
   */
  highlightSelectedPlayer(playerId, duration = 2000) {
    if (!this.wheelElement) {
      console.warn('Wheel element not found');
      return;
    }

    // Find the segment for the selected player
    const segments = this.wheelElement.querySelectorAll('.wheel-segment-player');
    let selectedSegment = null;
    let playerName = '';

    segments.forEach(segment => {
      const segmentPlayerId = segment.getAttribute('data-player-id');
      if (segmentPlayerId === playerId) {
        selectedSegment = segment;
        playerName = segment.getAttribute('data-player-name');
      }
    });

    if (!selectedSegment) {
      console.warn(`Segment for player "${playerId}" not found`);
      return;
    }

    // Apply the selected CSS class
    selectedSegment.classList.add('wheel-segment--selected');

    // Display player name in overlay
    const overlay = this.wheelElement.querySelector('.wheel-topic-overlay');
    if (overlay) {
      overlay.textContent = playerName;
      overlay.style.display = 'block';
    }

    // Clear any existing highlight timeout
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }

    // Set timeout to remove highlight
    this.highlightTimeout = setTimeout(() => {
      selectedSegment.classList.remove('wheel-segment--selected');

      if (overlay) {
        overlay.style.display = 'none';
        overlay.textContent = '';
      }

      this.highlightTimeout = null;
    }, duration);
  }
  /**
   * Update the topic count display without re-rendering the wheel
   * Shows "X topics remaining" or "No topics available"
   */
  updateTopicCountDisplay() {
    // Find the wheel status element
    const statusElement = this.wheelElement?.parentElement?.querySelector('.wheel-status');

    if (!statusElement) {
      console.warn('Wheel status element not found');
      return;
    }

    // Calculate available topics count
    const availableCount = TOPICS.length - this.usedTopics.size;

    // Update the display text
    if (availableCount === 0) {
      statusElement.textContent = 'No topics available';
    } else if (availableCount === 1) {
      statusElement.textContent = '1 topic remaining';
    } else {
      statusElement.textContent = `${availableCount} topics remaining`;
    }
  }

  /**
   * Start monitoring frame rate during animation
   * Tracks frame timestamps and logs warnings if FPS drops below 30
   * @private
   */
  startPerformanceMonitoring() {
    this.isMonitoringPerformance = true;
    this.frameTimestamps = [];
    this.monitorFrame();
  }

  /**
   * Monitor a single animation frame
   * Recursively called via requestAnimationFrame during animation
   * @private
   */
  monitorFrame() {
    if (!this.isMonitoringPerformance) {
      return;
    }

    const timestamp = performance.now();
    this.frameTimestamps.push(timestamp);

    // Check frame rate every 10 frames
    if (this.frameTimestamps.length >= 10) {
      const recentFrames = this.frameTimestamps.slice(-10);
      const timeSpan = recentFrames[recentFrames.length - 1] - recentFrames[0];
      const fps = (recentFrames.length - 1) / (timeSpan / 1000);

      // Handle animation performance degradation: log warning, continue
      if (fps < 30) {
        console.warn(`Performance degradation detected: Frame rate dropped to ${fps.toFixed(2)} FPS (below 30 FPS threshold). Animation will continue.`);
      }
    }

    // Continue monitoring if still spinning
    if (this.isSpinning) {
      this.animationFrameId = requestAnimationFrame(() => this.monitorFrame());
    }
  }

  /**
   * Stop monitoring frame rate
   * @private
   */
  stopPerformanceMonitoring() {
    this.isMonitoringPerformance = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Log final frame rate statistics
    if (this.frameTimestamps.length > 1) {
      const totalTime = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
      const avgFps = (this.frameTimestamps.length - 1) / (totalTime / 1000);
      console.log(`Animation completed with average frame rate: ${avgFps.toFixed(2)} FPS`);
    }

    this.frameTimestamps = [];
  }

  /**
   * Measure and log initial render time
   * @param {Function} renderFn - The render function to measure
   * @returns {*} The return value of the render function
   * @private
   */
  measureRenderTime(renderFn) {
    this.renderStartTime = performance.now();
    
    const result = renderFn();
    
    // Use requestAnimationFrame to measure when DOM is ready
    requestAnimationFrame(() => {
      const renderEndTime = performance.now();
      const renderDuration = renderEndTime - this.renderStartTime;
      
      console.log(`Wheel render completed in ${renderDuration.toFixed(2)}ms`);
      
      // Log warning if render time exceeds 500ms threshold
      if (renderDuration > 500) {
        console.warn(`Performance warning: Render time ${renderDuration.toFixed(2)}ms exceeds 500ms threshold`);
      }
    });
    
    return result;
  }
}
