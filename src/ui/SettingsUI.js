import { GameStates } from '../core/GameState.js';
import { formatKeyCode } from '../core/InputManager.js';

export class SettingsUI {
  constructor(
    container,
    gameState,
    audioManager,
    onTimeOfDayChanged,
    inputManager,
    onTrafficDensityChanged = null,
    onGraphicsChanged = null,
    onDrivingAssistanceChanged = null,
    onReturn = null,
    onWeatherChanged = null
  ) {
    this.container = container;
    this.gameState = gameState;
    this.audio = audioManager;
    this.onTimeOfDayChanged = onTimeOfDayChanged;
    this.inputManager = inputManager;
    this.onTrafficDensityChanged = onTrafficDensityChanged;
    this.onGraphicsChanged = onGraphicsChanged;
    this.onDrivingAssistanceChanged = onDrivingAssistanceChanged;
    this.onReturn = onReturn;
    this.onWeatherChanged = onWeatherChanged;

    this.root = null;
    this.activeTab = 'graphics'; // 'graphics' | 'audio' | 'gameplay' | 'controls'
    this.rebindingAction = null;  // { actionId, slotIndex, buttonElement }
    this.rebindListener = null;

    this.init();
  }

  init() {
    this.root = document.createElement('div');
    this.root.className = 'settings-overlay cinematic-overlay';
    this.root.id = 'settings-root';
    this.root.style.display = 'none';

    this.root.innerHTML = `
      <header class="settings-header">
        <button class="back-btn glass-btn" id="settings-back-btn">◀ RETURN</button>
        <div class="settings-title-wrap">
          <span class="brand-badge">PREFERENCES & CONFIGURATION</span>
          <h2 class="settings-title">SETTINGS</h2>
        </div>
        <div class="settings-tabs-nav">
          <button class="settings-tab-btn active" id="tab-btn-graphics" data-tab="graphics">
            <span class="tab-icon">🖥️</span> GRAPHICS
          </button>
          <button class="settings-tab-btn" id="tab-btn-audio" data-tab="audio">
            <span class="tab-icon">🔊</span> AUDIO
          </button>
          <button class="settings-tab-btn" id="tab-btn-gameplay" data-tab="gameplay">
            <span class="tab-icon">🎮</span> GAMEPLAY
          </button>
          <button class="settings-tab-btn" id="tab-btn-controls" data-tab="controls">
            <span class="tab-icon">🕹️</span> CONTROLS
          </button>
        </div>
      </header>

      <div class="settings-content-wrapper">
        <!-- Notification Toast Area -->
        <div class="settings-toast-banner" id="settings-toast" style="display: none;"></div>

        <!-- 1. GRAPHICS TAB -->
        <div class="settings-tab-page active" id="page-graphics">
          <div class="settings-layout">
            <div class="settings-card glass-panel">
              <h3 class="card-title">RENDER QUALITY & SHADOWS</h3>

              <!-- Quality -->
              <div class="setting-item">
                <label class="setting-label">QUALITY PRESET</label>
                <div class="segmented-control" id="ctrl-graphics-quality">
                  <button class="seg-btn" data-val="low">LOW</button>
                  <button class="seg-btn" data-val="medium">MEDIUM</button>
                  <button class="seg-btn active" data-val="high">HIGH</button>
                  <button class="seg-btn" data-val="ultra">ULTRA</button>
                </div>
              </div>

              <!-- Shadows -->
              <div class="setting-item">
                <label class="setting-label">SHADOWS</label>
                <div class="segmented-control" id="ctrl-graphics-shadows">
                  <button class="seg-btn" data-val="off">OFF</button>
                  <button class="seg-btn" data-val="low">LOW</button>
                  <button class="seg-btn active" data-val="medium">MEDIUM</button>
                  <button class="seg-btn" data-val="high">HIGH</button>
                </div>
              </div>

              <!-- Reflections -->
              <div class="setting-item">
                <label class="setting-label">REFLECTIONS</label>
                <div class="segmented-control" id="ctrl-graphics-reflections">
                  <button class="seg-btn" data-val="off">OFF</button>
                  <button class="seg-btn active" data-val="simple">SIMPLE</button>
                  <button class="seg-btn" data-val="realtime">REALTIME</button>
                </div>
              </div>
            </div>

            <div class="settings-card glass-panel">
              <h3 class="card-title">VIEWPORT & FIDELITY</h3>

              <!-- View distance -->
              <div class="setting-item">
                <label class="setting-label">VIEW DISTANCE</label>
                <div class="segmented-control" id="ctrl-graphics-viewdist">
                  <button class="seg-btn" data-val="500m">500M</button>
                  <button class="seg-btn" data-val="1000m">1000M</button>
                  <button class="seg-btn active" data-val="1500m">1500M</button>
                  <button class="seg-btn" data-val="2500m">2500M</button>
                </div>
              </div>

              <!-- Anti-aliasing -->
              <div class="setting-item">
                <label class="setting-label">ANTI-ALIASING</label>
                <div class="segmented-control" id="ctrl-graphics-antialiasing">
                  <button class="seg-btn" data-val="off">OFF</button>
                  <button class="seg-btn active" data-val="fxaa">FXAA</button>
                  <button class="seg-btn" data-val="smaa">SMAA</button>
                  <button class="seg-btn" data-val="msaa">4X MSAA</button>
                </div>
              </div>

              <div class="settings-tips-card">
                <h4>PRO TIP: 60 FPS PERFORMANCE</h4>
                <p>Lowering shadows to <strong>Medium</strong> and view distance to <strong>1500M</strong> ensures silky smooth 60 FPS gameplay on any laptop or desktop.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. AUDIO TAB -->
        <div class="settings-tab-page" id="page-audio" style="display: none;">
          <div class="settings-layout">
            <div class="settings-card glass-panel">
              <h3 class="card-title">MASTER & ENGINE AUDIO</h3>

              <!-- Master volume -->
              <div class="setting-item">
                <div class="setting-label-row">
                  <label class="setting-label">MASTER VOLUME</label>
                  <span class="slider-val" id="val-audio-master">80%</span>
                </div>
                <input type="range" min="0" max="100" value="80" class="range-slider" id="slider-audio-master">
              </div>

              <!-- Engine volume -->
              <div class="setting-item">
                <div class="setting-label-row">
                  <label class="setting-label">ENGINE VOLUME</label>
                  <span class="slider-val" id="val-audio-engine">90%</span>
                </div>
                <input type="range" min="0" max="100" value="90" class="range-slider" id="slider-audio-engine">
              </div>
            </div>

            <div class="settings-card glass-panel">
              <h3 class="card-title">ENVIRONMENT & UI AUDIO</h3>

              <!-- Environment volume -->
              <div class="setting-item">
                <div class="setting-label-row">
                  <label class="setting-label">ENVIRONMENT VOLUME</label>
                  <span class="slider-val" id="val-audio-environment">75%</span>
                </div>
                <input type="range" min="0" max="100" value="75" class="range-slider" id="slider-audio-environment">
              </div>

              <!-- UI volume -->
              <div class="setting-item">
                <div class="setting-label-row">
                  <label class="setting-label">UI VOLUME</label>
                  <span class="slider-val" id="val-audio-ui">85%</span>
                </div>
                <input type="range" min="0" max="100" value="85" class="range-slider" id="slider-audio-ui">
              </div>
            </div>
          </div>
        </div>

        <!-- 3. GAMEPLAY TAB -->
        <div class="settings-tab-page" id="page-gameplay" style="display: none;">
          <div class="settings-layout">
            <div class="settings-card glass-panel">
              <h3 class="card-title">DRIVING & VEHICLE CONTROL</h3>

              <!-- Driving assistance -->
              <div class="setting-item">
                <label class="setting-label">DRIVING ASSISTANCE</label>
                <div class="segmented-control" id="ctrl-driving-assist">
                  <button class="seg-btn" data-val="off">OFF (PRO)</button>
                  <button class="seg-btn active" data-val="tcs">TRACTION CONTROL (TCS)</button>
                  <button class="seg-btn" data-val="full">FULL ASSIST</button>
                </div>
              </div>

              <!-- Automatic/manual gear -->
              <div class="setting-item">
                <label class="setting-label">AUTOMATIC / MANUAL GEAR</label>
                <div class="segmented-control" id="ctrl-transmission">
                  <button class="seg-btn active" data-val="auto">AUTOMATIC</button>
                  <button class="seg-btn" data-val="manual">MANUAL (G / ▲ / ▼)</button>
                </div>
              </div>

              <!-- Traffic density -->
              <div class="setting-item">
                <label class="setting-label">TRAFFIC DENSITY</label>
                <div class="segmented-control" id="ctrl-trafficdensity">
                  <button class="seg-btn" data-val="off">OFF</button>
                  <button class="seg-btn" data-val="low">LOW</button>
                  <button class="seg-btn active" data-val="medium">MEDIUM</button>
                  <button class="seg-btn" data-val="high">HIGH</button>
                </div>
              </div>
            </div>

            <div class="settings-card glass-panel">
              <h3 class="card-title">HUD & ENVIRONMENT ATMOSPHERE</h3>

              <!-- Speedometer unit -->
              <div class="setting-item">
                <label class="setting-label">SPEEDOMETER UNIT</label>
                <div class="segmented-control" id="ctrl-speedunit">
                  <button class="seg-btn active" data-val="KM/H">KM/H</button>
                  <button class="seg-btn" data-val="MPH">MPH</button>
                </div>
              </div>

              <!-- Time of day -->
              <div class="setting-item">
                <label class="setting-label">TIME OF DAY LIGHTING</label>
                <div class="segmented-control" id="ctrl-timeofday">
                  <button class="seg-btn" data-val="morning">MORNING 🌅</button>
                  <button class="seg-btn active" data-val="day">DAY ☀️</button>
                  <button class="seg-btn" data-val="evening">EVENING 🌇</button>
                  <button class="seg-btn" data-val="night">NIGHT 🌙</button>
                  <button class="seg-btn" data-val="dynamic">DYNAMIC ⏳</button>
                </div>
              </div>

              <!-- Atmospheric weather -->
              <div class="setting-item">
                <label class="setting-label">ATMOSPHERIC WEATHER</label>
                <div class="segmented-control" id="ctrl-weather">
                  <button class="seg-btn active" data-val="clear">CLEAR ☀️</button>
                  <button class="seg-btn" data-val="cloudy">CLOUDY ☁️</button>
                  <button class="seg-btn" data-val="rain">RAIN 🌧️</button>
                </div>
              </div>

              <!-- Visual Theme Mode -->
              <div class="setting-item">
                <label class="setting-label">VISUAL THEME MODE</label>
                <div class="segmented-control" id="ctrl-theme">
                  <button class="seg-btn active" data-val="light">LIGHT ☀️</button>
                  <button class="seg-btn" data-val="dark">DARK 🌙</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. CONTROLS TAB -->
        <div class="settings-tab-page" id="page-controls" style="display: none;">
          <div class="controls-settings-header glass-panel">
            <div class="controls-info-copy">
              <h3 class="card-title">DESKTOP KEYBOARD CONTROLS</h3>
              <p class="controls-subtitle">
                Customize key bindings to suit your driving style. Click any key badge to rebind.
                Conflicting keys are automatically detected and cleanly resolved.
              </p>
            </div>
            <div class="controls-header-actions">
              <button class="glass-btn action-btn-danger" id="btn-reset-controls">
                ↺ RESET TO DEFAULTS
              </button>
            </div>
          </div>

          <!-- Conflict Resolution Advisory Banner -->
          <div class="controls-conflict-alert">
            <div class="alert-icon">🛡️</div>
            <div class="alert-body">
              <strong>Conflict Resolution Advisory:</strong>
              Accelerate and Wipers both defaulted to <code>W</code> in earlier layouts. Windshield Wipers is mapped to <code>X</code> to prevent throttle lockout. You can click any key below to rebind.
            </div>
          </div>

          <!-- Key Bindings Matrix -->
          <div class="controls-matrix-container glass-panel">
            <div class="matrix-grid-header">
              <span class="col-head action-col">ACTION FUNCTION</span>
              <span class="col-head desc-col">DESCRIPTION</span>
              <span class="col-head keys-col">KEY BINDINGS (PRIMARY / SECONDARY)</span>
            </div>
            <div class="matrix-grid-body" id="controls-matrix-body">
              <!-- Dynamically populated -->
            </div>
          </div>
        </div>

      </div>
    `;

    this.container.appendChild(this.root);
    this.renderControlsMatrix();
    this.bindEvents();
  }

