import * as THREE from 'three';
import { DrivingSchoolManager } from './src/missions/DrivingSchoolManager.js';
import { GameState } from './src/core/GameState.js';
import { OFFICIAL_COURSE_TEST } from './src/missions/CourseTest.js';
import { PARKING_TEST } from './src/missions/DrivingTest.js';

console.log('=== STARTING COURSE TEST & PARKING TEST SYSTEM VERIFICATION ===\n');

// 1. Setup mock scene and dependencies
const scene = new THREE.Scene();
const gameState = new GameState();
const mockAudio = {
  playCheckpointChime: () => {},
  playVictoryFanfare: () => {},
  playCrash: () => {}
};
const mockCollision = {
  getGroundHeight: () => 0
};

const dsm = new DrivingSchoolManager(scene, gameState, mockAudio, mockCollision);

// ----------------------------------------------------
// TEST SUITE 1: COURSE TEST VALIDATION
// ----------------------------------------------------
console.log('--- TEST 1: COURSE TEST INITIALIZATION & GROUNDS ---');
dsm.startMode('COURSE_TEST');

if (dsm.subMode !== 'COURSE_TEST') {
  throw new Error(`Expected subMode to be COURSE_TEST, got ${dsm.subMode}`);
}
if (dsm.checkpoints.length !== 8) {
  throw new Error(`Expected 8 course checkpoints, got ${dsm.checkpoints.length}`);
}
if (dsm.worldGroup.children.length < 20) {
  throw new Error(`Expected 3D course ground features (cones, walls, stop box, bay), found ${dsm.worldGroup.children.length}`);
}
console.log(`✓ Course Test grounds built successfully with ${dsm.worldGroup.children.length} 3D features (slalom, apexes, narrow road cone corridor, stop box, parking bay).`);

console.log('\n--- TEST 2: COURSE TEST TELEMETRY & TRACKING ---');
const spawn = dsm.getSpawnPosition();
console.log('Course Test Spawn Position:', spawn);
if (spawn.x !== -165 || spawn.z !== 65) {
  throw new Error(`Expected spawn at (-165, 65), got (${spawn.x}, ${spawn.z})`);
}

let mockVehicle = {
  position: new THREE.Vector3(-165, 0.45, 65),
  heading: 0,
  speedKmh: 25,
  isColliding: false
};

// Initial update
let telemetry = dsm.update(0.1, mockVehicle, {});
console.log('Initial Telemetry:', {
  time: telemetry.timeFormatted,
  collisions: telemetry.collisions,
  missed: telemetry.missedCheckpoints,
  accuracy: telemetry.accuracy
});

if (telemetry.accuracy !== 100 || telemetry.collisions !== 0 || telemetry.missedCheckpoints !== 0) {
  throw new Error('Initial course test metrics should be 100% accuracy and 0 collisions/misses');
}

// Simulate Collision with Cone
console.log('\n--- TEST 3: COLLISION TRACKING & ACCURACY DEDUCTION ---');
mockVehicle.isColliding = true;
telemetry = dsm.update(0.1, mockVehicle, {});
mockVehicle.isColliding = false;

console.log('Post-Collision Telemetry:', {
  collisions: telemetry.collisions,
  accuracy: telemetry.accuracy
});
if (telemetry.collisions !== 1 || telemetry.accuracy !== 96) {
  throw new Error(`Expected 1 collision and 96% accuracy, got ${telemetry.collisions} and ${telemetry.accuracy}%`);
}
console.log('✓ Collision properly tracked and accuracy deducted (-4%).');

// Simulate Checkpoint Navigation through Cones and Turns
console.log('\n--- TEST 4: CHECKPOINT NAVIGATION & STOP ZONE REQUIREMENT ---');
// CP 0: Slalom (-165, 95)
mockVehicle.position.set(-165, 0.45, 95);
telemetry = dsm.update(0.1, mockVehicle, {});
if (telemetry.currentCheckpointIndex !== 1) {
  throw new Error(`Expected currentCheckpointIndex 1, got ${telemetry.currentCheckpointIndex}`);
}
console.log('✓ Stage 1 Slalom Checkpoint Cleared.');

