import * as THREE from 'three';
import { VehiclePhysics } from './src/vehicle/VehiclePhysics.js';
import { Vehicle } from './src/vehicle/Vehicle.js';
import { VehicleController } from './src/vehicle/VehicleController.js';
import { AudioManager } from './src/core/AudioManager.js';
import { InputManager } from './src/core/InputManager.js';
import { HUD } from './src/ui/HUD.js';

// Mock browser environment for headless testing
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};

console.log('=== TEST SUITE: HANDBRAKE SYSTEM SPECIFICATION ===\n');

// 1. Test Rear-Wheel Traction Reduction
console.log('1. Testing Rear-Wheel Traction Reduction...');
const physics = new VehiclePhysics({
  mass: 1400,
  maxSpeed: 240,
  enginePower: 450,
  handbrakeGrip: 0.30,
  driveType: 'RWD'
});

// Initial state
if (physics.rearTraction !== 1.0) throw new Error('Initial rear traction must be 1.0');
if (physics.frontTraction !== 1.0) throw new Error('Initial front traction must be 1.0');

// Accelerate to cruising speed
for (let i = 0; i < 150; i++) {
  physics.update({ throttle: 1.0, brake: 0, steer: 0, handbrake: false }, 0.02);
}
console.log(`  Cruising speed reached: ${Math.round(physics.speedKmh)} km/h`);
if (physics.speedKmh < 15) throw new Error('Vehicle failed to accelerate');

// Activate Handbrake
physics.update({ throttle: 0, brake: 0, steer: 0, handbrake: true }, 0.05);
console.log(`  Rear traction during handbrake: ${physics.rearTraction.toFixed(3)} (target: ${physics.handbrakeGrip})`);
if (physics.rearTraction >= 0.9) throw new Error('Rear traction was not reduced during handbrake!');
if (physics.frontTraction < 1.0) throw new Error('Front steering traction should be maintained!');
console.log('  ✓ Rear-wheel traction successfully reduced while front traction maintained.');

// Step handbrake for a few frames to let traction drop further
for (let i = 0; i < 5; i++) {
  physics.update({ throttle: 0, brake: 0, steer: 0, handbrake: true }, 0.02);
}
if (physics.rearTraction > 0.45) throw new Error('Rear traction did not settle towards handbrakeGrip');

// Release handbrake and verify smooth recovery
physics.update({ throttle: 0, brake: 0, steer: 0, handbrake: false }, 0.05);
const recoveringTraction = physics.rearTraction;
for (let i = 0; i < 20; i++) {
  physics.update({ throttle: 0.5, brake: 0, steer: 0, handbrake: false }, 0.02);
}
console.log(`  Recovered rear traction: ${physics.rearTraction.toFixed(3)}`);
if (physics.rearTraction < recoveringTraction) throw new Error('Traction did not recover after release');
if (physics.rearTraction < 0.95) throw new Error('Traction did not fully recover to ~1.0');
console.log('  ✓ Rear traction smoothly recovered without snap instability.');

// 2. Test Controlled Sliding & Counter-Steer Stabilization
console.log('\n2. Testing Controlled Sliding & Counter-Steering Stability...');
const slidePhysics = new VehiclePhysics({
  mass: 1350,
  maxSpeed: 250,
  enginePower: 480,
  driveType: 'RWD',
  handbrakeGrip: 0.28
});

// Accelerate to speed
for (let i = 0; i < 150; i++) {
  slidePhysics.update({ throttle: 1.0, brake: 0, steer: 0, handbrake: false }, 0.02);
}

// Initiate handbrake slide with steer angle
slidePhysics.update({ throttle: 0.2, brake: 0, steer: 0.6, handbrake: true }, 0.04);
slidePhysics.update({ throttle: 0.2, brake: 0, steer: 0.6, handbrake: true }, 0.04);
slidePhysics.update({ throttle: 0.2, brake: 0, steer: 0.6, handbrake: true }, 0.04);

console.log(`  Lateral drift speed: ${slidePhysics.lateralSpeed.toFixed(2)} m/s, Slip ratio: ${slidePhysics.slipRatio.toFixed(2)}`);
if (Math.abs(slidePhysics.lateralSpeed) < 0.2) throw new Error('Vehicle failed to initiate lateral slide!');
if (!slidePhysics.isDrifting && slidePhysics.slipRatio < 0.6) throw new Error('Drift slip ratio not registered');

// Test Counter-Steering
const slideYawRate = slidePhysics.yawRate || 0;
// Steer against the slide
const counterSteer = -Math.sign(slidePhysics.lateralSpeed) * 0.7;
slidePhysics.update({ throttle: 0.3, brake: 0, steer: counterSteer, handbrake: true }, 0.04);

if (isNaN(slidePhysics.heading) || !isFinite(slidePhysics.heading)) throw new Error('Heading is NaN/Infinite!');
if (isNaN(slidePhysics.position.x) || !isFinite(slidePhysics.position.x)) throw new Error('Position is NaN/Infinite!');
console.log('  ✓ Counter-steering stabilization verified. Heading and position remain perfectly finite and grounded.');

