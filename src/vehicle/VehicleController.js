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
    this.lastCollisionTime = 0;

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

    this.input.onAction('indicatorOff', () => {
      this.vehicle.turnOffIndicators();
      this.audio.playIndicatorClick(false);
    });

    this.input.onAction('toggleWipers', () => {
      const state = this.vehicle.toggleWipers();
      if (state) this.audio.playWiperSound();
    });

    this.input.onAction('toggleDoors', () => {
      this.toggleAllDoors();
    });

    this.input.onAction('openAllDoors', () => {
      this.openAllDoors();
    });

    this.input.onAction('closeAllDoors', () => {
      this.closeAllDoors();
    });

    this.input.onAction('toggleFrontLeftDoor', () => {
      this.toggleDoor('frontLeft');
    });

    this.input.onAction('toggleFrontRightDoor', () => {
      this.toggleDoor('frontRight');
    });

    this.input.onAction('toggleRearLeftDoor', () => {
      this.toggleDoor('rearLeft');
    });

    this.input.onAction('toggleRearRightDoor', () => {
      this.toggleDoor('rearRight');
    });

    this.input.onAction('toggleBoot', () => {
      this.toggleBoot();
    });

    this.input.onAction('openBoot', () => {
      this.openBoot();
    });

    this.input.onAction('closeBoot', () => {
      this.closeBoot();
    });

    this.input.onAction('toggleTrunk', () => {
      this.toggleBoot();
    });

    this.input.onAction('openTrunk', () => {
      this.openBoot();
    });

    this.input.onAction('closeTrunk', () => {
      this.closeBoot();
    });

    this.input.onAction('toggleRoof', () => {
      this.toggleRoof();
    });

    this.input.onAction('openRoof', () => {
      this.openRoof();
    });

    this.input.onAction('closeRoof', () => {
      this.closeRoof();
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
      if (!window.game || !window.game.vehicleManager) {
        if (this.physics && typeof this.physics.resetUpright === 'function') {
          this.physics.resetUpright();
        }
        if (this.audio && typeof this.audio.playUIClick === 'function') {
          this.audio.playUIClick();
        }
        if (window.gameHud && window.gameHud.setPrompt) {
          window.gameHud.setPrompt('🚗 VEHICLE RESET TO ROAD', 1800);
        }
      }
    });

    this.input.onAction('horn', () => {
      this.audio.playHorn(true);
      setTimeout(() => this.audio.playHorn(false), 350);
    });
  }

  update(dt, collisionSystem, trafficCars = []) {
    // 1. Fetch input values
    const drivingInputs = this.input.getDrivingInput();

    // 2. Step physics
    this.physics.update(drivingInputs, dt, collisionSystem, trafficCars);

    // Collision sound & impact feedback
    if (this.physics.lastCollision && this.physics.lastCollision.time !== this.lastCollisionTime) {
      this.lastCollisionTime = this.physics.lastCollision.time;
      if (this.audio && typeof this.audio.playCrash === 'function') {
        this.audio.playCrash(this.physics.lastCollision.severity);
      }
    }

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

    if (this.vehicle.turnCancelledStalk) {
      this.vehicle.turnCancelledStalk = false;
      this.audio.playIndicatorClick(false);
      if (window.gameHud && typeof window.gameHud.setPrompt === 'function') {
        window.gameHud.setPrompt('🔄 INDICATOR AUTO-CANCELLED', 1200);
      }
    }
  }

  setIndicatorState(state) {
    const res = this.vehicle.setIndicatorState ? this.vehicle.setIndicatorState(state) : state;
    this.audio.playIndicatorClick(res !== 'OFF');
    return res;
  }

  getIndicatorState() {
    return this.vehicle.getIndicatorState ? this.vehicle.getIndicatorState() : 'OFF';
  }

  turnOffIndicators() {
    const res = this.vehicle.turnOffIndicators ? this.vehicle.turnOffIndicators() : 'OFF';
    this.audio.playIndicatorClick(false);
    return res;
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
      rearTraction: (this.physics && this.physics.rearTraction !== undefined) ? this.physics.rearTraction : (this.vehicle.handbrake ? 0.35 : 1.0),
      isDrifting: !!(this.physics && this.physics.isDrifting),
      driftAngle: (this.physics && this.physics.driftAngle) || 0,
      slipRatio: (this.physics && this.physics.slipRatio) || 0,
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
      // 14. Indicators System (LEFT, RIGHT, HAZARD, OFF)
      indicators: this.vehicle.indicators,
      indicatorState: this.vehicle.getIndicatorState ? this.vehicle.getIndicatorState() : 'OFF',
      leftIndicator: this.vehicle.indicators.left || this.vehicle.indicators.hazard,
      rightIndicator: this.vehicle.indicators.right || this.vehicle.indicators.hazard,
      hazard: this.vehicle.indicators.hazard,
      // 15. Wipers
      wipers: this.vehicle.wipers.active,
      // 16. Doors System (frontLeft, frontRight, rearLeft, rearRight)
      doors: this.vehicle.doors ? this.vehicle.doors.isOpen : false,
      doorStates: this.vehicle.getAllDoorStates ? this.vehicle.getAllDoorStates() : {
        frontLeft: { isOpen: false }, frontRight: { isOpen: false }, rearLeft: { isOpen: false }, rearRight: { isOpen: false }
      },
      frontLeftDoor: this.vehicle.getDoorState ? this.vehicle.getDoorState('frontLeft') : null,
      frontRightDoor: this.vehicle.getDoorState ? this.vehicle.getDoorState('frontRight') : null,
      rearLeftDoor: this.vehicle.getDoorState ? this.vehicle.getDoorState('rearLeft') : null,
      rearRightDoor: this.vehicle.getDoorState ? this.vehicle.getDoorState('rearRight') : null,
      // 17. Boot
      boot: this.vehicle.boot ? this.vehicle.boot.isOpen : false,
      trunk: this.vehicle.boot ? this.vehicle.boot.isOpen : false,
      bootState: this.vehicle.getBootState ? this.vehicle.getBootState() : { isOpen: false, progress: 0, supported: true },
      isBootSupported: this.vehicle.isBootSupported ? this.vehicle.isBootSupported() : true,
      // 18. Camera
      camera: this.vehicle.camera,
      // Convertible Roof
      roof: this.vehicle.roofOpen,
      roofOpen: this.vehicle.roofOpen,
      roofState: this.vehicle.getRoofState ? this.vehicle.getRoofState() : { isOpen: false, progress: 0, isConvertible: false, supported: false },
      isConvertible: Boolean(this.vehicle.isConvertible),
      isRoofSupported: Boolean(this.vehicle.isConvertible),
      // Mirrors
      mirrors: this.vehicle.getMirrorState ? this.vehicle.getMirrorState() : { supported: true, left: true, right: true, rearView: true },
      // Driving & Gear modes
      isSportMode: !!this.vehicle.isSportMode,
      driveMode: this.vehicle.isSportMode ? 'SPORT MODE' : 'COMFORT MODE',
      gearName: (this.physics && this.physics.getGearName) ? this.physics.getGearName() : this.vehicle.gear,
      transmissionMode: (this.physics && this.physics.transmissionMode) || 'auto',
      gearsList: (this.physics && this.physics.gearNames) || ['P', 'R', 'N', '1', '2', '3', '4', '5', '6']
    };
  }

  // Door Control Methods
  openDoor(doorKey) {
    if (!this.vehicle || !this.vehicle.openDoor) return false;
    const ok = this.vehicle.openDoor(doorKey);
    if (ok) {
      if (this.audio && typeof this.audio.playDoorOpen === 'function') {
        this.audio.playDoorOpen();
      } else {
        this.audio.playUIClick();
      }
    }
    return ok;
  }

  closeDoor(doorKey) {
    if (!this.vehicle || !this.vehicle.closeDoor) return false;
    const ok = this.vehicle.closeDoor(doorKey);
    if (this.audio && typeof this.audio.playDoorClose === 'function') {
      this.audio.playDoorClose();
    } else {
      this.audio.playUIClick();
    }
    return ok;
  }

  toggleDoor(doorKey) {
    if (!this.vehicle || !this.vehicle.getDoorState) return false;
    const state = this.vehicle.getDoorState(doorKey);
    if (state && state.isOpen) {
      return this.closeDoor(doorKey);
    } else {
      return this.openDoor(doorKey);
    }
  }

  openAllDoors() {
    if (!this.vehicle || !this.vehicle.openAllDoors) return false;
    const ok = this.vehicle.openAllDoors();
    if (this.audio && typeof this.audio.playDoorOpen === 'function') {
      this.audio.playDoorOpen();
    } else {
      this.audio.playUIClick();
    }
    return ok;
  }

  closeAllDoors() {
    if (!this.vehicle || !this.vehicle.closeAllDoors) return false;
    const ok = this.vehicle.closeAllDoors();
    if (this.audio && typeof this.audio.playDoorClose === 'function') {
      this.audio.playDoorClose();
    } else {
      this.audio.playUIClick();
    }
    return ok;
  }

  toggleAllDoors() {
    if (!this.vehicle) return false;
    if (this.vehicle.doors && this.vehicle.doors.isOpen) {
      return this.closeAllDoors();
    } else {
      return this.openAllDoors();
    }
  }

  getDoorState(doorKey) {
    return this.vehicle && this.vehicle.getDoorState ? this.vehicle.getDoorState(doorKey) : null;
  }

  getAllDoorStates() {
    return this.vehicle && this.vehicle.getAllDoorStates ? this.vehicle.getAllDoorStates() : null;
  }

  // Boot / Trunk Control Methods
  openBoot() {
    if (!this.vehicle || !this.vehicle.openBoot) return false;
    const ok = this.vehicle.openBoot();
    if (ok) {
      if (this.audio && typeof this.audio.playBootOpen === 'function') {
        this.audio.playBootOpen();
      } else if (this.audio) {
        this.audio.playUIClick();
      }
    }
    return ok;
  }

  closeBoot() {
    if (!this.vehicle || !this.vehicle.closeBoot) return false;
    this.vehicle.closeBoot();
    if (this.audio && typeof this.audio.playBootClose === 'function') {
      this.audio.playBootClose();
    } else if (this.audio) {
      this.audio.playUIClick();
    }
    return true;
  }

  toggleBoot() {
    if (!this.vehicle) return false;
    const state = this.getBootState();
    if (state && state.isOpen) {
      return this.closeBoot();
    } else {
      return this.openBoot();
    }
  }

  openTrunk() {
    return this.openBoot();
  }

  closeTrunk() {
    return this.closeBoot();
  }

  toggleTrunk() {
    return this.toggleBoot();
  }

  getBootState() {
    return this.vehicle && this.vehicle.getBootState ? this.vehicle.getBootState() : null;
  }

  isBootSupported() {
    return this.vehicle && this.vehicle.isBootSupported ? this.vehicle.isBootSupported() : false;
  }

  // Convertible Roof Control Methods
  openRoof() {
    if (!this.vehicle || !this.vehicle.openRoof) return false;
    const ok = this.vehicle.openRoof();
    if (ok) {
      if (this.audio && typeof this.audio.playRoofMotor === 'function') {
        this.audio.playRoofMotor();
      } else if (this.audio) {
        this.audio.playUIClick();
      }
    }
    return ok;
  }

  closeRoof() {
    if (!this.vehicle || !this.vehicle.closeRoof) return false;
    this.vehicle.closeRoof();
    if (this.audio && typeof this.audio.playRoofMotor === 'function') {
      this.audio.playRoofMotor();
    } else if (this.audio) {
      this.audio.playUIClick();
    }
    return true;
  }

  toggleRoof() {
    if (!this.vehicle) return false;
    const state = this.getRoofState();
    if (state && state.isOpen) {
      return this.closeRoof();
    } else {
      return this.openRoof();
    }
  }

  getRoofState() {
    return this.vehicle && this.vehicle.getRoofState ? this.vehicle.getRoofState() : null;
  }

  isRoofSupported() {
    return this.vehicle && this.vehicle.isRoofSupported ? this.vehicle.isRoofSupported() : false;
  }

  // Mirror System Methods
  isMirrorSupported(type = 'all') {
    return this.vehicle && this.vehicle.isMirrorSupported ? this.vehicle.isMirrorSupported(type) : false;
  }

  getMirrors() {
    return this.vehicle && this.vehicle.getMirrors ? this.vehicle.getMirrors() : null;
  }

  getMirrorState() {
    return this.vehicle && this.vehicle.getMirrorState ? this.vehicle.getMirrorState() : null;
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

  setTransmissionMode(mode) {
    if (this.physics && typeof this.physics.setTransmissionMode === 'function') {
      return this.physics.setTransmissionMode(mode);
    }
    return false;
  }
}
