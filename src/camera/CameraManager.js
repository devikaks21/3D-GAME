import * as THREE from 'three';
import { MathUtils } from '../utilities/MathUtils.js';

export const CameraModes = {
  CHASE: 'chase',             // Camera 1: Third-person chase camera
  CLOSE_CHASE: 'close_chase', // Camera 2: Closer third-person camera
  COCKPIT: 'cockpit',         // Camera 3: Cockpit/interior camera
  REAR: 'rear',               // Camera 4: Rear camera
  FREE: 'free',               // Camera 5: Free/inspection camera

  // Backward compatibility & aliases
  ORBIT: 'free',
  INSPECTION: 'free',
  INTERIOR: 'cockpit',
  HOOD: 'hood',
  BUMPER: 'bumper',
  SHOWROOM: 'showroom'
};

export class CameraManager {
  constructor(camera, domElement, inputManager) {
    this.camera = camera;
    this.domElement = domElement;
    this.inputManager = inputManager;

    this.mode = CameraModes.CHASE;
    this.availableModes = [
      CameraModes.CHASE,
      CameraModes.CLOSE_CHASE,
      CameraModes.COCKPIT,
      CameraModes.REAR,
      CameraModes.FREE
    ];
    this.modeIndex = 0;

    // Camera smoothing positions
    this.currentPosition = new THREE.Vector3(0, 5, -10);
    this.currentTarget = new THREE.Vector3(0, 1, 0);

    // Smooth switching transition state
    this.isTransitioning = false;
    this.transitionProgress = 1.0;
    this.transitionDuration = 0.45; // 450ms smooth transition window
    this.prevCamPos = new THREE.Vector3(0, 5, -10);
    this.prevLookTarget = new THREE.Vector3(0, 1, 0);

    // Showroom turntable angle
    this.showroomAngle = 0;
    this.showroomDistance = 6.2;
    this.showroomHeight = 1.6;

    // Orbit parameters
    this.orbitDistance = 6.5;

    // Dynamic FOV
    this.baseFov = 65;

    // Setup input bindings for camera cycling & direct selection
    if (this.inputManager && typeof this.inputManager.onAction === 'function') {
      this.inputManager.onAction('toggleCamera', () => {
        this.cycleCamera();
      });
      this.inputManager.onAction('camera1', () => this.setCameraByIndex(1));
      this.inputManager.onAction('camera2', () => this.setCameraByIndex(2));
      this.inputManager.onAction('camera3', () => this.setCameraByIndex(3));
      this.inputManager.onAction('camera4', () => this.setCameraByIndex(4));
      this.inputManager.onAction('camera5', () => this.setCameraByIndex(5));
    }
  }

  cycleCamera() {
    this.modeIndex = (this.modeIndex + 1) % this.availableModes.length;
    this.setMode(this.availableModes[this.modeIndex]);
    return this.mode;
  }

  setCameraByIndex(index) {
    const idx = parseInt(index, 10);
    switch (idx) {
      case 1:
        return this.setMode(CameraModes.CHASE);
      case 2:
        return this.setMode(CameraModes.CLOSE_CHASE);
      case 3:
        return this.setMode(CameraModes.COCKPIT);
      case 4:
        return this.setMode(CameraModes.REAR);
      case 5:
        return this.setMode(CameraModes.FREE);
      default:
        return this.setMode(CameraModes.CHASE);
    }
  }

  getCameraIndex() {
    switch (this.mode) {
      case CameraModes.CHASE: return 1;
      case CameraModes.CLOSE_CHASE: return 2;
      case CameraModes.COCKPIT: return 3;
      case CameraModes.REAR: return 4;
      case CameraModes.FREE:
      case CameraModes.ORBIT:
      case CameraModes.INSPECTION: return 5;
      default: return 1;
    }
  }

  getCameraModeName() {
    switch (this.mode) {
      case CameraModes.CHASE: return 'CHASE (1)';
      case CameraModes.CLOSE_CHASE: return 'CLOSE CHASE (2)';
      case CameraModes.COCKPIT: return 'COCKPIT (3)';
      case CameraModes.REAR: return 'REAR VIEW (4)';
      case CameraModes.FREE:
      case CameraModes.ORBIT:
      case CameraModes.INSPECTION: return 'FREE INSPECT (5)';
      default: return String(this.mode).replace('_', ' ').toUpperCase();
    }
  }

