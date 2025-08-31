// MemoryPal - Storage Manager
class StorageManager {
  constructor() {
    this.storageKey = "memorypal-data";
    this.settingsKey = "memorypal-settings";
    this.statsKey = "memorypal-stats";

    this.defaultData = {
      user: {
        name: "",
        preferences: {},
        accessibility: {},
      },
      games: {
        sequence: {
          highScore: 0,
          bestLevel: 1,
          totalGames: 0,
          totalScore: 0,
          averageScore: 0,
          streaks: [],
        },
        matching: {
          highScore: 0,
          bestTime: null,
          fewestMoves: null,
          totalGames: 0,
          completionRate: 0,
        },
        patterns: {
          highScore: 0,
          bestLevel: 1,
          totalGames: 0,
          accuracy: 0,
        },
        wordchain: {
          highScore: 0,
          longestChain: 0,
          totalGames: 0,
          vocabulary: new Set(),
        },
      },
      achievements: [],
      sessions: [],
      progress: {
        totalPlayTime: 0,
        gamesPlayed: 0,
        lastPlayed: null,
        streak: 0,
        longestStreak: 0,
      },
    };

    this.data = this.loadData();
    this.setupAutoSave();
  }

  loadData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return this.mergeWithDefaults(parsed, this.defaultData);
      }
    } catch (error) {
      console.warn("Failed to load stored data:", error);
    }

    return JSON.parse(JSON.stringify(this.defaultData));
  }

  mergeWithDefaults(stored, defaults) {
    const merged = { ...defaults };

    for (const key in stored) {
      if (stored.hasOwnProperty(key)) {
        if (
          typeof stored[key] === "object" &&
          stored[key] !== null &&
          !Array.isArray(stored[key])
        ) {
          merged[key] = this.mergeWithDefaults(
            stored[key],
            defaults[key] || {}
          );
        } else {
          merged[key] = stored[key];
        }
      }
    }

    return merged;
  }

  saveData() {
    try {
      // Convert Set objects to arrays for storage
      const dataToStore = this.prepareForStorage(this.data);
      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
      return true;
    } catch (error) {
      console.error("Failed to save data:", error);
      return false;
    }
  }

  prepareForStorage(obj) {
    const prepared = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (value instanceof Set) {
          prepared[key] = Array.from(value);
        } else if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          prepared[key] = this.prepareForStorage(value);
        } else {
          prepared[key] = value;
        }
      }
    }

    return prepared;
  }

  setupAutoSave() {
    // Auto-save every 30 seconds
    setInterval(() => {
      this.saveData();
    }, 30000);

    // Save on page unload
    window.addEventListener("beforeunload", () => {
      this.saveData();
    });

    // Save on visibility change (mobile apps, tab switching)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.saveData();
      }
    });
  }

  // Game Statistics
  recordGameStart(gameType) {
    const session = {
      gameType,
      startTime: Date.now(),
      endTime: null,
      score: 0,
      level: 1,
      moves: 0,
      completed: false,
    };

    this.data.sessions.push(session);
    this.data.games[gameType].totalGames++;
    this.data.progress.gamesPlayed++;
    this.data.progress.lastPlayed = Date.now();

    return session;
  }

  recordGameEnd(gameType, gameData) {
    const session = this.data.sessions[this.data.sessions.length - 1];
    if (session && session.gameType === gameType) {
      session.endTime = Date.now();
      session.score = gameData.score || 0;
      session.level = gameData.level || 1;
      session.moves = gameData.moves || 0;
      session.completed = gameData.completed || false;

      const playTime = session.endTime - session.startTime;
      this.data.progress.totalPlayTime += playTime;
    }

    this.updateGameStats(gameType, gameData);
    this.checkAchievements(gameType, gameData);
    this.updateStreak(gameData.completed);
  }

  updateGameStats(gameType, gameData) {
    const stats = this.data.games[gameType];

    switch (gameType) {
      case "sequence":
        if (gameData.score > stats.highScore) {
          stats.highScore = gameData.score;
        }
        if (gameData.level > stats.bestLevel) {
          stats.bestLevel = gameData.level;
        }
        stats.totalScore += gameData.score;
        stats.averageScore = Math.round(stats.totalScore / stats.totalGames);

        if (gameData.streak) {
          stats.streaks.push(gameData.streak);
        }
        break;

      case "matching":
        if (gameData.score > stats.highScore) {
          stats.highScore = gameData.score;
        }
        if (
          gameData.time &&
          (!stats.bestTime || gameData.time < stats.bestTime)
        ) {
          stats.bestTime = gameData.time;
        }
        if (
          gameData.moves &&
          (!stats.fewestMoves || gameData.moves < stats.fewestMoves)
        ) {
          stats.fewestMoves = gameData.moves;
        }
        if (gameData.completed) {
          stats.completionRate = this.calculateCompletionRate(gameType);
        }
        break;

      case "patterns":
        if (gameData.score > stats.highScore) {
          stats.highScore = gameData.score;
        }
        if (gameData.level > stats.bestLevel) {
          stats.bestLevel = gameData.level;
        }
        stats.accuracy = this.calculateAccuracy(gameType);
        break;

      case "wordchain":
        if (gameData.score > stats.highScore) {
          stats.highScore = gameData.score;
        }
        if (gameData.chainLength > stats.longestChain) {
          stats.longestChain = gameData.chainLength;
        }
        if (gameData.words) {
          gameData.words.forEach((word) =>
            stats.vocabulary.add(word.toLowerCase())
          );
        }
        break;
    }
  }

  calculateCompletionRate(gameType) {
    const sessions = this.data.sessions.filter((s) => s.gameType === gameType);
    const completed = sessions.filter((s) => s.completed).length;
    return sessions.length > 0
      ? Math.round((completed / sessions.length) * 100)
      : 0;
  }

  calculateAccuracy(gameType) {
    const sessions = this.data.sessions.filter((s) => s.gameType === gameType);
    if (sessions.length === 0) return 0;

    const totalMoves = sessions.reduce((sum, s) => sum + (s.moves || 0), 0);
    const correctMoves = sessions.reduce((sum, s) => sum + (s.score || 0), 0);

    return totalMoves > 0 ? Math.round((correctMoves / totalMoves) * 100) : 0;
  }

  updateStreak(completed) {
    if (completed) {
      this.data.progress.streak++;
      if (this.data.progress.streak > this.data.progress.longestStreak) {
        this.data.progress.longestStreak = this.data.progress.streak;
      }
    } else {
      this.data.progress.streak = 0;
    }
  }

  // Achievements System
  checkAchievements(gameType, gameData) {
    const achievements = [
      {
        id: "first-game",
        name: "Getting Started",
        description: "Play your first game",
        condition: () => this.data.progress.gamesPlayed >= 1,
      },
      {
        id: "sequence-master",
        name: "Sequence Master",
        description: "Reach level 10 in Sequence Memory",
        condition: () => this.data.games.sequence.bestLevel >= 10,
      },
      {
        id: "perfect-match",
        name: "Perfect Match",
        description: "Complete a matching game with minimum moves",
        condition: () => gameType === "matching" && gameData.perfect,
      },
      {
        id: "speed-demon",
        name: "Speed Demon",
        description: "Complete a matching game in under 30 seconds",
        condition: () => gameType === "matching" && gameData.time < 30000,
      },
      {
        id: "streak-5",
        name: "On Fire",
        description: "Win 5 games in a row",
        condition: () => this.data.progress.streak >= 5,
      },
      {
        id: "streak-10",
        name: "Unstoppable",
        description: "Win 10 games in a row",
        condition: () => this.data.progress.streak >= 10,
      },
      {
        id: "dedicated-player",
        name: "Dedicated Player",
        description: "Play for 1 hour total",
        condition: () => this.data.progress.totalPlayTime >= 3600000,
      },
      {
        id: "vocabulary-builder",
        name: "Vocabulary Builder",
        description: "Learn 100 words in Word Chain",
        condition: () => this.data.games.wordchain.vocabulary.size >= 100,
      },
      {
        id: "high-scorer",
        name: "High Scorer",
        description: "Score over 1000 points in any game",
        condition: () =>
          Object.values(this.data.games).some((game) => game.highScore >= 1000),
      },
      {
        id: "completionist",
        name: "Completionist",
        description: "Play all four game types",
        condition: () =>
          Object.values(this.data.games).every((game) => game.totalGames > 0),
      },
    ];

    achievements.forEach((achievement) => {
      if (!this.hasAchievement(achievement.id) && achievement.condition()) {
        this.unlockAchievement(achievement);
      }
    });
  }

  hasAchievement(achievementId) {
    return this.data.achievements.some((a) => a.id === achievementId);
  }

  unlockAchievement(achievement) {
    const unlocked = {
      ...achievement,
      unlockedAt: Date.now(),
    };

    this.data.achievements.push(unlocked);

    // Notify user
    this.showAchievementNotification(achievement);

    // Play sound if audio is enabled
    if (window.audioManager) {
      window.audioManager.playCompleteSound();
      window.audioManager.speak(`Achievement unlocked: ${achievement.name}`);
    }
  }

  showAchievementNotification(achievement) {
    // Create achievement notification
    const notification = document.createElement("div");
    notification.className = "achievement-notification";
    notification.innerHTML = `
            <div class="achievement-icon">🏆</div>
            <div class="achievement-content">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
            </div>
        `;

    // Add styles
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 1rem;
            max-width: 300px;
            animation: slideInRight 0.5s ease-out;
        `;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.5s ease-in forwards";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 5000);
  }

  // User Preferences
  saveUserPreference(key, value) {
    this.data.user.preferences[key] = value;
    this.saveData();
  }

  getUserPreference(key, defaultValue = null) {
    return this.data.user.preferences[key] || defaultValue;
  }

  saveAccessibilitySettings(settings) {
    this.data.user.accessibility = {
      ...this.data.user.accessibility,
      ...settings,
    };
    this.saveData();
  }

  getAccessibilitySettings() {
    return this.data.user.accessibility;
  }

  // Data Export/Import
  exportData() {
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      data: this.prepareForStorage(this.data),
    };

    return JSON.stringify(exportData, null, 2);
  }

  importData(jsonString) {
    try {
      const imported = JSON.parse(jsonString);

      if (imported.version && imported.data) {
        this.data = this.mergeWithDefaults(imported.data, this.defaultData);
        this.saveData();
        return true;
      }
    } catch (error) {
      console.error("Failed to import data:", error);
    }

    return false;
  }

  // Statistics Getters
  getGameStats(gameType) {
    return this.data.games[gameType] || {};
  }

  getOverallStats() {
    return {
      totalGames: this.data.progress.gamesPlayed,
      totalPlayTime: this.data.progress.totalPlayTime,
      currentStreak: this.data.progress.streak,
      longestStreak: this.data.progress.longestStreak,
      achievements: this.data.achievements.length,
      lastPlayed: this.data.progress.lastPlayed,
    };
  }

  getRecentSessions(limit = 10) {
    return this.data.sessions
      .slice(-limit)
      .reverse()
      .map((session) => ({
        ...session,
        duration: session.endTime - session.startTime,
        date: new Date(session.startTime).toLocaleDateString(),
      }));
  }

  getAchievements() {
    return this.data.achievements.sort((a, b) => b.unlockedAt - a.unlockedAt);
  }

  // Data Management
  clearAllData() {
    this.data = JSON.parse(JSON.stringify(this.defaultData));
    this.saveData();
    localStorage.removeItem(this.settingsKey);
    localStorage.removeItem(this.statsKey);
  }

  clearGameData(gameType) {
    if (this.data.games[gameType]) {
      this.data.games[gameType] = JSON.parse(
        JSON.stringify(this.defaultData.games[gameType])
      );
      this.saveData();
    }
  }

  // Analytics helpers
  getPlayTimeToday() {
    const today = new Date().toDateString();
    const todaySessions = this.data.sessions.filter(
      (session) => new Date(session.startTime).toDateString() === today
    );

    return todaySessions.reduce((total, session) => {
      if (session.endTime) {
        return total + (session.endTime - session.startTime);
      }
      return total;
    }, 0);
  }

  getAverageSessionLength() {
    const completedSessions = this.data.sessions.filter((s) => s.endTime);
    if (completedSessions.length === 0) return 0;

    const totalTime = completedSessions.reduce(
      (sum, s) => sum + (s.endTime - s.startTime),
      0
    );
    return Math.round(totalTime / completedSessions.length);
  }

  getGameTypeDistribution() {
    const distribution = {};
    this.data.sessions.forEach((session) => {
      distribution[session.gameType] =
        (distribution[session.gameType] || 0) + 1;
    });
    return distribution;
  }

  // Backup and restore
  createBackup() {
    const backup = {
      timestamp: Date.now(),
      data: this.exportData(),
    };

    const backups = JSON.parse(
      localStorage.getItem("memorypal-backups") || "[]"
    );
    backups.push(backup);

    // Keep only last 5 backups
    if (backups.length > 5) {
      backups.shift();
    }

    localStorage.setItem("memorypal-backups", JSON.stringify(backups));
  }

  getBackups() {
    return JSON.parse(localStorage.getItem("memorypal-backups") || "[]");
  }

  restoreBackup(timestamp) {
    const backups = this.getBackups();
    const backup = backups.find((b) => b.timestamp === timestamp);

    if (backup) {
      return this.importData(backup.data);
    }

    return false;
  }
}

// Initialize storage manager
window.storageManager = new StorageManager();

// Add CSS for achievement notifications
const achievementStyles = document.createElement("style");
achievementStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .achievement-notification .achievement-icon {
        font-size: 2rem;
    }
    
    .achievement-notification .achievement-title {
        font-weight: bold;
        font-size: 0.9rem;
        margin-bottom: 0.25rem;
    }
    
    .achievement-notification .achievement-name {
        font-weight: 600;
        font-size: 1rem;
        margin-bottom: 0.25rem;
    }
    
    .achievement-notification .achievement-description {
        font-size: 0.85rem;
        opacity: 0.9;
    }
`;
document.head.appendChild(achievementStyles);
