/**
 * Mission victory/defeat alerts, road test evaluations, and pause menu
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
      <!-- Result Modal (Victory / Defeat / Road Test) -->
      <div class="modal-backdrop" id="modal-result" style="display: none;">
        <div class="modal-dialog result-dialog glass-panel" id="modal-result-dialog">
          
          <!-- 1. Standard Generic Mission View -->
          <div id="res-standard-view">
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

          <!-- 2. Dedicated Official Road Test Result View -->
          <div id="res-roadtest-view" style="display: none;">
            
            <!-- Road Test Passed Screen -->
            <div id="rt-passed-card" class="road-test-result-container" style="display: none;">
              <h2 class="rt-res-title">ROAD TEST COMPLETE</h2>
              <div class="rt-res-status passed">Result: PASSED</div>
              
              <div class="rt-res-stats">
                <div class="rt-res-stat-line">
                  <span class="rt-res-label">Time:</span>
                  <span class="rt-res-value" id="rt-res-time">04:32</span>
                </div>
                <div class="rt-res-stat-line">
                  <span class="rt-res-label">Mistakes:</span>
                  <span class="rt-res-value" id="rt-res-mistakes">1</span>
                </div>
                <div class="rt-res-stat-line">
                  <span class="rt-res-label">Checkpoints:</span>
                  <span class="rt-res-value" id="rt-res-checkpoints">10/10</span>
                </div>
              </div>

              <div class="rt-res-reward-unlocked" id="rt-res-reward">REWARD UNLOCKED</div>
              
              <div class="result-btns-row single-btn">
                <button class="result-btn primary-btn rt-action-btn" id="btn-rt-continue">CONTINUE</button>
              </div>
            </div>

            <!-- Road Test Failed Screen -->
            <div id="rt-failed-card" class="road-test-result-container failed" style="display: none;">
              <h2 class="rt-res-title failed">TEST FAILED</h2>
              
              <div class="rt-res-reason-box">
                <div class="rt-reason-heading">Reason:</div>
                <div class="rt-reason-body" id="rt-res-reason">Too many mistakes.</div>
              </div>

              <div class="result-btns-row">
                <button class="result-btn primary-btn rt-action-btn" id="btn-rt-retry">RETRY</button>
                <button class="result-btn exit-btn rt-action-btn" id="btn-rt-exit">EXIT</button>
              </div>
            </div>

          </div>

        </div>
      </div>

      <!-- Pause Menu Modal -->
      <div class="modal-backdrop" id="modal-pause" style="display: none;">
        <div class="modal-dialog pause-dialog glass-panel">
          <div class="pause-header">
            <span class="brand-badge">SIMULATION</span>
            <h2 class="pause-title">PAUSED</h2>
          </div>
          <div class="pause-menu-list">
            <button class="menu-btn primary-btn pause-action-btn" id="btn-pause-resume">
              <span class="btn-icon">▶</span>
              <span class="btn-text">RESUME</span>
            </button>
            <button class="menu-btn pause-action-btn" id="btn-pause-restart">
              <span class="btn-icon">↺</span>
              <span class="btn-text">RESTART</span>
            </button>
            <button class="menu-btn pause-action-btn" id="btn-pause-controls">
              <span class="btn-icon">🕹️</span>
              <span class="btn-text">CONTROLS</span>
            </button>
            <button class="menu-btn pause-action-btn" id="btn-pause-settings">
              <span class="btn-icon">⚙️</span>
              <span class="btn-text">SETTINGS</span>
            </button>
            <button class="menu-btn exit-btn pause-action-btn" id="btn-pause-mainmenu">
              <span class="btn-icon">◀</span>
              <span class="btn-text">MAIN MENU</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.root);
    this.bindEvents();
  }

  bindEvents() {
    // Standard result buttons
    const resCont = this.root.querySelector('#btn-res-continue');
    const resRetry = this.root.querySelector('#btn-res-retry');

    if (resCont) {
      resCont.addEventListener('click', () => {
        this.hideResult();
        if (this.callbacks.onContinue) this.callbacks.onContinue();
      });
    }

    if (resRetry) {
      resRetry.addEventListener('click', () => {
        this.hideResult();
        if (this.callbacks.onRetry) this.callbacks.onRetry();
      });
    }

    // Road Test dedicated buttons
    const rtCont = this.root.querySelector('#btn-rt-continue');
    const rtRetry = this.root.querySelector('#btn-rt-retry');
    const rtExit = this.root.querySelector('#btn-rt-exit');

    if (rtCont) {
      rtCont.addEventListener('click', () => {
        this.hideResult();
        if (this.callbacks.onContinue) this.callbacks.onContinue();
      });
    }

    if (rtRetry) {
      rtRetry.addEventListener('click', () => {
        this.hideResult();
        if (this.callbacks.onRetry) this.callbacks.onRetry();
      });
    }

    if (rtExit) {
      rtExit.addEventListener('click', () => {
        this.hideResult();
        if (this.callbacks.onMainMenu) this.callbacks.onMainMenu();
      });
    }

    // Pause menu listeners
    const addPauseClick = (sel, cbName) => {
      const btn = this.root.querySelector(sel);
      if (btn) {
        btn.addEventListener('click', () => {
          this.hidePause();
          if (this.audio && this.audio.playUIClick) this.audio.playUIClick();
          if (this.callbacks[cbName]) this.callbacks[cbName]();
        });
      }
    };

    addPauseClick('#btn-pause-resume', 'onResume');
    addPauseClick('#btn-pause-restart', 'onRetry');
    addPauseClick('#btn-pause-controls', 'onControls');
    addPauseClick('#btn-pause-settings', 'onSettings');
    addPauseClick('#btn-pause-mainmenu', 'onMainMenu');
  }

  showResult(isSuccess, title, msg, reward = 0, extraData = {}) {
    const modal = this.root.querySelector('#modal-result');

    const stdView = this.root.querySelector('#res-standard-view');
    const rtView = this.root.querySelector('#res-roadtest-view');

    const isRoadTest = extraData?.isRoadTest ||
      extraData?.mode === 'ROAD_TEST' ||
      extraData?.subMode === 'ROAD_TEST' ||
      title === 'ROAD TEST COMPLETE' ||
      (title === 'TEST FAILED' && (extraData?.subMode === 'ROAD_TEST' || extraData?.mode === 'ROAD_TEST'));

    if (isRoadTest) {
      stdView.style.display = 'none';
      rtView.style.display = 'block';

      const rtPassedCard = this.root.querySelector('#rt-passed-card');
      const rtFailedCard = this.root.querySelector('#rt-failed-card');

      if (isSuccess) {
        rtPassedCard.style.display = 'block';
        rtFailedCard.style.display = 'none';

        const timeVal = extraData.timeFormatted || (typeof extraData.timer === 'number'
          ? `${String(Math.floor(extraData.timer / 60)).padStart(2, '0')}:${String(Math.floor(extraData.timer % 60)).padStart(2, '0')}`
          : '04:32');
        this.root.querySelector('#rt-res-time').textContent = timeVal;
        this.root.querySelector('#rt-res-mistakes').textContent = extraData.mistakes !== undefined ? extraData.mistakes : '1';
        const totalCps = extraData.totalCheckpoints || 10;
        this.root.querySelector('#rt-res-checkpoints').textContent = `${totalCps}/${totalCps}`;

        if (this.audio) {
          if (typeof this.audio.playVictoryFanfare === 'function') this.audio.playVictoryFanfare();
          else if (typeof this.audio.playCheckpointChime === 'function') this.audio.playCheckpointChime();
        }
      } else {
        rtPassedCard.style.display = 'none';
        rtFailedCard.style.display = 'block';

        this.root.querySelector('#rt-res-reason').textContent = extraData.failReason || 'Too many mistakes.';
        if (this.audio && typeof this.audio.playCrash === 'function') {
          this.audio.playCrash(0.6);
        }
      }
    } else {
      rtView.style.display = 'none';
      stdView.style.display = 'block';

      const badge = this.root.querySelector('#res-badge');
      const titleEl = this.root.querySelector('#res-title');
      const starsEl = this.root.querySelector('#res-stars');
      const msgEl = this.root.querySelector('#res-msg');
      const rewardEl = this.root.querySelector('#res-reward');

      if (isSuccess) {
        if (extraData?.isCourseTest) {
          badge.textContent = 'COURSE TEST COMPLETE';
          badge.className = 'result-badge success-badge';
          titleEl.textContent = 'COURSE TEST COMPLETE';
          starsEl.textContent = '★★★';
          starsEl.style.display = 'block';
          msgEl.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:6px;font-family:var(--font-tech);margin:10px 0;text-align:left;background:rgba(255,255,255,0.06);padding:12px;border-radius:8px;">
              <div style="display:flex;justify-content:space-between;"><span>Completion Time:</span><strong>${extraData.timeFormatted || '00:00'}</strong></div>
              <div style="display:flex;justify-content:space-between;"><span>Collisions:</span><strong>${extraData.collisions || 0}</strong></div>
              <div style="display:flex;justify-content:space-between;"><span>Missed Checkpoints:</span><strong>${extraData.missedCheckpoints || 0}</strong></div>
              <div style="display:flex;justify-content:space-between;color:var(--accent-gold);"><span>Driving Accuracy:</span><strong>${extraData.accuracy !== undefined ? extraData.accuracy : 100}%</strong></div>
            </div>
          `;
          rewardEl.textContent = `+$${reward.toLocaleString()} CREDITS EARNED`;
          rewardEl.style.display = 'inline-block';
          if (this.audio?.playVictoryFanfare) this.audio.playVictoryFanfare();
          else if (this.audio?.playCheckpointChime) this.audio.playCheckpointChime();
        } else if (extraData?.isParkingTest) {
          badge.textContent = 'PARKING CHALLENGE COMPLETE';
          badge.className = 'result-badge success-badge';
          titleEl.textContent = 'PARKING TEST COMPLETE';
          starsEl.textContent = '★★★';
          starsEl.style.display = 'block';
          msgEl.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:6px;font-family:var(--font-tech);margin:10px 0;text-align:left;background:rgba(255,255,255,0.06);padding:12px;border-radius:8px;">
              <div style="display:flex;justify-content:space-between;"><span>Parking Challenges:</span><strong>3 / 3 Complete</strong></div>
              <div style="display:flex;justify-content:space-between;color:var(--accent-gold);"><span>Overall Accuracy:</span><strong>${extraData.finalAccuracy || extraData.accuracy || 86}%</strong></div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Straight, Reverse, & Parallel Bays Parked Successfully.</div>
            </div>
          `;
          rewardEl.textContent = `+$${reward.toLocaleString()} CREDITS EARNED`;
          rewardEl.style.display = 'inline-block';
          if (this.audio?.playVictoryFanfare) this.audio.playVictoryFanfare();
          else if (this.audio?.playCheckpointChime) this.audio.playCheckpointChime();
        } else {
          badge.textContent = 'OBJECTIVE COMPLETE';
          badge.className = 'result-badge success-badge';
          titleEl.textContent = title || 'EXCELLENT';
          starsEl.textContent = '★★★';
          starsEl.style.display = 'block';
          msgEl.textContent = msg || 'Driving test requirements fulfilled flawlessly.';
          rewardEl.textContent = `+$${reward.toLocaleString()} CREDITS EARNED`;
          rewardEl.style.display = 'inline-block';
          if (this.audio?.playCheckpointChime) this.audio.playCheckpointChime();
        }
      } else {
        badge.textContent = 'TEST DISQUALIFICATION';
        badge.className = 'result-badge fail-badge';
        titleEl.textContent = title || 'TEST FAILED';
        starsEl.style.display = 'none';
        msgEl.textContent = msg || 'Requirements were not met.';
        rewardEl.style.display = 'none';
        if (this.audio?.playCrash) this.audio.playCrash(0.6);
      }
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
