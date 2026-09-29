/**
 * Manages player vehicle input translation, sound triggers, and visual synchronization
 */
export class VehicleController {
  constructor(vehicle, physics, audio, input) {
    this.vehicle = vehicle;
    this.physics = physics;
    this.audio = audio;
    this.input = input;

    this.hornActive = false;
    this.lastIndicatorTick = false;
    this.lastHandbrakeState = false;

    this.setupInputEvents();
  }

  setupInputEvents() {
    this.input.onAction('toggleHeadlights', () => {
      const state = this.vehicle.toggleHeadlights();
      this.audio.playUIClick();
    });

    this.input.onAction('toggleLeftIndicator', () => {
      this.vehicle.toggleLeftIndicator();
      this.audio.playIndicatorClick(true);
    });

    this.input.onAction('toggleRightIndicator', () => {
      this.vehicle.toggleRightIndicator();
      this.audio.playIndicatorClick(true);
    });

    this.input.onAction('toggleHazard', () => {
      this.vehicle.toggleHazard();
      this.audio.playIndicatorClick(true);
    });

    this.input.onAction('indicatorsOff', () => {
      this.vehicle.turnOffIndicators();
      this.audio.playUIClick();
      if (window.gameHud && typeof window.gameHud.setPrompt === 'function') {
        window.gameHud.setPrompt('✕ INDICATORS OFF', 1200);
      }
    });

    this.vehicle.onIndicatorAutoCancel = (direction) => {
      if (this.audio && typeof this.audio.playIndicatorClick === 'function') {
        this.audio.playIndicatorClick(false);
      }
      if (window.gameHud && typeof window.gameHud.setPrompt === 'function') {
        window.gameHud.setPrompt(`◀▶ ${direction.toUpperCase()} TURN SIGNAL CANCELLED`, 1500);
      }
    };

    this.input.onAction('toggleWipers', () => {
      const state = this.vehicle.toggleWipers();
      if (state) this.audio.playWiperSound();
    });

    this.input.onAction('toggleDoors', () => {
      this.vehicle.toggleDoors();
      this.audio.playUIClick();
    });

    this.input.onAction('toggleBoot', () => {
      this.vehicle.toggleBoot();
      this.audio.playUIClick();
    });

    this.input.onAction('toggleTrunk', () => {
      this.vehicle.toggleTrunk();
      this.audio.playUIClick();
    });

    this.input.onAction('toggleRoof', () => {
      this.vehicle.toggleRoof();
      this.audio.playUIClick();
    });

    this.input.onAction('gearUp', () => {
      if (this.physics.shiftUp()) {
        this.audio.playGearShiftPop();
      }
    });

    this.input.onAction('gearDown', () => {
      if (this.physics.shiftDown()) {
        this.audio.playGearShiftPop();
      }
    });

    this.input.onAction('gearControl', () => {
      if (this.physics && typeof this.physics.cycleGear === 'function') {
        this.physics.cycleGear();
        this.audio.playGearShiftPop();
        const gearName = this.physics.getGearName();
        if (window.gameHud && window.gameHud.setPrompt) {
          window.gameHud.setPrompt(`⚙️ GEAR ${gearName} ENGAGED`, 1500);
        }
      }
    });

    this.input.onAction('sportMode', () => {
      const isSport = this.vehicle.toggleSportMode ? this.vehicle.toggleSportMode() : false;
      this.audio.playUIClick();
      if (window.gameHud && window.gameHud.setPrompt) {
        window.gameHud.setPrompt(isSport ? '🔥 SPORT MODE ENGAGED (MAX PERFORMANCE)' : '🌿 COMFORT MODE ACTIVE', 1800);
      }
    });

    this.input.onAction('resetVehicle', () => {
      if (this.physics && typeof this.physics.resetUpright === 'function') {
        this.physics.resetUpright();
        this.audio.playUIClick();
        if (window.gameHud && window.gameHud.setPrompt) {
          window.gameHud.setPrompt('🔄 VEHICLE RESET UPRIGHT', 1500);
        }
      }
    });

    this.input.onAction('horn', () => {
      this.audio.playHorn(true);
      setTimeout(() => this.audio.playHorn(false), 350);
    });
  }

  update(dt, collisionSystem) {
    // 1. Fetch input values
    const drivingInputs = this.input.getDrivingInput();

    // 2. Step physics
    this.physics.update(drivingInputs, dt, collisionSystem);

    // 3. Step visual vehicle model
    this.vehicle.update(this.physics, dt);

    // 4. Update procedural audio engine & handbrake acoustic feedback
    const isHandbrake = !!drivingInputs.handbrake;
    if (isHandbrake !== this.lastHandbrakeState) {
      this.lastHandbrakeState = isHandbrake;
      if (this.audio && typeof this.audio.playHandbrake === 'function') {
        this.audio.playHandbrake(isHandbrake);
      }
      if (isHandbrake && Math.abs(this.physics.speedKmh) > 12) {
        if (window.gameHud && typeof window.gameHud.setPrompt === 'function') {
          window.gameHud.setPrompt('⚡ HANDBRAKE DRIFT', 1200);
        }
      }
    }

    this.audio.updateEngine(this.physics.rpm, drivingInputs.throttle, true);
    this.audio.updateTireSlip(this.physics.slipRatio, isHandbrake && Math.abs(this.physics.speedKmh) > 4);
    this.audio.updateWind(Math.abs(this.physics.speedKmh));

    // Audio clicks for active indicators
    if (this.vehicle.leftIndicatorOn || this.vehicle.rightIndicatorOn || this.vehicle.hazardOn) {
      if (this.vehicle.indicatorBlinkState !== this.lastIndicatorTick) {
        this.lastIndicatorTick = this.vehicle.indicatorBlinkState;
        this.audio.playIndicatorClick(this.lastIndicatorTick);
      }
    }
  }

