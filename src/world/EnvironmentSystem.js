import * as THREE from 'three';

/**
 * EnvironmentSystem
 * 
 * Manages Dynamic Day/Night Cycle, Streetlights, Glowing Building Windows,
 * and Weather System (Clear, Cloudy, Rain with wet roads, rain particles, and windshield wipers).
 */

export const TIME_PRESETS = {
  morning: {
    id: 'morning',
    name: 'MORNING',
    hour: 7.5,
    sunPosition: new THREE.Vector3(180, 55, -80),
    sunColor: 0xffd5a0,
    sunIntensity: 1.4,
    ambientColor: 0xfff2e5,
    ambientIntensity: 0.58,
    hemiSky: 0xffcda0,
    hemiGround: 0x445566,
    fogColor: 0xf5dbbf,
    fogDensity: 0.0011,
    windowGlow: 0.12,
    streetlightGlow: 0.0,
    isNight: false
  },
  day: {
    id: 'day',
    name: 'DAY',
    hour: 12.0,
    sunPosition: new THREE.Vector3(120, 190, 90),
    sunColor: 0xfffaea,
    sunIntensity: 1.6,
    ambientColor: 0xffffff,
    ambientIntensity: 0.65,
    hemiSky: 0x78bbf5,
    hemiGround: 0x556655,
    fogColor: 0x8ec8f8,
    fogDensity: 0.0010,
    windowGlow: 0.0,
    streetlightGlow: 0.0,
    isNight: false
  },
  evening: {
    id: 'evening',
    name: 'EVENING',
    hour: 18.5,
    sunPosition: new THREE.Vector3(180, 35, 120),
    sunColor: 0xff6622,
    sunIntensity: 1.35,
    ambientColor: 0xff9977,
    ambientIntensity: 0.45,
    hemiSky: 0xdd6633,
    hemiGround: 0x222233,
    fogColor: 0xd9825b,
    fogDensity: 0.0016,
    windowGlow: 0.6,
    streetlightGlow: 0.85,
    isNight: true
  },
  night: {
    id: 'night',
    name: 'NIGHT',
    hour: 0.0,
    sunPosition: new THREE.Vector3(-100, 140, -120),
    sunColor: 0x3366aa, // Cool moonlight
    sunIntensity: 0.35,
    ambientColor: 0x0c1526,
    ambientIntensity: 0.24,
    hemiSky: 0x162644,
    hemiGround: 0x050a12,
    fogColor: 0x050914,
    fogDensity: 0.0022,
    windowGlow: 0.95,
    streetlightGlow: 1.0,
    isNight: true
  }
};

export const WEATHER_PRESETS = {
  clear: {
    id: 'clear',
    name: 'CLEAR',
    rainDensity: 0,
    roadRoughness: 0.82,
    roadMetalness: 0.08,
    fogMultiplier: 1.0,
    sunDimmer: 1.0,
    cloudCover: 0.0
  },
  cloudy: {
    id: 'cloudy',
    name: 'CLOUDY',
    rainDensity: 0,
    roadRoughness: 0.78,
    roadMetalness: 0.12,
    fogMultiplier: 1.6,
    sunDimmer: 0.65,
    cloudCover: 0.85
  },
  rain: {
    id: 'rain',
    name: 'RAIN',
    rainDensity: 1.0,
    roadRoughness: 0.16, // Mirror wet slick asphalt
    roadMetalness: 0.75, // Strong specular reflection
    fogMultiplier: 1.45,
    sunDimmer: 0.55,
    cloudCover: 1.0
  }
};

