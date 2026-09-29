import * as THREE from 'three';

/**
 * Realistic Petrol / Gas Station with fuel pumps, illuminated canopy,
 * convenience store, parking bays and refuel interaction
 */
export class PetrolStation {
  constructor(scene, collisionSystem, audioManager) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.audio = audioManager;
    this.group = new THREE.Group();

    // Located South of Downtown: (X: 0, Z: 220)
    this.position = new THREE.Vector3(0, 0, 220);
    this.pumpZone = new THREE.Box3(
      new THREE.Vector3(-22, 0, 205),
      new THREE.Vector3(22, 5, 235)
    );

    this.fuelLevel = 100; // Percentage
    this.isRefueling = false;

    this.buildStation();
    this.scene.add(this.group);
  }

  buildStation() {
    const px = this.position.x;
    const pz = this.position.z;

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x22262d, roughness: 0.8 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });
    const redAccent = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });

    // 1. Forecourt Ground Pad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(60, 0.35, 50), concreteMat);
    pad.position.set(px, 0.175, pz);
    pad.receiveShadow = true;
    this.group.add(pad);

    // 2. Large Overhead Canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(44, 1.4, 28), canopyMat);
    canopy.position.set(px, 6.2, pz + 4);

    // Red LED illuminated stripe on canopy trim
    const trim = new THREE.Mesh(new THREE.BoxGeometry(44.4, 0.4, 28.4), redAccent);
    trim.position.set(px, 6.2, pz + 4);

    // 4 Heavy Support Pylons
    const pylonGeom = new THREE.CylinderGeometry(0.5, 0.5, 5.8, 12);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, metalness: 0.7 });
    const pylonCoords = [
      { x: -14, z: -4 }, { x: 14, z: -4 },
      { x: -14, z: 12 }, { x: 14, z: 12 }
    ];

    pylonCoords.forEach(pc => {
      const pylon = new THREE.Mesh(pylonGeom, pylonMat);
      pylon.position.set(px + pc.x, 3.2, pz + pc.z);
      this.group.add(pylon);
      this.collisionSystem.addCollider(pylon, 'pillar');
    });

    this.group.add(canopy, trim);

    // Canopy Underbody Downlights
    [-10, 0, 10].forEach(dx => {
      const lamp = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(px + dx, 5.48, pz + 4);
      this.group.add(lamp);
    });

    // 3. Fuel Pump Islands (4 islands with dual pumps)
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const islandX = [-14, -5, 5, 14];

    islandX.forEach(ix => {
      // Concrete raised curb island
      const curb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 12), islandMat);
      curb.position.set(px + ix, 0.55, pz + 4);
      this.group.add(curb);
      this.collisionSystem.addCollider(curb, 'curb');

      // Dual fuel dispensers
      [-3, 3].forEach(dz => {
        const pump = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.2), pumpMat);
        pump.position.set(px + ix, 1.75, pz + 4 + dz);

        // Digital screen
        const screen = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 0.4),
          new THREE.MeshBasicMaterial({ color: 0x22c55e })
        );
        screen.position.set(0, 0.5, 0.61);
        pump.add(screen);

        this.group.add(pump);
        this.collisionSystem.addCollider(pump, 'pump');
      });
    });

    // 4. Convenience Store ("OPEN ROAD MART")
    const storeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transmission: 0.8, transparent: true, opacity: 0.5 });

    const store = new THREE.Mesh(new THREE.BoxGeometry(36, 5.5, 14), storeMat);
    store.position.set(px, 3.1, pz - 17);
    this.group.add(store);
    this.collisionSystem.addCollider(store, 'building');

    // Storefront glass windows
    const win = new THREE.Mesh(new THREE.BoxGeometry(26, 3.2, 0.2), glassMat);
    win.position.set(px, 2.2, pz - 9.8);
    this.group.add(win);

    // Illuminated store brand sign
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(22, 1.5, 0.6), canopyMat);
    signBox.position.set(px, 5.2, pz - 9.7);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0284c7';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'bold 42px Rajdhani, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('OPEN ROAD MART 24/7', 256, 64);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 1.3), new THREE.MeshBasicMaterial({ map: signTex }));
    signMesh.position.set(px, 5.2, pz - 9.38);

    this.group.add(signBox, signMesh);

    // 5. Store Parking Stalls
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -3; i <= 3; i++) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 5.5), whiteMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(px + i * 3.8, 0.36, pz - 12);
      this.group.add(line);
    }
  }

  checkPlayerNearby(playerPos) {
    return this.pumpZone.containsPoint(playerPos);
  }

  refuel() {
    this.fuelLevel = 100;
    if (this.audio) this.audio.playCheckpointChime();
    return this.fuelLevel;
  }
}
