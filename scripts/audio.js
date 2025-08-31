// MemoryPal - Audio Manager
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.sounds = new Map();
    this.musicNotes = {
      C4: 261.63,
      D4: 293.66,
      E4: 329.63,
      F4: 349.23,
      G4: 392.0,
      A4: 440.0,
      B4: 493.88,
    };

    this.settings = {
      enabled: true,
      volume: 0.7,
      speechEnabled: true,
      musicEnabled: true,
      effectsEnabled: true,
    };

    this.speechSynth = window.speechSynthesis;
    this.voices = [];

    this.init();
  }

  async init() {
    try {
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Load voices for speech synthesis
      this.loadVoices();

      // Create sound effects
      this.createSoundEffects();

      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.warn("Audio initialization failed:", error);
      this.settings.enabled = false;
    }
  }

  loadVoices() {
    const loadVoicesHandler = () => {
      this.voices = this.speechSynth.getVoices();

      // Prefer natural, English voices
      this.preferredVoice =
        this.voices.find(
          (voice) =>
            voice.lang.startsWith("en") &&
            (voice.name.includes("Natural") || voice.name.includes("Premium"))
        ) ||
        this.voices.find((voice) => voice.lang.startsWith("en")) ||
        this.voices[0];
    };

    loadVoicesHandler();
    this.speechSynth.addEventListener("voiceschanged", loadVoicesHandler);
  }

  createSoundEffects() {
    // Create different sound types
    this.createToneSound("success", 523.25, 0.3, "sine"); // C5
    this.createToneSound("error", 146.83, 0.5, "sawtooth"); // D3
    this.createToneSound("click", 800, 0.1, "square");
    this.createToneSound("complete", 659.25, 0.8, "sine"); // E5

    // Create notification sounds
    this.createChordSound("levelUp", [523.25, 659.25, 783.99], 0.6); // C-E-G major
    this.createChordSound("gameOver", [220, 185, 146.83], 0.8); // Minor chord
  }

  createToneSound(name, frequency, duration, waveType = "sine") {
    this.sounds.set(name, {
      type: "tone",
      frequency,
      duration,
      waveType,
    });
  }

  createChordSound(name, frequencies, duration) {
    this.sounds.set(name, {
      type: "chord",
      frequencies,
      duration,
    });
  }

  setupEventListeners() {
    // Resume audio context on user interaction (required by browsers)
    document.addEventListener(
      "click",
      () => {
        if (this.audioContext && this.audioContext.state === "suspended") {
          this.audioContext.resume();
        }
      },
      { once: true }
    );

    document.addEventListener(
      "keydown",
      () => {
        if (this.audioContext && this.audioContext.state === "suspended") {
          this.audioContext.resume();
        }
      },
      { once: true }
    );
  }

  async playTone(frequency, duration = 0.2, waveType = "sine", volume = 0.5) {
    if (
      !this.settings.enabled ||
      !this.settings.musicEnabled ||
      !this.audioContext
    ) {
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(
        frequency,
        this.audioContext.currentTime
      );
      oscillator.type = waveType;

      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        volume * this.settings.volume,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + duration
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn("Failed to play tone:", error);
    }
  }

  async playChord(frequencies, duration = 0.5, volume = 0.3) {
    if (
      !this.settings.enabled ||
      !this.settings.musicEnabled ||
      !this.audioContext
    ) {
      return;
    }

    const promises = frequencies.map((freq) =>
      this.playTone(freq, duration, "sine", volume / frequencies.length)
    );

    await Promise.all(promises);
  }

  async playSound(soundName) {
    if (!this.settings.enabled || !this.settings.effectsEnabled) {
      return;
    }

    const sound = this.sounds.get(soundName);
    if (!sound) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }

    try {
      if (sound.type === "tone") {
        await this.playTone(sound.frequency, sound.duration, sound.waveType);
      } else if (sound.type === "chord") {
        await this.playChord(sound.frequencies, sound.duration);
      }
    } catch (error) {
      console.warn(`Failed to play sound '${soundName}':`, error);
    }
  }

  playColorSound(color) {
    const soundMap = {
      red: "C4",
      blue: "D4",
      green: "E4",
      yellow: "F4",
    };

    const note = soundMap[color];
    if (note && this.musicNotes[note]) {
      this.playTone(this.musicNotes[note], 0.3);
    }
  }

  playSequence(colors, interval = 600) {
    if (!this.settings.enabled || !this.settings.musicEnabled) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let index = 0;

      const playNext = () => {
        if (index >= colors.length) {
          resolve();
          return;
        }

        this.playColorSound(colors[index]);
        index++;

        setTimeout(playNext, interval);
      };

      playNext();
    });
  }

  speak(text, options = {}) {
    if (
      !this.settings.enabled ||
      !this.settings.speechEnabled ||
      !this.speechSynth
    ) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.speechSynth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice
      utterance.voice = this.preferredVoice;
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = (options.volume || 1.0) * this.settings.volume;

      utterance.onend = resolve;
      utterance.onerror = reject;

      this.speechSynth.speak(utterance);
    });
  }

  announceGameEvent(event, data = {}) {
    const announcements = {
      gameStart: "Game starting. Get ready!",
      sequenceShow: `Watch and listen to the sequence of ${data.length} colors.`,
      sequenceInput: "Now repeat the sequence by clicking the colors.",
      correctColor: `Correct! ${data.color} was right.`,
      incorrectColor: `Wrong color. The correct color was ${data.expected}.`,
      levelComplete: `Excellent! Level ${data.level} completed. Score: ${data.score}`,
      gameOver: `Game over. Your final score was ${data.score}. Well played!`,
      newHighScore: `Congratulations! New high score: ${data.score}!`,
      pause: "Game paused.",
      resume: "Game resumed.",
      cardFlip: `Card flipped. ${data.content}`,
      cardMatch: `Match found! ${data.content}`,
      cardMismatch: "Not a match. Cards will flip back.",
      allMatched: `Congratulations! All pairs matched in ${data.moves} moves.`,
    };

    const text = announcements[event] || event;

    // Play sound effect first, then speak
    this.playEventSound(event);

    // Delay speech slightly to avoid overlap
    setTimeout(() => {
      this.speak(text);
    }, 200);
  }

  playEventSound(event) {
    const soundMap = {
      gameStart: "click",
      correctColor: "success",
      incorrectColor: "error",
      levelComplete: "levelUp",
      gameOver: "gameOver",
      newHighScore: "complete",
      cardMatch: "success",
      cardMismatch: "error",
      allMatched: "complete",
    };

    const soundName = soundMap[event];
    if (soundName) {
      this.playSound(soundName);
    }
  }

  playButtonSound() {
    this.playSound("click");
  }

  playSuccessSound() {
    this.playSound("success");
  }

  playErrorSound() {
    this.playSound("error");
  }

  playCompleteSound() {
    this.playSound("complete");
  }

  // Settings management
  setVolume(volume) {
    this.settings.volume = Math.max(0, Math.min(1, volume));
  }

  enableAudio() {
    this.settings.enabled = true;
  }

  disableAudio() {
    this.settings.enabled = false;
    this.speechSynth.cancel();
  }

  enableSpeech() {
    this.settings.speechEnabled = true;
  }

  disableSpeech() {
    this.settings.speechEnabled = false;
    this.speechSynth.cancel();
  }

  enableMusic() {
    this.settings.musicEnabled = true;
  }

  disableMusic() {
    this.settings.musicEnabled = false;
  }

  enableEffects() {
    this.settings.effectsEnabled = true;
  }

  disableEffects() {
    this.settings.effectsEnabled = false;
  }

  // Audio description for visual elements
  describeVisualElement(element) {
    const descriptions = {
      "color-btn": (el) => {
        const color = el.dataset.color;
        const position = Array.from(el.parentNode.children).indexOf(el) + 1;
        return `${color} button in position ${position}`;
      },
      card: (el) => {
        const isFlipped = el.classList.contains("flipped");
        const content = el.textContent.trim();
        return isFlipped ? `Card showing ${content}` : "Face down card";
      },
      "progress-bar": (el) => {
        const value = el.getAttribute("aria-valuenow");
        return `Progress: ${value}% complete`;
      },
    };

    for (const [className, describer] of Object.entries(descriptions)) {
      if (element.classList.contains(className)) {
        return describer(element);
      }
    }

    return (
      element.textContent ||
      element.getAttribute("aria-label") ||
      "Interactive element"
    );
  }

  // Spatial audio for better accessibility
  playSpatialSound(soundName, position = "center") {
    if (!this.settings.enabled || !this.audioContext) {
      return;
    }

    // Create panner for spatial audio
    const panner = this.audioContext.createStereoPanner();

    const panValues = {
      left: -1,
      center: 0,
      right: 1,
    };

    panner.pan.value = panValues[position] || 0;

    // This would connect to the sound generation
    // Implementation depends on the specific sound system
  }

  // Rhythm and timing helpers for memory games
  createRhythmPattern(pattern, tempo = 120) {
    const beatDuration = 60000 / tempo; // ms per beat

    return pattern.map((beat, index) => ({
      time: index * beatDuration,
      sound: beat,
    }));
  }

  playRhythmPattern(pattern) {
    if (!this.settings.enabled) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let completedBeats = 0;

      pattern.forEach(({ time, sound }) => {
        setTimeout(() => {
          this.playSound(sound);
          completedBeats++;

          if (completedBeats === pattern.length) {
            resolve();
          }
        }, time);
      });
    });
  }

  // Accessibility helpers
  announceColorSequence(colors) {
    const colorNames = colors.join(", ");
    this.speak(`The sequence is: ${colorNames}`);
  }

  announceScore(score, level) {
    this.speak(`Current score: ${score}. Level: ${level}`);
  }

  announceInstructions(gameType) {
    const instructions = {
      sequence: "Watch the colors light up, then click them in the same order.",
      matching: "Click cards to flip them over and find matching pairs.",
      patterns: "Study the pattern and complete the missing parts.",
      wordchain: "Remember the sequence of words in the correct order.",
    };

    const text = instructions[gameType] || "Follow the game instructions.";
    this.speak(text);
  }

  // Cleanup
  destroy() {
    if (this.speechSynth) {
      this.speechSynth.cancel();
    }

    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Initialize audio manager
window.audioManager = new AudioManager();
