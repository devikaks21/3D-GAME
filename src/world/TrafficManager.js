import * as THREE from 'three';
import { RoadNetwork } from '../ai/RoadNetwork.js';
import { AICar } from '../ai/AICar.js';

/**
 * Traffic density levels and corresponding active vehicle targets
 */
export const TRAFFIC_DENSITIES = {
  low: 6,
  medium: 14,
  high: 24
};

/**
 * TrafficManager
 * 
 * Manages autonomous AI traffic across the city grid and orbital highway.
 * 
 * Features:
 * - Waypoint-based road network navigation.
 * - Dynamic density regulation (Low: 6, Medium: 14, High: 24).
 * - Intelligent proximity-based spawning and despawning around player.
 * - Anti-clumping spawn clearance checks.
 * - Inter-vehicle radar and collision avoidance updates.
 */
export class TrafficManager {
  constructor(scene, initialDensity = 'medium') {
    this.scene = scene;
    this.roadNetwork = new RoadNetwork();
    this.cars = [];

    // Density settings
    this.density = 'medium';
    this.targetCount = TRAFFIC_DENSITIES.medium;
    this.setDensity(initialDensity);

    // Dynamic spawn/despawn radii relative to player
    this.minSpawnRadius = 45; // Do not spawn directly in player camera view
    this.maxSpawnRadius = 160; // Keep traffic active within driving horizon
    this.despawnRadius = 230; // Despawn distant vehicles to preserve performance

    this.spawnCooldown = 0;
    this.isNight = false;
  }

  setDensity(density, playerPosition = null) {
    const key = (density || 'medium').toLowerCase();
    if (TRAFFIC_DENSITIES[key] !== undefined) {
      this.density = key;
      this.targetCount = TRAFFIC_DENSITIES[key];
    } else {
      this.density = 'medium';
      this.targetCount = TRAFFIC_DENSITIES.medium;
    }

    // If current count exceeds target, immediately cull furthest cars
    this.cullExcessVehicles(playerPosition);

    // If current count is less than target, immediately spawn up to target
    while (this.cars.length < this.targetCount) {
      const spawned = this.spawnCar(playerPosition);
      if (!spawned) break;
    }
  }

  getDensity() {
    return this.density;
  }

  cullExcessVehicles(playerPosition = null) {
    if (this.cars.length <= this.targetCount) return;

    if (playerPosition) {
      // Sort by distance to player descending so furthest cars are culled first
      this.cars.sort((a, b) => {
        const da = a.position.distanceToSquared(playerPosition);
        const db = b.position.distanceToSquared(playerPosition);
        return db - da;
      });
    }

    while (this.cars.length > this.targetCount) {
      const car = this.cars.pop();
      if (car) car.destroy();
    }
  }

  spawnCar(playerPosition = null) {
    if (this.cars.length >= this.targetCount) return false;

    let candidateWaypoints = [];

    if (playerPosition) {
      // Find connected waypoints in the ring around player [minSpawnRadius, maxSpawnRadius]
      candidateWaypoints = this.roadNetwork.getWaypointsInRadius(
        playerPosition,
        this.minSpawnRadius,
        this.maxSpawnRadius
      );
    }

    if (candidateWaypoints.length === 0) {
      candidateWaypoints = this.roadNetwork.getAllWaypoints();
    }

    if (candidateWaypoints.length === 0) return false;

    // Shuffle candidates
    const shuffled = [...candidateWaypoints].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i++) {
      const wp = shuffled[i];

      // Verify safe distance from player (> minSpawnRadius)
      if (playerPosition) {
        const dxP = wp.x - playerPosition.x;
        const dzP = wp.z - playerPosition.z;
        if ((dxP * dxP + dzP * dzP) < (this.minSpawnRadius * this.minSpawnRadius)) {
          continue;
        }
      }

      // Verify safe distance from existing AI cars (> 12m)
      const tooCloseToCar = this.cars.some(c => {
        const dx = c.position.x - wp.x;
        const dz = c.position.z - wp.z;
        return (dx * dx + dz * dz) < (12 * 12);
      });

      if (!tooCloseToCar) {
        const car = new AICar(this.scene, this.roadNetwork, wp.id);
        if (this.isNight && typeof car.setNightMode === 'function') {
          car.setNightMode(true);
        }
        this.cars.push(car);
        return true;
      }
    }

    return false;
  }

  update(dt, playerPosition, trafficLightState) {
    const pPos = playerPosition ? new THREE.Vector3(playerPosition.x, 0, playerPosition.z) : null;

    // 1. Update all active AI vehicles with collision avoidance array
    for (let i = 0; i < this.cars.length; i++) {
      this.cars[i].update(dt, pPos, trafficLightState, this.cars);
    }

    // 2. Intelligent despawn check for distant vehicles
    if (pPos) {
      const maxDistSq = this.despawnRadius * this.despawnRadius;
      for (let i = this.cars.length - 1; i >= 0; i--) {
        const car = this.cars[i];
        const dx = car.position.x - pPos.x;
        const dz = car.position.z - pPos.z;
        const distSq = dx * dx + dz * dz;

        // Despawn if beyond radius OR if we have excess vehicles
        if (distSq > maxDistSq || this.cars.length > this.targetCount) {
          car.destroy();
          this.cars.splice(i, 1);
        }
      }
    }

    // 3. Intelligent spawn check: Replenish cars up to target density count
    if (this.cars.length < this.targetCount) {
      this.spawnCooldown += dt;
      if (this.spawnCooldown >= 0.4) {
        this.spawnCar(pPos);
        this.spawnCooldown = 0;
      }
    } else {
      this.spawnCooldown = 0;
    }
  }

  getTrafficPositions() {
    return this.cars.map(c => ({
      x: c.position.x,
      z: c.position.z,
      heading: c.heading,
      speed: c.speed,
      modelType: c.modelType
    }));
  }

  clear() {
    for (let i = 0; i < this.cars.length; i++) {
      this.cars[i].destroy();
    }
    this.cars = [];
  }

  setNightMode(isNight) {
    this.isNight = !!isNight;
    for (let i = 0; i < this.cars.length; i++) {
      if (typeof this.cars[i].setNightMode === 'function') {
        this.cars[i].setNightMode(this.isNight);
      }
    }
  }
}
