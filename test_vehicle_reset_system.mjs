import * as THREE from 'three';
import { RoadNetwork } from './src/ai/RoadNetwork.js';
import { CollisionSystem } from './src/utilities/Collision.js';
import { VehiclePhysics } from './src/vehicle/VehiclePhysics.js';
import { VehicleManager } from './src/vehicle/VehicleManager.js';
import { InputManager } from './src/core/InputManager.js';

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  localStorage: {
    _store: {},
    getItem(key) { return this._store[key] || null; },
    setItem(key, val) { this._store[key] = String(val); },
    removeItem(key) { delete this._store[key]; },
    clear() { this._store = {}; }
  }
};
global.localStorage = global.window.localStorage;
global.document = {
  addEventListener: () => {},
  removeEventListener: () => {}
};

console.log('🧪 Starting Vehicle Reset Specification Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

const roadNetwork = new RoadNetwork();
const collisionSystem = new CollisionSystem();
collisionSystem.setRoadNetwork(roadNetwork);

// ---------------------------------------------------------------------
// TEST 1: Keybinding for 'R'
// ---------------------------------------------------------------------
console.log('Test 1: Input Binding for Key "R"');
const input = new InputManager();
const resetBinding = input.bindings.resetVehicle;
assert(resetBinding !== undefined, 'resetVehicle action exists in InputManager');
assert(resetBinding.keys.includes('KeyR'), 'resetVehicle primary key is "KeyR" (Press R to reset)');

let actionTriggered = false;
input.onAction('resetVehicle', () => {
  actionTriggered = true;
});
input.triggerAction('resetVehicle');
assert(actionTriggered === true, 'triggerAction("resetVehicle") successfully triggers registered listener');

// ---------------------------------------------------------------------
// TEST 2: Stop Extreme Velocity
// ---------------------------------------------------------------------
console.log('\nTest 2: Stop Extreme Velocity');
const phys = new VehiclePhysics();

// Simulate extreme launch / supersonic crash velocity
phys.velocity.set(120.0, 45.0, -85.0); // > 500 km/h
phys.acceleration.set(50, 0, 50);
phys.speed = phys.velocity.length();
phys.speedKmh = 550;
phys.slipRatio = 1.0;
phys.isDrifting = true;

phys.resetToRoad(new THREE.Vector3(0, 0.45, 0), 0);

assert(phys.velocity.length() === 0, 'Velocity is completely zeroed out (0 m/s)');
assert(phys.acceleration.length() === 0, 'Acceleration is completely zeroed out');
assert(phys.forwardSpeed === 0 && phys.lateralSpeed === 0, 'Forward and lateral speeds are zero');
assert(phys.speedKmh === 0, 'Speedometer reads 0 KM/H');
assert(phys.isDrifting === false, 'Drifting state is cancelled');
assert(phys.airTime === 0 && phys.isGrounded === true, 'Vehicle is grounded with airTime reset to 0');

// ---------------------------------------------------------------------
// TEST 3: Correct Vehicle Rotation (Upright & Aligned with Road)
// ---------------------------------------------------------------------
console.log('\nTest 3: Correct Vehicle Rotation (Upright & Aligned)');

// Simulate overturned / flipped vehicle with severe pitch and roll
phys.chassisPitch = Math.PI / 4; // 45 degree tilt
phys.chassisRoll = Math.PI / 2;  // 90 degree rollover onto side
phys.pitch = Math.PI / 3;
phys.roll = Math.PI;
phys.steerAngle = 0.55;

const desiredRoadHeading = Math.PI / 2; // Eastbound along road
phys.resetToRoad(new THREE.Vector3(10, 0.45, 20), desiredRoadHeading);

assert(phys.chassisPitch === 0, 'Chassis pitch restored to 0 (perfectly level)');
assert(phys.chassisRoll === 0, 'Chassis roll restored to 0 (perfectly level, no rollover)');
assert(phys.pitch === 0 && phys.roll === 0, 'Pitch and roll Euler angles reset to 0');
assert(phys.steerAngle === 0, 'Steering angle centered to 0');
assert(Math.abs(phys.heading - desiredRoadHeading) < 0.0001, 'Vehicle heading accurately aligned with road direction');

// Verify 3D quaternion is oriented upright along Y
const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(phys.quaternion);
assert(Math.abs(upVec.y - 1.0) < 0.001, 'Vehicle up vector points straight up into sky (Y = 1.0)');

// ---------------------------------------------------------------------
// TEST 4: Return Vehicle to Nearest Safe Road Position
// ---------------------------------------------------------------------
console.log('\nTest 4: Return Vehicle to Road (Nearest Safe Road Position)');

// Off-road position: Suppose player drove far off the road into terrain at (130, 0, 75)
const offRoadPos = new THREE.Vector3(130, 0, 75);
const safeRoad = roadNetwork.getNearestSafeRoadPosition(offRoadPos, collisionSystem);

assert(safeRoad !== null, 'Found nearest safe road position from RoadNetwork');
assert(safeRoad.position instanceof THREE.Vector3, 'Returned position is a valid Vector3');
assert(safeRoad.heading !== undefined, 'Returned road heading is defined');
assert(safeRoad.waypoint !== undefined, 'Returned target road waypoint reference');

// Verify the chosen waypoint is an actual road waypoint
const roadDistance = offRoadPos.distanceTo(safeRoad.position);
console.log(`  Target road waypoint: ${safeRoad.waypoint.id} at (${safeRoad.position.x}, ${safeRoad.position.z}) [Distance: ${roadDistance.toFixed(1)}m, Heading: ${(safeRoad.heading * 180 / Math.PI).toFixed(1)}°]`);
assert(roadDistance < 45, `Nearest road position is within reasonable radius (${roadDistance.toFixed(1)}m < 45m)`);

// Test reset execution to that road position
phys.resetToRoad(safeRoad.position, safeRoad.heading);
assert(phys.position.equals(safeRoad.position), 'Vehicle position relocated directly onto road surface');
assert(Math.abs(phys.heading - safeRoad.heading) < 0.0001, 'Vehicle heading aligned with road travel direction');

// ---------------------------------------------------------------------
// TEST 5: Prevent Getting Permanently Stuck
// ---------------------------------------------------------------------
console.log('\nTest 5: Prevent Getting Permanently Stuck (Obstacle Clearance)');

// Add a solid building collider at (90, 20, 90)
const testBldg = new THREE.Mesh(new THREE.BoxGeometry(25, 40, 25));
testBldg.position.set(90, 20, 90);
collisionSystem.addCollider(testBldg, 'building');

// Place car embedded inside building at (90, 0.5, 90)
const stuckPos = new THREE.Vector3(90, 0.5, 90);
phys.position.copy(stuckPos);
phys.isColliding = true;
phys.stuckTimer = 5.0;

// Test VehicleManager.resetActiveVehicle
const mockScene = new THREE.Scene();
const vm = new VehicleManager(mockScene, null, input);
vm.spawnVehicle('falcon_s1', stuckPos.x, stuckPos.y, stuckPos.z, 0);

const resetResult = vm.resetActiveVehicle(roadNetwork, collisionSystem);
assert(resetResult !== null && resetResult.success === true, 'VehicleManager.resetActiveVehicle succeeded');

const activePhys = vm.getActivePhysics();
assert(activePhys.isColliding === false, 'Collision flag cleared on reset');
assert(activePhys.stuckTimer === 0, 'Stuck timer cleared to 0');
assert(activePhys.currentGear === 3, 'Gear reset to 1st gear for clean driveaway');

// Verify that the post-reset vehicle position is completely outside the building
const checkCol = collisionSystem.checkSphereCollision(activePhys.position, 1.3);
assert(!checkCol || !checkCol.collided, `Post-reset position (${activePhys.position.x.toFixed(1)}, ${activePhys.position.z.toFixed(1)}) is 100% free of obstacle collisions`);

console.log(`\n========================================`);
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  console.log('🎉 ALL VEHICLE RESET SPECIFICATION TESTS PASSED!');
} else {
  process.exit(1);
}
