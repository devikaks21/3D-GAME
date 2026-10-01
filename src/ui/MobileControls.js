/**
 * Mobile and Tablet On-Screen Touch Controls
 * 
 * Provides large, ergonomic touch targets for mobile/tablet driving:
 * 1. Left steering button
 * 2. Right steering button
 * 3. Accelerator
 * 4. Brake
 * 5. Handbrake
 * 6. Gear button
 * 7. Camera button
 * 8. Lights button
 * 
 * Multi-touch compatible, maintains full desktop keyboard coexistence.
 */
export class MobileControls {
  constructor(container, inputManager, audioManager, vehicleManager = null) {
    this.container = container;
    this.input = inputManager;
    this.audio = audioManager;
    this.vehicleManager = vehicleManager;

    this.root = null;
    this.isSteeringLeft = false;
    this.isSteeringRight = false;
    this.isAccelerating = false;
    this.isBraking = false;
    this.isHandbraking = false;

    // Auto-detect touch capability or small screen
    this.enabled = MobileControls.detectTouchDevice();

    this.init();
  }

  static detectTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      window.innerWidth <= 1024
    );
  }

  init() {
    this.root = document.createElement('div');
    this.root.className = 'mobile-controls-overlay';
    this.root.id = 'mobile-controls-root';
    this.root.style.display = 'none';

    this.root.innerHTML = `
      <!-- Top Peripheral Controls (Camera & Lights) -->
      <div class="mobile-top-bar" id="mobile-top-bar">
        <button class="mobile-touch-btn mobile-util-btn" id="btn-touch-cam" aria-label="Camera Button" title="Change Camera View">
          <span class="touch-icon">📷</span>
          <span class="touch-label" id="touch-cam-label">CAM</span>
        </button>
        <button class="mobile-touch-btn mobile-util-btn" id="btn-touch-lights" aria-label="Lights Button" title="Toggle Headlights">
          <span class="touch-icon">💡</span>
          <span class="touch-label">LIGHTS</span>
        </button>
      </div>

      <!-- Left Thumb Zone: Steering & Gear -->
      <div class="mobile-thumb-zone mobile-zone-left" id="mobile-zone-left">
        <!-- Gear Shift Button -->
        <div class="mobile-gear-row">
          <button class="mobile-touch-btn mobile-gear-btn" id="btn-touch-gear" aria-label="Gear Button" title="Shift Gear">
            <span class="touch-icon">⚙️</span>
            <span class="touch-label" id="touch-gear-label">GEAR 1</span>
          </button>
        </div>

        <!-- Steering Buttons Row: Left & Right -->
        <div class="mobile-steer-group">
          <button class="mobile-touch-btn mobile-steer-btn" id="btn-touch-steer-left" aria-label="Left Steering Button" title="Steer Left">
            <span class="touch-arrow">◀</span>
            <span class="touch-label">LEFT</span>
          </button>
          <button class="mobile-touch-btn mobile-steer-btn" id="btn-touch-steer-right" aria-label="Right Steering Button" title="Steer Right">
            <span class="touch-arrow">▶</span>
            <span class="touch-label">RIGHT</span>
          </button>
        </div>
      </div>

      <!-- Right Thumb Zone: Pedals & Handbrake -->
      <div class="mobile-thumb-zone mobile-zone-right" id="mobile-zone-right">
        <!-- Handbrake Drift Button -->
        <div class="mobile-handbrake-row">
          <button class="mobile-touch-btn mobile-handbrake-btn" id="btn-touch-handbrake" aria-label="Handbrake" title="Handbrake Drift">
            <span class="touch-icon">🅿️</span>
            <span class="touch-label">HANDBRAKE</span>
          </button>
        </div>

        <!-- Pedals Group: Brake & Accelerator -->
        <div class="mobile-pedals-group">
          <button class="mobile-touch-btn mobile-pedal-btn mobile-brake-btn" id="btn-touch-brake" aria-label="Brake" title="Brake / Reverse">
            <span class="touch-icon">🛑</span>
            <span class="touch-label">BRAKE</span>
            <span class="touch-pedal-stripes"></span>
          </button>
          <button class="mobile-touch-btn mobile-pedal-btn mobile-accel-btn" id="btn-touch-accel" aria-label="Accelerator" title="Accelerator">
            <span class="touch-icon">⚡</span>
            <span class="touch-label">ACCEL</span>
            <span class="touch-pedal-stripes"></span>
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(this.root);
    this.bindTouchEvents();
  }

  bindTouchEvents() {
    const btnLeft = this.root.querySelector('#btn-touch-steer-left');
    const btnRight = this.root.querySelector('#btn-touch-steer-right');
    const btnAccel = this.root.querySelector('#btn-touch-accel');
    const btnBrake = this.root.querySelector('#btn-touch-brake');
    const btnHandbrake = this.root.querySelector('#btn-touch-handbrake');
    const btnGear = this.root.querySelector('#btn-touch-gear');
    const btnCam = this.root.querySelector('#btn-touch-cam');
    const btnLights = this.root.querySelector('#btn-touch-lights');

    // 1. Left Steering Button
    this.setupHoldButton(btnLeft, () => {
      this.isSteeringLeft = true;
      this.input.virtualControls.steer = 1; // +1 = Steer Left in vehicle physics
    }, () => {
      this.isSteeringLeft = false;
      this.input.virtualControls.steer = this.isSteeringRight ? -1 : 0;
    });

    // 2. Right Steering Button
    this.setupHoldButton(btnRight, () => {
      this.isSteeringRight = true;
      this.input.virtualControls.steer = -1; // -1 = Steer Right in vehicle physics
    }, () => {
      this.isSteeringRight = false;
      this.input.virtualControls.steer = this.isSteeringLeft ? 1 : 0;
    });

    // 3. Accelerator Button
    this.setupHoldButton(btnAccel, () => {
      this.isAccelerating = true;
      this.input.virtualControls.throttle = 1;
    }, () => {
      this.isAccelerating = false;
      this.input.virtualControls.throttle = 0;
    });

    // 4. Brake Button
    this.setupHoldButton(btnBrake, () => {
      this.isBraking = true;
      this.input.virtualControls.brake = 1;
    }, () => {
      this.isBraking = false;
      this.input.virtualControls.brake = 0;
    });

    // 5. Handbrake Button
    this.setupHoldButton(btnHandbrake, () => {
      this.isHandbraking = true;
      this.input.virtualControls.handbrake = true;
    }, () => {
      this.isHandbraking = false;
      this.input.virtualControls.handbrake = false;
    });

    // 6. Gear Button (Tapping shifts up, wraps around at top gear to Reverse then 1)
    this.setupActionButton(btnGear, () => {
      this.cycleGear();
    });

    // 7. Camera Button
    this.setupActionButton(btnCam, () => {
      this.input.triggerAction('toggleCamera');
      if (this.audio) this.audio.playUIClick();
    });

    // 8. Lights Button
    this.setupActionButton(btnLights, () => {
      this.input.triggerAction('toggleHeadlights');
      if (this.audio) this.audio.playUIClick();
    });
  }

  setupHoldButton(btn, onDown, onUp) {
    if (!btn) return;

    let activePointerId = null;

    const handleDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      activePointerId = e.pointerId;
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (_) {}
      btn.classList.add('is-pressed');
      onDown();
    };

    const handleUp = (e) => {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        if (btn.hasPointerCapture(e.pointerId)) {
          btn.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      activePointerId = null;
      btn.classList.remove('is-pressed');
      onUp();
    };

    btn.addEventListener('pointerdown', handleDown, { passive: false });
    btn.addEventListener('pointerup', handleUp, { passive: false });
    btn.addEventListener('pointercancel', handleUp, { passive: false });
    btn.addEventListener('pointerleave', handleUp, { passive: false });
  }

  setupActionButton(btn, onClick) {
    if (!btn) return;

    const handleDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('is-pressed');
      onClick();
    };

    const handleUp = (e) => {
      btn.classList.remove('is-pressed');
    };

    btn.addEventListener('pointerdown', handleDown, { passive: false });
    btn.addEventListener('pointerup', handleUp, { passive: false });
    btn.addEventListener('pointercancel', handleUp, { passive: false });
    btn.addEventListener('pointerleave', handleUp, { passive: false });
  }

  cycleGear() {
    if (this.vehicleManager) {
      const v = this.vehicleManager.getActiveVehicle();
      if (v && v.physics) {
        const p = v.physics;
        if (typeof p.cycleGear === 'function') {
          p.cycleGear();
        } else if (typeof p.shiftUp === 'function') {
          p.shiftUp();
        }
        if (this.audio && typeof this.audio.playGearShiftPop === 'function') this.audio.playGearShiftPop();
        const label = p.getGearName ? p.getGearName() : p.currentGear;
        const gearTextEl = this.root.querySelector('#touch-gear-label');
        if (gearTextEl) gearTextEl.textContent = `GEAR ${label}`;
        return;
      }
    }
    if (this.input && typeof this.input.triggerAction === 'function') {
      this.input.triggerAction('gearControl');
    }
  }

  update(telemetry, cameraMode) {
    if (!this.root || this.root.style.display === 'none') return;

    // Update Gear Button text with active gear
    if (telemetry) {
      const gearTextEl = this.root.querySelector('#touch-gear-label');
      if (gearTextEl && telemetry.gear !== undefined) {
        gearTextEl.textContent = `GEAR ${telemetry.gear}`;
      }

      // Update Headlights Button state visual indicator
      const lightsBtn = this.root.querySelector('#btn-touch-lights');
      if (lightsBtn) {
        lightsBtn.classList.toggle('is-active-glow', Boolean(telemetry.headlights));
      }

      // Update Handbrake Button state visual indicator
      const brakeBtn = this.root.querySelector('#btn-touch-handbrake');
      if (brakeBtn) {
        brakeBtn.classList.toggle('is-active-brake', Boolean(telemetry.handbrake));
      }
    }

    // Update Camera Mode label
    if (cameraMode) {
      const camLabel = this.root.querySelector('#touch-cam-label');
      if (camLabel) {
        const shortCam = {
          chase: 'CHASE',
          close_chase: 'CLOSE',
          cockpit: 'COCKPIT',
          rear: 'REAR',
          free: 'FREE',
          orbit: 'FREE'
        }[cameraMode] || cameraMode.toUpperCase();
        camLabel.textContent = shortCam;
      }
    }
  }

  show() {
    if (this.enabled) {
      this.root.style.display = 'block';
    } else {
      this.root.style.display = 'none';
    }
  }

  hide() {
    this.root.style.display = 'none';
    // Clear all virtual inputs upon hiding
    this.isSteeringLeft = false;
    this.isSteeringRight = false;
    this.isAccelerating = false;
    this.isBraking = false;
    this.isHandbraking = false;
    this.input.virtualControls.steer = 0;
    this.input.virtualControls.throttle = 0;
    this.input.virtualControls.brake = 0;
    this.input.virtualControls.handbrake = false;
  }

  toggleEnabled() {
    this.enabled = !this.enabled;
    this.show();
    return this.enabled;
  }

  setEnabled(bool) {
    this.enabled = Boolean(bool);
    this.show();
  }
}
