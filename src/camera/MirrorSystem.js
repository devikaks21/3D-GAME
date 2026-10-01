import * as THREE from 'three';

/**
 * MirrorSystem
 * 
 * Provides performant, simplified render texture reflections for:
 * - Left side mirror
 * - Right side mirror
 * - Interior rear-view mirror
 * 
 * Performance Design:
 * 1. Ultra-compact, low-resolution render target (256x128).
 * 2. Throttled frame updates (updates every 2 frames) so main 60 FPS is unaffected.
 * 3. Shadow mapping disabled during mirror render pass.
 * 4. Graceful headless/fallback mode for Node.js test environments.
 */
export class MirrorSystem {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;

    this.width = 256;
    this.height = 128;
    this.renderTarget = null;
    this.mirrorCamera = null;
    this.material = null;

    this.updateInterval = 2; // Throttled: render every 2 frames (30fps on 60fps display)
    this.frameCount = 0;
    this.enabled = true;

    this.init();
  }

  init() {
    // Only instantiate WebGL render target if WebGL renderer is available
    if (typeof THREE.WebGLRenderTarget === 'function' && this.renderer && this.renderer.domElement) {
      try {
        this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          depthBuffer: true,
          stencilBuffer: false
        });

        // Mirror camera: wide rearward FOV (75 degrees)
        this.mirrorCamera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.25, 250);

        // Optically correct reflection: horizontally flip texture
        const texture = this.renderTarget.texture;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.repeat.x = -1;

        this.material = new THREE.MeshBasicMaterial({
          map: texture,
          color: 0xccddee // Slight anti-glare automotive mirror tint
        });
      } catch (e) {
        this.createFallbackMaterial();
      }
    } else {
      this.createFallbackMaterial();
    }
  }

  createFallbackMaterial() {
    this.material = new THREE.MeshStandardMaterial({
      color: 0x99aabb,
      metalness: 0.95,
      roughness: 0.08
    });
  }

  getMaterial() {
    return this.material;
  }

  attachToVehicle(vehicle) {
    if (!vehicle || typeof vehicle.setMirrorMaterial !== 'function') return;
    vehicle.setMirrorMaterial(this.material);
  }

  update(vehicle, dt) {
    if (!this.enabled || !this.renderer || !this.renderTarget || !this.mirrorCamera || !this.scene || !vehicle) return;

    this.frameCount++;
    // Throttled update rate for maximum performance
    if (this.frameCount % this.updateInterval !== 0) return;

    const pos = vehicle.getPosition ? vehicle.getPosition() : vehicle.position;
    const heading = vehicle.heading !== undefined ? vehicle.heading : (vehicle.rotation ? vehicle.rotation.y : 0);
    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));

    // Place camera right at the windshield/roof looking backward down the road
    const camPos = pos.clone().add(new THREE.Vector3(0, 1.15, 0)).sub(forward.clone().multiplyScalar(0.4));
    const lookTarget = camPos.clone().sub(forward.clone().multiplyScalar(30)).add(new THREE.Vector3(0, -0.15, 0));

    this.mirrorCamera.position.copy(camPos);
    this.mirrorCamera.lookAt(lookTarget);

    // Disable shadow maps during mirror sub-pass to preserve GPU resources
    const prevShadows = this.renderer.shadowMap.enabled;
    this.renderer.shadowMap.enabled = false;

    // Temporarily hide vehicle body to avoid self-obstruction
    const wasVisible = vehicle.group ? vehicle.group.visible : true;
    if (vehicle.group) vehicle.group.visible = false;

    try {
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.render(this.scene, this.mirrorCamera);
      this.renderer.setRenderTarget(null);
    } catch (e) {
      // Gracefully continue on any context glitch
    }

    if (vehicle.group) vehicle.group.visible = wasVisible;
    this.renderer.shadowMap.enabled = prevShadows;
  }

  dispose() {
    if (this.renderTarget) {
      this.renderTarget.dispose();
      this.renderTarget = null;
    }
    if (this.material && this.material.dispose) {
      this.material.dispose();
      this.material = null;
    }
  }
}
