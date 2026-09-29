import * as THREE from 'three';

/**
 * Dedicated Vehicle Stunt & Physics Playground
 * Features:
 * - Concrete blocks: Crash test blocks, slalom blocks, concrete barrier cubes with hazard stripes
 * - Ramps: Wedge launch ramps, kicker ramps, dual-lane stunt ramps
 * - Small jumps: 1.2m speed kickers, tabletop jumps, and suspension washboard ripples
 * - Large ramps: 10m Mega Launch Ramp, 14m High-Altitude Sky Ramp
 * - Barriers: Heavy perimeter walls, water barriers, Jersey barriers, and 3D tire wall stacks
 * - Platforms: Elevated 7.5m stunt platform, 4.5m narrow balance beam bridge, drop-off pads
 * - Test Areas:
 *   1. 400m Acceleration Drag Strip with distance markers (100m, 200m, 400m / 1/4 mile)
 *   2. 100-0 km/h Braking Test Zone with color-coded stopping zones
 *   3. Circular Skidpad & Turning Circle with concentric neon radius rings for drift & turning experiments
 *   4. Suspension travel & washboard ripple test track
 *   5. Collision Physics Arena with dynamic smashable crates, barrels, and bowling pins
 * - Separated from normal driving-school rules: free stunt scoring, airtime, and physics experiments
 */
export class Playground {
  constructor(scene, assetManager, collisionSystem) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    // Spawn point inside the Playground Test Complex
    this.startPosition = new THREE.Vector3(-350, 0.4, 230);
    this.startHeading = 0; // Facing North down the drag strip

