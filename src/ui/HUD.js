import { MathUtils } from '../utilities/MathUtils.js';
import { MobileControls } from './MobileControls.js';

/**
 * Modern In-Game Driving HUD with Speedometer, RPM Tachometer,
 * Mini-map Radar, Status Indicators, Proximity Prompts, Fuel Gauge,
 * and Mobile/Tablet Touch Controls
 */
export class HUD {
  constructor(container, inputManager, audioManager, onPause, vehicleManager = null) {
    this.container = container;
    this.input = inputManager;
    this.audio = audioManager;
    this.onPause = onPause;
    this.vehicleManager = vehicleManager;

    this.root = null;
    this.radarCanvas = null;
    this.statsCardVisible = false;
    this.mobileControls = null;

    // Smooth speed & RPM transitions
    this.displayedSpeed = 0;
    this.displayedRpm = 850;
    this.lastUpdateTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    // Cached elements
    this.speedText = null;
    this.speedUnitText = null;
    this.gearText = null;
    this.gearContainer = null;
    this.driveModeBadge = null;
    this.lightStatusText = null;
    this.rpmBar = null;
    this.rpmText = null;
    this.fuelFill = null;
    this.blinkerLeft = null;
    this.blinkerRight = null;
    this.hazardIcon = null;
    this.headlightIcon = null;
    this.wiperIcon = null;
    this.roofIcon = null;
    this.doorIcon = null;
    this.handbrakeIcon = null;
    this.cameraModeText = null;
    this.missionPanel = null;
    this.missionTitle = null;
    this.missionDesc = null;
    this.missionStats = null;
    this.promptBanner = null;

    this.init();
  }