// CP 1: Turn (-165, 125)
mockVehicle.position.set(-165, 0.45, 125);
telemetry = dsm.update(0.1, mockVehicle, {});
console.log('✓ Stage 2 Turn Checkpoint Cleared.');

// CP 2: Chicane (-130, 145)
mockVehicle.position.set(-130, 0.45, 145);
telemetry = dsm.update(0.1, mockVehicle, {});
console.log('✓ Stage 3 S-Chicane Checkpoint Cleared.');

// CP 3: Hairpin (-95, 135)
mockVehicle.position.set(-95, 0.45, 135);
telemetry = dsm.update(0.1, mockVehicle, {});
console.log('✓ Stage 4 Hairpin Checkpoint Cleared.');

// CP 4: Narrow Road (-95, 95)
mockVehicle.position.set(-95, 0.45, 95);
telemetry = dsm.update(0.1, mockVehicle, {});
console.log('✓ Stage 5 Narrow Road Corridor Checkpoint Cleared.');

// CP 5: Stop Zone (-95, 60)
// First approach at high speed (30 km/h) -> should NOT clear
mockVehicle.position.set(-95, 0.45, 60);
mockVehicle.speedKmh = 30;
telemetry = dsm.update(0.1, mockVehicle, {});
if (telemetry.currentCheckpointIndex !== 5) {
  throw new Error(`Stop zone should not clear while speed > 2 km/h! index is ${telemetry.currentCheckpointIndex}`);
}
console.log('✓ Stop zone held successfully while traveling at speed.');

// Now bring speed to 0.5 km/h -> should clear
mockVehicle.speedKmh = 0.5;
telemetry = dsm.update(0.1, mockVehicle, {});
if (telemetry.currentCheckpointIndex !== 6) {
  throw new Error(`Stop zone should clear when speed < 2 km/h! index is ${telemetry.currentCheckpointIndex}`);
}
console.log('✓ Stop zone cleared upon complete stop.');

// CP 6: Approach (-120, 50)
mockVehicle.position.set(-120, 0.45, 50);
mockVehicle.speedKmh = 20;
telemetry = dsm.update(0.1, mockVehicle, {});

// CP 7: Final Parking Section (-145, 50)
mockVehicle.position.set(-145, 0.45, 50);
// High speed -> not complete yet
mockVehicle.speedKmh = 15;
telemetry = dsm.update(0.1, mockVehicle, {});
if (telemetry.isCompleted) {
  throw new Error('Parking section should require vehicle to halt before completion!');
}

// Bring to complete stop inside bay
mockVehicle.speedKmh = 0.2;
telemetry = dsm.update(0.1, mockVehicle, {});
if (!telemetry.isCompleted) {
  throw new Error('Course test should be completed when stopped in parking section!');
}
console.log('✓ Course test completed upon parking vehicle and stopping.');
console.log('Final Course Test Results:', {
  title: telemetry.title,
  result: telemetry.result,
  time: telemetry.timeFormatted,
  collisions: telemetry.collisions,
  missedCheckpoints: telemetry.missedCheckpoints,
  accuracy: `${telemetry.accuracy}%`
});

// ----------------------------------------------------
// TEST SUITE 2: PARKING TEST (PARKING CHALLENGE)
// ----------------------------------------------------
console.log('\n--- TEST 5: PARKING TEST INITIALIZATION ---');
dsm.startMode('PARKING_TEST');
if (dsm.subMode !== 'PARKING_TEST') {
  throw new Error(`Expected subMode PARKING_TEST, got ${dsm.subMode}`);
}
if (dsm.parkingStalls.length !== 3) {
  throw new Error(`Expected 3 parking types, got ${dsm.parkingStalls.length}`);
}
console.log('Parking Challenge Types:', dsm.parkingStalls.map(s => s.title));

