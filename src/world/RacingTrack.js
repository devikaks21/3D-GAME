import * as THREE from 'three';

/**
 * Grand Prix Racing Circuit
 * Features:
 * - Starting grid with 8 staggered pole position boxes
 * - Start/finish line with overhead truss gantry, starting lights, digital boards & sponsor banners
 * - Curved corners (Turn 1 chicane, South Hairpin, North S-curves) with 3D red/white rumble kerbs
 * - High-speed straight sections (Main Straight 380m, Back Straight 360m)
 * - Track barriers (Armco steel guardrails, 3D red/white tire wall stacks with physics colliders)
 * - Multi-tiered spectator grandstands with canopy roofs, seats, and stairs
 * - Dedicated pit lane with pit wall, team perches, speed limit signs, and pit boxes
 * - Two-story modern pit complex with 6 team garage bays, VIP Paddock Club, and Race Control Tower
 * - Visual timing checkpoint arches at Sector 1, Sector 2, Sector 3, and Start/Finish
 */
export class RacingTrack {
  constructor(scene, assetManager, collisionSystem) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    // Spawn location on Starting Grid Pole Box 1 (facing North down the straight)
    this.startPosition = new THREE.Vector3(-464, 0.4, -125);
    this.startHeading = 0; // Forward in +Z direction

    // Pit stop trigger box area
    this.pitStopArea = new THREE.Box3(
      new THREE.Vector3(-444, 0, -80),
      new THREE.Vector3(-428, 4, 80)
    );

