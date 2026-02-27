/**
 * Disconnect Notifier Module
 * 
 * This module displays UI notifications for disconnect events.
 * It shows toast notifications when players disconnect, when rooms are terminating,
 * and when connections are unstable.
 * 
 * Exports:
 * - DisconnectNotifier: Class for displaying disconnect notifications
 */

/**
 * DisconnectNotifier class for displaying UI notifications
 */
export class DisconnectNotifier {
  /**
   * Create a new DisconnectNotifier instance
   */
  constructor() {
    this.notificationContainer = null;
    this.initializeContainer();
  }

  /**
   * Initialize notification container if it doesn't exist
   * @private
   */
  initializeContainer() {
    // Check if error-container exists (used by UIManager)
    let container = document.getElementById('error-container');
    
    if (!container) {
      // Create container if it doesn't exist
      container = document.createElement('div');
      container.id = 'error-container';
      container.className = 'error-container';
      document.body.appendChild(container);
    }
    
    this.notificationContainer = container;
  }

  /**
   * Show a notification message
   * @param {string} message - Message to display
   * @param {string} type - Notification type ('info', 'warning', 'error')
   * @param {number} duration - Auto-dismiss duration in ms (default: 5000)
   * @private
   */
  _showNotification(message, type = 'info', duration = 5000) {
    // Ensure container exists
    if (!this.notificationContainer) {
      this.initializeContainer();
    }

    // Create notification element
    const notificationEl = document.createElement('div');
    notificationEl.className = `error-message ${type}-message`;
    
    // Choose icon based on type
    let icon = 'ℹ';
    if (type === 'warning') {
      icon = '⚠';
    } else if (type === 'error') {
      icon = '✕';
    }
    
    notificationEl.innerHTML = `
      <span class="error-icon">${icon}</span>
      <span class="error-text">${message}</span>
      <button class="error-dismiss" onclick="this.parentElement.remove()">×</button>
    `;
    
    this.notificationContainer.appendChild(notificationEl);
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        if (notificationEl.parentElement) {
          notificationEl.remove();
        }
      }, duration);
    }
  }

  /**
   * Show notification when a player disconnects
   * @param {string} playerName - Name of disconnected player
   * @returns {void}
   */
  notifyPlayerDisconnected(playerName) {
    const message = `${playerName} has disconnected`;
    this._showNotification(message, 'info', 5000);
    console.log(`Notification: ${message}`);
  }

  /**
   * Show notification when room is terminating due to no players
   * @returns {void}
   */
  notifyRoomTerminating() {
    const message = 'All players have left. Room is terminating...';
    this._showNotification(message, 'warning', 7000);
    console.log(`Notification: ${message}`);
  }

  /**
   * Show notification when connection is unstable
   * @param {string} playerName - Name of player with unstable connection
   * @returns {void}
   */
  notifyConnectionUnstable(playerName) {
    const message = `${playerName}'s connection is unstable`;
    this._showNotification(message, 'warning', 5000);
    console.log(`Notification: ${message}`);
  }
}
