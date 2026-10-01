import * as THREE from 'three';
import { MathUtils } from '../utilities/MathUtils.js';

/**
 * Vehicle model archetypes for traffic variety
 */
const CAR_ARCHETYPES = ['sedan', 'suv', 'hatchback', 'coupe', 'taxi'];

const CAR_PALETTES = {
  sedan: [0x2c3e50, 0x34495e, 0x7f8c8d, 0x2980b9, 0x8e44ad, 0xdfe6e9],
  suv: [0x1e272e, 0x485460, 0x2d3436, 0x16a085, 0x57606f, 0xced6e0],
  hatchback: [0xe74c3c, 0xe67e22, 0x3498db, 0x2ecc71, 0x9b59b6, 0xf1c40f],
  coupe: [0xc0392b, 0x130f40, 0x222f3e, 0xeb4d4b, 0x686de0, 0x10ac84],
  taxi: [0xf5b041] // Classic vibrant NYC / city yellow
};

/**
 * AICar
 * 
 * Autonomous AI-controlled road vehicle navigating the city via waypoint graph.
 * 
 * Capabilities:
 * - Follows roads via RoadNetwork connected waypoints.
 * - Maintains reasonable speed based on road speed limits and cornering sharpness.
 * - Stops at intersections when traffic lights are red or yellow.
 * - Avoids obvious collisions with player car, other AI cars, and cross-traffic.
 * - Intelligent lane changing with turn signals when trapped behind slow vehicles.
 * - Visual model variety (Sedan, SUV, Hatchback, Sports Coupe, Taxi).
 * - Animated brake taillights, forward headlights, and blinking amber indicators.
 */
export class AICar {
  constructor(scene, roadNetwork, startWaypointId = null, modelType = null, color = null) {
    this.scene = scene;
    this.roadNetwork = roadNetwork;

    // Pick starting waypoint from road network
    this.currentWaypoint = null;
    this.previousWaypoint = null;

    if (startWaypointId) {
      this.currentWaypoint = this.roadNetwork.getWaypoint(startWaypointId);
    }
    if (!this.currentWaypoint) {
      this.currentWaypoint = this.roadNetwork.getRandomWaypoint();
    }

    // Vehicle model type & color
    this.modelType = modelType || MathUtils.randomChoice(CAR_ARCHETYPES);
    const palette = CAR_PALETTES[this.modelType] || CAR_PALETTES.sedan;
    this.color = color || MathUtils.randomChoice(palette);

    // Physical position & movement state
    this.position = new THREE.Vector3();
    if (this.currentWaypoint) {
      this.position.set(this.currentWaypoint.x, this.currentWaypoint.y || 0.35, this.currentWaypoint.z);
    } else {
      this.position.set(0, 0.35, 0);
    }

    this.heading = 0;
    this.speed = 0;
    this.baseSpeedLimit = this.currentWaypoint ? this.currentWaypoint.speedLimit : 12.0;
    // Driver individual variation (+/- 10%)
    this.driverAggression = 0.92 + Math.random() * 0.18;
    this.targetSpeed = this.baseSpeedLimit * this.driverAggression;

    // Lane navigation & lane-changing state
    this.currentLane = 0; // 0 = right lane, 1 = left/passing lane
    this.lateralOffset = 0; // current active offset in meters
    this.targetLateralOffset = 0;
    this.isChangingLane = false;
    this.laneChangeTimer = 0;
    this.laneChangeDuration = 1.8;
    this.laneChangeCooldown = 4.0 + Math.random() * 6.0; // Cooldown before another change

    // Turn indicator blinker system
    this.turnSignal = 'none'; // 'none' | 'left' | 'right'
    this.blinkerTimer = 0;
    this.blinkerState = false;

    // Traffic light & waiting state
    this.isBraking = false;
    this.isStoppedAtRedLight = false;
    this.stuckTimer = 0;

    // Build 3D mesh hierarchy
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.taillights = [];
    this.headlights = [];
    this.indicatorLeftLights = [];
    this.indicatorRightLights = [];

    this.buildModel();
    this.scene.add(this.group);

    // Orient toward next waypoint initially if available
    this.selectNextWaypoint();
    this.alignHeadingInitial();
  }

  alignHeadingInitial() {
    if (!this.currentWaypoint) return;
    const dx = this.currentWaypoint.x - this.position.x;
    const dz = this.currentWaypoint.z - this.position.z;
    if (Math.abs(dx) > 0.1 || Math.abs(dz) > 0.1) {
      this.heading = Math.atan2(dx, dz);
      this.group.rotation.y = this.heading;
    }
  }

