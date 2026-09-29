import * as THREE from 'three';
import { MathUtils } from '../utilities/MathUtils.js';

/**
 * Realistic Arcade-Simulation Vehicle Physics Engine
 */
export class VehiclePhysics {
  constructor(config = {}) {
    this.mass = config.mass || 1400; // kg
    this.maxSpeed = config.maxSpeed || 240; // km/h
    this.enginePower = config.enginePower || 450; // HP
    this.brakeForce = config.brakeForce || 35;
    this.handbrakeGrip = config.handbrakeGrip || 0.35;
    this.driveType = config.driveType || 'RWD'; // 'RWD', 'FWD', 'AWD', '4WD'
    this.rideHeight = config.rideHeight || 0.38; // Ground clearance (m)
    this.handling = config.handling || {
      grip: 1.0,
      downforce: 1.0,
      steeringSpeed: 3.5,
      driftControl: 0.35,
      suspensionStiffness: 1.0
    };

    // Transform states
    this.position = new THREE.Vector3(0, this.rideHeight, 0);
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.accelerationRate = 0; // m/s^2
    this.braking = 0; // 0 to 1
    this.handbrakeActive = false;
    this.rearTraction = 1.0; // 1.0 full grip, drops to handbrakeGrip when handbrake engaged
    this.frontTraction = 1.0; // front axle directional grip
    this.isDrifting = false;
    this.driftAngle = 0; // angle between heading and velocity in radians
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.quaternion = new THREE.Quaternion();

    this.heading = 0; // Yaw radians
    this.pitch = 0;
    this.roll = 0;

    // Speeds & motion
    this.speed = 0; // m/s
    this.speedKmh = 0;
    this.forwardSpeed = 0; // signed along vehicle forward vector
    this.lateralSpeed = 0; // drift slip speed
    this.slipRatio = 0; // 0 to 1

    // Steering
    this.steerAngle = 0;
    this.maxSteerAngle = MathUtils.degToRad(35);
    this.steerSpeed = this.handling.steeringSpeed || 3.5;

    // Transmission (P, R, N, 1, 2, 3, 4, 5, 6)
    this.transmissionMode = 'auto'; // 'auto' | 'manual'
    this.isSportMode = false;
    this.gears = [0, -3.2, 0, 3.8, 2.4, 1.7, 1.25, 0.95, 0.75]; // P, R, N, 1, 2, 3, 4, 5, 6
    this.gearNames = ['P', 'R', 'N', '1', '2', '3', '4', '5', '6'];
    this.currentGear = 3; // Default to 1st gear ('1')
    this.finalDriveRatio = 3.7;
    this.rpm = 850;
    this.idleRpm = 850;
    this.redlineRpm = 7800;
    this.isShifting = false;
    this.shiftTimer = 0;

    // Chassis dynamics (Suspension pitch & roll)
    this.chassisPitch = 0;
    this.chassisRoll = 0;

    // Ground & air states
    this.isGrounded = true;
    this.groundHeight = 0;
    this.airTime = 0;

    // Vectors
    this._forward = new THREE.Vector3(0, 0, 1);
    this._right = new THREE.Vector3(1, 0, 0);
    this._up = new THREE.Vector3(0, 1, 0);
  }

  getGearName() {
    return this.gearNames[this.currentGear] || '1';
  }

