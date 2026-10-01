import * as THREE from 'three';
import { CollisionSystem } from './src/utilities/Collision.js';
import { VehiclePhysics } from './src/vehicle/VehiclePhysics.js';
import { RoadNetwork } from './src/ai/RoadNetwork.js';
import { AICar } from './src/ai/AICar.js';

console.log('🧪 Starting Comprehensive Collision System & Physics Stability Test Suite...\n');

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

const collisionSystem = new CollisionSystem();
const roadNetwork = new RoadNetwork();
collisionSystem.setRoadNetwork(roadNetwork);
const mockScene = new THREE.Scene();

// ---------------------------------------------------------------------
// TEST SUITE 1: Collision with Buildings, Barriers, Blocks, Trees, Obstacles
// ---------------------------------------------------------------------
console.log('Test Suite 1: Obstacle Type Collisions (Buildings, Barriers, Blocks, Trees, Obstacles)');

// 1. Building collider
const bldgMesh = new THREE.Mesh(new THREE.BoxGeometry(20, 40, 20));
bldgMesh.position.set(50, 20, 50);
collisionSystem.addCollider(bldgMesh, 'building');

// 2. Barrier collider (Highway Guardrail)
const barrierMesh = new THREE.Mesh(new THREE.BoxGeometry(40, 1.2, 0.6));
barrierMesh.position.set(0, 0.6, 20);
collisionSystem.addCollider(barrierMesh, 'barrier');

// 3. Concrete Block collider
const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4));
blockMesh.position.set(-30, 1, 0);
collisionSystem.addCollider(blockMesh, 'block');

// 4. Tree Trunk collider
const treeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 4, 8));
treeMesh.position.set(0, 2, -40);
collisionSystem.addCollider(treeMesh, 'tree');

// 5. Street Pole Obstacle
const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8, 8));
poleMesh.position.set(25, 4, -25);
collisionSystem.addCollider(poleMesh, 'obstacle');

// Test A: Building Collision
const hitBldg = collisionSystem.checkSphereCollision(new THREE.Vector3(50, 0.5, 39.5), 1.2);
assert(hitBldg && hitBldg.collided, 'Vehicle center collides with building wall');
assert(hitBldg.type === 'building', 'Hit obstacle correctly identified as "building"');
assert(Math.abs(hitBldg.normal.y) < 0.001, 'Building collision normal is horizontal (prevents sky catapult)');

// Test B: Barrier Collision
const hitBarrier = collisionSystem.checkSphereCollision(new THREE.Vector3(5, 0.5, 20.2), 1.0);
assert(hitBarrier && hitBarrier.collided, 'Vehicle collides with highway barrier');
assert(hitBarrier.type === 'barrier', 'Hit obstacle correctly identified as "barrier"');

// Test C: Concrete Block Collision
const hitBlock = collisionSystem.checkSphereCollision(new THREE.Vector3(-28.5, 0.5, 0), 1.0);
assert(hitBlock && hitBlock.collided, 'Vehicle collides with concrete block');
assert(hitBlock.type === 'block', 'Hit obstacle correctly identified as "block"');

// Test D: Tree Collision
const hitTree = collisionSystem.checkSphereCollision(new THREE.Vector3(0, 0.5, -39.6), 1.0);
assert(hitTree && hitTree.collided, 'Vehicle collides with tree trunk');
assert(hitTree.type === 'tree', 'Hit obstacle correctly identified as "tree"');

// Test E: Obstacle (Pole) Collision
const hitPole = collisionSystem.checkSphereCollision(new THREE.Vector3(25, 0.5, -24.8), 0.8);
assert(hitPole && hitPole.collided, 'Vehicle collides with street pole obstacle');
assert(hitPole.type === 'obstacle', 'Hit obstacle correctly identified as "obstacle"');

// ---------------------------------------------------------------------
// TEST SUITE 2: Multi-point Vehicle Obstacle Check (Front, Center, Rear)
// ---------------------------------------------------------------------
console.log('\nTest Suite 2: Multi-point Vehicle Obstacle Contact');