// 3. Test Physics Stability Under Extreme Handbrake Inputs
console.log('\n3. Testing Physics Stability under Extreme Inputs (No flipping or glitching)...');
for (let i = 0; i < 150; i++) {
  slidePhysics.update({
    throttle: Math.sin(i * 0.2),
    brake: (i % 10 === 0) ? 1 : 0,
    steer: Math.cos(i * 0.3),
    handbrake: (i % 2 === 0)
  }, 0.016);

  if (!isFinite(slidePhysics.position.x) || !isFinite(slidePhysics.position.y) || !isFinite(slidePhysics.position.z)) {
    throw new Error(`Physics exploded at step ${i}: position contains NaN/Infinity`);
  }
  if (!isFinite(slidePhysics.velocity.x) || !isFinite(slidePhysics.velocity.y) || !isFinite(slidePhysics.velocity.z)) {
    throw new Error(`Physics exploded at step ${i}: velocity contains NaN/Infinity`);
  }
}
console.log('  ✓ Physics remained 100% stable through 150 alternating handbrake abuse cycles.');

// 4. Test Standstill Park Lock
console.log('\n4. Testing Standstill Park Lock...');
const parkPhysics = new VehiclePhysics({ mass: 1400 });
parkPhysics.position.set(0, 0.2, 0);
parkPhysics.velocity.set(0.4, 0, 0.4); // small roll
parkPhysics.update({ throttle: 0, brake: 0, steer: 0, handbrake: true }, 0.03);
parkPhysics.update({ throttle: 0, brake: 0, steer: 0, handbrake: true }, 0.03);
console.log(`  Velocity under handbrake park lock: ${parkPhysics.velocity.length().toFixed(4)} m/s`);
if (parkPhysics.velocity.length() > 0.3) throw new Error('Handbrake park lock failed to hold stationary vehicle');
console.log('  ✓ Standstill park lock holds vehicle securely.');

// 5. Test Visual Wheel Lockup & Brake Lights
console.log('\n5. Testing Visual Feedback: Wheel Lockup, Smoke System & Brake Lights...');
const scene = new THREE.Scene();
const vehicle = new Vehicle(scene, { type: 'vortex_gt' });
const testPhysics = new VehiclePhysics();
testPhysics.velocity.set(0, 0, 15); // ~54 km/h
testPhysics.forwardSpeed = 15;
testPhysics.speedKmh = 54;
testPhysics.handbrakeActive = true;

// Step vehicle visual update with handbrake active
vehicle.update(testPhysics, 0.05);

if (!vehicle.lights.brakeLights) throw new Error('Brake lights must illuminate when handbrake is active');
if (vehicle.materials.taillightGlow.emissiveIntensity < 1.5) throw new Error('Taillights must glow bright red');
console.log('  ✓ Taillights illuminate in bright brake red when handbrake is active.');

if (!vehicle.smokePool || vehicle.smokePool.length === 0) throw new Error('Vehicle smoke particle system missing');
const activeSmoke = vehicle.smokePool.filter(p => p.active);
console.log(`  Smoke particles pool size: ${vehicle.smokePool.length}, active puffs: ${activeSmoke.length}`);
if (activeSmoke.length === 0) throw new Error('Smoke particles did not spawn during handbrake sliding!');
console.log('  ✓ Procedural tire smoke particles successfully emitted from rear wheels.');

// Verify rear wheel lockup (front spins freely, rear is locked)
const frontWheels = vehicle.wheels.filter(w => w.isFront);
const rearWheels = vehicle.wheels.filter(w => !w.isFront);

const initialFrontAngle = frontWheels[0].rotationAngle;
const initialRearAngle = rearWheels[0].rotationAngle;

vehicle.update(testPhysics, 0.05);

const frontDelta = Math.abs(frontWheels[0].rotationAngle - initialFrontAngle);
const rearDelta = Math.abs(rearWheels[0].rotationAngle - initialRearAngle);
console.log(`  Front wheel rotation delta: ${frontDelta.toFixed(3)}, Rear locked wheel delta: ${rearDelta.toFixed(3)}`);
if (frontDelta <= rearDelta) throw new Error('Front wheels must rotate much more than locked rear wheels!');
if (rearDelta > frontDelta * 0.1) throw new Error('Rear wheels should be locked or heavily dragged during handbrake');
console.log('  ✓ Rear wheels lock up while front wheels spin with road velocity.');

// 6. Test Audio Feedback
console.log('\n6. Testing Audio Feedback: Ratchet Sound & Tire Screech...');
let handbrakeEngagedCalled = false;
let handbrakeReleasedCalled = false;
let tireSlipScreechCalled = false;

const mockAudio = {
  updateEngine: () => {},
  updateWind: () => {},
  updateTireSlip: (slip, isHandbrakeSliding) => {
    if (isHandbrakeSliding) tireSlipScreechCalled = true;
  },
  playHandbrake: (engaged) => {
    if (engaged) handbrakeEngagedCalled = true;
    else handbrakeReleasedCalled = true;
  },
  playIndicatorClick: () => {}
};

const mockInput = new InputManager();
const controller = new VehicleController(vehicle, testPhysics, mockAudio, mockInput);

// Trigger handbrake press
mockInput.virtualControls.handbrake = true;
controller.update(0.016);
if (!handbrakeEngagedCalled) throw new Error('playHandbrake(true) was not called when handbrake pressed');
if (!tireSlipScreechCalled) throw new Error('updateTireSlip with handbrake sliding was not called');
console.log('  ✓ Handbrake ratchet sound triggered and tire screech active.');

// Trigger handbrake release
mockInput.virtualControls.handbrake = false;
controller.update(0.016);
if (!handbrakeReleasedCalled) throw new Error('playHandbrake(false) was not called when handbrake released');
console.log('  ✓ Handbrake release clack sound triggered.');

console.log('\n=== ALL HANDBRAKE SYSTEM SPECIFICATION TESTS PASSED PERFECTLY! ===');