  setMode(mode) {
    if (this.mode === mode) return this.mode;

    // Capture previous state for smooth continuous camera transition
    this.prevCamPos.copy(this.currentPosition);
    this.prevLookTarget.copy(this.currentTarget);
    this.transitionProgress = 0.0;
    this.isTransitioning = true;

    this.mode = mode;
    const idx = this.availableModes.indexOf(mode);
    if (idx !== -1) {
      this.modeIndex = idx;
    }
    return this.mode;
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

    // Dynamic FOV kicks out slightly at high speeds
    const targetFov = this.baseFov + Math.min(18, (speedKmh / 280) * 18);
    this.camera.fov = MathUtils.damp(this.camera.fov, targetFov, 4, dt);
    this.camera.updateProjectionMatrix();

    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const up = new THREE.Vector3(0, 1, 0);

    let targetCamPos = new THREE.Vector3();
    let lookTarget = new THREE.Vector3();

    switch (this.mode) {
      // Camera 1: Third-person chase camera
      case CameraModes.CHASE: {
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

      // Camera 2: Closer third-person camera
      case CameraModes.CLOSE_CHASE: {
        const baseDist = 3.9;
        const baseHeight = 1.42;
        const lookHeight = 0.85;

        const distance = baseDist + Math.min(1.2, speedKmh * 0.008);
        const height = baseHeight + Math.min(0.35, speedKmh * 0.002);

        const backVector = forward.clone().multiplyScalar(-distance);
        targetCamPos.copy(carPos).add(backVector).add(new THREE.Vector3(0, height, 0));

        // Look slightly forward over the vehicle hood
        lookTarget.copy(carPos).add(new THREE.Vector3(0, lookHeight, 0)).add(forward.clone().multiplyScalar(5));
        break;
      }

      // Camera 3: Cockpit/interior camera
      case CameraModes.COCKPIT: {
        const baseOffset = camPresets?.cockpit?.offset || new THREE.Vector3(0.38, 0.95, 0.2);
        const offset = baseOffset.clone().applyEuler(new THREE.Euler(0, heading, 0));
        targetCamPos.copy(carPos).add(offset);
        lookTarget.copy(targetCamPos).add(forward.clone().multiplyScalar(22)).add(new THREE.Vector3(0, -0.15, 0));
        break;
      }

      // Camera 4: Rear camera (looking backward)
      case CameraModes.REAR: {
        const rearOffset = new THREE.Vector3(0, 1.25, -0.2).applyEuler(new THREE.Euler(0, heading, 0));
        targetCamPos.copy(carPos).add(rearOffset);
        lookTarget.copy(targetCamPos).sub(forward.clone().multiplyScalar(30)).add(new THREE.Vector3(0, -0.15, 0));
        break;
      }

      // Camera 5: Free/inspection camera
      case CameraModes.FREE:
      case CameraModes.ORBIT: {
        const mouse = (this.inputManager && this.inputManager.mouse) ? this.inputManager.mouse : { yaw: 0, pitch: 0.2 };
        const yaw = mouse.yaw || 0;
        const pitch = mouse.pitch !== undefined ? mouse.pitch : 0.2;
        const dist = camPresets?.orbit?.distance || this.orbitDistance;
        const heightOffset = camPresets?.orbit?.height || 1.25;

        targetCamPos.set(
          carPos.x + Math.sin(yaw) * Math.cos(pitch) * dist,
          carPos.y + Math.sin(pitch) * dist + heightOffset,
          carPos.z + Math.cos(yaw) * Math.cos(pitch) * dist
        );
        lookTarget.copy(carPos).add(new THREE.Vector3(0, heightOffset * 0.65, 0));
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

      default: {
        targetCamPos.copy(carPos).add(forward.clone().multiplyScalar(-6.2)).add(new THREE.Vector3(0, 2.05, 0));
        lookTarget.copy(carPos).add(new THREE.Vector3(0, 0.9, 0)).add(forward.clone().multiplyScalar(6));
        break;
      }
    }

    // Smooth transition between camera modes
    if (this.isTransitioning) {
      this.transitionProgress += dt / this.transitionDuration;
      if (this.transitionProgress >= 1.0) {
        this.transitionProgress = 1.0;
        this.isTransitioning = false;
      }

      // Smooth damped interpolation during transition
      const transitionSmoothing = 12.0;
      this.currentPosition.lerp(targetCamPos, 1 - Math.exp(-transitionSmoothing * dt));
      this.currentTarget.lerp(lookTarget, 1 - Math.exp(-transitionSmoothing * dt));
    } else {
      // Normal continuous trailing interpolation
      const smoothing = (this.mode === CameraModes.COCKPIT) ? 22 : 9.5;
      this.currentPosition.lerp(targetCamPos, 1 - Math.exp(-smoothing * dt));
      this.currentTarget.lerp(lookTarget, 1 - Math.exp(-smoothing * dt));
    }

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }

  updateShowroom(physics, dt) {
    this.showroomAngle += dt * 0.35;

    // Allow user to mouse drag around the car in showroom/garage
    if (this.inputManager && this.inputManager.mouse && this.inputManager.mouse.isDown) {
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
