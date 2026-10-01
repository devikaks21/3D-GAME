import * as THREE from 'three';
import { GameState, GameModes } from './src/core/GameState.js';
import { DrivingSchoolManager } from './src/missions/DrivingSchoolManager.js';
import { ROAD_TEST_ROUTE } from './src/missions/DrivingTest.js';
import { VehiclePhysics } from './src/vehicle/VehiclePhysics.js';
import { CollisionSystem } from './src/utilities/Collision.js';
import { RoadNetwork } from './src/ai/RoadNetwork.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('🧪 Starting Official Road Test System Specification Test Suite...\n');

// Mock audio
const mockAudio = {
  playUIClick: () => {},
  playUIHover: () => {},
  playCheckpointChime: () => {},
  playVictoryFanfare: () => {},
  playCrash: () => {}
};

const scene = new THREE.Scene();
const gameState = new GameState();
const collisionSystem = new CollisionSystem(scene);
const roadNetwork = new RoadNetwork();
collisionSystem.setRoadNetwork(roadNetwork);

const schoolManager = new DrivingSchoolManager(scene, gameState, mockAudio, collisionSystem);

// ==========================================
// TEST 1: Starting Point
// ==========================================
console.log('Test 1: Starting Point Verification');
assert(ROAD_TEST_ROUTE.startPoint !== undefined, 'Road test defines an official startPoint');
assert(typeof ROAD_TEST_ROUTE.startPoint.x === 'number' && typeof ROAD_TEST_ROUTE.startPoint.z === 'number', 'startPoint has valid horizontal coordinates');
assert(ROAD_TEST_ROUTE.startPoint.y >= 0.4, 'startPoint has proper ground suspension clearance (y >= 0.4)');
schoolManager.startMode('ROAD_TEST');
const spawn = schoolManager.getSpawnPosition();
assert(spawn.x === ROAD_TEST_ROUTE.startPoint.x && spawn.z === ROAD_TEST_ROUTE.startPoint.z, 'getSpawnPosition returns road test start point');

// ==========================================
// TEST 2: Checkpoints & Destination
// ==========================================
console.log('\nTest 2: Checkpoints & Destination (10 Required Checkpoints)');
assert(ROAD_TEST_ROUTE.checkpoints.length === 10, `Road test route has exactly 10 checkpoints (Found: ${ROAD_TEST_ROUTE.checkpoints.length})`);
assert(schoolManager.checkpoints.length === 10, 'DrivingSchoolManager initialized with all 10 road checkpoints');

const destCp = ROAD_TEST_ROUTE.checkpoints[9];
assert(destCp.isDestination === true || destCp.isStopZone === true, 'Final checkpoint (CP 10) is designated as Destination / Stop Zone');
assert(destCp.isFinishLine === true, 'Final checkpoint is marked as Finish Line');

// ==========================================
// TEST 3: Turns & Required Route
// ==========================================
console.log('\nTest 3: Turns & Required Route');
const turnCheckpoints = ROAD_TEST_ROUTE.checkpoints.filter(cp => cp.isTurn);
assert(turnCheckpoints.length >= 3, `Road test contains designated turning maneuvers (Found: ${turnCheckpoints.length} turns)`);
assert(turnCheckpoints.some(cp => cp.turnDir === 'right'), 'Route contains right turns');
assert(turnCheckpoints.some(cp => cp.turnDir === 'left'), 'Route contains left turns');

// Verify route points lie on valid road corridors
ROAD_TEST_ROUTE.checkpoints.forEach((cp, idx) => {
  const nearestRoadWp = roadNetwork.getNearestWaypoint({ x: cp.x, z: cp.z }, 35);
  assert(nearestRoadWp !== null, `Checkpoint ${idx + 1} (${cp.title}) aligns with road network corridor`);
});

