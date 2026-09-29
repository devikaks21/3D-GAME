import * as THREE from 'three';

/**
 * Large Driving Practice Parking Lot with marked stalls, divider islands,
 * and practice cone slalom bays
 */
export class ParkingLot {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    // Located South-West of downtown: (X: -135, Z: 135)
    this.position = new THREE.Vector3(-135, 0, 135);
    this.width = 110;
    this.depth = 100;

    this.buildParkingLot();
    this.scene.add(this.group);
  }

  buildParkingLot() {
    const px = this.position.x;
    const pz = this.position.z;

    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.8 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.7 });
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.4 });

    // 1. Asphalt Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(this.width, 0.35, this.depth), asphaltMat);
    base.position.set(px, 0.175, pz);
    base.receiveShadow = true;
    this.group.add(base);

    // 2. Parking Stalls Rows (4 Double-Sided Rows)
    const rowZOffsets = [-32, -10, 12, 34];

    rowZOffsets.forEach(rz => {
      // Concrete divider curb in middle of double row
      const curb = new THREE.Mesh(new THREE.BoxGeometry(84, 0.3, 1.4), curbMat);
      curb.position.set(px, 0.45, pz + rz);
      this.group.add(curb);
      this.collisionSystem.addCollider(curb, 'curb');

      // Parking stall lines on North & South sides of curb
      for (let i = -10; i <= 10; i++) {
        const sx = px + i * 4.0;
        // North stall line
        const lineN = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 5.5), whiteMat);
        lineN.rotation.x = -Math.PI / 2;
        lineN.position.set(sx, 0.36, pz + rz - 3.2);

        // South stall line
        const lineS = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 5.5), whiteMat);
        lineS.rotation.x = -Math.PI / 2;
        lineS.position.set(sx, 0.36, pz + rz + 3.2);

        this.group.add(lineN, lineS);
      }

      // Solar LED parking lampposts along curbs
      [-30, 0, 30].forEach(lx => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 6, 8), curbMat);
        post.position.set(px + lx, 3.2, pz + rz);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 1.4), curbMat);
        lamp.position.set(0, 3.0, 0);
        post.add(lamp);
        this.group.add(post);
      });
    });

    // 3. Driving Academy Practice Cones (Slalom & Tight Reverse Bay)
    // Slalom row along main driving aisle
    for (let c = -35; c <= 35; c += 10) {
      this.addCone(px + c, pz - 21, coneMat);
    }

    // Tight Parallel Parking Practice Bay marked with 4 cones
    this.addCone(px - 14, pz + 23, coneMat);
    this.addCone(px - 14, pz + 29, coneMat);
    this.addCone(px - 8, pz + 23, coneMat);
    this.addCone(px - 8, pz + 29, coneMat);

    // 4. Perimeter Low Guard Curbs
    const borderN = new THREE.Mesh(new THREE.BoxGeometry(this.width, 0.6, 0.8), curbMat);
    borderN.position.set(px, 0.45, pz - this.depth * 0.5);
    const borderS = new THREE.Mesh(new THREE.BoxGeometry(this.width, 0.6, 0.8), curbMat);
    borderS.position.set(px, 0.45, pz + this.depth * 0.5);
    const borderW = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, this.depth), curbMat);
    borderW.position.set(px - this.width * 0.5, 0.45, pz);

    this.group.add(borderN, borderS, borderW);
    this.collisionSystem.addCollider(borderN, 'curb');
    this.collisionSystem.addCollider(borderS, 'curb');
    this.collisionSystem.addCollider(borderW, 'curb');
  }

  addCone(x, z, material) {
    const coneGeom = new THREE.ConeGeometry(0.28, 0.75, 12);
    const cone = new THREE.Mesh(coneGeom, material);
    cone.position.set(x, 0.7, z);

    // White reflective stripe around cone
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.25, 0.18, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    stripe.position.set(0, 0.08, 0);
    cone.add(stripe);

    this.group.add(cone);
    this.collisionSystem.addDynamicBox(cone, 8);
  }
}
