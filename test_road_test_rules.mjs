import assert from 'assert';
import { ROAD_TEST_ROUTE } from './src/missions/DrivingTest.js';
import { DrivingSchoolManager } from './src/missions/DrivingSchoolManager.js';
import { MissionUI } from './src/ui/MissionUI.js';
import * as THREE from 'three';

console.log('--- STARTING ROAD TEST RULES & RESULTS VERIFICATION ---');

// Mock scene and audio
const scene = new THREE.Scene();
const mockAudio = {
  playCrash: () => {},
  playCheckpointChime: () => {},
  playVictoryFanfare: () => {}
};
const mockGameState = {
  addCredits: () => {},
  roadTestPassed: false
};

// 1. Verify ROAD_TEST_ROUTE definition
console.log('1. Verifying ROAD_TEST_ROUTE definition...');
assert.strictEqual(ROAD_TEST_ROUTE.title, 'ROAD TEST');
assert.strictEqual(ROAD_TEST_ROUTE.objective, 'Complete the route safely.');
assert.strictEqual(ROAD_TEST_ROUTE.maxSpeedLimit, 65);
assert.strictEqual(ROAD_TEST_ROUTE.maxAllowedMistakes, 3);
assert.strictEqual(ROAD_TEST_ROUTE.checkpoints.length, 10);
assert.strictEqual(ROAD_TEST_ROUTE.startPoint.x, 4.2);
assert.strictEqual(ROAD_TEST_ROUTE.startPoint.z, -15);
console.log('✔ ROAD_TEST_ROUTE verified: 10 checkpoints, max 65 km/h, max 3 mistakes.');

// 2. Initialize DrivingSchoolManager and start ROAD_TEST
console.log('2. Initializing DrivingSchoolManager in ROAD_TEST mode...');
const dsm = new DrivingSchoolManager(scene, mockGameState, mockAudio);
dsm.startMode('ROAD_TEST');

assert.strictEqual(dsm.subMode, 'ROAD_TEST');
assert.strictEqual(dsm.roadTestMistakes, 0);
assert.strictEqual(dsm.currentCheckpointIndex, 0);
assert.strictEqual(dsm.checkpoints.length, 10);
console.log('✔ DrivingSchoolManager initialized successfully.');

// Mock vehicle physics
function createMockPhysics(x = 4.2, z = -15, heading = 0, speedKmh = 30) {
  return {
    position: new THREE.Vector3(x, 0.45, z),
    heading: heading,
    speedKmh: speedKmh,
    isColliding: false
  };
}

// 3. Test RULE 1: Collision Tracking
console.log('3. Testing RULE 1: Collision Tracking...');
const phys1 = createMockPhysics(4.2, 0, 0, 40);
phys1.isColliding = true;

// First collision tick
dsm.updateTestMode(0.1, phys1);
assert.strictEqual(dsm.roadTestMistakes, 1, 'First collision should register 1 mistake');
assert.strictEqual(dsm.lastInfraction, 'Collision');

// Collision during cooldown (2.8s) should NOT increment mistake again (fairness)
dsm.updateTestMode(0.5, phys1);
assert.strictEqual(dsm.roadTestMistakes, 1, 'Collision during cooldown must NOT register extra mistake');

// Advance past cooldown
dsm.collisionCooldown = 0;
dsm.updateTestMode(0.1, phys1);
assert.strictEqual(dsm.roadTestMistakes, 2, 'Collision after cooldown should register 2nd mistake');
console.log('✔ RULE 1 (Collision) verified with fairness cooldown.');

// Reset mistakes for remaining rule tests
dsm.roadTestMistakes = 0;
dsm.collisionCooldown = 0;

// 4. Test RULE 2: Missing Checkpoint Tracking
console.log('4. Testing RULE 2: Missing Checkpoint Tracking...');
// Current checkpoint is 0 (at x: 4.2, z: 35).
// Suppose car skips ahead to CP 1 (at x: 4.2, z: 80, radius 6.5) while far from CP 0 (e.g. at x: 4.2, z: 79)
const physSkip = createMockPhysics(4.2, 79, 0, 40);
dsm.updateTestMode(0.1, physSkip);
assert.strictEqual(dsm.roadTestMistakes, 1, 'Skipping checkpoint must register 1 mistake');
assert.strictEqual(dsm.lastInfraction, 'Missing checkpoint');
assert.ok(dsm.currentCheckpointIndex >= 1, 'Active checkpoint must advance past missed checkpoint');
console.log('✔ RULE 2 (Missing checkpoint) verified: advances route and counts infraction.');

// Reset
dsm.roadTestMistakes = 0;
dsm.currentCheckpointIndex = 0;

// 5. Test RULE 3: Excessive Speed Tracking
console.log('5. Testing RULE 3: Excessive Speed Tracking...');
// Driving at 67 km/h (within caution zone) for 0.5s should not immediately penalize
const physCaution = createMockPhysics(4.2, 0, 0, 67);
dsm.updateTestMode(0.5, physCaution);
assert.strictEqual(dsm.roadTestMistakes, 0, 'Brief speed near limit should NOT penalize immediately');

// Driving at 75 km/h (> 71 km/h threshold or sustained)
const physSpeeding = createMockPhysics(4.2, 10, 0, 75);
dsm.updateTestMode(0.2, physSpeeding);
assert.strictEqual(dsm.roadTestMistakes, 1, 'Excessive speed (> 71 km/h) must register 1 mistake');
assert.strictEqual(dsm.lastInfraction, 'Excessive speed');

