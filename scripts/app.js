class MemoryPalApp {
  constructor() {
    this.currentGame = "sequence";
    this.games = {
      sequence: null,
      matching: null,
      patterns: null,
      wordchain: null,
    };

    this.isInitialized = false;
    this.elements = {
      gameNavBtns: document.querySelectorAll(".game-nav-btn"),
      gameContents: document.querySelectorAll(".game-content"),
      settingsBtn: document.getElementById("settings-btn"),
      profileBtn: document.getElementById("profile-btn"),
      settingsMenu: document.getElementById("settings-menu"),
      profileMenu: document.getElementById("profile-menu"),
      helpBtn: document.getElementById("help-btn"),
      aboutBtn: document.getElementById("about-btn"),
      feedbackBtn: document.getElementById("feedback-btn"),
      infoModal: document.getElementById("info-modal"),
      modalTitle: document.getElementById("modal-title"),
      modalBody: document.getElementById("modal-body"),
      modalClose: document.querySelector(".modal-close"),
      loading: document.getElementById("loading"),
    };

    this.init();
  }

  async init() {
    try {
      this.showLoading();

      await this.waitForManagers();

      this.setupEventListeners();

      this.setupGameNavigation();

      this.setupModalsAndMenus();

      this.loadUserPreferences();

      this.initializeGames();

      this.updateProfileStats();

      this.isInitialized = true;
      this.hideLoading();

      if (window.accessibilityManager) {
        window.accessibilityManager.announce(
          "MemoryPal is ready. Choose a game to start training your memory."
        );
      }
    } catch (error) {
      console.error("Failed to initialize MemoryPal:", error);
      this.showError(
        "Failed to initialize the application. Please refresh the page."
      );
    }
  }

  async waitForManagers() {
    const maxWait = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (
        window.accessibilityManager &&
        window.audioManager &&
        window.storageManager
      ) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error("Managers failed to initialize within timeout");
  }

  setupEventListeners() {
    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.addEventListener("click", () =>
        this.toggleSettings()
      );
    }

    if (this.elements.profileBtn) {
      this.elements.profileBtn.addEventListener("click", () =>
        this.toggleProfile()
      );
    }

    if (this.elements.helpBtn) {
      this.elements.helpBtn.addEventListener("click", () => this.showHelp());
    }

    if (this.elements.aboutBtn) {
      this.elements.aboutBtn.addEventListener("click", () => this.showAbout());
    }

    if (this.elements.feedbackBtn) {
      this.elements.feedbackBtn.addEventListener("click", () =>
        this.showFeedback()
      );
    }

    if (this.elements.modalClose) {
      this.elements.modalClose.addEventListener("click", () =>
        this.closeModal()
      );
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeModal();
        this.closeAllMenus();
      }
    });

    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".dropdown-menu") &&
        !e.target.closest(".nav-button")
      ) {
        this.closeAllMenus();
      }

      if (e.target === this.elements.infoModal) {
        this.closeModal();
      }
    });

    if (this.elements.infoModal) {
      this.elements.infoModal.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
          this.trapFocus(e, this.elements.infoModal);
        }
      });
    }
  }

  setupGameNavigation() {
    this.elements.gameNavBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const gameType = btn.dataset.game;
        if (gameType) {
          this.switchGame(gameType);
        }
      });

      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const gameType = btn.dataset.game;
          if (gameType) {
            this.switchGame(gameType);
          }
        }
      });
    });
  }

  setupModalsAndMenus() {
    this.setupDropdownPositioning();

    if (this.elements.infoModal) {
      this.elements.infoModal.setAttribute("role", "dialog");
      this.elements.infoModal.setAttribute("aria-modal", "true");
    }
  }

  setupDropdownPositioning() {
    const adjustDropdown = (menu) => {
      if (!menu) return;

      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menu.style.right = "0";
        menu.style.left = "auto";
      }

      if (window.innerWidth <= 768) {
        menu.style.position = "fixed";
        menu.style.top = "auto";
        menu.style.bottom = "0";
        menu.style.left = "0";
        menu.style.right = "0";
        menu.style.borderRadius = "1rem 1rem 0 0";
      }
    };

    document.querySelectorAll(".dropdown-menu").forEach(adjustDropdown);

    window.addEventListener("resize", () => {
      document
        .querySelectorAll(".dropdown-menu:not([hidden])")
        .forEach(adjustDropdown);
    });
  }

  loadUserPreferences() {
    if (!window.storageManager) return;

    const accessibilitySettings =
      window.storageManager.getAccessibilitySettings();
    if (accessibilitySettings && window.accessibilityManager) {
      // Apply saved accessibility settings
      Object.entries(accessibilitySettings).forEach(([key, value]) => {
        const element = document.getElementById(
          key.replace(/([A-Z])/g, "-$1").toLowerCase()
        );
        if (element) {
          if (element.type === "checkbox") {
            element.checked = value;
          } else if (element.type === "range") {
            element.value = value;
          }
        }
      });
    }

    const lastGame = window.storageManager.getUserPreference(
      "last-game",
      "sequence"
    );
    if (lastGame && this.elements.gameNavBtns) {
      this.switchGame(lastGame);
    }
  }

  initializeGames() {
    this.games.sequence = window.sequenceGame;
    this.games.matching = window.matchingGame;
    this.games.patterns = window.patternGame;
    this.games.wordchain = window.wordChainGame;
  }

  switchGame(gameType) {
    if (!this.isInitialized || this.currentGame === gameType) return;

    this.elements.gameNavBtns.forEach((btn) => {
      const isActive = btn.dataset.game === gameType;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive.toString());
    });

    this.elements.gameContents.forEach((content) => {
      const isCurrentGame = content.id === `${gameType}-game`;
      content.hidden = !isCurrentGame;
    });

    this.currentGame = gameType;

    if (window.storageManager) {
      window.storageManager.saveUserPreference("last-game", gameType);
    }

    const gameNames = {
      sequence: "Sequence Memory",
      matching: "Card Matching",
    };

    if (window.accessibilityManager) {
      window.accessibilityManager.announce(
        `Switched to ${gameNames[gameType]} game`
      );
    }

    if (window.audioManager) {
      window.audioManager.playButtonSound();
    }

    const gameArea = document.getElementById(`${gameType}-game`);
    if (gameArea) {
      gameArea.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  toggleSettings() {
    const menu = this.elements.settingsMenu;
    const btn = this.elements.settingsBtn;

    if (!menu || !btn) return;

    const isOpen = !menu.hidden;

    if (isOpen) {
      this.closeAllMenus();
    } else {
      this.closeAllMenus();
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");

      const firstInput = menu.querySelector("input, select, button");
      if (firstInput) {
        firstInput.focus();
      }
    }

    if (window.audioManager) {
      window.audioManager.playButtonSound();
    }
  }

  toggleProfile() {
    const menu = this.elements.profileMenu;
    const btn = this.elements.profileBtn;

    if (!menu || !btn) return;

    const isOpen = !menu.hidden;

    if (isOpen) {
      this.closeAllMenus();
    } else {
      this.closeAllMenus();
      this.updateProfileStats();
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");
    }

    if (window.audioManager) {
      window.audioManager.playButtonSound();
    }
  }

  closeAllMenus() {
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      menu.hidden = true;
    });

    document.querySelectorAll("[aria-expanded]").forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
    });
  }

  updateProfileStats() {
    if (!window.storageManager) return;

    const stats = window.storageManager.getOverallStats();

    // Update stats display
    const gamesPlayedEl = document.getElementById("games-played");
    const bestStreakEl = document.getElementById("best-streak");
    const totalScoreEl = document.getElementById("total-score");

    if (gamesPlayedEl) gamesPlayedEl.textContent = stats.totalGames || 0;
    if (bestStreakEl) bestStreakEl.textContent = stats.longestStreak || 0;

    // Calculate total score across all games
    let totalScore = 0;
    Object.values(window.storageManager.data.games).forEach((game) => {
      totalScore += game.highScore || 0;
    });

    if (totalScoreEl) totalScoreEl.textContent = totalScore;
  }

  showHelp() {
    const helpContent = `
            <h3>How to Use MemoryPal</h3>
            <div class="help-section">
                <h4>🔢 Sequence Memory</h4>
                <p>Watch the colors light up in sequence, then click them in the same order. Each level adds one more color to remember!</p>
                
                <h4>🃏 Card Matching</h4>
                <p>Click cards to flip them over and find matching pairs. Try to complete the game in as few moves as possible!</p>
            </div>
            
            <div class="help-section">
                <h4>♿ Accessibility Features</h4>
                <ul>
                    <li><strong>High Contrast:</strong> Increase color contrast for better visibility</li>
                    <li><strong>Font Size:</strong> Adjust text size from 100% to 200%</li>
                    <li><strong>Reduce Motion:</strong> Minimize animations and transitions</li>
                    <li><strong>Audio Cues:</strong> Sound feedback and voice announcements</li>
                    <li><strong>Keyboard Navigation:</strong> Full keyboard support with Tab and arrow keys</li>
                    <li><strong>Screen Reader:</strong> Complete ARIA support for assistive technology</li>
                </ul>
            </div>
            
            <div class="help-section">
                <h4>⌨️ Keyboard Shortcuts</h4>
                <ul>
                    <li><strong>Tab:</strong> Navigate between elements</li>
                    <li><strong>Enter/Space:</strong> Activate buttons and controls</li>
                    <li><strong>Arrow Keys:</strong> Navigate game grids</li>
                    <li><strong>Escape:</strong> Close menus and dialogs</li>
                </ul>
            </div>
        `;

    this.showModal("Help & Instructions", helpContent);
  }

  showAbout() {
    const aboutContent = `
            <h3>About MemoryPal</h3>
            <p>MemoryPal is an accessible memory training application designed to help improve cognitive function while being inclusive for all users.</p>
            
            <div class="about-section">
                <h4>🎯 Our Mission</h4>
                <p>To create the most accessible memory training experience possible, ensuring that everyone can benefit from cognitive exercises regardless of their abilities or limitations.</p>
            </div>
            
            <div class="about-section">
                <h4>🏆 Built for Accessibility</h4>
                <p>This application follows WCAG 2.1 AAA guidelines and includes comprehensive accessibility features:</p>
                <ul>
                    <li>Full screen reader support</li>
                    <li>Keyboard-only navigation</li>
                    <li>High contrast themes</li>
                    <li>Scalable text and UI elements</li>
                    <li>Motion reduction options</li>
                    <li>Audio descriptions and cues</li>
                </ul>
            </div>
            
            <div class="about-section">
                <h4>🧠 Cognitive Benefits</h4>
                <p>Regular use of memory games can help:</p>
                <ul>
                    <li>Improve working memory capacity</li>
                    <li>Enhance attention and focus</li>
                    <li>Boost processing speed</li>
                    <li>Support healthy brain aging</li>
                </ul>
            </div>
            
            <div class="about-section">
                <h4>💻 Technical Excellence</h4>
                <p>Built with vanilla HTML, CSS, and JavaScript - no frameworks, no dependencies, just pure web technology optimized for performance and accessibility.</p>
            </div>
            
            <div class="about-section">
                <h4>🏅 Hackathon Project</h4>
                <p>Created for the Vanilla Web Warriors Hackathon - Track 10: Universal Access Guardian. Demonstrating that accessible web experiences can be both beautiful and functional.</p>
            </div>
        `;

    this.showModal("About MemoryPal", aboutContent);
  }

  showFeedback() {
    const feedbackContent = `
            <h3>We Value Your Feedback</h3>
            <p>Help us improve MemoryPal by sharing your experience and suggestions.</p>
            
            <div class="feedback-form">
                <div class="form-group">
                    <label for="feedback-type">Feedback Type:</label>
                    <select id="feedback-type">
                        <option value="general">General Feedback</option>
                        <option value="accessibility">Accessibility Issue</option>
                        <option value="bug">Bug Report</option>
                        <option value="feature">Feature Request</option>
                        <option value="compliment">Compliment</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="feedback-text">Your Feedback:</label>
                    <textarea id="feedback-text" rows="5" placeholder="Please share your thoughts, suggestions, or report any issues you've encountered..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="feedback-email">Email (optional):</label>
                    <input type="email" id="feedback-email" placeholder="your.email@example.com">
                    <small>Only if you'd like a response</small>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="feedback-submit-btn" onclick="memoryPalApp.submitFeedback()">
                        Send Feedback
                    </button>
                </div>
            </div>
            
            <div class="feedback-info">
                <h4>Other Ways to Reach Us</h4>
                <p>You can also provide feedback through:</p>
                <ul>
                    <li>GitHub Issues (for technical feedback)</li>
                    <li>Accessibility testing reports</li>
                    <li>User experience studies</li>
                </ul>
            </div>
        `;

    this.showModal("Feedback", feedbackContent);
  }

  submitFeedback() {
    const type = document.getElementById("feedback-type")?.value;
    const text = document.getElementById("feedback-text")?.value;
    const email = document.getElementById("feedback-email")?.value;

    if (!text.trim()) {
      alert("Please enter your feedback before submitting.");
      return;
    }

    console.log("Feedback submitted:", { type, text, email });

    const modalBody = this.elements.modalBody;
    if (modalBody) {
      modalBody.innerHTML = `
                <div class="feedback-success">
                    <h3>Thank You!</h3>
                    <p>Your feedback has been received and is greatly appreciated. We'll review it carefully and use it to improve MemoryPal.</p>
                    <button type="button" class="close-modal-btn" onclick="memoryPalApp.closeModal()">
                        Close
                    </button>
                </div>
            `;
    }

    if (window.audioManager) {
      window.audioManager.playSuccessSound();
      window.audioManager.speak("Thank you for your feedback!");
    }
  }

  showModal(title, content) {
    if (!this.elements.infoModal) return;

    if (this.elements.modalTitle) {
      this.elements.modalTitle.textContent = title;
    }

    if (this.elements.modalBody) {
      this.elements.modalBody.innerHTML = content;
    }

    this.elements.infoModal.setAttribute("aria-hidden", "false");

    const firstFocusable = this.elements.infoModal.querySelector(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
      firstFocusable.focus();
    } else if (this.elements.modalClose) {
      this.elements.modalClose.focus();
    }

    // Announce for screen readers
    if (window.accessibilityManager) {
      window.accessibilityManager.announce(`${title} dialog opened`);
    }
  }

  closeModal() {
    if (!this.elements.infoModal) return;

    this.elements.infoModal.setAttribute("aria-hidden", "true");

    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.focus();
    }

    if (window.audioManager) {
      window.audioManager.playButtonSound();
    }
  }

  trapFocus(e, container) {
    const focusableElements = container.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  showLoading() {
    if (this.elements.loading) {
      this.elements.loading.setAttribute("aria-hidden", "false");
    }
  }

  hideLoading() {
    if (this.elements.loading) {
      this.elements.loading.setAttribute("aria-hidden", "true");
    }
  }

  showError(message) {
    console.error(message);

    const errorDiv = document.createElement("div");
    errorDiv.className = "error-notification";
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #dc2626;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
      document.body.removeChild(errorDiv);
    }, 5000);

    if (window.accessibilityManager) {
      window.accessibilityManager.announce(message, "assertive");
    }
  }

  getCurrentGame() {
    return this.currentGame;
  }

  getGameInstance(gameType) {
    return this.games[gameType];
  }

  isReady() {
    return this.isInitialized;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.memoryPalApp = new MemoryPalApp();
});

