import * as THREE from 'three';

/**
 * Procedural Open-World Downtown City Environment
 * Includes Main roads, Side roads, Intersections, Traffic lanes,
 * High-rise buildings, Street shops with awnings, Parking areas, Traffic lights, Streetlights
 */
export class City {
  constructor(scene, assetManager, collisionSystem) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    this.trafficLights = [];
    this.lightCycleTimer = 0;
    this.trafficLightState = 'green';

    this.buildCity();
    this.scene.add(this.group);
  }

  buildCity() {
    const roadTexture = this.assetManager.getRoadTexture();
    const buildingTexture = this.assetManager.getBuildingFacadeTexture();

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.8,
      metalness: 0.1
    });

    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x3a3d42,
      roughness: 0.9
    });

    const buildingMat = new THREE.MeshStandardMaterial({
      map: buildingTexture,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x223344,
      emissiveIntensity: 0.2
    });

    const shopMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.6 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x67e8f9, transmission: 0.8, transparent: true, opacity: 0.5 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const blockSize = 90;
    const roadWidth = 22;
    const halfGrid = 2; // Core downtown grid

    // Ground plane foundation
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.group.add(ground);

    // 1. Main Arterial Roads and Side Streets
    for (let i = -halfGrid; i <= halfGrid; i++) {
      const coord = i * blockSize;

      // North-South Avenues (Main roads)
      const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, blockSize * (halfGrid * 2 + 1)), roadMat);
      roadZ.rotation.x = -Math.PI / 2;
      roadZ.position.set(coord, 0.01, 0);
      roadZ.receiveShadow = true;
      this.group.add(roadZ);

      // East-West Streets
      const roadX = new THREE.Mesh(new THREE.PlaneGeometry(blockSize * (halfGrid * 2 + 1), roadWidth), roadMat);
      roadX.rotation.x = -Math.PI / 2;
      roadX.position.set(0, 0.015, coord);
      roadX.receiveShadow = true;
      this.group.add(roadX);
    }

    // 2. City Blocks: Skyscrapers, Ground Floor Shops, Awnings, Sidewalks, and Street Parking Bays
    for (let x = -halfGrid; x < halfGrid; x++) {
      for (let z = -halfGrid; z < halfGrid; z++) {
        // Skip corner blocks dedicated to Park, Apartments, School, etc.
        if (x === 1 && z === -2) continue; // Park
        if (x === -2 && z === -2) continue; // Apartments
        if (x === 1 && z === 1) continue; // School
        if (x === -2 && z === 1) continue; // Parking Lot

        const centerX = x * blockSize + blockSize * 0.5;
        const centerZ = z * blockSize + blockSize * 0.5;
        const lotSize = blockSize - roadWidth;

        // Sidewalk base
        const walk = new THREE.Mesh(new THREE.BoxGeometry(lotSize, 0.35, lotSize), sidewalkMat);
        walk.position.set(centerX, 0.175, centerZ);
        walk.receiveShadow = true;
        this.group.add(walk);

        // Skyscrapers in block
        const bldgWidth = lotSize * 0.42;
        const bldgDepth = lotSize * 0.42;
        const offsets = [
          { dx: -lotSize * 0.22, dz: -lotSize * 0.22 },
          { dx: lotSize * 0.22, dz: lotSize * 0.22 }
        ];

        offsets.forEach((off, idx) => {
          const height = 45 + Math.abs(Math.sin(x * 4 + z * 7 + idx)) * 40 + (idx === 0 ? 30 : 10);
          const bldg = new THREE.Mesh(new THREE.BoxGeometry(bldgWidth, height, bldgDepth), buildingMat);
          bldg.position.set(centerX + off.dx, height * 0.5 + 0.35, centerZ + off.dz);
          bldg.castShadow = true;
          this.group.add(bldg);
          this.collisionSystem.addCollider(bldg, 'building');

          // Ground floor storefront shop
          const shop = new THREE.Mesh(new THREE.BoxGeometry(bldgWidth * 0.9, 4.2, bldgDepth * 0.9), shopMat);
          shop.position.set(centerX + off.dx, 2.2, centerZ + off.dz);

          const shopGlass = new THREE.Mesh(new THREE.BoxGeometry(bldgWidth * 0.85, 2.8, 0.2), glassMat);
          shopGlass.position.set(centerX + off.dx, 1.8, centerZ + off.dz + bldgDepth * 0.46);

          // Colorful shop awning
          const awningColor = idx === 0 ? 0xd97706 : 0x0284c7;
          const awning = new THREE.Mesh(
            new THREE.BoxGeometry(bldgWidth * 0.86, 0.2, 2.5),
            new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.6 })
          );
          awning.position.set(centerX + off.dx, 3.4, centerZ + off.dz + bldgDepth * 0.46 + 1.2);
          awning.rotation.x = 0.18;

          this.group.add(shop, shopGlass, awning);
        });

        // Street Parking Bays along sidewalk curbs
        for (let p = -2; p <= 2; p++) {
          const parkLine = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 5.0), lineMat);
          parkLine.rotation.x = -Math.PI / 2;
          parkLine.position.set(centerX + p * 5.0, 0.36, centerZ - lotSize * 0.5 + 2.8);
          this.group.add(parkLine);
        }

        // Sidewalk Trees
        this.addTree(centerX - lotSize * 0.42, centerZ - lotSize * 0.42);
        this.addTree(centerX + lotSize * 0.42, centerZ + lotSize * 0.42);
      }
    }

    // 3. Traffic Signals & Street Lamps at All Intersections
    for (let x = -halfGrid; x <= halfGrid; x++) {
      for (let z = -halfGrid; z <= halfGrid; z++) {
        this.addIntersectionFeatures(x * blockSize, z * blockSize);
      }
    }
  }

  addTree(x, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 3.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 })
    );
    trunk.position.set(x, 1.7, z);

    const foliage = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.6),
      new THREE.MeshStandardMaterial({ color: 0x1b4d24, roughness: 0.8 })
    );
    foliage.position.set(x, 4.0, z);

    this.group.add(trunk, foliage);
    if (this.collisionSystem) {
      this.collisionSystem.addCollider(trunk, 'tree');
    }
  }

  addIntersectionFeatures(x, z) {
    // 2 Arched street poles
    const corners = [{ dx: 12, dz: 12 }, { dx: -12, dz: -12 }];
    corners.forEach(c => {
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x22262c, metalness: 0.8 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8), poleMat);
      pole.position.set(x + c.dx, 3.75, z + c.dz);

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 1.2), poleMat);
      lampHead.position.set(0, 3.75, 0.5);
      pole.add(lampHead);

      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.0), new THREE.MeshBasicMaterial({ color: 0xfff4d0 }));
      glow.rotation.x = Math.PI / 2;
      glow.position.set(0, 3.65, 0.5);
      pole.add(glow);

      this.group.add(pole);
      if (this.collisionSystem) {
        this.collisionSystem.addCollider(pole, 'obstacle');
      }
    });

    // Traffic Signal Post
    const tlPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x1c1e22 })
    );
    tlPost.position.set(x + 10, 3, z + 10);
    if (this.collisionSystem) {
      this.collisionSystem.addCollider(tlPost, 'obstacle');
    }

    const tlBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.3, 0.4), new THREE.MeshStandardMaterial({ color: 0x0a0b0d }));
    tlBox.position.set(0, 2.2, 0);

    const redGeom = new THREE.CircleGeometry(0.12, 16);
    const redMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
    const redLight = new THREE.Mesh(redGeom, redMat);
    redLight.position.set(0, 0.4, 0.21);

    const yellowMat = new THREE.MeshBasicMaterial({ color: 0x332200 });
    const yellowLight = new THREE.Mesh(redGeom, yellowMat);
    yellowLight.position.set(0, 0, 0.21);

    const greenMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    const greenLight = new THREE.Mesh(redGeom, greenMat);
    greenLight.position.set(0, -0.4, 0.21);

    tlBox.add(redLight, yellowLight, greenLight);
    tlPost.add(tlBox);
    this.group.add(tlPost);

    this.trafficLights.push({ redMat, yellowMat, greenMat });
  }

  update(dt) {
    this.lightCycleTimer += dt;
    if (this.lightCycleTimer > 18) this.lightCycleTimer = 0;

    let newState = 'green';
    if (this.lightCycleTimer > 15) {
      newState = 'yellow';
    } else if (this.lightCycleTimer > 8) {
      newState = 'red';
    }

    if (newState !== this.trafficLightState) {
      this.trafficLightState = newState;
      this.trafficLights.forEach(tl => {
        tl.redMat.color.setHex(this.trafficLightState === 'red' ? 0xff1122 : 0x220000);
        tl.yellowMat.color.setHex(this.trafficLightState === 'yellow' ? 0xffbb00 : 0x221100);
        tl.greenMat.color.setHex(this.trafficLightState === 'green' ? 0x00ff55 : 0x002208);
      });
    }
  }
}