  init() {
    this.root = document.createElement('div');
    this.root.className = 'game-hud-overlay';
    this.root.id = 'hud-root';
    this.root.style.display = 'none';

    this.root.innerHTML = `
      <!-- Top Left: GPS Mini-Map Radar -->
      <div class="hud-radar-container glass-panel">
        <div class="radar-header">
          <span class="radar-title">GPS RADAR</span>
          <span class="gps-dist" id="hud-gps-dist">0 M</span>
        </div>
        <canvas id="hud-radar-canvas" width="180" height="180"></canvas>
      </div>

      <!-- Top Center: Proximity Interactive Prompt Banner -->
      <div class="hud-center-top">
        <div class="proximity-prompt-banner glass-panel" id="hud-prompt-banner" style="display: none;">
          <span class="prompt-icon">⚡</span>
          <span class="prompt-text" id="hud-prompt-text">PRESS [E] TO INTERACT</span>
        </div>
      </div>

      <!-- Top Right: Mission Status & Telemetry -->
      <div class="hud-top-right">
        <div class="hud-mission-panel glass-panel" id="hud-mission-panel">
          <div class="mission-badge" id="hud-mission-badge">OBJECTIVE</div>
          <div class="mission-title" id="hud-mission-title">CONNECTED OPEN-WORLD</div>
          <div class="mission-desc" id="hud-mission-desc">Freely explore all 14 sectors & facilities.</div>
          <div class="mission-stats" id="hud-mission-stats"></div>
        </div>

        <div class="hud-quick-actions">
          <button class="hud-pill-btn" id="hud-touch-btn">TOUCH</button>
          <button class="hud-pill-btn" id="hud-stats-btn">STATS [V]</button>
          <button class="hud-pill-btn" id="hud-cam-btn">CAM: <span id="hud-cam-name">CHASE</span> [C]</button>
          <button class="hud-pill-btn" id="hud-pause-btn">MENU [ESC]</button>
        </div>
      </div>

      <!-- Floating In-Game Vehicle Statistics Card (Toggleable [V]) -->
      <div class="hud-stats-panel glass-panel" id="hud-vehicle-stats-card" style="display: none;">
        <div class="hud-stats-header">
          <div class="hud-stats-titles">
            <span class="hud-stats-badge" id="hud-stat-cat">SUPERCAR</span>
            <h4 class="hud-stats-title" id="hud-stat-name">APEX R</h4>
          </div>
          <button class="hud-stats-close-btn" id="btn-close-hud-stats">✕</button>
        </div>
        <div class="hud-stats-grid">
          <div class="hud-stat-item">
            <span class="hud-stat-label">TOP SPEED</span>
            <span class="hud-stat-value" id="hud-val-topspeed">310 km/h</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">ACCELERATION</span>
            <span class="hud-stat-value" id="hud-val-accel">9.2/10</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">HANDLING</span>
            <span class="hud-stat-value" id="hud-val-handling">8.6/10</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">BRAKING</span>
            <span class="hud-stat-value" id="hud-val-braking">8.8/10</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">DRIVE TYPE</span>
            <span class="hud-stat-value" id="hud-val-drive">AWD</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">WEIGHT</span>
            <span class="hud-stat-value" id="hud-val-weight">1,380 kg</span>
          </div>
        </div>
      </div>

      <!-- Center Bottom: Automotive Cluster with Modern Digital Dashboard & Gear Selector -->
      <div class="hud-cluster-container">
        <!-- Auxiliary status row: wipers, roof, doors, park brake -->
        <div class="cluster-status-row">
          <div class="status-indicator" id="hud-wiper-icon" title="Wipers [X]">🌧️</div>
          <div class="status-indicator" id="hud-roof-icon" title="Roof [T]">🔓</div>
          <div class="status-indicator" id="hud-door-icon" title="Doors [O]">🚪</div>
          <div class="status-indicator" id="hud-brake-icon" title="Handbrake [SPACE]">PARK</div>
        </div>

        <div class="hud-main-cluster-layout">
          <!-- Dedicated Gear Selector Ladder Panel (GEAR: P, R, N, 1, 2, 3, 4, 5, 6) -->
          <div class="hud-gear-ladder-card glass-panel" id="hud-gear-ladder-card">
            <div class="gear-ladder-header">
              <span class="gear-ladder-title">GEAR</span>
              <button class="gear-mode-badge" id="btn-toggle-transmission" title="Toggle Automatic / Manual Mode">AUTO</button>
            </div>
            <div class="gear-ladder-steps" id="hud-gear-steps">
              <button class="gear-step-item" data-gear="P" title="Park [P]">P</button>
              <button class="gear-step-item" data-gear="R" title="Reverse [R]">R</button>
              <button class="gear-step-item" data-gear="N" title="Neutral [N]">N</button>
              <button class="gear-step-item active" data-gear="1" title="1st Gear [1]">1</button>
              <button class="gear-step-item" data-gear="2" title="2nd Gear [2]">2</button>
              <button class="gear-step-item" data-gear="3" title="3rd Gear [3]">3</button>
              <button class="gear-step-item" data-gear="4" title="4th Gear [4]">4</button>
              <button class="gear-step-item" data-gear="5" title="5th Gear [5]">5</button>
              <button class="gear-step-item" data-gear="6" title="6th Gear [6]">6</button>
            </div>
            <div class="gear-ladder-footer">
              <button class="gear-mini-btn" id="btn-gear-down" title="Shift Down (▼)">▼</button>
              <button class="gear-mini-btn gear-cycle-btn" id="btn-gear-cycle" title="Cycle Gear [G]">[G]</button>
              <button class="gear-mini-btn" id="btn-gear-up" title="Shift Up (▲)">▲</button>
            </div>
          </div>

          <!-- Modern Digital Dashboard Cluster -->
          <!-- ┌───────────────────────────┐ -->
          <!-- │       142 KM/H            │ -->
          <!-- │        GEAR 4             │ -->
          <!-- │       SPORT MODE          │ -->
          <!-- └───────────────────────────┘ -->
          <div class="cluster-gauge modern-digital-dashboard glass-panel" id="modern-digital-dashboard">
            <!-- Modern Digital Dashboard Header: Indicators & Light Status -->
            <div class="dash-status-strip">
              <div class="dash-status-pill dash-ind-pill" id="hud-ind-left" title="Left Turn Signal [I]">
                <span class="dash-ind-glyph">◀</span>
                <span class="dash-status-sub">LEFT</span>
              </div>
              <div class="dash-status-pill dash-lights-pill" id="hud-light-icon" title="Headlights [L]">
                <span class="dash-light-glyph">💡</span>
                <span class="dash-light-label" id="hud-light-status-text">LIGHTS OFF</span>
              </div>
              <div class="dash-status-pill dash-hazard-pill" id="hud-hazard-icon" title="Hazard Flasher [H]">
                <span class="dash-hazard-glyph">⚠️</span>
                <span class="dash-hazard-sub">HAZARD</span>
              </div>
              <div class="dash-status-pill dash-off-pill" id="hud-ind-off" title="Indicators Off [J]">
                <span class="dash-off-glyph">✕</span>
                <span class="dash-status-sub">OFF</span>
              </div>
              <div class="dash-status-pill dash-ind-pill" id="hud-ind-right" title="Right Turn Signal [K]">
                <span class="dash-status-sub">RIGHT</span>
                <span class="dash-ind-glyph">▶</span>
              </div>
            </div>

            <!-- Tachometer Dynamic RPM Arc Ribbon -->
            <div class="rpm-meter-track">
              <div class="rpm-meter-fill" id="hud-rpm-fill"></div>
            </div>

            <!-- Central Digital Display Frame:
                 ┌───────────────────────────┐
                 │       142 KM/H            │
                 │        GEAR 4             │
                 │       SPORT MODE          │
                 └───────────────────────────┘
            -->
            <div class="dash-display-box" id="hud-dash-box">
              <div class="dash-speed-row">
                <span class="dash-speed-val" id="hud-speed">0</span>
                <span class="dash-speed-unit" id="hud-speed-unit">KM/H</span>
              </div>
              <div class="dash-gear-row" id="hud-gear-container" aria-label="Gear">
                <span class="dash-gear-prefix">GEAR</span>
                <span class="dash-gear-val" id="hud-gear">1</span>
              </div>
              <div class="dash-mode-row">
                <button class="dash-mode-badge mode-comfort" id="hud-drive-mode" title="Toggle Drive Mode (SHIFT / Click)">COMFORT MODE</button>
              </div>
            </div>

            <!-- Telemetry Sub-row: RPM & Fuel Bar -->
            <div class="dash-footer-row">
              <div class="dash-rpm-readout">
                <span class="dash-aux-label">RPM</span>
                <span class="dash-rpm-val" id="hud-rpm">850</span>
              </div>
              <div class="dash-fuel-gauge">
                <span class="fuel-icon">⛽</span>
                <div class="fuel-bar-track">
                  <div class="fuel-bar-fill" id="hud-fuel-fill"></div>
                </div>
                <span class="fuel-text" id="hud-fuel-text">100%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Interactive Control Bar Hints & Clickable Controls -->
        <div class="hud-controls-bar">
          <button class="control-tag-btn" id="btn-ctrl-stats"><span>[V]</span> STATS</button>
          <button class="control-tag-btn" id="btn-ctrl-lights"><span>[L]</span> LIGHTS</button>
          <button class="control-tag-btn" id="btn-ctrl-ind-l"><span>[I]</span> LEFT</button>
          <button class="control-tag-btn" id="btn-ctrl-hazard"><span>[H]</span> HAZARD</button>
          <button class="control-tag-btn" id="btn-ctrl-ind-r"><span>[K]</span> RIGHT</button>
          <button class="control-tag-btn" id="btn-ctrl-wipers"><span>[X]</span> WIPERS</button>
          <button class="control-tag-btn" id="btn-ctrl-gear"><span>[G]</span> GEAR</button>
          <button class="control-tag-btn" id="btn-ctrl-doors"><span>[O]</span> DOORS</button>
          <button class="control-tag-btn" id="btn-ctrl-trunk"><span>[U]</span> BOOT</button>
          <button class="control-tag-btn" id="btn-ctrl-roof"><span>[T]</span> ROOF</button>
          <button class="control-tag-btn" id="btn-ctrl-refuel"><span>[F]</span> REFUEL</button>
          <button class="control-tag-btn" id="btn-ctrl-reset"><span>[R]</span> RESET</button>
        </div>
      </div>
    `;

    this.container.appendChild(this.root);

    // Cache elements
    this.radarCanvas = this.root.querySelector('#hud-radar-canvas');
    this.speedText = this.root.querySelector('#hud-speed');
    this.speedUnitText = this.root.querySelector('#hud-speed-unit');
    this.gearText = this.root.querySelector('#hud-gear');
    this.gearContainer = this.root.querySelector('#hud-gear-container');
    this.driveModeBadge = this.root.querySelector('#hud-drive-mode');
    this.lightStatusText = this.root.querySelector('#hud-light-status-text');
    this.gearStepItems = this.root.querySelectorAll('.gear-step-item');
    this.transmissionModeBadge = this.root.querySelector('#btn-toggle-transmission');
    this.rpmBar = this.root.querySelector('#hud-rpm-fill');
    this.rpmText = this.root.querySelector('#hud-rpm');
    this.fuelFill = this.root.querySelector('#hud-fuel-fill');
    this.blinkerLeft = this.root.querySelector('#hud-ind-left');
    this.blinkerRight = this.root.querySelector('#hud-ind-right');
    this.hazardIcon = this.root.querySelector('#hud-hazard-icon');
    this.indOffPill = this.root.querySelector('#hud-ind-off');
    this.headlightIcon = this.root.querySelector('#hud-light-icon');
    this.wiperIcon = this.root.querySelector('#hud-wiper-icon');
    this.roofIcon = this.root.querySelector('#hud-roof-icon');
    this.doorIcon = this.root.querySelector('#hud-door-icon');
    this.handbrakeIcon = this.root.querySelector('#hud-brake-icon');
    this.cameraModeText = this.root.querySelector('#hud-cam-name');
    this.missionPanel = this.root.querySelector('#hud-mission-panel');
    this.missionTitle = this.root.querySelector('#hud-mission-title');
    this.missionDesc = this.root.querySelector('#hud-mission-desc');
    this.missionStats = this.root.querySelector('#hud-mission-stats');
    this.promptBanner = this.root.querySelector('#hud-prompt-banner');
    this.statsCard = this.root.querySelector('#hud-vehicle-stats-card');

    // Instantiate Mobile/Tablet Touch Controls
    this.mobileControls = new MobileControls(this.container, this.input, this.audio, this.vehicleManager);

    this.bindButtons();
  }