  showToast(message, type = 'info', duration = 3500) {
    const toast = this.root.querySelector('#settings-toast');
    if (!toast) return;

    toast.className = `settings-toast-banner toast-${type}`;
    toast.innerHTML = message;
    toast.style.display = 'block';

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, duration);
  }

  switchTab(tabKey) {
    this.activeTab = tabKey;
    const tabBtns = this.root.querySelectorAll('.settings-tab-btn');
    const tabPages = this.root.querySelectorAll('.settings-tab-page');

    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabKey));
    tabPages.forEach(page => {
      const isTarget = page.id === `page-${tabKey}`;
      page.style.display = isTarget ? 'block' : 'none';
      page.classList.toggle('active', isTarget);
    });

    if (tabKey === 'controls') {
      this.renderControlsMatrix();
    }
  }

  renderControlsMatrix() {
    const tbody = this.root.querySelector('#controls-matrix-body');
    if (!tbody || !this.inputManager) return;

    const bindings = (typeof this.inputManager.getBindings === 'function')
      ? this.inputManager.getBindings()
      : (this.inputManager?.bindings || {});
    if (!bindings) return;
    const actionKeys = Object.keys(bindings);

    tbody.innerHTML = actionKeys.map(actionId => {
      const def = bindings[actionId];
      const slot1Code = def.keys && def.keys[0] ? def.keys[0] : null;
      const slot2Code = def.keys && def.keys[1] ? def.keys[1] : null;

      const slot1Label = slot1Code ? formatKeyCode(slot1Code) : 'EMPTY';
      const slot2Label = slot2Code ? formatKeyCode(slot2Code) : 'ADD KEY +';

      const isConflictAlternative = actionId === 'wipers';

      return `
        <div class="matrix-row ${isConflictAlternative ? 'row-alt-resolved' : ''}" data-action="${actionId}">
          <div class="matrix-cell action-cell">
            <span class="action-name">${def.label}</span>
          </div>
          <div class="matrix-cell desc-cell">
            <span class="action-desc">${def.desc || ''}</span>
          </div>
          <div class="matrix-cell keys-cell">
            <button class="key-bind-btn ${!slot1Code ? 'empty-slot' : ''}" data-slot="0" title="Click to reassign primary key">
              <span class="btn-key-code">${slot1Label}</span>
            </button>
            <button class="key-bind-btn ${!slot2Code ? 'empty-slot add-key' : ''}" data-slot="1" title="Click to reassign secondary key">
              <span class="btn-key-code">${slot2Label}</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to key badges
    tbody.querySelectorAll('.key-bind-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('.matrix-row');
        if (!row) return;
        const actionId = row.dataset.action;
        const slotIndex = parseInt(btn.dataset.slot, 10);
        this.startRebinding(actionId, slotIndex, btn);
      });
    });
  }

  startRebinding(actionId, slotIndex, buttonElement) {
    if (this.rebindingAction) {
      this.cancelRebinding();
    }

    if (this.audio?.playUIClick) this.audio.playUIClick();
    this.rebindingAction = { actionId, slotIndex, buttonElement };
    buttonElement.classList.add('is-rebinding');
    buttonElement.querySelector('.btn-key-code').textContent = 'PRESS KEY...';

    this.showToast(`Press any keyboard key for <strong>${this.inputManager.bindings[actionId].label}</strong> (ESC to cancel)`, 'warning', 6000);

    // Global listener for next keydown
    this.rebindListener = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const newCode = e.code;

      if (newCode === 'Escape') {
        this.cancelRebinding();
        this.showToast('Rebinding cancelled.', 'info', 2000);
        return;
      }

      this.completeRebinding(newCode);
    };

    window.addEventListener('keydown', this.rebindListener, { once: true, capture: true });
  }

  completeRebinding(newCode) {
    if (!this.rebindingAction) return;

    const { actionId, slotIndex } = this.rebindingAction;
    const actionLabel = this.inputManager.bindings[actionId].label;

    // Execute rebind in inputManager (handles conflict resolution)
    const result = this.inputManager.rebind(actionId, slotIndex, newCode);

    if (this.audio?.playUIClick) this.audio.playUIClick();
    this.cancelRebinding();
    this.renderControlsMatrix();

    if (result && result.conflictedAction) {
      const conflictLabel = this.inputManager.bindings[result.conflictedAction].label;
      this.showToast(`⚡ <strong>Conflict Resolved:</strong> Key <code>${formatKeyCode(newCode)}</code> was unbound from <em>${conflictLabel}</em> and assigned to <em>${actionLabel}</em>.`, 'warning', 4500);
    } else {
      this.showToast(`✅ <strong>${actionLabel}</strong> bound to <code>${formatKeyCode(newCode)}</code>.`, 'success', 2500);
    }
  }

  cancelRebinding() {
    if (this.rebindListener) {
      window.removeEventListener('keydown', this.rebindListener, { capture: true });
      this.rebindListener = null;
    }
    if (this.rebindingAction && this.rebindingAction.buttonElement) {
      this.rebindingAction.buttonElement.classList.remove('is-rebinding');
      const actionId = this.rebindingAction.actionId;
      const slotIndex = this.rebindingAction.slotIndex;
      const code = this.inputManager.bindings[actionId]?.keys[slotIndex];
      this.rebindingAction.buttonElement.querySelector('.btn-key-code').textContent = code ? formatKeyCode(code) : (slotIndex === 1 ? 'ADD KEY +' : 'EMPTY');
    }
    this.rebindingAction = null;
  }

  bindEvents() {
    // Back button
    const backBtn = this.root.querySelector('#settings-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.audio?.playUIClick) this.audio.playUIClick();
        if (this.rebindingAction) this.cancelRebinding();
        this.hide();

        if (typeof this.onReturn === 'function') {
          this.onReturn();
        } else if (window.game && window.game.previousStateBeforeSettings) {
          window.game.gameState.setState(window.game.previousStateBeforeSettings);
        } else if (this.gameState.previousState === GameStates.PLAYING || this.gameState.previousState === GameStates.PAUSED) {
          this.gameState.setState(this.gameState.previousState);
        } else {
          this.gameState.setState(GameStates.MENU);
        }
      });
    }

    // Tabs navigation
    const tabBtns = this.root.querySelectorAll('.settings-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.audio?.playUIClick) this.audio.playUIClick();
        this.switchTab(btn.dataset.tab);
      });
    });

    // Reset controls button
    const btnResetControls = this.root.querySelector('#btn-reset-controls');
    if (btnResetControls) {
      btnResetControls.addEventListener('click', () => {
        if (this.rebindingAction) this.cancelRebinding();
        this.inputManager.resetBindings();
        this.renderControlsMatrix();
        if (this.audio?.playUIClick) this.audio.playUIClick();
        this.showToast('↺ All driving controls have been restored to factory defaults.', 'success', 3000);
      });
    }

    // 1. Graphics settings listeners
    const setupSegmented = (containerId, settingKey, cb) => {
      const btns = this.root.querySelectorAll(`#${containerId} .seg-btn`);
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          btns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const val = btn.dataset.val;
          if (this.gameState?.settings) {
            this.gameState.settings[settingKey] = val;
          }
          if (this.audio?.playUIClick) this.audio.playUIClick();
          if (typeof cb === 'function') cb(val);
        });
      });
    };

    setupSegmented('ctrl-graphics-quality', 'graphicsQuality', (val) => {
      this.showToast(`Graphics Quality set to <strong>${val.toUpperCase()}</strong>`, 'info', 2000);
      if (this.onGraphicsChanged) this.onGraphicsChanged(this.getGraphicsSettings());
    });

    setupSegmented('ctrl-graphics-shadows', 'shadows', (val) => {
      this.showToast(`Shadows set to <strong>${val.toUpperCase()}</strong>`, 'info', 2000);
      if (this.onGraphicsChanged) this.onGraphicsChanged(this.getGraphicsSettings());
    });

    setupSegmented('ctrl-graphics-reflections', 'reflections', (val) => {
      this.showToast(`Reflections set to <strong>${val.toUpperCase()}</strong>`, 'info', 2000);
      if (this.onGraphicsChanged) this.onGraphicsChanged(this.getGraphicsSettings());
    });

    setupSegmented('ctrl-graphics-viewdist', 'viewDistance', (val) => {
      this.showToast(`View Distance set to <strong>${val.toUpperCase()}</strong>`, 'info', 2000);
      if (this.onGraphicsChanged) this.onGraphicsChanged(this.getGraphicsSettings());
    });

    setupSegmented('ctrl-graphics-antialiasing', 'antiAliasing', (val) => {
      this.showToast(`Anti-Aliasing set to <strong>${val.toUpperCase()}</strong>`, 'info', 2000);
      if (this.onGraphicsChanged) this.onGraphicsChanged(this.getGraphicsSettings());
    });

    // 2. Audio settings listeners
    const setupSlider = (sliderId, labelId, settingKey, cb) => {
      const slider = this.root.querySelector(`#${sliderId}`);
      const label = this.root.querySelector(`#${labelId}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          if (label) label.textContent = `${val}%`;
          if (this.gameState?.settings) {
            this.gameState.settings[settingKey] = val;
          }
          if (typeof cb === 'function') cb(val);
        });
      }
    };

    setupSlider('slider-audio-master', 'val-audio-master', 'audioMasterVolume', (val) => {
      if (this.audio?.setMasterVolume) this.audio.setMasterVolume(val);
      else if (this.audio?.masterGain && this.audio?.ctx) {
        this.audio.masterGain.gain.setValueAtTime(val / 100, this.audio.ctx.currentTime);
      }
    });

    setupSlider('slider-audio-engine', 'val-audio-engine', 'audioEngineVolume', (val) => {
      if (this.audio?.setEngineVolume) this.audio.setEngineVolume(val);
      else if (this.audio?.engineGain && this.audio?.ctx) {
        this.audio.engineGain.gain.setValueAtTime((val / 100) * 0.5, this.audio.ctx.currentTime);
      }
    });

    setupSlider('slider-audio-environment', 'val-audio-environment', 'audioEnvironmentVolume', (val) => {
      if (this.audio?.setEnvironmentVolume) this.audio.setEnvironmentVolume(val);
    });

    setupSlider('slider-audio-ui', 'val-audio-ui', 'audioUIVolume', (val) => {
      if (this.audio?.setUIVolume) this.audio.setUIVolume(val);
    });

    // 3. Gameplay settings listeners
    setupSegmented('ctrl-trafficdensity', 'trafficDensity', (val) => {
      if (window.game?.trafficManager) {
        window.game.trafficManager.setDensity(val);
      }
      if (this.onTrafficDensityChanged) {
        this.onTrafficDensityChanged(val);
      }
      this.showToast(`🚘 Traffic density set to <strong>${val.toUpperCase()}</strong>`, 'info', 2500);
    });

    setupSegmented('ctrl-driving-assist', 'drivingAssistance', (val) => {
      if (this.onDrivingAssistanceChanged) {
        this.onDrivingAssistanceChanged(val);
      } else if (window.game?.vehicleManager) {
        const phys = window.game.vehicleManager.getActivePhysics();
        if (phys && typeof phys.setDrivingAssistance === 'function') {
          phys.setDrivingAssistance(val);
        }
      }
      this.showToast(`Driving assistance set to <strong>${val.toUpperCase()}</strong>`, 'info', 2500);
    });

    setupSegmented('ctrl-transmission', 'transmission', (val) => {
      if (window.game?.vehicleManager) {
        const phys = window.game.vehicleManager.getActivePhysics();
        if (phys && typeof phys.setTransmissionMode === 'function') {
          phys.setTransmissionMode(val);
        }
        const ctrl = window.game.vehicleManager.getActiveController();
        if (ctrl && typeof ctrl.setTransmissionMode === 'function') {
          ctrl.setTransmissionMode(val);
        }
      }
      this.showToast(`Transmission mode set to <strong>${val.toUpperCase()}</strong>`, 'info', 2000);
    });

    setupSegmented('ctrl-speedunit', 'speedUnit', (val) => {
      this.showToast(`Speedometer unit set to ${val}`, 'info', 2000);
    });

    setupSegmented('ctrl-timeofday', 'timeOfDay', (val) => {
      if (this.onTimeOfDayChanged) {
        this.onTimeOfDayChanged(val);
      }
      this.showToast(`Time of Day set to <strong>${val.toUpperCase()}</strong>`, 'info', 2000);
    });

    setupSegmented('ctrl-weather', 'weather', (val) => {
      if (this.onWeatherChanged) {
        this.onWeatherChanged(val);
      }
      this.showToast(`Atmospheric weather set to <strong>${val.toUpperCase()}</strong>`, 'info', 2000);
    });

    setupSegmented('ctrl-theme', 'theme', (val) => {
      if (window.game && typeof window.game.setTheme === 'function') {
        window.game.setTheme(val);
      } else {
        document.body.classList.toggle('theme-light', val === 'light');
      }
      this.showToast(`Visual Theme set to <strong>${val.toUpperCase()} MODE</strong>`, 'info', 2000);
    });
  }

  getGraphicsSettings() {
    return {
      graphicsQuality: this.gameState?.settings?.graphicsQuality || 'high',
      shadows: this.gameState?.settings?.shadows || 'medium',
      reflections: this.gameState?.settings?.reflections || 'simple',
      viewDistance: this.gameState?.settings?.viewDistance || '1500m',
      antiAliasing: this.gameState?.settings?.antiAliasing || 'fxaa'
    };
  }

  syncUIWithSettings() {
    if (!this.gameState?.settings) return;
    const s = this.gameState.settings;

    const setSegmentedActive = (containerId, val) => {
      if (!val) return;
      const btns = this.root.querySelectorAll(`#${containerId} .seg-btn`);
      btns.forEach(b => b.classList.toggle('active', b.dataset.val === String(val).toLowerCase() || b.dataset.val === String(val)));
    };

    setSegmentedActive('ctrl-graphics-quality', s.graphicsQuality);
    setSegmentedActive('ctrl-graphics-shadows', s.shadows);
    setSegmentedActive('ctrl-graphics-reflections', s.reflections);
    setSegmentedActive('ctrl-graphics-viewdist', s.viewDistance);
    setSegmentedActive('ctrl-graphics-antialiasing', s.antiAliasing);

    setSegmentedActive('ctrl-trafficdensity', s.trafficDensity);
    setSegmentedActive('ctrl-driving-assist', s.drivingAssistance);
    setSegmentedActive('ctrl-transmission', s.transmission);
    setSegmentedActive('ctrl-speedunit', s.speedUnit);
    setSegmentedActive('ctrl-timeofday', s.timeOfDay || 'day');
    setSegmentedActive('ctrl-weather', s.weather || 'clear');

    const activeTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('openroad_theme')) || s.theme || 'light';
    setSegmentedActive('ctrl-theme', activeTheme);

    const setSliderVal = (sliderId, labelId, val) => {
      if (val === undefined || val === null) return;
      const slider = this.root.querySelector(`#${sliderId}`);
      const label = this.root.querySelector(`#${labelId}`);
      if (slider) slider.value = val;
      if (label) label.textContent = `${val}%`;
    };

    setSliderVal('slider-audio-master', 'val-audio-master', s.audioMasterVolume ?? 80);
    setSliderVal('slider-audio-engine', 'val-audio-engine', s.audioEngineVolume ?? 90);
    setSliderVal('slider-audio-environment', 'val-audio-environment', s.audioEnvironmentVolume ?? 75);
    setSliderVal('slider-audio-ui', 'val-audio-ui', s.audioUIVolume ?? 85);
  }

  show(initialTab = null) {
    if (initialTab) {
      this.switchTab(initialTab);
    }
    this.renderControlsMatrix();
    this.syncUIWithSettings();
    this.root.style.display = 'flex';
  }

  hide() {
    if (this.rebindingAction) this.cancelRebinding();
    this.root.style.display = 'none';
  }
}
