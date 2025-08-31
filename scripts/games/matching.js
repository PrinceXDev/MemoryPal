class MatchingGame {
  constructor() {
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.score = 0;
    this.startTime = null;
    this.endTime = null;
    this.isPlaying = false;
    this.gameSession = null;

    this.gridSize = 4;
    this.difficulty = "medium";
    this.theme = "emojis";

    this.themes = {
      emojis: [
        "🐶",
        "🐱",
        "🐭",
        "🐹",
        "🐰",
        "🦊",
        "🐻",
        "🐼",
        "🐨",
        "🐯",
        "🦁",
        "🐸",
      ],
      shapes: ["●", "■", "▲", "♦", "★", "♠", "♥", "♣", "◆", "▼", "◀", "▶"],
      numbers: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
      letters: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
    };

    this.elements = {
      gameArea: document.getElementById("matching-game"),
      board: document.getElementById("matching-board"),
      startBtn: document.getElementById("start-matching"),
      restartBtn: document.getElementById("restart-matching"),
      cardGrid: document.getElementById("card-grid"),
      feedback: document.getElementById("matching-feedback"),
      moveCount: document.getElementById("move-count"),
      pairsFound: document.getElementById("pairs-found"),
      totalPairs: document.getElementById("total-pairs"),
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupAccessibility();
    this.loadSettings();
  }

  setupEventListeners() {
    if (this.elements.startBtn) {
      this.elements.startBtn.addEventListener("click", () => this.startGame());
    }

    if (this.elements.restartBtn) {
      this.elements.restartBtn.addEventListener("click", () =>
        this.restartGame()
      );
    }

    const difficultySelect = document.getElementById("matching-difficulty");
    if (difficultySelect) {
      difficultySelect.addEventListener("change", (e) => {
        this.difficulty = e.target.value;
        this.updateDifficulty();
      });
    }

    const themeSelect = document.getElementById("matching-theme");
    if (themeSelect) {
      themeSelect.addEventListener("change", (e) => {
        this.theme = e.target.value;
        this.updateTheme();
      });
    }
  }

  setupAccessibility() {
    if (this.elements.feedback) {
      this.elements.feedback.setAttribute("aria-live", "assertive");
      this.elements.feedback.setAttribute("aria-atomic", "true");
    }

    if (this.elements.cardGrid) {
      this.elements.cardGrid.setAttribute("role", "grid");
      this.elements.cardGrid.setAttribute("aria-label", "Memory card grid");
    }
  }

  loadSettings() {
    if (window.storageManager) {
      this.difficulty = window.storageManager.getUserPreference(
        "matching-difficulty",
        "medium"
      );
      this.theme = window.storageManager.getUserPreference(
        "matching-theme",
        "emojis"
      );
      this.gridSize = window.storageManager.getUserPreference(
        "matching-gridsize",
        4
      );
    }

    this.updateDifficulty();
    this.updateTheme();
  }

  updateDifficulty() {
    const difficulties = {
      easy: { gridSize: 3, pairs: 4 },
      medium: { gridSize: 4, pairs: 8 },
      hard: { gridSize: 5, pairs: 12 },
      expert: { gridSize: 6, pairs: 18 },
    };

    const config = difficulties[this.difficulty] || difficulties.medium;
    this.gridSize = config.gridSize;
    this.totalPairs = config.pairs;

    if (window.storageManager) {
      window.storageManager.saveUserPreference(
        "matching-difficulty",
        this.difficulty
      );
      window.storageManager.saveUserPreference(
        "matching-gridsize",
        this.gridSize
      );
    }
  }

  updateTheme() {
    if (window.storageManager) {
      window.storageManager.saveUserPreference("matching-theme", this.theme);
    }
  }

  startGame() {
    this.resetGame();
    this.isPlaying = true;
    this.startTime = Date.now();
    this.gameSession = window.storageManager?.recordGameStart("matching");

    const instructions =
      this.elements.gameArea.querySelector(".game-instructions");
    if (instructions) {
      instructions.style.display = "none";
    }
    this.elements.board.hidden = false;

    this.generateCards();
    this.displayCards();
    this.updateDisplay();

    if (window.accessibilityManager) {
      window.accessibilityManager.announceGameState("game-start");
    }

    if (window.audioManager) {
      window.audioManager.announceGameEvent("gameStart");
      window.audioManager.announceInstructions("matching");
    }
  }

  resetGame() {
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.score = 0;
    this.startTime = null;
    this.endTime = null;
    this.isPlaying = false;

    this.clearFeedback();
    this.updateDisplay();
  }

  restartGame() {
    if (this.isPlaying) {
      if (window.storageManager && this.gameSession) {
        window.storageManager.recordGameEnd("matching", {
          score: this.score,
          moves: this.moves,
          completed: false,
          time: Date.now() - this.startTime,
        });
      }
    }

    this.startGame();

    if (window.audioManager) {
      window.audioManager.playButtonSound();
    }
  }

  generateCards() {
    const symbols = this.themes[this.theme] || this.themes.emojis;
    const pairsNeeded = Math.floor((this.gridSize * this.gridSize) / 2);
    const selectedSymbols = symbols.slice(0, pairsNeeded);

    // Create pairs
    this.cards = [];
    selectedSymbols.forEach((symbol, index) => {
      // Add two cards for each symbol
      this.cards.push({
        id: `card-${index}-1`,
        symbol: symbol,
        matched: false,
        flipped: false,
      });
      this.cards.push({
        id: `card-${index}-2`,
        symbol: symbol,
        matched: false,
        flipped: false,
      });
    });

    this.shuffleCards();

    this.totalPairs = pairsNeeded;
    if (this.elements.totalPairs) {
      this.elements.totalPairs.textContent = this.totalPairs;
    }
  }

  shuffleCards() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  displayCards() {
    if (!this.elements.cardGrid) return;

    this.elements.cardGrid.innerHTML = "";

    this.elements.cardGrid.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;

    this.cards.forEach((card, index) => {
      const cardElement = this.createCardElement(card, index);
      this.elements.cardGrid.appendChild(cardElement);
    });
  }

  createCardElement(card, index) {
    const cardEl = document.createElement("button");
    cardEl.className = "card";
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.symbol = card.symbol;
    cardEl.setAttribute("role", "gridcell");
    cardEl.setAttribute("tabindex", "0");
    cardEl.setAttribute("aria-label", `Card ${index + 1}, face down`);
    cardEl.setAttribute("aria-describedby", `card-desc-${index}`);

    cardEl.innerHTML = `
            <div class="card-content">
                <div class="card-front">${card.symbol}</div>
                <div class="card-back">?</div>
            </div>
        `;

    const desc = document.createElement("div");
    desc.id = `card-desc-${index}`;
    desc.className = "sr-only";
    desc.textContent = `Position ${index + 1} of ${
      this.cards.length
    }. Click to flip.`;
    cardEl.appendChild(desc);

    cardEl.addEventListener("click", () =>
      this.handleCardClick(card, cardEl, index)
    );
    cardEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.handleCardClick(card, cardEl, index);
      }
    });

    return cardEl;
  }

  handleCardClick(card, cardElement, index) {
    if (
      !this.isPlaying ||
      card.flipped ||
      card.matched ||
      this.flippedCards.length >= 2
    ) {
      return;
    }

    this.flipCard(card, cardElement, index);

    this.flippedCards.push({ card, element: cardElement, index });

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.updateDisplay();

      setTimeout(() => {
        this.checkForMatch();
      }, 1000);
    }

    if (window.audioManager) {
      window.audioManager.playButtonSound();
      window.audioManager.announceGameEvent("cardFlip", {
        content: card.symbol,
      });
    }
  }

  flipCard(card, cardElement, index) {
    card.flipped = true;
    cardElement.classList.add("flipped");
    cardElement.setAttribute(
      "aria-label",
      `Card ${index + 1}, showing ${card.symbol}`
    );

    const desc = cardElement.querySelector(`#card-desc-${index}`);
    if (desc) {
      desc.textContent = `Position ${index + 1}. Showing ${card.symbol}.`;
    }

    if (window.accessibilityManager) {
      window.accessibilityManager.announce(
        `Card flipped, showing ${card.symbol}`
      );
    }
  }

  checkForMatch() {
    if (this.flippedCards.length !== 2) return;

    const [first, second] = this.flippedCards;

    if (first.card.symbol === second.card.symbol) {
      this.handleMatch(first, second);
    } else {
      this.handleMismatch(first, second);
    }

    this.flippedCards = [];
  }

  handleMatch(first, second) {
    first.card.matched = true;
    second.card.matched = true;
    first.element.classList.add("matched");
    second.element.classList.add("matched");

    first.element.setAttribute(
      "aria-label",
      `Card ${first.index + 1}, matched ${first.card.symbol}`
    );
    second.element.setAttribute(
      "aria-label",
      `Card ${second.index + 1}, matched ${second.card.symbol}`
    );

    first.element.disabled = true;
    second.element.disabled = true;
    first.element.setAttribute("tabindex", "-1");
    second.element.setAttribute("tabindex", "-1");

    this.matchedPairs++;
    this.score += this.calculateMatchScore();

    this.showFeedback(`Match found! ${first.card.symbol}`, "success");
    this.updateDisplay();

    if (window.audioManager) {
      window.audioManager.playSuccessSound();
      window.audioManager.announceGameEvent("cardMatch", {
        content: first.card.symbol,
      });
    }

    if (window.accessibilityManager) {
      window.accessibilityManager.announce(
        `Match found! ${first.card.symbol}. ${this.matchedPairs} of ${this.totalPairs} pairs found.`
      );
    }

    if (this.matchedPairs === this.totalPairs) {
      setTimeout(() => this.handleGameComplete(), 500);
    }
  }

  handleMismatch(first, second) {
    setTimeout(() => {
      first.card.flipped = false;
      second.card.flipped = false;
      first.element.classList.remove("flipped");
      second.element.classList.remove("flipped");
      first.element.classList.add("mismatched");
      second.element.classList.add("mismatched");

      first.element.setAttribute(
        "aria-label",
        `Card ${first.index + 1}, face down`
      );
      second.element.setAttribute(
        "aria-label",
        `Card ${second.index + 1}, face down`
      );

      setTimeout(() => {
        first.element.classList.remove("mismatched");
        second.element.classList.remove("mismatched");
      }, 500);
    }, 100);

    this.showFeedback("Not a match. Try again!", "error");

    if (window.audioManager) {
      window.audioManager.playErrorSound();
      window.audioManager.announceGameEvent("cardMismatch");
    }

    if (window.accessibilityManager) {
      window.accessibilityManager.announce(
        "Not a match. Cards will flip back."
      );
    }
  }

  calculateMatchScore() {
    let baseScore = 100;

    const difficultyMultipliers = {
      easy: 1.0,
      medium: 1.5,
      hard: 2.0,
      expert: 2.5,
    };

    baseScore *= difficultyMultipliers[this.difficulty] || 1.0;

    const efficiency = this.totalPairs / this.moves;
    if (efficiency > 0.8) baseScore *= 1.5;
    else if (efficiency > 0.6) baseScore *= 1.2;

    // Time bonus (faster = higher score)
    const timeElapsed = (Date.now() - this.startTime) / 1000;
    const timeBonus = Math.max(0, 60 - timeElapsed) * 2;

    return Math.round(baseScore + timeBonus);
  }

  handleGameComplete() {
    this.isPlaying = false;
    this.endTime = Date.now();
    const totalTime = this.endTime - this.startTime;

    const timeBonus = this.calculateTimeBonus(totalTime);
    const moveBonus = this.calculateMoveBonus();
    this.score += timeBonus + moveBonus;

    const isPerfect = this.moves === this.totalPairs;

    if (window.storageManager && this.gameSession) {
      window.storageManager.recordGameEnd("matching", {
        score: this.score,
        moves: this.moves,
        completed: true,
        time: totalTime,
        perfect: isPerfect,
      });
    }

    const timeText = this.formatTime(totalTime);
    let message = `Congratulations! All pairs matched in ${this.moves} moves and ${timeText}!`;

    if (isPerfect) {
      message = `Perfect game! ${message} Amazing memory!`;
    }

    this.showFeedback(message, "complete");

    if (window.audioManager) {
      window.audioManager.playCompleteSound();
      window.audioManager.announceGameEvent("allMatched", {
        moves: this.moves,
        time: timeText,
      });
    }

    if (window.accessibilityManager) {
      window.accessibilityManager.announce(message);
    }

    setTimeout(() => {
      this.showRestartOption();
    }, 3000);
  }

  calculateTimeBonus(totalTime) {
    const seconds = totalTime / 1000;
    const targetTime = this.totalPairs * 5;

    if (seconds < targetTime) {
      return Math.round((targetTime - seconds) * 10);
    }
    return 0;
  }

  calculateMoveBonus() {
    const perfectMoves = this.totalPairs;
    const extraMoves = Math.max(0, this.moves - perfectMoves);

    return Math.max(0, (perfectMoves - extraMoves) * 50);
  }

  formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${remainingSeconds}s`;
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

  showFeedback(message, type) {
    if (this.elements.feedback) {
      this.elements.feedback.textContent = message;
      this.elements.feedback.className = `matching-feedback ${type}`;
    }
  }

  clearFeedback() {
    if (this.elements.feedback) {
      this.elements.feedback.textContent = "";
      this.elements.feedback.className = "matching-feedback";
    }
  }

  updateDisplay() {
    if (this.elements.moveCount) {
      this.elements.moveCount.textContent = this.moves;
    }

    if (this.elements.pairsFound) {
      this.elements.pairsFound.textContent = this.matchedPairs;
    }

    if (this.elements.totalPairs) {
      this.elements.totalPairs.textContent = this.totalPairs;
    }

    // Update score display if available
    const scoreDisplay = document.getElementById("current-score");
    if (scoreDisplay) {
      scoreDisplay.textContent = this.score;
    }
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.updateDifficulty();
  }

  setTheme(theme) {
    this.theme = theme;
    this.updateTheme();
  }

  getCurrentStats() {
    return {
      moves: this.moves,
      matchedPairs: this.matchedPairs,
      totalPairs: this.totalPairs,
      score: this.score,
      isPlaying: this.isPlaying,
      timeElapsed: this.startTime ? Date.now() - this.startTime : 0,
    };
  }

  provideHint() {
    if (!this.isPlaying || this.flippedCards.length > 0) return;

    const unmatchedCards = this.cards.filter(
      (card) => !card.matched && !card.flipped
    );
    const symbols = {};

    unmatchedCards.forEach((card, index) => {
      if (!symbols[card.symbol]) {
        symbols[card.symbol] = [];
      }
      symbols[card.symbol].push({ card, index });
    });

    for (const symbol in symbols) {
      if (symbols[symbol].length >= 2) {
        const pair = symbols[symbol].slice(0, 2);
        const positions = pair.map((p) => p.index + 1);

        if (window.accessibilityManager) {
          window.accessibilityManager.announce(
            `Hint: There are matching ${symbol} cards at positions ${positions.join(
              " and "
            )}.`
          );
        }

        if (window.audioManager) {
          window.audioManager.speak(
            `Hint: Look for ${symbol} at positions ${positions.join(" and ")}.`
          );
        }

        return;
      }
    }

    if (window.accessibilityManager) {
      window.accessibilityManager.announce("No hints available right now.");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.matchingGame = new MatchingGame();
});
