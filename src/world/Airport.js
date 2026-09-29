import * as THREE from 'three';

/**
 * Airport environment with passenger terminal building, parking area,
 * runway-style open area and airport lighting
 */
export class Airport {
  constructor(scene, assetManager, collisionSystem) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    this.buildAirport();
    this.scene.add(this.group);
  }

  buildAirport() {
    // Center of Airport sector: (X: 480, Z: 0)
    const baseX = 480;

    // 1. Massive 750m x 48m Paved Runway Open Area
    const runwayGeom = new THREE.PlaneGeometry(50, 750);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c22,
      roughness: 0.82
    });
    const runway = new THREE.Mesh(runwayGeom, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(baseX, 0.02, 0);
    runway.receiveShadow = true;
    this.group.add(runway);

    // 2. White Runway Threshold Piano Keys
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -18; i <= 18; i += 4) {
      const stripeS = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 26), stripeMat);
      stripeS.rotation.x = -Math.PI / 2;
      stripeS.position.set(baseX + i, 0.03, 340);

      const stripeN = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 26), stripeMat);
      stripeN.rotation.x = -Math.PI / 2;
      stripeN.position.set(baseX + i, 0.03, -340);

      this.group.add(stripeS, stripeN);
    }

    // 3. Centerline Dashed Runway Stripes
    for (let z = -320; z <= 320; z += 30) {
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 18), stripeMat);
      cl.rotation.x = -Math.PI / 2;
      cl.position.set(baseX, 0.03, z);
      this.group.add(cl);
    }

    // 4. Glowing Airport Lighting (Green/Cyan Runway Edge Lights & Blue Taxiway Lights)
    const edgeLightMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    for (let z = -360; z <= 360; z += 40) {
      const lightL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), edgeLightMat);
      lightL.position.set(baseX - 26, 0.25, z);
      const lightR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), edgeLightMat);
      lightR.position.set(baseX + 26, 0.25, z);
      this.group.add(lightL, lightR);
    }

    // 5. Airport Passenger Terminal Building
    const termMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transmission: 0.85, transparent: true, opacity: 0.6 });

    // Main Terminal Hall
    const mainTerminal = new THREE.Mesh(new THREE.BoxGeometry(38, 14, 90), termMat);
    mainTerminal.position.set(baseX + 90, 7, 0);
    this.group.add(mainTerminal);
    this.collisionSystem.addCollider(mainTerminal, 'building');

    // Terminal Glass Facade
    const glassFacade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 10, 80), glassMat);
    glassFacade.position.set(baseX + 70.8, 6, 0);
    this.group.add(glassFacade);

    // Terminal Name Sign
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.fillStyle = '#38bdf8';
    sCtx.font = 'bold 36px Rajdhani, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('INTERNATIONAL TERMINAL', 256, 64);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 2.8), new THREE.MeshBasicMaterial({ map: signTex }));
    signMesh.position.set(baseX + 70.7, 12.5, 0);
    signMesh.rotation.y = -Math.PI / 2;
    this.group.add(signMesh);

    // 6. Airport Passenger Parking Area
    const parkMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.8 });
    const parkingLot = new THREE.Mesh(new THREE.BoxGeometry(60, 0.35, 90), parkMat);
    parkingLot.position.set(baseX + 150, 0.175, 0);
    this.group.add(parkingLot);

    // Parking Bays
    for (let r = -30; r <= 30; r += 15) {
      for (let c = -6; c <= 6; c++) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 5.0), stripeMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(baseX + 150 + c * 3.8, 0.36, r);
        this.group.add(line);
      }
    }

    // 7. Air Traffic Control Tower
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xd8dbe2, roughness: 0.4 });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 45, 16), towerMat);
    tower.position.set(baseX + 85, 22.5, -75);

    const cabin = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 6, 7, 16),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1 })
    );
    cabin.position.set(baseX + 85, 47, -75);

    this.group.add(tower, cabin);
    this.collisionSystem.addCollider(tower, 'building');

    // 8. Aircraft Hangars
    const hangarMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
    [85, 140].forEach(z => {
      const hangar = new THREE.Mesh(
        new THREE.CylinderGeometry(18, 18, 50, 16, 1, false, 0, Math.PI),
        hangarMat
      );
      hangar.rotation.z = Math.PI / 2;
      hangar.position.set(baseX + 90, 0, z);
      this.group.add(hangar);

      const col = new THREE.Mesh(new THREE.BoxGeometry(50, 18, 36));
      col.position.set(baseX + 90, 9, z);
      this.collisionSystem.addCollider(col, 'building');
    });

    // 9. Connector Roadway to Downtown City
    const connRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 22),
      runwayMat
    );
    connRoad.rotation.x = -Math.PI / 2;
    connRoad.position.set(baseX - 105, 0.02, 0);
    this.group.add(connRoad);
  }
}
