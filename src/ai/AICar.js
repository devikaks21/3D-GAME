import * as THREE from 'three';
import { MathUtils } from '../utilities/MathUtils.js';

/**
 * Autonomous AI vehicle navigating open-world roads
 */
export class AICar {
  constructor(scene, waypoints, startIdx = 0, color = 0x3366cc) {
    this.scene = scene;
    this.waypoints = waypoints;
    this.currentWpIndex = startIdx;

    this.group = new THREE.Group();
    this.speed = 0;
    this.targetSpeed = MathUtils.randomRange(30, 48) / 3.6; // ~30-48 km/h in m/s
    this.heading = 0;

    this.position = new THREE.Vector3().copy(this.waypoints[this.currentWpIndex]);
    this.position.y = 0.35;
    this.group.position.copy(this.position);

    this.taillights = [];
    this.buildModel(color);
    this.scene.add(this.group);
  }

  buildModel(color) {
    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.25 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.1, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 });

    // Chassis body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 4.2), bodyMat);
    body.position.y = 0.35;
    body.castShadow = true;
    this.group.add(body);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 2.0), glassMat);
    cabin.position.set(0, 0.75, -0.2);
    this.group.add(cabin);

    // Headlights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), hlMat);
    hlL.position.set(0.65, 0.4, 2.1);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), hlMat);
    hlR.position.set(-0.65, 0.4, 2.1);
    this.group.add(hlL, hlR);

    // Taillights
    const tlMat = new THREE.MeshBasicMaterial({ color: 0x660000 });
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.05), tlMat);
    tlL.position.set(0.65, 0.45, -2.1);
    const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.05), tlMat);
    tlR.position.set(-0.65, 0.45, -2.1);
    this.group.add(tlL, tlR);
    this.taillights = [tlL, tlR];

    // Wheels
    [-0.9, 0.9].forEach(x => {
      [-1.3, 1.3].forEach(z => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 12), tireMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.34, z);
        this.group.add(wheel);
      });
    });
  }

  update(dt, playerPosition, trafficLightState) {
    if (this.waypoints.length === 0) return;

    const targetWp = this.waypoints[this.currentWpIndex];
    const toTarget = new THREE.Vector3().subVectors(targetWp, this.position);
    toTarget.y = 0;
    const distToWp = toTarget.length();

    // Advance to next waypoint if close
    if (distToWp < 5.0) {
      this.currentWpIndex = (this.currentWpIndex + 1) % this.waypoints.length;
    }

    // Target heading
    const desiredHeading = Math.atan2(toTarget.x, toTarget.z);
    this.heading = MathUtils.lerpAngle(this.heading, desiredHeading, 3.5 * dt);

    // Distance to player car (brake if player is in front)
    let shouldBrake = false;
    if (playerPosition) {
      const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
      const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
      const distToPlayer = toPlayer.length();
      const dot = forward.dot(toPlayer.normalize());

      if (distToPlayer < 12.0 && dot > 0.6) {
        shouldBrake = true;
      }
    }

    // Traffic light compliance
    if (trafficLightState === 'red') {
      // Check if near an intersection
      const nearIntersection = (Math.abs(this.position.x % 90) < 14) && (Math.abs(this.position.z % 90) < 14);
      if (nearIntersection) shouldBrake = true;
    }

    // Accelerate / Decelerate
    const target = shouldBrake ? 0 : this.targetSpeed;
    this.speed = MathUtils.damp(this.speed, target, shouldBrake ? 8 : 2.5, dt);

    // Move forward
    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.position.addScaledVector(forward, this.speed * dt);
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;

    // Brake lights
    const isBraking = shouldBrake || this.speed < 1;
    this.taillights.forEach(t => t.material.color.setHex(isBraking ? 0xff0000 : 0x550000));
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