    this.buildPlayground();
    this.scene.add(this.group);
  }

  buildPlayground() {
    // Playground center: X: -350, Z: 350
    const baseX = -350;
    const baseZ = 350;

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x14161a,
      roughness: 0.85
    });

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x8a9299,
      roughness: 0.8
    });

    const hazardTex = this.assetManager.getHazardTexture();
    const hazardMat = new THREE.MeshStandardMaterial({
      map: hazardTex,
      roughness: 0.5
    });

    const skidpadTex = this.assetManager.getSkidpadTexture();
    const skidpadMat = new THREE.MeshStandardMaterial({
      map: skidpadTex,
      roughness: 0.6
    });

    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0xa8b0b8,
      metalness: 0.8,
      roughness: 0.35
    });

    const redTireMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.85 });
    const whiteTireMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.85 });

    // 0. Huge Arena Ground (450m x 450m)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(450, 450), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(baseX, 0.01, baseZ);
    floor.receiveShadow = true;
    this.group.add(floor);

    // Arena Perimeter Wall with warning beacons
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x22262d, roughness: 0.7 });
    const perimeters = [
      { x: baseX, z: baseZ - 225, w: 450, d: 3 },
      { x: baseX, z: baseZ + 225, w: 450, d: 3 },
      { x: baseX - 225, z: baseZ, w: 3, d: 450 },
      { x: baseX + 225, z: baseZ, w: 3, d: 450 }
    ];
    perimeters.forEach(p => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(p.w, 4, p.d), wallMat);
      wall.position.set(p.x, 2, p.z);
      this.group.add(wall);
      this.collisionSystem.addCollider(wall, 'wall');

      // Top neon stripe
      const neon = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.3, p.d), new THREE.MeshBasicMaterial({ color: 0xff0055 }));
      neon.position.set(p.x, 4.15, p.z);
      this.group.add(neon);
    });

    // ==========================================
    // 1. TEST AREA: ACCELERATION DRAG STRIP (400M)
    // ==========================================
    // Runs along X: -420, from Z: 200 to Z: 500
    const dragStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 320),
      new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.75 })
    );
    dragStrip.rotation.x = -Math.PI / 2;
    dragStrip.position.set(baseX - 70, 0.02, baseZ);
    this.group.add(dragStrip);

    // Center dotted line & start line
    const startLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dragStart = new THREE.Mesh(new THREE.PlaneGeometry(18, 2), startLineMat);
    dragStart.rotation.x = -Math.PI / 2;
    dragStart.position.set(baseX - 70, 0.03, baseZ - 140);
    this.group.add(dragStart);

    // Distance Markers: 0m, 100m, 200m, 400m
    const markers = [
      { z: baseZ - 140, label: 'START 0M' },
      { z: baseZ - 60, label: '100 METERS' },
      { z: baseZ + 20, label: '200 METERS' },
      { z: baseZ + 140, label: '400M / 1/4 MILE' }
    ];
    markers.forEach(m => {
      const bannerTex = this.assetManager.getSponsorBannerTexture(m.label, '#0088ff', '#ffffff');
      const board = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), new THREE.MeshBasicMaterial({ map: bannerTex }));
      board.position.set(baseX - 70, 4.5, m.z);
      this.group.add(board);

      const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5), barrierMat);
      poleL.position.set(baseX - 80, 2.5, m.z);
      const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5), barrierMat);
      poleR.position.set(baseX - 60, 2.5, m.z);
      this.group.add(poleL, poleR);
    });

    // ==========================================
    // 2. TEST AREA: BRAKING TEST ZONE (100-0 KM/H)
    // ==========================================
    // Runs parallel to drag strip at X: -385, from Z: 200 to Z: 360
    const brakeLane = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 160),
      new THREE.MeshStandardMaterial({ color: 0x202228, roughness: 0.8 })
    );
    brakeLane.rotation.x = -Math.PI / 2;
    brakeLane.position.set(baseX - 35, 0.02, baseZ - 60);
    this.group.add(brakeLane);

    // Color-coded braking zones: Green (0-20m), Yellow (20-40m), Red (40-60m)
    const zoneColors = [0x00cc44, 0xffbb00, 0xdd2200];
    for (let zi = 0; zi < 3; zi++) {
      const zoneMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(13.8, 30),
        new THREE.MeshBasicMaterial({ color: zoneColors[zi], transparent: true, opacity: 0.35 })
      );
      zoneMesh.rotation.x = -Math.PI / 2;
      zoneMesh.position.set(baseX - 35, 0.025, baseZ - 90 + (zi * 32));
      this.group.add(zoneMesh);
    }

    // ==========================================
    // 3. TEST AREA: CIRCULAR SKIDPAD & TURNING CIRCLE
    // ==========================================
    // Positioned at X: -270, Z: 270 (Diameter: 120m)
    const skidpad = new THREE.Mesh(new THREE.CircleGeometry(60, 64), skidpadMat);
    skidpad.rotation.x = -Math.PI / 2;
    skidpad.position.set(baseX + 80, 0.025, baseZ - 80);
    this.group.add(skidpad);

    // Center illuminated pylon in the middle of skidpad
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 8, 16), hazardMat);
    pylon.position.set(baseX + 80, 4, baseZ - 80);
    const pylonLight = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    pylonLight.position.set(baseX + 80, 8.5, baseZ - 80);
    this.group.add(pylon, pylonLight);
    this.collisionSystem.addCollider(pylon, 'obstacle');

    // ==========================================
    // 4. TEST AREA: SUSPENSION WASHBOARD RIPPLE TRACK
    // ==========================================
    // Running at X: -385, from Z: 360 to Z: 480
    const washboardLane = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 120),
      new THREE.MeshStandardMaterial({ color: 0x1f2127, roughness: 0.9 })
    );
    washboardLane.rotation.x = -Math.PI / 2;
    washboardLane.position.set(baseX - 35, 0.02, baseZ + 80);
    this.group.add(washboardLane);

    // Corrugated washboard speed bumps (18 ridges)
    for (let rz = baseZ + 30; rz <= baseZ + 130; rz += 6) {
      const bump = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 13.5, 12),
        new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.4 })
      );
      bump.rotation.z = Math.PI / 2;
      bump.position.set(baseX - 35, 0.12, rz);
      this.group.add(bump);
    }

    // ==========================================
    // 5. LARGE RAMPS (MEGA LAUNCH & SKY RAMPS)
    // ==========================================
    // Mega Launch Ramp (Height: 9.5m, Length: 36m, Width: 18m)
    this.createRamp(baseX + 30, baseZ - 60, 18, 36, 9.5, 0);

    // High-Altitude Sky Ramp (Height: 14m, Length: 46m, Width: 20m)
    this.createRamp(baseX + 80, baseZ + 40, 20, 46, 14, 0);

    // ==========================================
    // 6. SMALL JUMPS & TABLETOP RAMPS
    // ==========================================
    // Small Kicker Jump 1 (Height: 1.5m, Length: 8m, Width: 12m)
    this.createRamp(baseX, baseZ - 90, 12, 8, 1.5, 0);

    // Small Kicker Jump 2 (Height: 2.2m, Length: 10m, Width: 14m)
    this.createRamp(baseX, baseZ - 40, 14, 10, 2.2, 0);

    // Tabletop Jump (Incline ramp -> flat platform -> decline ramp)
    this.createTabletopJump(baseX, baseZ + 20, 14, 12, 10, 3.2);

    // ==========================================
    // 7. ELEVATED PLATFORMS & BALANCE BEAM
    // ==========================================
    // Elevated Stunt Platform (Height: 7.5m, Size: 40m x 35m)
    this.createElevatedPlatform(baseX + 30, baseZ + 20, 35, 40, 7.5);
    // Approach Ramp connecting to the 7.5m platform
    this.createRamp(baseX + 30, baseZ - 20, 16, 32, 7.5, 0);

    // Balance Beam / Raised Highway Bridge (Height: 3.5m, Width: 4.8m, Length: 70m)
    this.createBalanceBeam(baseX - 105, baseZ + 60, 4.8, 70, 3.5);

    // ==========================================
    // 8. CONCRETE BLOCKS & CRASH TEST OBSTACLES
    // ==========================================
    // Heavy Concrete Crash Test Blocks (with hazard stripes)
    const blockSizes = [
      { x: baseX - 80, z: baseZ + 175, w: 12, h: 4, d: 4 },
      { x: baseX - 50, z: baseZ + 175, w: 12, h: 4, d: 4 },
      { x: baseX - 20, z: baseZ + 175, w: 12, h: 4, d: 4 },
      { x: baseX + 10, z: baseZ + 175, w: 12, h: 4, d: 4 }
    ];
    blockSizes.forEach(b => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), concreteMat);
      block.position.set(b.x, b.h * 0.5, b.z);
      this.group.add(block);
      this.collisionSystem.addCollider(block, 'obstacle');

      // Front hazard stripe decal
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(b.w, 1.4), hazardMat);
      stripe.position.set(b.x, b.h * 0.5, b.z - (b.d * 0.5 + 0.05));
      this.group.add(stripe);
    });

    // Slalom Concrete Cubes for agility steering
    for (let si = -3; si <= 3; si++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), concreteMat);
      cube.position.set(baseX - 5 + (si % 2 === 0 ? 8 : -8), 1.25, baseZ + 90 + (si * 14));
      this.group.add(cube);
      this.collisionSystem.addCollider(cube, 'obstacle');
    }

    // Concrete Pyramid Obstacle Wall
    for (let row = 0; row < 3; row++) {
      const cols = 5 - row;
      for (let c = 0; c < cols; c++) {
        const pyX = baseX + 70 + (c - (cols - 1) * 0.5) * 4.2;
        const pyY = row * 2.2 + 1.1;
        const pyZ = baseZ + 170;
        const pBlock = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.2, 3.0), concreteMat);
        pBlock.position.set(pyX, pyY, pyZ);
        this.group.add(pBlock);
        this.collisionSystem.addCollider(pBlock, 'obstacle');
      }
    }

    // ==========================================
    // 9. BARRIERS & TIRE WALL STACKS
    // ==========================================
    // Jersey Barriers dividing Drag Strip and Braking Lane
    this.createJerseyBarriers(baseX - 52, baseZ - 60, 160);

    // Water Barriers (red and white alternating plastic barricades)
    this.createWaterBarriers(baseX + 80, baseZ - 130, 40);

    // 3D Tire Wall Barrier Stacks around jump landing aprons
    this.buildTireWallStack(baseX + 30, baseZ + 70, 36, 0, redTireMat, whiteTireMat);
    this.buildTireWallStack(baseX + 80, baseZ + 120, 40, 0, redTireMat, whiteTireMat);

    // ==========================================
    // 10. COLLISION PHYSICS ARENA (SMASHABLE OBJECTS)
    // ==========================================
    // Massive Multi-layer Smashable Crates Pyramid (36 dynamic crates)
    this.createSmashableCrates(baseX - 110, baseZ - 40, 4);

    // Giant Bowling Pins for Car Bowling
    this.createBowlingPins(baseX - 110, baseZ - 100);

    // Smashable Barrel Stacks
    this.createSmashableBarrels(baseX - 110, baseZ + 20);
  }

  createRamp(x, z, width, length, height, angleY) {
    const rampGroup = new THREE.Group();
    rampGroup.position.set(x, 0, z);
    rampGroup.rotation.y = angleY;

    const rampMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      roughness: 0.35,
      metalness: 0.6
    });

    const shape = new THREE.Shape();
    shape.moveTo(-length * 0.5, 0);
    shape.lineTo(length * 0.5, height);
    shape.lineTo(length * 0.5, 0);
    shape.closePath();

    const extrudeSettings = { steps: 1, depth: width, bevelEnabled: false };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geom, rampMat);
    mesh.position.set(0, 0, -width * 0.5);
    mesh.rotation.y = Math.PI / 2;
    rampGroup.add(mesh);

    // Chevrons on ramp face
    const chevronMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const chev = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.8, 1.2), chevronMat);
    chev.rotation.x = -Math.PI / 2 - Math.atan2(height, length);
    chev.position.set(0, height * 0.5, 0);
    rampGroup.add(chev);

    this.group.add(rampGroup);

    // Register with collision system for climbing physics
    this.collisionSystem.addRamp(x, z, width, length, height, angleY);
  }

  createTabletopJump(x, z, width, inclineLength, flatLength, height) {
    // Incline ramp
    this.collisionSystem.addRamp(x, z - (flatLength + inclineLength) * 0.5, width, inclineLength, height, 0);
    // Flat top platform
    this.collisionSystem.addPlatform(x, z, width, flatLength, height);
    // Decline ramp
    this.collisionSystem.addRamp(x, z + (flatLength + inclineLength) * 0.5, width, inclineLength, height, Math.PI);

    const mat = new THREE.MeshStandardMaterial({ color: 0x00ccff, roughness: 0.4, metalness: 0.5 });

    // 3D visual box for flat top
    const flatMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, flatLength), mat);
    flatMesh.position.set(x, height * 0.5, z);
    this.group.add(flatMesh);

    // Incline visual
    this.createRamp(x, z - (flatLength + inclineLength) * 0.5, width, inclineLength, height, 0);
    // Decline visual
    this.createRamp(x, z + (flatLength + inclineLength) * 0.5, width, inclineLength, height, Math.PI);
  }

  createElevatedPlatform(x, z, width, length, height) {
    const platGroup = new THREE.Group();
    platGroup.position.set(x, 0, z);

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.7 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 1.2, length), concreteMat);
    deck.position.set(0, height - 0.6, 0);
    platGroup.add(deck);

    // Support pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, metalness: 0.8 });
    for (let px of [-width * 0.45, width * 0.45]) {
      for (let pz of [-length * 0.45, length * 0.45]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, height - 1.2), pillarMat);
        pillar.position.set(px, (height - 1.2) * 0.5, pz);
        platGroup.add(pillar);
      }
    }

    // Safety perimeter railings
    const railMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8 });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, length), railMat);
    railL.position.set(-width * 0.5, height + 0.6, 0);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, length), railMat);
    railR.position.set(width * 0.5, height + 0.6, 0);
    platGroup.add(railL, railR);

    this.group.add(platGroup);

    // Register platform height with collision system
    this.collisionSystem.addPlatform(x, z, width, length, height);
  }

  createBalanceBeam(x, z, width, length, height) {
    // Narrow bridge for precision driving
    this.collisionSystem.addPlatform(x, z, width, length, height);
    // Entrance ramp
    this.createRamp(x, z - length * 0.5 - 10, width, 20, height, 0);
    // Exit ramp
    this.createRamp(x, z + length * 0.5 + 10, width, 20, height, Math.PI);

    const beamMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 1.0, length),
      new THREE.MeshStandardMaterial({ color: 0x9933ff, metalness: 0.6, roughness: 0.3 })
    );
    beamMesh.position.set(x, height - 0.5, z);
    this.group.add(beamMesh);

    // Support piers
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 });
    for (let pz = -length * 0.4; pz <= length * 0.4; pz += 18) {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, height - 1), pierMat);
      pier.position.set(x, (height - 1) * 0.5, z + pz);
      this.group.add(pier);
    }
  }

  createJerseyBarriers(x, z, length) {
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xdde2e8, roughness: 0.6 });
    for (let pz = -length * 0.5; pz <= length * 0.5; pz += 4.5) {
      const jb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 4.2), barrierMat);
      jb.position.set(x, 0.55, z + pz);
      this.group.add(jb);
      this.collisionSystem.addCollider(jb, 'barrier');
    }
  }

  createWaterBarriers(x, z, length) {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xee2200, roughness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    for (let pz = -length * 0.5; pz <= length * 0.5; pz += 3.2) {
      const isRed = Math.floor(pz / 3.2) % 2 === 0;
      const wb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 3.0), isRed ? redMat : whiteMat);
      wb.position.set(x, 0.5, z + pz);
      this.group.add(wb);
      this.collisionSystem.addCollider(wb, 'barrier');
    }
  }

  buildTireWallStack(x, z, length, rotY, redMat, whiteMat) {
    const tireGroup = new THREE.Group();
    const tireGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 12);

    for (let pz = -length * 0.5; pz <= length * 0.5; pz += 1.2) {
      const isRed = Math.floor(pz / 3.6) % 2 === 0;
      const mat = isRed ? redMat : whiteMat;

      // 3 tires high
      for (let h = 0; h < 3; h++) {
        const tire = new THREE.Mesh(tireGeom, mat);
        tire.position.set(0, 0.25 + (h * 0.44), pz);
        tireGroup.add(tire);
      }
    }

    tireGroup.position.set(x, 0, z);
    tireGroup.rotation.y = rotY;
    this.group.add(tireGroup);

    const tireCol = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, length), new THREE.MeshBasicMaterial({ visible: false }));
    tireCol.position.set(x, 0.8, z);
    tireCol.rotation.y = rotY;
    this.collisionSystem.addCollider(tireCol, 'barrier');
  }

  createSmashableCrates(startX, startZ, layers = 4) {
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xcd853f, roughness: 0.85 });
    const crateSize = 1.4;

    for (let layer = 0; layer < layers; layer++) {
      const count = layers - layer;
      const y = layer * crateSize + crateSize * 0.5;
      for (let i = 0; i < count; i++) {
        const x = startX + (i - (count - 1) * 0.5) * (crateSize + 0.1);
        const crate = new THREE.Mesh(new THREE.BoxGeometry(crateSize, crateSize, crateSize), crateMat);
        crate.position.set(x, y, startZ);
        crate.castShadow = true;
        this.group.add(crate);
        this.collisionSystem.addDynamicBox(crate, 35);
      }
    }
  }

  createBowlingPins(startX, startZ) {
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const pinRows = 4;
    const pinDist = 2.4;

    for (let r = 0; r < pinRows; r++) {
      for (let c = 0; c <= r; c++) {
        const x = startX + (c - r * 0.5) * pinDist;
        const z = startZ + r * pinDist;

        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 2.5, 12), pinMat);
        pin.position.set(x, 1.25, z);
        pin.castShadow = true;

        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.35, 12), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
        stripe.position.set(0, 0.5, 0);
        pin.add(stripe);

        this.group.add(pin);
        this.collisionSystem.addDynamicBox(pin, 25);
      }
    }
  }

  createSmashableBarrels(startX, startZ) {
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0099ff, metalness: 0.7, roughness: 0.4 });
    const barrelGeom = new THREE.CylinderGeometry(0.6, 0.6, 1.6, 16);

    for (let i = -2; i <= 2; i++) {
      for (let j = 0; j < 2; j++) {
        const barrel = new THREE.Mesh(barrelGeom, barrelMat);
        barrel.position.set(startX + (i * 1.5), 0.8 + (j * 1.6), startZ);
        this.group.add(barrel);
        this.collisionSystem.addDynamicBox(barrel, 30);
      }
    }
  }
}