  bindButtons() {
    const addListener = (sel, fn) => {
      const el = this.root.querySelector(sel);
      if (el) el.addEventListener('click', fn);
    };

    const touchBtn = this.root.querySelector('#hud-touch-btn');
    if (touchBtn) {
      touchBtn.textContent = `TOUCH [${this.mobileControls.enabled ? 'ON' : 'OFF'}]`;
      touchBtn.addEventListener('click', () => {
        const state = this.mobileControls.toggleEnabled();
        this.mobileControls.userOverride = true;
        touchBtn.textContent = `TOUCH [${state ? 'ON' : 'OFF'}]`;
        this.audio.playUIClick();
      });
    }

    addListener('#hud-cam-btn', () => {
      this.input.triggerAction('toggleCamera');
      this.audio.playUIClick();
    });

    addListener('#hud-stats-btn', () => {
      this.toggleStatsCard();
      this.audio.playUIClick();
    });

    addListener('#btn-ctrl-stats', () => {
      this.toggleStatsCard();
      this.audio.playUIClick();
    });

    addListener('#btn-close-hud-stats', () => {
      this.hideStatsCard();
      this.audio.playUIClick();
    });

    if (this.input && this.input.onAction) {
      this.input.onAction('toggleStats', () => {
        this.toggleStatsCard();
        this.audio.playUIClick();
      });
    }

    addListener('#hud-pause-btn', () => {
      this.audio.playUIClick();
      this.onPause();
    });

    addListener('#btn-ctrl-lights', () => this.input.triggerAction('toggleHeadlights'));
    addListener('#btn-ctrl-ind-l', () => this.input.triggerAction('toggleLeftIndicator'));
    addListener('#btn-ctrl-ind-r', () => this.input.triggerAction('toggleRightIndicator'));
    addListener('#btn-ctrl-hazard', () => this.input.triggerAction('toggleHazard'));
    addListener('#btn-ctrl-wipers', () => this.input.triggerAction('toggleWipers'));
    addListener('#btn-ctrl-gear', () => this.input.triggerAction('gearControl'));
    addListener('#btn-ctrl-doors', () => this.input.triggerAction('toggleDoors'));
    addListener('#btn-ctrl-trunk', () => this.input.triggerAction('toggleTrunk'));
    addListener('#btn-ctrl-roof', () => this.input.triggerAction('toggleRoof'));
    addListener('#btn-ctrl-refuel', () => this.input.triggerAction('refuel'));
    addListener('#btn-ctrl-reset', () => this.input.triggerAction('resetVehicle'));

    // Modern Digital Dashboard click triggers
    if (this.driveModeBadge) {
      this.driveModeBadge.addEventListener('click', () => {
        this.input.triggerAction('sportMode');
      });
    }

    if (this.headlightIcon) {
      this.headlightIcon.addEventListener('click', () => this.input.triggerAction('toggleHeadlights'));
    }
    if (this.blinkerLeft) {
      this.blinkerLeft.addEventListener('click', () => this.input.triggerAction('toggleLeftIndicator'));
    }
    if (this.blinkerRight) {
      this.blinkerRight.addEventListener('click', () => this.input.triggerAction('toggleRightIndicator'));
    }
    if (this.hazardIcon) {
      this.hazardIcon.addEventListener('click', () => this.input.triggerAction('toggleHazard'));
    }
    if (this.indOffPill) {
      this.indOffPill.addEventListener('click', () => this.input.triggerAction('indicatorsOff'));
    }

    // Gear Ladder Controls & Transmission Mode Toggle
    if (this.transmissionModeBadge) {
      this.transmissionModeBadge.addEventListener('click', () => {
        const ctrl = this.vehicleManager ? this.vehicleManager.getActiveController() : null;
        if (ctrl && ctrl.toggleTransmissionMode) {
          const newMode = ctrl.toggleTransmissionMode();
          this.transmissionModeBadge.textContent = newMode.toUpperCase();
          this.transmissionModeBadge.classList.toggle('mode-manual', newMode === 'manual');
          this.setPrompt(newMode === 'manual' ? '⚙️ TRANSMISSION: MANUAL MODE (SHIFT: [G] / ▲ / ▼)' : '⚙️ TRANSMISSION: AUTOMATIC MODE');
          setTimeout(() => this.setPrompt(''), 2500);
        }
      });
    }

    if (this.gearStepItems) {
      this.gearStepItems.forEach(stepBtn => {
        stepBtn.addEventListener('click', () => {
          const gearName = stepBtn.dataset.gear;
          const ctrl = this.vehicleManager ? this.vehicleManager.getActiveController() : null;
          if (ctrl && ctrl.setGear) {
            ctrl.setGear(gearName);
            this.setPrompt(`⚙️ GEAR ${gearName} ENGAGED`);
            setTimeout(() => this.setPrompt(''), 1800);
          }
        });
      });
    }

    const btnGearUp = this.root.querySelector('#btn-gear-up');
    if (btnGearUp) {
      btnGearUp.addEventListener('click', () => {
        const phys = this.vehicleManager ? this.vehicleManager.getActivePhysics() : null;
        if (phys && phys.shiftUp()) {
          this.audio.playGearShiftPop();
          const gearName = phys.getGearName();
          this.setPrompt(`⚙️ GEAR ${gearName} ENGAGED (▲ UP)`);
          setTimeout(() => this.setPrompt(''), 1500);
        }
      });
    }

    const btnGearDown = this.root.querySelector('#btn-gear-down');
    if (btnGearDown) {
      btnGearDown.addEventListener('click', () => {
        const phys = this.vehicleManager ? this.vehicleManager.getActivePhysics() : null;
        if (phys && phys.shiftDown()) {
          this.audio.playGearShiftPop();
          const gearName = phys.getGearName();
          this.setPrompt(`⚙️ GEAR ${gearName} ENGAGED (▼ DOWN)`);
          setTimeout(() => this.setPrompt(''), 1500);
        }
      });
    }

    const btnGearCycle = this.root.querySelector('#btn-gear-cycle');
    if (btnGearCycle) {
      btnGearCycle.addEventListener('click', () => {
        this.input.triggerAction('gearControl');
      });
    }
  }

