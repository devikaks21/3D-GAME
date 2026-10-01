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
    this.minimapVisible = true;
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
      <!-- Top Center: Clean Digital Dashboard (SPEED | GEAR | MODE) -->
      <div class="hud-clean-dashboard glass-panel" id="hud-clean-dashboard">
        <div class="hud-trio-row">
          <!-- SPEED Column -->
          <div class="hud-trio-cell speed-cell">
            <span class="hud-trio-label">SPEED</span>
            <div class="hud-trio-val-wrap">
              <span class="hud-trio-number" id="hud-speed">0</span>
              <span class="hud-trio-unit" id="hud-speed-unit">KM/H</span>
            </div>
          </div>
          
          <div class="hud-trio-sep"></div>

          <!-- GEAR Column -->
          <div class="hud-trio-cell gear-cell">
            <span class="hud-trio-label">GEAR</span>
            <div class="hud-trio-val-wrap" id="hud-gear-container" aria-label="Gear">
              <span class="hud-trio-number" id="hud-gear">1</span>
            </div>
          </div>

          <div class="hud-trio-sep"></div>

          <!-- MODE Column -->
          <div class="hud-trio-cell mode-cell">
            <span class="hud-trio-label">MODE</span>
            <div class="hud-trio-val-wrap">
              <button class="hud-trio-mode-btn mode-sport" id="hud-drive-mode" title="Toggle Drive Mode (SHIFT / Click)">SPORT</button>
            </div>
          </div>
        </div>

        <!-- Integrated Tachometer RPM & Fuel Level Strip -->
        <div class="hud-trio-aux-bar">
          <div class="hud-trio-rpm-track" title="Tachometer RPM">
            <div class="hud-trio-rpm-fill" id="hud-rpm-fill"></div>
          </div>
          <div class="hud-trio-fuel-box" title="Vehicle Fuel Level">
            <span class="hud-fuel-glyph">⛽</span>
            <div class="hud-trio-fuel-track">
              <div class="hud-trio-fuel-fill" id="hud-fuel-fill"></div>
            </div>
            <span class="hud-fuel-pct" id="hud-fuel-text">100%</span>
          </div>
        </div>
      </div>

      <!-- Top Left: Small Minimap (Toggleable [M]) -->
      <div class="hud-radar-container hud-minimap-card glass-panel" id="hud-radar-container">
        <div class="radar-header">
          <div class="radar-title-wrap">
            <span class="radar-glyph">🧭</span>
            <span class="radar-title">MINI MAP</span>
          </div>
          <div class="radar-right-wrap">
            <span class="gps-dist" id="hud-gps-dist">0 M</span>
            <button class="minimap-toggle-close" id="btn-close-minimap" title="Hide Mini Map [M]">✕</button>
          </div>
        </div>
        <canvas id="hud-radar-canvas" width="170" height="170"></canvas>
      </div>

      <!-- Mini Map Collapsed Pill (Visible when Mini Map is hidden) -->
      <button class="minimap-collapsed-pill glass-panel" id="btn-reopen-minimap" style="display: none;" title="Open Mini Map [M]">
        <span class="pill-icon">🧭</span>
        <span class="pill-text">MINI MAP</span>
        <span class="pill-key">[M]</span>
      </button>

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

      <!-- Center Bottom: Clean Controls Bar ([LIGHT] [INDICATOR] [CAMERA]) -->
      <div class="hud-clean-bottom-bar">
        <div class="hud-primary-trio-controls">
          <!-- [LIGHT] Button -->
          <button class="hud-primary-btn" id="btn-ctrl-lights" title="Toggle Headlights [L]">
            <span class="primary-btn-icon" id="hud-light-icon">💡</span>
            <span class="primary-btn-label">[LIGHT]</span>
            <span class="primary-btn-status" id="hud-light-status-text">OFF</span>
          </button>

          <!-- [INDICATOR] Controls Group -->
          <div class="hud-indicator-control-box glass-panel">
            <button class="indicator-arrow-btn" id="btn-ctrl-ind-l" title="Left Turn Signal [I]">◀</button>
            <button class="indicator-center-btn" id="btn-ctrl-hazard" title="Hazard Flasher [H]">
              <span class="indicator-glyph" id="hud-hazard-icon">⚠️</span>
              <span class="indicator-label">[INDICATOR]</span>
            </button>
            <button class="indicator-arrow-btn" id="btn-ctrl-ind-r" title="Right Turn Signal [K]">▶</button>
          </div>

          <!-- [CAMERA] Button -->
          <button class="hud-primary-btn" id="hud-cam-btn" title="Toggle Camera View [C]">
            <span class="primary-btn-icon">🎥</span>
            <span class="primary-btn-label">[CAMERA]</span>
            <span class="primary-btn-status" id="hud-cam-name">CHASE</span>
          </button>
        </div>

        <!-- Compact Auxiliary Controls Bar -->
        <div class="hud-compact-aux-row">
          <button class="hud-aux-chip active-action" id="btn-ctrl-minimap" title="Toggle Mini Map [M]"><span>[M]</span> MAP</button>
          <button class="hud-aux-chip" id="btn-ctrl-stats" title="Toggle Vehicle Specs [V]"><span>[V]</span> STATS</button>
          <button class="hud-aux-chip" id="btn-ctrl-doors" title="Toggle Vehicle Doors [O]"><span>[O]</span> DOORS</button>
          <button class="hud-aux-chip" id="btn-ctrl-trunk" title="Toggle Boot [U]"><span>[U]</span> BOOT</button>
          <button class="hud-aux-chip" id="btn-ctrl-roof" title="Toggle Roof [T]"><span>[T]</span> ROOF</button>
          <button class="hud-aux-chip" id="btn-ctrl-gear" title="Cycle Gear [G]"><span>[G]</span> GEAR</button>
          <button class="hud-aux-chip" id="btn-ctrl-wipers" title="Toggle Wipers [X]"><span>[X]</span> WIPERS</button>
          <button class="hud-aux-chip" id="btn-ctrl-reset" title="Reset Vehicle to Road [R]"><span>[R]</span> RESET</button>
          <button class="hud-aux-chip" id="hud-pause-btn" title="Pause / Menu [ESC]"><span>[ESC]</span> MENU</button>
        </div>
      </div>

      <!-- Interactive 4-Door System Management Panel -->
      <div class="hud-door-control-panel glass-panel" id="hud-door-panel" style="display: none;">
        <div class="hud-door-header">
          <span class="hud-door-title">🚪 VEHICLE DOORS</span>
          <button class="hud-stats-close-btn" id="btn-close-door-panel">✕</button>
        </div>
        <div class="hud-door-grid">
          <button class="hud-door-btn" id="btn-hud-door-fl" data-door="frontLeft" title="Front-Left Door">
            <span class="hud-door-name">FRONT-LEFT</span>
            <span class="hud-door-status-badge" id="badge-door-fl">CLOSED</span>
          </button>
          <button class="hud-door-btn" id="btn-hud-door-fr" data-door="frontRight" title="Front-Right Door">
            <span class="hud-door-name">FRONT-RIGHT</span>
            <span class="hud-door-status-badge" id="badge-door-fr">CLOSED</span>
          </button>
          <button class="hud-door-btn" id="btn-hud-door-rl" data-door="rearLeft" title="Rear-Left Door">
            <span class="hud-door-name">REAR-LEFT</span>
            <span class="hud-door-status-badge" id="badge-door-rl">CLOSED</span>
          </button>
          <button class="hud-door-btn" id="btn-hud-door-rr" data-door="rearRight" title="Rear-Right Door">
            <span class="hud-door-name">REAR-RIGHT</span>
            <span class="hud-door-status-badge" id="badge-door-rr">CLOSED</span>
          </button>
        </div>
        <div class="hud-door-footer">
          <button class="hud-door-all-btn" id="btn-hud-doors-open-all">OPEN ALL</button>
          <button class="hud-door-all-btn" id="btn-hud-doors-close-all">CLOSE ALL</button>
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
    this.blinkerLeft = this.root.querySelector('#btn-ctrl-ind-l') || this.root.querySelector('#hud-ind-left');
    this.blinkerRight = this.root.querySelector('#btn-ctrl-ind-r') || this.root.querySelector('#hud-ind-right');
    this.hazardIcon = this.root.querySelector('#hud-hazard-icon');
    this.headlightIcon = this.root.querySelector('#hud-light-icon');
    this.wiperIcon = this.root.querySelector('#hud-wiper-icon');
    this.roofIcon = this.root.querySelector('#hud-roof-icon');
    this.doorIcon = this.root.querySelector('#hud-door-icon');
    this.btnCtrlTrunk = this.root.querySelector('#btn-ctrl-trunk');
    this.btnCtrlRoof = this.root.querySelector('#btn-ctrl-roof');
    this.handbrakeIcon = this.root.querySelector('#hud-brake-icon');
    this.cameraModeText = this.root.querySelector('#hud-cam-name');
    this.missionPanel = this.root.querySelector('#hud-mission-panel');
    this.missionTitle = this.root.querySelector('#hud-mission-title');
    this.missionDesc = this.root.querySelector('#hud-mission-desc');
    this.missionStats = this.root.querySelector('#hud-mission-stats');
    this.promptBanner = this.root.querySelector('#hud-prompt-banner');
    this.statsCard = this.root.querySelector('#hud-vehicle-stats-card');
    this.doorPanel = this.root.querySelector('#hud-door-panel');
    this.doorButtons = {
      frontLeft: this.root.querySelector('#btn-hud-door-fl'),
      frontRight: this.root.querySelector('#btn-hud-door-fr'),
      rearLeft: this.root.querySelector('#btn-hud-door-rl'),
      rearRight: this.root.querySelector('#btn-hud-door-rr')
    };
    this.doorBadges = {
      frontLeft: this.root.querySelector('#badge-door-fl'),
      frontRight: this.root.querySelector('#badge-door-fr'),
      rearLeft: this.root.querySelector('#badge-door-rl'),
      rearRight: this.root.querySelector('#badge-door-rr')
    };

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

    // Minimap Toggle Listeners
    addListener('#btn-close-minimap', () => this.toggleMinimap(false));
    addListener('#btn-reopen-minimap', () => this.toggleMinimap(true));
    addListener('#btn-ctrl-minimap', () => this.toggleMinimap());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.target.matches('input, textarea')) {
        this.toggleMinimap();
      }
    });

    addListener('#btn-ctrl-lights', () => this.input.triggerAction('toggleHeadlights'));
    addListener('#btn-ctrl-ind-l', () => this.input.triggerAction('toggleLeftIndicator'));
    addListener('#btn-ctrl-ind-r', () => this.input.triggerAction('toggleRightIndicator'));
    addListener('#btn-ctrl-hazard', () => this.input.triggerAction('toggleHazard'));
    addListener('#btn-ctrl-wipers', () => this.input.triggerAction('toggleWipers'));
    addListener('#btn-ctrl-gear', () => this.input.triggerAction('gearControl'));
    addListener('#btn-ctrl-doors', () => this.toggleDoorPanel());
    addListener('#btn-ctrl-trunk', () => this.input.triggerAction('toggleTrunk'));
    addListener('#btn-ctrl-roof', () => this.input.triggerAction('toggleRoof'));
    addListener('#btn-ctrl-refuel', () => this.input.triggerAction('refuel'));
    addListener('#btn-ctrl-reset', () => this.input.triggerAction('resetVehicle'));

    // Door Panel Controls
    addListener('#btn-close-door-panel', () => {
      if (this.doorPanel) this.doorPanel.style.display = 'none';
      this.audio.playUIClick();
    });

    if (this.doorIcon) {
      this.doorIcon.addEventListener('click', () => this.toggleDoorPanel());
    }

    ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'].forEach(doorKey => {
      const btn = this.doorButtons ? this.doorButtons[doorKey] : null;
      if (btn) {
        btn.addEventListener('click', () => {
          const ctrl = this.vehicleManager ? this.vehicleManager.getActiveController() : null;
          if (ctrl && ctrl.toggleDoor) {
            const isOpen = ctrl.toggleDoor(doorKey);
            const doorName = doorKey.replace(/([A-Z])/g, ' $1').toUpperCase();
            this.setPrompt(`🚪 ${doorName} ${isOpen ? 'OPENED' : 'CLOSED'}`);
            setTimeout(() => this.setPrompt(''), 2000);
          }
        });
      }
    });

    addListener('#btn-hud-doors-open-all', () => {
      const ctrl = this.vehicleManager ? this.vehicleManager.getActiveController() : null;
      if (ctrl && ctrl.openAllDoors) {
        ctrl.openAllDoors();
        this.setPrompt('🚪 ALL DOORS OPENED');
        setTimeout(() => this.setPrompt(''), 2000);
      }
    });

    addListener('#btn-hud-doors-close-all', () => {
      const ctrl = this.vehicleManager ? this.vehicleManager.getActiveController() : null;
      if (ctrl && ctrl.closeAllDoors) {
        ctrl.closeAllDoors();
        this.setPrompt('🚪 ALL DOORS CLOSED');
        setTimeout(() => this.setPrompt(''), 2000);
      }
    });

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

  toggleDoorPanel() {
    if (!this.doorPanel) return;
    const isVisible = this.doorPanel.style.display !== 'none';
    this.doorPanel.style.display = isVisible ? 'none' : 'flex';
    this.audio.playUIClick();
  }

  hideDoorPanel() {
    if (this.doorPanel) {
      this.doorPanel.style.display = 'none';
    }
  }

  toggleMinimap(forceState) {
    if (forceState !== undefined) {
      this.minimapVisible = Boolean(forceState);
    } else {
      this.minimapVisible = !this.minimapVisible;
    }

    const radar = this.root ? this.root.querySelector('#hud-radar-container') : null;
    const reopenBtn = this.root ? this.root.querySelector('#btn-reopen-minimap') : null;
    const toggleBtn = this.root ? this.root.querySelector('#btn-ctrl-minimap') : null;

    if (radar) {
      radar.style.display = this.minimapVisible ? 'flex' : 'none';
    }
    if (reopenBtn) {
      reopenBtn.style.display = this.minimapVisible ? 'none' : 'inline-flex';
    }
    if (toggleBtn) {
      toggleBtn.classList.toggle('active-action', this.minimapVisible);
    }

    if (this.audio && this.audio.playUIClick) {
      this.audio.playUIClick();
    }
    return this.minimapVisible;
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

  update(telemetry, cameraMode, missionData, gpsDistance, fuelLevel = 100, dt = null) {
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

    // 4. Drive Mode Display (SPORT vs COMFORT)
    const isSport = !!telemetry.isSportMode;
    let modeText = 'SPORT';
    if (telemetry.driveMode) {
      modeText = String(telemetry.driveMode).replace(/\s*MODE$/i, '').trim().toUpperCase();
    } else {
      modeText = isSport ? 'SPORT' : 'COMFORT';
    }
    if (this.driveModeBadge) {
      if (this.driveModeBadge.textContent !== modeText) {
        this.driveModeBadge.textContent = modeText;
      }
      this.driveModeBadge.classList.toggle('mode-sport', isSport || modeText === 'SPORT');
      this.driveModeBadge.classList.toggle('mode-comfort', !isSport && modeText !== 'SPORT');
    }

    // 5. Fuel Gauge
    if (this.fuelFill) {
      this.fuelFill.style.width = `${fuelLevel}%`;
      const fuelText = this.root.querySelector('#hud-fuel-text');
      if (fuelText) fuelText.textContent = `${Math.round(fuelLevel)}%`;
    }

    // 6. Light Status Display ([LIGHT])
    const lightsActive = !!(telemetry.headlights || (telemetry.lights && telemetry.lights.headlights));
    if (this.headlightIcon) {
      this.headlightIcon.classList.toggle('active-blue', lightsActive);
    }
    if (this.lightStatusText) {
      this.lightStatusText.textContent = lightsActive ? 'ON' : 'OFF';
      this.lightStatusText.classList.toggle('active-text-glow', lightsActive);
    }

    // 7. Indicator Status Display (Left, Right, Hazard)
    const leftActive = !!(telemetry.leftIndicator);
    const rightActive = !!(telemetry.rightIndicator);
    const hazardActive = !!(telemetry.hazard);

    if (this.blinkerLeft) {
      this.blinkerLeft.classList.toggle('active-blink', leftActive || hazardActive);
    }
    if (this.blinkerRight) {
      this.blinkerRight.classList.toggle('active-blink', rightActive || hazardActive);
    }
    if (this.hazardIcon) {
      this.hazardIcon.classList.toggle('active-blink', hazardActive);
    }

    // Auxiliary indicators
    if (this.wiperIcon) this.wiperIcon.classList.toggle('active-green', !!telemetry.wipers);
    if (this.doorIcon) this.doorIcon.classList.toggle('active-warning', !!telemetry.doors);

    // Update 4-door panel buttons & status badges
    if (telemetry.doorStates && this.doorBadges) {
      ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'].forEach(doorKey => {
        const state = telemetry.doorStates[doorKey];
        const btn = this.doorButtons ? this.doorButtons[doorKey] : null;
        const badge = this.doorBadges ? this.doorBadges[doorKey] : null;
        if (state && badge && btn) {
          const isOpen = Boolean(state.isOpen);
          badge.textContent = isOpen ? 'OPEN' : 'CLOSED';
          btn.classList.toggle('is-open', isOpen);
        }
      });
    }

    if (this.roofIcon) {
      this.roofIcon.classList.toggle('active-green', !!telemetry.roof);
      this.roofIcon.style.display = telemetry.isConvertible ? 'flex' : 'none';
    }
    if (this.btnCtrlRoof) {
      this.btnCtrlRoof.style.display = telemetry.isConvertible ? 'inline-flex' : 'none';
      this.btnCtrlRoof.classList.toggle('active-action', !!telemetry.roof);
      this.btnCtrlRoof.title = telemetry.isConvertible ? (telemetry.roof ? 'Close Roof [T]' : 'Open Roof [T]') : 'Roof Not Supported';
    }
    if (this.btnCtrlTrunk) {
      const isBootSupported = telemetry.isBootSupported !== false;
      this.btnCtrlTrunk.style.display = isBootSupported ? 'inline-flex' : 'none';
      this.btnCtrlTrunk.classList.toggle('active-action', !!telemetry.boot);
      this.btnCtrlTrunk.title = isBootSupported ? (telemetry.boot ? 'Close Boot [U]' : 'Open Boot [U]') : 'Boot Not Supported';
    }
    if (this.handbrakeIcon) {
      this.handbrakeIcon.classList.toggle('active-red', !!telemetry.handbrake);
      this.handbrakeIcon.textContent = telemetry.handbrake ? (telemetry.speedKmh > 5 ? 'DRIFT' : 'PARK') : 'PARK';
    }

    // 4. Camera Mode
    const formatCam = (mode) => {
      switch (mode) {
        case 'chase': return 'CHASE [1]';
        case 'close_chase': return 'CLOSE [2]';
        case 'cockpit': return 'COCKPIT [3]';
        case 'rear': return 'REAR [4]';
        case 'free':
        case 'orbit': return 'FREE [5]';
        default: return String(mode).replace('_', ' ').toUpperCase();
      }
    };
    if (this.cameraModeText) {
      this.cameraModeText.textContent = formatCam(cameraMode);
    }

    // 5. GPS Distance
    const gpsEl = this.root.querySelector('#hud-gps-dist');
    if (gpsEl) gpsEl.textContent = `${gpsDistance} M`;

    // 6. Mission Tracker
    if (missionData) {
      if (missionData.isRoadTest || missionData.subMode === 'ROAD_TEST' || missionData.mode === 'ROAD_TEST') {
        const badgeEl = this.root.querySelector('#hud-mission-badge');
        if (badgeEl) badgeEl.textContent = 'ROAD TEST';
        this.missionTitle.textContent = 'ROAD TEST';
        this.missionDesc.textContent = '';
        this.missionStats.innerHTML = `
          <div class="road-test-hud-panel">
            <div class="rt-stat-row">
              <span class="rt-lbl">Time:</span>
              <strong class="rt-val">${missionData.timeFormatted || '00:00'}</strong>
            </div>
            <div class="rt-stat-row">
              <span class="rt-lbl">Mistakes:</span>
              <strong class="rt-val ${missionData.mistakes > 0 ? 'rt-mistake' : ''}">${missionData.mistakes || 0}</strong>
            </div>
            <div class="rt-stat-row">
              <span class="rt-lbl">Checkpoints:</span>
              <strong class="rt-val">${missionData.currentCheckpointIndex || 0}/${missionData.totalCheckpoints || 10}</strong>
            </div>
            <div class="rt-objective-box">
              <div class="rt-obj-label">Objective:</div>
              <div class="rt-obj-text">${missionData.objective || 'Complete the route safely.'}</div>
            </div>
          </div>
        `;
      } else if (missionData.isCourseTest || missionData.subMode === 'COURSE_TEST' || missionData.mode === 'COURSE_TEST') {
        const badgeEl = this.root.querySelector('#hud-mission-badge');
        if (badgeEl) badgeEl.textContent = 'COURSE TEST';
        this.missionTitle.textContent = 'COURSE TEST';
        this.missionDesc.textContent = '';
        this.missionStats.innerHTML = `
          <div class="course-test-hud-panel">
            <div class="rt-stat-row">
              <span class="rt-lbl">Completion time:</span>
              <strong class="rt-val">${missionData.timeFormatted || '00:00'}</strong>
            </div>
            <div class="rt-stat-row">
              <span class="rt-lbl">Collisions:</span>
              <strong class="rt-val ${missionData.collisions > 0 ? 'rt-mistake' : ''}">${missionData.collisions || 0}</strong>
            </div>
            <div class="rt-stat-row">
              <span class="rt-lbl">Missed checkpoints:</span>
              <strong class="rt-val ${missionData.missedCheckpoints > 0 ? 'rt-mistake' : ''}">${missionData.missedCheckpoints || 0}</strong>
            </div>
            <div class="rt-stat-row">
              <span class="rt-lbl">Driving accuracy:</span>
              <strong class="rt-val ${missionData.accuracy < 80 ? 'rt-mistake' : 'rt-accuracy'}">${missionData.accuracy !== undefined ? missionData.accuracy : 100}%</strong>
            </div>
            <div class="rt-objective-box">
              <div class="rt-obj-label">Course Section:</div>
              <div class="rt-obj-text">${missionData.stageTitle || 'Follow course checkpoints'}</div>
            </div>
          </div>
        `;
      } else if (missionData.isParkingTest || missionData.subMode === 'PARKING_TEST' || missionData.mode === 'PARKING_TEST') {
        const badgeEl = this.root.querySelector('#hud-mission-badge');
        if (badgeEl) badgeEl.textContent = 'PARKING TEST';
        this.missionTitle.textContent = 'PARKING TEST';
        this.missionDesc.textContent = '';
        this.missionStats.innerHTML = `
          <div class="parking-test-hud-panel">
            <div class="pt-prompt-instruction">${missionData.instruction || 'Position vehicle inside the marked area.'}</div>
            <div class="pt-accuracy-display">
              <span class="pt-acc-lbl">Accuracy:</span>
              <strong class="pt-acc-val">${missionData.accuracy !== undefined ? missionData.accuracy : 86}%</strong>
            </div>
            <div class="pt-stage-info">
              <span class="pt-stall-badge">${missionData.parkingType || 'Straight parking'}</span>
              <span class="pt-stage-count">Stage ${missionData.parkingStage || 1}/${missionData.totalStages || 3}</span>
            </div>
            ${missionData.holdProgress > 0 ? `
              <div class="pt-hold-track">
                <div class="pt-hold-fill" style="width: ${Math.round(missionData.holdProgress * 100)}%;"></div>
              </div>
            ` : ''}
          </div>
        `;
      } else if (missionData.raceData) {
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

