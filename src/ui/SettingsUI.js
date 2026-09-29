import { GameStates } from '../core/GameState.js';
import { formatKeyCode } from '../core/InputManager.js';

export class SettingsUI {
  constructor(container, gameState, audioManager, onTimeOfDayChanged, inputManager) {
    this.container = container;
    this.gameState = gameState;
    this.audio = audioManager;
    this.onTimeOfDayChanged = onTimeOfDayChanged;
    this.inputManager = inputManager;

    this.root = null;
    this.activeTab = 'controls'; // 'controls' | 'simulation'
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
          <span class="brand-badge">PREFERENCES & INPUT CONFIG</span>
          <h2 class="settings-title">SETTINGS & CONTROLS</h2>
        </div>
        <div class="settings-tabs-nav">
          <button class="settings-tab-btn active" id="tab-btn-controls" data-tab="controls">
            <span class="tab-icon">🕹️</span> CONTROLS SETTINGS
          </button>
          <button class="settings-tab-btn" id="tab-btn-simulation" data-tab="simulation">
            <span class="tab-icon">⚙️</span> SIMULATION & AUDIO
          </button>
        </div>
      </header>

      <div class="settings-content-wrapper">
        <!-- Notification Toast Area -->
        <div class="settings-toast-banner" id="settings-toast" style="display: none;"></div>

        <!-- 1. CONTROLS SETTINGS TAB -->
        <div class="settings-tab-page active" id="page-controls">
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
              Accelerate and Wipers both defaulted to <code>W</code> in initial layouts. To eliminate throttle lockout conflicts,
              Windshield Wipers is cleanly mapped to <code>X</code> by default. You can reassign any key freely below.
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

        <!-- 2. SIMULATION & AUDIO TAB -->
        <div class="settings-tab-page" id="page-simulation" style="display: none;">
          <div class="settings-layout">
            <div class="settings-card glass-panel">
              <h3 class="card-title">SIMULATION PREFERENCES</h3>

              <div class="setting-item">
                <label class="setting-label">TRANSMISSION MODE</label>
                <div class="segmented-control" id="ctrl-transmission">
                  <button class="seg-btn active" data-val="auto">AUTOMATIC</button>
                  <button class="seg-btn" data-val="manual">MANUAL (G TO CYCLE)</button>
                </div>
              </div>

              <div class="setting-item">
                <label class="setting-label">TIME OF DAY LIGHTING</label>
                <div class="segmented-control" id="ctrl-timeofday">
                  <button class="seg-btn active" data-val="day">DAY</button>
                  <button class="seg-btn" data-val="sunset">SUNSET</button>
                  <button class="seg-btn" data-val="night">NIGHT</button>
                </div>
              </div>

              <div class="setting-item">
                <label class="setting-label">SPEEDOMETER UNIT</label>
                <div class="segmented-control" id="ctrl-speedunit">
                  <button class="seg-btn active" data-val="KM/H">KM/H</button>
                  <button class="seg-btn" data-val="MPH">MPH</button>
                </div>
              </div>
            </div>

            <div class="settings-card glass-panel">
              <h3 class="card-title">AUDIO & SOUND SYNTHESIS</h3>

              <div class="setting-item">
                <div class="setting-label-row">
                  <label class="setting-label">MASTER AUDIO VOLUME</label>
                  <span class="slider-val" id="val-audio-master">80%</span>
                </div>
                <input type="range" min="0" max="100" value="80" class="range-slider" id="slider-audio-master">
              </div>

              <div class="setting-item">
                <div class="setting-label-row">
                  <label class="setting-label">ENGINE & EXHAUST VOLUME</label>
                  <span class="slider-val" id="val-audio-engine">90%</span>
                </div>
                <input type="range" min="0" max="100" value="90" class="range-slider" id="slider-audio-engine">
              </div>

              <div class="settings-tips-card">
                <h4>PRO TIP: SPORT MODE</h4>
                <p>Press <code>SHIFT</code> during gameplay to toggle Sport Mode: razor-sharp steering and 25% extra throttle response!</p>
              </div>
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

  renderControlsMatrix() {
    const tbody = this.root.querySelector('#controls-matrix-body');
    if (!tbody || !this.inputManager) return;

    const bindings = (this.inputManager && typeof this.inputManager.getBindings === 'function')
      ? this.inputManager.getBindings()
      : (this.inputManager?.bindings || DEFAULT_KEY_BINDINGS);
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
            ${isConflictAlternative ? '<span class="resolved-badge">CLEAN MAPPING</span>' : ''}
          </div>
          <div class="matrix-cell desc-cell">
            <span class="action-desc">${def.desc || ''}</span>
          </div>
          <div class="matrix-cell keys-cell">
            <button class="key-bind-btn ${!slot1Code ? 'empty-slot' : ''}"
                    data-action="${actionId}"
                    data-slot="0"
                    title="Click to rebind primary key">
              <span class="btn-key-code">${slot1Label}</span>
            </button>
            <button class="key-bind-btn ${!slot2Code ? 'empty-slot add-key' : ''}"
                    data-action="${actionId}"
                    data-slot="1"
                    title="Click to assign secondary key">
              <span class="btn-key-code">${slot2Label}</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to all rebind buttons
    tbody.querySelectorAll('.key-bind-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const actionId = btn.dataset.action;
        const slotIndex = parseInt(btn.dataset.slot, 10);
        this.startRebinding(actionId, slotIndex, btn);
      });
    });
  }

  startRebinding(actionId, slotIndex, buttonElement) {
    if (this.rebindingAction) {
      this.cancelRebinding();
    }

    this.audio.playUIClick();
    this.rebindingAction = { actionId, slotIndex, buttonElement };
    buttonElement.classList.add('is-rebinding');
    buttonElement.querySelector('.btn-key-code').textContent = 'PRESS KEY...';

    this.showToast(`Press any keyboard key for <strong>${this.inputManager.bindings[actionId].label}</strong> (ESC to cancel)`, 'warning', 6000);

    // Global listener for next keydown
    this.rebindListener = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const newCode = e.code;

      // Check if user pressed Escape to cancel
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

    this.audio.playUIClick();
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
    this.root.querySelector('#settings-back-btn').addEventListener('click', () => {
      this.audio.playUIClick();
      if (this.rebindingAction) this.cancelRebinding();

      if (this.gameState.previousState === GameStates.PLAYING) {
        this.gameState.setState(GameStates.PLAYING);
      } else {
        this.gameState.setState(GameStates.MENU);
      }
    });

    // Tab buttons
    const tabControls = this.root.querySelector('#tab-btn-controls');
    const tabSimulation = this.root.querySelector('#tab-btn-simulation');
    const pageControls = this.root.querySelector('#page-controls');
    const pageSimulation = this.root.querySelector('#page-simulation');

    tabControls.addEventListener('click', () => {
      tabControls.classList.add('active');
      tabSimulation.classList.remove('active');
      pageControls.style.display = 'block';
      pageSimulation.style.display = 'none';
      this.activeTab = 'controls';
      this.audio.playUIClick();
    });

    tabSimulation.addEventListener('click', () => {
      tabSimulation.classList.add('active');
      tabControls.classList.remove('active');
      pageControls.style.display = 'none';
      pageSimulation.style.display = 'block';
      this.activeTab = 'simulation';
      this.audio.playUIClick();
    });

    // Reset controls to factory defaults
    this.root.querySelector('#btn-reset-controls').addEventListener('click', () => {
      if (this.rebindingAction) this.cancelRebinding();
      this.inputManager.resetBindings();
      this.renderControlsMatrix();
      this.audio.playUIClick();
      this.showToast('↺ All driving controls have been restored to factory defaults.', 'success', 3000);
    });

    // Time of day segmented buttons
    const todBtns = this.root.querySelectorAll('#ctrl-timeofday .seg-btn');
    todBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        todBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.gameState.settings.timeOfDay = btn.dataset.val;
        this.audio.playUIClick();
        if (this.onTimeOfDayChanged) this.onTimeOfDayChanged(btn.dataset.val);
      });
    });

    // Transmission buttons
    const transBtns = this.root.querySelectorAll('#ctrl-transmission .seg-btn');
    transBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        transBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.val;
        this.gameState.settings.transmission = mode;
        this.audio.playUIClick();
        if (window.game && window.game.vehicleManager) {
          const phys = window.game.vehicleManager.getActivePhysics();
          if (phys && typeof phys.setTransmissionMode === 'function') {
            phys.setTransmissionMode(mode);
          }
        }
      });
    });

    // Volume sliders
    const masterSlider = this.root.querySelector('#slider-audio-master');
    const masterVal = this.root.querySelector('#val-audio-master');
    masterSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      if (masterVal) masterVal.textContent = `${val}%`;
      if (this.audio.masterGain) {
        this.audio.masterGain.gain.setValueAtTime(val / 100, this.audio.ctx.currentTime);
      }
    });

    const engineSlider = this.root.querySelector('#slider-audio-engine');
    const engineVal = this.root.querySelector('#val-audio-engine');
    engineSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      if (engineVal) engineVal.textContent = `${val}%`;
      if (this.audio.engineGain) {
        this.audio.engineGain.gain.setValueAtTime((val / 100) * 0.5, this.audio.ctx.currentTime);
      }
    });
  }

  show() {
    this.renderControlsMatrix();
    this.root.style.display = 'flex';
  }

  hide() {
    if (this.rebindingAction) this.cancelRebinding();
    this.root.style.display = 'none';
  }
}