  update(inputs, dt, collisionSystem) {
    if (dt <= 0) return;
    dt = Math.min(dt, 0.05); // prevent large delta spikes

    // 1. Steering calculation with speed-sensitive damping
    const sportSteerFactor = this.isSportMode ? 1.2 : 1.0;
    const speedFactor = MathUtils.clamp(1.0 - (Math.abs(this.speedKmh) / 280) * 0.65, 0.35, 1.0);
    const targetSteer = inputs.steer * this.maxSteerAngle * speedFactor;
    this.steerAngle = MathUtils.damp(this.steerAngle, targetSteer, this.steerSpeed * 4.0 * sportSteerFactor, dt);

    // 2. Transmission & RPM
    this.updateTransmission(inputs.throttle, inputs.brake, dt);

    // 3. Drive force and Braking
    const forwardVec = this.getForwardVector();
    const rightVec = this.getRightVector();

    this.forwardSpeed = this.velocity.dot(forwardVec);
    this.lateralSpeed = this.velocity.dot(rightVec);
    this.speed = this.velocity.length();
    this.speedKmh = this.forwardSpeed * 3.6;

    let engineForce = 0;
    const sportBoost = this.isSportMode ? 1.25 : 1.0;

    if (this.currentGear === 0) {
      // 0: PARK (P) - wheels locked, engine revs in park without propulsion
      engineForce = 0;
      this.velocity.multiplyScalar(0.7);
    } else if (this.currentGear === 1) {
      // 1: REVERSE (R)
      const revThrottle = (this.transmissionMode === 'auto' && inputs.brake > 0.05) ? inputs.brake : inputs.throttle;
      engineForce = -revThrottle * (this.enginePower * 14.0) * sportBoost;
      if (this.speedKmh < -55) engineForce = 0;
    } else if (this.currentGear === 2) {
      // 2: NEUTRAL (N) - free rolling, no propulsion force
      engineForce = 0;
    } else if (this.currentGear >= 3) {
      // 3 to 8: FORWARD GEARS 1 TO 6
      const gearRatio = this.gears[this.currentGear];
      const normalizedRpm = (this.rpm - this.idleRpm) / (this.redlineRpm - this.idleRpm);
      const clutchSlip = Math.max(0, 1.0 - Math.abs(this.speedKmh) / 35) * 0.45;
      const baseTorque = Math.sin(MathUtils.clamp(normalizedRpm, 0, 1) * Math.PI * 0.85 + 0.15);
      const torqueCurve = Math.max(0.55, baseTorque + clutchSlip);
      const maxDriveForce = (this.enginePower * 18.0 * gearRatio) / 3.0;
      engineForce = inputs.throttle * maxDriveForce * torqueCurve * sportBoost;

      // Arcade speed limits per gear
      const gearSpeedCaps = [0, -55, 0, 65, 110, 160, 215, 270, this.maxSpeed * (this.isSportMode ? 1.08 : 1.0)];
      const currentCap = gearSpeedCaps[this.currentGear] || this.maxSpeed;
      if (this.speedKmh >= currentCap) {
        engineForce = 0;
      }
    }

    // Braking
    // Braking & Handbrake inputs
    this.braking = inputs.brake || 0;
    this.handbrakeActive = !!inputs.handbrake;

    // Rear wheel traction reduction & recovery:
    // When handbrake engaged, rear wheel traction quickly drops to handbrakeGrip (allowing slide).
    // When released, traction smoothly returns over ~0.22s to prevent snap-oversteer or spin out.
    const targetRearTraction = this.handbrakeActive ? this.handbrakeGrip : 1.0;
    const tractionRate = this.handbrakeActive ? 14.0 : 6.0;
    this.rearTraction = MathUtils.damp(this.rearTraction, targetRearTraction, tractionRate, dt);
    this.frontTraction = this.handbrakeActive ? 1.04 : 1.0; // Responsive front steering

    let brakeForce = 0;
    if (this.currentGear === 1 && this.transmissionMode === 'auto') {
      // In auto reverse, throttle acts as brake while moving backwards
      if (inputs.throttle > 0.1 && this.forwardSpeed < -0.5) {
        brakeForce = inputs.throttle * this.brakeForce * this.mass * 0.9;
      }
    } else if (inputs.brake > 0) {
      if (this.forwardSpeed > 0.5) {
        brakeForce = -inputs.brake * this.brakeForce * this.mass * 0.9;
      } else if (this.forwardSpeed < -0.5) {
        brakeForce = inputs.brake * this.brakeForce * this.mass * 0.9;
      } else {
        // Zero out small creep
        this.velocity.multiplyScalar(0.85);
      }
    }

    // Drive configuration adaptation during handbrake:
    if (this.handbrakeActive) {
      if (this.driveType === 'RWD') {
        // Disengage drive power to locked rear axle
        engineForce *= 0.15;
      } else if (this.driveType === 'AWD' || this.driveType === '4WD') {
        // Central differential shifts drive torque to front wheels
        engineForce *= 0.70;
      }
    }

    // Handbrake Braking & Sliding Drag
    if (this.handbrakeActive) {
      if (Math.abs(this.forwardSpeed) < 1.1 && (inputs.throttle || 0) < 0.1) {
        // Standstill park brake lock: holds vehicle securely without rolling down slopes
        this.velocity.multiplyScalar(0.72);
      } else {
        // Kinetic sliding deceleration on the locked rear axle
        const handbrakeRetardation = Math.sign(this.forwardSpeed || 1) * this.brakeForce * this.mass * 0.44;
        brakeForce -= handbrakeRetardation;
      }
    }

    // 4. Lateral tire grip & drift slip
    let baseLateralGrip = 0.92;
    if (this.driveType === 'AWD' || this.driveType === '4WD') {
      baseLateralGrip = 0.95;
    }
    // Effective lateral friction: front provides 45% direction, rear provides 55% lateral grip
    const lateralFriction = baseLateralGrip * (0.45 * this.frontTraction + 0.55 * this.rearTraction);

    const speedMag = this.velocity.length();
    this.slipRatio = Math.min(1.0, Math.abs(this.lateralSpeed) / (Math.abs(this.forwardSpeed) + 2.8));
    if (this.handbrakeActive && speedMag > 2.0) {
      this.slipRatio = Math.max(this.slipRatio, 0.72);
    }
    this.isDrifting = (this.slipRatio > 0.42 && speedMag > 4.5);

    // Calculate drift angle in radians
    if (speedMag > 1.5) {
      const relLat = Math.max(-1, Math.min(1, this.lateralSpeed / speedMag));
      this.driftAngle = Math.asin(relLat);
    } else {
      this.driftAngle = 0;
    }

    this.accelerationRate = Math.abs((engineForce + brakeForce) / this.mass);

    // Apply forces
    if (this.isGrounded) {
      // Driving traction
      this.velocity.addScaledVector(forwardVec, (engineForce + brakeForce) / this.mass * dt);

      // Cornering yaw rotation from steering geometry
      let turnRadiusVelocity = (this.forwardSpeed * Math.tan(this.steerAngle) / 2.7) * (this.handling.grip || 1.0);

      // Drive Type specific traction & handling dynamics
      let driveYawBonus = 0;
      if (this.driveType === 'RWD') {
        if (inputs.throttle > 0.4 && Math.abs(this.steerAngle) > 0.05 && !this.handbrakeActive) {
          driveYawBonus = Math.sign(this.steerAngle) * (engineForce / this.mass) * 0.14;
        }
      } else if (this.driveType === 'FWD') {
        if (inputs.throttle > 0.5 && Math.abs(this.steerAngle) > 0.05 && !this.handbrakeActive) {
          turnRadiusVelocity *= (1.0 - inputs.throttle * 0.18);
        }
      }

      // Handbrake Drift Initiation:
      // When steering and pulling handbrake while moving, the locked rear swings out in a controlled arc
      let handbrakeYawImpulse = 0;
      if (this.handbrakeActive && Math.abs(this.steerAngle) > 0.04) {
        const speedFactor = Math.min(1.5, Math.abs(this.forwardSpeed) / 12);
        handbrakeYawImpulse = Math.sign(this.steerAngle) * 1.65 * speedFactor * (1.05 - this.rearTraction);
      }

      // Counter-Steer Stabilization (Crucial for controlled sliding!):
      // When vehicle is sliding (lateralSpeed) and driver steers against the slide (countersteer),
      // provide stabilizing torque so the driver can balance and hold the slide without spinning out.
      let counterSteerAssist = 0;
      const isCounterSteering = (this.lateralSpeed * this.steerAngle) < 0;
      if (isCounterSteering && Math.abs(this.lateralSpeed) > 0.8) {
        const driftControl = this.handling.driftControl || 0.35;
        counterSteerAssist = this.steerAngle * 2.0 * driftControl;
      }

      let yawRate = turnRadiusVelocity + driveYawBonus + handbrakeYawImpulse + counterSteerAssist;

      // Stability Limiter (Do not make physics unstable):
      // Clamp angular rate to maximum safe controllable limit (prevents infinite spin or numerical divergence)
      const maxYawRate = 2.85; // rad/sec
      yawRate = Math.max(-maxYawRate, Math.min(maxYawRate, yawRate));

      this.heading += yawRate * dt;

      // Lateral friction damping (resist sliding sideways based on front/rear traction)
      const latDamp = Math.pow(lateralFriction, dt * 60);
      this.velocity.sub(rightVec.multiplyScalar(this.lateralSpeed * (1 - latDamp)));

      // Rolling air drag & rolling resistance (with aerodynamic downforce)
      const downforceFactor = this.handling.downforce || 1.0;
      const drag = 0.5 * 0.32 * 2.1 * 1.225 * downforceFactor;
      const airResistance = 0.5 * drag * this.forwardSpeed * Math.abs(this.forwardSpeed);
      const rollingResistance = this.mass * 9.81 * 0.015 * Math.sign(this.forwardSpeed);
      this.velocity.addScaledVector(forwardVec, -(airResistance + rollingResistance) / this.mass * dt);
    } else {
      // Gravity in air
      this.velocity.y -= 22.0 * dt;
      this.airTime += dt;
    }

    // 5. Update Position
    this.position.addScaledVector(this.velocity, dt);

    // 6. Ground & Ramp collision / Terrain height
    let targetGroundY = 0;
    if (collisionSystem) {
      targetGroundY = collisionSystem.getGroundHeight(this.position.x, this.position.z);
    }

    const suspensionRestHeight = targetGroundY + this.rideHeight;
    if (this.position.y <= suspensionRestHeight) {
      if (!this.isGrounded && this.airTime > 0.4) {
        // Landing bounce
        this.velocity.y = -this.velocity.y * 0.15;
      } else {
        this.velocity.y = 0;
      }
      this.position.y = suspensionRestHeight;
      this.isGrounded = true;
      this.airTime = 0;
    } else {
      this.isGrounded = false;
    }

    // 7. World obstacle collisions
    if (collisionSystem) {
      const hit = collisionSystem.checkSphereCollision(this.position, 1.4);
      if (hit && hit.collided) {
        this.position.addScaledVector(hit.normal, hit.penetration);
        const impulse = this.velocity.dot(hit.normal);
        if (impulse < 0) {
          this.velocity.sub(hit.normal.clone().multiplyScalar(impulse * 1.4));
        }
      }

      // Check dynamic boxes
      collisionSystem.hitDynamicBoxes(this.position, this.velocity, 1.8);
    }

    // 8. Visual Suspension Pitch and Roll
    const targetPitch = MathUtils.clamp((engineForce + brakeForce) / (this.mass * 9.8) * 0.08, -0.12, 0.12);
    const targetRoll = MathUtils.clamp((-this.lateralSpeed * 0.035) + (-this.steerAngle * this.forwardSpeed * 0.008), -0.15, 0.15);
    this.chassisPitch = MathUtils.damp(this.chassisPitch, targetPitch, 8, dt);
    this.chassisRoll = MathUtils.damp(this.chassisRoll, targetRoll, 8, dt);

    // Orientation
    this.rotation.set(this.chassisPitch, this.heading, this.chassisRoll);
    this.quaternion.setFromAxisAngle(this._up, this.heading);
  }