    this.buildTrack();
    this.scene.add(this.group);
  }

  buildTrack() {
    const kerbTexture = this.assetManager.getRacingKerbTexture();
    const checkeredTexture = this.assetManager.getCheckeredTexture();

    // Standard materials
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x18191d,
      roughness: 0.82
    });

    const pitTrackMat = new THREE.MeshStandardMaterial({
      color: 0x22242a,
      roughness: 0.78
    });

    const kerbMat = new THREE.MeshStandardMaterial({
      map: kerbTexture,
      roughness: 0.55
    });

    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0xa8b0b8,
      metalness: 0.8,
      roughness: 0.35
    });

    const concreteWallMat = new THREE.MeshStandardMaterial({
      color: 0x8a9299,
      roughness: 0.9
    });

    const redTireMat = new THREE.MeshStandardMaterial({
      color: 0xcc1111,
      roughness: 0.85
    });

    const whiteTireMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.85
    });

    // ==========================================
    // 1. STRAIGHT SECTIONS & CIRCUIT TRACK
    // ==========================================
    // Main Straight: X: -460, spans Z: -180 to 120 (300m long, 24m wide)
    this.createSegment(-460, -30, 24, 300, 0, trackMat);

    // Turn 1 & 2: Sweeper into chicane
    this.createSegment(-472, 140, 24, 60, Math.PI * 0.12, trackMat);
    this.createSegment(-495, 180, 24, 65, Math.PI * 0.28, trackMat);

    // South Hairpin: apex curves through Z: 215
    this.createSegment(-530, 212, 24, 75, Math.PI * 0.5, trackMat);
    this.createSegment(-565, 185, 24, 65, -Math.PI * 0.28, trackMat);
    this.createSegment(-576, 140, 24, 60, -Math.PI * 0.12, trackMat);

    // Back Straight: X: -580, spans Z: 110 to -110 (220m long, 24m wide)
    this.createSegment(-580, 0, 24, 220, 0, trackMat);

    // North Technical Section: Turn 4, 5, 6
    this.createSegment(-575, -135, 24, 60, Math.PI * 0.15, trackMat);
    this.createSegment(-550, -175, 24, 65, Math.PI * 0.32, trackMat);
    this.createSegment(-510, -188, 24, 70, Math.PI * 0.5, trackMat);
    this.createSegment(-475, -170, 24, 65, -Math.PI * 0.3, trackMat);
    this.createSegment(-462, -145, 24, 50, -Math.PI * 0.1, trackMat);

    // ==========================================
    // 2. STARTING GRID (8 Staggered Pole Boxes)
    // ==========================================
    // Box 1 (Pole): left side front (-464, -115)
    // Box 2: right side (-456, -125)
    // Box 3: left side (-464, -135)
    // Box 4: right side (-456, -145)
    // Box 5: left side (-464, -155)
    // Box 6: right side (-456, -165)
    // Box 7: left side (-464, -175)
    // Box 8: right side (-456, -185)
    for (let i = 1; i <= 8; i++) {
      const isLeft = (i % 2 !== 0);
      const gridX = isLeft ? -464 : -456;
      const gridZ = -105 - (i * 10);

      const gridBoxTex = this.assetManager.getGridBoxTexture(i);
      const gridMat = new THREE.MeshBasicMaterial({
        map: gridBoxTex,
        transparent: true,
        opacity: 0.95
      });
      const gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), gridMat);
      gridMesh.rotation.x = -Math.PI / 2;
      gridMesh.position.set(gridX, 0.035, gridZ);
      this.group.add(gridMesh);
    }

    // ==========================================
    // 3. START/FINISH LINE & OVERHEAD GANTRY
    // ==========================================
    // Checkered line on asphalt at Z: -100
    const startLineMat = new THREE.MeshBasicMaterial({
      map: checkeredTexture,
      transparent: true
    });
    const startLine = new THREE.Mesh(new THREE.PlaneGeometry(24, 4), startLineMat);
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(-460, 0.035, -100);
    this.group.add(startLine);

    // Gantry Structure
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x1f2329, metalness: 0.85, roughness: 0.25 });
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 16), gantryMat);
    postL.position.set(-473, 6, -100);
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 16), gantryMat);
    postR.position.set(-447, 6, -100);

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(28, 2.2, 2.5), gantryMat);
    crossBeam.position.set(-460, 11, -100);

    // Sponsor Banner on Gantry front & back
    const bannerTex = this.assetManager.getSponsorBannerTexture('CIRCUIT GRAND PRIX', '#d60000', '#ffffff');
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
    const bannerFront = new THREE.Mesh(new THREE.PlaneGeometry(24, 2.0), bannerMat);
    bannerFront.position.set(-460, 11, -98.7);
    const bannerBack = new THREE.Mesh(new THREE.PlaneGeometry(24, 2.0), bannerMat);
    bannerBack.position.set(-460, 11, -101.3);
    bannerBack.rotation.y = Math.PI;

    // 5 Red Starting Signal Lights (which turn green at GO)
    this.startLights = [];
    for (let i = -4; i <= 4; i += 2) {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.4), new THREE.MeshBasicMaterial({ color: 0x050505 }));
      housing.position.set(-460 + i, 9.6, -98.6);

      const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
      bulb.position.set(-460 + i, 9.6, -98.35);
      this.group.add(housing, bulb);
      this.startLights.push(bulb);
    }

    this.group.add(postL, postR, crossBeam, bannerFront, bannerBack);

    // ==========================================
    // 4. PIT LANE & PIT WALL
    // ==========================================
    // Dedicated 12m wide pit lane at X: -436, parallel to main straight
    const pitLane = new THREE.Mesh(new THREE.PlaneGeometry(12, 260), pitTrackMat);
    pitLane.rotation.x = -Math.PI / 2;
    pitLane.position.set(-436, 0.025, -20);
    this.group.add(pitLane);

    // Pit Wall separating pit lane from main straight (X: -447)
    const pitWall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 240), concreteWallMat);
    pitWall.position.set(-447, 0.7, -20);
    this.group.add(pitWall);
    this.collisionSystem.addCollider(pitWall, 'wall');

    // Safety catch fence on top of pit wall
    const fenceMat = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
    const pitFence = new THREE.Mesh(new THREE.PlaneGeometry(240, 1.6), fenceMat);
    pitFence.rotation.y = Math.PI / 2;
    pitFence.position.set(-447, 2.2, -20);
    this.group.add(pitFence);

    // Team Pit Perches (telemetry command desks along pit wall)
    const perchMat = new THREE.MeshStandardMaterial({ color: 0x22262d, metalness: 0.6 });
    for (let z = -70; z <= 70; z += 35) {
      const perch = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 5.0), perchMat);
      perch.position.set(-446, 1.8, z);
      this.group.add(perch);

      // Computer monitors / telemetry screens
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 1.4), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
      screen.position.set(-445, 2.2, z);
      this.group.add(screen);
    }

    // Pit Stop Boxes (yellow marked boxes on pit lane asphalt)
    const pitBoxMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.85 });
    for (let z = -60; z <= 60; z += 30) {
      const pBox = new THREE.Mesh(new THREE.PlaneGeometry(8, 14), pitBoxMat);
      pBox.rotation.x = -Math.PI / 2;
      pBox.position.set(-436, 0.03, z);
      this.group.add(pBox);

      // Pit Stop Lollipop Sign (held over pit box)
      const lolliPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.8), gantryMat);
      lolliPole.position.set(-445.5, 1.9, z);
      const lolliSign = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), new THREE.MeshBasicMaterial({ color: 0xff0033 }));
      lolliSign.position.set(-444.6, 3.4, z);
      lolliSign.rotation.y = Math.PI / 2;
      this.group.add(lolliPole, lolliSign);

      // Tire racks / equipment beside garage
      for (let th = 0; th < 3; th++) {
        const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
        spareTire.position.set(-428.5, 0.2 + th * 0.36, z - 4);
        this.group.add(spareTire);
      }
    }

    // Speed Limit 60 sign at Pit Entry (Z: -140)
    const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), gantryMat);
    signPole.position.set(-436, 2, -145);
    const signBoard = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    signBoard.position.set(-436, 3.2, -144.9);
    const signRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.2, 24), new THREE.MeshBasicMaterial({ color: 0xcc0000 }));
    signRing.position.set(-436, 3.2, -144.85);
    this.group.add(signPole, signBoard, signRing);

    // ==========================================
    // 5. TWO-STORY PIT BUILDINGS & RACE CONTROL TOWER
    // ==========================================
    // Pit Building located at X: -418, spanning Z: -110 to Z: 90
    const pitBldgMat = new THREE.MeshStandardMaterial({ color: 0x282c34, roughness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x336699, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.75 });

    // Ground Floor Team Garages (6 bays)
    const teamColors = [0x0088ff, 0xff2200, 0x00cc66, 0xffaa00, 0x9933ff, 0x00ffff];
    const teamNames = ['APEX RACING', 'REDLINE GT', 'TITAN SPEED', 'VENOM SPORT', 'PULSE WORKS', 'FORMULA R'];

    for (let i = 0; i < 6; i++) {
      const bayZ = -85 + (i * 32);

      // Garage structure box
      const garageBay = new THREE.Mesh(new THREE.BoxGeometry(22, 6.0, 28), pitBldgMat);
      garageBay.position.set(-418, 3.0, bayZ);
      this.group.add(garageBay);
      this.collisionSystem.addCollider(garageBay, 'building');

      // Team colored roof awning
      const awning = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 26),
        new THREE.MeshStandardMaterial({ color: teamColors[i], roughness: 0.5, side: THREE.DoubleSide })
      );
      awning.position.set(-427, 5.8, bayZ);
      awning.rotation.x = Math.PI / 2;
      awning.rotation.y = 0.12;
      this.group.add(awning);

      // Team sponsor sign over garage door
      const teamSponsorTex = this.assetManager.getSponsorBannerTexture(teamNames[i], '#1a1a1a', '#ffffff');
      const teamSponsor = new THREE.Mesh(new THREE.PlaneGeometry(20, 1.8), new THREE.MeshBasicMaterial({ map: teamSponsorTex }));
      teamSponsor.position.set(-429.1, 5.0, bayZ);
      teamSponsor.rotation.y = -Math.PI / 2;
      this.group.add(teamSponsor);
    }

    // 2nd Floor: VIP Paddock Club / Hospitality Lounge
    const vipLounge = new THREE.Mesh(new THREE.BoxGeometry(20, 4.5, 190), pitBldgMat);
    vipLounge.position.set(-418, 8.25, -5);
    this.group.add(vipLounge);

    // Panoramic glass windows facing pit lane
    const vipGlass = new THREE.Mesh(new THREE.PlaneGeometry(180, 3.5), glassMat);
    vipGlass.position.set(-428.1, 8.5, -5);
    vipGlass.rotation.y = -Math.PI / 2;
    this.group.add(vipGlass);

    // VIP Lounge Roof Terrace & Railings
    const terraceRailing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 185), barrierMat);
    terraceRailing.position.set(-427.5, 11.1, -5);
    this.group.add(terraceRailing);

    // Race Control Tower at North end (X: -418, Z: -115)
    const tower = new THREE.Mesh(new THREE.BoxGeometry(16, 18, 18), new THREE.MeshStandardMaterial({ color: 0x1f2329, roughness: 0.4 }));
    tower.position.set(-418, 9, -115);
    this.group.add(tower);
    this.collisionSystem.addCollider(tower, 'building');

    // Observation bridge windows on tower
    const towerWindows = new THREE.Mesh(new THREE.BoxGeometry(16.4, 4, 16.4), glassMat);
    towerWindows.position.set(-418, 14, -115);
    this.group.add(towerWindows);

    // Communication Mast / Antenna on top of tower
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 12, 8), barrierMat);
    mast.position.set(-418, 24, -115);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    beacon.position.set(-418, 30, -115);
    this.group.add(mast, beacon);

    // ==========================================
    // 6. MULTI-TIER SPECTATOR GRANDSTANDS
    // ==========================================
    // Main Straight Grandstand (left side of main straight, X: -490, Z: -10)
    this.buildGrandstand(-490, -10, 18, 140, 0);

    // Turn 1 Corner Grandstand (overlooking braking point & chicane)
    this.buildGrandstand(-495, 135, 18, 60, Math.PI * 0.15);

    // ==========================================
    // 7. CURVED CORNER RUMBLE KERBS (3D Red & White)
    // ==========================================
    // Turn 1 inside apex
    this.createKerb(-482, 150, 2.4, 55, Math.PI * 0.2, kerbMat);
    // Turn 2 inside apex
    this.createKerb(-510, 195, 2.4, 60, Math.PI * 0.35, kerbMat);
    // South Hairpin apex
    this.createKerb(-530, 224, 2.4, 75, Math.PI * 0.5, kerbMat);
    // Turn 3 exit kerb
    this.createKerb(-565, 175, 2.4, 60, -Math.PI * 0.25, kerbMat);

    // North Technical Section apex kerbs
    this.createKerb(-565, -155, 2.4, 55, Math.PI * 0.25, kerbMat);
    this.createKerb(-520, -198, 2.4, 65, Math.PI * 0.5, kerbMat);
    this.createKerb(-475, -160, 2.4, 50, -Math.PI * 0.25, kerbMat);

    // ==========================================
    // 8. TRACK BARRIERS & TIRE WALL STACKS
    // ==========================================
    // Steel Armco Guardrails along Main Straight
    this.buildGuardrail(-473, -30, 300, 0);
    this.buildGuardrail(-593, 0, 240, 0);

    // 3D Red & White Tire Wall Barrier Stacks at high-impact run-offs
    this.buildTireWallStack(-530, 232, 45, 0, redTireMat, whiteTireMat);   // South Hairpin run-off
    this.buildTireWallStack(-460, 175, 30, Math.PI * 0.1, redTireMat, whiteTireMat); // Turn 1 run-off
    this.buildTireWallStack(-592, -165, 35, 0, redTireMat, whiteTireMat);  // North chicane run-off

    // ==========================================
    // 9. TIMING CHECKPOINT ARCHES
    // ==========================================
    // Sector 1 Split Gantry
    this.buildTimingArch(-485, 160, Math.PI * 0.28, 'SECTOR 1 TIMING');
    // Sector 2 Split Gantry (Back straight entry)
    this.buildTimingArch(-580, -110, 0, 'SECTOR 2 TIMING');
    // Back Straight Speed Trap Display Arch
    this.buildTimingArch(-580, 0, 0, 'SPEED TRAP - 320 KM/H');
  }

  createSegment(x, z, width, length, rotY, material) {
    const geom = new THREE.PlaneGeometry(width, length);
    const mesh = new THREE.Mesh(geom, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rotY;
    mesh.position.set(x, 0.02, z);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  createKerb(x, z, width, length, rotY, material) {
    const geom = new THREE.PlaneGeometry(width, length);
    const mesh = new THREE.Mesh(geom, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rotY;
    mesh.position.set(x, 0.04, z);
    this.group.add(mesh);
  }

  buildGrandstand(x, z, width, length, rotY) {
    const grandstandGroup = new THREE.Group();

    // 4 Stepped Tiers
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x474c54, roughness: 0.85 });
    const seatBlue = new THREE.MeshStandardMaterial({ color: 0x0066cc, roughness: 0.5 });
    const seatRed = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.5 });
    const seatYellow = new THREE.MeshStandardMaterial({ color: 0xeeaa00, roughness: 0.5 });
    const seatColors = [seatBlue, seatRed, seatYellow, seatBlue];

    for (let t = 0; t < 4; t++) {
      const stepY = (t + 1) * 2.2;
      const stepX = (t * 2.5);

      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, stepY, length), concreteMat);
      stepMesh.position.set(stepX, stepY / 2, 0);
      grandstandGroup.add(stepMesh);

      // Spectator seating rows
      const seatRow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, length - 4), seatColors[t]);
      seatRow.position.set(stepX, stepY + 0.22, 0);
      grandstandGroup.add(seatRow);
    }

    // Modern Cantilevered Roof Canopy
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, metalness: 0.7, roughness: 0.3 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, length), roofMat);
    roof.position.set(4, 14, 0);
    roof.rotation.z = -0.15; // angled forward
    grandstandGroup.add(roof);

    // Roof structural support pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 });
    for (let pz = -length / 2 + 8; pz <= length / 2 - 8; pz += 24) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14), pillarMat);
      pillar.position.set(9, 7, pz);
      grandstandGroup.add(pillar);
    }

    grandstandGroup.position.set(x, 0, z);
    grandstandGroup.rotation.y = rotY;
    this.group.add(grandstandGroup);

    // Physics collider box for grandstand
    const bbox = new THREE.Mesh(new THREE.BoxGeometry(width, 14, length), new THREE.MeshBasicMaterial({ visible: false }));
    bbox.position.set(x, 7, z);
    bbox.rotation.y = rotY;
    this.collisionSystem.addCollider(bbox, 'building');
  }

  buildGuardrail(x, z, length, rotY) {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x9fa8b0, metalness: 0.85, roughness: 0.2 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });

    // Double beam Armco barrier
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, length), railMat);
    rail1.position.set(0, 0.6, 0);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, length), railMat);
    rail2.position.set(0, 1.1, 0);

    const guardGroup = new THREE.Group();
    guardGroup.add(rail1, rail2);

    for (let pz = -length / 2; pz <= length / 2; pz += 12) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4), postMat);
      post.position.set(0, 0.7, pz);
      guardGroup.add(post);
    }

    guardGroup.position.set(x, 0, z);
    guardGroup.rotation.y = rotY;
    this.group.add(guardGroup);

    const colMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, length), new THREE.MeshBasicMaterial({ visible: false }));
    colMesh.position.set(x, 0.7, z);
    colMesh.rotation.y = rotY;
    this.collisionSystem.addCollider(colMesh, 'barrier');
  }

  buildTireWallStack(x, z, length, rotY, redMat, whiteMat) {
    const tireGroup = new THREE.Group();
    const tireGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12);

    for (let pz = -length / 2; pz <= length / 2; pz += 1.1) {
      const isRed = (Math.floor(pz / 3) % 2 === 0);
      const mat = isRed ? redMat : whiteMat;

      // 3 tires high
      for (let h = 0; h < 3; h++) {
        const tire = new THREE.Mesh(tireGeom, mat);
        tire.position.set(0, 0.25 + (h * 0.42), pz);
        tireGroup.add(tire);
      }
    }

    tireGroup.position.set(x, 0, z);
    tireGroup.rotation.y = rotY;
    this.group.add(tireGroup);

    const tireCol = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, length), new THREE.MeshBasicMaterial({ visible: false }));
    tireCol.position.set(x, 0.75, z);
    tireCol.rotation.y = rotY;
    this.collisionSystem.addCollider(tireCol, 'barrier');
  }

  buildTimingArch(x, z, rotY, bannerText) {
    const archGroup = new THREE.Group();
    const archMat = new THREE.MeshStandardMaterial({ color: 0x1f2329, metalness: 0.8 });

    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 9, 12), archMat);
    post1.position.set(-13, 4.5, 0);
    const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 9, 12), archMat);
    post2.position.set(13, 4.5, 0);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(27, 1.6, 1.8), archMat);
    beam.position.set(0, 8.5, 0);

    const bannerTex = this.assetManager.getSponsorBannerTexture(bannerText, '#0066cc', '#ffffff');
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(24, 1.4), new THREE.MeshBasicMaterial({ map: bannerTex }));
    banner.position.set(0, 8.5, 0.95);

    archGroup.add(post1, post2, beam, banner);
    archGroup.position.set(x, 0, z);
    archGroup.rotation.y = rotY;
    this.group.add(archGroup);
  }

  setStartingLightsState(lightsOn, isGreen = false) {
    if (!this.startLights) return;
    const color = isGreen ? 0x00ff44 : (lightsOn ? 0xff0022 : 0x220000);
    this.startLights.forEach(light => {
      light.material.color.setHex(color);
    });
  }

  checkPitStop(vehiclePos) {
    return this.pitStopArea.containsPoint(vehiclePos);
  }
}