export class EnvironmentSystem {
  constructor(scene, sunLight, ambientLight, hemiLight, camera, renderer, audioManager = null) {
    this.scene = scene;
    this.sunLight = sunLight;
    this.ambientLight = ambientLight;
    this.hemiLight = hemiLight;
    this.camera = camera;
    this.renderer = renderer;
    this.audioManager = audioManager;

    // Time of day state
    this.timeMode = 'day'; // 'morning' | 'day' | 'evening' | 'night' | 'dynamic'
    this.isDynamicCycle = false;
    this.cycleHour = 12.0; // 0 - 24
    this.cycleSpeed = 0.5; // in-game hours per real second (1 hour every 2s)

    // Current interpolated lighting values (Default: Bright Clear Daylight)
    this.currentSunPos = new THREE.Vector3(120, 190, 90);
    this.currentSunColor = new THREE.Color(0xfffaea);
    this.currentSunIntensity = 1.6;
    this.currentAmbientColor = new THREE.Color(0xffffff);
    this.currentAmbientIntensity = 0.65;
    this.currentFogColor = new THREE.Color(0x8ec8f8);
    this.currentFogDensity = 0.0010;
    this.currentWindowGlow = 0.0;
    this.currentStreetlightGlow = 0.0;
    this.isNight = false;
    this.nightFactor = 0.0;

    // Weather state
    this.weatherMode = 'clear'; // 'clear' | 'cloudy' | 'rain'
    this.rainTransition = 0.0; // 0 (dry) to 1 (full rain)
    this.rainFactor = 0.0;
    this.cloudFactor = 0.0;
    this.currentRoadRoughness = 0.82;
    this.currentRoadMetalness = 0.08;

    // Aliases for intuitive access
    this.currentTimeOfDay = this.timeMode;
    this.currentWeather = this.weatherMode;

    // Windshield rain and wiper simulation
    this.windshieldWetness = 0.0; // 0 to 1
    this.wiperSweepTimer = 0;
    this.isWiping = false;

    // Registered materials for wetness updates
    this.roadMaterials = new Set();
    this.city = null;
    this.trafficManager = null;
    this.vehicleManager = null;

    // Rain Particle System
    this.rainParticles = null;
    this.rainGeometry = null;
    this.rainMaterial = null;
    this.rainDropCount = 3500;
    this.rainBoxSize = { x: 100, y: 70, z: 100 };

    // Screen-space rain overlay elements
    this.screenRainOverlay = null;

    this.initRainParticles();
    this.initScreenRainOverlay();
  }

  setCity(city) {
    this.city = city;
    if (city && city.roadMat) this.registerRoadMaterial(city.roadMat);
  }

  setTrafficManager(tm) {
    this.trafficManager = tm;
  }

  setVehicleManager(vm) {
    this.vehicleManager = vm;
  }

  registerRoadMaterial(mat) {
    if (mat && mat.isMaterial) {
      this.roadMaterials.add(mat);
    }
  }

  initRainParticles() {
    this.rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainDropCount * 3);
    const velocities = new Float32Array(this.rainDropCount);

    for (let i = 0; i < this.rainDropCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * this.rainBoxSize.x;
      positions[i * 3 + 1] = Math.random() * this.rainBoxSize.y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.rainBoxSize.z;
      velocities[i] = 40 + Math.random() * 15; // 40-55 m/s fall speed
    }

    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

    // Custom translucent rain streak material
    this.rainMaterial = new THREE.PointsMaterial({
      color: 0x99ccff,
      size: 0.35,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.rainParticles = new THREE.Points(this.rainGeometry, this.rainMaterial);
    this.rainParticles.frustumCulled = false;
    this.scene.add(this.rainParticles);
  }

  initScreenRainOverlay() {
    // Screen-space overlay for droplets on windshield
    if (typeof document !== 'undefined') {
      let overlay = document.querySelector('#hud-rain-screen');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'hud-rain-screen';
        overlay.className = 'hud-rain-screen';
        overlay.style.position = 'absolute';
        overlay.style.inset = '0';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '5';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.4s ease';

        const canvas = document.createElement('canvas');
        canvas.id = 'hud-rain-canvas';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        overlay.appendChild(canvas);

        const container = document.querySelector('#ui-container') || document.body;
        container.appendChild(overlay);
      }
      this.screenRainOverlay = overlay;
      this.resizeRainCanvas();
      window.addEventListener('resize', () => this.resizeRainCanvas());
    }
  }

