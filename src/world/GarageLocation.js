import * as THREE from 'three';

/**
 * Drive-In Physical Garage Workshop Facility with hydraulic lift and tool racks
 */
export class GarageLocation {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    // Located adjacent to dealership: (X: 220, Z: 40)
    this.position = new THREE.Vector3(220, 0, 40);
    this.interactionZone = new THREE.Box3(
      new THREE.Vector3(205, 0, 25),
      new THREE.Vector3(235, 6, 55)
    );

    this.buildGarage();
    this.scene.add(this.group);
  }

  buildGarage() {
    const px = this.position.x;
    const pz = this.position.z;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x30353d, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1f232b, metalness: 0.8, roughness: 0.3 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffbb00, roughness: 0.4 });

    // 1. Garage Workshop Building Structure (Open front bay)
    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(28, 0.4, 30), new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.7 }));
    floor.position.set(px, 0.2, pz);
    this.group.add(floor);

    // Left, Right and Back walls
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 30), wallMat);
    wallL.position.set(px - 14, 4.2, pz);
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 30), wallMat);
    wallR.position.set(px + 14, 4.2, pz);
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(28.8, 8, 0.8), wallMat);
    wallBack.position.set(px, 4.2, pz + 15);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(30, 0.8, 32), metalMat);
    roof.position.set(px, 8.4, pz);

    this.group.add(wallL, wallR, wallBack, roof);
    this.collisionSystem.addCollider(wallL, 'building');
    this.collisionSystem.addCollider(wallR, 'building');
    this.collisionSystem.addCollider(wallBack, 'building');

    // 2. Rollup Bay Door Header & Neon Sign
    const headerMesh = new THREE.Mesh(new THREE.BoxGeometry(28, 2.0, 0.8), metalMat);
    headerMesh.position.set(px, 7.2, pz - 15);

    const signTextGeom = new THREE.PlaneGeometry(22, 1.4);
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#111318';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.fillStyle = '#ffbb00';
    sCtx.font = 'bold 38px Rajdhani, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('CUSTOMS & TUNING GARAGE', 256, 64);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(signTextGeom, new THREE.MeshBasicMaterial({ map: signTex }));
    signMesh.position.set(px, 7.2, pz - 15.45);

    this.group.add(headerMesh, signMesh);

    // 3. Hydraulic Service Lift in Bay
    const postGeom = new THREE.CylinderGeometry(0.35, 0.35, 6, 12);
    const liftPostL = new THREE.Mesh(postGeom, yellowMat);
    liftPostL.position.set(px - 3.8, 3.2, pz);
    const liftPostR = new THREE.Mesh(postGeom, yellowMat);
    liftPostR.position.set(px + 3.8, 3.2, pz);

    const armGeom = new THREE.BoxGeometry(7.6, 0.25, 0.8);
    const liftArm = new THREE.Mesh(armGeom, metalMat);
    liftArm.position.set(px, 1.8, pz);

    this.group.add(liftPostL, liftPostR, liftArm);

    // 4. Workshop Tool Cabinets & Tire Racks
    const toolMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 });
    [-10, 10].forEach(dx => {
      const chest = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 1.2), toolMat);
      chest.position.set(px + dx, 1.5, pz + 12);
      this.group.add(chest);
    });

    // 5. Bright Ceiling Bay Fluorescent Lighting
    const flGeom = new THREE.BoxGeometry(16, 0.15, 0.4);
    const flMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const flLight = new THREE.Mesh(flGeom, flMat);
    flLight.position.set(px, 8.0, pz);
    this.group.add(flLight);
  }

  checkPlayerNearby(playerPos) {
    return this.interactionZone.containsPoint(playerPos);
  }
}
