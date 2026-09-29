import * as THREE from 'three';
import { AICar } from '../ai/AICar.js';
import { MathUtils } from '../utilities/MathUtils.js';

/**
 * Manages autonomous vehicle traffic loops across the city
 */
export class TrafficManager {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    this.spawnRoutes();
  }

  spawnRoutes() {
    // Road lane loops around downtown blocks
    const routes = [
      // Outer City Ring Loop
      [
        new THREE.Vector3(180, 0, -180),
        new THREE.Vector3(180, 0, 180),
        new THREE.Vector3(-180, 0, 180),
        new THREE.Vector3(-180, 0, -180)
      ],
      // Main Avenue North-South loop
      [
        new THREE.Vector3(5, 0, -220),
        new THREE.Vector3(5, 0, 220),
        new THREE.Vector3(-90, 0, 220),
        new THREE.Vector3(-90, 0, -220)
      ],
      // East-West Central cross loop
      [
        new THREE.Vector3(-220, 0, -5),
        new THREE.Vector3(220, 0, -5),
        new THREE.Vector3(220, 0, 90),
        new THREE.Vector3(-220, 0, 90)
      ]
    ];

    const carColors = [0x2b5c8f, 0xc4302b, 0x3d4147, 0xdfdfdf, 0xc98a1c, 0x1d7a46];

    routes.forEach(route => {
      // Spawn 2 to 3 cars per route at staggered waypoints
      for (let i = 0; i < route.length; i++) {
        const color = MathUtils.randomChoice(carColors);
        const car = new AICar(this.scene, route, i, color);
        this.cars.push(car);
      }
    });
  }

  update(dt, playerPosition, trafficLightState) {
    this.cars.forEach(car => {
      car.update(dt, playerPosition, trafficLightState);
    });
  }

  getTrafficPositions() {
    return this.cars.map(c => ({
      x: c.position.x,
      z: c.position.z,
      heading: c.heading
    }));
  }

  clear() {
    this.cars.forEach(c => c.destroy());
    this.cars = [];
  }
}
