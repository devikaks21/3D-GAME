import * as THREE from 'three';
import { GameState, GameModes } from './src/core/GameState.js';
import { DrivingSchoolManager } from './src/missions/DrivingSchoolManager.js';
import { DRIVING_LESSONS, ROAD_TEST_ROUTE, PARKING_TEST } from './src/missions/DrivingTest.js';
import { COURSE_TESTS } from './src/missions/CourseTest.js';
import { VehiclePhysics } from './src/vehicle/VehiclePhysics.js';
import { CollisionSystem } from './src/utilities/Collision.js';

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

console.log('🧪 Starting Dedicated Driving School & Practice Mode Test Suite...\n');

// Mock AudioManager
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
const schoolManager = new DrivingSchoolManager(scene, gameState, mockAudio, collisionSystem);

// ==========================================
// TEST SUITE 1: Dedicated Menu Options
// ==========================================
console.log('Test Suite 1: Dedicated Driving School Menu Options');
const expectedModes = ['PRACTICE', 'ROAD_TEST', 'COURSE_TEST', 'PARKING_TEST'];
expectedModes.forEach(modeName => {
  schoolManager.startMode(modeName);
  assert(schoolManager.subMode === modeName, `Driving School cleanly loads sub-mode: [${modeName}]`);
});

// Verify tests configuration
assert(ROAD_TEST_ROUTE && ROAD_TEST_ROUTE.checkpoints.length >= 5, 'Road Test configuration loaded with valid checkpoints');
assert(COURSE_TESTS && COURSE_TESTS.length >= 1, 'Course Test configuration loaded with chicane/slalom stages');
assert(PARKING_TEST && PARKING_TEST.checkpoints.length >= 3, 'Parking Test configuration loaded with precision parking stalls');

// ==========================================
// TEST SUITE 2: Practice Mode 7 Learning Skills
// ==========================================
console.log('\nTest Suite 2: Practice Mode 7 Learning Skills');

const practiceSkills = [
  'steering',
  'braking',
  'turning',
  'parking',
  'indicators',
  'reversing',
  'gear_control'
];

schoolManager.startMode('PRACTICE');
assert(schoolManager.subMode === 'PRACTICE', 'Driving School entered PRACTICE mode');

practiceSkills.forEach(skill => {
  schoolManager.selectPracticeSkill(skill);
  assert(schoolManager.activeSkill === skill, `Practice mode successfully selects skill: ${skill.toUpperCase()}`);
  assert(schoolManager.tutorMessage.length > 0, `Skill ${skill} provides live instruction guidance`);
  assert(schoolManager.checkpoints.length > 0 || skill === 'gear_control', `Skill ${skill} generated interactive practice checkpoints`);
  const spawn = schoolManager.getSpawnPosition(skill);
  assert(spawn && typeof spawn.x === 'number' && typeof spawn.z === 'number', `Skill ${skill} provides specialized arena spawn position`);
});

// ==========================================
// TEST SUITE 3: Interactive Mastery Checks (No Strict Score)
// ==========================================
console.log('\nTest Suite 3: Interactive Mastery Checks (No Strict Score)');

const phys = new VehiclePhysics(scene, collisionSystem);

// 1. Steering Skill
schoolManager.selectPracticeSkill('steering');
phys.speedKmh = 25;
phys.steerAngle = 0.35;
schoolManager.update(0.1, phys, null, null);
assert(schoolManager.skillProgress > 0, 'Steering input advancing practice technique progress');
schoolManager.markSkillMastered('steering', 'Great steering!');
assert(schoolManager.masteredSkills.has('steering'), 'Steering skill marked as mastered');

// 2. Braking Skill
schoolManager.selectPracticeSkill('braking');
phys.speedKmh = 40;
schoolManager.update(0.1, phys, null, null);
assert(schoolManager.skillProgress >= 0.4, 'Braking technique detected speed acceleration phase');
phys.speedKmh = 0.5;
phys.position.set(schoolManager.arenaCenter.x, 0.4, schoolManager.arenaCenter.z);
schoolManager.update(0.1, phys, null, null);
assert(schoolManager.masteredSkills.has('braking'), 'Braking skill mastered upon stopping in marked STOP zone');

// 3. Turning Skill
schoolManager.selectPracticeSkill('turning');
schoolManager.currentCheckpointIndex = schoolManager.checkpoints.length;
schoolManager.update(0.1, phys, null, null);
assert(schoolManager.masteredSkills.has('turning'), 'Turning skill mastered upon navigating corner arc');

// 4. Parking Skill
schoolManager.selectPracticeSkill('parking');
const bay = schoolManager.checkpoints[0];
phys.position.set(bay.x, 0.4, bay.z);
phys.speedKmh = 0;
// Hold in bay for 1.6s
schoolManager.update(1.6, phys, null, null);
assert(schoolManager.masteredSkills.has('parking'), 'Parking skill mastered after holding vehicle stationary in marked stall');

// 5. Indicators Skill
schoolManager.selectPracticeSkill('indicators');
phys.indicatorState = 'left';
schoolManager.update(0.1, phys, null, null);
assert(schoolManager.indicatorTested === true, 'Indicator activation detected during practice');
schoolManager.currentCheckpointIndex = schoolManager.checkpoints.length;
schoolManager.update(0.1, phys, null, null);
assert(schoolManager.masteredSkills.has('indicators'), 'Indicators skill mastered after signaling and completing turn');

// 6. Reversing Skill
schoolManager.selectPracticeSkill('reversing');
phys.currentGear = 1; // Reverse gear
phys.forwardSpeed = -3.5; // Reversing backward
for (let i = 0; i < 50; i++) {
  schoolManager.update(0.1, phys, null, null);
}
assert(schoolManager.masteredSkills.has('reversing'), 'Reversing skill mastered after traveling backward in Reverse gear');

// 7. Gear Control Skill
schoolManager.selectPracticeSkill('gear_control');
phys.currentGear = 3; // 1st
schoolManager.update(0.1, phys, null, null);
phys.currentGear = 4; // 2nd
schoolManager.update(0.1, phys, null, null);
phys.currentGear = 5; // 3rd
schoolManager.update(0.1, phys, null, null);
assert(schoolManager.masteredSkills.has('gear_control'), 'Gear control mastered after shifting across multiple forward transmission gears');

// Verify all 7 skills in Set
assert(schoolManager.masteredSkills.size === 7, 'All 7 practice skills successfully mastered in checklist');

// ==========================================
// TEST SUITE 4: Verification of No Strict Score Penalty
// ==========================================
console.log('\nTest Suite 4: Verification of No Strict Score Penalty');
const practiceUpdate = schoolManager.update(5.0, phys, null, null);
assert(practiceUpdate.subMode === 'PRACTICE', 'Update returns PRACTICE mode telemetry');
assert(practiceUpdate.isFailed === undefined || practiceUpdate.isFailed === false, 'No failure penalty is assigned in Practice mode');
assert(practiceUpdate.totalSkills === 7, 'Checklist reflects all 7 curriculum skills');

console.log(`\n========================================`);
console.log(`RESULTS: ${passed}/${total} tests passed.`);
console.log(`========================================`);

if (passed === total) {
  console.log('\n🎉 ALL DRIVING SCHOOL & PRACTICE MODE TESTS PASSED!');
  process.exit(0);
} else {
  console.error('\n❌ SOME TESTS FAILED');
  process.exit(1);
}