// During cooldown (3.5s), further speeding frames don't spam penalties
dsm.updateTestMode(0.5, physSpeeding);
assert.strictEqual(dsm.roadTestMistakes, 1, 'Speeding cooldown must prevent multi-tick penalty spam');
console.log('✔ RULE 3 (Excessive speed) verified with margin & cooldown.');

// Reset
dsm.roadTestMistakes = 0;
dsm.speedingCooldown = 0;
dsm.speedingTimer = 0;

// 6. Test RULE 4: Wrong Direction Tracking
console.log('6. Testing RULE 4: Wrong Direction Tracking...');
// CP 0 is (4.2, 35) from start (4.2, -15). Direction is North (heading 0).
// Car driving South (heading Math.PI, speed 25 km/h) is going wrong way.
const physWrongWay = createMockPhysics(4.2, 10, Math.PI, 25);
// First 1.5 seconds: warning period
dsm.updateTestMode(1.5, physWrongWay);
assert.strictEqual(dsm.roadTestMistakes, 0, 'Wrong way under 2.5s grace period must not penalize prematurely');

// Reach 2.6 seconds sustained wrong way
dsm.updateTestMode(1.1, physWrongWay);
assert.strictEqual(dsm.roadTestMistakes, 1, 'Sustained wrong direction (> 2.5s) must register 1 mistake');
assert.strictEqual(dsm.lastInfraction, 'Wrong direction');
console.log('✔ RULE 4 (Wrong direction) verified: sustained wrong way detection.');

// Reset
dsm.roadTestMistakes = 0;
dsm.wrongWayCooldown = 0;
dsm.wrongWayTimer = 0;

// 7. Test RULE 5: Failure to Follow Route (Off-route corridor)
console.log('7. Testing RULE 5: Failure to Follow Route...');
// Driving 60 meters off the road corridor into the fields (e.g. x: 80, z: 10)
const physOffRoute = createMockPhysics(80, 10, 0, 30);
// First 2 seconds: warning period
dsm.updateTestMode(2.0, physOffRoute);
assert.strictEqual(dsm.roadTestMistakes, 0, 'Off-route under 3.5s grace period must not penalize prematurely');

// Reach 3.6 seconds off-route
dsm.updateTestMode(1.6, physOffRoute);
assert.strictEqual(dsm.roadTestMistakes, 1, 'Sustained off-route (> 3.5s) must register 1 mistake');
assert.strictEqual(dsm.lastInfraction, 'Failure to follow route');
console.log('✔ RULE 5 (Failure to follow route) verified: corridor departure detection.');

// 8. Test RULE 6: Excessive Mistakes (Disqualification)
console.log('8. Testing RULE 6: Excessive Mistakes...');
dsm.roadTestMistakes = 4; // Exceeds maxAllowed = 3
const resultFail = dsm.updateTestMode(0.1, createMockPhysics(4.2, 0, 0, 30));
assert.strictEqual(resultFail.isFailed, true, 'isFailed must be true when mistakes > 3');
assert.strictEqual(resultFail.failReason, 'Too many mistakes.');
console.log('✔ RULE 6 (Excessive mistakes) verified: fails with "Too many mistakes."');

// 9. Test Test Completion & Passing Result
console.log('9. Testing Test Completion & Passing Result...');
dsm.startMode('ROAD_TEST');
dsm.roadTestMistakes = 1;
dsm.roadTestTimer = 272; // 04:32 in seconds

// Advance all checkpoints to finish
dsm.currentCheckpointIndex = 9;
// Destination stop zone at x: -94.2, z: 90, speed < 2 km/h
const physFinish = createMockPhysics(-94.2, 90, 0, 0.5);
const resultPass = dsm.updateTestMode(0.1, physFinish);

assert.strictEqual(resultPass.isCompleted, true, 'isCompleted must be true');
assert.strictEqual(resultPass.isFailed, false, 'isFailed must be false');
assert.strictEqual(resultPass.timeFormatted, '04:32', 'Time formatted must be 04:32');
assert.strictEqual(resultPass.mistakes, 1, 'Mistakes must be 1');
assert.strictEqual(resultPass.result, 'PASSED');
console.log('✔ Passing Road Test verified with time 04:32, mistakes 1, result PASSED.');

// 10. Test UI Mock Rendering
console.log('10. Testing MissionUI DOM modal rendering...');
// Setup minimal fake DOM for testing MissionUI
globalThis.document = {
  createElement: (tag) => {
    return {
      id: '',
      className: '',
      style: {},
      innerHTML: '',
      children: [],
      appendChild(child) { this.children.push(child); },
      querySelector(sel) {
        const fakeElem = {
          id: sel.replace('#', '').replace('.', ''),
          textContent: '',
          className: '',
          style: { display: 'none' },
          addEventListener: () => {}
        };
        return fakeElem;
      },
      querySelectorAll() { return []; }
    };
  }
};

const fakeContainer = { appendChild: () => {} };
const missionUI = new MissionUI(fakeContainer, mockAudio);

// Verify showResult accepts extraData
missionUI.showResult(true, 'ROAD TEST COMPLETE', 'PASSED', 6000, resultPass);
console.log('✔ MissionUI showResult executed smoothly for passed state.');

missionUI.modalOpen = false;
missionUI.showResult(false, 'TEST FAILED', 'Too many mistakes.', 0, resultFail);
console.log('✔ MissionUI showResult executed smoothly for failed state.');

console.log('--- ALL ROAD TEST RULES & RESULT TESTS PASSED SUCCESSFULLY! ---');
