import * as THREE from 'three';

/**
 * Fast collision system for obstacles, barriers, ramps and dynamic objects
 */
export class CollisionSystem {
  constructor() {
    this.colliders = [];
    this.ramps = [];
    this.platforms = [];
    this.dynamicBoxes = [];
    this.terrainHeightProvider = null;
    this._tempBox = new THREE.Box3();
    this._tempRay = new THREE.Ray();
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

  addBoxCollider(min, max) {
    const box = new THREE.Box3(min, max);
    this.colliders.push({
      box,
      type: 'box'
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

  addDynamicBox(mesh, mass = 50) {
    this.dynamicBoxes.push({
      mesh,
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      mass,
      radius: 1.2
    });
  }

  checkRampHeight(x, z) {
    for (let i = 0; i < this.ramps.length; i++) {
      const r = this.ramps[i];
      // Local coordinate conversion
      const dx = x - r.position.x;
      const dz = z - r.position.z;
      const localX = dx * r.cos - dz * r.sin;
      const localZ = dx * r.sin + dz * r.cos;

      if (Math.abs(localX) <= r.width * 0.5 && localZ >= -r.length * 0.5 && localZ <= r.length * 0.5) {
        // Linear slope along length
        const progress = (localZ + r.length * 0.5) / r.length;
        return progress * r.height;
      }
    }
    return null;
  }

  checkSphereCollision(center, radius) {
    for (let i = 0; i < this.colliders.length; i++) {
      const col = this.colliders[i];
      const clamped = new THREE.Vector3(
        Math.max(col.box.min.x, Math.min(col.box.max.x, center.x)),
        Math.max(col.box.min.y, Math.min(col.box.max.y, center.y)),
        Math.max(col.box.min.z, Math.min(col.box.max.z, center.z))
      );
      const distSq = center.distanceToSquared(clamped);
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq) || 0.001;
        const penetration = radius - dist;
        const normal = new THREE.Vector3().subVectors(center, clamped).normalize();
        if (normal.lengthSq() < 0.001) normal.set(0, 1, 0);
        return {
          collided: true,
          penetration,
          normal,
          point: clamped
        };
      }
    }
    return null;
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
        const speed = vehicleVelocity.length();
        impulse.y = 0.35;
        impulse.normalize().multiplyScalar(Math.max(15, speed * 1.5));
        b.velocity.copy(impulse);
        b.angularVelocity.set(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
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