const carForward = new THREE.Vector3(0, 0, 1);
// Place car so only front bumper touches building at (50, 20, 50)
// Building face is at z = 40. Car center at z = 38. Front bumper (center + 1.6) is at z = 39.6 (touches at radius 0.95)
const multiHitFront = collisionSystem.checkVehicleObstacles(
  new THREE.Vector3(50, 0.5, 38.5),
  carForward,
  2.2,
  0.95
);
assert(multiHitFront && multiHitFront.collided, 'Front bumper accurately detects obstacle before center reaches wall');
assert(multiHitFront.isFront === true, 'Contact point accurately identified as front bumper');

// ---------------------------------------------------------------------
// TEST SUITE 3: AI Vehicle Collisions & Mutual Physical Reaction
// ---------------------------------------------------------------------
console.log('\nTest Suite 3: AI Traffic Vehicle Collisions');

const aiCar = new AICar(mockScene, roadNetwork, null, 'sedan');
aiCar.position.set(0, 0.35, 10);
aiCar.heading = 0;
aiCar.speed = 10.0;

const playerPos = new THREE.Vector3(0, 0.35, 7.5); // 2.5m behind AI car (approaching)
const playerVel = new THREE.Vector3(0, 0, 18.0); // 18 m/s (~65 km/h)
const playerHeading = 0;

const aiHit = collisionSystem.checkAIVehicles(playerPos, playerVel, playerHeading, 4.4, 1.9, [aiCar]);
assert(aiHit && aiHit.collided, 'Player vehicle detects collision with AI traffic car');
assert(aiHit.type === 'vehicle', 'Collision type is "vehicle"');
assert(aiHit.aiCar === aiCar, 'Collided AI vehicle instance returned correctly');

// Test VehiclePhysics response to AI car
const testPhys = new VehiclePhysics();
testPhys.position.copy(playerPos);
testPhys.velocity.copy(playerVel);
testPhys.forwardSpeed = 18.0;

const initialSpeed = testPhys.velocity.length();
const initialAiSpeed = aiCar.speed;

// Step physics with AI car collision
testPhys.update({ throttle: 1.0, brake: 0, steer: 0 }, 0.016, collisionSystem, [aiCar]);

assert(testPhys.velocity.length() < initialSpeed * 0.75, `Player velocity reduced after hitting AI vehicle (${initialSpeed.toFixed(1)} -> ${testPhys.velocity.length().toFixed(1)} m/s)`);
assert(aiCar.speed < initialAiSpeed, `AI car decelerated upon being hit (${initialAiSpeed.toFixed(1)} -> ${aiCar.speed.toFixed(1)} m/s)`);
assert(aiCar.isBraking === true, 'AI car engaged emergency brake after collision');
assert(testPhys.isColliding === true, 'Player physics state isColliding flagged as true');
assert(testPhys.lastCollision && testPhys.lastCollision.type === 'vehicle', 'lastCollision recorded as vehicle impact');

// ---------------------------------------------------------------------
// TEST SUITE 4: Avoid Unrealistic Physics Explosions & Deep Penetration
// ---------------------------------------------------------------------
console.log('\nTest Suite 4: Stability & Physics Explosion Prevention');

// Test A: Deep penetration inside a solid building box
// Center placed completely inside building box at (50, 0.5, 48)
const deepInsidePos = new THREE.Vector3(50, 0.5, 48);
const deepHit = collisionSystem.checkSphereCollision(deepInsidePos, 1.2);
assert(deepHit && deepHit.collided, 'Deep penetration inside building detected');
assert(deepHit.normal.y === 0, 'Separation normal is strictly horizontal (no vertical launching!)');
assert(deepHit.penetration <= 0.65, `Penetration displacement bounded per step (${deepHit.penetration.toFixed(2)}m <= 0.65m)`);

// Test B: High speed collision against solid wall (No speed explosion)
const crashPhys = new VehiclePhysics();
crashPhys.position.set(50, 0.45, 38.0);
crashPhys.heading = 0; // driving into building at z = 40
crashPhys.velocity.set(0, 0, 35.0); // 35 m/s (~126 km/h)
crashPhys.forwardSpeed = 35.0;