  updateTransmission(throttle, brake, dt = 0.016) {
    if (this.transmissionMode === 'auto') {
      if (this.currentGear === 0) {
        // PARK (P): pressing throttle or brake shifts to 1st gear
        if (throttle > 0.1) {
          this.currentGear = 3; // 1st gear
          this.rpm = 2400;
        }
      } else if (this.currentGear === 1) {
        // REVERSE (R): when stopped/moving forward, pressing throttle shifts to 1st gear
        if (this.forwardSpeed > -0.2 && throttle > 0.05) {
          this.currentGear = 3; // 1st gear
          this.rpm = 2500;
        }
      } else if (this.currentGear === 2) {
        // NEUTRAL (N): pressing throttle shifts to 1st gear
        if (throttle > 0.1) {
          this.currentGear = 3;
          this.rpm = 2500;
        }
      } else if (this.currentGear >= 3) {
        // FORWARD GEARS (1 to 6):
        // Auto reverse trigger: when stopped and holding brake, shift to Reverse
        if (this.forwardSpeed < 0.8 && brake > 0.3 && Math.abs(this.speedKmh) < 3.0) {
          this.currentGear = 1; // R
          this.rpm = 2200;
        } else {
          // Automatic upshift / downshift (responsive arcade profile)
          const upshiftSpeeds = [0, 0, 0, 38, 75, 120, 170, 220, 999];
          const downshiftSpeeds = [0, 0, 0, 0, 28, 65, 105, 150, 195];
          if ((this.rpm > 5600 || this.speedKmh > upshiftSpeeds[this.currentGear]) && this.currentGear < this.gears.length - 1) {
            this.currentGear++;
            this.rpm = 3800;
          } else if ((this.rpm < 2200 && this.speedKmh < downshiftSpeeds[this.currentGear]) && this.currentGear > 3) {
            this.currentGear--;
            this.rpm = 4600;
          }
        }
      }
    }

    // Calculate RPM based on current gear and wheel speed
    if (this.currentGear === 0) {
      // PARK: engine revs gently in park
      this.rpm = MathUtils.damp(this.rpm, this.idleRpm + throttle * 3200, 10, dt);
    } else if (this.currentGear === 2) {
      // NEUTRAL: engine revs freely up to redline without vehicle motion
      this.rpm = MathUtils.damp(this.rpm, this.idleRpm + throttle * (this.redlineRpm - this.idleRpm), 10, dt);
    } else {
      // ACTIVE GEARS (R, 1, 2, 3, 4, 5, 6)
      const gearRatio = Math.abs(this.gears[this.currentGear]);
      const wheelRpm = (Math.abs(this.forwardSpeed) / (0.34 * 2 * Math.PI)) * 60;
      const targetRpm = Math.max(this.idleRpm, wheelRpm * gearRatio * this.finalDriveRatio);
      this.rpm = MathUtils.damp(this.rpm, targetRpm, 14, dt);
      if (this.rpm > this.redlineRpm) this.rpm = this.redlineRpm;
    }
  }

