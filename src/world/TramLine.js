import * as THREE from 'three';

/**
 * Urban Electric Tram Line with embedded steel rails, catenary poles,
 * station stop shelter, and an animated moving tram car
 */
export class TramLine {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.trackX = -45;
    this.trackStart = -180;
    this.trackEnd = 180;
    this.tramZ = 0;
    this.tramSpeed = 12; // m/s (~43 km/h)
    this.tramDirection = 1;

    this.tramMesh = null;
    this.buildTramSystem();
    this.scene.add(this.group);
  }

  buildTramSystem() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.2 });
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x475569 });

    // 1. Dual Steel Rails embedded in asphalt
    [-0.75, 0.75].forEach(dx => {
      const railGeom = new THREE.BoxGeometry(0.12, 0.05, this.trackEnd - this.trackStart);
      const rail = new THREE.Mesh(railGeom, railMat);
      rail.position.set(this.trackX + dx, 0.04, (this.trackStart + this.trackEnd) * 0.5);
      this.group.add(rail);
    });

    // 2. Overhead Catenary Electric Masts & Wire
    for (let z = this.trackStart; z <= this.trackEnd; z += 30) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 7, 8), mastMat);
      mast.position.set(this.trackX - 3.5, 3.5, z);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.1, 0.1), mastMat);
      arm.position.set(this.trackX - 1.5, 6.8, z);

      this.group.add(mast, arm);
    }

    // Power Cable Line
    const cableGeom = new THREE.CylinderGeometry(0.02, 0.02, this.trackEnd - this.trackStart, 4);
    const cable = new THREE.Mesh(cableGeom, cableMat);
    cable.rotation.x = Math.PI / 2;
    cable.position.set(this.trackX, 6.75, (this.trackStart + this.trackEnd) * 0.5);
    this.group.add(cable);

    // 3. Central Tram Station Stop Shelter
    const platMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x67e8f9, transmission: 0.8, transparent: true, opacity: 0.5 });

    const platform = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.45, 32), platMat);
    platform.position.set(this.trackX + 3.8, 0.225, 0);

    const shelterRoof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.2, 24), mastMat);
    shelterRoof.position.set(this.trackX + 3.8, 3.4, 0);

    const shelterGlass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 22), glassMat);
    shelterGlass.position.set(this.trackX + 5.5, 1.8, 0);

    this.group.add(platform, shelterRoof, shelterGlass);

    // 4. Articulated Electric Tram Car
    this.buildTramCar();
  }

  buildTramCar() {
    this.tramMesh = new THREE.Group();
    const tramBodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.25 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xbae6fd, transmission: 0.85, transparent: true, opacity: 0.7 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

    // Front & Rear Articulated Sections
    [-6.5, 6.5].forEach(dz => {
      const section = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.2, 11), tramBodyMat);
      section.position.set(0, 1.8, dz);

      // White roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.4, 11.1), whiteMat);
      roof.position.set(0, 3.4, dz);

      // Glass windows along side
      const winL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 9), glassMat);
      winL.position.set(1.26, 2.0, dz);
      const winR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 9), glassMat);
      winR.position.set(-1.26, 2.0, dz);

      this.tramMesh.add(section, roof, winL, winR);
    });

    // Flexible accordion joint between cars
    const joint = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.0, 2.2), blackMat);
    joint.position.set(0, 1.8, 0);
    this.tramMesh.add(joint);

    // Roof Pantograph Contact
    const pantoGeom = new THREE.CylinderGeometry(0.04, 0.04, 2.8);
    const panto = new THREE.Mesh(pantoGeom, whiteMat);
    panto.position.set(0, 5.0, 0);
    this.tramMesh.add(panto);

    // Tram Headlights (Glowing)
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlF = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), hlMat);
    hlF.position.set(0, 1.2, 12.05);
    const hlB = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    hlB.position.set(0, 1.2, -12.05);
    this.tramMesh.add(hlF, hlB);

    this.tramMesh.position.set(this.trackX, 0, this.tramZ);
    this.group.add(this.tramMesh);
  }

  update(dt) {
    if (!this.tramMesh) return;

    this.tramZ += this.tramSpeed * this.tramDirection * dt;

    if (this.tramZ > this.trackEnd) {
      this.tramZ = this.trackEnd;
      this.tramDirection = -1;
    } else if (this.tramZ < this.trackStart) {
      this.tramZ = this.trackStart;
      this.tramDirection = 1;
    }

    this.tramMesh.position.z = this.tramZ;
  }
}