  buildModel() {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.65,
      roughness: 0.28
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      metalness: 0.85,
      roughness: 0.12
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.75
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x181818,
      roughness: 0.92
    });
    const wheelRimMat = new THREE.MeshStandardMaterial({
      color: 0xb0b0b0,
      metalness: 0.85,
      roughness: 0.3
    });

    let length = 4.3;
    let width = 1.8;
    let bodyHeight = 0.5;
    let cabinHeight = 0.45;
    let cabinLength = 2.1;
    let cabinZOffset = -0.15;
    let groundClearance = 0.32;

    switch (this.modelType) {
      case 'suv':
        length = 4.6;
        width = 1.95;
        bodyHeight = 0.65;
        cabinHeight = 0.55;
        cabinLength = 2.7;
        cabinZOffset = -0.1;
        groundClearance = 0.42;
        break;
      case 'hatchback':
        length = 3.9;
        width = 1.75;
        bodyHeight = 0.48;
        cabinHeight = 0.5;
        cabinLength = 2.2;
        cabinZOffset = -0.3;
        break;
      case 'coupe':
        length = 4.4;
        width = 1.85;
        bodyHeight = 0.42;
        cabinHeight = 0.38;
        cabinLength = 1.8;
        cabinZOffset = -0.25;
        break;
      case 'taxi':
        length = 4.4;
        width = 1.8;
        bodyHeight = 0.5;
        cabinHeight = 0.46;
        cabinLength = 2.2;
        break;
      case 'sedan':
      default:
        // default sedan dimensions
        break;
    }

    // 1. Lower chassis body
    const bodyGeo = new THREE.BoxGeometry(width, bodyHeight, length);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = groundClearance + bodyHeight / 2;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.group.add(bodyMesh);

    // 2. Cabin / Greenhouse
    const cabinGeo = new THREE.BoxGeometry(width * 0.85, cabinHeight, cabinLength);
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
    cabinMesh.position.set(0, groundClearance + bodyHeight + cabinHeight / 2 - 0.04, cabinZOffset);
    cabinMesh.castShadow = true;
    this.group.add(cabinMesh);

    // Roof cap matching body color
    const roofGeo = new THREE.BoxGeometry(width * 0.82, 0.06, cabinLength * 0.85);
    const roofMesh = new THREE.Mesh(roofGeo, bodyMat);
    roofMesh.position.set(0, groundClearance + bodyHeight + cabinHeight, cabinZOffset);
    this.group.add(roofMesh);

    // 3. Special Taxi rooftop sign
    if (this.modelType === 'taxi') {
      const taxiSignGeo = new THREE.BoxGeometry(0.7, 0.22, 0.28);
      const taxiSignMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const taxiSign = new THREE.Mesh(taxiSignGeo, taxiSignMat);
      taxiSign.position.set(0, groundClearance + bodyHeight + cabinHeight + 0.12, cabinZOffset);

      // Black "TAXI" base mount
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.32), trimMat);
      mount.position.set(0, groundClearance + bodyHeight + cabinHeight + 0.02, cabinZOffset);
      this.group.add(taxiSign, mount);
    }

    // 4. SUV Roof rails
    if (this.modelType === 'suv') {
      const railGeo = new THREE.BoxGeometry(0.06, 0.08, cabinLength * 0.9);
      [-width * 0.38, width * 0.38].forEach(x => {
        const rail = new THREE.Mesh(railGeo, trimMat);
        rail.position.set(x, groundClearance + bodyHeight + cabinHeight + 0.05, cabinZOffset);
        this.group.add(rail);
      });
    }

    // 5. Headlights (Bright forward illumination)
    const hlGeo = new THREE.BoxGeometry(0.24, 0.12, 0.06);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const hlLeft = new THREE.Mesh(hlGeo, hlMat);
    hlLeft.position.set(width * 0.36, groundClearance + bodyHeight * 0.65, length / 2 + 0.01);
    const hlRight = new THREE.Mesh(hlGeo, hlMat);
    hlRight.position.set(-width * 0.36, groundClearance + bodyHeight * 0.65, length / 2 + 0.01);
    this.group.add(hlLeft, hlRight);
    this.headlights = [hlLeft, hlRight];

    // 6. Taillights (Dual-mode: cruise dim red vs active brake glowing red)
    const tlGeo = new THREE.BoxGeometry(0.26, 0.1, 0.06);
    const tlLeftMat = new THREE.MeshBasicMaterial({ color: 0x440000 });
    const tlRightMat = new THREE.MeshBasicMaterial({ color: 0x440000 });
    const tlLeft = new THREE.Mesh(tlGeo, tlLeftMat);
    tlLeft.position.set(width * 0.36, groundClearance + bodyHeight * 0.7, -length / 2 - 0.01);
    const tlRight = new THREE.Mesh(tlGeo, tlRightMat);
    tlRight.position.set(-width * 0.36, groundClearance + bodyHeight * 0.7, -length / 2 - 0.01);
    this.group.add(tlLeft, tlRight);
    this.taillights = [tlLeft, tlRight];

    // 7. Amber Turn Indicators (Front & Rear corners)
    const indGeo = new THREE.BoxGeometry(0.12, 0.08, 0.06);
    const indMatLeft = new THREE.MeshBasicMaterial({ color: 0x442200 });
    const indMatRight = new THREE.MeshBasicMaterial({ color: 0x442200 });

    // Front Left & Rear Left
    const indFL = new THREE.Mesh(indGeo, indMatLeft);
    indFL.position.set(width * 0.44, groundClearance + bodyHeight * 0.65, length / 2 + 0.01);
    const indRL = new THREE.Mesh(indGeo, indMatLeft);
    indRL.position.set(width * 0.44, groundClearance + bodyHeight * 0.7, -length / 2 - 0.01);
    this.group.add(indFL, indRL);
    this.indicatorLeftLights = [indFL, indRL];

    // Front Right & Rear Right
    const indFR = new THREE.Mesh(indGeo, indMatRight);
    indFR.position.set(-width * 0.44, groundClearance + bodyHeight * 0.65, length / 2 + 0.01);
    const indRR = new THREE.Mesh(indGeo, indMatRight);
    indRR.position.set(-width * 0.44, groundClearance + bodyHeight * 0.7, -length / 2 - 0.01);
    this.group.add(indFR, indRR);
    this.indicatorRightLights = [indFR, indRR];

    // 8. 4 Wheels & Tires
    const wheelRadius = this.modelType === 'suv' ? 0.38 : 0.33;
    const wheelWidth = 0.24;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 14);
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.01, 8);

    const wheelZFront = length * 0.32;
    const wheelZRear = -length * 0.32;
    const wheelX = width / 2;

    [
      [wheelX, wheelZFront],
      [-wheelX, wheelZFront],
      [wheelX, wheelZRear],
      [-wheelX, wheelZRear]
    ].forEach(([wx, wz]) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, wheelRadius, wz);

      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;

      const rim = new THREE.Mesh(rimGeo, wheelRimMat);
      rim.rotation.z = Math.PI / 2;

      wheelGroup.add(tire, rim);
      this.group.add(wheelGroup);
    });
  }

  selectNextWaypoint() {
    if (!this.currentWaypoint) {
      this.currentWaypoint = this.roadNetwork.getRandomWaypoint();
      return;
    }

    const next = this.roadNetwork.getNextWaypoint(
      this.currentWaypoint.id,
      this.previousWaypoint ? this.previousWaypoint.id : null
    );

    this.previousWaypoint = this.currentWaypoint;
    this.currentWaypoint = next || this.roadNetwork.getRandomWaypoint();

    if (this.currentWaypoint) {
      this.baseSpeedLimit = this.currentWaypoint.speedLimit || 12.0;
      this.targetSpeed = this.baseSpeedLimit * this.driverAggression;
    }
  }

  changeLane(targetLane) {
    if (this.isChangingLane || targetLane === this.currentLane) return;

    this.currentLane = targetLane;
    this.isChangingLane = true;
    this.laneChangeTimer = 0;
    // 0 = right lane (offset 0), 1 = left lane (offset -2.6m toward road center)
    this.targetLateralOffset = (targetLane === 1) ? -2.6 : 0;
    this.turnSignal = (targetLane === 1) ? 'left' : 'right';
    this.laneChangeCooldown = 8.0 + Math.random() * 5.0;
  }

  update(dt, playerPosition, trafficLightState, allCars = []) {
    if (!this.currentWaypoint) {
      this.selectNextWaypoint();
      if (!this.currentWaypoint) return;
    }

    // 1. Calculate navigation vector to target waypoint
    // Combine base waypoint position with dynamic lane lateral offset
    const forwardVec = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const rightVec = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));

    // Handle lane change transition
    if (this.isChangingLane) {
      this.laneChangeTimer += dt;
      const t = Math.min(1.0, this.laneChangeTimer / this.laneChangeDuration);
      // Smooth smoothstep interpolation
      const smoothT = t * t * (3 - 2 * t);
      this.lateralOffset = MathUtils.lerp(this.lateralOffset, this.targetLateralOffset, dt * 3.5);

      if (t >= 1.0) {
        this.lateralOffset = this.targetLateralOffset;
        this.isChangingLane = false;
        this.turnSignal = 'none';
      }
    } else {
      if (this.laneChangeCooldown > 0) {
        this.laneChangeCooldown -= dt;
      }
    }

    // Effective target position with lateral offset
    const targetPos = new THREE.Vector3(
      this.currentWaypoint.x,
      this.position.y,
      this.currentWaypoint.z
    ).addScaledVector(rightVec, this.lateralOffset);

    const toTarget = new THREE.Vector3().subVectors(targetPos, this.position);
    toTarget.y = 0;
    const distToWp = toTarget.length();

    // Reached waypoint threshold (expand slightly if high speed)
    const arrivalDist = Math.max(4.0, this.speed * 0.35);
    if (distToWp < arrivalDist) {
      this.selectNextWaypoint();
    }

    // 2. Desired heading and turning speed regulation
    const desiredHeading = Math.atan2(toTarget.x, toTarget.z);
    const headingDiff = Math.abs(MathUtils.angleDifference(this.heading, desiredHeading));

    // Slow down on sharp turns (e.g. 90-degree intersection turns)
    let corneringSpeedFactor = 1.0;
    if (headingDiff > 0.35) {
      corneringSpeedFactor = Math.max(0.45, 1.0 - (headingDiff / Math.PI) * 0.85);
    }

    // Smoothly turn heading towards target waypoint
    const turnRate = (this.speed < 2.0) ? 2.5 : (3.5 + Math.min(2.0, 30.0 / Math.max(5.0, this.speed)));
    this.heading = MathUtils.lerpAngle(this.heading, desiredHeading, turnRate * dt);

    // 3. Collision Avoidance & Traffic Regulations
    let shouldBrake = false;
    let emergencyStop = false;
    let blockedBySlowVehicle = false;

    // A. Player vehicle collision avoidance
    if (playerPosition) {
      const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
      toPlayer.y = 0;
      const distToPlayer = toPlayer.length();

      if (distToPlayer < 22.0) {
        const dot = forwardVec.dot(toPlayer.clone().normalize());
        // In front cone (dot > 0.65)
        if (dot > 0.65) {
          if (distToPlayer < 8.0) {
            emergencyStop = true;
            shouldBrake = true;
          } else if (distToPlayer < 16.0) {
            shouldBrake = true;
            blockedBySlowVehicle = true;
          }
        }
      }
    }

    // B. Other AI vehicles collision avoidance (radar check)
    let leadingCarDistance = 999;
    let leadingCarSpeed = this.targetSpeed;

    for (let i = 0; i < allCars.length; i++) {
      const other = allCars[i];
      if (other === this) continue;

      const toOther = new THREE.Vector3().subVectors(other.position, this.position);
      toOther.y = 0;
      const dist = toOther.length();

      if (dist < 28.0) {
        const forwardDist = toOther.dot(forwardVec);
        const lateralDist = Math.abs(toOther.dot(rightVec));

        // Other car is ahead in same travel corridor
        if (forwardDist > 0.5 && forwardDist < 18.0 && lateralDist < 2.5) {
          if (forwardDist < leadingCarDistance) {
            leadingCarDistance = forwardDist;
            leadingCarSpeed = other.speed;
          }

          if (forwardDist < 7.5) {
            emergencyStop = true;
            shouldBrake = true;
          } else if (forwardDist < 14.0) {
            shouldBrake = true;
            if (other.speed < this.targetSpeed * 0.65) {
              blockedBySlowVehicle = true;
            }
          }
        }
      }
    }

    // C. Traffic Light compliance at intersections
    if (this.currentWaypoint && this.currentWaypoint.trafficLight) {
      const isRedOrYellow = (trafficLightState === 'red' || trafficLightState === 'yellow');

      if (isRedOrYellow) {
        // Approaching intersection stop line (between 4m and 20m)
        if (distToWp >= 3.5 && distToWp <= 20.0) {
          shouldBrake = true;
          this.isStoppedAtRedLight = true;
        }
      } else {
        this.isStoppedAtRedLight = false;
      }
    } else {
      this.isStoppedAtRedLight = false;
    }

    // D. Lane Change decision: If trapped behind slow/stopped vehicle
    if (blockedBySlowVehicle && !this.isChangingLane && this.laneChangeCooldown <= 0) {
      const candidateLane = (this.currentLane === 0) ? 1 : 0;
      // Check if adjacent lane is clear
      let adjacentLaneClear = true;
      const candidateOffset = (candidateLane === 1) ? -2.6 : 0;

      for (let i = 0; i < allCars.length; i++) {
        const other = allCars[i];
        if (other === this) continue;

        const toOther = new THREE.Vector3().subVectors(other.position, this.position);
        toOther.y = 0;
        const forwardDist = toOther.dot(forwardVec);
        const otherLateral = toOther.dot(rightVec);

        // Check if car exists in candidate lane within gap [-6m, +16m]
        const distToCandidateLane = Math.abs(otherLateral - (candidateOffset - this.lateralOffset));
        if (distToCandidateLane < 2.0 && forwardDist > -6.0 && forwardDist < 16.0) {
          adjacentLaneClear = false;
          break;
        }
      }

      if (adjacentLaneClear) {
        this.changeLane(candidateLane);
      }
    }

    // 4. Calculate Desired Speed
    let desiredSpeed = this.targetSpeed * corneringSpeedFactor;

    if (emergencyStop) {
      desiredSpeed = 0;
    } else if (shouldBrake) {
      if (this.isStoppedAtRedLight) {
        desiredSpeed = 0;
      } else if (leadingCarDistance < 15.0) {
        // Match or stay slightly below leading car speed
        desiredSpeed = Math.min(desiredSpeed, Math.max(0, leadingCarSpeed * 0.85));
      } else {
        desiredSpeed = Math.min(desiredSpeed, 3.0);
      }
    }

    // Damp speed realistically
    const accelRate = shouldBrake ? (emergencyStop ? 12.0 : 6.0) : 2.8;
    this.speed = MathUtils.damp(this.speed, desiredSpeed, accelRate, dt);
    if (this.speed < 0.08) this.speed = 0;

    // Detect if car is stuck
    if (this.speed < 0.5 && !this.isStoppedAtRedLight) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 12.0) {
        // Reposition to next waypoint to unjam
        this.selectNextWaypoint();
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }

    // 5. Apply Movement to 3D Transform
    const moveStep = this.speed * dt;
    this.position.x += Math.sin(this.heading) * moveStep;
    this.position.z += Math.cos(this.heading) * moveStep;

    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;

    // 6. Update Visual Indicators & Taillights
    this.isBraking = shouldBrake || (this.speed < 0.8 && desiredSpeed === 0);
    const brakeColor = this.isBraking ? 0xff1515 : 0x440000;
    for (let i = 0; i < this.taillights.length; i++) {
      this.taillights[i].material.color.setHex(brakeColor);
    }

    // Blinker flash logic
    if (this.turnSignal !== 'none') {
      this.blinkerTimer += dt;
      if (this.blinkerTimer >= 0.35) {
        this.blinkerTimer = 0;
        this.blinkerState = !this.blinkerState;
      }
    } else {
      this.blinkerState = false;
      this.blinkerTimer = 0;
    }

    const amberActive = 0xff9900;
    const amberOff = 0x331c00;

    const leftColor = (this.turnSignal === 'left' && this.blinkerState) ? amberActive : amberOff;
    for (let i = 0; i < this.indicatorLeftLights.length; i++) {
      this.indicatorLeftLights[i].material.color.setHex(leftColor);
    }

    const rightColor = (this.turnSignal === 'right' && this.blinkerState) ? amberActive : amberOff;
    for (let i = 0; i < this.indicatorRightLights.length; i++) {
      this.indicatorRightLights[i].material.color.setHex(rightColor);
    }
  }

  destroy() {
    if (this.group && this.group.parent) {
      this.group.parent.remove(this.group);
    }

    // Dispose geometries & materials
    this.group.traverse(child => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  setNightMode(isNight) {
    if (this.headlights && this.headlights.length > 0) {
      const col = isNight ? 0xffffff : 0x555555;
      this.headlights.forEach(hl => {
        if (hl.material) hl.material.color.setHex(col);
      });
    }
  }
}
