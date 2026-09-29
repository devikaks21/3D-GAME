import * as THREE from 'three';

/**
 * Green public park with walking paths, benches, trees, flowerbeds and fountain
 */
export class Park {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    // Located in North-East downtown sector: (X: 135, Z: -135)
    this.center = new THREE.Vector3(135, 0, -135);
    this.width = 110;
    this.depth = 110;

    this.buildPark();
    this.scene.add(this.group);
  }

  buildPark() {
    const cx = this.center.x;
    const cz = this.center.z;

    // 1. Lush Green Grass Lawn base
    const lawnGeom = new THREE.BoxGeometry(this.width, 0.4, this.depth);
    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x2d6a38,
      roughness: 0.9,
      metalness: 0.05
    });
    const lawn = new THREE.Mesh(lawnGeom, lawnMat);
    lawn.position.set(cx, 0.2, cz);
    lawn.receiveShadow = true;
    this.group.add(lawn);

    // 2. Cobblestone / Gravel Walking Paths
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x8f8576,
      roughness: 0.85
    });

    // Cross paths (North-South & East-West through park center)
    const pathNS = new THREE.Mesh(new THREE.PlaneGeometry(6, this.depth - 4), pathMat);
    pathNS.rotation.x = -Math.PI / 2;
    pathNS.position.set(cx, 0.42, cz);
    const pathEW = new THREE.Mesh(new THREE.PlaneGeometry(this.width - 4, 6), pathMat);
    pathEW.rotation.x = -Math.PI / 2;
    pathEW.position.set(cx, 0.42, cz);

    // Circular plaza path in center
    const plazaGeom = new THREE.RingGeometry(6, 16, 24);
    const plaza = new THREE.Mesh(plazaGeom, pathMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(cx, 0.43, cz);

    this.group.add(pathNS, pathEW, plaza);

    // 3. Central Fountain
    const poolGeom = new THREE.CylinderGeometry(5.5, 6, 1.0, 16);
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x5a6268, roughness: 0.7 });
    const pool = new THREE.Mesh(poolGeom, poolMat);
    pool.position.set(cx, 0.8, cz);

    const waterGeom = new THREE.CircleGeometry(5.2, 16);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x0099cc, roughness: 0.1, metalness: 0.8 });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx, 1.25, cz);

    // Fountain spire
    const spireGeom = new THREE.CylinderGeometry(0.3, 0.6, 3, 8);
    const spire = new THREE.Mesh(spireGeom, poolMat);
    spire.position.set(cx, 2.2, cz);

    this.group.add(pool, water, spire);
    this.collisionSystem.addCollider(pool, 'prop');

    // 4. Park Benches
    const benchPositions = [
      { x: cx - 10, z: cz - 10, rotY: Math.PI / 4 },
      { x: cx + 10, z: cz - 10, rotY: -Math.PI / 4 },
      { x: cx - 10, z: cz + 10, rotY: 3 * Math.PI / 4 },
      { x: cx + 10, z: cz + 10, rotY: -3 * Math.PI / 4 },
      { x: cx, z: cz - 35, rotY: 0 },
      { x: cx, z: cz + 35, rotY: Math.PI },
      { x: cx - 35, z: cz, rotY: Math.PI / 2 },
      { x: cx + 35, z: cz, rotY: -Math.PI / 2 }
    ];

    benchPositions.forEach(bp => this.addBench(bp.x, bp.z, bp.rotY));

    // 5. Park Trees scattered across the grass quadrants
    const treeOffsets = [
      { dx: -28, dz: -28 }, { dx: -18, dz: -38 }, { dx: -38, dz: -18 },
      { dx: 28, dz: -28 },  { dx: 18, dz: -38 },  { dx: 38, dz: -18 },
      { dx: -28, dz: 28 },  { dx: -18, dz: 38 },  { dx: -38, dz: 18 },
      { dx: 28, dz: 28 },   { dx: 18, dz: 38 },   { dx: 38, dz: 18 }
    ];

    treeOffsets.forEach(to => {
      this.addParkTree(cx + to.dx, cz + to.dz);
    });

    // 6. Perimeter Hedge / Stone Border
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x1d4724, roughness: 0.9 });
    const wallThick = 1.2;
    const wallH = 1.0;

    // 4 Border hedge segments with walkway entrance gaps
    const hedgeN1 = new THREE.Mesh(new THREE.BoxGeometry((this.width - 12) * 0.5, wallH, wallThick), borderMat);
    hedgeN1.position.set(cx - this.width * 0.25 - 1.5, wallH * 0.5, cz - this.depth * 0.5);
    const hedgeN2 = new THREE.Mesh(new THREE.BoxGeometry((this.width - 12) * 0.5, wallH, wallThick), borderMat);
    hedgeN2.position.set(cx + this.width * 0.25 + 1.5, wallH * 0.5, cz - this.depth * 0.5);

    const hedgeS1 = new THREE.Mesh(new THREE.BoxGeometry((this.width - 12) * 0.5, wallH, wallThick), borderMat);
    hedgeS1.position.set(cx - this.width * 0.25 - 1.5, wallH * 0.5, cz + this.depth * 0.5);
    const hedgeS2 = new THREE.Mesh(new THREE.BoxGeometry((this.width - 12) * 0.5, wallH, wallThick), borderMat);
    hedgeS2.position.set(cx + this.width * 0.25 + 1.5, wallH * 0.5, cz + this.depth * 0.5);

    this.group.add(hedgeN1, hedgeN2, hedgeS1, hedgeS2);
    this.collisionSystem.addCollider(hedgeN1, 'hedge');
    this.collisionSystem.addCollider(hedgeN2, 'hedge');
    this.collisionSystem.addCollider(hedgeS1, 'hedge');
    this.collisionSystem.addCollider(hedgeS2, 'hedge');
  }

  addBench(x, z, rotY) {
    const benchGroup = new THREE.Group();
    benchGroup.position.set(x, 0.4, z);
    benchGroup.rotation.y = rotY;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.2 });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.6), woodMat);
    seat.position.set(0, 0.5, 0);
    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.08), woodMat);
    back.position.set(0, 0.85, -0.26);

    // Legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.55), ironMat);
    legL.position.set(-0.9, 0.25, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.55), ironMat);
    legR.position.set(0.9, 0.25, 0);

    benchGroup.add(seat, back, legL, legR);
    this.group.add(benchGroup);
  }

  addParkTree(x, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.45, 4.0, 8),
      new THREE.MeshStandardMaterial({ color: 0x422d18, roughness: 0.9 })
    );
    trunk.position.set(x, 2.0, z);

    const foliage = new THREE.Mesh(
      new THREE.DodecahedronGeometry(2.2, 1),
      new THREE.MeshStandardMaterial({ color: 0x245e2c, roughness: 0.75 })
    );
    foliage.position.set(x, 5.2, z);
    foliage.castShadow = true;

    this.group.add(trunk, foliage);
    this.collisionSystem.addCollider(trunk, 'tree');
  }
}