  setPrompt(message) {
    if (message) {
      this.root.querySelector('#hud-prompt-text').textContent = message;
      this.promptBanner.style.display = 'flex';
    } else {
      this.promptBanner.style.display = 'none';
    }
  }

  toggleStatsCard() {
    this.statsCardVisible = !this.statsCardVisible;
    if (this.statsCard) {
      this.statsCard.style.display = this.statsCardVisible ? 'flex' : 'none';
      if (this.statsCardVisible) {
        this.refreshStatsCard();
      }
    }
  }

  showStatsCard() {
    this.statsCardVisible = true;
    if (this.statsCard) {
      this.statsCard.style.display = 'flex';
      this.refreshStatsCard();
    }
  }

  hideStatsCard() {
    this.statsCardVisible = false;
    if (this.statsCard) {
      this.statsCard.style.display = 'none';
    }
  }

  refreshStatsCard() {
    if (!this.vehicleManager) return;
    const vehicle = this.vehicleManager.getActiveVehicle();
    if (!vehicle) return;
    const stats = (typeof vehicle.getStatistics === 'function') ? vehicle.getStatistics() : (vehicle.statistics || {});
    const catalog = this.vehicleManager.getCatalogEntry(vehicle.type);

    const catName = catalog ? catalog.category : 'VEHICLE';
    const vehName = vehicle.name || (catalog ? catalog.name : 'MACHINE');

    this.root.querySelector('#hud-stat-cat').textContent = catName.toUpperCase();
    this.root.querySelector('#hud-stat-name').textContent = vehName.toUpperCase();

    const dStats = catalog ? (catalog.displayStats || catalog.specs) : stats;
    this.root.querySelector('#hud-val-topspeed').textContent = stats.topSpeed || dStats.topSpeed || '310 km/h';
    this.root.querySelector('#hud-val-accel').textContent = stats.acceleration || dStats.acceleration || '9.2/10';
    this.root.querySelector('#hud-val-handling').textContent = stats.handling || dStats.handling || '8.6/10';
    this.root.querySelector('#hud-val-braking').textContent = stats.braking || dStats.braking || '8.8/10';
    this.root.querySelector('#hud-val-drive').textContent = stats.driveType || dStats.driveType || vehicle.driveType || 'AWD';
    this.root.querySelector('#hud-val-weight').textContent = stats.weight || dStats.weight || '1,380 kg';
  }

