import * as THREE from 'three';

/**
 * School Campus building, clock tower, surrounding school zone roads, and crosswalks
 */
export class School {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    // Located South-East of downtown: (X: 135, Z: 135)
    this.position = new THREE.Vector3(135, 0, 135);

    this.buildSchool();
    this.scene.add(this.group);
  }

  buildSchool() {
    const px = this.position.x;
    const pz = this.position.z;

    const brickMat = new THREE.MeshStandardMaterial({ color: 0x994d38, roughness: 0.85 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const winMat = new THREE.MeshPhysicalMaterial({ color: 0x60a5fa, transmission: 0.7, transparent: true, opacity: 0.6 });

    // 1. Campus Grounds Base
    const grounds = new THREE.Mesh(
      new THREE.BoxGeometry(90, 0.35, 80),
      new THREE.MeshStandardMaterial({ color: 0x2e333d, roughness: 0.8 })
    );
    grounds.position.set(px, 0.175, pz);
    this.group.add(grounds);

    // 2. Main Academic Building Wings
    // Central Main Hall
    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(36, 12, 22), brickMat);
    mainHall.position.set(px, 6.2, pz);
    this.group.add(mainHall);
    this.collisionSystem.addCollider(mainHall, 'building');

    // Left Wing (Science & Labs)
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 18), brickMat);
    leftWing.position.set(px - 28, 5.2, pz + 2);
    this.group.add(leftWing);
    this.collisionSystem.addCollider(leftWing, 'building');

    // Right Wing (Auditorium & Arts)
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 18), brickMat);
    rightWing.position.set(px + 28, 5.2, pz + 2);
    this.group.add(rightWing);
    this.collisionSystem.addCollider(rightWing, 'building');

    // Pitched Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(24, 6, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(px, 15.2, pz);
    this.group.add(roof);

    // 3. Central Clock Tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(8, 18, 8), stoneMat);
    tower.position.set(px, 15, pz - 8);

    const clockFace = new THREE.Mesh(
      new THREE.CircleGeometry(2.0, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    clockFace.position.set(px, 20, pz - 12.05);

    const towerCap = new THREE.Mesh(new THREE.ConeGeometry(5.5, 6, 4), roofMat);
    towerCap.rotation.y = Math.PI / 4;
    towerCap.position.set(px, 27, pz - 8);

    this.group.add(tower, clockFace, towerCap);

    // 4. Entrance Steps & Classical Columns
    for (let i = -3; i <= 3; i += 2) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 6, 12), stoneMat);
      col.position.set(px + i * 2.2, 3.2, pz - 11.5);
      this.group.add(col);
    }

    // School Name Sign
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.fillStyle = '#f8fafc';
    sCtx.font = 'bold 36px Rajdhani, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('OAKRIDGE ACADEMY', 256, 45);
    sCtx.fillStyle = '#38bdf8';
    sCtx.font = 'bold 24px Rajdhani, sans-serif';
    sCtx.fillText('DRIVING & MOTORING SCHOOL', 256, 90);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.2), new THREE.MeshBasicMaterial({ map: signTex }));
    signMesh.position.set(px, 7.8, pz - 11.1);
    this.group.add(signMesh);

    // 5. School Zone Street Sign
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.5), stoneMat);
    pole.position.set(px - 38, 2.25, pz - 36);

    const signPlat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 0.1), new THREE.MeshBasicMaterial({ color: 0xffea00 }));
    signPlat.position.set(px - 38, 3.8, pz - 36);
    this.group.add(pole, signPlat);

    // 6. Zebra Pedestrian Crosswalks
    const crosswalkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -14; i <= 14; i += 3.5) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 8), crosswalkMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(px + i, 0.36, pz - 42);
      this.group.add(stripe);
    }
  }
}