// ==========================================
// TEST 4: Live Telemetry & Display Format (Time, Mistakes, Checkpoints, Objective)
// ==========================================
console.log('\nTest 4: Live Telemetry & Display Format Matching User Specification');
const phys = new VehiclePhysics(scene, collisionSystem);
phys.position.set(spawn.x, spawn.y, spawn.z);

// Advance timer by 272 seconds (4 mins 32 seconds)
schoolManager.roadTestTimer = 272;
schoolManager.roadTestMistakes = 1;
schoolManager.currentCheckpointIndex = 7;

const telemetry = schoolManager.update(0.01, phys, null);

assert(telemetry.title === 'ROAD TEST', 'Telemetry title is "ROAD TEST"');
assert(telemetry.timeFormatted === '04:32', `Time formatted precisely as MM:SS (Expected: "04:32", Got: "${telemetry.timeFormatted}")`);
assert(telemetry.mistakes === 1, `Mistakes counter matches (Expected: 1, Got: ${telemetry.mistakes})`);
assert(telemetry.currentCheckpointIndex === 7, 'Checkpoints index matches (7)');
assert(telemetry.totalCheckpoints === 10, 'Total checkpoints is 10');
assert(telemetry.objective === 'Complete the route safely.', `Objective matches user requirement: "${telemetry.objective}"`);

// ==========================================
// TEST 5: Mistakes Detection (Speeding & Collisions)
// ==========================================
console.log('\nTest 5: Mistake Infractions Detection');
schoolManager.startMode('ROAD_TEST');
assert(schoolManager.roadTestMistakes === 0, 'Mistakes initially reset to 0');

// Speeding infraction: speed > 65 km/h for > 1.6s
phys.speedKmh = 72;
for (let i = 0; i < 20; i++) {
  schoolManager.update(0.1, phys, null);
}
assert(schoolManager.roadTestMistakes >= 1, `Speeding above 65 km/h registered as mistake (Mistakes: ${schoolManager.roadTestMistakes})`);

// Collision infraction
schoolManager.mistakeCooldown = 0;
phys.speedKmh = 40;
phys.isColliding = true;
schoolManager.update(0.1, phys, null);
assert(schoolManager.roadTestMistakes >= 2, `Collision registered as mistake (Mistakes: ${schoolManager.roadTestMistakes})`);
phys.isColliding = false;

// ==========================================
// TEST 6: Route Progression & Safe Destination Stop
// ==========================================
console.log('\nTest 6: Route Progression & Safe Destination Stop');
schoolManager.startMode('ROAD_TEST');

// Progress through first 9 checkpoints
for (let i = 0; i < 9; i++) {
  const cp = schoolManager.checkpoints[i];
  phys.position.set(cp.x, 0.4, cp.z);
  phys.speedKmh = 30;
  schoolManager.update(0.1, phys, null);
}
assert(schoolManager.currentCheckpointIndex === 9, 'Successfully navigated to Checkpoint 10 (Destination)');

// At destination with speed > 2 km/h: must NOT complete until stopped
const finalCp = schoolManager.checkpoints[9];
phys.position.set(finalCp.x, 0.4, finalCp.z);
phys.speedKmh = 25;
let res = schoolManager.update(0.1, phys, null);
assert(res.isCompleted === false, 'Destination requires vehicle to halt safely before completing test');

// Stop vehicle in destination zone
phys.speedKmh = 0.5;
res = schoolManager.update(0.1, phys, null);
assert(res.isCompleted === true, 'Road Test successfully completed after safe stop in destination zone');
assert(gameState.roadTestPassed === true, 'Player officially passed road test and earned driving credentials');

console.log(`\n========================================`);
console.log(`RESULTS: ${passed}/${total} tests passed.`);
console.log(`========================================`);

if (passed === total) {
  console.log('\n🎉 ALL ROAD TEST SPECIFICATION TESTS PASSED!');
  process.exit(0);
} else {
  console.error('\n❌ SOME TESTS FAILED');
  process.exit(1);
}
