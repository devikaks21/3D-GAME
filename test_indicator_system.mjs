import * as THREE from 'three';
import { Vehicle } from './src/vehicle/Vehicle.js';
import { VehiclePhysics } from './src/vehicle/VehiclePhysics.js';
import { VehicleController } from './src/vehicle/VehicleController.js';
import { AudioManager } from './src/core/AudioManager.js';
import { InputManager } from './src/core/InputManager.js';
import { HUD } from './src/ui/HUD.js';

// Setup Mock DOM environment for headless testing
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};

console.log('=== TEST SUITE: INDICATOR SYSTEM SPECIFICATION ===\n');

const scene = new THREE.Scene();
const vehicle = new Vehicle(scene, { type: 'vortex_gt' });
const physics = new VehiclePhysics();

// 1. Initial State: Must be OFF
console.log('1. Checking Initial Indicator State...');
if (vehicle.getIndicatorState() !== 'OFF') {
  throw new Error(`Expected initial indicator state to be 'OFF', got '${vehicle.getIndicatorState()}'`);
}
if (vehicle.leftIndicatorOn || vehicle.rightIndicatorOn || vehicle.hazardOn) {
  throw new Error('Initial indicator flags must be false');
}
console.log('  ✓ Initial state is correctly OFF.');

// 2. Testing LEFT INDICATOR
console.log('\n2. Testing LEFT INDICATOR Activation...');
const stateL = vehicle.setIndicatorState('LEFT');
if (stateL !== 'LEFT' || vehicle.getIndicatorState() !== 'LEFT') {
  throw new Error(`Failed to set LEFT indicator. State is '${vehicle.getIndicatorState()}'`);
}
if (!vehicle.leftIndicatorOn || vehicle.rightIndicatorOn || vehicle.hazardOn) {
  throw new Error('LEFT indicator must activate ONLY left blinkers');
}
console.log('  ✓ LEFT INDICATOR active (Left: ON, Right: OFF, Hazard: OFF).');

// 3. Testing RIGHT INDICATOR
console.log('\n3. Testing RIGHT INDICATOR Activation...');
const stateR = vehicle.setIndicatorState('RIGHT');
if (stateR !== 'RIGHT' || vehicle.getIndicatorState() !== 'RIGHT') {
  throw new Error(`Failed to set RIGHT indicator. State is '${vehicle.getIndicatorState()}'`);
}
if (!vehicle.rightIndicatorOn || vehicle.leftIndicatorOn || vehicle.hazardOn) {
  throw new Error('RIGHT indicator must activate ONLY right blinkers');
}
console.log('  ✓ RIGHT INDICATOR active (Right: ON, Left: OFF, Hazard: OFF).');

// 4. Testing HAZARD
console.log('\n4. Testing HAZARD Flashers Activation...');
const stateH = vehicle.setIndicatorState('HAZARD');
if (stateH !== 'HAZARD' || vehicle.getIndicatorState() !== 'HAZARD') {
  throw new Error(`Failed to set HAZARD. State is '${vehicle.getIndicatorState()}'`);
}
if (!vehicle.hazardOn) {
  throw new Error('HAZARD indicator flag must be true');
}
console.log('  ✓ HAZARD active (Both 4-way emergency flashers active).');

// 5. Testing OFF Mode
console.log('\n5. Testing Explicit OFF Functionality...');
const stateOff = vehicle.turnOffIndicators();
if (stateOff !== 'OFF' || vehicle.getIndicatorState() !== 'OFF') {
  throw new Error(`Expected 'OFF', got '${stateOff}'`);
}
if (vehicle.leftIndicatorOn || vehicle.rightIndicatorOn || vehicle.hazardOn) {
  throw new Error('All indicator flags must be false when OFF');
}
console.log('  ✓ turnOffIndicators() successfully reset all indicators to OFF.');

// 6. Testing Toggle Behavior
console.log('\n6. Testing Toggle Mechanics...');
vehicle.turnOffIndicators();
vehicle.toggleLeftIndicator();
if (vehicle.getIndicatorState() !== 'LEFT') throw new Error('Toggle should turn LEFT on');
vehicle.toggleLeftIndicator();
if (vehicle.getIndicatorState() !== 'OFF') throw new Error('Second toggle should turn LEFT off');

vehicle.toggleRightIndicator();
if (vehicle.getIndicatorState() !== 'RIGHT') throw new Error('Toggle should turn RIGHT on');
vehicle.toggleRightIndicator();
if (vehicle.getIndicatorState() !== 'OFF') throw new Error('Second toggle should turn RIGHT off');

vehicle.toggleHazard();
if (vehicle.getIndicatorState() !== 'HAZARD') throw new Error('Toggle should turn HAZARD on');
vehicle.toggleHazard();
if (vehicle.getIndicatorState() !== 'OFF') throw new Error('Second toggle should turn HAZARD off');
console.log('  ✓ Toggling indicators cleanly alternates between ON and OFF.');

// 7. Testing Realistic Blink Interval
console.log('\n7. Testing Realistic Blink Interval (ECE R48 / 1.5 Hz standard)...');
vehicle.setIndicatorState('LEFT');
vehicle.indicatorBlinkTimer = 0;
vehicle.indicatorBlinkState = false;