  getTelemetry() {
    return {
      // 1. Position
      position: this.vehicle.position,
      // 2. Rotation
      rotation: this.vehicle.rotation,
      heading: this.vehicle.heading,
      // 3. Speed
      speed: this.vehicle.speed,
      speedKmh: Math.abs(Math.round(this.vehicle.speedKmh)),
      forwardSpeed: this.vehicle.forwardSpeed,
      // 4. Acceleration
      acceleration: this.vehicle.accelerationRate,
      accelerationVector: this.vehicle.acceleration,
      enginePower: this.vehicle.enginePower,
      // 5. Braking
      braking: this.vehicle.braking,
      isBraking: this.vehicle.isBraking,
      // 6. Steering
      steering: this.vehicle.steering,
      steerAngle: this.vehicle.steerAngle,
      // 7. Gear
      gear: this.vehicle.gear,
      currentGear: this.vehicle.currentGear,
      rpm: Math.round(this.vehicle.rpm),
      // 8. Handbrake & Drift Dynamics
      handbrake: this.vehicle.handbrake,
      rearTraction: this.physics.rearTraction !== undefined ? this.physics.rearTraction : (this.vehicle.handbrake ? 0.35 : 1.0),
      isDrifting: !!this.physics.isDrifting,
      driftAngle: this.physics.driftAngle || 0,
      slipRatio: this.physics.slipRatio || 0,
      // 9. Drive type
      driveType: this.vehicle.driveType,
      // 10. Height
      height: this.vehicle.height,
      rideHeight: this.vehicle.rideHeight,
      groundHeight: this.vehicle.groundHeight,
      isGrounded: this.vehicle.isGrounded,
      // 11. Handling
      handling: this.vehicle.handling,
      // 12. Colour
      colour: this.vehicle.colour,
      // 13. Lights
      lights: this.vehicle.lights,
      headlights: this.vehicle.lights.headlights,
      // 14. Indicators
      indicators: this.vehicle.indicators,
      leftIndicator: this.vehicle.indicators.left || this.vehicle.indicators.hazard,
      rightIndicator: this.vehicle.indicators.right || this.vehicle.indicators.hazard,
      hazard: this.vehicle.indicators.hazard,
      indicatorsOff: !this.vehicle.leftIndicatorOn && !this.vehicle.rightIndicatorOn && !this.vehicle.hazardOn,
      // 15. Wipers
      wipers: this.vehicle.wipers.active,
      // 16. Doors
      doors: this.vehicle.doors.isOpen,
      // 17. Boot
      boot: this.vehicle.boot.isOpen,
      trunk: this.vehicle.boot.isOpen,
      // 18. Camera
      camera: this.vehicle.camera,
      // Convertible / extra
      roof: this.vehicle.roofOpen,
      isConvertible: this.vehicle.isConvertible,
      // Driving & Gear modes
      isSportMode: !!this.vehicle.isSportMode,
      driveMode: this.vehicle.isSportMode ? 'SPORT MODE' : 'COMFORT MODE',
      gearName: this.physics.getGearName ? this.physics.getGearName() : this.vehicle.gear,
      transmissionMode: this.physics.transmissionMode || 'auto',
      gearsList: this.physics.gearNames || ['P', 'R', 'N', '1', '2', '3', '4', '5', '6']
    };
  }

  toggleSportMode() {
    if (this.vehicle && typeof this.vehicle.toggleSportMode === 'function') {
      const isSport = this.vehicle.toggleSportMode();
      this.audio.playUIClick();
      return isSport;
    }
    return false;
  }

  setSportMode(enabled) {
    if (this.vehicle) {
      this.vehicle.isSportMode = !!enabled;
      if (this.physics) this.physics.isSportMode = !!enabled;
      return this.vehicle.isSportMode;
    }
    return false;
  }

  setGear(gearNameOrIndex) {
    if (this.physics) {
      if (typeof gearNameOrIndex === 'string') {
        const ok = this.physics.setGearByName(gearNameOrIndex);
        if (ok) this.audio.playGearShiftPop();
        return ok;
      } else {
        const ok = this.physics.setGear(gearNameOrIndex);
        if (ok) this.audio.playGearShiftPop();
        return ok;
      }
    }
    return false;
  }

  toggleTransmissionMode() {
    if (this.physics && typeof this.physics.toggleTransmissionMode === 'function') {
      const mode = this.physics.toggleTransmissionMode();
      this.audio.playUIClick();
      return mode;
    }
    return 'auto';
  }
}