// Parking Type 1: Straight parking at (-135, 103)
console.log('\n--- TEST 6: PARKING-ZONE DETECTION & LIVE ACCURACY ---');
// Position outside bay
mockVehicle.position.set(-135, 0.45, 85);
mockVehicle.speedKmh = 10;
telemetry = dsm.update(0.1, mockVehicle, {});

console.log('Approaching Stall Telemetry:', {
  title: telemetry.title,
  instruction: telemetry.instruction,
  accuracy: `${telemetry.accuracy}%`,
  isInside: telemetry.isInside,
  parkingType: telemetry.parkingType
});
if (telemetry.isInside !== false) {
  throw new Error('Vehicle should not be marked inside parking bay yet');
}
if (telemetry.instruction !== 'Position vehicle inside the marked area.') {
  throw new Error(`Expected instruction 'Position vehicle inside the marked area.', got '${telemetry.instruction}'`);
}

// Position vehicle inside Straight parking bay: (-135, 103), heading = 0
mockVehicle.position.set(-135.1, 0.45, 103.2);
mockVehicle.heading = 0.04;
mockVehicle.speedKmh = 0.8;
telemetry = dsm.update(0.1, mockVehicle, {});

console.log('Inside Bay Telemetry:', {
  instruction: telemetry.instruction,
  accuracy: `${telemetry.accuracy}%`,
  isInside: telemetry.isInside,
  parkingType: telemetry.parkingType
});
if (telemetry.isInside !== true) {
  throw new Error('Vehicle should be detected inside parking bay');
}
if (telemetry.accuracy < 80 || telemetry.accuracy > 100) {
  throw new Error(`Expected high inside parking accuracy (80-100%), got ${telemetry.accuracy}%`);
}
console.log(`✓ Parking-zone detection active: Inside = true, Accuracy = ${telemetry.accuracy}%.`);

// Hold for 1.8 seconds to complete Straight parking
console.log('\n--- TEST 7: ADVANCING THROUGH STRAIGHT, REVERSE, & PARALLEL PARKING ---');
for (let t = 0; t < 19; t++) {
  telemetry = dsm.update(0.1, mockVehicle, {});
}
if (dsm.parkingStageIndex !== 1) {
  throw new Error(`Expected parking stage 1 (Reverse parking), got ${dsm.parkingStageIndex}`);
}
console.log(`✓ Straight parking passed! Advanced to: ${telemetry.parkingType}`);

// Stage 2: Reverse parking at (-120, 135), heading = Math.PI
mockVehicle.position.set(-120.05, 0.45, 135.1);
mockVehicle.heading = Math.PI - 0.03;
mockVehicle.speedKmh = 0.4;
telemetry = dsm.update(0.1, mockVehicle, {});
if (telemetry.isInside !== true) {
  throw new Error('Reverse parking stall zone detection failed');
}
// Hold to pass
for (let t = 0; t < 19; t++) {
  telemetry = dsm.update(0.1, mockVehicle, {});
}
if (dsm.parkingStageIndex !== 2) {
  throw new Error(`Expected parking stage 2 (Parallel parking), got ${dsm.parkingStageIndex}`);
}
console.log(`✓ Reverse parking passed! Advanced to: ${telemetry.parkingType}`);

// Stage 3: Parallel parking at (-150, 155), heading = Math.PI / 2
mockVehicle.position.set(-150.1, 0.45, 155.1);
mockVehicle.heading = Math.PI / 2 + 0.02;
mockVehicle.speedKmh = 0.3;
telemetry = dsm.update(0.1, mockVehicle, {});
if (telemetry.isInside !== true) {
  throw new Error('Parallel parking stall zone detection failed');
}
// Hold to complete parking challenge
for (let t = 0; t < 19; t++) {
  telemetry = dsm.update(0.1, mockVehicle, {});
}
if (!telemetry.isCompleted) {
  throw new Error('Parking challenge should be marked complete after all 3 stalls!');
}
console.log(`✓ Parallel parking passed! Parking test completed with overall accuracy: ${telemetry.finalAccuracy}%.`);

console.log('\n=== ALL COURSE TEST & PARKING TEST VERIFICATIONS PASSED WITH 0 ERRORS! ===');
