// MemoryPal - Accessibility Manager
class AccessibilityManager {
  constructor() {
    this.settings = {
      highContrast: false,
      fontSize: 100,
      reduceMotion: false,
      audioCues: true,
      colorblindSupport: false,
      keyboardNavigation: false,
      screenReaderMode: false,
      focusEnhancement: false,
    };

    this.announcer = null;
    this.focusHistory = [];
    this.keyboardNavActive = false;

    this.init();
  }

  init() {
    this.createAnnouncer();
    this.detectPreferences();
    this.setupEventListeners();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.loadSettings();
  }

  createAnnouncer() {
    // Create screen reader announcer
    this.announcer = document.createElement("div");
    this.announcer.className = "status-announcer";
    this.announcer.setAttribute("aria-live", "polite");
    this.announcer.setAttribute("aria-atomic", "true");
    document.body.appendChild(this.announcer);
  }

  detectPreferences() {
    // Detect system preferences
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.settings.reduceMotion = true;
      this.applyReducedMotion();
    }

    if (window.matchMedia("(prefers-contrast: high)").matches) {
      this.settings.highContrast = true;
      this.applyHighContrast();
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      this.applyTheme("dark");
    }

    // Detect screen reader
    if (
      navigator.userAgent.includes("NVDA") ||
      navigator.userAgent.includes("JAWS") ||
      navigator.userAgent.includes("VoiceOver")
    ) {
      this.settings.screenReaderMode = true;
      this.enableScreenReaderMode();
    }
  }

  setupEventListeners() {
    // Settings controls
    const highContrastToggle = document.getElementById("high-contrast");
    const fontSizeSlider = document.getElementById("font-size");
    const reduceMotionToggle = document.getElementById("reduce-motion");
    const audioCuesToggle = document.getElementById("audio-cues");

    if (highContrastToggle) {
      highContrastToggle.addEventListener("change", (e) => {
        this.settings.highContrast = e.target.checked;
        this.applyHighContrast();
        this.saveSettings();
        this.announce(
          "High contrast mode " + (e.target.checked ? "enabled" : "disabled")
        );
      });
    }

    if (fontSizeSlider) {
      fontSizeSlider.addEventListener("input", (e) => {
        this.settings.fontSize = parseInt(e.target.value);
        this.applyFontSize();
        this.updateFontSizeDisplay();
        this.saveSettings();
      });

      fontSizeSlider.addEventListener("change", () => {
        this.announce(`Font size set to ${this.settings.fontSize}%`);
      });
    }

    if (reduceMotionToggle) {
      reduceMotionToggle.addEventListener("change", (e) => {
        this.settings.reduceMotion = e.target.checked;
        this.applyReducedMotion();
        this.saveSettings();
        this.announce(
          "Reduced motion " + (e.target.checked ? "enabled" : "disabled")
        );
      });
    }

    if (audioCuesToggle) {
      audioCuesToggle.addEventListener("change", (e) => {
        this.settings.audioCues = e.target.checked;
        this.saveSettings();
        this.announce(
          "Audio cues " + (e.target.checked ? "enabled" : "disabled")
        );
      });
    }

    // Keyboard detection
    document.addEventListener("keydown", () => {
      if (!this.keyboardNavActive) {
        this.keyboardNavActive = true;
        document.body.classList.add("keyboard-nav-active");
      }
    });

    document.addEventListener("mousedown", () => {
      this.keyboardNavActive = false;
      document.body.classList.remove("keyboard-nav-active");
    });

    // Escape key handling
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.handleEscape();
      }
    });
  }

  setupKeyboardNavigation() {
    // Add keyboard support for custom elements
    document.addEventListener("keydown", (e) => {
      const target = e.target;

      // Handle Enter and Space for buttons
      if (
        (e.key === "Enter" || e.key === " ") &&
        (target.getAttribute("role") === "button" ||
          target.classList.contains("game-nav-btn"))
      ) {
        e.preventDefault();
        target.click();
      }

      // Arrow key navigation for grids
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        this.handleArrowNavigation(e);
      }
    });
  }

  setupFocusManagement() {
    // Track focus for restoration
    document.addEventListener("focusin", (e) => {
      this.focusHistory.push(e.target);
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift();
      }
    });

    // Enhanced focus indicators
    document.addEventListener("focusin", (e) => {
      if (this.settings.focusEnhancement) {
        e.target.classList.add("enhanced-focus");
      }
    });

    document.addEventListener("focusout", (e) => {
      e.target.classList.remove("enhanced-focus");
    });
  }

  handleArrowNavigation(e) {
    const target = e.target;
    const grid = target.closest('[role="grid"], .color-grid, .card-grid');

    if (!grid) return;

    const items = Array.from(
      grid.querySelectorAll('[tabindex], button, [role="button"]')
    );
    const currentIndex = items.indexOf(target);

    if (currentIndex === -1) return;

    let newIndex;
    const gridColumns = this.getGridColumns(grid);

    switch (e.key) {
      case "ArrowRight":
        newIndex = currentIndex + 1;
        break;
      case "ArrowLeft":
        newIndex = currentIndex - 1;
        break;
      case "ArrowDown":
        newIndex = currentIndex + gridColumns;
        break;
      case "ArrowUp":
        newIndex = currentIndex - gridColumns;
        break;
    }

    if (newIndex >= 0 && newIndex < items.length) {
      e.preventDefault();
      items[newIndex].focus();
    }
  }

  getGridColumns(grid) {
    const style = window.getComputedStyle(grid);
    const columns = style.gridTemplateColumns;
    return columns ? columns.split(" ").length : 2;
  }

  handleEscape() {
    // Close modals
    const openModal = document.querySelector(
      '.modal:not([aria-hidden="true"])'
    );
    if (openModal) {
      this.closeModal(openModal);
      return;
    }

    // Close dropdowns
    const openDropdown = document.querySelector(".dropdown-menu:not([hidden])");
    if (openDropdown) {
      this.closeDropdown(openDropdown);
      return;
    }

    // Return focus to main content
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.focus();
    }
  }

  applyHighContrast() {
    if (this.settings.highContrast) {
      document.documentElement.setAttribute("data-theme", "high-contrast");
      document.body.classList.add("high-contrast-active");
    } else {
      document.documentElement.removeAttribute("data-theme");
      document.body.classList.remove("high-contrast-active");
    }
  }

  applyFontSize() {
    const scale = Math.round(this.settings.fontSize / 10) * 10; // Round to nearest 10
    document.documentElement.setAttribute("data-font-scale", scale.toString());

    if (this.settings.fontSize >= 150) {
      document.body.classList.add("large-text");
    } else {
      document.body.classList.remove("large-text");
    }
  }

  applyReducedMotion() {
    if (this.settings.reduceMotion) {
      document.documentElement.setAttribute("data-reduce-motion", "true");
      document.body.classList.add("reduce-motion");
    } else {
      document.documentElement.removeAttribute("data-reduce-motion");
      document.body.classList.remove("reduce-motion");
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  enableScreenReaderMode() {
    document.body.classList.add("screen-reader-mode");
    this.settings.screenReaderMode = true;

    // Add more descriptive labels
    this.enhanceScreenReaderLabels();
  }

  enhanceScreenReaderLabels() {
    // Add detailed descriptions for screen readers
    const colorButtons = document.querySelectorAll(".color-btn");
    colorButtons.forEach((btn, index) => {
      const color = btn.dataset.color;
      const sound = btn.dataset.sound;
      btn.setAttribute(
        "aria-label",
        `${color} button, position ${index + 1}, plays ${sound} note`
      );
    });

    // Add progress announcements
    const progressBar = document.querySelector(".progress-bar");
    if (progressBar) {
      progressBar.setAttribute("aria-describedby", "progress-description");

      const desc = document.createElement("div");
      desc.id = "progress-description";
      desc.className = "sr-only";
      desc.textContent = "Game progress indicator";
      progressBar.parentNode.appendChild(desc);
    }
  }

  updateFontSizeDisplay() {
    const display = document.getElementById("font-size-value");
    if (display) {
      display.textContent = this.settings.fontSize + "%";
    }
  }

  announce(message, priority = "polite") {
    if (!this.announcer) return;

    this.announcer.setAttribute("aria-live", priority);
    this.announcer.textContent = "";

    // Small delay to ensure screen readers pick up the change
    setTimeout(() => {
      this.announcer.textContent = message;
    }, 100);

    // Clear after announcement
    setTimeout(() => {
      this.announcer.textContent = "";
    }, 3000);
  }

  announceGameState(state, details = "") {
    const messages = {
      "game-start": "Game started. Watch the sequence and repeat it.",
      "sequence-show": "Showing sequence. Listen and watch carefully.",
      "sequence-input": "Your turn. Click the colors in the correct order.",
      correct: "Correct! Well done.",
      incorrect: "Incorrect. Try again.",
      "level-up": `Level completed! Moving to level ${details}.`,
      "game-over": `Game over. Final score: ${details}.`,
      pause: "Game paused.",
      resume: "Game resumed.",
    };

    const message = messages[state] || state;
    this.announce(message, "assertive");
  }

  closeModal(modal) {
    modal.setAttribute("aria-hidden", "true");

    // Restore focus
    const trigger = document.querySelector(`[aria-controls="${modal.id}"]`);
    if (trigger) {
      trigger.focus();
    }
  }

  closeDropdown(dropdown) {
    dropdown.hidden = true;

    // Update trigger button
    const trigger = document.querySelector(`[aria-controls="${dropdown.id}"]`);
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
  }

  saveSettings() {
    localStorage.setItem(
      "memorypal-accessibility",
      JSON.stringify(this.settings)
    );
  }

  loadSettings() {
    const saved = localStorage.getItem("memorypal-accessibility");
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
      this.applyAllSettings();
    }
  }

  applyAllSettings() {
    // Apply high contrast
    const highContrastToggle = document.getElementById("high-contrast");
    if (highContrastToggle) {
      highContrastToggle.checked = this.settings.highContrast;
    }
    this.applyHighContrast();

    // Apply font size
    const fontSizeSlider = document.getElementById("font-size");
    if (fontSizeSlider) {
      fontSizeSlider.value = this.settings.fontSize;
    }
    this.applyFontSize();
    this.updateFontSizeDisplay();

    // Apply reduced motion
    const reduceMotionToggle = document.getElementById("reduce-motion");
    if (reduceMotionToggle) {
      reduceMotionToggle.checked = this.settings.reduceMotion;
    }
    this.applyReducedMotion();

    // Apply audio cues
    const audioCuesToggle = document.getElementById("audio-cues");
    if (audioCuesToggle) {
      audioCuesToggle.checked = this.settings.audioCues;
    }
  }

  // Public API methods
  enableColorblindSupport() {
    this.settings.colorblindSupport = true;
    document.body.classList.add("colorblind-patterns");
    this.announce("Colorblind support patterns enabled");
  }

  disableColorblindSupport() {
    this.settings.colorblindSupport = false;
    document.body.classList.remove("colorblind-patterns");
    this.announce("Colorblind support patterns disabled");
  }

  enableFocusEnhancement() {
    this.settings.focusEnhancement = true;
    document.body.classList.add("enhanced-focus");
    this.announce("Enhanced focus indicators enabled");
  }

  disableFocusEnhancement() {
    this.settings.focusEnhancement = false;
    document.body.classList.remove("enhanced-focus");
    this.announce("Enhanced focus indicators disabled");
  }

  setDifficulty(level) {
    document.body.className = document.body.className.replace(
      /difficulty-\w+/g,
      ""
    );
    document.body.classList.add(`difficulty-${level}`);
    this.announce(`Difficulty set to ${level}`);
  }

  setGameSpeed(speed) {
    const speedNames = {
      1: "very slow",
      2: "slow",
      3: "normal",
      4: "fast",
      5: "very fast",
    };
    document.body.className = document.body.className.replace(/speed-\w+/g, "");
    document.body.classList.add(`speed-${speedNames[speed] || "normal"}`);

    const display = document.getElementById("speed-value");
    if (display) {
      display.textContent = speedNames[speed] || "Normal";
    }

    this.announce(`Game speed set to ${speedNames[speed] || "normal"}`);
  }

  // Utility methods for games
  makeAccessible(element, options = {}) {
    const { role, label, description, live, controls, expanded } = options;

    if (role) element.setAttribute("role", role);
    if (label) element.setAttribute("aria-label", label);
    if (description) element.setAttribute("aria-describedby", description);
    if (live) element.setAttribute("aria-live", live);
    if (controls) element.setAttribute("aria-controls", controls);
    if (expanded !== undefined) element.setAttribute("aria-expanded", expanded);

    return element;
  }

  addKeyboardSupport(element, handler) {
    element.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler(e);
      }
    });
  }
}

// Initialize accessibility manager
window.accessibilityManager = new AccessibilityManager();
