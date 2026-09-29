/**
 * Functional Pit Stop Interface
 * Displays:
 * PIT STOP
 *
 * Repair     [READY]
 * Fuel       [READY]
 * Continue   [EXIT]
 */
export class PitStopUI {
  constructor(container, audioManager, callbacks = {}) {
    this.container = container;
    this.audio = audioManager;
    this.callbacks = callbacks; // { onRepair, onFuel, onContinue }

    this.root = null;
    this.isRepaired = false;
    this.isFueled = false;

    this.init();
  }

  init() {
    this.root = document.createElement('div');
    this.root.className = 'modal-backdrop pit-modal-backdrop';
    this.root.id = 'pit-stop-modal';
    this.root.style.display = 'none';

    this.root.innerHTML = `
      <div class="modal-dialog pit-dialog glass-panel">
        <div class="pit-header">
          <div class="pit-badge"><span class="pulse-dot"></span> PIT LANE SERVICE</div>
          <h2 class="pit-title">PIT STOP</h2>
          <p class="pit-subtitle">Team Garage Bay & Telemetry Command</p>
        </div>

        <div class="pit-services-list">
          <!-- Repair Row -->
          <div class="pit-service-row">
            <div class="service-info">
              <span class="service-icon">🔧</span>
              <div class="service-text">
                <span class="service-name">Repair</span>
                <span class="service-sub">Chassis, suspension & tire alignment</span>
              </div>
            </div>
            <button class="pit-action-btn ready-btn" id="btn-pit-repair">
              <span class="btn-state">[READY]</span>
            </button>
          </div>

          <!-- Fuel Row -->
          <div class="pit-service-row">
            <div class="service-info">
              <span class="service-icon">⛽</span>
              <div class="service-text">
                <span class="service-name">Fuel</span>
                <span class="service-sub">High-octane racing fuel top-up</span>
              </div>
            </div>
            <button class="pit-action-btn ready-btn" id="btn-pit-fuel">
              <span class="btn-state">[READY]</span>
            </button>
          </div>

          <!-- Continue Row -->
          <div class="pit-service-row continue-row">
            <div class="service-info">
              <span class="service-icon">🏁</span>
              <div class="service-text">
                <span class="service-name">Continue</span>
                <span class="service-sub">Clear pit box and rejoin race circuit</span>
              </div>
            </div>
            <button class="pit-action-btn exit-btn" id="btn-pit-continue">
              <span class="btn-state">[EXIT]</span>
            </button>
          </div>
        </div>

        <div class="pit-status-bar" id="pit-status-text">
          PIT CREW READY • SELECT SERVICE OR EXIT
        </div>
      </div>
    `;

    this.container.appendChild(this.root);
    this.bindEvents();
  }

  bindEvents() {
    const repairBtn = this.root.querySelector('#btn-pit-repair');
    const fuelBtn = this.root.querySelector('#btn-pit-fuel');
    const continueBtn = this.root.querySelector('#btn-pit-continue');
    const statusText = this.root.querySelector('#pit-status-text');

    // Repair action
    repairBtn.addEventListener('click', () => {
      this.isRepaired = true;
      repairBtn.classList.remove('ready-btn');
      repairBtn.classList.add('done-btn');
      repairBtn.querySelector('.btn-state').textContent = '[COMPLETED]';
      statusText.textContent = '✓ VEHICLE REPAIRED: SUSPENSION & TIRES OPTIMIZED';
      this.audio.playCheckpointChime();

      if (this.callbacks.onRepair) {
        this.callbacks.onRepair();
      }
    });

    // Fuel action
    fuelBtn.addEventListener('click', () => {
      this.isFueled = true;
      fuelBtn.classList.remove('ready-btn');
      fuelBtn.classList.add('done-btn');
      fuelBtn.querySelector('.btn-state').textContent = '[100% FULL]';
      statusText.textContent = '✓ TANK REFUELED: 100% HIGH-OCTANE FUEL LOADED';
      this.audio.playCheckpointChime();

      if (this.callbacks.onFuel) {
        this.callbacks.onFuel();
      }
    });

    // Continue / Exit action
    continueBtn.addEventListener('click', () => {
      this.audio.playUIClick();
      this.hide();

      if (this.callbacks.onContinue) {
        this.callbacks.onContinue();
      }
    });
  }

  show() {
    // Reset service button states upon entering pit stop
    this.isRepaired = false;
    this.isFueled = false;

    const repairBtn = this.root.querySelector('#btn-pit-repair');
    repairBtn.classList.add('ready-btn');
    repairBtn.classList.remove('done-btn');
    repairBtn.querySelector('.btn-state').textContent = '[READY]';

    const fuelBtn = this.root.querySelector('#btn-pit-fuel');
    fuelBtn.classList.add('ready-btn');
    fuelBtn.classList.remove('done-btn');
    fuelBtn.querySelector('.btn-state').textContent = '[READY]';

    const statusText = this.root.querySelector('#pit-status-text');
    statusText.textContent = 'PIT CREW READY • SELECT SERVICE OR EXIT';

    this.root.style.display = 'flex';
  }

  hide() {
    this.root.style.display = 'none';
  }

  isOpen() {
    return this.root.style.display === 'flex';
  }
}
