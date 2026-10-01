/**
 * Procedural Web Audio API sound synthesis engine
 * 100% self-contained with zero external asset dependencies
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.muted = false;

    // Master bus
    this.masterGain = null;
    this.engineGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.uiGain = null;

    // Engine synth nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineSub = null;
    this.engineFilter = null;
    this.distortion = null;

    // Tire screech nodes
    this.screechNode = null;
    this.screechGain = null;
    this.screechFilter = null;

    // Wind noise nodes
    this.windNode = null;
    this.windGain = null;

    // Showroom synth drone
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;

    // Indicator loop state
    this.indicatorInterval = null;
    this.indicatorTick = true;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Submix channels
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.uiGain = this.ctx.createGain();
      this.uiGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.uiGain.connect(this.masterGain);

      this.setupEngineSynth();
      this.setupTireScreech();
      this.setupWindNoise();
      this.setupShowroomAmbient();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSynth() {
    if (!this.ctx) return;

    // Dual sawtooth oscillators + sub triangle for punchy automotive roar
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'sawtooth';
    this.engineOsc2.frequency.setValueAtTime(45.6, this.ctx.currentTime); // slight detune

    this.engineSub = this.ctx.createOscillator();
    this.engineSub.type = 'triangle';
    this.engineSub.frequency.setValueAtTime(22.5, this.ctx.currentTime);

    // Lowpass filter that opens with throttle
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    // Distortion waveshaper curve
    this.distortion = this.ctx.createWaveShaper();
    this.distortion.curve = this.makeDistortionCurve(18);
    this.distortion.oversample = '4x';

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineSub.connect(this.engineFilter);
    this.engineFilter.connect(this.distortion);
    this.distortion.connect(this.engineGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSub.start();
  }

  makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  setupTireScreech() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.screechNode = this.ctx.createBufferSource();
    this.screechNode.buffer = noiseBuffer;
    this.screechNode.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.screechNode.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.sfxGain);

    this.screechNode.start();
  }

  setupWindNoise() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02; // Pink noise
      lastOut = output[i];
    }

    this.windNode = this.ctx.createBufferSource();
    this.windNode.buffer = noiseBuffer;
    this.windNode.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.windNode.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxGain);

    this.windNode.start();
  }

  setupShowroomAmbient() {
    if (!this.ctx) return;
    this.ambientOsc1 = this.ctx.createOscillator();
    this.ambientOsc1.type = 'sine';
    this.ambientOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note

    this.ambientOsc2 = this.ctx.createOscillator();
    this.ambientOsc2.type = 'triangle';
    this.ambientOsc2.frequency.setValueAtTime(82.41, this.ctx.currentTime); // E2 note

    const ambientFilter = this.ctx.createBiquadFilter();
    ambientFilter.type = 'lowpass';
    ambientFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

    this.ambientOsc1.connect(ambientFilter);
    this.ambientOsc2.connect(ambientFilter);
    ambientFilter.connect(this.ambientGain);

    this.ambientOsc1.start();
    this.ambientOsc2.start();
  }

  updateEngine(rpm, throttle = 0, isVehicleRunning = true) {
    if (!this.ctx || !this.engineOsc1) return;

    if (!isVehicleRunning) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }

    // Base pitch from RPM (idle 800 -> 35Hz, redline 8000 -> 360Hz)
    const normalizedRPM = Math.max(0, Math.min(1, (rpm - 800) / 7200));
    const baseFreq = 38 + normalizedRPM * 290;

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.015, this.ctx.currentTime, 0.04);
    this.engineSub.frequency.setTargetAtTime(baseFreq * 0.5, this.ctx.currentTime, 0.04);

    // Filter cut-off opens wider when throttle is applied
    const filterFreq = 280 + throttle * 1600 + normalizedRPM * 2200;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);

    // Volume level
    const gainLevel = 0.25 + throttle * 0.35 + normalizedRPM * 0.2;
    this.engineGain.gain.setTargetAtTime(gainLevel, this.ctx.currentTime, 0.05);
  }

  updateTireSlip(slipRatio, isHandbrakeSliding = false) {
    if (!this.ctx || !this.screechGain) return;
    let target = 0;
    if (isHandbrakeSliding) {
      target = Math.min(0.65, 0.35 + (slipRatio || 0) * 0.3);
    } else if (slipRatio > 0.3) {
      target = Math.min(0.6, (slipRatio - 0.3) * 1.2);
    }
    this.screechGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
  }

  playHandbrake(engaged = true) {
    if (!this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    if (engaged) {
      // Mechanical ratchet sound: 3 quick ascending metallic clicks
      for (let i = 0; i < 3; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + i * 0.04;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(820 + i * 240, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.032);

        gain.gain.setValueAtTime(0.24, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.032);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);

        osc.start(t);
        osc.stop(t + 0.032);
      }
    } else {
      // Solid release clack / thunk
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.065);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(now);
      osc.stop(now + 0.065);
    }
  }

  updateWind(speedKmh) {
    if (!this.ctx || !this.windGain) return;
    const target = Math.min(0.35, Math.pow(speedKmh / 220, 2) * 0.35);
    this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
  }

  playGearShiftPop() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playCrash(intensity = 1.0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.3);

    gain.gain.setValueAtTime(Math.min(0.8, intensity * 0.7), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playIndicatorClick(isTick = true) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isTick ? 950 : 750, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  playHorn(active = true) {
    if (!this.ctx) return;
    if (active) {
      if (!this.hornOsc1) {
        const now = this.ctx.currentTime;
        this.hornOsc1 = this.ctx.createOscillator();
        this.hornOsc2 = this.ctx.createOscillator();
        this.hornGain = this.ctx.createGain();

        this.hornOsc1.type = 'sawtooth';
        this.hornOsc1.frequency.setValueAtTime(425, now);

        this.hornOsc2.type = 'sawtooth';
        this.hornOsc2.frequency.setValueAtTime(510, now);

        this.hornGain.gain.setValueAtTime(0.3, now);

        this.hornOsc1.connect(this.hornGain);
        this.hornOsc2.connect(this.hornGain);
        this.hornGain.connect(this.sfxGain);

        this.hornOsc1.start();
        this.hornOsc2.start();
      }
    } else {
      if (this.hornOsc1) {
        this.hornOsc1.stop();
        this.hornOsc2.stop();
        this.hornOsc1 = null;
        this.hornOsc2 = null;
      }
    }
  }

  playWiperSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.25);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playCheckpointChime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  playUIHover() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playUIClick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playDoorOpen() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      // 1. Mechanical latch release click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);

      // 2. Subtle pneumatic seal pressure pop
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      popOsc.type = 'sine';
      popOsc.frequency.setValueAtTime(320, now + 0.015);
      popOsc.frequency.exponentialRampToValueAtTime(110, now + 0.11);
      popGain.gain.setValueAtTime(0.12, now + 0.015);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      popOsc.connect(popGain);
      popGain.connect(this.sfxGain);
      popOsc.start(now + 0.015);
      popOsc.stop(now + 0.11);
    } catch (e) {}
  }

  playDoorClose() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      // 1. Deep solid automotive door frame thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);
      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.16);

      // 2. Sharp metallic striker latch click
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1800, now + 0.035);
      clickOsc.frequency.exponentialRampToValueAtTime(450, now + 0.10);
      clickGain.gain.setValueAtTime(0.24, now + 0.035);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
      clickOsc.connect(clickGain);
      clickGain.connect(this.sfxGain);
      clickOsc.start(now + 0.035);
      clickOsc.stop(now + 0.10);
    } catch (e) {}
  }

  playBootOpen() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      // 1. Boot latch release click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.09);
      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.09);

      // 2. Pneumatic gas strut expansion hiss
      const strutOsc = this.ctx.createOscillator();
      const strutGain = this.ctx.createGain();
      strutOsc.type = 'sine';
      strutOsc.frequency.setValueAtTime(260, now + 0.02);
      strutOsc.frequency.exponentialRampToValueAtTime(90, now + 0.18);
      strutGain.gain.setValueAtTime(0.14, now + 0.02);
      strutGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      strutOsc.connect(strutGain);
      strutGain.connect(this.sfxGain);
      strutOsc.start(now + 0.02);
      strutOsc.stop(now + 0.18);
    } catch (e) {}
  }

  playBootClose() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      // 1. Heavy boot lid acoustic slam
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.18);
      gain.gain.setValueAtTime(0.42, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.18);

      // 2. Metallic latch striker lock click
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1600, now + 0.03);
      clickOsc.frequency.exponentialRampToValueAtTime(380, now + 0.10);
      clickGain.gain.setValueAtTime(0.26, now + 0.03);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
      clickOsc.connect(clickGain);
      clickGain.connect(this.sfxGain);
      clickOsc.start(now + 0.03);
      clickOsc.stop(now + 0.10);
    } catch (e) {}
  }

  playRoofMotor() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      // Electro-hydraulic convertible roof actuator motor whine
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.linearRampToValueAtTime(260, now + 0.15);
      osc.frequency.linearRampToValueAtTime(190, now + 0.35);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  setAmbientShowroom(active) {
    if (!this.ambientGain) return;
    this.ambientGain.gain.setTargetAtTime(active ? 0.25 : 0.0, this.ctx ? this.ctx.currentTime : 0, 0.3);
  }

  setMasterVolume(percent) {
    const val = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  setEngineVolume(percent) {
    const val = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(val * 0.5, this.ctx.currentTime);
    }
  }

  setEnvironmentVolume(percent) {
    const val = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(val * 0.3, this.ctx.currentTime);
    }
    if (this.windGain && this.ctx) {
      this.windGain.gain.setValueAtTime(val * 0.25, this.ctx.currentTime);
    }
  }

  setUIVolume(percent) {
    const val = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
    if (this.uiGain && this.ctx) {
      this.uiGain.gain.setValueAtTime(val * 0.85, this.ctx.currentTime);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(val * 0.7, this.ctx.currentTime);
    }
  }
}