  shiftUp() {
    if (this.currentGear < this.gearNames.length - 1) {
      this.currentGear++;
      this.rpm *= 0.74;
      return true;
    }
    return false;
  }

  shiftDown() {
    if (this.currentGear > 0) {
      this.currentGear--;
      this.rpm = Math.min(this.redlineRpm, this.rpm * 1.32);
      return true;
    }
    return false;
  }

  cycleGear() {
    // Simplified arcade cycling:
    // If in P, R, or N -> shift to 1st gear
    // If in 1..5 -> shift up to next gear
    // If in 6 -> wrap to 1st gear
    if (this.currentGear < 3) {
      this.currentGear = 3;
    } else if (this.currentGear >= this.gearNames.length - 1) {
      this.currentGear = 3; // Wrap back to 1st
    } else {
      this.currentGear++;
    }
    this.rpm = Math.max(this.idleRpm, this.rpm * 0.75);
    return this.currentGear;
  }

  setGearByName(name) {
    if (!name) return false;
    const cleanName = String(name).trim().toUpperCase();
    const idx = this.gearNames.indexOf(cleanName);
    if (idx !== -1) {
      this.currentGear = idx;
      if (this.currentGear >= 3) {
        this.rpm = Math.max(this.idleRpm, 2600);
      }
      return true;
    }
    return false;
  }

