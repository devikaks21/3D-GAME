import * as THREE from 'three';
import { MathUtils } from '../utilities/MathUtils.js';

export const CameraModes = {
  CHASE: 'chase',
  COCKPIT: 'cockpit',
  HOOD: 'hood',
  BUMPER: 'bumper',
  ORBIT: 'orbit',
  SHOWROOM: 'showroom'
};

export class CameraManager {
  constructor(camera, domElement, inputManager) {
    this.camera = camera;
    this.domElement = domElement;
    this.inputManager = inputManager;

    this.mode = CameraModes.SHOWROOM;
    this.availableModes = [
      CameraModes.CHASE,
      CameraModes.COCKPIT,
      CameraModes.HOOD,
      CameraModes.BUMPER,
      CameraModes.ORBIT
    ];
    this.modeIndex = 0;

    // Camera smoothing positions
    this.currentPosition = new THREE.Vector3(0, 5, -10);
    this.currentTarget = new THREE.Vector3(0, 1, 0);

    // Showroom turntable angle
    this.showroomAngle = 0;
    this.showroomDistance = 6.2;
    this.showroomHeight = 1.6;

    // Orbit parameters
    this.orbitDistance = 7.0;

    // Dynamic FOV
    this.baseFov = 65;

    this.inputManager.onAction('toggleCamera', () => {
      this.cycleCamera();
    });
  }

  cycleCamera() {
    this.modeIndex = (this.modeIndex + 1) % this.availableModes.length;
    this.mode = this.availableModes[this.modeIndex];
    return this.mode;
  }

  setMode(mode) {
    this.mode = mode;
    const idx = this.availableModes.indexOf(mode);
    if (idx !== -1) this.modeIndex = idx;
  }

  update(physics, dt, vehicle = null) {
    if (this.mode === CameraModes.SHOWROOM) {
      this.updateShowroom(physics, dt);
      return;
    }

    if (!physics) return;

    const car = vehicle || physics.vehicle || this.targetVehicle;
    const camPresets = car?.camera || null;

    const carPos = physics.position;
    const heading = physics.heading;
    const speedKmh = Math.abs(physics.speedKmh);

    // Dynamic FOV kicks out at high speeds
    const targetFov = this.baseFov + Math.min(22, (speedKmh / 280) * 22);
    this.camera.fov = MathUtils.damp(this.camera.fov, targetFov, 4, dt);
    this.camera.updateProjectionMatrix();

    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const up = new THREE.Vector3(0, 1, 0);

    let targetCamPos = new THREE.Vector3();
    let lookTarget = new THREE.Vector3();

    switch (this.mode) {
      case CameraModes.COCKPIT: {
        // Positioned inside driver's seat based on vehicle geometry
        const baseOffset = camPresets?.cockpit?.offset || new THREE.Vector3(0.38, 0.95, 0.2);
        const offset = baseOffset.clone().applyEuler(new THREE.Euler(0, heading, 0));
        targetCamPos.copy(carPos).add(offset);
        lookTarget.copy(targetCamPos).add(forward.clone().multiplyScalar(20)).add(new THREE.Vector3(0, -0.2, 0));
        break;
      }

      case CameraModes.HOOD: {
        const baseOffset = camPresets?.hood?.offset || new THREE.Vector3(0, 0.85, 1.3);
        const offset = baseOffset.clone().applyEuler(new THREE.Euler(0, heading, 0));
        targetCamPos.copy(carPos).add(offset);
        lookTarget.copy(targetCamPos).add(forward.clone().multiplyScalar(30));
        break;
      }

      case CameraModes.BUMPER: {
        const baseOffset = camPresets?.bumper?.offset || new THREE.Vector3(0, 0.35, 2.2);
        const offset = baseOffset.clone().applyEuler(new THREE.Euler(0, heading, 0));
        targetCamPos.copy(carPos).add(offset);
        lookTarget.copy(targetCamPos).add(forward.clone().multiplyScalar(30));
        break;
      }

      case CameraModes.ORBIT: {
        const yaw = this.inputManager.mouse.yaw;
        const pitch = this.inputManager.mouse.pitch;
        const dist = camPresets?.orbit?.distance || this.orbitDistance;
        const heightOffset = camPresets?.orbit?.height || 1.2;

        targetCamPos.set(
          carPos.x + Math.sin(yaw) * Math.cos(pitch) * dist,
          carPos.y + Math.sin(pitch) * dist + heightOffset,
          carPos.z + Math.cos(yaw) * Math.cos(pitch) * dist
        );
        lookTarget.copy(carPos).add(new THREE.Vector3(0, heightOffset * 0.7, 0));
        break;
      }

      case CameraModes.CHASE:
      default: {
        // Trailing spring-arm chase camera tuned per vehicle dimensions
        const baseDist = camPresets?.chase?.distance || 6.2;
        const baseHeight = camPresets?.chase?.height || 2.05;
        const lookHeight = camPresets?.chase?.lookHeight || 0.9;

        const distance = baseDist + Math.min(2.5, speedKmh * 0.015);
        const height = baseHeight + Math.min(0.6, speedKmh * 0.003);

        const backVector = forward.clone().multiplyScalar(-distance);
        targetCamPos.copy(carPos).add(backVector).add(new THREE.Vector3(0, height, 0));

        // Look ahead of vehicle
        lookTarget.copy(carPos).add(new THREE.Vector3(0, lookHeight, 0)).add(forward.clone().multiplyScalar(6));
        break;
      }
    }

    // Smooth position interpolation (stiffer for hood/cockpit, smoother for chase)
    const smoothing = (this.mode === CameraModes.COCKPIT || this.mode === CameraModes.HOOD) ? 22 : 9;
    this.currentPosition.lerp(targetCamPos, 1 - Math.exp(-smoothing * dt));
    this.currentTarget.lerp(lookTarget, 1 - Math.exp(-smoothing * dt));

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }

  updateShowroom(physics, dt) {
    this.showroomAngle += dt * 0.35;

    // Allow user to mouse drag around the car in showroom/garage
    if (this.inputManager.mouse.isDown) {
      this.showroomAngle = this.inputManager.mouse.yaw;
      this.showroomHeight = MathUtils.clamp(1.2 + this.inputManager.mouse.pitch * 2.0, 0.4, 4.0);
    }

    const targetPos = physics ? physics.position : new THREE.Vector3(0, 0.4, 0);

    const camX = targetPos.x + Math.sin(this.showroomAngle) * this.showroomDistance;
    const camZ = targetPos.z + Math.cos(this.showroomAngle) * this.showroomDistance;
    const camY = targetPos.y + this.showroomHeight;

    this.currentPosition.lerp(new THREE.Vector3(camX, camY, camZ), 1 - Math.exp(-6 * dt));
    this.currentTarget.lerp(new THREE.Vector3(targetPos.x, targetPos.y + 0.6, targetPos.z), 1 - Math.exp(-6 * dt));

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }
}