const modalStyles = document.createElement("style");
modalStyles.textContent = `
    .help-section, .about-section {
        margin-bottom: 1.5rem;
    }
    
    .help-section h4, .about-section h4 {
        color: var(--primary);
        margin-bottom: 0.5rem;
        font-size: 1.1rem;
    }
    
    .help-section ul, .about-section ul {
        margin-left: 1rem;
        margin-top: 0.5rem;
    }
    
    .help-section li, .about-section li {
        margin-bottom: 0.25rem;
    }
    
    .feedback-form {
        margin: 1.5rem 0;
    }
    
    .form-group {
        margin-bottom: 1rem;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .form-group input,
    .form-group select,
    .form-group textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        font-size: 1rem;
        background: var(--surface);
        color: var(--text-primary);
    }
    
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
        border-color: var(--primary);
    }
    
    .form-group small {
        display: block;
        margin-top: 0.25rem;
        color: var(--text-muted);
        font-size: 0.875rem;
    }
    
    .form-actions {
        text-align: center;
        margin-top: 1.5rem;
    }
    
    .feedback-submit-btn,
    .close-modal-btn {
        background: var(--primary);
        color: var(--text-inverse);
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .feedback-submit-btn:hover,
    .close-modal-btn:hover {
        background: var(--primary-hover);
    }
    
    .feedback-success {
        text-align: center;
        padding: 2rem;
    }
    
    .feedback-success h3 {
        color: var(--success);
        margin-bottom: 1rem;
    }
    
    .feedback-info {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
    }
    
    .feedback-info h4 {
        color: var(--text-primary);
        margin-bottom: 0.5rem;
    }
    
    .error-notification {
        animation: slideDown 0.3s ease-out;
    }
    
    @keyframes slideDown {
        from {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(modalStyles);