  setGear(index) {
    const idx = parseInt(index, 10);
    if (!isNaN(idx) && idx >= 0 && idx < this.gearNames.length) {
      this.currentGear = idx;
      return true;
    }
    return false;
  }

  toggleTransmissionMode() {
    this.transmissionMode = this.transmissionMode === 'auto' ? 'manual' : 'auto';
    return this.transmissionMode;
  }

  setTransmissionMode(mode) {
    if (mode === 'auto' || mode === 'manual') {
      this.transmissionMode = mode;
      return true;
    }
    return false;
  }

  toggleSportMode() {
    this.isSportMode = !this.isSportMode;
    return this.isSportMode;
  }

  resetUpright() {
    this.velocity.set(0, 0, 0);
    this.position.y = Math.max(0.6, this.position.y + 0.6);
    this.chassisPitch = 0;
    this.chassisRoll = 0;
    this.steerAngle = 0;
    return true;
  }

  getForwardVector() {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  getRightVector() {
    return new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));
  }

  resetPosition(x = 0, y = 0.5, z = 0, heading = 0) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.heading = heading;
    this.steerAngle = 0;
    this.currentGear = 3; // Reset to 1st gear ('1')
    this.rpm = this.idleRpm;
    this.chassisPitch = 0;
    this.chassisRoll = 0;
  }
}
