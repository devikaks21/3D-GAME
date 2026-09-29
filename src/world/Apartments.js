import * as THREE from 'three';

/**
 * Multi-floor Residential Apartment Complexes with balconies,
 * glass entrance lobbies and resident parking bays
 */
export class Apartments {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    // Located North-West of downtown: (X: -135, Z: -135)
    this.position = new THREE.Vector3(-135, 0, -135);

    this.buildApartments();
    this.scene.add(this.group);
  }

  buildApartments() {
    const px = this.position.x;
    const pz = this.position.z;

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x242831, roughness: 0.7 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transmission: 0.8, transparent: true, opacity: 0.6 });
    const balconyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });

    // 1. Residential Block Base & Courtyard
    const courtyard = new THREE.Mesh(
      new THREE.BoxGeometry(110, 0.35, 110),
      new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.8 })
    );
    courtyard.position.set(px, 0.175, pz);
    this.group.add(courtyard);

    // 2. Three High-Rise Residential Apartment Towers
    const towerOffsets = [
      { dx: -28, dz: -22, height: 42, floors: 10 },
      { dx: 24, dz: -22, height: 48, floors: 12 },
      { dx: 0, dz: 24, height: 38, floors: 9 }
    ];

    towerOffsets.forEach((tower, tIdx) => {
      const tx = px + tower.dx;
      const tz = pz + tower.dz;

      // Main Tower Core
      const towerMesh = new THREE.Mesh(
        new THREE.BoxGeometry(26, tower.height, 24),
        concreteMat
      );
      towerMesh.position.set(tx, tower.height * 0.5 + 0.35, tz);
      towerMesh.castShadow = true;
      this.group.add(towerMesh);
      this.collisionSystem.addCollider(towerMesh, 'building');

      // Decorative White Architectural Framing
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(26.6, tower.height + 0.4, 4),
        whiteMat
      );
      frame.position.set(tx, tower.height * 0.5 + 0.35, tz);
      this.group.add(frame);

      // Floor Windows & Balconies
      const floorH = tower.height / tower.floors;
      for (let f = 1; f < tower.floors; f++) {
        const fy = f * floorH + 0.35;

        // Front Balcony
        const balcony = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 2.2), balconyMat);
        balcony.position.set(tx, fy, tz - 12.8);

        const railing = new THREE.Mesh(new THREE.BoxGeometry(18, 0.9, 0.1), glassMat);
        railing.position.set(tx, fy + 0.5, tz - 13.8);

        this.group.add(balcony, railing);

        // Windows
        [-6, 0, 6].forEach(wx => {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), glassMat);
          win.position.set(tx + wx, fy + 1.2, tz - 12.1);
          this.group.add(win);
        });
      }

      // Ground Floor Entrance Lobby Canopy
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 5.5), balconyMat);
      canopy.position.set(tx, 3.8, tz - 14.5);

      const lobbyGlass = new THREE.Mesh(new THREE.BoxGeometry(8, 3.4, 0.2), glassMat);
      lobbyGlass.position.set(tx, 1.9, tz - 12.2);

      this.group.add(canopy, lobbyGlass);
    });

    // 3. Resident Surface Parking Area with Parking Bays
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -5; i <= 5; i++) {
      const line1 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 5.5), lineMat);
      line1.rotation.x = -Math.PI / 2;
      line1.position.set(px + i * 4.2, 0.36, pz + 46);

      const line2 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 5.5), lineMat);
      line2.rotation.x = -Math.PI / 2;
      line2.position.set(px + i * 4.2, 0.36, pz + 36);

      this.group.add(line1, line2);
    }
  }
}
