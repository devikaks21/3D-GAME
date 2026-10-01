import { VEHICLE_CATALOG } from '../vehicle/VehicleManager.js';
import { ColorPalettes } from '../vehicle/VehicleCustomization.js';
import { GameStates } from '../core/GameState.js';

/**
 * Automotive Garage & Vehicle Customization UI
 * Supports:
 * 1. Vehicle Colour: Stepper [ ◀ ] COLOR [ ▶ ] + visual swatches
 * 2. Wheel Appearance: Stepper [ ◀ ] FINISH [ ▶ ] + alloy swatches (where supported)
 * 3. Ride Height: Slider LOW ─────●──── HIGH (where supported)
 * 4. Handling Setting: Slider STABLE ───●─── SPORT (where supported)
 * 5. Drive Configuration: Toggle buttons FWD / RWD / AWD / 4WD (where supported)
 * Only enables options supported by the selected vehicle platform.
 */
export class GarageUI {
  constructor(container, gameState, vehicleManager, audioManager, onDrive) {
    this.container = container;
    this.gameState = gameState;
    this.vehicleManager = vehicleManager;
    this.audio = audioManager;
    this.onDrive = onDrive;

    this.root = null;
    this.selectedId = gameState.selectedVehicleId || 'apex_r';
    this.init();
  }

