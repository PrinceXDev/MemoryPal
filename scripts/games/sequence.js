// MemoryPal - Sequence Memory Game
class SequenceGame {
  constructor() {
    this.sequence = [];
    this.playerSequence = [];
    this.level = 1;
    this.score = 0;
    this.isPlaying = false;
    this.isShowingSequence = false;
    this.isPlayerTurn = false;
    this.isPaused = false;
    this.gameSession = null;

    this.colors = ["red", "blue", "green", "yellow"];
    this.difficulty = "medium";
    this.speed = 3; // 1-5 scale

    this.elements = {
      gameArea: document.getElementById("sequence-game"),
      board: document.getElementById("sequence-board"),
      startBtn: document.getElementById("start-sequence"),
      replayBtn: document.getElementById("replay-sequence"),
      pauseBtn: document.getElementById("pause-game"),
      colorBtns: document.querySelectorAll(".color-btn"),
      feedback: document.getElementById("sequence-feedback"),
      levelDisplay: document.getElementById("current-level"),
      scoreDisplay: document.getElementById("current-score"),
      progressBar: document.querySelector(".progress-bar"),
      progressFill: document.querySelector(".progress-fill"),
      encouragement: document.getElementById("encouragement-text"),
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupAccessibility();
    this.loadSettings();
  }

  setupEventListeners() {
    // Start game button
    if (this.elements.startBtn) {
      this.elements.startBtn.addEventListener("click", () => this.startGame());
    }

    // Control buttons
    if (this.elements.replayBtn) {
      this.elements.replayBtn.addEventListener("click", () =>
        this.replaySequence()
      );
    }

    if (this.elements.pauseBtn) {
      this.elements.pauseBtn.addEventListener("click", () =>
        this.togglePause()
      );
    }

    // Color buttons
    this.elements.colorBtns.forEach((btn, index) => {
      btn.addEventListener("click", () =>
        this.handleColorClick(btn.dataset.color, index)
      );

      // Keyboard support
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.handleColorClick(btn.dataset.color, index);
        }
      });

      // Add tabindex for keyboard navigation
      btn.setAttribute("tabindex", "0");
    });

    // Game settings
    const difficultySelect = document.getElementById("difficulty");
    if (difficultySelect) {
      difficultySelect.addEventListener("change", (e) => {
        this.difficulty = e.target.value;
        this.updateDifficulty();
      });
    }

    const speedSlider = document.getElementById("game-speed");
    if (speedSlider) {
      speedSlider.addEventListener("input", (e) => {
        this.speed = parseInt(e.target.value);
        this.updateSpeed();
      });
    }
  }

  setupAccessibility() {
    // Add ARIA labels and descriptions
    this.elements.colorBtns.forEach((btn, index) => {
      const color = btn.dataset.color;
      const sound = btn.dataset.sound;
      btn.setAttribute("aria-label", `${color} button, plays ${sound} note`);
      btn.setAttribute("aria-describedby", `color-desc-${index}`);

      // Create description element
      const desc = document.createElement("div");
      desc.id = `color-desc-${index}`;
      desc.className = "sr-only";
      desc.textContent = `Click to select ${color}. Position ${
        index + 1
      } of 4.`;
      btn.parentNode.appendChild(desc);
    });

    // Add live region for game state
    if (this.elements.feedback) {
      this.elements.feedback.setAttribute("aria-live", "assertive");
      this.elements.feedback.setAttribute("aria-atomic", "true");
    }

    // Progress bar accessibility
    if (this.elements.progressBar) {
      this.elements.progressBar.setAttribute("role", "progressbar");
      this.elements.progressBar.setAttribute("aria-valuemin", "0");
      this.elements.progressBar.setAttribute("aria-valuemax", "100");
      this.elements.progressBar.setAttribute("aria-valuenow", "0");
      this.elements.progressBar.setAttribute("aria-label", "Game progress");
    }
  }

  loadSettings() {
    if (window.storageManager) {
      this.difficulty = window.storageManager.getUserPreference(
        "sequence-difficulty",
        "medium"
      );
      this.speed = window.storageManager.getUserPreference("sequence-speed", 3);
    }

    this.updateDifficulty();
    this.updateSpeed();
  }

  updateDifficulty() {
    document.body.className = document.body.className.replace(
      /difficulty-\w+/g,
      ""
    );
    document.body.classList.add(`difficulty-${this.difficulty}`);

    if (window.accessibilityManager) {
      window.accessibilityManager.setDifficulty(this.difficulty);
    }

    if (window.storageManager) {
      window.storageManager.saveUserPreference(
        "sequence-difficulty",
        this.difficulty
      );
    }
  }

  updateSpeed() {
    if (window.accessibilityManager) {
      window.accessibilityManager.setGameSpeed(this.speed);
    }

    if (window.storageManager) {
      window.storageManager.saveUserPreference("sequence-speed", this.speed);
    }
  }

  startGame() {
    this.resetGame();
    this.isPlaying = true;
    this.gameSession = window.storageManager?.recordGameStart("sequence");

    // Hide instructions, show game board
    const instructions =
      this.elements.gameArea.querySelector(".game-instructions");
    if (instructions) {
      instructions.style.display = "none";
    }
    this.elements.board.hidden = false;

    // Update UI
    this.updateDisplay();
    this.updateEncouragement("Let's start with level 1. Watch carefully!");

    // Start first level
    this.nextLevel();

    // Announce game start
    if (window.accessibilityManager) {
      window.accessibilityManager.announceGameState("game-start");
    }

    if (window.audioManager) {
      window.audioManager.announceGameEvent("gameStart");
    }
  }

  resetGame() {
    this.sequence = [];
    this.playerSequence = [];
    this.level = 1;
    this.score = 0;
    this.isPlaying = false;
    this.isShowingSequence = false;
    this.isPlayerTurn = false;
    this.isPaused = false;

    this.enableColorButtons();
    this.clearFeedback();
    this.updateDisplay();
  }

  nextLevel() {
    this.playerSequence = [];
    this.addToSequence();
    this.showSequence();
  }

  addToSequence() {
    // Add new color based on difficulty
    let newColor;

    switch (this.difficulty) {
      case "easy":
        // Easier patterns, avoid immediate repeats
        do {
          newColor =
            this.colors[Math.floor(Math.random() * this.colors.length)];
        } while (
          this.sequence.length > 0 &&
          newColor === this.sequence[this.sequence.length - 1]
        );
        break;

      case "medium":
        // Random selection
        newColor = this.colors[Math.floor(Math.random() * this.colors.length)];
        break;

      case "hard":
        // Completely random, can have immediate repeats
        newColor = this.colors[Math.floor(Math.random() * this.colors.length)];
        break;

      case "adaptive":
        // Adjust based on performance
        newColor = this.getAdaptiveColor();
        break;

      default:
        newColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    this.sequence.push(newColor);
  }

  getAdaptiveColor() {
    // Adaptive difficulty based on recent performance
    const recentErrors = this.getRecentErrorRate();

    if (recentErrors > 0.5) {
      // Make it easier - avoid repeats and use patterns
      const availableColors = this.colors.filter(
        (color) =>
          this.sequence.length === 0 ||
          color !== this.sequence[this.sequence.length - 1]
      );
      return availableColors[
        Math.floor(Math.random() * availableColors.length)
      ];
    } else if (recentErrors < 0.2) {
      // Make it harder - allow more complex patterns
      return this.colors[Math.floor(Math.random() * this.colors.length)];
    } else {
      // Normal difficulty
      return this.colors[Math.floor(Math.random() * this.colors.length)];
    }
  }

  getRecentErrorRate() {
    // This would track recent performance - simplified for now
    return 0.3; // Default moderate error rate
  }

  async showSequence() {
    this.isShowingSequence = true;
    this.isPlayerTurn = false;
    this.disableColorButtons();

    this.showFeedback("Watch the sequence...", "info");
    this.updateEncouragement(
      `Level ${this.level}: Remember this sequence of ${this.sequence.length} colors.`
    );

    // Announce sequence start
    if (window.accessibilityManager) {
      window.accessibilityManager.announceGameState(
        "sequence-show",
        this.sequence.length
      );
    }

    if (window.audioManager) {
      window.audioManager.announceGameEvent("sequenceShow", {
        length: this.sequence.length,
      });
    }

    // Calculate timing based on speed setting
    const baseInterval = 800;
    const speedMultiplier = [1.5, 1.25, 1.0, 0.8, 0.6][this.speed - 1];
    const interval = baseInterval * speedMultiplier;
    const flashDuration = interval * 0.6;

    // Show each color in sequence
    for (let i = 0; i < this.sequence.length; i++) {
      if (!this.isPlaying || this.isPaused) break;

      const color = this.sequence[i];
      const colorBtn = document.querySelector(`[data-color="${color}"]`);

      if (colorBtn) {
        // Visual flash
        colorBtn.classList.add("flash");

        // Audio cue
        if (window.audioManager) {
          window.audioManager.playColorSound(color);
        }

        // Announce color for screen readers
        if (window.accessibilityManager) {
          window.accessibilityManager.announce(`${color}`, "polite");
        }

        // Remove flash after duration
        setTimeout(() => {
          colorBtn.classList.remove("flash");
        }, flashDuration);
      }

      // Wait before next color
      await this.delay(interval);
    }

    // Start player turn
    if (this.isPlaying && !this.isPaused) {
      this.startPlayerTurn();
    }
  }

  startPlayerTurn() {
    this.isShowingSequence = false;
    this.isPlayerTurn = true;
    this.enableColorButtons();

    this.showFeedback("Your turn! Click the colors in order.", "info");
    this.updateEncouragement("Now repeat the sequence. Take your time!");

    // Announce player turn
    if (window.accessibilityManager) {
      window.accessibilityManager.announceGameState("sequence-input");
    }

    if (window.audioManager) {
      window.audioManager.announceGameEvent("sequenceInput");
    }

    // Focus first color button for keyboard users
    if (
      window.accessibilityManager &&
      window.accessibilityManager.keyboardNavActive
    ) {
      this.elements.colorBtns[0].focus();
    }
  }

  handleColorClick(color, index) {
    if (!this.isPlayerTurn || this.isPaused) return;

    const colorBtn = document.querySelector(`[data-color="${color}"]`);

    // Visual feedback
    colorBtn.classList.add("active");
    setTimeout(() => colorBtn.classList.remove("active"), 200);

    // Audio feedback
    if (window.audioManager) {
      window.audioManager.playColorSound(color);
    }

    // Add to player sequence
    this.playerSequence.push(color);

    // Check if correct
    const currentIndex = this.playerSequence.length - 1;
    const expectedColor = this.sequence[currentIndex];

    if (color === expectedColor) {
      // Correct color
      this.handleCorrectColor(color, colorBtn);

      // Check if sequence complete
      if (this.playerSequence.length === this.sequence.length) {
        this.handleSequenceComplete();
      }
    } else {
      // Wrong color
      this.handleIncorrectColor(color, expectedColor, colorBtn);
    }
  }

  handleCorrectColor(color, colorBtn) {
    colorBtn.classList.add("correct");
    setTimeout(() => colorBtn.classList.remove("correct"), 500);

    // Update score
    this.score += 10 * this.level;
    this.updateDisplay();

    // Audio feedback
    if (window.audioManager) {
      window.audioManager.playSuccessSound();
      window.audioManager.announceGameEvent("correctColor", { color });
    }

    // Accessibility announcement
    if (window.accessibilityManager) {
      window.accessibilityManager.announceGameState("correct");
    }
  }

  handleIncorrectColor(color, expectedColor, colorBtn) {
    colorBtn.classList.add("incorrect");
    setTimeout(() => colorBtn.classList.remove("incorrect"), 500);

    // Show correct color briefly
    const correctBtn = document.querySelector(
      `[data-color="${expectedColor}"]`
    );
    if (correctBtn) {
      correctBtn.classList.add("flash");
      setTimeout(() => correctBtn.classList.remove("flash"), 800);
    }

    this.showFeedback(
      `Wrong! The correct color was ${expectedColor}.`,
      "error"
    );

    // Audio feedback
    if (window.audioManager) {
      window.audioManager.playErrorSound();
      window.audioManager.announceGameEvent("incorrectColor", {
        color,
        expected: expectedColor,
      });
    }

    // Accessibility announcement
    if (window.accessibilityManager) {
      window.accessibilityManager.announceGameState("incorrect", expectedColor);
    }

    // End game
    setTimeout(() => this.endGame(), 1500);
  }

  handleSequenceComplete() {
    this.isPlayerTurn = false;
    this.disableColorButtons();

    // Calculate level bonus
    const levelBonus = this.level * 50;
    this.score += levelBonus;

    this.showFeedback(`Perfect! Level ${this.level} complete!`, "success");
    this.updateEncouragement(
      `Excellent memory! You scored ${levelBonus} bonus points.`
    );

    // Audio feedback
    if (window.audioManager) {
      window.audioManager.playCompleteSound();
      window.audioManager.announceGameEvent("levelComplete", {
        level: this.level,
        score: this.score,
      });
    }

    // Accessibility announcement
    if (window.accessibilityManager) {
      window.accessibilityManager.announceGameState("level-up", this.level + 1);
    }

    // Update progress
    this.updateProgress();

    // Next level after delay
    setTimeout(() => {
      this.level++;
      this.updateDisplay();
      this.nextLevel();
    }, 2000);
  }

  endGame() {
    this.isPlaying = false;
    this.isPlayerTurn = false;
    this.disableColorButtons();

    // Record game end
    if (window.storageManager && this.gameSession) {
      window.storageManager.recordGameEnd("sequence", {
        score: this.score,
        level: this.level,
        completed: false,
      });
    }

    this.showFeedback(`Game Over! Final Score: ${this.score}`, "error");
    this.updateEncouragement("Good effort! Want to try again?");

    // Audio feedback
    if (window.audioManager) {
      window.audioManager.announceGameEvent("gameOver", { score: this.score });
    }

    // Accessibility announcement
    if (window.accessibilityManager) {
      window.accessibilityManager.announceGameState("game-over", this.score);
    }

    // Show restart option
    setTimeout(() => {
      this.showRestartOption();
    }, 2000);
  }

  showRestartOption() {
    const instructions =
      this.elements.gameArea.querySelector(".game-instructions");
    if (instructions) {
      instructions.style.display = "block";
      this.elements.startBtn.textContent = "Play Again";
      this.elements.startBtn.focus();
    }
    this.elements.board.hidden = true;
  }

  replaySequence() {
    if (!this.isPlaying || this.isShowingSequence || this.sequence.length === 0)
      return;

    this.playerSequence = [];
    this.showSequence();

    if (window.audioManager) {
      window.audioManager.playButtonSound();
    }
  }

  togglePause() {
    if (!this.isPlaying) return;

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.disableColorButtons();
      this.showFeedback("Game Paused", "info");
      this.elements.pauseBtn.innerHTML =
        '<span class="button-icon" aria-hidden="true">▶️</span>Resume';

      if (window.accessibilityManager) {
        window.accessibilityManager.announceGameState("pause");
      }
    } else {
      if (this.isPlayerTurn) {
        this.enableColorButtons();
      }
      this.clearFeedback();
      this.elements.pauseBtn.innerHTML =
        '<span class="button-icon" aria-hidden="true">⏸️</span>Pause';

      if (window.accessibilityManager) {
        window.accessibilityManager.announceGameState("resume");
      }
    }

    if (window.audioManager) {
      window.audioManager.playButtonSound();
    }
  }

  enableColorButtons() {
    this.elements.colorBtns.forEach((btn) => {
      btn.disabled = false;
      btn.setAttribute("tabindex", "0");
    });
    document.body.classList.add("game-playing");
    document.body.classList.remove("game-waiting", "game-showing");
  }

  disableColorButtons() {
    this.elements.colorBtns.forEach((btn) => {
      btn.disabled = true;
      btn.setAttribute("tabindex", "-1");
    });
    document.body.classList.remove("game-playing");
    document.body.classList.add("game-waiting");
  }

  showFeedback(message, type) {
    if (this.elements.feedback) {
      this.elements.feedback.textContent = message;
      this.elements.feedback.className = `sequence-feedback ${type}`;
    }
  }

  clearFeedback() {
    if (this.elements.feedback) {
      this.elements.feedback.textContent = "";
      this.elements.feedback.className = "sequence-feedback";
    }
  }

  updateDisplay() {
    if (this.elements.levelDisplay) {
      this.elements.levelDisplay.textContent = this.level;
    }

    if (this.elements.scoreDisplay) {
      this.elements.scoreDisplay.textContent = this.score;
    }
  }

  updateProgress() {
    // Calculate progress based on level (exponential growth)
    const maxLevel = 20; // Reasonable maximum for progress bar
    const progress = Math.min((this.level / maxLevel) * 100, 100);

    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${progress}%`;
    }

    if (this.elements.progressBar) {
      this.elements.progressBar.setAttribute(
        "aria-valuenow",
        Math.round(progress)
      );
    }
  }

  updateEncouragement(message) {
    if (this.elements.encouragement) {
      this.elements.encouragement.textContent = message;
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public API for external control
  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.updateDifficulty();
  }

  setSpeed(speed) {
    this.speed = speed;
    this.updateSpeed();
  }

  getCurrentStats() {
    return {
      level: this.level,
      score: this.score,
      sequence: this.sequence.slice(),
      isPlaying: this.isPlaying,
    };
  }
}

// Initialize sequence game when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.sequenceGame = new SequenceGame();
});
