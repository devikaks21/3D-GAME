import * as THREE from 'three';
import { GameModes } from '../core/GameState.js';
import { Checkpoint } from '../utilities/Checkpoint.js';
import { DRIVING_LESSONS, ROAD_TEST_ROUTE, PARKING_TEST } from './DrivingTest.js';
import { OFFICIAL_COURSE_TEST, COURSE_TESTS } from './CourseTest.js';

/**
 * Dedicated Driving School System
 * Manages Practice Mode (Steering, Braking, Turning, Parking, Indicators, Reversing, Gear Control)
 * and Official Tests (Road Test, Course Test, Parking Test)
 */
export class DrivingSchoolManager {
  constructor(scene, gameState, audioManager, collisionSystem) {
    this.scene = scene;
    this.gameState = gameState;
    this.audio = audioManager;
    this.collisionSystem = collisionSystem;

    this.subMode = 'PRACTICE'; // 'PRACTICE' | 'ROAD_TEST' | 'COURSE_TEST' | 'PARKING_TEST'
    this.activeSkill = 'steering'; // 'steering' | 'braking' | 'turning' | 'parking' | 'indicators' | 'reversing' | 'gear_control'

    // Completed practice skills set (no strict score, just mastery progression)
    this.masteredSkills = new Set(this.gameState.practiceSkillsMastered || []);

    // 3D Visual Objects Group (cones, painted lines, decals, stop boxes)
    this.worldGroup = new THREE.Group();
    this.worldGroup.name = 'DrivingSchoolPracticeArena';
    this.scene.add(this.worldGroup);

    this.checkpoints = [];
    this.checkpointMeshes = [];
    this.currentCheckpointIndex = 0;

    // Real-time tracking metrics for practice mode
    this.skillProgress = 0; // 0.0 to 1.0
    this.tutorMessage = '';
    this.tutorStatus = 'ready'; // 'ready', 'active', 'success'
    this.parkedTimer = 0;
    this.reverseDistance = 0;
    this.lastPos = new THREE.Vector3();
    this.slalomGatesPassed = 0;
    this.gearShiftsObserved = new Set();
    this.indicatorTested = false;
    this.initialGear = 3;

    // Road Test specific telemetry & rule trackers
    this.roadTestTimer = 0;
    this.roadTestMistakes = 0;
    this.speedingTimer = 0;
    this.speedingCooldown = 0;
    this.collisionCooldown = 0;
    this.wrongWayTimer = 0;
    this.wrongWayCooldown = 0;
    this.offRouteTimer = 0;
    this.offRouteCooldown = 0;
    this.checkpointMissCooldown = 0;
    this.lastInfraction = null;
    this.failReported = false;
    this.testRewarded = false;

    // Course Test specific telemetry
    this.courseTimer = 0;
    this.courseCollisions = 0;
    this.courseMissedCheckpoints = 0;
    this.courseAccuracy = 100;
    this.courseCollisionCooldown = 0;
    this.courseMissCooldown = 0;

    // Parking Test specific telemetry
    this.parkingHoldTimer = 0;
    this.parkingStageIndex = 0;
    this.parkingAccuracy = 86;
    this.stageAccuracies = [];
    this.parkingStalls = PARKING_TEST.stalls || [];
    this.isInsideParkingBay = false;

    // Arena base center at South-West Academy Grounds: X: -135, Z: 135
    this.arenaCenter = new THREE.Vector3(-135, 0, 135);

    // Build the visual 3D practice layout
    this.buildPracticeGrounds();
  }

