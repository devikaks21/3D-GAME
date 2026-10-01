/**
 * Dedicated Driving School User Interface
 * Renders the main Driving School Menu with [Practice], [Road Test], [Course Test], [Parking Test]
 * and the interactive in-game Instructor Tutor HUD for Practice Mode.
 */
export class DrivingSchoolUI {
  constructor(container, audioManager, onModeSelected, onSkillSelected, onResetVehicle) {
    this.container = container;
    this.audio = audioManager;
    this.onModeSelected = onModeSelected;
    this.onSkillSelected = onSkillSelected;
    this.onResetVehicle = onResetVehicle;

    this.root = null;
    this.menuModal = null;
    this.practiceTutorBar = null;

    this.init();
  }

  init() {
    this.root = document.createElement('div');
    this.root.id = 'driving-school-ui-root';
    this.root.innerHTML = `
      <!-- Dedicated Driving School Selection Modal -->
      <div class="modal-backdrop" id="driving-school-menu-modal" style="display: none;">
        <div class="modal-dialog glass-panel driving-school-dialog">
          <!-- Header -->
          <div class="modal-header">
            <div>
              <span class="brand-badge"><span class="pulse-dot"></span> MOTORING ACADEMY</span>
              <h2 class="modal-title school-title">DRIVING SCHOOL</h2>
              <p class="modal-subtitle">Master core vehicle dynamics, road safety regulations, and precision maneuvering.</p>
            </div>
            <button class="modal-close-btn" id="btn-close-school-menu">✕</button>
          </div>

          <!-- 4 Core Mode Cards as specified in requirements -->
          <div class="modes-grid school-modes-grid">
            <!-- 1. PRACTICE -->
            <div class="mode-card school-card practice-card" id="card-school-practice" data-submode="PRACTICE">
              <div class="mode-card-header">
                <span class="mode-icon">🎓</span>
                <span class="mode-badge badge-practice">LEARNING & SKILLS</span>
              </div>
              <h3 class="mode-title">PRACTICE</h3>
              <p class="mode-desc">
                Learn vehicle fundamentals at your own pace:
                <strong>Steering, Braking, Turning, Parking, Indicators, Reversing & Gear control</strong>.
                No strict score required!
              </p>
              <div class="school-features-tag">7 INTERACTIVE SKILL MODULES</div>
              <button class="mode-select-btn practice-btn">ENTER PRACTICE</button>
            </div>

            <!-- 2. ROAD TEST -->
            <div class="mode-card school-card" id="card-school-roadtest" data-submode="ROAD_TEST">
              <div class="mode-card-header">
                <span class="mode-icon">📋</span>
                <span class="mode-badge badge-license">OFFICIAL LICENSE</span>
              </div>
              <h3 class="mode-title">ROAD TEST</h3>
              <p class="mode-desc">
                Drive the official city road test route through live traffic.
                Obey traffic lights, observe speed limits (max 65 km/h), and avoid collisions.
              </p>
              <div class="school-features-tag">CITY TRAFFIC NAVIGATION</div>
              <button class="mode-select-btn">START ROAD TEST</button>
            </div>

            <!-- 3. COURSE TEST -->
            <div class="mode-card school-card" id="card-school-coursetest" data-submode="COURSE_TEST">
              <div class="mode-card-header">
                <span class="mode-icon">⏱️</span>
                <span class="mode-badge badge-slalom">CHICANE & AGILITY</span>
              </div>
              <h3 class="mode-title">COURSE TEST</h3>
              <p class="mode-desc">
                High-speed vehicle agility challenge. Negotiate tight technical slalom gates
                and urban chicanes against the clock.
              </p>
              <div class="school-features-tag">PRECISION SLALOM TIME ATTACK</div>
              <button class="mode-select-btn">ENTER COURSE TEST</button>
            </div>

            <!-- 4. PARKING TEST -->
            <div class="mode-card school-card" id="card-school-parkingtest" data-submode="PARKING_TEST">
              <div class="mode-card-header">
                <span class="mode-icon">🅿️</span>
                <span class="mode-badge badge-parking">PRECISION PARKING</span>
              </div>
              <h3 class="mode-title">PARKING TEST</h3>
              <p class="mode-desc">
                Test precision bay parking, reverse stall maneuvering, and tight parallel parking
                between cones and curbs without contact.
              </p>
              <div class="school-features-tag">3 PRECISION PARKING STALLS</div>
              <button class="mode-select-btn">START PARKING TEST</button>
            </div>
          </div>
        </div>
      </div>

      <!-- In-Game Practice Mode Instructor Tutor Overlay -->
      <div class="practice-tutor-overlay glass-panel" id="practice-tutor-overlay" style="display: none;">
        <div class="tutor-header-row">
          <div class="tutor-title-box">
            <span class="tutor-badge">DRIVING INSTRUCTOR TUTOR</span>
            <span class="tutor-active-skill" id="tutor-active-skill">PRACTICE: STEERING</span>
          </div>
          <div class="tutor-actions">
            <button class="tutor-btn-action" id="btn-tutor-reset-car" title="Reset Car to Skill Zone ([R])">↺ RESET [R]</button>
            <button class="tutor-btn-action" id="btn-tutor-school-menu">🎓 SCHOOL MENU</button>
          </div>
        </div>

        <!-- Tutor Live Guidance Message -->
        <div class="tutor-prompt-box" id="tutor-prompt-box">
          <span class="tutor-icon">💡</span>
          <span class="tutor-instruction-text" id="tutor-instruction-text">
            Use [A] and [D] (or Left/Right keys) to weave through the slalom gates.
          </span>
        </div>

        <!-- 7 Skills Selector Bar & Mastery Checklist -->
        <div class="tutor-skills-bar" id="tutor-skills-bar">
          <button class="skill-tab active" data-skill="steering" id="tab-skill-steering">
            <span class="skill-tab-icon">🔄</span>
            <span class="skill-tab-name">STEERING</span>
            <span class="skill-status-badge" id="badge-skill-steering">READY</span>
          </button>
          <button class="skill-tab" data-skill="braking" id="tab-skill-braking">
            <span class="skill-tab-icon">🛑</span>
            <span class="skill-tab-name">BRAKING</span>
            <span class="skill-status-badge" id="badge-skill-braking">READY</span>
          </button>
          <button class="skill-tab" data-skill="turning" id="tab-skill-turning">
            <span class="skill-tab-icon">🎯</span>
            <span class="skill-tab-name">TURNING</span>
            <span class="skill-status-badge" id="badge-skill-turning">READY</span>
          </button>
          <button class="skill-tab" data-skill="parking" id="tab-skill-parking">
            <span class="skill-tab-icon">🅿️</span>
            <span class="skill-tab-name">PARKING</span>
            <span class="skill-status-badge" id="badge-skill-parking">READY</span>
          </button>
          <button class="skill-tab" data-skill="indicators" id="tab-skill-indicators">
            <span class="skill-tab-icon">💡</span>
            <span class="skill-tab-name">INDICATORS</span>
            <span class="skill-status-badge" id="badge-skill-indicators">READY</span>
          </button>
          <button class="skill-tab" data-skill="reversing" id="tab-skill-reversing">
            <span class="skill-tab-icon">🔙</span>
            <span class="skill-tab-name">REVERSING</span>
            <span class="skill-status-badge" id="badge-skill-reversing">READY</span>
          </button>
          <button class="skill-tab" data-skill="gear_control" id="tab-skill-gear_control">
            <span class="skill-tab-icon">⚙️</span>
            <span class="skill-tab-name">GEAR CONTROL</span>
            <span class="skill-status-badge" id="badge-skill-gear_control">READY</span>
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(this.root);
    this.menuModal = this.root.querySelector('#driving-school-menu-modal');
    this.practiceTutorBar = this.root.querySelector('#practice-tutor-overlay');

    this.bindEvents();
  }

  bindEvents() {
    const closeBtn = this.root.querySelector('#btn-close-school-menu');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.audio?.playUIClick();
        this.hideMenu();
      });
    }

    // Bind Mode Cards
    const cards = this.root.querySelectorAll('.school-card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => this.audio?.playUIHover());
      card.addEventListener('click', () => {
        const subMode = card.dataset.submode;
        this.audio?.playUIClick();
        this.hideMenu();
        if (this.onModeSelected) {
          this.onModeSelected(subMode);
        }
      });
    });

    // Skill Tabs in Tutor Overlay
    const skillTabs = this.root.querySelectorAll('.skill-tab');
    skillTabs.forEach(tab => {
      tab.addEventListener('mouseenter', () => this.audio?.playUIHover());
      tab.addEventListener('click', () => {
        const skill = tab.dataset.skill;
        this.audio?.playUIClick();
        this.setActiveSkillTab(skill);
        if (this.onSkillSelected) {
          this.onSkillSelected(skill);
        }
      });
    });

    // Tutor Overlay Action Buttons
    const resetBtn = this.root.querySelector('#btn-tutor-reset-car');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.audio?.playUIClick();
        if (this.onResetVehicle) {
          this.onResetVehicle();
        }
      });
    }

    const schoolMenuBtn = this.root.querySelector('#btn-tutor-school-menu');
    if (schoolMenuBtn) {
      schoolMenuBtn.addEventListener('click', () => {
        this.audio?.playUIClick();
        this.showMenu();
      });
    }
  }

  showMenu() {
    if (this.menuModal) {
      this.menuModal.style.display = 'flex';
    }
  }

  hideMenu() {
    if (this.menuModal) {
      this.menuModal.style.display = 'none';
    }
  }

  showTutor() {
    if (this.practiceTutorBar) {
      this.practiceTutorBar.style.display = 'flex';
    }
  }

  hideTutor() {
    if (this.practiceTutorBar) {
      this.practiceTutorBar.style.display = 'none';
    }
  }

  setActiveSkillTab(skill) {
    const tabs = this.root.querySelectorAll('.skill-tab');
    tabs.forEach(t => {
      if (t.dataset.skill === skill) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    const titleEl = this.root.querySelector('#tutor-active-skill');
    if (titleEl) {
      titleEl.textContent = `PRACTICE: ${skill.replace('_', ' ').toUpperCase()}`;
    }
  }

  /**
   * Update live tutor instructions and checklist
   */
  updatePracticeTelemetry(data) {
    if (!data) return;

    if (data.activeSkill) {
      this.setActiveSkillTab(data.activeSkill);
    }

    const textEl = this.root.querySelector('#tutor-instruction-text');
    if (textEl && data.tutorMessage) {
      textEl.textContent = data.tutorMessage;
    }

    const promptBox = this.root.querySelector('#tutor-prompt-box');
    if (promptBox) {
      if (data.tutorStatus === 'success') {
        promptBox.classList.add('prompt-success');
      } else {
        promptBox.classList.remove('prompt-success');
      }
    }

    // Update Skill Mastery Badges
    const masteredList = Array.isArray(data.masteredSkills) ? data.masteredSkills : [];
    const allSkills = ['steering', 'braking', 'turning', 'parking', 'indicators', 'reversing', 'gear_control'];

    allSkills.forEach(skill => {
      const badge = this.root.querySelector(`#badge-skill-${skill}`);
      const tab = this.root.querySelector(`#tab-skill-${skill}`);
      if (badge && tab) {
        if (masteredList.includes(skill)) {
          badge.textContent = '✓ MASTERED';
          badge.className = 'skill-status-badge badge-mastered';
          tab.classList.add('tab-mastered');
        } else {
          badge.textContent = skill === data.activeSkill ? 'ACTIVE' : 'READY';
          badge.className = 'skill-status-badge badge-ready';
          tab.classList.remove('tab-mastered');
        }
      }
    });
  }
}