// Step vehicle forward by 0.16s (less than blink interval)
vehicle.update(physics, 0.16);
if (vehicle.indicatorBlinkState !== false) {
  throw new Error('Indicator switched too fast; must obey realistic blink interval');
}

// Step vehicle forward by another 0.18s (total 0.34s >= 0.33s interval)
vehicle.update(physics, 0.18);
if (vehicle.indicatorBlinkState !== true) {
  throw new Error('Indicator failed to blink ON at the 0.33s realistic interval');
}
console.log(`  ✓ Indicator blinks at realistic interval: ${vehicle.indicatorBlinkRate}s per half-cycle (~90 flashes/min).`);

// Step another full phase (0.34s) -> should blink OFF
vehicle.update(physics, 0.34);
if (vehicle.indicatorBlinkState !== false) {
  throw new Error('Indicator failed to cycle back to OFF phase');
}
console.log('  ✓ Indicator reliably cycles between ON and OFF phases.');

// 8. Testing Automatic Turn Cancellation After Completing Turn
console.log('\n8. Testing Automatic Turn Cancellation after Completing Turn...');

// Case A: Left Turn Auto-Cancellation
console.log('  A. Testing Left Turn Auto-Cancellation:');
vehicle.setIndicatorState('LEFT');
physics.forwardSpeed = 8; // 29 km/h cruising speed

// Phase 1: Straight road before turn
physics.steerAngle = 0;
vehicle.update(physics, 0.05);
if (vehicle.getIndicatorState() !== 'LEFT') throw new Error('Indicator cancelled prematurely before turn');

// Phase 2: Driver turns steering wheel LEFT into intersection (steerAngle = -0.35 rad)
physics.steerAngle = -0.35;
vehicle.update(physics, 0.05);
if (!vehicle.turnEngaged) throw new Error('Turn engagement was not detected during steering');
if (vehicle.getIndicatorState() !== 'LEFT') throw new Error('Indicator should remain ON while cornering');
console.log('    - Left cornering entered: indicator remains active while turning.');

// Phase 3: Driver straightens wheel back to center (steerAngle returns to 0)
physics.steerAngle = -0.01;
vehicle.update(physics, 0.05);
if (vehicle.getIndicatorState() !== 'OFF') {
  throw new Error('Left indicator failed to automatically cancel after straightening wheel!');
}
console.log('    ✓ Left indicator automatically cancelled after completing turn.');

// Case B: Right Turn Auto-Cancellation
console.log('  B. Testing Right Turn Auto-Cancellation:');
vehicle.setIndicatorState('RIGHT');
physics.steerAngle = 0;
vehicle.update(physics, 0.05);

// Driver turns steering wheel RIGHT into corner (steerAngle = 0.38 rad)
physics.steerAngle = 0.38;
vehicle.update(physics, 0.05);
if (!vehicle.turnEngaged) throw new Error('Right turn engagement not detected');

// Driver straightens wheel back to center
physics.steerAngle = 0.01;
vehicle.update(physics, 0.05);
if (vehicle.getIndicatorState() !== 'OFF') {
  throw new Error('Right indicator failed to automatically cancel after completing right turn!');
}
console.log('    ✓ Right indicator automatically cancelled after completing turn.');

// Case C: Hazard Lights MUST NOT Auto-Cancel on Steering Turns
console.log('  C. Verifying Hazard Flashers NEVER Auto-Cancel on Turns:');
vehicle.setIndicatorState('HAZARD');
physics.steerAngle = -0.4;
vehicle.update(physics, 0.05);
physics.steerAngle = 0;
vehicle.update(physics, 0.05);
physics.steerAngle = 0.45;
vehicle.update(physics, 0.05);
physics.steerAngle = 0;
vehicle.update(physics, 0.05);

if (vehicle.getIndicatorState() !== 'HAZARD') {
  throw new Error('Hazard flashers must NEVER auto-cancel on steering wheel turns!');
}
console.log('    ✓ Hazard flashers remain safely ON through all steering turns.');

// 9. Testing VehicleController Integration & Telemetry
console.log('\n9. Testing VehicleController Integration & Audio...');
let audioTickCount = 0;
const mockAudio = {
  updateEngine: () => {},
  updateWind: () => {},
  updateTireSlip: () => {},
  playIndicatorClick: () => { audioTickCount++; }
};

const input = new InputManager();
const controller = new VehicleController(vehicle, physics, mockAudio, input);

controller.setIndicatorState('LEFT');
if (controller.getIndicatorState() !== 'LEFT') throw new Error('Controller failed to set LEFT');
if (controller.getTelemetry().indicatorState !== 'LEFT') throw new Error('Telemetry indicatorState mismatch');

controller.setIndicatorState('RIGHT');
if (controller.getTelemetry().indicatorState !== 'RIGHT') throw new Error('Telemetry indicatorState mismatch for RIGHT');

controller.setIndicatorState('HAZARD');
if (controller.getTelemetry().indicatorState !== 'HAZARD') throw new Error('Telemetry indicatorState mismatch for HAZARD');

controller.turnOffIndicators();
if (controller.getTelemetry().indicatorState !== 'OFF') throw new Error('Telemetry indicatorState mismatch for OFF');
console.log('  ✓ VehicleController setIndicatorState, getIndicatorState, and telemetry verified.');

console.log('\n=== ALL INDICATOR SYSTEM TESTS PASSED PERFECTLY! ===');
