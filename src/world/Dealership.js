import * as THREE from 'three';

/**
 * Modern Car Dealership & Vehicle Showroom with display plinths,
 * interactive entrance zone, and vehicle inspection
 */
export class Dealership {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    // Location East of downtown: (X: 220, Z: -45)
    this.position = new THREE.Vector3(220, 0, -45);
    this.interactionZone = new THREE.Box3(
      new THREE.Vector3(195, 0, -65),
      new THREE.Vector3(245, 6, -25)
    );

    this.turntables = [];
    this.displayVehicles = [];

    this.buildDealership();
    this.scene.add(this.group);
  }

  buildDealership() {
    const px = this.position.x;
    const pz = this.position.z;

    // 1. Showroom Base Floor & Driveway
    const baseGeom = new THREE.BoxGeometry(50, 0.4, 40);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.6 });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.set(px, 0.2, pz);
    base.receiveShadow = true;
    this.group.add(base);

    // 2. Glass Pavilion Showroom Building
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.4
    });

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, metalness: 0.8, roughness: 0.2 });

    // Glass walls
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(46, 7, 0.2), glassMat);
    frontGlass.position.set(px, 3.8, pz - 18);
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(46, 7, 0.6), frameMat);
    backWall.position.set(px, 3.8, pz + 18);
    const sideGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 7, 36), glassMat);
    sideGlassL.position.set(px - 23, 3.8, pz);
    const sideGlassR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 7, 36), glassMat);
    sideGlassR.position.set(px + 23, 3.8, pz);

    this.group.add(frontGlass, backWall, sideGlassL, sideGlassR);
    this.collisionSystem.addCollider(backWall, 'building');
    this.collisionSystem.addCollider(sideGlassL, 'building');
    this.collisionSystem.addCollider(sideGlassR, 'building');

    // Roof & modern overhang
    const roofGeom = new THREE.BoxGeometry(52, 1.2, 44);
    const roof = new THREE.Mesh(roofGeom, frameMat);
    roof.position.set(px, 7.8, pz);
    this.group.add(roof);

    // Modern architectural illuminated Dealership Sign
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(32, 2.2, 0.8), frameMat);
    signBox.position.set(px, 9.2, pz - 18);

    const signTextGeom = new THREE.PlaneGeometry(28, 1.6);
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#080a0e';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.fillStyle = '#00f0ff';
    sCtx.font = 'bold 36px Rajdhani, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('HORIZON MOTOR SHOWROOM', 256, 64);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signTextMat = new THREE.MeshBasicMaterial({ map: signTex });
    const signMesh = new THREE.Mesh(signTextGeom, signTextMat);
    signMesh.position.set(px, 9.2, pz - 17.55);

    this.group.add(signBox, signMesh);

    // 3. Rotating Display Turntables with Spotlights
    [-12, 12].forEach((dx, idx) => {
      const turntableGroup = new THREE.Group();
      turntableGroup.position.set(px + dx, 0.45, pz);

      const plinthGeom = new THREE.CylinderGeometry(5.2, 5.5, 0.35, 32);
      const plinthMat = new THREE.MeshStandardMaterial({
        color: 0x22262e,
        metalness: 0.9,
        roughness: 0.2
      });
      const plinth = new THREE.Mesh(plinthGeom, plinthMat);
      turntableGroup.add(plinth);

      // Glowing circular LED ring around turntable
      const ringGeom = new THREE.TorusGeometry(5.2, 0.08, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x00f0ff : 0xffb703 });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.18;
      turntableGroup.add(ring);

      // Showroom ceiling spotlight
      const spot = new THREE.SpotLight(0xffffff, 40, 20, Math.PI / 5, 0.4);
      spot.position.set(px + dx, 7.2, pz);
      spot.target = turntableGroup;
      this.group.add(spot);

      // Display dummy car model on the turntable
      const displayCar = this.createDisplayCar(idx === 0 ? 0xd91424 : 0x00d2ff);
      displayCar.position.y = 0.2;
      turntableGroup.add(displayCar);

      this.turntables.push(turntableGroup);
      this.group.add(turntableGroup);
    });

    // 4. Outside Customer Parking Spaces
    for (let i = -2; i <= 2; i++) {
      const parkLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lineL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 6), parkLineMat);
      lineL.rotation.x = -Math.PI / 2;
      lineL.position.set(px + i * 4.5, 0.41, pz - 24);
      this.group.add(lineL);
    }
  }

  createDisplayCar(paintHex) {
    const carGroup = new THREE.Group();
    const paintMat = new THREE.MeshStandardMaterial({ color: paintHex, metalness: 0.85, roughness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 4.3), paintMat);
    body.position.y = 0.35;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 2.0), glassMat);
    cabin.position.set(0, 0.72, -0.2);
    carGroup.add(body, cabin);

    // 4 Wheels
    [-0.95, 0.95].forEach(x => {
      [-1.35, 1.35].forEach(z => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.26, 16), tireMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.35, z);
        carGroup.add(wheel);
      });
    });

    return carGroup;
  }

  update(dt) {
    // Slowly rotate showroom turntables
    this.turntables.forEach((tt, idx) => {
      tt.rotation.y += dt * (idx === 0 ? 0.3 : -0.25);
    });
  }

  checkPlayerNearby(playerPos) {
    return this.interactionZone.containsPoint(playerPos);
  }
}
