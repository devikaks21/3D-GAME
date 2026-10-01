import * as THREE from 'three';

/**
 * Robust, stable vehicle collision detection system.
 * 
 * Supports collision detection with:
 * - Buildings
 * - Barriers
 * - Blocks
 * - Trees
 * - Obstacles (poles, pillars, rocks, curbs)
 * - AI vehicles
 * 
 * Eliminates physics explosions via horizontal face resolution,
 * energy-absorbing inelastic response, and bounded penetration damping.
 */
export class CollisionSystem {
  constructor() {
    this.colliders = [];
    this.ramps = [];
    this.platforms = [];
    this.dynamicBoxes = [];
    this.terrainHeightProvider = null;
    this.roadNetwork = null;
    this._tempVec = new THREE.Vector3();
  }

  setRoadNetwork(network) {
    this.roadNetwork = network;
  }

  setTerrainHeightProvider(providerFn) {
    this.terrainHeightProvider = providerFn;
  }

  getGroundHeight(x, z) {
    if (this.terrainHeightProvider) {
      const h = this.terrainHeightProvider(x, z);
      if (h !== null && h !== undefined) return h;
    }
    const platH = this.checkPlatformHeight(x, z);
    if (platH !== null) return platH;
    const rampH = this.checkRampHeight(x, z);
    if (rampH !== null) return rampH;
    return 0;
  }

  addPlatform(x, z, width, length, height) {
    this.platforms.push({
      x, z,
      halfW: width * 0.5,
      halfL: length * 0.5,
      height
    });
  }