// Simulate 30 consecutive physics frames while crashing into wall
let maxSpeedDuringCrash = 0;
let maxAltitude = 0;

for (let f = 0; f < 30; f++) {
  crashPhys.update({ throttle: 1.0, brake: 0, steer: 0 }, 0.016, collisionSystem, []);
  const curSpeed = crashPhys.velocity.length();
  if (curSpeed > maxSpeedDuringCrash) maxSpeedDuringCrash = curSpeed;
  if (crashPhys.position.y > maxAltitude) maxAltitude = crashPhys.position.y;
}

assert(maxSpeedDuringCrash <= 35.0, `Speed never exploded! (Max speed observed: ${maxSpeedDuringCrash.toFixed(1)} m/s <= 35.0 m/s)`);
assert(crashPhys.velocity.length() < 10.0, `Velocity reasonably reduced after impact: ${crashPhys.velocity.length().toFixed(1)} m/s`);
assert(maxAltitude < 2.0, `Vehicle remained safely planted on ground (Max altitude: ${maxAltitude.toFixed(2)}m)`);

// ---------------------------------------------------------------------
// TEST SUITE 5: Permanent Sticking Prevention (Reverse Breakaway & Anti-Stuck)
// ---------------------------------------------------------------------
console.log('\nTest Suite 5: Permanent Sticking Prevention & Reverse Breakaway');

// Place car touching wall facing it
crashPhys.position.set(50, 0.45, 39.0);
crashPhys.heading = 0;
crashPhys.velocity.set(0, 0, 0);
crashPhys.forwardSpeed = 0;
crashPhys.currentGear = 1; // Reverse gear

const zBeforeReverse = crashPhys.position.z;

// Apply reverse throttle for 15 frames
for (let f = 0; f < 15; f++) {
  crashPhys.update({ throttle: 0, brake: 1.0, steer: 0 }, 0.016, collisionSystem, []);
}

const zAfterReverse = crashPhys.position.z;
assert(zAfterReverse < zBeforeReverse - 0.5, `Car smoothly reversed away from obstacle (Backed up: ${(zBeforeReverse - zAfterReverse).toFixed(2)}m)`);
assert(!crashPhys.isColliding, 'Car successfully disengaged from obstacle contact');

// ---------------------------------------------------------------------
// TEST SUITE 6: Vehicle Reset Option
// ---------------------------------------------------------------------
console.log('\nTest Suite 6: Reset Option');

// 1. Test resetPosition resets physical states
crashPhys.velocity.set(15, 5, -20);
crashPhys.chassisPitch = 0.12;
crashPhys.chassisRoll = -0.15;
crashPhys.steerAngle = 0.4;
crashPhys.isColliding = true;

crashPhys.resetPosition(0, 0.45, 0, 0);

assert(crashPhys.velocity.length() === 0, 'Velocity zeroed out on reset');
assert(crashPhys.chassisPitch === 0 && crashPhys.chassisRoll === 0, 'Chassis pitch and roll zeroed out on reset');
assert(crashPhys.currentGear === 3, 'Gear reset to 1st gear for immediate driving');
assert(crashPhys.isColliding === false, 'Collision flag cleared on reset');

// 2. Test findSafeClearance when embedded inside obstacle
const embeddedPos = new THREE.Vector3(50, 0.5, 48); // inside building
const safePos = collisionSystem.findSafeClearance(embeddedPos, 0, 4.5);
assert(safePos !== null, 'Safe clearance position found for embedded vehicle');
const testSafe = collisionSystem.checkSphereCollision(safePos, 1.2);
assert(!testSafe || !testSafe.collided, `Safe position (${safePos.x.toFixed(1)}, ${safePos.z.toFixed(1)}) is clear of colliders`);

// Clean up
aiCar.destroy();

console.log(`\n========================================`);
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  console.log('🎉 ALL COLLISION SYSTEM & PHYSICS STABILITY TESTS PASSED!');
} else {
  process.exit(1);
}
