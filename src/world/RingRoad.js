import * as THREE from 'three';

/**
 * 4-Lane Arterial Orbital Ring Road Highway connecting all major world sectors,
 * with overhead guide gantries and jersey barriers
 */
export class RingRoad {
  constructor(scene, assetManager, collisionSystem) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    this.radius = 290;
    this.roadWidth = 26;

    this.buildRingRoad();
    this.scene.add(this.group);
  }

  buildRingRoad() {
    const roadTexture = this.assetManager.getRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.8
    });
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.5 });
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });

    const r = this.radius;
    const w = this.roadWidth;
    const len = r * 2;

    // 4 Main Ring Road Highway Legs:
    // North Highway Leg (Z: -r)
    this.createHighwayLeg(0, -r, len + w, w, 0, roadMat);
    // South Highway Leg (Z: +r)
    this.createHighwayLeg(0, r, len + w, w, 0, roadMat);
    // East Highway Leg (X: +r)
    this.createHighwayLeg(r, 0, w, len + w, 0, roadMat);
    // West Highway Leg (X: -r)
    this.createHighwayLeg(-r, 0, w, len + w, 0, roadMat);

    // Concrete Central Median Barriers along each leg
    this.createBarrier(0, -r, len, 0.6, 1.0, 0, barrierMat);
    this.createBarrier(0, r, len, 0.6, 1.0, 0, barrierMat);
    this.createBarrier(r, 0, 0.6, len, 1.0, 0, barrierMat);
    this.createBarrier(-r, 0, 0.6, len, 1.0, 0, barrierMat);

    // Overhead Highway Directional Gantries with destination signs
    this.createGantry(0, -r + 30, 'NORTH HWY: ALPINE SUMMIT / RIVERBED ➔', gantryMat);
    this.createGantry(0, r - 30, 'SOUTH HWY: EMERALD BEACH / GAS STATION ➔', gantryMat);
    this.createGantry(r - 30, 0, 'EAST HWY: AIRPORT / MOTOR SHOWROOM ➔', gantryMat, Math.PI / 2);
    this.createGantry(-r + 30, 0, 'WEST HWY: GRAND PRIX CIRCUIT / STUNT PARK ➔', gantryMat, Math.PI / 2);
  }

  createHighwayLeg(x, z, width, length, rotY, material) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rotY;
    mesh.position.set(x, 0.02, z);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  createBarrier(x, z, width, length, height, rotY, material) {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), material);
    barrier.position.set(x, height * 0.5, z);
    barrier.rotation.y = rotY;
    this.group.add(barrier);
    this.collisionSystem.addCollider(barrier, 'barrier');
  }

  createGantry(x, z, text, material, rotY = 0) {
    const gantry = new THREE.Group();
    gantry.position.set(x, 0, z);
    gantry.rotation.y = rotY;

    // Posts
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 8), material);
    postL.position.set(-15, 4.5, 0);
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 8), material);
    postR.position.set(15, 4.5, 0);

    // Cross Truss
    const truss = new THREE.Mesh(new THREE.BoxGeometry(32, 1.8, 1.2), material);
    truss.position.set(0, 8.5, 0);

    // Green Highway Direction Signboard
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 256;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#065f46'; // Highway green
    sCtx.fillRect(0, 0, 1024, 256);
    sCtx.strokeStyle = '#ffffff';
    sCtx.lineWidth = 10;
    sCtx.strokeRect(10, 10, 1004, 236);

    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'bold 44px Rajdhani, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText(text, 512, 128);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 2.6),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(0, 8.5, 0.65);

    gantry.add(postL, postR, truss, signMesh);
    this.group.add(gantry);
  }
}