  init() {
    this.root = document.createElement('div');
    this.root.className = 'garage-overlay cinematic-overlay';
    this.root.id = 'garage-root';
    this.root.style.display = 'none';

    this.root.innerHTML = `
      <header class="garage-header">
        <button class="back-btn glass-btn" id="garage-back-btn">◀ MAIN MENU</button>
        <div class="garage-title-wrap">
          <span class="brand-badge">ATELIER & TUNING STUDIO</span>
          <h2 class="garage-title">GARAGE CUSTOMIZATION</h2>
        </div>
        <div class="garage-credits-badge" id="garage-credits">$15,000</div>
      </header>

      <div class="garage-main-layout">
        <!-- Left: Vehicle Selection Carousel & Stats -->
        <aside class="garage-left-panel glass-panel">
          <div class="panel-section-title">SELECT VEHICLE</div>
          <div class="vehicle-tabs" id="vehicle-tabs-container"></div>

          <div class="vehicle-specs-card" id="vehicle-specs-card">
            <h3 class="active-car-name" id="g-car-name">APEX R</h3>
            <div class="active-car-cat" id="g-car-cat">Supercar</div>
            <p class="active-car-desc" id="g-car-desc"></p>

            <div class="stat-bars-list">
              <div class="stat-row">
                <span class="stat-name">TOP SPEED</span>
                <div class="stat-bar-track"><div class="stat-bar-fill" id="stat-speed"></div></div>
                <span class="stat-val" id="spec-speed">310 km/h</span>
              </div>
              <div class="stat-row">
                <span class="stat-name">ACCELERATION</span>
                <div class="stat-bar-track"><div class="stat-bar-fill" id="stat-accel"></div></div>
                <span class="stat-val" id="spec-accel">9.2/10</span>
              </div>
              <div class="stat-row">
                <span class="stat-name">HANDLING</span>
                <div class="stat-bar-track"><div class="stat-bar-fill" id="stat-handling"></div></div>
                <span class="stat-val" id="spec-handling">8.6/10</span>
              </div>
              <div class="stat-row">
                <span class="stat-name">BRAKING</span>
                <div class="stat-bar-track"><div class="stat-bar-fill" id="stat-braking"></div></div>
                <span class="stat-val" id="spec-braking">8.8/10</span>
              </div>
              <div class="stat-row stat-badge-row">
                <div class="stat-badge-col">
                  <span class="stat-name">DRIVE TYPE</span>
                  <span class="stat-badge" id="spec-drive">AWD</span>
                </div>
                <div class="stat-badge-col">
                  <span class="stat-name">WEIGHT</span>
                  <span class="stat-badge" id="spec-weight">1,380 kg</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- Right: Customization Studio -->
        <aside class="garage-right-panel glass-panel">
          <div class="panel-section-title">CUSTOMIZATION</div>

          <!-- 1. VEHICLE COLOUR -->
          <div class="custom-block" id="custom-block-colour">
            <div class="custom-header-row">
              <label class="custom-label">COLOUR</label>
              <span class="custom-support-badge badge-supported">SUPPORTED</span>
            </div>
            <div class="custom-stepper-row">
              <button class="stepper-arrow-btn" id="btn-col-prev" title="Previous Colour">◀</button>
              <div class="stepper-val-wrap">
                <span class="stepper-color-dot" id="custom-col-dot"></span>
                <span class="stepper-display-val" id="custom-col-name">CRIMSON RED</span>
              </div>
              <button class="stepper-arrow-btn" id="btn-col-next" title="Next Colour">▶</button>
            </div>
            <div class="color-swatches-grid" id="paint-swatches"></div>
          </div>

          <!-- 2. WHEEL APPEARANCE (WHERE SUPPORTED) -->
          <div class="custom-block" id="custom-block-wheels">
            <div class="custom-header-row">
              <label class="custom-label">WHEEL APPEARANCE</label>
              <span class="custom-support-badge" id="wheel-support-badge">SUPPORTED</span>
            </div>
            <div class="custom-stepper-row" id="wheel-stepper-row">
              <button class="stepper-arrow-btn" id="btn-rim-prev" title="Previous Wheel Finish">◀</button>
              <div class="stepper-val-wrap">
                <span class="stepper-color-dot" id="custom-rim-dot"></span>
                <span class="stepper-display-val" id="custom-rim-name">GLOSS BLACK</span>
              </div>
              <button class="stepper-arrow-btn" id="btn-rim-next" title="Next Wheel Finish">▶</button>
            </div>
            <div class="color-swatches-grid" id="rim-swatches"></div>
            <div class="unsupported-msg" id="wheel-unsupported-msg" style="display:none;"></div>
          </div>

          <!-- 3. RIDE HEIGHT (WHERE SUPPORTED) -->
          <div class="custom-block" id="custom-block-height">
            <div class="custom-header-row">
              <label class="custom-label">HEIGHT</label>
              <span class="custom-support-badge" id="height-support-badge">SUPPORTED</span>
            </div>
            <div class="slider-control-row">
              <span class="slider-boundary-label">LOW</span>
              <div class="slider-track-wrap">
                <input type="range" class="custom-range-slider" id="ride-height-slider" min="-0.04" max="0.04" step="0.005" value="0">
              </div>
              <span class="slider-boundary-label">HIGH</span>
            </div>
            <div class="slider-val-readout" id="ride-height-val">STANDARD (0 mm)</div>
            <div class="unsupported-msg" id="height-unsupported-msg" style="display:none;"></div>
          </div>

          <!-- 4. HANDLING SETTING (WHERE SUPPORTED) -->
          <div class="custom-block" id="custom-block-handling">
            <div class="custom-header-row">
              <label class="custom-label">HANDLING</label>
              <span class="custom-support-badge" id="handling-support-badge">SUPPORTED</span>
            </div>
            <div class="slider-control-row">
              <span class="slider-boundary-label">STABLE</span>
              <div class="slider-track-wrap">
                <input type="range" class="custom-range-slider" id="handling-slider" min="0" max="1" step="0.05" value="0.5">
              </div>
              <span class="slider-boundary-label">SPORT</span>
            </div>
            <div class="slider-val-readout" id="handling-val">BALANCED (TRACK BIAS 50%)</div>
          </div>

          <!-- 5. DRIVE CONFIGURATION (WHERE SUPPORTED) -->
          <div class="custom-block" id="custom-block-drive">
            <div class="custom-header-row">
              <label class="custom-label">DRIVE</label>
              <span class="custom-support-badge" id="drive-support-badge">SUPPORTED</span>
            </div>
            <div class="drive-toggle-group" id="drive-toggle-group">
              <button class="drive-toggle-btn" id="btn-drive-fwd" data-drive="FWD">FWD</button>
              <button class="drive-toggle-btn" id="btn-drive-rwd" data-drive="RWD">RWD</button>
              <button class="drive-toggle-btn" id="btn-drive-awd" data-drive="AWD">AWD</button>
              <button class="drive-toggle-btn" id="btn-drive-4wd" data-drive="4WD">4WD</button>
            </div>
            <div class="unsupported-msg" id="drive-unsupported-msg" style="display:none;"></div>
          </div>

          <!-- Additional Detailing: Brake Calipers & Neon Underglow -->
          <div class="custom-accordion-section">
            <div class="custom-block">
              <label class="custom-label">BRAKE CALIPERS</label>
              <div class="color-swatches-grid" id="caliper-swatches"></div>
            </div>

            <div class="custom-block">
              <label class="custom-label">NEON UNDERGLOW</label>
              <div class="color-swatches-grid" id="underglow-swatches"></div>
            </div>
          </div>

          <!-- Vehicle Mechanics Interactive Test -->
          <div class="custom-block mechanics-test-block">
            <label class="custom-label">VEHICLE MECHANICS TEST</label>
            <div class="mechanics-btns-grid">
              <button class="mech-btn glass-btn" id="btn-g-doors">DOORS</button>
              <button class="mech-btn glass-btn" id="btn-g-trunk">BOOT</button>
              <button class="mech-btn glass-btn" id="btn-g-roof">ROOF</button>
              <button class="mech-btn glass-btn" id="btn-g-lights">HEADLIGHTS</button>
            </div>
          </div>
        </aside>
      </div>

      <!-- Bottom Bar: Drive CTA -->
      <footer class="garage-footer">
        <button class="drive-cta-btn" id="garage-drive-btn">
          <span>DRIVE MACHINE</span> ➔
        </button>
      </footer>
    `;

    this.container.appendChild(this.root);
    this.buildVehicleTabs();
    this.buildColorPickers();
    this.bindEvents();
  }

