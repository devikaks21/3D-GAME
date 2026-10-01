import { GameStates, GameModes } from '../core/GameState.js';

/**
 * Cinematic Automotive Main Menu with vehicle preview, glassmorphic panels, and sound effects
 */
export class MainMenu {
  constructor(container, gameState, audioManager, onPlayModeSelected, onOpenDrivingSchool = null) {
    this.container = container;
    this.gameState = gameState;
    this.audio = audioManager;
    this.onPlayModeSelected = onPlayModeSelected;
    this.onOpenDrivingSchool = onOpenDrivingSchool;

    this.root = null;
    this.modeSelectorModal = null;
    this.init();
  }

  init() {
    this.root = document.createElement('div');
    this.root.className = 'main-menu-overlay cinematic-overlay';
    this.root.id = 'main-menu-root';

    this.root.innerHTML = `
      <div class="menu-backdrop-grid"></div>

      <!-- Header Brand -->
      <header class="menu-brand-header">
        <div class="brand-badge"><span class="pulse-dot"></span> NEXT-GEN SIMULATOR</div>
        <h1 class="brand-title">OPEN ROAD <span class="accent-glow">3D</span></h1>
        <p class="brand-subtitle">Open-World Driving Simulator</p>
      </header>

      <!-- Main Navigation Menu -->
      <nav class="menu-nav-panel glass-panel">
        <div class="menu-nav-tag">SIMULATION SUITE</div>
        <ul class="menu-btn-list">
          <li>
            <button class="menu-btn play-btn" id="btn-menu-play">
              <span class="btn-icon">⚡</span>
              <span class="btn-text">PLAY</span>
              <span class="btn-subtext">SELECT GAME MODE</span>
            </button>
          </li>
          <li>
            <button class="menu-btn" id="btn-menu-garage">
              <span class="btn-icon">🚗</span>
              <span class="btn-text">GARAGE</span>
              <span class="btn-subtext">VEHICLES & TUNING</span>
            </button>
          </li>
          <li>
            <button class="menu-btn" id="btn-menu-map">
              <span class="btn-icon">🗺️</span>
              <span class="btn-text">MAP</span>
              <span class="btn-subtext">EXPLORE SECTORS</span>
            </button>
          </li>
          <li>
            <button class="menu-btn" id="btn-menu-school">
              <span class="btn-icon">🎓</span>
              <span class="btn-text">DRIVING SCHOOL</span>
              <span class="btn-subtext">MASTER VEHICLE SKILLS</span>
            </button>
          </li>
          <li>
            <button class="menu-btn" id="btn-menu-racing">
              <span class="btn-icon">🏁</span>
              <span class="btn-text">RACING</span>
              <span class="btn-subtext">CIRCUIT LAP ATTACK</span>
            </button>
          </li>
          <li>
            <button class="menu-btn" id="btn-menu-settings">
              <span class="btn-icon">⚙️</span>
              <span class="btn-text">SETTINGS</span>
              <span class="btn-subtext">GRAPHICS & AUDIO</span>
            </button>
          </li>
          <li>
            <button class="menu-btn exit-btn" id="btn-menu-exit">
              <span class="btn-icon">✕</span>
              <span class="btn-text">EXIT</span>
              <span class="btn-subtext">QUIT SIMULATOR</span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- Bottom Status Bar -->
      <footer class="menu-status-bar glass-panel">
        <div class="status-item">
          <span class="status-label">CURRENT MACHINE</span>
          <span class="status-val" id="menu-current-car">APEX GT</span>
        </div>
        <div class="status-divider"></div>
        <div class="status-item">
          <span class="status-label">BALANCE CREDITS</span>
          <span class="status-val accent-val" id="menu-credits">$15,000</span>
        </div>
        <div class="status-divider"></div>
        <div class="status-item">
          <span class="status-label">INTERACTION</span>
          <span class="status-val hint-val">CLICK & DRAG TO ORBIT SHOWCASE</span>
        </div>
      </footer>

      <!-- Game Mode Selection Modal -->
      <div class="modal-backdrop" id="mode-selector-modal" style="display: none;">
        <div class="modal-dialog glass-panel">
          <div class="modal-header">
            <div>
              <span class="brand-badge">DEPLOYMENT</span>
              <h2 class="modal-title">SELECT GAME MODE</h2>
            </div>
            <button class="modal-close-btn" id="btn-close-modes">✕</button>
          </div>
          <div class="modes-grid">
            <div class="mode-card" data-mode="FREE_DRIVE">
              <div class="mode-card-header">
                <span class="mode-icon">🌐</span>
                <span class="mode-badge">OPEN WORLD</span>
              </div>
              <h3 class="mode-title">FREE DRIVE</h3>
              <p class="mode-desc">Drive freely around the downtown city, mountain roads, coastal beach, airport and race circuit with zero rules.</p>
              <button class="mode-select-btn">LAUNCH FREE DRIVE</button>
            </div>

            <div class="mode-card" data-mode="DRIVING_SCHOOL">
              <div class="mode-card-header">
                <span class="mode-icon">🎓</span>
                <span class="mode-badge">ACADEMY</span>
              </div>
              <h3 class="mode-title">DRIVING SCHOOL</h3>
              <p class="mode-desc">Practice precision braking, cone slaloms, and emergency stops to earn driving awards and cash rewards.</p>
              <button class="mode-select-btn">START LESSONS</button>
            </div>

            <div class="mode-card" data-mode="ROAD_TEST">
              <div class="mode-card-header">
                <span class="mode-icon">📋</span>
                <span class="mode-badge">LICENSING</span>
              </div>
              <h3 class="mode-title">ROAD TEST</h3>
              <p class="mode-desc">Follow the official test route through city traffic, obey speed limits, and earn your driving credentials.</p>
              <button class="mode-select-btn">TAKE TEST</button>
            </div>

            <div class="mode-card" data-mode="COURSE_TEST">
              <div class="mode-card-header">
                <span class="mode-icon">⏱️</span>
                <span class="mode-badge">TIME ATTACK</span>
              </div>
              <h3 class="mode-title">COURSE TEST</h3>
              <p class="mode-desc">Tackle tight technical chicanes and high-elevation mountain checkpoints against the clock.</p>
              <button class="mode-select-btn">ENTER COURSE</button>
            </div>

            <div class="mode-card" data-mode="RACING_TRACK">
              <div class="mode-card-header">
                <span class="mode-icon">🏁</span>
                <span class="mode-badge">MOTORSPORT</span>
              </div>
              <h3 class="mode-title">RACING CIRCUIT</h3>
              <p class="mode-desc">Complete full hot laps on the Grand Prix circuit with apex rumble kerbs, starting lights and pit stops.</p>
              <button class="mode-select-btn">START RACE</button>
            </div>

            <div class="mode-card" data-mode="CAR_PLAYGROUND">
              <div class="mode-card-header">
                <span class="mode-icon">🎪</span>
                <span class="mode-badge">STUNTS & PHYSICS</span>
              </div>
              <h3 class="mode-title">CAR PLAYGROUND</h3>
              <p class="mode-desc">Unleash vehicle physics on mega ramps, stunt loops, half-pipes, and smashable dynamic obstacle crates.</p>
              <button class="mode-select-btn">ENTER PLAYGROUND</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Dedicated Racing Circuit Sub-Mode Modal -->
      <div class="modal-backdrop" id="race-submode-modal" style="display: none;">
        <div class="modal-dialog glass-panel" style="max-width: 680px;">
          <div class="modal-header">
            <div>
              <span class="brand-badge">MOTORSPORT COMPLEX</span>
              <h2 class="modal-title">SELECT CIRCUIT MODE</h2>
            </div>
            <button class="modal-close-btn" id="btn-close-race-modal">✕</button>
          </div>
          <div class="modes-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
            <div class="mode-card" id="card-race-timetrial">
              <div class="mode-card-header">
                <span class="mode-icon">⏱️</span>
                <span class="mode-badge">COMPETITION</span>
              </div>
              <h3 class="mode-title">TIME TRIAL</h3>
              <p class="mode-desc">Official 3-lap timed attack. Starts from Pole Grid Box with starting signal lights countdown (3.. 2.. 1.. GO!), sector splits, and best lap record trophies.</p>
              <div style="font-family: var(--font-tech); font-size: 12px; color: var(--accent-gold); margin-bottom: 12px;">DISPLAY: LAP 1/3</div>
              <button class="mode-select-btn">START TIME TRIAL</button>
            </div>

            <div class="mode-card" id="card-race-freetrack">
              <div class="mode-card-header">
                <span class="mode-icon">🏁</span>
                <span class="mode-badge">PRACTICE</span>
              </div>
              <h3 class="mode-title">FREE TRACK DRIVING</h3>
              <p class="mode-desc">Continuous open circuit driving with unlimited laps. Practice apex lines, test vehicle suspension on rumble kerbs, and visit the pit stop lane.</p>
              <div style="font-family: var(--font-tech); font-size: 12px; color: var(--accent-cyan); margin-bottom: 12px;">DISPLAY: CONTINUOUS LAPS</div>
              <button class="mode-select-btn">START FREE TRACK</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.root);
    this.bindEvents();
  }

  bindEvents() {
    const playBtn = this.root.querySelector('#btn-menu-play');
    const garageBtn = this.root.querySelector('#btn-menu-garage');
    const mapBtn = this.root.querySelector('#btn-menu-map');
    const schoolBtn = this.root.querySelector('#btn-menu-school');
    const racingBtn = this.root.querySelector('#btn-menu-racing');
    const settingsBtn = this.root.querySelector('#btn-menu-settings');
    const exitBtn = this.root.querySelector('#btn-menu-exit');

    const modal = this.root.querySelector('#mode-selector-modal');
    const closeModes = this.root.querySelector('#btn-close-modes');

    const raceModal = this.root.querySelector('#race-submode-modal');
    const closeRaceModal = this.root.querySelector('#btn-close-race-modal');
    const timeTrialCard = this.root.querySelector('#card-race-timetrial');
    const freeTrackCard = this.root.querySelector('#card-race-freetrack');

    // Button audio & hover sounds
    this.root.querySelectorAll('.menu-btn, .mode-select-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => this.audio.playUIHover());
    });

    playBtn.addEventListener('click', () => {
      this.audio.playUIClick();
      this.onPlayModeSelected(GameModes.FREE_DRIVE);
    });

    closeModes.addEventListener('click', () => {
      this.audio.playUIClick();
      modal.style.display = 'none';
    });

    closeRaceModal.addEventListener('click', () => {
      this.audio.playUIClick();
      raceModal.style.display = 'none';
    });

    // Mode cards selection
    this.root.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const mode = card.dataset.mode;
        if (!mode) return;
        this.audio.playUIClick();
        modal.style.display = 'none';

        if (mode === GameModes.RACING_TRACK) {
          raceModal.style.display = 'flex';
        } else if (mode === GameModes.DRIVING_SCHOOL) {
          if (this.onOpenDrivingSchool) {
            this.onOpenDrivingSchool();
          } else {
            this.onPlayModeSelected(mode);
          }
        } else {
          this.onPlayModeSelected(mode);
        }
      });
    });

    // Race Sub-mode selection
    timeTrialCard.addEventListener('click', () => {
      this.audio.playUIClick();
      raceModal.style.display = 'none';
      modal.style.display = 'none';
      this.onPlayModeSelected(GameModes.RACING_TRACK, { raceType: 'TIME_TRIAL' });
    });

    freeTrackCard.addEventListener('click', () => {
      this.audio.playUIClick();
      raceModal.style.display = 'none';
      modal.style.display = 'none';
      this.onPlayModeSelected(GameModes.RACING_TRACK, { raceType: 'FREE_TRACK' });
    });

    garageBtn.addEventListener('click', () => {
      this.audio.playUIClick();
      this.gameState.setState(GameStates.GARAGE);
    });

    mapBtn.addEventListener('click', () => {
      this.audio.playUIClick();
      this.gameState.setState(GameStates.MAP);
    });

    schoolBtn.addEventListener('click', () => {
      this.audio.playUIClick();
      if (this.onOpenDrivingSchool) {
        this.onOpenDrivingSchool();
      } else {
        this.onPlayModeSelected(GameModes.DRIVING_SCHOOL);
      }
    });

    racingBtn.addEventListener('click', () => {
      this.audio.playUIClick();
      raceModal.style.display = 'flex';
    });

    settingsBtn.addEventListener('click', () => {
      this.audio.playUIClick();
      this.gameState.setState(GameStates.SETTINGS);
    });

    exitBtn.addEventListener('click', () => {
      this.audio.playUIClick();
      alert('Open Road 3D session paused. Refresh or close tab to exit.');
    });
  }

  show() {
    this.root.style.display = 'flex';
    const creditsEl = this.root.querySelector('#menu-credits');
    if (creditsEl) creditsEl.textContent = `$${this.gameState.credits.toLocaleString()}`;
    const carEl = this.root.querySelector('#menu-current-car');
    if (carEl) carEl.textContent = this.gameState.selectedVehicleId.replace('_', ' ').toUpperCase();
  }

  hide() {
    this.root.style.display = 'none';
  }
}
