/**
 * Mission victory/defeat alerts and pause menu
 */
export class MissionUI {
  constructor(container, audioManager, callbacks = {}) {
    this.container = container;
    this.audio = audioManager;
    this.callbacks = callbacks;

    this.root = null;
    this.init();
  }

  init() {
    this.root = document.createElement('div');
    this.root.id = 'mission-ui-root';
    this.root.innerHTML = `
      <!-- Result Modal (Victory / Defeat) -->
      <div class="modal-backdrop" id="modal-result" style="display: none;">
        <div class="modal-dialog result-dialog glass-panel">
          <div class="result-badge" id="res-badge">MISSION ACCOMPLISHED</div>
          <h2 class="result-title" id="res-title">SUCCESS</h2>
          <div class="result-stars" id="res-stars">★★★</div>
          <p class="result-msg" id="res-msg">Outstanding driving performance!</p>
          <div class="result-reward-tag" id="res-reward">+$2,500 CREDITS</div>
          <div class="result-btns-row">
            <button class="result-btn primary-btn" id="btn-res-continue">CONTINUE</button>
            <button class="result-btn secondary-btn" id="btn-res-retry">RETRY</button>
          </div>
        </div>
      </div>

      <!-- Pause Menu Modal -->
      <div class="modal-backdrop" id="modal-pause" style="display: none;">
        <div class="modal-dialog pause-dialog glass-panel">
          <h2 class="pause-title">SIMULATION PAUSED</h2>
          <div class="pause-menu-list">
            <button class="menu-btn" id="btn-pause-resume">RESUME DRIVE</button>
            <button class="menu-btn" id="btn-pause-restart">RESTART MISSION</button>
            <button class="menu-btn" id="btn-pause-garage">ENTER GARAGE</button>
            <button class="menu-btn exit-btn" id="btn-pause-mainmenu">EXIT TO MAIN MENU</button>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.root);
    this.bindEvents();
  }

  bindEvents() {
    const resCont = this.root.querySelector('#btn-res-continue');
    const resRetry = this.root.querySelector('#btn-res-retry');

    resCont.addEventListener('click', () => {
      this.hideResult();
      if (this.callbacks.onContinue) this.callbacks.onContinue();
    });

    resRetry.addEventListener('click', () => {
      this.hideResult();
      if (this.callbacks.onRetry) this.callbacks.onRetry();
    });

    // Pause menu
    this.root.querySelector('#btn-pause-resume').addEventListener('click', () => {
      this.hidePause();
      if (this.callbacks.onResume) this.callbacks.onResume();
    });

    this.root.querySelector('#btn-pause-restart').addEventListener('click', () => {
      this.hidePause();
      if (this.callbacks.onRetry) this.callbacks.onRetry();
    });

    this.root.querySelector('#btn-pause-garage').addEventListener('click', () => {
      this.hidePause();
      if (this.callbacks.onGarage) this.callbacks.onGarage();
    });

    this.root.querySelector('#btn-pause-mainmenu').addEventListener('click', () => {
      this.hidePause();
      if (this.callbacks.onMainMenu) this.callbacks.onMainMenu();
    });
  }

  showResult(isSuccess, title, msg, reward = 0) {
    const modal = this.root.querySelector('#modal-result');
    const badge = this.root.querySelector('#res-badge');
    const titleEl = this.root.querySelector('#res-title');
    const starsEl = this.root.querySelector('#res-stars');
    const msgEl = this.root.querySelector('#res-msg');
    const rewardEl = this.root.querySelector('#res-reward');

    if (isSuccess) {
      badge.textContent = 'OBJECTIVE COMPLETE';
      badge.className = 'result-badge success-badge';
      titleEl.textContent = title || 'EXCELLENT';
      starsEl.textContent = '★★★';
      starsEl.style.display = 'block';
      msgEl.textContent = msg || 'Driving test requirements fulfilled flawlessly.';
      rewardEl.textContent = `+$${reward.toLocaleString()} CREDITS EARNED`;
      rewardEl.style.display = 'inline-block';
      this.audio.playCheckpointChime();
    } else {
      badge.textContent = 'TEST DISQUALIFICATION';
      badge.className = 'result-badge fail-badge';
      titleEl.textContent = title || 'TEST FAILED';
      starsEl.style.display = 'none';
      msgEl.textContent = msg || 'Requirements were not met.';
      rewardEl.style.display = 'none';
      this.audio.playCrash(0.6);
    }

    modal.style.display = 'flex';
  }

  hideResult() {
    this.root.querySelector('#modal-result').style.display = 'none';
  }

  showPause() {
    this.root.querySelector('#modal-pause').style.display = 'flex';
  }

  hidePause() {
    this.root.querySelector('#modal-pause').style.display = 'none';
  }
}