  buildVehicleTabs() {
    const container = this.root.querySelector('#vehicle-tabs-container');
    container.innerHTML = '';

    VEHICLE_CATALOG.forEach(car => {
      const btn = document.createElement('button');
      btn.className = `vehicle-tab-btn ${car.id === this.selectedId ? 'active' : ''}`;
      btn.innerHTML = `
        <span class="v-tab-name">${car.name}</span>
        <span class="v-tab-cat">${car.category}</span>
      `;
      btn.addEventListener('click', () => {
        this.selectedId = car.id;
        this.gameState.selectVehicle(car.id);
        this.audio.playUIClick();
        this.updateActiveCar(car.id);
      });
      container.appendChild(btn);
    });
  }

  buildColorPickers() {
    const custom = this.vehicleManager.customization;

    // 1. Paint Swatches
    const paintContainer = this.root.querySelector('#paint-swatches');
    paintContainer.innerHTML = '';
    ColorPalettes.paint.forEach((c, idx) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = '#' + c.hex.toString(16).padStart(6, '0');
      swatch.title = c.name;
      swatch.addEventListener('click', () => {
        custom.setPaint(this.selectedId, c.hex, this.vehicleManager.getActiveVehicle(), idx);
        this.audio.playUIClick();
        this.updateCustomizationControls(this.selectedId);
      });
      paintContainer.appendChild(swatch);
    });