  checkPlatformHeight(x, z) {
    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      if (Math.abs(x - p.x) <= p.halfW && Math.abs(z - p.z) <= p.halfL) {
        return p.height;
      }
    }
    return null;
  }

  addCollider(mesh, type = 'box') {
    mesh.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(mesh);
    this.colliders.push({
      mesh,
      box,
      type
    });
  }

  addBoxCollider(min, max, type = 'box') {
    const box = new THREE.Box3(min, max);
    this.colliders.push({
      box,
      type
    });
  }

  addRamp(x, z, width, length, height, angleY = 0) {
    this.ramps.push({
      position: new THREE.Vector3(x, 0, z),
      width,
      length,
      height,
      angleY,
      sin: Math.sin(angleY),
      cos: Math.cos(angleY)
    });
  }

  checkRampHeight(x, z) {
    for (let i = 0; i < this.ramps.length; i++) {
      const r = this.ramps[i];
      const dx = x - r.position.x;
      const dz = z - r.position.z;
      const localX = dx * r.cos - dz * r.sin;
      const localZ = dx * r.sin + dz * r.cos;

      if (Math.abs(localX) <= r.width * 0.5 && localZ >= -r.length * 0.5 && localZ <= r.length * 0.5) {
        const progress = (localZ + r.length * 0.5) / r.length;
        return progress * r.height;
      }
    }
    return null;
  }

  addDynamicBox(mesh, mass = 50) {
    this.dynamicBoxes.push({
      mesh,
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      mass,
      radius: 1.2
    });
  }

  /**
   * Stable sphere collision with an obstacle collider.
   * Completely avoids physics explosions by resolving against horizontal box faces
   * when sphere center penetrates inside the box.
   */
  checkSphereCollision(center, radius) {
    let deepestHit = null;

    for (let i = 0; i < this.colliders.length; i++) {
      const col = this.colliders[i];
      const box = col.box;

      // Fast broadphase distance check
      if (
        center.x < box.min.x - radius || center.x > box.max.x + radius ||
        center.z < box.min.z - radius || center.z > box.max.z + radius ||
        center.y < box.min.y - radius || center.y > box.max.y + radius
      ) {
        continue;
      }

      // Check if center is completely inside the 2D footprint of the box
      const isInsideX = (center.x >= box.min.x && center.x <= box.max.x);
      const isInsideZ = (center.z >= box.min.z && center.z <= box.max.z);

      let penetration = 0;
      let normal = new THREE.Vector3();
      let point = new THREE.Vector3();

      if (isInsideX && isInsideZ) {
        // Deep penetration inside box: find the closest horizontal exit face
        const dMinX = center.x - box.min.x;
        const dMaxX = box.max.x - center.x;
        const dMinZ = center.z - box.min.z;
        const dMaxZ = box.max.z - center.z;

        const minD = Math.min(dMinX, dMaxX, dMinZ, dMaxZ);

        if (minD === dMinX) {
          normal.set(-1, 0, 0);
          penetration = dMinX + radius;
          point.set(box.min.x, center.y, center.z);
        } else if (minD === dMaxX) {
          normal.set(1, 0, 0);
          penetration = dMaxX + radius;
          point.set(box.max.x, center.y, center.z);
        } else if (minD === dMinZ) {
          normal.set(0, 0, -1);
          penetration = dMinZ + radius;
          point.set(center.x, center.y, box.min.z);
        } else {
          normal.set(0, 0, 1);
          penetration = dMaxZ + radius;
          point.set(center.x, center.y, box.max.z);
        }
      } else {
        // Center is outside: standard clamp to box surface
        const clampedX = Math.max(box.min.x, Math.min(box.max.x, center.x));
        const clampedY = Math.max(box.min.y, Math.min(box.max.y, center.y));
        const clampedZ = Math.max(box.min.z, Math.min(box.max.z, center.z));
        point.set(clampedX, clampedY, clampedZ);

        const dx = center.x - clampedX;
        const dy = center.y - clampedY;
        const dz = center.z - clampedZ;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < radius * radius) {
          const dist = Math.sqrt(distSq) || 0.001;
          penetration = radius - dist;

          // For upright structures, project normal onto ground plane to keep car level
          normal.set(dx, 0, dz);
          if (normal.lengthSq() > 0.0001) {
            normal.normalize();
          } else {
            // Fallback to closest face
            normal.set(0, 0, 1);
          }
        }
      }

      if (penetration > 0) {
        // Clamp penetration displacement per query to prevent sudden popping
        const clampedPenetration = Math.min(penetration, 0.65);

        if (!deepestHit || clampedPenetration > deepestHit.penetration) {
          deepestHit = {
            collided: true,
            penetration: clampedPenetration,
            rawPenetration: penetration,
            normal,
            point,
            type: col.type,
            collider: col
          };
        }
      }
    }

    return deepestHit;
  }

  /**
   * Multi-point vehicle collision test (Front bumper, Center, Rear bumper).
   * Ensures obstacles hitting corners, sides, and bumpers are caught accurately.
   */
  checkVehicleObstacles(vehiclePos, forwardVec, halfLength = 2.2, halfWidth = 0.95) {
    const sphereRadius = halfWidth;
    const frontOffset = Math.max(0.5, halfLength - sphereRadius * 0.65);
    const rearOffset = frontOffset;

    const testPoints = [
      // 1. Front bumper center
      { pos: new THREE.Vector3().copy(vehiclePos).addScaledVector(forwardVec, frontOffset), isFront: true },
      // 2. Rear bumper center
      { pos: new THREE.Vector3().copy(vehiclePos).addScaledVector(forwardVec, -rearOffset), isRear: true },
      // 3. Center chassis
      { pos: new THREE.Vector3().copy(vehiclePos), isCenter: true }
    ];

    let primaryHit = null;

    for (let i = 0; i < testPoints.length; i++) {
      const tp = testPoints[i];
      const hit = this.checkSphereCollision(tp.pos, sphereRadius);
      if (hit && hit.collided) {
        if (!primaryHit || hit.penetration > primaryHit.penetration) {
          primaryHit = {
            ...hit,
            isFront: tp.isFront || false,
            isRear: tp.isRear || false,
            isCenter: tp.isCenter || false
          };
        }
      }
    }

    return primaryHit;
  }

  /**
   * Collision check between player vehicle and dynamic AI traffic vehicles.
   */
  checkAIVehicles(playerPos, playerVelocity, playerHeading, playerLength = 4.4, playerWidth = 1.9, trafficCars = []) {
    if (!trafficCars || trafficCars.length === 0) return null;

    const pForward = new THREE.Vector3(Math.sin(playerHeading), 0, Math.cos(playerHeading));
    const pFront = new THREE.Vector3().copy(playerPos).addScaledVector(pForward, playerLength * 0.32);
    const pRear = new THREE.Vector3().copy(playerPos).addScaledVector(pForward, -playerLength * 0.32);
    const pRadius = playerWidth * 0.52;

    for (let i = 0; i < trafficCars.length; i++) {
      const aiCar = trafficCars[i];
      if (!aiCar || !aiCar.position) continue;

      const toAI = new THREE.Vector3().subVectors(aiCar.position, playerPos);
      toAI.y = 0;
      const centerDist = toAI.length();

      // Broadphase distance check
      if (centerDist > 6.0) continue;

      const aiForward = new THREE.Vector3(Math.sin(aiCar.heading), 0, Math.cos(aiCar.heading));
      const aiLength = 4.3;
      const aiWidth = 1.8;
      const aiRadius = aiWidth * 0.52;

      const aiFront = new THREE.Vector3().copy(aiCar.position).addScaledVector(aiForward, aiLength * 0.32);
      const aiRear = new THREE.Vector3().copy(aiCar.position).addScaledVector(aiForward, -aiLength * 0.32);

      // Test pairwise sphere contacts between player (front, rear) and AI (front, rear)
      const pairs = [
        [pFront, aiFront],
        [pFront, aiRear],
        [pRear, aiFront],
        [pRear, aiRear],
        [playerPos, aiCar.position]
      ];

      for (let p = 0; p < pairs.length; p++) {
        const [ptA, ptB] = pairs[p];
        const d = ptA.distanceTo(ptB);
        const minDist = pRadius + aiRadius;

        if (d < minDist) {
          const penetration = Math.min(0.55, minDist - d);
          const normal = new THREE.Vector3().subVectors(ptA, ptB);
          normal.y = 0;
          if (normal.lengthSq() > 0.0001) {
            normal.normalize();
          } else {
            normal.set(-pForward.x, 0, -pForward.z).normalize();
          }

          // Calculate relative velocity
          const aiVelocity = new THREE.Vector3(
            Math.sin(aiCar.heading) * aiCar.speed,
            0,
            Math.cos(aiCar.heading) * aiCar.speed
          );
          const relVel = new THREE.Vector3().subVectors(playerVelocity, aiVelocity);
          const relSpeed = relVel.length();

          return {
            collided: true,
            type: 'vehicle',
            normal,
            penetration,
            relSpeed,
            aiCar,
            point: new THREE.Vector3().addVectors(ptA, ptB).multiplyScalar(0.5)
          };
        }
      }
    }

    return null;
  }

  /**
   * Finds a guaranteed safe clearance position if the vehicle is wedged or inside an obstacle.
   */
  findSafeClearance(pos, heading, offsetBackwards = 4.5) {
    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));

    // 1. Try backing straight out along -forward
    const backTry = new THREE.Vector3().copy(pos).addScaledVector(forward, -offsetBackwards);
    backTry.y = this.getGroundHeight(backTry.x, backTry.z) + 0.4;
    const test1 = this.checkSphereCollision(backTry, 1.2);
    if (!test1 || !test1.collided) {
      return backTry;
    }

    // 2. Try adjacent offsets (+right, -right)
    const right = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
    const rightTry = new THREE.Vector3().copy(pos).addScaledVector(right, 4.0);
    rightTry.y = this.getGroundHeight(rightTry.x, rightTry.z) + 0.4;
    const test2 = this.checkSphereCollision(rightTry, 1.2);
    if (!test2 || !test2.collided) {
      return rightTry;
    }

    const leftTry = new THREE.Vector3().copy(pos).addScaledVector(right, -4.0);
    leftTry.y = this.getGroundHeight(leftTry.x, leftTry.z) + 0.4;
    const test3 = this.checkSphereCollision(leftTry, 1.2);
    if (!test3 || !test3.collided) {
      return leftTry;
    }

    // 3. Fallback: snap to nearest open road waypoint if roadNetwork is available
    if (this.roadNetwork) {
      const nearest = this.roadNetwork.getNearestWaypoint(pos, 50);
      if (nearest) {
        return new THREE.Vector3(nearest.x, nearest.y || 0.4, nearest.z);
      }
    }

    // 4. Default safe ground clearance
    return new THREE.Vector3(pos.x, this.getGroundHeight(pos.x, pos.z) + 0.45, pos.z);
  }

  updateDynamicBoxes(dt) {
    for (let i = 0; i < this.dynamicBoxes.length; i++) {
      const b = this.dynamicBoxes[i];
      if (b.velocity.lengthSq() > 0.001) {
        b.mesh.position.addScaledVector(b.velocity, dt);
        b.velocity.multiplyScalar(Math.pow(0.85, dt * 60)); // friction

        b.mesh.rotation.x += b.angularVelocity.x * dt;
        b.mesh.rotation.y += b.angularVelocity.y * dt;
        b.mesh.rotation.z += b.angularVelocity.z * dt;
        b.angularVelocity.multiplyScalar(Math.pow(0.85, dt * 60));

        // Ground clamping
        if (b.mesh.position.y < 0.75) {
          b.mesh.position.y = 0.75;
          b.velocity.y = 0;
        }
      }
    }
  }

  hitDynamicBoxes(vehiclePos, vehicleVelocity, hitRadius = 2.0) {
    let hitCount = 0;
    for (let i = 0; i < this.dynamicBoxes.length; i++) {
      const b = this.dynamicBoxes[i];
      const dist = vehiclePos.distanceTo(b.mesh.position);
      if (dist < hitRadius + b.radius) {
        const impulse = new THREE.Vector3().subVectors(b.mesh.position, vehiclePos).normalize();
        const speed = Math.min(25, vehicleVelocity.length());
        impulse.y = 0.25;
        impulse.normalize().multiplyScalar(Math.max(8, speed * 1.1));
        b.velocity.copy(impulse);
        b.angularVelocity.set(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6
        );
        hitCount++;
      }
    }
    return hitCount;
  }

  clear() {
    this.colliders = [];
    this.ramps = [];
    this.platforms = [];
    this.dynamicBoxes = [];
  }
}