  /**
   * Spawns physical 3D practice environment features:
   * Slaloms, marked stop zones, parking stalls, reverse lanes, and painted indicators
   */
  buildPracticeGrounds() {
    // Clear previous objects
    while (this.worldGroup.children.length > 0) {
      const obj = this.worldGroup.children[0];
      this.worldGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    const ox = this.arenaCenter.x;
    const oz = this.arenaCenter.z;

    const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xffbb00 });
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.4 });
    const greenZoneMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const stopZoneMat = new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.4, side: THREE.DoubleSide });

    // 1. STEERING SLALOM GATES (Zone: X: -165 to -105, Z: 110)
    for (let i = 0; i < 5; i++) {
      const gx = ox - 20 + i * 10;
      const gz = oz - 25 + (i % 2 === 0 ? -4 : 4);
      this.createPylon(gx, gz, coneMat);
    }

    // 2. BRAKING STOP ZONE BOX (Zone: X: -135, Z: 135)
    const stopBox = new THREE.Mesh(new THREE.PlaneGeometry(8, 14), stopZoneMat);
    stopBox.rotation.x = -Math.PI / 2;
    stopBox.position.set(ox, 0.38, oz);
    this.worldGroup.add(stopBox);

    // Stop Line
    const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.position.set(ox, 0.39, oz + 6.5);
    this.worldGroup.add(stopLine);

    // 3. PARKING PRACTICE BAY (Marked bay with glowing boundaries and 4 corner cones)
    const parkBayX = ox - 18;
    const parkBayZ = oz + 24;
    const parkDecal = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 7.5), greenZoneMat);
    parkDecal.rotation.x = -Math.PI / 2;
    parkDecal.position.set(parkBayX, 0.38, parkBayZ);
    this.worldGroup.add(parkDecal);

    // Parking Stall Lines (U-shape)
    const pLineL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 7.5), yellowLineMat);
    pLineL.rotation.x = -Math.PI / 2;
    pLineL.position.set(parkBayX - 2.1, 0.39, parkBayZ);

    const pLineR = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 7.5), yellowLineMat);
    pLineR.rotation.x = -Math.PI / 2;
    pLineR.position.set(parkBayX + 2.1, 0.39, parkBayZ);

    const pLineB = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.2), yellowLineMat);
    pLineB.rotation.x = -Math.PI / 2;
    pLineB.position.set(parkBayX, 0.39, parkBayZ + 3.75);

    this.worldGroup.add(pLineL, pLineR, pLineB);

    // 4 Corner Cones around Parking Bay
    this.createPylon(parkBayX - 2.1, parkBayZ - 3.75, coneMat);
    this.createPylon(parkBayX + 2.1, parkBayZ - 3.75, coneMat);
    this.createPylon(parkBayX - 2.1, parkBayZ + 3.75, coneMat);
    this.createPylon(parkBayX + 2.1, parkBayZ + 3.75, coneMat);

    // 4. REVERSING CORRIDOR (Marked lane with entry and rear stopping box)
    const revX = ox + 22;
    const revZ = oz + 20;
    for (let r = 0; r <= 20; r += 5) {
      const guideL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.5), whiteLineMat);
      guideL.rotation.x = -Math.PI / 2;
      guideL.position.set(revX - 2.5, 0.38, revZ - r);

      const guideR = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.5), whiteLineMat);
      guideR.rotation.x = -Math.PI / 2;
      guideR.position.set(revX + 2.5, 0.38, revZ - r);

      this.worldGroup.add(guideL, guideR);
    }
  }

  createPylon(x, z, material) {
    const pylon = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.75, 10), material);
    pylon.position.set(x, 0.65, z);
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.23, 0.15, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    ring.position.set(0, 0.08, 0);
    pylon.add(ring);
    this.worldGroup.add(pylon);
  }

  /**
   * Spawns physical 3D Course Test features:
   * Slalom pylons, apex markers, 5m narrow road corridor cone walls, red stop zone, and parking section bay.
   */
  buildCourseTestGrounds() {
    while (this.worldGroup.children.length > 0) {
      const obj = this.worldGroup.children[0];
      this.worldGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.4 });
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xffbb00 });
    const stopZoneMat = new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
    const greenZoneMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.38, side: THREE.DoubleSide });

    // 1. SLALOM CONES (Z: 70 to 95 at X: -165)
    const slalomPositions = [
      [-167, 72], [-163, 77], [-167, 82], [-163, 87], [-166, 92]
    ];
    slalomPositions.forEach(([cx, cz]) => this.createPylon(cx, cz, coneMat));

    // 2. TURN 1 APEX CONES (X: -165, Z: 125)
    const turn1Cones = [
      [-166.5, 118], [-166.5, 123], [-164, 127], [-158, 127.5], [-152, 127.5]
    ];
    turn1Cones.forEach(([cx, cz]) => this.createPylon(cx, cz, coneMat));

    // 3. S-CHICANE CURVES (X: -130, Z: 145)
    const chicaneCones = [
      [-140, 142], [-135, 147], [-130, 142], [-125, 147], [-120, 143]
    ];
    chicaneCones.forEach(([cx, cz]) => this.createPylon(cx, cz, coneMat));

    // 4. HAIRPIN BEND APEX PYLONS (X: -95, Z: 135)
    const hairpinCones = [
      [-105, 140], [-99, 141], [-93, 137], [-93, 131], [-97, 127]
    ];
    hairpinCones.forEach(([cx, cz]) => this.createPylon(cx, cz, coneMat));

    // 5. NARROW ROAD CORRIDOR (Z: 120 down to 75 along X: -95, Width: 5.2m)
    for (let z = 120; z >= 75; z -= 5) {
      // Left boundary wall of cones at X = -97.6
      this.createPylon(-97.6, z, coneMat);
      // Right boundary wall of cones at X = -92.4
      this.createPylon(-92.4, z, coneMat);

      // Floor lane stripe markers
      const stripeL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.5), whiteLineMat);
      stripeL.rotation.x = -Math.PI / 2;
      stripeL.position.set(-97.4, 0.38, z);

      const stripeR = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.5), whiteLineMat);
      stripeR.rotation.x = -Math.PI / 2;
      stripeR.position.set(-92.6, 0.38, z);

      this.worldGroup.add(stripeL, stripeR);
    }

    // 6. MANDATORY STOP ZONE (X: -95, Z: 60)
    const stopBox = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 8.5), stopZoneMat);
    stopBox.rotation.x = -Math.PI / 2;
    stopBox.position.set(-95, 0.38, 60);
    this.worldGroup.add(stopBox);

    const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 0.5), whiteLineMat);
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.position.set(-95, 0.39, 64);
    this.worldGroup.add(stopLine);

    // 7. APPROACH TO PARKING PYLONS
    this.createPylon(-108, 54, coneMat);
    this.createPylon(-120, 52, coneMat);
    this.createPylon(-132, 52, coneMat);

    // 8. FINAL PARKING SECTION BAY (X: -145, Z: 50)
    const pBay = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 7.5), greenZoneMat);
    pBay.rotation.x = -Math.PI / 2;
    pBay.position.set(-145, 0.38, 50);
    this.worldGroup.add(pBay);

    // Parking lines
    const pLineL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 7.5), yellowLineMat);
    pLineL.rotation.x = -Math.PI / 2;
    pLineL.position.set(-145 - 2.1, 0.39, 50);

    const pLineR = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 7.5), yellowLineMat);
    pLineR.rotation.x = -Math.PI / 2;
    pLineR.position.set(-145 + 2.1, 0.39, 50);

    const pLineB = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.2), yellowLineMat);
    pLineB.rotation.x = -Math.PI / 2;
    pLineB.position.set(-145, 0.39, 50 + 3.75);

    this.worldGroup.add(pLineL, pLineR, pLineB);

    // 4 Corner Cones around Parking Bay
    this.createPylon(-145 - 2.1, 50 - 3.75, coneMat);
    this.createPylon(-145 + 2.1, 50 - 3.75, coneMat);
    this.createPylon(-145 - 2.1, 50 + 3.75, coneMat);
    this.createPylon(-145 + 2.1, 50 + 3.75, coneMat);
  }

  /**
   * Spawns physical 3D Parking Challenge bays:
   * 1. Straight parking bay (forward entrance)
   * 2. Reverse parking bay (reverse entrance & stop buffer)
   * 3. Parallel parking slot (curbside bay with boundary poles)
   */
  buildParkingTestGrounds() {
    while (this.worldGroup.children.length > 0) {
      const obj = this.worldGroup.children[0];
      this.worldGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.4 });
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xffbb00 });
    const greenZoneMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.4, side: THREE.DoubleSide });

    // STALL 1: STRAIGHT PARKING BAY (X: -135, Z: 103, 3.6m x 6.8m)
    const bay1 = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6.8), greenZoneMat);
    bay1.rotation.x = -Math.PI / 2;
    bay1.position.set(-135, 0.38, 103);
    this.worldGroup.add(bay1);

    const b1L = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 6.8), yellowLineMat);
    b1L.rotation.x = -Math.PI / 2;
    b1L.position.set(-135 - 1.8, 0.39, 103);
    const b1R = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 6.8), yellowLineMat);
    b1R.rotation.x = -Math.PI / 2;
    b1R.position.set(-135 + 1.8, 0.39, 103);
    const b1Back = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.2), whiteLineMat);
    b1Back.rotation.x = -Math.PI / 2;
    b1Back.position.set(-135, 0.39, 103 + 3.4);
    this.worldGroup.add(b1L, b1R, b1Back);

    this.createPylon(-135 - 1.8, 103 - 3.4, coneMat);
    this.createPylon(-135 + 1.8, 103 - 3.4, coneMat);
    this.createPylon(-135 - 1.8, 103 + 3.4, coneMat);
    this.createPylon(-135 + 1.8, 103 + 3.4, coneMat);

    // STALL 2: REVERSE PARKING BAY (X: -120, Z: 135, 3.6m x 6.8m)
    const bay2 = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6.8), greenZoneMat);
    bay2.rotation.x = -Math.PI / 2;
    bay2.position.set(-120, 0.38, 135);
    this.worldGroup.add(bay2);

    const b2L = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 6.8), yellowLineMat);
    b2L.rotation.x = -Math.PI / 2;
    b2L.position.set(-120 - 1.8, 0.39, 135);
    const b2R = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 6.8), yellowLineMat);
    b2R.rotation.x = -Math.PI / 2;
    b2R.position.set(-120 + 1.8, 0.39, 135);
    const b2Stop = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.3), whiteLineMat);
    b2Stop.rotation.x = -Math.PI / 2;
    b2Stop.position.set(-120, 0.39, 135 - 3.4);
    this.worldGroup.add(b2L, b2R, b2Stop);

    this.createPylon(-120 - 1.8, 135 - 3.4, coneMat);
    this.createPylon(-120 + 1.8, 135 - 3.4, coneMat);
    this.createPylon(-120 - 1.8, 135 + 3.4, coneMat);
    this.createPylon(-120 + 1.8, 135 + 3.4, coneMat);

    // STALL 3: PARALLEL PARKING SLOT (X: -150, Z: 155, 3.4m x 7.8m, Rotated along curb)
    const bay3 = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.4), greenZoneMat);
    bay3.rotation.x = -Math.PI / 2;
    bay3.position.set(-150, 0.38, 155);
    this.worldGroup.add(bay3);

    const b3F = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 3.4), yellowLineMat);
    b3F.rotation.x = -Math.PI / 2;
    b3F.position.set(-150 - 3.9, 0.39, 155);
    const b3B = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 3.4), yellowLineMat);
    b3B.rotation.x = -Math.PI / 2;
    b3B.position.set(-150 + 3.9, 0.39, 155);
    const b3Curb = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 0.2), whiteLineMat);
    b3Curb.rotation.x = -Math.PI / 2;
    b3Curb.position.set(-150, 0.39, 155 - 1.7);
    this.worldGroup.add(b3F, b3B, b3Curb);

    this.createPylon(-150 - 3.9, 155 - 1.7, coneMat);
    this.createPylon(-150 - 3.9, 155 + 1.7, coneMat);
    this.createPylon(-150 + 3.9, 155 - 1.7, coneMat);
    this.createPylon(-150 + 3.9, 155 + 1.7, coneMat);
  }

  /**
   * Start a Driving School mode:
   * @param {string} mode 'PRACTICE' | 'ROAD_TEST' | 'COURSE_TEST' | 'PARKING_TEST'
   * @param {object} options Optional options such as initial activeSkill
   */
  startMode(mode, options = {}) {
    this.subMode = mode || 'PRACTICE';
    this.cleanupCheckpoints();

    if (this.subMode === 'PRACTICE') {
      const skill = options.skill || 'steering';
      this.selectPracticeSkill(skill);
    } else if (this.subMode === 'ROAD_TEST') {
      this.roadTestTimer = 0;
      this.roadTestMistakes = 0;
      this.speedingTimer = 0;
      this.speedingCooldown = 0;
      this.collisionCooldown = 0;
      this.wrongWayTimer = 0;
      this.wrongWayCooldown = 0;
      this.offRouteTimer = 0;
      this.offRouteCooldown = 0;
      this.checkpointMissCooldown = 0;
      this.lastInfraction = null;
      this.failReported = false;
      this.testRewarded = false;
      this.setupTestCheckpoints(ROAD_TEST_ROUTE.checkpoints);
      this.tutorMessage = 'ROAD TEST: Follow the route checkpoints through city traffic safely. Observe speed limits and avoid collisions!';
    } else if (this.subMode === 'COURSE_TEST') {
      this.courseTimer = 0;
      this.courseCollisions = 0;
      this.courseMissedCheckpoints = 0;
      this.courseAccuracy = 100;
      this.courseCollisionCooldown = 0;
      this.courseMissCooldown = 0;
      this.testRewarded = false;
      this.setupTestCheckpoints(OFFICIAL_COURSE_TEST.checkpoints);
      this.buildCourseTestGrounds();
      this.tutorMessage = 'COURSE TEST: Negotiate cones, tight turns, narrow road corridor, stop zone, and parking section with high accuracy!';
    } else if (this.subMode === 'PARKING_TEST') {
      this.parkingHoldTimer = 0;
      this.parkingStageIndex = 0;
      this.parkingAccuracy = 86;
      this.stageAccuracies = [];
      this.parkingStalls = PARKING_TEST.stalls || [];
      this.isInsideParkingBay = false;
      this.testRewarded = false;
      this.setupTestCheckpoints(PARKING_TEST.checkpoints);
      this.buildParkingTestGrounds();
      this.tutorMessage = 'PARKING TEST: Position vehicle inside the marked area.';
    }
  }

  /**
   * Select an individual practice learning skill
   */
  selectPracticeSkill(skillName) {
    this.activeSkill = skillName;
    this.skillProgress = 0;
    this.parkedTimer = 0;
    this.reverseDistance = 0;
    this.slalomGatesPassed = 0;
    this.gearShiftsObserved.clear();
    this.indicatorTested = false;
    this.cleanupCheckpoints();

    const ox = this.arenaCenter.x;
    const oz = this.arenaCenter.z;

    switch (skillName) {
      case 'steering':
        this.tutorMessage = 'STEERING: Use [A] and [D] (or Left/Right keys) to weave through the slalom gates.';
        this.setupCheckpoints([
          { x: ox - 20, z: oz - 29, radius: 4.5, title: 'Gate 1' },
          { x: ox - 10, z: oz - 21, radius: 4.5, title: 'Gate 2' },
          { x: ox, z: oz - 29, radius: 4.5, title: 'Gate 3' },
          { x: ox + 10, z: oz - 21, radius: 4.5, title: 'Gate 4' },
          { x: ox + 20, z: oz - 25, radius: 5.0, title: 'Slalom Exit' }
        ]);
        break;

      case 'braking':
        this.tutorMessage = 'BRAKING: Accelerate above 30 KM/H, then press [S] or [SPACE] to stop inside the RED STOP BOX.';
        this.setupCheckpoints([
          { x: ox, z: oz - 40, radius: 6, title: 'Accelerate' },
          { x: ox, z: oz, radius: 5, isStopZone: true, title: 'Stop Box' }
        ]);
        break;

      case 'turning':
        this.tutorMessage = 'TURNING: Approach the 90° corner. Slow down before turning, clip the apex, and exit smoothly.';
        this.setupCheckpoints([
          { x: ox + 30, z: oz - 20, radius: 6, title: 'Turn Entry' },
          { x: ox + 35, z: oz, radius: 6, title: 'Corner Apex' },
          { x: ox + 20, z: oz + 15, radius: 6, title: 'Turn Exit' }
        ]);
        break;

      case 'parking':
        this.tutorMessage = 'PARKING: Drive forward into the GREEN PARKING BAY between the cones and come to a complete stop.';
        this.setupCheckpoints([
          { x: ox - 18, z: oz + 24, radius: 4.5, isParkingBay: true, title: 'Parking Bay' }
        ]);
        break;

      case 'indicators':
        this.tutorMessage = 'INDICATORS: Press [I] for Left Indicator or [K] for Right Indicator before turning. Auto-cancels after turn!';
        this.setupCheckpoints([
          { x: ox, z: oz - 15, radius: 6, title: 'Signal Point' },
          { x: ox - 15, z: oz, radius: 6, title: 'Complete Turn' }
        ]);
        break;

      case 'reversing':
        this.tutorMessage = 'REVERSING: Shift to Reverse [S] or [Q], check mirrors/rear cam [4], and back up carefully down the lane.';
        this.setupCheckpoints([
          { x: ox + 22, z: oz + 5, radius: 5, title: 'Reverse Start' },
          { x: ox + 22, z: oz + 25, radius: 5, isStopZone: true, title: 'Reverse Bay' }
        ]);
        break;

      case 'gear_control':
        this.tutorMessage = 'GEAR CONTROL: Press [G] to switch Manual/Auto. Accelerate in Gear 1, then upshift [E] into Gear 2 and 3!';
        this.setupCheckpoints([
          { x: ox - 35, z: oz + 35, radius: 7, title: 'Straightaway Sprint' },
          { x: ox + 25, z: oz + 35, radius: 7, title: 'Gear Sprint Finish' }
        ]);
        break;

      default:
        this.tutorMessage = 'Practice driving freely and explore all vehicle skills.';
        break;
    }
  }

  /**
   * Get ideal spawn location for the active sub-mode or skill
   */
  getSpawnPosition(skill = null) {
    const active = skill || this.activeSkill;
    const ox = this.arenaCenter.x;
    const oz = this.arenaCenter.z;

    if (this.subMode === 'ROAD_TEST') {
      return ROAD_TEST_ROUTE.startPoint || { x: 4.2, y: 0.45, z: -15, heading: 0 };
    }
    if (this.subMode === 'COURSE_TEST') {
      return OFFICIAL_COURSE_TEST.startPoint || { x: -165, y: 0.45, z: 65, heading: 0 };
    }
    if (this.subMode === 'PARKING_TEST') {
      const activeStall = this.parkingStalls[this.parkingStageIndex];
      if (activeStall && activeStall.spawnPoint) {
        return activeStall.spawnPoint;
      }
      return { x: -135, y: 0.45, z: 80, heading: 0 };
    }

    // Practice Mode Skill Spawns
    switch (active) {
      case 'steering':
        return { x: ox - 28, y: 0.45, z: oz - 25, heading: Math.PI / 2 };
      case 'braking':
        return { x: ox, y: 0.45, z: oz - 55, heading: 0 };
      case 'turning':
        return { x: ox + 30, y: 0.45, z: oz - 35, heading: 0 };
      case 'parking':
        return { x: ox - 18, y: 0.45, z: oz + 10, heading: 0 };
      case 'indicators':
        return { x: ox, y: 0.45, z: oz - 30, heading: 0 };
      case 'reversing':
        return { x: ox + 22, y: 0.45, z: oz + 2, heading: 0 };
      case 'gear_control':
        return { x: ox - 45, y: 0.45, z: oz + 35, heading: Math.PI / 2 };
      default:
        return { x: ox, y: 0.45, z: oz - 20, heading: 0 };
    }
  }

  setupCheckpoints(cpList) {
    this.checkpoints = cpList;
    this.currentCheckpointIndex = 0;

    cpList.forEach((cp, idx) => {
      let groundY = cp.y !== undefined ? cp.y : 0.4;
      if (this.collisionSystem) {
        const gh = this.collisionSystem.getGroundHeight(cp.x, cp.z);
        if (gh !== 0) groundY = gh;
      }
      const pos = new THREE.Vector3(cp.x, groundY, cp.z);
      const color = cp.isParkingBay ? 0x00ff88 : (cp.isStopZone ? 0xff2244 : 0x00f0ff);
      const ring = new Checkpoint(this.scene, pos, cp.radius || 5, color);
      ring.setActive(idx === 0);
      this.checkpointMeshes.push(ring);
    });
  }

  setupTestCheckpoints(cpList) {
    this.setupCheckpoints(cpList);
  }

  cleanupCheckpoints() {
    this.checkpointMeshes.forEach(mesh => {
      if (mesh.destroy) mesh.destroy();
      else if (mesh.group) this.scene.remove(mesh.group);
    });
    this.checkpointMeshes = [];
    this.checkpoints = [];
    this.currentCheckpointIndex = 0;
  }

  /**
   * Main per-frame update loop
   * Evaluates practice skill techniques and official test milestones
   */
  update(dt, vehiclePhysics, vehicleController, inputManager) {
    if (!vehiclePhysics) return null;

    const speedKmh = Math.abs(vehiclePhysics.speedKmh);
    const pos = vehiclePhysics.position;

    // A. PRACTICE MODE EVALUATION
    if (this.subMode === 'PRACTICE') {
      this.updatePracticeMode(dt, vehiclePhysics, vehicleController, inputManager);
      return {
        subMode: 'PRACTICE',
        activeSkill: this.activeSkill,
        skillProgress: this.skillProgress,
        tutorMessage: this.tutorMessage,
        tutorStatus: this.tutorStatus,
        masteredSkills: Array.from(this.masteredSkills),
        totalSkills: 7,
        currentCheckpointIndex: this.currentCheckpointIndex,
        totalCheckpoints: this.checkpoints.length
      };
    }

    // B. OFFICIAL TESTS (Road Test, Course Test, Parking Test)
    return this.updateTestMode(dt, vehiclePhysics, vehicleController);
  }

  /**
   * Real-time practice skill checks
   * Note: "No strict score is required in practice mode"
   */
  updatePracticeMode(dt, vehiclePhysics, vehicleController, inputManager) {
    const speedKmh = Math.abs(vehiclePhysics.speedKmh);
    const pos = vehiclePhysics.position;

    // Checkpoint navigation
    if (this.currentCheckpointIndex < this.checkpoints.length) {
      const targetCp = this.checkpoints[this.currentCheckpointIndex];
      const dist = Math.hypot(pos.x - targetCp.x, pos.z - targetCp.z);

      if (dist <= (targetCp.radius || 5)) {
        // Advanced condition for stop zones / parking stalls
        let canAdvance = true;
        if (targetCp.isStopZone) {
          canAdvance = speedKmh < 2.0;
        } else if (targetCp.isParkingBay) {
          canAdvance = speedKmh < 1.0;
        }

        if (canAdvance) {
          if (this.checkpointMeshes[this.currentCheckpointIndex]) {
            this.checkpointMeshes[this.currentCheckpointIndex].setActive(false);
          }
          this.currentCheckpointIndex++;
          this.audio?.playCheckpointChime();

          if (this.currentCheckpointIndex < this.checkpoints.length) {
            if (this.checkpointMeshes[this.currentCheckpointIndex]) {
              this.checkpointMeshes[this.currentCheckpointIndex].setActive(true);
            }
          }
        }
      }
    }

    // Specific Skill Mastery Progression
    switch (this.activeSkill) {
      case 'steering': {
        const steerInput = Math.abs(vehiclePhysics.steerAngle || 0);
        if (speedKmh > 8 && steerInput > 0.1) {
          this.skillProgress = Math.min(1.0, this.skillProgress + dt * 0.25);
        }
        if (this.currentCheckpointIndex >= this.checkpoints.length - 1 || this.skillProgress >= 0.85) {
          this.markSkillMastered('steering', '🌟 STEERING MASTERED! Smooth directional control achieved.');
        }
        break;
      }

      case 'braking': {
        if (speedKmh > 25) {
          this.skillProgress = Math.max(this.skillProgress, 0.4);
          this.tutorMessage = 'Good speed! Now press [S] or [SPACE] to come to a halt in the STOP BOX.';
        }
        const inStopZone = Math.hypot(pos.x - this.arenaCenter.x, pos.z - this.arenaCenter.z) < 7.0;
        if (inStopZone && speedKmh < 1.5 && this.skillProgress >= 0.4) {
          this.skillProgress = 1.0;
          this.markSkillMastered('braking', '🛑 BRAKING MASTERED! Precise stop inside the target zone.');
        }
        break;
      }

      case 'turning': {
        const lateralG = Math.abs(vehiclePhysics.lateralSpeed || 0);
        if (speedKmh > 12 && this.currentCheckpointIndex >= 1) {
          this.skillProgress = Math.min(1.0, this.skillProgress + dt * 0.35);
        }
        if (this.currentCheckpointIndex >= this.checkpoints.length) {
          this.skillProgress = 1.0;
          this.markSkillMastered('turning', '🎯 TURNING MASTERED! Excellent cornering line and apex speed.');
        }
        break;
      }

      case 'parking': {
        const parkBay = this.checkpoints[0];
        if (parkBay) {
          const dist = Math.hypot(pos.x - parkBay.x, pos.z - parkBay.z);
          if (dist < 3.8) {
            if (speedKmh < 1.0) {
              this.parkedTimer += dt;
              this.skillProgress = Math.min(1.0, this.parkedTimer / 1.5);
              this.tutorMessage = `Parking alignment hold: ${Math.round(this.skillProgress * 100)}%...`;
              if (this.parkedTimer >= 1.5) {
                this.markSkillMastered('parking', '🅿️ PARKING MASTERED! Centered perfectly inside the marked bay.');
              }
            } else {
              this.tutorMessage = 'Slow down and bring the car to a full stop inside the lines.';
            }
          }
        }
        break;
      }

      case 'indicators': {
        const indState = vehiclePhysics.indicatorState; // 'left' | 'right' | 'hazard' | 'off'
        if (indState === 'left' || indState === 'right' || indState === 'hazard') {
          this.indicatorTested = true;
          this.skillProgress = Math.max(this.skillProgress, 0.5);
          this.tutorMessage = `Indicator active [${indState.toUpperCase()}]. Now complete the turn to test auto-cancel!`;
        }
        if (this.indicatorTested && this.currentCheckpointIndex >= this.checkpoints.length) {
          this.skillProgress = 1.0;
          this.markSkillMastered('indicators', '💡 INDICATORS MASTERED! Signaled intent and turn auto-cancelled.');
        }
        break;
      }

      case 'reversing': {
        // In reverse gear (currentGear === 1 is Reverse) and traveling backward
        const isReverseGear = vehiclePhysics.currentGear === 1;
        const isMovingBack = vehiclePhysics.forwardSpeed < -0.5;

        if (isReverseGear && isMovingBack) {
          this.reverseDistance += Math.abs(vehiclePhysics.forwardSpeed) * dt;
          this.skillProgress = Math.min(1.0, this.reverseDistance / 15.0);
          this.tutorMessage = `Reversing backward: ${this.reverseDistance.toFixed(1)}m / 15m...`;
        }

        if (this.reverseDistance >= 12.0 || this.currentCheckpointIndex >= this.checkpoints.length) {
          this.skillProgress = 1.0;
          this.markSkillMastered('reversing', '🔙 REVERSING MASTERED! Outstanding spatial awareness and backing up.');
        }
        break;
      }

      case 'gear_control': {
        this.gearShiftsObserved.add(vehiclePhysics.currentGear);
        const uniqueGears = this.gearShiftsObserved.size;
        this.skillProgress = Math.min(1.0, uniqueGears / 3.0);

        if (uniqueGears >= 3 || (speedKmh > 35 && uniqueGears >= 2)) {
          this.skillProgress = 1.0;
          this.markSkillMastered('gear_control', '⚙️ GEAR CONTROL MASTERED! Smooth shifting across transmission gears.');
        } else {
          this.tutorMessage = `Gears engaged: ${Array.from(this.gearShiftsObserved).map(g => vehiclePhysics.gearNames?.[g] || g).join(' → ')}. Shift gears [E] / [Q] or toggle [G]!`;
        }
        break;
      }
    }
  }

  markSkillMastered(skill, message) {
    if (!this.masteredSkills.has(skill)) {
      this.masteredSkills.add(skill);
      this.gameState.practiceSkillsMastered = Array.from(this.masteredSkills);
      this.audio?.playVictoryFanfare();
    }
    this.tutorMessage = message;
    this.tutorStatus = 'success';
  }

  /**
   * Official Test evaluation (Road Test, Course Test, Parking Test)
   */
  updateTestMode(dt, vehiclePhysics, vehicleController) {
    const pos = vehiclePhysics.position;
    const speedKmh = Math.abs(vehiclePhysics.speedKmh);

    // ----------------------------------------------------
    // 1. ROAD TEST SPECIFIC LOGIC
    // ----------------------------------------------------
    if (this.subMode === 'ROAD_TEST') {
      this.roadTestTimer += dt;
      this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
      this.speedingCooldown = Math.max(0, this.speedingCooldown - dt);
      this.wrongWayCooldown = Math.max(0, this.wrongWayCooldown - dt);
      this.offRouteCooldown = Math.max(0, this.offRouteCooldown - dt);
      this.checkpointMissCooldown = Math.max(0, this.checkpointMissCooldown - dt);

      // Max mistakes allowed before disqualification
      const maxAllowed = ROAD_TEST_ROUTE.maxAllowedMistakes || 3;

      // ------------------------------------------------------------------
      // RULE 1: COLLISION TRACKING
      // ------------------------------------------------------------------
      if (vehiclePhysics.isColliding && this.collisionCooldown <= 0) {
        this.roadTestMistakes++;
        this.collisionCooldown = 2.8; // Grace period to pull away from obstacle
        this.lastInfraction = 'Collision';
        this.audio?.playCrash(0.6);
        if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
          window.gameHud.setPrompt(`⚠️ COLLISION DETECTED — MISTAKE ${this.roadTestMistakes}/${maxAllowed}`, 2200);
        }
      }

      // ------------------------------------------------------------------
      // RULE 2: MISSING CHECKPOINT TRACKING
      // ------------------------------------------------------------------
      if (this.currentCheckpointIndex < this.checkpoints.length - 1 && this.checkpointMissCooldown <= 0) {
        const curCp = this.checkpoints[this.currentCheckpointIndex];
        const distToCur = Math.hypot(pos.x - curCp.x, pos.z - curCp.z);

        // Check if player bypassed current checkpoint and reached a subsequent one
        const maxLookAhead = Math.min(this.checkpoints.length, this.currentCheckpointIndex + 3);
        for (let j = this.currentCheckpointIndex + 1; j < maxLookAhead; j++) {
          const aheadCp = this.checkpoints[j];
          const distToAhead = Math.hypot(pos.x - aheadCp.x, pos.z - aheadCp.z);

          // If car is inside ahead checkpoint zone while skipping current checkpoint
          if (distToAhead <= (aheadCp.radius || 6.5) * 1.25 && distToCur > 22) {
            this.roadTestMistakes++;
            this.checkpointMissCooldown = 3.0;
            this.lastInfraction = 'Missing checkpoint';
            this.audio?.playCrash(0.5);

            if (this.checkpointMeshes[this.currentCheckpointIndex]) {
              this.checkpointMeshes[this.currentCheckpointIndex].setActive(false);
            }
            // Advance active checkpoint index so test route remains playable
            this.currentCheckpointIndex = j;
            if (this.checkpointMeshes[this.currentCheckpointIndex]) {
              this.checkpointMeshes[this.currentCheckpointIndex].setActive(true);
            }

            if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
              window.gameHud.setPrompt(`⚠️ MISSING CHECKPOINT DETECTED — MISTAKE ${this.roadTestMistakes}/${maxAllowed}`, 2500);
            }
            break;
          }
        }
      }

      // ------------------------------------------------------------------
      // RULE 3: EXCESSIVE SPEED TRACKING (> 65 km/h)
      // ------------------------------------------------------------------
      const speedLimit = ROAD_TEST_ROUTE.maxSpeedLimit || 65;
      if (speedKmh > speedLimit) {
        this.speedingTimer += dt;
        if (speedKmh > speedLimit && speedKmh <= speedLimit + 4 && this.speedingTimer > 0.6) {
          if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
            window.gameHud.setPrompt(`⚠️ SPEED WARNING: SPEED LIMIT ${speedLimit} KM/H`, 900);
          }
        }
        if ((speedKmh > speedLimit + 6 || this.speedingTimer > 1.8) && this.speedingCooldown <= 0) {
          this.roadTestMistakes++;
          this.speedingCooldown = 3.5;
          this.speedingTimer = 0;
          this.lastInfraction = 'Excessive speed';
          this.audio?.playCrash(0.4);
          if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
            window.gameHud.setPrompt(`⚠️ EXCESSIVE SPEED (> ${speedLimit} KM/H) — MISTAKE ${this.roadTestMistakes}/${maxAllowed}`, 2200);
          }
        }
      } else {
        this.speedingTimer = Math.max(0, this.speedingTimer - dt * 2);
      }

      // ------------------------------------------------------------------
      // RULE 4 & 5: WRONG DIRECTION & FAILURE TO FOLLOW ROUTE
      // ------------------------------------------------------------------
      if (this.currentCheckpointIndex < this.checkpoints.length) {
        const prevNode = (this.currentCheckpointIndex === 0)
          ? (ROAD_TEST_ROUTE.startPoint || { x: 4.2, z: -15 })
          : this.checkpoints[this.currentCheckpointIndex - 1];
        const targetNode = this.checkpoints[this.currentCheckpointIndex];

        const segDx = targetNode.x - prevNode.x;
        const segDz = targetNode.z - prevNode.z;
        const segLen = Math.hypot(segDx, segDz);

        // RULE 4: Wrong Direction Check
        if (segLen > 1.0) {
          const dirX = segDx / segLen;
          const dirZ = segDz / segLen;

          const forwardX = Math.sin(vehiclePhysics.heading);
          const forwardZ = Math.cos(vehiclePhysics.heading);
          const dot = forwardX * dirX + forwardZ * dirZ;

          // If car is actively moving forward (> 10 km/h) against the traffic corridor
          if (dot < -0.45 && speedKmh > 10) {
            this.wrongWayTimer += dt;
            if (this.wrongWayTimer > 1.0 && this.wrongWayTimer < 2.5) {
              if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
                window.gameHud.setPrompt('⚠️ WRONG WAY! TURN AROUND TO FOLLOW ROUTE', 1000);
              }
            }
            if (this.wrongWayTimer >= 2.5 && this.wrongWayCooldown <= 0) {
              this.roadTestMistakes++;
              this.wrongWayCooldown = 3.5;
              this.wrongWayTimer = 0;
              this.lastInfraction = 'Wrong direction';
              this.audio?.playCrash(0.5);
              if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
                window.gameHud.setPrompt(`⚠️ WRONG DIRECTION — MISTAKE ${this.roadTestMistakes}/${maxAllowed}`, 2500);
              }
            }
          } else if (dot >= -0.2) {
            this.wrongWayTimer = Math.max(0, this.wrongWayTimer - dt * 2);
          }
        }

        // RULE 5: Failure to Follow Route (Point-to-Segment Corridor Check)
        const abLenSq = segDx * segDx + segDz * segDz;
        let distToSegment = 0;
        if (abLenSq > 0.01) {
          const apX = pos.x - prevNode.x;
          const apZ = pos.z - prevNode.z;
          const t = Math.max(0, Math.min(1, (apX * segDx + apZ * segDz) / abLenSq));
          const projX = prevNode.x + t * segDx;
          const projZ = prevNode.z + t * segDz;
          distToSegment = Math.hypot(pos.x - projX, pos.z - projZ);
        } else {
          distToSegment = Math.hypot(pos.x - targetNode.x, pos.z - targetNode.z);
        }

        // Generous road corridor width (34m) accounts for multi-lane streets, intersections, and evasive moves
        if (distToSegment > 34) {
          this.offRouteTimer += dt;
          if (this.offRouteTimer > 1.5 && this.offRouteTimer < 3.5) {
            if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
              window.gameHud.setPrompt('⚠️ OFF-ROUTE: RETURN TO DESIGNATED ROAD ROUTE', 1000);
            }
          }
          if (this.offRouteTimer >= 3.5 && this.offRouteCooldown <= 0) {
            this.roadTestMistakes++;
            this.offRouteCooldown = 4.0;
            this.offRouteTimer = 0;
            this.lastInfraction = 'Failure to follow route';
            this.audio?.playCrash(0.5);
            if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
              window.gameHud.setPrompt(`⚠️ FAILURE TO FOLLOW ROUTE — MISTAKE ${this.roadTestMistakes}/${maxAllowed}`, 2500);
            }
          }
        } else {
          this.offRouteTimer = Math.max(0, this.offRouteTimer - dt * 2);
        }
      }

      // Checkpoint Navigation along the 10-checkpoint route
      if (this.currentCheckpointIndex < this.checkpoints.length) {
        const targetCp = this.checkpoints[this.currentCheckpointIndex];
        const dist = Math.hypot(pos.x - targetCp.x, pos.z - targetCp.z);

        if (dist <= (targetCp.radius || 6.5)) {
          let canAdvance = true;
          // Destination requires car to come to a safe stop
          if (targetCp.isStopZone || targetCp.isDestination) {
            canAdvance = speedKmh < 2.0;
            if (!canAdvance && typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
              window.gameHud.setPrompt('🛑 STOP VEHICLE COMPLETELY IN DESTINATION BAY', 1200);
            }
          }

          if (canAdvance) {
            if (this.checkpointMeshes[this.currentCheckpointIndex]) {
              this.checkpointMeshes[this.currentCheckpointIndex].setActive(false);
            }
            this.currentCheckpointIndex++;
            this.audio?.playCheckpointChime();

            if (this.currentCheckpointIndex < this.checkpoints.length) {
              if (this.checkpointMeshes[this.currentCheckpointIndex]) {
                this.checkpointMeshes[this.currentCheckpointIndex].setActive(true);
              }
            }
          }
        }
      }

      // Format time precisely as MM:SS (e.g. 04:32)
      const mins = Math.floor(this.roadTestTimer / 60);
      const secs = Math.floor(this.roadTestTimer % 60);
      const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      // ------------------------------------------------------------------
      // RULE 6: EXCESSIVE MISTAKES (Disqualification)
      // ------------------------------------------------------------------
      const isFailed = this.roadTestMistakes > maxAllowed;
      const isComplete = !isFailed && (this.currentCheckpointIndex >= this.checkpoints.length);

      if (isFailed && !this.failReported) {
        this.failReported = true;
        this.audio?.playCrash(0.8);
        if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
          window.gameHud.setPrompt('❌ TEST FAILED: Too many mistakes.', 3000);
        }
      }

      if (isComplete && !this.testRewarded) {
        this.testRewarded = true;
        this.gameState.roadTestPassed = true;
        this.gameState.addCredits(ROAD_TEST_ROUTE.reward || 6000);
        this.audio?.playVictoryFanfare();
      }

      return {
        mode: 'ROAD_TEST',
        subMode: 'ROAD_TEST',
        isRoadTest: true,
        title: isComplete ? 'ROAD TEST COMPLETE' : (isFailed ? 'TEST FAILED' : 'ROAD TEST'),
        result: isComplete ? 'PASSED' : (isFailed ? 'FAILED' : 'IN_PROGRESS'),
        timeFormatted,
        timer: this.roadTestTimer,
        mistakes: this.roadTestMistakes,
        maxMistakes: maxAllowed,
        currentCheckpointIndex: this.currentCheckpointIndex,
        totalCheckpoints: this.checkpoints.length,
        objective: 'Complete the route safely.',
        isCompleted: isComplete,
        isFailed: isFailed,
        failReason: isFailed ? 'Too many mistakes.' : '',
        reward: ROAD_TEST_ROUTE.reward || 6000
      };
    }

    // ----------------------------------------------------
    // 2. COURSE TEST SPECIFIC LOGIC
    // ----------------------------------------------------
    if (this.subMode === 'COURSE_TEST') {
      this.courseTimer += dt;
      this.courseCollisionCooldown = Math.max(0, this.courseCollisionCooldown - dt);
      this.courseMissCooldown = Math.max(0, this.courseMissCooldown - dt);

      // TRACKING 1: COLLISIONS (Cones, barriers, walls)
      if (vehiclePhysics.isColliding && this.courseCollisionCooldown <= 0) {
        this.courseCollisions++;
        this.courseCollisionCooldown = 2.0;
        this.courseAccuracy = Math.max(10, Math.round(100 - (this.courseCollisions * 4) - (this.courseMissedCheckpoints * 15)));
        this.audio?.playCrash(0.5);

        if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
          window.gameHud.setPrompt(`⚠️ CONE / BARRIER COLLISION (-4% ACCURACY)`, 1800);
        }
      }

      // TRACKING 2: MISSED CHECKPOINTS (Skipping ahead)
      if (this.currentCheckpointIndex < this.checkpoints.length - 1 && this.courseMissCooldown <= 0) {
        const curCp = this.checkpoints[this.currentCheckpointIndex];
        const distToCur = Math.hypot(pos.x - curCp.x, pos.z - curCp.z);

        const maxLookAhead = Math.min(this.checkpoints.length, this.currentCheckpointIndex + 3);
        for (let j = this.currentCheckpointIndex + 1; j < maxLookAhead; j++) {
          const aheadCp = this.checkpoints[j];
          const distToAhead = Math.hypot(pos.x - aheadCp.x, pos.z - aheadCp.z);

          if (distToAhead <= (aheadCp.radius || 6.0) * 1.2 && distToCur > 20) {
            this.courseMissedCheckpoints++;
            this.courseMissCooldown = 3.0;
            this.courseAccuracy = Math.max(10, Math.round(100 - (this.courseCollisions * 4) - (this.courseMissedCheckpoints * 15)));
            this.audio?.playCrash(0.4);

            if (this.checkpointMeshes[this.currentCheckpointIndex]) {
              this.checkpointMeshes[this.currentCheckpointIndex].setActive(false);
            }
            this.currentCheckpointIndex = j;
            if (this.checkpointMeshes[this.currentCheckpointIndex]) {
              this.checkpointMeshes[this.currentCheckpointIndex].setActive(true);
            }

            if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
              window.gameHud.setPrompt(`⚠️ MISSED CHECKPOINT DETECTED (-15% ACCURACY)`, 2200);
            }
            break;
          }
        }
      }

      // Checkpoint Navigation along Course
      if (this.currentCheckpointIndex < this.checkpoints.length) {
        const targetCp = this.checkpoints[this.currentCheckpointIndex];
        const dist = Math.hypot(pos.x - targetCp.x, pos.z - targetCp.z);

        if (dist <= (targetCp.radius || 5.5)) {
          let canAdvance = true;
          // Stop zone requires speed < 2.0 km/h
          if (targetCp.isStopZone) {
            canAdvance = speedKmh < 2.0;
            if (!canAdvance && typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
              window.gameHud.setPrompt('🛑 STOP VEHICLE COMPLETELY INSIDE STOP ZONE (< 2 KM/H)', 1000);
            }
          } else if (targetCp.isParkingSection || targetCp.isParkingBay) {
            // Final Parking Section requires vehicle to stop inside bay
            canAdvance = speedKmh < 1.5;
            if (!canAdvance && typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
              window.gameHud.setPrompt('🅿️ PARK VEHICLE AND BRING TO FULL STOP TO COMPLETE COURSE', 1000);
            }
          }

          if (canAdvance) {
            if (this.checkpointMeshes[this.currentCheckpointIndex]) {
              this.checkpointMeshes[this.currentCheckpointIndex].setActive(false);
            }
            this.currentCheckpointIndex++;
            this.audio?.playCheckpointChime();

            if (this.currentCheckpointIndex < this.checkpoints.length) {
              if (this.checkpointMeshes[this.currentCheckpointIndex]) {
                this.checkpointMeshes[this.currentCheckpointIndex].setActive(true);
              }
            }
          }
        }
      }

      // Format live completion time
      const mins = Math.floor(this.courseTimer / 60);
      const secs = Math.floor(this.courseTimer % 60);
      const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      const isComplete = this.currentCheckpointIndex >= this.checkpoints.length;
      if (isComplete && !this.testRewarded) {
        this.testRewarded = true;
        this.gameState.courseTestPassed = true;
        this.gameState.addCredits(OFFICIAL_COURSE_TEST.reward || 4000);
        this.audio?.playVictoryFanfare();
      }

      const activeCp = this.checkpoints[this.currentCheckpointIndex] || this.checkpoints[this.checkpoints.length - 1];

      return {
        mode: 'COURSE_TEST',
        subMode: 'COURSE_TEST',
        isCourseTest: true,
        title: isComplete ? 'COURSE TEST COMPLETE' : 'COURSE TEST',
        result: isComplete ? 'PASSED' : 'IN_PROGRESS',
        timeFormatted,
        timer: this.courseTimer,
        collisions: this.courseCollisions,
        missedCheckpoints: this.courseMissedCheckpoints,
        accuracy: this.courseAccuracy,
        currentCheckpointIndex: this.currentCheckpointIndex,
        totalCheckpoints: this.checkpoints.length,
        stageTitle: activeCp ? (activeCp.title || `Stage ${this.currentCheckpointIndex + 1}`) : 'Course Section',
        isCompleted: isComplete,
        reward: OFFICIAL_COURSE_TEST.reward || 4000
      };
    }

    // ----------------------------------------------------
    // 3. PARKING TEST SPECIFIC LOGIC (Parking Challenge)
    // ----------------------------------------------------
    if (this.subMode === 'PARKING_TEST') {
      const activeStall = this.parkingStalls[this.parkingStageIndex] || this.parkingStalls[this.parkingStalls.length - 1];

      // ------------------------------------------------------------------
      // PARKING-ZONE DETECTION:
      // Local coordinate transformation, stall boundary check, & heading alignment
      // ------------------------------------------------------------------
      const dx = pos.x - activeStall.x;
      const dz = pos.z - activeStall.z;
      const cosH = Math.cos(-activeStall.heading);
      const sinH = Math.sin(-activeStall.heading);
      const localX = dx * cosH - dz * sinH;
      const localZ = dx * sinH + dz * cosH;

      const halfW = (activeStall.width || 3.6) / 2;
      const halfL = (activeStall.length || 6.8) / 2;

      // Inside zone check with forgiving boundary buffer
      const isInside = Math.abs(localX) <= halfW + 0.35 && Math.abs(localZ) <= halfL + 0.5;
      this.isInsideParkingBay = isInside;

      // Heading error calculation
      let angleDiff = Math.abs(vehiclePhysics.heading - activeStall.heading) % (Math.PI * 2);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

      if (activeStall.type === 'parallel') {
        if (angleDiff > Math.PI / 2) {
          angleDiff = Math.abs(angleDiff - Math.PI);
        }
      }

      // Centering & alignment accuracy computation (shown e.g. Accuracy: 86%)
      const distFromCenter = Math.hypot(localX, localZ);
      let accuracy = 0;

      if (isInside) {
        const posScore = Math.max(0, 1.0 - (distFromCenter / (halfW * 1.25)));
        const alignScore = Math.max(0, 1.0 - (angleDiff / (Math.PI / 3.2)));
        accuracy = Math.round(55 + (posScore * 25) + (alignScore * 20));
        accuracy = Math.max(50, Math.min(100, accuracy));
      } else {
        const distToStall = Math.hypot(dx, dz);
        accuracy = Math.round(Math.max(20, Math.min(65, 72 - distToStall * 2.2)));
      }
      this.parkingAccuracy = accuracy;

      // Stop detection & parking hold check
      if (isInside && speedKmh < 1.5) {
        this.parkingHoldTimer += dt;
        if (this.parkingHoldTimer >= 1.8) {
          this.stageAccuracies.push(accuracy);
          this.parkingHoldTimer = 0;
          this.parkingStageIndex++;

          if (this.parkingStageIndex < this.parkingStalls.length) {
            // Advance to next parking challenge stall
            if (this.checkpointMeshes[this.currentCheckpointIndex]) {
              this.checkpointMeshes[this.currentCheckpointIndex].setActive(false);
            }
            this.currentCheckpointIndex = this.parkingStageIndex;
            if (this.checkpointMeshes[this.currentCheckpointIndex]) {
              this.checkpointMeshes[this.currentCheckpointIndex].setActive(true);
            }
            const nextStall = this.parkingStalls[this.parkingStageIndex];
            this.audio?.playVictoryFanfare?.() || this.audio?.playCheckpointChime?.();
            if (typeof window !== 'undefined' && window.gameHud && typeof window.gameHud.setPrompt === 'function') {
              window.gameHud.setPrompt(`✅ ${activeStall.title || activeStall.name} PASSED! Proceed to ${nextStall.title || nextStall.name}.`, 2500);
            }
          }
        }
      } else {
        this.parkingHoldTimer = Math.max(0, this.parkingHoldTimer - dt * 2);
      }

      const isComplete = this.parkingStageIndex >= this.parkingStalls.length;
      if (isComplete && !this.testRewarded) {
        this.testRewarded = true;
        this.gameState.parkingTestPassed = true;
        this.gameState.addCredits(PARKING_TEST.reward || 4500);
        this.audio?.playVictoryFanfare();
      }

      const overallAccuracy = this.stageAccuracies.length > 0
        ? Math.round(this.stageAccuracies.reduce((a, b) => a + b, 0) / this.stageAccuracies.length)
        : this.parkingAccuracy;

      return {
        mode: 'PARKING_TEST',
        subMode: 'PARKING_TEST',
        isParkingTest: true,
        title: isComplete ? 'PARKING TEST COMPLETE' : 'PARKING TEST',
        result: isComplete ? 'PASSED' : 'IN_PROGRESS',
        instruction: 'Position vehicle inside the marked area.',
        accuracy: this.parkingAccuracy,
        finalAccuracy: overallAccuracy,
        parkingType: activeStall ? (activeStall.title || activeStall.name) : 'Parking Section',
        parkingStage: Math.min(this.parkingStalls.length, this.parkingStageIndex + 1),
        totalStages: this.parkingStalls.length,
        isInside: this.isInsideParkingBay,
        holdProgress: Math.min(1.0, this.parkingHoldTimer / 1.8),
        isCompleted: isComplete,
        reward: PARKING_TEST.reward || 4500
      };
    }

    // Generic fallback
    const isComplete = this.currentCheckpointIndex >= this.checkpoints.length;
    return {
      subMode: this.subMode,
      currentCheckpointIndex: this.currentCheckpointIndex,
      totalCheckpoints: this.checkpoints.length,
      isCompleted: isComplete,
      tutorMessage: isComplete ? `🏆 ${this.subMode.replace('_', ' ')} PASSED!` : this.tutorMessage
    };
  }

  destroy() {
    this.cleanupCheckpoints();
    if (this.worldGroup) {
      this.scene.remove(this.worldGroup);
    }
  }
}