    // 2. Rim Swatches
    const rimContainer = this.root.querySelector('#rim-swatches');
    rimContainer.innerHTML = '';
    ColorPalettes.rims.forEach((c, idx) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = '#' + c.hex.toString(16).padStart(6, '0');
      swatch.title = c.name;
      swatch.addEventListener('click', () => {
        const car = VEHICLE_CATALOG.find(v => v.id === this.selectedId);
        if (car?.supportedCustomization && !car.supportedCustomization.wheelAppearance) return;
        custom.setRims(this.selectedId, c.hex, this.vehicleManager.getActiveVehicle(), idx);
        this.audio.playUIClick();
        this.updateCustomizationControls(this.selectedId);
      });
      rimContainer.appendChild(swatch);
    });

    // 3. Caliper Swatches
    const calContainer = this.root.querySelector('#caliper-swatches');
    calContainer.innerHTML = '';
    ColorPalettes.calipers.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = '#' + c.hex.toString(16).padStart(6, '0');
      swatch.title = c.name;
      swatch.addEventListener('click', () => {
        custom.setCalipers(this.selectedId, c.hex, this.vehicleManager.getActiveVehicle());
        this.audio.playUIClick();
      });
      calContainer.appendChild(swatch);
    });

    // 4. Underglow Swatches
    const underglowContainer = this.root.querySelector('#underglow-swatches');
    underglowContainer.innerHTML = '';
    ColorPalettes.underglow.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = c.hex === 0 ? '#222' : '#' + c.hex.toString(16).padStart(6, '0');
      swatch.title = c.name;
      swatch.addEventListener('click', () => {
        custom.setUnderglow(this.selectedId, c, this.vehicleManager.getActiveVehicle());
        this.audio.playUIClick();
      });
      underglowContainer.appendChild(swatch);
    });
  }

  updateActiveCar(carId) {
    const car = VEHICLE_CATALOG.find(v => v.id === carId);
    if (!car) return;

    // Respawn vehicle in showroom
    this.vehicleManager.spawnVehicle(carId, 0, 0.4, 0, 0);

    // Update UI highlights
    this.root.querySelectorAll('.vehicle-tab-btn').forEach((b, idx) => {
      b.classList.toggle('active', VEHICLE_CATALOG[idx].id === carId);
    });

    this.root.querySelector('#g-car-name').textContent = car.name.toUpperCase();
    this.root.querySelector('#g-car-cat').textContent = car.category;
    this.root.querySelector('#g-car-desc').textContent = car.description;

    const dStats = car.displayStats || car.specs;
    this.root.querySelector('#stat-speed').style.width = `${car.stats.speed}%`;
    this.root.querySelector('#stat-accel').style.width = `${car.stats.acceleration}%`;
    this.root.querySelector('#stat-handling').style.width = `${car.stats.handling}%`;
    this.root.querySelector('#stat-braking').style.width = `${car.stats.braking}%`;

    this.root.querySelector('#spec-speed').textContent = dStats.topSpeed;
    this.root.querySelector('#spec-accel').textContent = dStats.acceleration;
    this.root.querySelector('#spec-handling').textContent = dStats.handling;
    this.root.querySelector('#spec-braking').textContent = dStats.braking;
    this.root.querySelector('#spec-weight').textContent = dStats.weight;

    const isConvertible = (car.id === 'aero_roadster' || car.id === 'venom_spyder');
    const roofBtn = this.root.querySelector('#btn-g-roof');
    if (roofBtn) {
      roofBtn.style.display = isConvertible ? 'inline-block' : 'none';
      roofBtn.textContent = 'ROOF';
    }

    const hasBoot = car.id !== 'formula_r';
    const trunkBtn = this.root.querySelector('#btn-g-trunk');
    if (trunkBtn) {
      trunkBtn.style.display = hasBoot ? 'inline-block' : 'none';
      trunkBtn.textContent = 'BOOT';
    }

    // Synchronize all customization controls with vehicle platform support
    this.updateCustomizationControls(carId);
  }

  updateCustomizationControls(carId) {
    const car = VEHICLE_CATALOG.find(v => v.id === carId);
    if (!car) return;

    const supp = car.supportedCustomization || {
      colour: true,
      wheelAppearance: true,
      rideHeight: true,
      handling: true,
      driveConfig: true,
      allowedDrives: ['FWD', 'RWD', 'AWD', '4WD']
    };

    const custom = this.vehicleManager.customization;
    const cfg = custom.get(carId);

    // 1. VEHICLE COLOUR
    const paintIdx = cfg.paintIndex !== undefined ? cfg.paintIndex : 0;
    const currentPaint = ColorPalettes.paint[paintIdx] || ColorPalettes.paint[0];
    const colNameEl = this.root.querySelector('#custom-col-name');
    const colDotEl = this.root.querySelector('#custom-col-dot');
    if (colNameEl) colNameEl.textContent = currentPaint.name.toUpperCase();
    if (colDotEl) colDotEl.style.backgroundColor = '#' + currentPaint.hex.toString(16).padStart(6, '0');

    // Highlight active paint swatch
    this.root.querySelectorAll('#paint-swatches .color-swatch').forEach((s, idx) => {
      s.classList.toggle('active-swatch', idx === paintIdx);
    });

    // 2. WHEEL APPEARANCE (WHERE SUPPORTED)
    const wheelBlock = this.root.querySelector('#custom-block-wheels');
    const wheelBadge = this.root.querySelector('#wheel-support-badge');
    const btnRimPrev = this.root.querySelector('#btn-rim-prev');
    const btnRimNext = this.root.querySelector('#btn-rim-next');
    const rimNameEl = this.root.querySelector('#custom-rim-name');
    const rimDotEl = this.root.querySelector('#custom-rim-dot');
    const wheelMsgEl = this.root.querySelector('#wheel-unsupported-msg');
    const rimSwatchesContainer = this.root.querySelector('#rim-swatches');

    if (supp.wheelAppearance) {
      wheelBlock.classList.remove('is-unsupported');
      wheelBadge.className = 'custom-support-badge badge-supported';
      wheelBadge.textContent = 'SUPPORTED';
      btnRimPrev.disabled = false;
      btnRimNext.disabled = false;
      wheelMsgEl.style.display = 'none';
      rimSwatchesContainer.style.opacity = '1';
      rimSwatchesContainer.style.pointerEvents = 'auto';

      const rimIdx = cfg.rimIndex !== undefined ? cfg.rimIndex : 0;
      const currentRim = ColorPalettes.rims[rimIdx] || ColorPalettes.rims[0];
      if (rimNameEl) rimNameEl.textContent = currentRim.name.toUpperCase();
      if (rimDotEl) rimDotEl.style.backgroundColor = '#' + currentRim.hex.toString(16).padStart(6, '0');

      this.root.querySelectorAll('#rim-swatches .color-swatch').forEach((s, idx) => {
        s.classList.toggle('active-swatch', idx === rimIdx);
      });
    } else {
      wheelBlock.classList.add('is-unsupported');
      wheelBadge.className = 'custom-support-badge badge-locked';
      wheelBadge.textContent = 'LOCKED';
      btnRimPrev.disabled = true;
      btnRimNext.disabled = true;
      if (rimNameEl) rimNameEl.textContent = 'FIA SPEC MAGNESIUM';
      if (rimDotEl) rimDotEl.style.backgroundColor = '#444';
      wheelMsgEl.textContent = supp.wheelLockReason || 'Single-spec center-lock wheels locked by regulation';
      wheelMsgEl.style.display = 'block';
      rimSwatchesContainer.style.opacity = '0.35';
      rimSwatchesContainer.style.pointerEvents = 'none';
    }

    // 3. RIDE HEIGHT (WHERE SUPPORTED)
    const heightBlock = this.root.querySelector('#custom-block-height');
    const heightBadge = this.root.querySelector('#height-support-badge');
    const heightSlider = this.root.querySelector('#ride-height-slider');
    const heightValEl = this.root.querySelector('#ride-height-val');
    const heightMsgEl = this.root.querySelector('#height-unsupported-msg');

    if (supp.rideHeight) {
      heightBlock.classList.remove('is-unsupported');
      heightBadge.className = 'custom-support-badge badge-supported';
      heightBadge.textContent = 'SUPPORTED';
      heightSlider.disabled = false;
      heightMsgEl.style.display = 'none';

      const offset = cfg.rideHeightOffset || 0;
      heightSlider.value = offset;
      const mm = Math.round(offset * 1000);
      if (mm === 0) {
        heightValEl.textContent = 'STANDARD (0 mm)';
      } else if (mm < 0) {
        heightValEl.textContent = `SLAMMED (${mm} mm) ── SPORT STANCE`;
      } else {
        heightValEl.textContent = `LIFTED (+${mm} mm) ── ROUGH TERRAIN`;
      }
    } else {
      heightBlock.classList.add('is-unsupported');
      heightBadge.className = 'custom-support-badge badge-locked';
      heightBadge.textContent = 'LOCKED';
      heightSlider.disabled = true;
      heightSlider.value = 0;
      heightValEl.textContent = 'GROUND EFFECT HOMOLOGATION FIXED (0 mm)';
      heightMsgEl.textContent = supp.heightLockReason || 'Aero ground effect skirt height locked by FIA homologation';
      heightMsgEl.style.display = 'block';
    }

    // 4. HANDLING SETTING (WHERE SUPPORTED)
    const handlingBlock = this.root.querySelector('#custom-block-handling');
    const handlingBadge = this.root.querySelector('#handling-support-badge');
    const handlingSlider = this.root.querySelector('#handling-slider');
    const handlingValEl = this.root.querySelector('#handling-val');

    if (supp.handling) {
      handlingBlock.classList.remove('is-unsupported');
      handlingBadge.className = 'custom-support-badge badge-supported';
      handlingBadge.textContent = 'SUPPORTED';
      handlingSlider.disabled = false;

      const ratio = cfg.handlingRatio !== undefined ? cfg.handlingRatio : 0.5;
      handlingSlider.value = ratio;
      if (ratio < 0.35) {
        handlingValEl.textContent = `STABLE ── MAXIMUM LATERAL GRIP & DOWNFORCE (${Math.round((1 - ratio) * 100)}%)`;
      } else if (ratio > 0.65) {
        handlingValEl.textContent = `SPORT ── RAZOR TURN-IN & TRACK DRIFT CONTROL (${Math.round(ratio * 100)}%)`;
      } else {
        handlingValEl.textContent = 'BALANCED ── OPTIMAL TOURING POISE';
      }
    } else {
      handlingBlock.classList.add('is-unsupported');
      handlingBadge.className = 'custom-support-badge badge-locked';
      handlingBadge.textContent = 'LOCKED';
      handlingSlider.disabled = true;
      handlingValEl.textContent = 'FACTORY FIXED HANDLING';
    }

    // 5. DRIVE CONFIGURATION (WHERE SUPPORTED)
    const driveBlock = this.root.querySelector('#custom-block-drive');
    const driveBadge = this.root.querySelector('#drive-support-badge');
    const driveMsgEl = this.root.querySelector('#drive-unsupported-msg');
    const allowedDrives = supp.allowedDrives || ['FWD', 'RWD', 'AWD', '4WD'];
    const activeDrive = cfg.driveType || car.driveType;

    // Update spec badge on left panel
    const specDriveEl = this.root.querySelector('#spec-drive');
    if (specDriveEl) specDriveEl.textContent = activeDrive;

    const driveBtns = this.root.querySelectorAll('.drive-toggle-btn');
    driveBtns.forEach(btn => {
      const type = btn.getAttribute('data-drive');
      const isAllowed = allowedDrives.includes(type);
      const isSelected = activeDrive === type;

      btn.classList.toggle('active', isSelected);

      if (supp.driveConfig) {
        if (isAllowed) {
          btn.disabled = false;
          btn.classList.remove('is-locked-btn');
          btn.title = `Switch to ${type} drivetrain`;
        } else {
          btn.disabled = true;
          btn.classList.add('is-locked-btn');
          btn.title = `Chassis does not support ${type} drivetrain`;
        }
      } else {
        // Platform is completely drive locked
        if (isSelected) {
          btn.disabled = false;
          btn.classList.remove('is-locked-btn');
          btn.title = `Factory Locked ${type}`;
        } else {
          btn.disabled = true;
          btn.classList.add('is-locked-btn');
          btn.title = `Locked: Platform only supports ${activeDrive}`;
        }
      }
    });

    if (supp.driveConfig) {
      driveBlock.classList.remove('is-unsupported');
      driveBadge.className = 'custom-support-badge badge-supported';
      driveBadge.textContent = 'CONFIGURABLE';
      driveMsgEl.style.display = 'none';
    } else {
      driveBlock.classList.add('is-unsupported');
      driveBadge.className = 'custom-support-badge badge-locked';
      driveBadge.textContent = 'PLATFORM LOCKED';
      driveMsgEl.textContent = supp.driveLockReason || `Dedicated ${activeDrive} architecture (locked)`;
      driveMsgEl.style.display = 'block';
    }
  }

  bindEvents() {
    this.root.querySelector('#garage-back-btn').addEventListener('click', () => {
      this.audio.playUIClick();
      this.gameState.setState(GameStates.MENU);
    });

    this.root.querySelector('#garage-drive-btn').addEventListener('click', () => {
      this.audio.playUIClick();
      this.onDrive();
    });

    const custom = this.vehicleManager.customization;

    // 1. Colour Steppers [ ◀ ] [ ▶ ]
    this.root.querySelector('#btn-col-prev').addEventListener('click', () => {
      this.audio.playUIClick();
      const cfg = custom.get(this.selectedId);
      const currentIdx = cfg.paintIndex !== undefined ? cfg.paintIndex : 0;
      const newIdx = (currentIdx - 1 + ColorPalettes.paint.length) % ColorPalettes.paint.length;
      custom.setPaint(this.selectedId, ColorPalettes.paint[newIdx].hex, this.vehicleManager.getActiveVehicle(), newIdx);
      this.updateCustomizationControls(this.selectedId);
    });

    this.root.querySelector('#btn-col-next').addEventListener('click', () => {
      this.audio.playUIClick();
      const cfg = custom.get(this.selectedId);
      const currentIdx = cfg.paintIndex !== undefined ? cfg.paintIndex : 0;
      const newIdx = (currentIdx + 1) % ColorPalettes.paint.length;
      custom.setPaint(this.selectedId, ColorPalettes.paint[newIdx].hex, this.vehicleManager.getActiveVehicle(), newIdx);
      this.updateCustomizationControls(this.selectedId);
    });

    // 2. Wheel Appearance Steppers [ ◀ ] [ ▶ ] (where supported)
    this.root.querySelector('#btn-rim-prev').addEventListener('click', () => {
      const car = VEHICLE_CATALOG.find(v => v.id === this.selectedId);
      if (car?.supportedCustomization && !car.supportedCustomization.wheelAppearance) return;

      this.audio.playUIClick();
      const cfg = custom.get(this.selectedId);
      const currentIdx = cfg.rimIndex !== undefined ? cfg.rimIndex : 0;
      const newIdx = (currentIdx - 1 + ColorPalettes.rims.length) % ColorPalettes.rims.length;
      custom.setRims(this.selectedId, ColorPalettes.rims[newIdx].hex, this.vehicleManager.getActiveVehicle(), newIdx);
      this.updateCustomizationControls(this.selectedId);
    });

    this.root.querySelector('#btn-rim-next').addEventListener('click', () => {
      const car = VEHICLE_CATALOG.find(v => v.id === this.selectedId);
      if (car?.supportedCustomization && !car.supportedCustomization.wheelAppearance) return;

      this.audio.playUIClick();
      const cfg = custom.get(this.selectedId);
      const currentIdx = cfg.rimIndex !== undefined ? cfg.rimIndex : 0;
      const newIdx = (currentIdx + 1) % ColorPalettes.rims.length;
      custom.setRims(this.selectedId, ColorPalettes.rims[newIdx].hex, this.vehicleManager.getActiveVehicle(), newIdx);
      this.updateCustomizationControls(this.selectedId);
    });

    // 3. Ride Height Slider (where supported)
    const heightSlider = this.root.querySelector('#ride-height-slider');
    heightSlider.addEventListener('input', (e) => {
      const car = VEHICLE_CATALOG.find(v => v.id === this.selectedId);
      if (car?.supportedCustomization && !car.supportedCustomization.rideHeight) return;

      const offset = parseFloat(e.target.value);
      custom.setRideHeight(this.selectedId, offset, this.vehicleManager.getActiveVehicle());
      const mm = Math.round(offset * 1000);
      const valEl = this.root.querySelector('#ride-height-val');
      if (valEl) {
        if (mm === 0) valEl.textContent = 'STANDARD (0 mm)';
        else if (mm < 0) valEl.textContent = `SLAMMED (${mm} mm) ── SPORT STANCE`;
        else valEl.textContent = `LIFTED (+${mm} mm) ── ROUGH TERRAIN`;
      }
    });

    // 4. Handling Setting Slider (where supported)
    const handlingSlider = this.root.querySelector('#handling-slider');
    handlingSlider.addEventListener('input', (e) => {
      const car = VEHICLE_CATALOG.find(v => v.id === this.selectedId);
      if (car?.supportedCustomization && !car.supportedCustomization.handling) return;

      const ratio = parseFloat(e.target.value);
      custom.setHandling(this.selectedId, ratio, this.vehicleManager.getActiveVehicle());

      const valEl = this.root.querySelector('#handling-val');
      if (valEl) {
        if (ratio < 0.35) valEl.textContent = `STABLE ── MAXIMUM LATERAL GRIP & DOWNFORCE (${Math.round((1 - ratio) * 100)}%)`;
        else if (ratio > 0.65) valEl.textContent = `SPORT ── RAZOR TURN-IN & TRACK DRIFT CONTROL (${Math.round(ratio * 100)}%)`;
        else valEl.textContent = 'BALANCED ── OPTIMAL TOURING POISE';
      }

      // Live update handling stat on left panel
      const statHandlingBar = this.root.querySelector('#stat-handling');
      const specHandlingText = this.root.querySelector('#spec-handling');
      if (car) {
        const baseHandling = car.stats.handling;
        const adjusted = Math.min(99, Math.round(baseHandling + (ratio - 0.5) * 12));
        if (statHandlingBar) statHandlingBar.style.width = `${adjusted}%`;
        if (specHandlingText) specHandlingText.textContent = `${(adjusted / 10).toFixed(1)}/10`;
      }
    });

    // 5. Drive Configuration Buttons (where supported)
    const driveBtns = this.root.querySelectorAll('.drive-toggle-btn');
    driveBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const car = VEHICLE_CATALOG.find(v => v.id === this.selectedId);
        if (car?.supportedCustomization && !car.supportedCustomization.driveConfig) return;

        const driveType = btn.getAttribute('data-drive');
        const allowed = car?.supportedCustomization?.allowedDrives || ['FWD', 'RWD', 'AWD', '4WD'];
        if (!allowed.includes(driveType)) return;

        this.audio.playUIClick();
        custom.setDrive(this.selectedId, driveType, this.vehicleManager.getActiveVehicle());
        this.updateCustomizationControls(this.selectedId);
      });
    });

    // Mechanics test
    this.root.querySelector('#btn-g-doors').addEventListener('click', () => {
      const v = this.vehicleManager.getActiveVehicle();
      if (v) v.toggleDoors();
      this.audio.playUIClick();
    });

    this.root.querySelector('#btn-g-trunk').addEventListener('click', () => {
      const v = this.vehicleManager.getActiveVehicle();
      if (v && v.isBootSupported && v.isBootSupported()) {
        const isOpen = v.toggleBoot();
        const trunkBtn = this.root.querySelector('#btn-g-trunk');
        if (trunkBtn) trunkBtn.textContent = isOpen ? 'BOOT: OPEN' : 'BOOT: CLOSED';
        this.audio.playUIClick();
      }
    });

    this.root.querySelector('#btn-g-roof').addEventListener('click', () => {
      const v = this.vehicleManager.getActiveVehicle();
      if (v && v.isConvertible) {
        const isOpen = v.toggleRoof();
        const roofBtn = this.root.querySelector('#btn-g-roof');
        if (roofBtn) roofBtn.textContent = isOpen ? 'ROOF: OPEN' : 'ROOF: CLOSED';
        this.audio.playUIClick();
      }
    });

    this.root.querySelector('#btn-g-lights').addEventListener('click', () => {
      const v = this.vehicleManager.getActiveVehicle();
      if (v) v.toggleHeadlights();
      this.audio.playUIClick();
    });
  }

  show() {
    this.root.style.display = 'flex';
    this.selectedId = this.gameState.selectedVehicleId;
    this.updateActiveCar(this.selectedId);
    const creditsEl = this.root.querySelector('#garage-credits');
    if (creditsEl) creditsEl.textContent = `$${this.gameState.credits.toLocaleString()}`;
  }

  hide() {
    this.root.style.display = 'none';
  }
}
