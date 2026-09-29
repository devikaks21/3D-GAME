import * as THREE from 'three';

/**
 * Drive-through Car Wash tunnel facility with water spray, foam rollers,
 * and animated washing sequence
 */
export class CarWash {
  constructor(scene, collisionSystem, audioManager) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.audio = audioManager;
    this.group = new THREE.Group();

    // Located adjacent to garage: (X: 220, Z: 105)
    this.position = new THREE.Vector3(220, 0, 105);
    this.tunnelBounds = new THREE.Box3(
      new THREE.Vector3(214, 0, 90),
      new THREE.Vector3(226, 5, 120)
    );

    this.brushes = [];
    this.waterParticles = [];
    this.isWashing = false;
    this.washTimer = 0;

    this.buildCarWash();
    this.scene.add(this.group);
  }

  buildCarWash() {
    const px = this.position.x;
    const pz = this.position.z;

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.3 });
    const brushMat = new THREE.MeshStandardMaterial({ color: 0x0099ff, roughness: 0.9 });
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });

    // 1. Concrete wash lane pad
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.35, 34),
      new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.8 })
    );
    pad.position.set(px, 0.175, pz);
    this.group.add(pad);

    // 2. Tunnel Archway & Canopy
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.5, 30), frameMat);
    wallL.position.set(px - 6.5, 3, pz);
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.5, 30), frameMat);
    wallR.position.set(px + 6.5, 3, pz);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 32), frameMat);
    roof.position.set(px, 5.8, pz);

    this.group.add(wallL, wallR, roof);
    this.collisionSystem.addCollider(wallL, 'building');
    this.collisionSystem.addCollider(wallR, 'building');

    // 3. Neon Sign: "EXPRESS CAR WASH"
    const signGeom = new THREE.PlaneGeometry(12, 1.4);
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.fillStyle = '#38bdf8';
    sCtx.font = 'bold 38px Rajdhani, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('★ EXPRESS CAR WASH ★', 256, 64);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(signGeom, new THREE.MeshBasicMaterial({ map: signTex }));
    signMesh.position.set(px, 6.6, pz - 15.6);
    this.group.add(signMesh);

    // 4. Rotating Foam Brush Rollers
    // Overhead horizontal roller
    const topRoller = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 8.5, 16), brushMat);
    topRoller.rotation.z = Math.PI / 2;
    topRoller.position.set(px, 3.8, pz);
    this.group.add(topRoller);
    this.brushes.push({ mesh: topRoller, axis: 'x' });

    // Dual vertical side rollers
    const sideRollerL = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 4.2, 16), brushMat);
    sideRollerL.position.set(px - 3.8, 2.5, pz + 4);
    const sideRollerR = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 4.2, 16), brushMat);
    sideRollerR.position.set(px + 3.8, 2.5, pz + 4);
    this.group.add(sideRollerL, sideRollerR);
    this.brushes.push({ mesh: sideRollerL, axis: 'y' }, { mesh: sideRollerR, axis: 'y' });

    // 5. Water Spray Nozzle Arches
    [-6, 6].forEach(dz => {
      const archGeom = new THREE.TorusGeometry(5.0, 0.15, 8, 16, Math.PI);
      const arch = new THREE.Mesh(archGeom, new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 }));
      arch.position.set(px, 0.5, pz + dz);
      this.group.add(arch);
    });

    // 6. Water & Foam Spray Particle Stream Meshes
    for (let i = 0; i < 35; i++) {
      const dropGeom = new THREE.SphereGeometry(0.12 + Math.random() * 0.12, 6, 6);
      const drop = new THREE.Mesh(dropGeom, foamMat);
      drop.position.set(
        px + (Math.random() - 0.5) * 6,
        1.0 + Math.random() * 3.5,
        pz + (Math.random() - 0.5) * 16
      );
      this.waterParticles.push(drop);
      this.group.add(drop);
    }
  }

  update(dt, playerPos) {
    const inside = playerPos && this.tunnelBounds.containsPoint(playerPos);

    if (inside) {
      if (!this.isWashing) {
        this.isWashing = true;
        this.washTimer = 0;
        if (this.audio) this.audio.playCheckpointChime();
      }
      this.washTimer += dt;

      // Spin foam brushes rapidly
      this.brushes.forEach(b => {
        if (b.axis === 'x') b.mesh.rotation.x += dt * 14;
        if (b.axis === 'y') b.mesh.rotation.y += dt * 14;
      });

      // Animate foam and water particles cascading down
      this.waterParticles.forEach(p => {
        p.position.y -= dt * 9;
        if (p.position.y < 0.3) {
          p.position.y = 4.8;
          p.position.x = this.position.x + (Math.random() - 0.5) * 6;
        }
      });
    } else {
      this.isWashing = false;
      // Gently spin to rest
      this.brushes.forEach(b => {
        if (b.axis === 'x') b.mesh.rotation.x += dt * 0.5;
        if (b.axis === 'y') b.mesh.rotation.y += dt * 0.5;
      });
    }

    return {
      isWashing: this.isWashing,
      washTimer: this.washTimer
    };
  }
}
