import * as THREE from 'three';

/**
 * Dedicated Mountain Environment
 * Includes: Mountains, Alpine Trees, Realistic Curved Roads, Elevation Slopes,
 * Metal Guardrails, Canyon Gorge Bridge, Mountain Rock Tunnel, and Scenic Viewpoints
 */
export class MountainArea {
  constructor(scene, assetManager, collisionSystem) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    // Road curve control points for continuous mountain pass
    this.roadCurve = null;
    this.roadWidth = 14;
    this.roadPoints = [];
    this.roadSegments = [];

    this.buildMountainRegion();
    this.registerElevation();
    this.scene.add(this.group);
  }

  buildMountainRegion() {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x423d38, roughness: 0.95, metalness: 0.1 });
    const snowRockMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.85 });
    const guardrailMat = new THREE.MeshStandardMaterial({ color: 0xcfd4dc, metalness: 0.9, roughness: 0.2 });

    // 1. Mountain Massifs & Jagged Peaks
    const peaks = [
      { x: -160, y: 0, z: -370, r: 110, h: 90 },
      { x: 170, y: 0, z: -430, r: 120, h: 105 },
      { x: -140, y: 0, z: -550, r: 130, h: 125 },
      { x: 150, y: 0, z: -620, r: 140, h: 135 },
      { x: 0, y: 0, z: -690, r: 160, h: 150 } // Highest Summit Peak
    ];

    peaks.forEach(p => {
      // Lower rocky crag
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(p.r, p.h, 14),
        rockMat
      );
      cone.position.set(p.x, p.h * 0.5 - 2, p.z);
      this.group.add(cone);

      // Upper snow/slate dusted ridge
      const subPeak = new THREE.Mesh(
        new THREE.ConeGeometry(p.r * 0.5, p.h * 0.45, 10),
        snowRockMat
      );
      subPeak.position.set(p.x + (Math.random() - 0.5) * 15, p.h * 0.75, p.z + (Math.random() - 0.5) * 15);
      this.group.add(subPeak);

      // Core collision box
      const col = new THREE.Mesh(new THREE.BoxGeometry(p.r * 0.75, p.h, p.r * 0.75));
      col.position.copy(cone.position);
      this.collisionSystem.addCollider(col, 'mountain');
    });

    // 2. Continuous Curved Mountain Pass Roadway
    // Define 3D spline control points (X, Y elevation, Z)
    const splinePoints = [
      new THREE.Vector3(0, 0.5, -280),      // Pass Entry from Riverbed Bridge
      new THREE.Vector3(-45, 4.0, -320),    // Foothills curve
      new THREE.Vector3(-85, 10.0, -360),   // Approach to Hairpin 1
      new THREE.Vector3(-75, 14.0, -390),   // Apex of Hairpin 1
      new THREE.Vector3(-15, 18.0, -385),   // Straightening out of Hairpin 1
      new THREE.Vector3(45, 23.0, -400),    // Approach to Viaduct Bridge
      new THREE.Vector3(95, 27.0, -425),    // Gorge Viaduct Bridge entry
      new THREE.Vector3(135, 30.0, -450),   // Gorge Viaduct Bridge exit
      new THREE.Vector3(145, 34.0, -480),   // Hairpin 2 apex
      new THREE.Vector3(90, 39.0, -505),    // Steep gradient climb
      new THREE.Vector3(20, 44.0, -515),    // Approach to Tunnel
      new THREE.Vector3(-35, 47.0, -525),   // South Tunnel Portal
      new THREE.Vector3(-55, 50.0, -565),   // Inside Tunnel Curve
      new THREE.Vector3(-45, 53.0, -605),   // North Tunnel Portal Exit
      new THREE.Vector3(0, 56.0, -625),     // Approach to Summit Ridge
      new THREE.Vector3(45, 58.0, -640),    // Summit Vista Lookout Loop
      new THREE.Vector3(10, 58.0, -660),    // Summit Lookout Bay
      new THREE.Vector3(-35, 58.0, -645)    // Summit Terminus
    ];

    this.roadCurve = new THREE.CatmullRomCurve3(splinePoints);
    this.roadCurve.curveType = 'centripetal';

    // Discretize into smooth road segments
    const segmentCount = 120;
    this.roadPoints = this.roadCurve.getSpacedPoints(segmentCount);

    const roadTexture = this.assetManager.getRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.75,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < this.roadPoints.length - 1; i++) {
      const p1 = this.roadPoints[i];
      const p2 = this.roadPoints[i + 1];

      const segmentDir = new THREE.Vector3().subVectors(p2, p1);
      const segmentLen = segmentDir.length();
      segmentDir.normalize();

      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(segmentDir, up).normalize();

      // Road ribbon quad
      const geom = new THREE.BufferGeometry();
      const hw = this.roadWidth * 0.5;

      const v1 = new THREE.Vector3().copy(p1).addScaledVector(normal, -hw);
      const v2 = new THREE.Vector3().copy(p1).addScaledVector(normal, hw);
      const v3 = new THREE.Vector3().copy(p2).addScaledVector(normal, -hw);
      const v4 = new THREE.Vector3().copy(p2).addScaledVector(normal, hw);

      const positions = new Float32Array([
        v1.x, v1.y, v1.z,  v2.x, v2.y, v2.z,  v3.x, v3.y, v3.z,
        v2.x, v2.y, v2.z,  v4.x, v4.y, v4.z,  v3.x, v3.y, v3.z
      ]);

      const uvs = new Float32Array([
        0, 0,  1, 0,  0, 1,
        1, 0,  1, 1,  0, 1
      ]);

      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geom.computeVertexNormals();

      const roadMesh = new THREE.Mesh(geom, roadMat);
      roadMesh.receiveShadow = true;
      this.group.add(roadMesh);

      // Store road segment for elevation queries
      this.roadSegments.push({
        p1, p2, v1, v2, v3, v4,
        dir: segmentDir,
        normal,
        length: segmentLen
      });

      // 3. Metallic W-Beam Guardrails along cliff edges
      // Add guardrail on both sides of elevated road
      if (p1.y > 6) {
        this.addGuardrailSegment(v1, v3, guardrailMat);
        this.addGuardrailSegment(v2, v4, guardrailMat);
      }
    }

    // 4. Alpine Canyon Gorge Viaduct Bridge
    this.buildGorgeBridge();

    // 5. Mountain Rock Tunnel
    this.buildMountainTunnel();

    // 6. Scenic Viewpoints (Mid-Pass Overlook & Summit Vista Point)
    this.buildScenicViewpoints();

    // 7. Dense Alpine Pine & Spruce Forests
    this.buildAlpineForest();
  }

  addGuardrailSegment(p1, p2, material) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

    const railGeom = new THREE.BoxGeometry(0.2, 0.7, len);
    const rail = new THREE.Mesh(railGeom, material);
    rail.position.set(mid.x, mid.y + 0.5, mid.z);
    rail.lookAt(p2.x, p2.y + 0.5, p2.z);

    this.group.add(rail);
    this.collisionSystem.addCollider(rail, 'barrier');
  }

  buildGorgeBridge() {
    // Gorge Viaduct spanning points (80, 25, -410) to (140, 31, -455)
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

    // 3 Massive concrete gorge pillars anchoring into the chasm below
    [
      { x: 95, y: 26, z: -425 },
      { x: 115, y: 28, z: -438 },
      { x: 135, y: 30, z: -450 }
    ].forEach(pos => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 2.4, pos.y + 2, 12),
        bridgeMat
      );
      pillar.position.set(pos.x, pos.y * 0.5, pos.z);
      this.group.add(pillar);
    });

    // Arch truss under bridge
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(32, 1.2, 8, 24, Math.PI),
      bridgeMat
    );
    arch.position.set(115, 12, -438);
    arch.rotation.y = -Math.PI / 4;
    this.group.add(arch);
  }

  buildMountainTunnel() {
    // Tunnel bored from (-35, 47, -525) to (-45, 53, -605)
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2d3139, roughness: 0.95 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });

    // South Portal Arch Entrance
    this.buildTunnelPortal(-35, 47, -525, stoneMat);

    // North Portal Arch Exit
    this.buildTunnelPortal(-45, 53, -605, stoneMat);

    // Tunnel Interior Ceiling Shell
    const tunnelCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-35, 47, -525),
      new THREE.Vector3(-55, 50, -565),
      new THREE.Vector3(-45, 53, -605)
    ]);
    const tunnelTube = new THREE.Mesh(
      new THREE.TubeGeometry(tunnelCurve, 16, 9.5, 12, false),
      tileMat
    );
    this.group.add(tunnelTube);

    // Amber Interior Tunnel Lights
    const lightGeom = new THREE.SphereGeometry(0.3, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    for (let t = 0.15; t <= 0.85; t += 0.15) {
      const pt = tunnelCurve.getPoint(t);
      const lightMesh = new THREE.Mesh(lightGeom, lightMat);
      lightMesh.position.set(pt.x, pt.y + 6.2, pt.z);

      const spot = new THREE.PointLight(0xffaa00, 1.5, 18, 1.5);
      spot.position.copy(lightMesh.position);

      this.group.add(lightMesh, spot);
    }
  }

  buildTunnelPortal(x, y, z, material) {
    const portalGroup = new THREE.Group();
    portalGroup.position.set(x, y, z);

    // Stone entrance arch
    const arch = new THREE.Mesh(new THREE.TorusGeometry(8.5, 2.2, 8, 16, Math.PI), material);
    arch.position.y = 0.5;

    // Stone portal facade frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 3), material);
    frame.position.set(0, 5, 0);

    portalGroup.add(arch, frame);
    this.group.add(portalGroup);
    this.collisionSystem.addCollider(frame, 'building');
  }

  buildScenicViewpoints() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });

    // 1. Mid-Pass Switchback Overlook (Lookout 1)
    // Located at the turn before gorge viaduct: (X: -75, Y: 14.5, Z: -390)
    const look1 = new THREE.Group();
    look1.position.set(-88, 14.2, -390);

    const deck1 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.6, 16), stoneMat);
    deck1.position.y = 0.3;
    look1.add(deck1);

    // Wooden gazebo shelter
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(5.5, 3.5, 6), woodMat);
    roof1.position.set(0, 4.5, 0);
    look1.add(roof1);

    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.5), woodMat);
      const ang = (i / 6) * Math.PI * 2;
      post.position.set(Math.cos(ang) * 4.2, 1.75, Math.sin(ang) * 4.2);
      look1.add(post);
    }
    this.group.add(look1);

    // 2. Summit Vista Point & Astronomical Lookout (Lookout 2)
    // Located at the summit plateau: (X: 10, Y: 58.2, Z: -660)
    const summitLookout = new THREE.Group();
    summitLookout.position.set(10, 58.2, -660);

    // Panoramic stone plaza
    const summitPlaza = new THREE.Mesh(new THREE.CylinderGeometry(14, 15, 0.8, 24), stoneMat);
    summitPlaza.position.y = 0.4;
    summitLookout.add(summitPlaza);

    // Panoramic observation railing
    const railing = new THREE.Mesh(new THREE.TorusGeometry(13.8, 0.15, 8, 32), woodMat);
    railing.rotation.x = Math.PI / 2;
    railing.position.y = 1.2;
    summitLookout.add(railing);

    // Coin-operated Vista Binoculars Stands
    [-6, 6].forEach(dx => {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 }));
      stand.position.set(dx, 1.1, 8.5);

      const bino = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.6), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
      bino.position.set(dx, 1.9, 8.5);

      summitLookout.add(stand, bino);
    });

    // Summit Astronomical Observatory Dome
    const obsBase = new THREE.Mesh(new THREE.CylinderGeometry(8, 10, 8, 16), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 }));
    obsBase.position.set(0, 4.4, -18);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(7.5, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 }));
    dome.position.set(0, 8.4, -18);

    summitLookout.add(obsBase, dome);
    this.group.add(summitLookout);

    // 3. Steep Grade Warning Signs
    this.addWarningSign(-70, 10.5, -345, '12% STEEP GRADE - SLOW');
  }

  addWarningSign(x, y, z, text) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), new THREE.MeshStandardMaterial({ color: 0x64748b }));
    post.position.set(x, y + 2, z);

    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 0.1), new THREE.MeshBasicMaterial({ color: 0xffea00 }));
    board.position.set(0, 1.6, 0);
    board.rotation.z = Math.PI / 4; // Diamond shape
    post.add(board);

    this.group.add(post);
  }

  buildAlpineForest() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x452b17, roughness: 0.9 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x143d1f, roughness: 0.8 });

    // Spawn 140 alpine pine trees along mountainsides and roadway curves
    for (let i = 0; i < 140; i++) {
      const t = Math.random();
      const pt = this.roadCurve.getPoint(t);

      // Offset from road to place trees in the terrain
      const offsetDist = 12 + Math.random() * 45;
      const angle = Math.random() * Math.PI * 2;
      const tx = pt.x + Math.cos(angle) * offsetDist;
      const tz = pt.z + Math.sin(angle) * offsetDist;
      const ty = Math.max(0, pt.y - 2 + (Math.random() - 0.5) * 6);

      this.addPineTree(tx, ty, tz, trunkMat, pineMat);
    }
  }

  addPineTree(x, y, z, trunkMat, pineMat) {
    const scale = 0.8 + Math.random() * 0.7;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * scale, 0.4 * scale, 5.0 * scale, 8), trunkMat);
    trunk.position.set(x, y + 2.5 * scale, z);

    // 3 Tiered cone foliage layers
    const layer1 = new THREE.Mesh(new THREE.ConeGeometry(2.8 * scale, 4.0 * scale, 8), pineMat);
    layer1.position.set(x, y + 4.5 * scale, z);

    const layer2 = new THREE.Mesh(new THREE.ConeGeometry(2.2 * scale, 3.5 * scale, 8), pineMat);
    layer2.position.set(x, y + 6.5 * scale, z);

    const layer3 = new THREE.Mesh(new THREE.ConeGeometry(1.5 * scale, 3.0 * scale, 8), pineMat);
    layer3.position.set(x, y + 8.2 * scale, z);

    this.group.add(trunk, layer1, layer2, layer3);
    this.collisionSystem.addCollider(trunk, 'tree');
  }

  registerElevation() {
    // Elevation provider function that queries exact road height at any (x, z)
    const segments = this.roadSegments;
    const roadWidth = this.roadWidth;

    this.collisionSystem.setTerrainHeightProvider((x, z) => {
      // Check if coordinates fall within any mountain pass road segment
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];

        // Vector from p1 to vehicle
        const dx = x - seg.p1.x;
        const dz = z - seg.p1.z;

        // Project along segment forward direction
        const proj = dx * seg.dir.x + dz * seg.dir.z;
        if (proj >= 0 && proj <= seg.length) {
          // Project perpendicular
          const perp = Math.abs(dx * seg.normal.x + dz * seg.normal.z);
          if (perp <= roadWidth * 0.55) {
            // Linear elevation interpolation along the segment
            const progress = proj / seg.length;
            return seg.p1.y + (seg.p2.y - seg.p1.y) * progress;
          }
        }
      }

      // Summit lookout plaza elevation
      const distToSummit = Math.hypot(x - 10, z - (-660));
      if (distToSummit <= 18) {
        return 58.2;
      }

      // Mid-pass overlook elevation
      const distToMidLook = Math.hypot(x - (-88), z - (-390));
      if (distToMidLook <= 12) {
        return 14.2;
      }

      return null; // Default to normal ground or ramp
    });
  }
}