  update(telemetry = {}, cameraMode = 'chase', missionData = null, gpsDistance = 0, fuelLevel = 100, dt = null) {
    if (!this.root || this.root.style.display === 'none') return;

    // Delta time calculation for smooth, frame-rate independent transitions
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (dt === null || dt === undefined || isNaN(dt) || dt <= 0) {
      dt = Math.min(0.1, Math.max(0.001, (now - this.lastUpdateTime) / 1000));
    }
    this.lastUpdateTime = now;

    // 1. Smooth Speed Transitions
    const rawTargetSpeed = Math.abs(telemetry.speedKmh || 0);
    // Exponential damping: rapid response with silky-smooth numeric transitions
    const speedDamping = 12.0;
    this.displayedSpeed = MathUtils.damp(this.displayedSpeed, rawTargetSpeed, speedDamping, dt);

    // Clean snap to zero and target to avoid micro floating-point drift
    if (rawTargetSpeed === 0 && this.displayedSpeed < 0.25) {
      this.displayedSpeed = 0;
    } else if (Math.abs(this.displayedSpeed - rawTargetSpeed) < 0.08) {
      this.displayedSpeed = rawTargetSpeed;
    }

    const formattedSpeed = Math.round(this.displayedSpeed);
    if (this.speedText) {
      this.speedText.textContent = String(formattedSpeed);
    }

    // 2. Smooth RPM Transition & Tachometer
    const rawTargetRpm = telemetry.rpm || 850;
    this.displayedRpm = MathUtils.damp(this.displayedRpm, rawTargetRpm, 14.0, dt);
    const formattedRpm = Math.round(this.displayedRpm);
    if (this.rpmText) {
      this.rpmText.textContent = String(formattedRpm);
    }

    const redline = telemetry.redlineRpm || 7200;
    const rpmPercent = Math.min(100, Math.max(0, ((this.displayedRpm - 800) / (redline - 800)) * 100));
    if (this.rpmBar) {
      this.rpmBar.style.width = `${rpmPercent}%`;
      if (rpmPercent > 88) {
        this.rpmBar.classList.add('redline-flash');
      } else {
        this.rpmBar.classList.remove('redline-flash');
      }
    }

    // 3. Gear Display (Exact format: GEAR 4)
    const currentGearName = String(telemetry.gearName || telemetry.gear || '1').toUpperCase();
    if (this.gearText) {
      this.gearText.textContent = currentGearName;
    }
    if (this.gearContainer) {
      this.gearContainer.setAttribute('data-gear-full', `GEAR ${currentGearName}`);
    }

    // Highlight active gear in selector ladder
    if (this.gearStepItems) {
      this.gearStepItems.forEach(item => {
        item.classList.toggle('active', item.dataset.gear === currentGearName);
      });
    }

    // Synchronize Automatic vs Manual transmission badge
    if (this.transmissionModeBadge && telemetry.transmissionMode) {
      const modeUpper = telemetry.transmissionMode.toUpperCase();
      if (this.transmissionModeBadge.textContent !== modeUpper) {
        this.transmissionModeBadge.textContent = modeUpper;
        this.transmissionModeBadge.classList.toggle('mode-manual', telemetry.transmissionMode === 'manual');
      }
    }

    // 4. Drive Mode Display (SPORT MODE vs COMFORT MODE)
    const isSport = !!telemetry.isSportMode;
    const modeText = telemetry.driveMode || (isSport ? 'SPORT MODE' : 'COMFORT MODE');
    if (this.driveModeBadge) {
      if (this.driveModeBadge.textContent !== modeText) {
        this.driveModeBadge.textContent = modeText;
      }
      this.driveModeBadge.classList.toggle('mode-sport', isSport);
      this.driveModeBadge.classList.toggle('mode-comfort', !isSport);
    }

    // 5. Fuel Gauge
    if (this.fuelFill) {
      this.fuelFill.style.width = `${fuelLevel}%`;
      const fuelText = this.root.querySelector('#hud-fuel-text');
      if (fuelText) fuelText.textContent = `${Math.round(fuelLevel)}%`;
    }

    // 6. Light Status Display
    const lightsActive = !!(telemetry.headlights || (telemetry.lights && telemetry.lights.headlights));
    if (this.headlightIcon) {
      this.headlightIcon.classList.toggle('active-blue', lightsActive);
    }
    if (this.lightStatusText) {
      this.lightStatusText.textContent = lightsActive ? 'LIGHTS ON' : 'LIGHTS OFF';
      this.lightStatusText.classList.toggle('active-text-glow', lightsActive);
    }

    // 7. Indicator Status Display (Left, Right, Hazard)
    const leftActive = !!(telemetry.leftIndicator);
    const rightActive = !!(telemetry.rightIndicator);
    const hazardActive = !!(telemetry.hazard);

    if (this.blinkerLeft) {
      this.blinkerLeft.classList.toggle('active-blink', leftActive);
    }
    if (this.blinkerRight) {
      this.blinkerRight.classList.toggle('active-blink', rightActive);
    }
    if (this.hazardIcon) {
      this.hazardIcon.classList.toggle('active-blink', hazardActive);
    }
    if (this.indOffPill) {
      this.indOffPill.classList.toggle('active-dim', !leftActive && !rightActive && !hazardActive);
    }

    // Auxiliary indicators
    if (this.wiperIcon) this.wiperIcon.classList.toggle('active-green', !!telemetry.wipers);
    if (this.doorIcon) this.doorIcon.classList.toggle('active-warning', !!telemetry.doors);
    if (this.roofIcon) {
      this.roofIcon.classList.toggle('active-green', !!telemetry.roof);
      this.roofIcon.style.display = telemetry.isConvertible ? 'flex' : 'none';
    }
    if (this.handbrakeIcon) {
      this.handbrakeIcon.classList.toggle('active-red', !!telemetry.handbrake);
      this.handbrakeIcon.textContent = telemetry.handbrake ? (telemetry.speedKmh > 5 ? 'DRIFT' : 'PARK') : 'PARK';
    }

    // 4. Camera Mode
    if (this.cameraModeText) {
      this.cameraModeText.textContent = String(cameraMode || 'CHASE').toUpperCase();
    }

    // 5. GPS Distance
    const gpsEl = this.root.querySelector('#hud-gps-dist');
    if (gpsEl) gpsEl.textContent = `${gpsDistance} M`;

    // 6. Mission Tracker
    if (missionData) {
      if (missionData.raceData) {
        const rd = missionData.raceData;
        this.missionTitle.textContent = rd.mode === 'TIME_TRIAL' ? 'CIRCUIT TIME TRIAL' : 'FREE TRACK DRIVING';
        this.missionDesc.textContent = rd.isCountingDown ? `STARTING IN ${rd.countdown}...` : rd.lapDisplay;
        this.missionStats.innerHTML = `
          <div class="race-timer-block">
            <div class="race-lap-hud">${rd.lapDisplay}</div>
            <div class="race-timer-hud current">${rd.currentStr}</div>
            <div class="race-timer-hud best">${rd.bestStr}</div>
            ${rd.lastLapStr ? `<div class="race-timer-sub">PREVIOUS: ${rd.lastLapStr}</div>` : ''}
            ${rd.isNewBestLap ? `<div class="race-record-tag">★ NEW RECORD LAP! ★</div>` : ''}
            ${rd.inPitStop ? `<div class="pit-tag">PIT STOP SERVICE: ${rd.pitTimeLeft}s</div>` : ''}
          </div>
        `;
      } else if (missionData.isPlayground || missionData.stuntScore !== undefined) {
        this.missionTitle.textContent = 'VEHICLE PLAYGROUND';
        this.missionDesc.textContent = 'Physics & Experiment Arena';
        this.missionStats.innerHTML = `
          <div class="playground-hud-panel">
            <div class="pg-metric-row">
              <span class="pg-lbl">STUNT SCORE</span>
              <span class="pg-val highlight-gold">${missionData.stuntScore}</span>
            </div>
            <div class="pg-stats-grid">
              <div class="pg-stat-box">
                <span class="pg-sublbl">AIR TIME</span>
                <span class="pg-subval">${missionData.airTime}s</span>
              </div>
              <div class="pg-stat-box">
                <span class="pg-sublbl">JUMPS</span>
                <span class="pg-subval">${missionData.jumpCount || 0}</span>
              </div>
              <div class="pg-stat-box">
                <span class="pg-sublbl">DRIFT PTS</span>
                <span class="pg-subval">${missionData.driftPoints || 0}</span>
              </div>
              <div class="pg-stat-box">
                <span class="pg-sublbl">SMASHED</span>
                <span class="pg-subval">${missionData.smashCount || 0}</span>
              </div>
            </div>
            ${missionData.last0to100 ? `<div class="pg-test-result">⚡ 0-100 KM/H: <strong>${missionData.last0to100}</strong></div>` : ''}
            ${missionData.lastBrakeDist ? `<div class="pg-test-result">🛑 BRAKING DIST: <strong>${missionData.lastBrakeDist}</strong></div>` : ''}
          </div>
        `;
      } else if (missionData.title) {
        this.missionTitle.textContent = missionData.title;
        this.missionDesc.textContent = missionData.description || 'Follow checkpoints';
        if (missionData.checkpointsLeft !== undefined) {
          const timeLeft = missionData.timeLimit ? Math.max(0, Math.ceil(missionData.timeLimit - missionData.timer)) : null;
          this.missionStats.innerHTML = `
            <div>GATES LEFT: <strong>${missionData.checkpointsLeft} / ${missionData.totalCheckpoints}</strong></div>
            ${timeLeft !== null ? `<div>TIME: <strong class="${timeLeft < 10 ? 'urgent-time' : ''}">${timeLeft}s</strong></div>` : ''}
          `;
        }
      }
    }

    // 7. Update On-Screen Mobile Controls (Gear label, lights, handbrake, camera)
    if (this.mobileControls) {
      this.mobileControls.update(telemetry, cameraMode);
    }
  }

  show() {
    this.root.style.display = 'block';
    if (this.mobileControls) {
      this.mobileControls.show();
    }
  }

  hide() {
    this.root.style.display = 'none';
    if (this.mobileControls) {
      this.mobileControls.hide();
    }
  }

  onResize() {
    if (this.mobileControls && !this.mobileControls.userOverride) {
      this.mobileControls.enabled = MobileControls.detectTouchDevice();
      const touchBtn = this.root.querySelector('#hud-touch-btn');
      if (touchBtn) {
        touchBtn.textContent = `TOUCH [${this.mobileControls.enabled ? 'ON' : 'OFF'}]`;
      }
      if (this.root.style.display !== 'none') {
        this.mobileControls.show();
      }
    }
  }
}