  resizeRainCanvas() {
    if (!this.screenRainOverlay) return;
    const canvas = this.screenRainOverlay.querySelector('#hud-rain-canvas');
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  /**
   * Set Time of Day preset
   * @param {string} mode - 'morning' | 'day' | 'evening' | 'sunset' | 'night' | 'dynamic'
   */
  setTimeOfDay(mode) {
    const m = String(mode || 'day').toLowerCase();
    if (m === 'dynamic') {
      this.isDynamicCycle = true;
      this.timeMode = 'dynamic';
    } else {
      this.isDynamicCycle = false;
      const normalized = m === 'sunset' ? 'evening' : m;
      if (TIME_PRESETS[normalized]) {
        this.timeMode = normalized;
        this.cycleHour = TIME_PRESETS[normalized].hour;
      } else {
        this.timeMode = 'day';
        this.cycleHour = 12.0;
      }
    }
    this.timeOfDay = this.timeMode;
    this.currentTimeOfDay = this.timeMode;
  }

  /**
   * Set Weather Mode
   * @param {string} weather - 'clear' | 'cloudy' | 'rain'
   */
  setWeather(weather) {
    const w = String(weather || 'clear').toLowerCase();
    if (WEATHER_PRESETS[w]) {
      this.weatherMode = w;
    } else {
      this.weatherMode = 'clear';
    }
    this.weather = this.weatherMode;
    this.currentWeather = this.weatherMode;
    this.cloudFactor = this.weatherMode === 'cloudy' ? 0.85 : (this.weatherMode === 'rain' ? 1.0 : 0.0);

    if (this.audioManager && typeof this.audioManager.setRainAudio === 'function') {
      this.audioManager.setRainAudio(this.weatherMode === 'rain', this.weatherMode === 'rain' ? 0.8 : 0);
    }
  }

  getFormattedTime() {
    return this.getTimeTelemetry().timeFormatted;
  }

  isRaining() {
    return this.weatherMode === 'rain';
  }

  isNightActive() {
    return !!this.isNight;
  }

  getTimeTelemetry() {
    const h = Math.floor(this.cycleHour);
    const m = Math.floor((this.cycleHour % 1) * 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const timeFormatted = `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;

    let phaseName = 'DAY';
    if (this.cycleHour >= 5 && this.cycleHour < 10) phaseName = 'MORNING';
    else if (this.cycleHour >= 10 && this.cycleHour < 17) phaseName = 'DAY';
    else if (this.cycleHour >= 17 && this.cycleHour < 21) phaseName = 'EVENING';
    else phaseName = 'NIGHT';

    return {
      hour: this.cycleHour,
      timeFormatted,
      phaseName,
      timeMode: this.timeMode,
      weatherMode: this.weatherMode,
      isRaining: this.weatherMode === 'rain',
      isNight: this.isNight
    };
  }

  /**
   * Calculate Target Lighting values based on cycle hour or static preset
   */
  getTargetPreset() {
    if (!this.isDynamicCycle) {
      return TIME_PRESETS[this.timeMode] || TIME_PRESETS.day;
    }

    // Dynamic hour mapping between 4 anchor phases
    const h = (this.cycleHour % 24 + 24) % 24;

    // Anchors: Night (0h), Morning (7h), Day (12h), Evening (18.5h), Night (24h)
    let p1, p2, factor;
    if (h < 7.0) {
      p1 = TIME_PRESETS.night;
      p2 = TIME_PRESETS.morning;
      factor = h / 7.0;
    } else if (h < 12.0) {
      p1 = TIME_PRESETS.morning;
      p2 = TIME_PRESETS.day;
      factor = (h - 7.0) / 5.0;
    } else if (h < 18.5) {
      p1 = TIME_PRESETS.day;
      p2 = TIME_PRESETS.evening;
      factor = (h - 12.0) / 6.5;
    } else {
      p1 = TIME_PRESETS.evening;
      p2 = TIME_PRESETS.night;
      factor = (h - 18.5) / 5.5;
    }

    // Smooth cosine blending
    const smoothFactor = 0.5 - 0.5 * Math.cos(factor * Math.PI);

    const sunPos = new THREE.Vector3().lerpVectors(p1.sunPosition, p2.sunPosition, smoothFactor);
    const sunCol = new THREE.Color(p1.sunColor).lerp(new THREE.Color(p2.sunColor), smoothFactor);
    const sunInt = THREE.MathUtils.lerp(p1.sunIntensity, p2.sunIntensity, smoothFactor);
    const ambCol = new THREE.Color(p1.ambientColor).lerp(new THREE.Color(p2.ambientColor), smoothFactor);
    const ambInt = THREE.MathUtils.lerp(p1.ambientIntensity, p2.ambientIntensity, smoothFactor);
    const fogCol = new THREE.Color(p1.fogColor).lerp(new THREE.Color(p2.fogColor), smoothFactor);
    const fogDen = THREE.MathUtils.lerp(p1.fogDensity, p2.fogDensity, smoothFactor);
    const winGlow = THREE.MathUtils.lerp(p1.windowGlow, p2.windowGlow, smoothFactor);
    const streetGlow = THREE.MathUtils.lerp(p1.streetlightGlow, p2.streetlightGlow, smoothFactor);

    return {
      sunPosition: sunPos,
      sunColor: sunCol,
      sunIntensity: sunInt,
      ambientColor: ambCol,
      ambientIntensity: ambInt,
      fogColor: fogCol,
      fogDensity: fogDen,
      windowGlow: winGlow,
      streetlightGlow: streetGlow,
      isNight: h < 6.0 || h >= 18.5
    };
  }

  update(dt, playerPosition = null, camera = null, activeVehicle = null) {
    if (dt <= 0) return;

    // 1. Advance dynamic time cycle
    if (this.isDynamicCycle) {
      this.cycleHour = (this.cycleHour + dt * this.cycleSpeed) % 24;
    }

    const target = this.getTargetPreset();
    const weather = WEATHER_PRESETS[this.weatherMode] || WEATHER_PRESETS.clear;
    const lerpRate = Math.min(1.0, dt * 2.8);

    // Weather impact on lighting
    const targetSunInt = target.sunIntensity * weather.sunDimmer;
    const targetFogDensity = target.fogDensity * weather.fogMultiplier;
    let targetFogCol = target.fogColor;
    if (this.weatherMode === 'rain') {
      targetFogCol = new THREE.Color(target.fogColor).lerp(new THREE.Color(0x111620), 0.45);
    } else if (this.weatherMode === 'cloudy') {
      targetFogCol = new THREE.Color(target.fogColor).lerp(new THREE.Color(0x28303d), 0.35);
    }

    // 2. Smoothly interpolate environment lighting
    this.currentSunPos.lerp(target.sunPosition, lerpRate);
    this.currentSunColor.lerp(target.sunColor instanceof THREE.Color ? target.sunColor : new THREE.Color(target.sunColor), lerpRate);
    this.currentSunIntensity = THREE.MathUtils.lerp(this.currentSunIntensity, targetSunInt, lerpRate);
    this.currentAmbientColor.lerp(target.ambientColor instanceof THREE.Color ? target.ambientColor : new THREE.Color(target.ambientColor), lerpRate);
    this.currentAmbientIntensity = THREE.MathUtils.lerp(this.currentAmbientIntensity, target.ambientIntensity, lerpRate);
    this.currentFogColor.lerp(targetFogCol instanceof THREE.Color ? targetFogCol : new THREE.Color(targetFogCol), lerpRate);
    this.currentFogDensity = THREE.MathUtils.lerp(this.currentFogDensity, targetFogDensity, lerpRate);
    this.currentWindowGlow = THREE.MathUtils.lerp(this.currentWindowGlow, target.windowGlow, lerpRate);
    this.currentStreetlightGlow = THREE.MathUtils.lerp(this.currentStreetlightGlow, target.streetlightGlow, lerpRate);
    this.isNight = target.isNight;
    this.nightFactor = this.isNight ? 1.0 : (this.timeMode === 'evening' ? 0.7 : 0.0);
    this.rainFactor = this.rainTransition;
    this.cloudFactor = this.weatherMode === 'cloudy' ? 0.85 : (this.weatherMode === 'rain' ? 1.0 : 0.0);

    // Apply to Three.js scene & lights
    if (this.sunLight) {
      this.sunLight.position.copy(this.currentSunPos);
      this.sunLight.color.copy(this.currentSunColor);
      this.sunLight.intensity = this.currentSunIntensity;
    }

    if (this.ambientLight) {
      this.ambientLight.color.copy(this.currentAmbientColor);
      this.ambientLight.intensity = this.currentAmbientIntensity;
    }

    if (this.hemiLight && target.hemiSky) {
      const targetSky = target.hemiSky instanceof THREE.Color ? target.hemiSky : new THREE.Color(target.hemiSky);
      const targetGround = target.hemiGround instanceof THREE.Color ? target.hemiGround : new THREE.Color(target.hemiGround);
      this.hemiLight.color.lerp(targetSky, lerpRate);
      this.hemiLight.groundColor.lerp(targetGround, lerpRate);
      this.hemiLight.intensity = this.currentAmbientIntensity * 0.95;
    }

    if (this.scene) {
      if (this.scene.background && this.scene.background.isColor) {
        this.scene.background.copy(this.currentFogColor);
      }
      if (this.scene.fog) {
        if (this.scene.fog.color) this.scene.fog.color.copy(this.currentFogColor);
        if (this.scene.fog.density !== undefined) this.scene.fog.density = this.currentFogDensity;
      }
    }

    // 3. Reactivity: Streetlights & Building Windows Glow
    if (this.city) {
      if (typeof this.city.setStreetlights === 'function') {
        this.city.setStreetlights(this.currentStreetlightGlow, this.isNight);
      }
      if (typeof this.city.setBuildingWindowGlow === 'function') {
        this.city.setBuildingWindowGlow(this.currentWindowGlow);
      }
    }

    // 4. Reactivity: Traffic AI vehicle headlights
    if (this.trafficManager && typeof this.trafficManager.setNightMode === 'function') {
      this.trafficManager.setNightMode(this.isNight);
    }

    // 5. Reactivity: Player vehicle headlights auto-activation at night
    if (activeVehicle) {
      if (this.isNight && !activeVehicle.headlightsOn) {
        activeVehicle.setHeadlights(true);
      }
    }

    // 6. Weather & Wet Roads Transition
    const targetRain = this.weatherMode === 'rain' ? 1.0 : 0.0;
    this.rainTransition = THREE.MathUtils.lerp(this.rainTransition, targetRain, dt * 1.5);

    const targetRoughness = weather.roadRoughness;
    const targetMetalness = weather.roadMetalness;
    this.currentRoadRoughness = THREE.MathUtils.lerp(this.currentRoadRoughness, targetRoughness, dt * 1.5);
    this.currentRoadMetalness = THREE.MathUtils.lerp(this.currentRoadMetalness, targetMetalness, dt * 1.5);

    // Apply wet road sheen & roughness to registered road materials
    this.roadMaterials.forEach(mat => {
      if (mat) {
        mat.roughness = this.currentRoadRoughness;
        mat.metalness = this.currentRoadMetalness;
        mat.needsUpdate = true;
      }
    });

    // 7. Update Rain Particle System
    this.updateRainParticles(dt, camera || this.camera);

    // 8. Windshield Wipers & Rain Droplets
    this.updateWindshieldRain(dt, activeVehicle);
  }

  updateRainParticles(dt, camera) {
    if (!this.rainParticles || !this.rainGeometry) return;

    if (this.rainTransition < 0.01) {
      this.rainParticles.visible = false;
      this.rainMaterial.opacity = 0;
      return;
    }

    this.rainParticles.visible = true;
    this.rainMaterial.opacity = this.rainTransition * 0.75;

    const camPos = camera ? camera.position : (this.camera ? this.camera.position : new THREE.Vector3());
    const positions = this.rainGeometry.attributes.position.array;
    const velocities = this.rainGeometry.attributes.velocity.array;

    const halfX = this.rainBoxSize.x * 0.5;
    const halfZ = this.rainBoxSize.z * 0.5;

    for (let i = 0; i < this.rainDropCount; i++) {
      const idx = i * 3;
      // Fall down
      positions[idx + 1] -= velocities[i] * dt;

      // Wrap vertically
      if (positions[idx + 1] < camPos.y - 10) {
        positions[idx + 1] = camPos.y + this.rainBoxSize.y - 10;
        positions[idx + 0] = camPos.x + (Math.random() - 0.5) * this.rainBoxSize.x;
        positions[idx + 2] = camPos.z + (Math.random() - 0.5) * this.rainBoxSize.z;
      }

      // Wrap horizontally around camera
      if (positions[idx + 0] < camPos.x - halfX) positions[idx + 0] += this.rainBoxSize.x;
      else if (positions[idx + 0] > camPos.x + halfX) positions[idx + 0] -= this.rainBoxSize.x;

      if (positions[idx + 2] < camPos.z - halfZ) positions[idx + 2] += this.rainBoxSize.z;
      else if (positions[idx + 2] > camPos.z + halfZ) positions[idx + 2] -= this.rainBoxSize.z;
    }

    this.rainGeometry.attributes.position.needsUpdate = true;
  }

  updateWindshieldRain(dt, activeVehicle) {
    const isRaining = this.weatherMode === 'rain';
    const wipersActive = activeVehicle ? activeVehicle.wipersActive : false;

    // Accumulate rain on windshield when raining
    if (isRaining) {
      this.windshieldWetness = Math.min(1.0, this.windshieldWetness + dt * 0.35);
    } else {
      this.windshieldWetness = Math.max(0.0, this.windshieldWetness - dt * 0.2);
    }

    // Wipers sweep clears wetness
    if (wipersActive) {
      this.wiperSweepTimer += dt * 3.5;
      // Each sweep cycle clears accumulated rain
      this.windshieldWetness = Math.max(0.05, this.windshieldWetness - dt * 1.6);
    }

    // Update screen rain overlay visibility
    if (this.screenRainOverlay) {
      if (this.windshieldWetness > 0.05) {
        this.screenRainOverlay.style.opacity = String(this.windshieldWetness * 0.85);
        this.drawRainDroplets(wipersActive);
      } else {
        this.screenRainOverlay.style.opacity = '0';
      }
    }
  }

  drawRainDroplets(wipersActive) {
    const canvas = this.screenRainOverlay?.querySelector('#hud-rain-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle rain streak/droplet layer
    const count = Math.floor(this.windshieldWetness * 90);
    ctx.fillStyle = 'rgba(210, 235, 255, 0.25)';
    ctx.strokeStyle = 'rgba(180, 215, 255, 0.35)';

    for (let i = 0; i < count; i++) {
      const rx = (Math.sin(i * 997.3) * 0.5 + 0.5) * canvas.width;
      const ry = ((Math.cos(i * 433.7) * 0.5 + 0.5) * canvas.height + (Date.now() * 0.08 * (1 + (i % 3)))) % canvas.height;
      const size = 2 + (i % 4);

      ctx.beginPath();
      ctx.arc(rx, ry, size, 0, Math.PI * 2);
      ctx.fill();

      // Droplet streak downward trail
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 1, ry + size * 3);
      ctx.stroke();
    }

    // If wipers are active, render the clean visual arc clearing the viewing fan
    if (wipersActive) {
      const sweepPhase = Math.sin(this.wiperSweepTimer);
      const centerX1 = canvas.width * 0.35;
      const centerX2 = canvas.width * 0.65;
      const bottomY = canvas.height * 0.98;
      const bladeLength = canvas.height * 0.55;

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 4;

      [centerX1, centerX2].forEach(cx => {
        const angle = -Math.PI / 2 + sweepPhase * 0.95;
        const tipX = cx + Math.cos(angle) * bladeLength;
        const tipY = bottomY + Math.sin(angle) * bladeLength;

        ctx.beginPath();
        ctx.moveTo(cx, bottomY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
      });
    }
  }
}
