import assert from 'assert';

// Mock minimal browser globals for Node.js test environment
global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.document = {
  createElement: () => ({
    appendChild: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  }),
  body: { appendChild: () => {} }
};

const { Vehicle } = await import('./src/vehicle/Vehicle.js');
const { VehicleController } = await import('./src/vehicle/VehicleController.js');
const { AudioManager } = await import('./src/core/AudioManager.js');
const { InputManager } = await import('./src/core/InputManager.js');

console.log('=== TEST SUITE: DOOR SYSTEM SPECIFICATION ===\n');

// 1. Check Door Initial State and Four Door Definitions
console.log('1. Checking Four Door Definitions on Supported Vehicles...');
const vehicle = new Vehicle(null, { type: 'nova_x' });

assert(vehicle.doors !== null, 'vehicle.doors should exist');
assert(vehicle.doors.frontLeft !== undefined, 'Front-Left door should be defined');
assert(vehicle.doors.frontRight !== undefined, 'Front-Right door should be defined');
assert(vehicle.doors.rearLeft !== undefined, 'Rear-Left door should be defined');
assert(vehicle.doors.rearRight !== undefined, 'Rear-Right door should be defined');

assert.strictEqual(vehicle.doors.frontLeft.isOpen, false, 'Front-Left door should initially be closed');
assert.strictEqual(vehicle.doors.frontRight.isOpen, false, 'Front-Right door should initially be closed');
assert.strictEqual(vehicle.doors.rearLeft.isOpen, false, 'Rear-Left door should initially be closed');
assert.strictEqual(vehicle.doors.rearRight.isOpen, false, 'Rear-Right door should initially be closed');
assert.strictEqual(vehicle.doors.isOpen, false, 'Global doors.isOpen should initially be false');

console.log('  ✓ Front-Left, Front-Right, Rear-Left, Rear-Right doors properly initialized.');

// 2. Testing Open and Close on Each Door Independently
console.log('\n2. Testing Open & Close on Each Door Independently...');

// A. Front-Left Door
const openedFL = vehicle.openDoor('frontLeft');
assert.strictEqual(openedFL, true, 'openDoor(frontLeft) should return true');
assert.strictEqual(vehicle.doors.frontLeft.isOpen, true, 'Front-Left door should be OPEN');
assert.strictEqual(vehicle.doors.frontRight.isOpen, false, 'Front-Right door should remain CLOSED');
assert.strictEqual(vehicle.doors.isOpen, true, 'Global doors.isOpen should be true when FL is open');

const closedFL = vehicle.closeDoor('frontLeft');
assert.strictEqual(closedFL, false, 'closeDoor(frontLeft) should return false');
assert.strictEqual(vehicle.doors.frontLeft.isOpen, false, 'Front-Left door should now be CLOSED');
assert.strictEqual(vehicle.doors.isOpen, false, 'Global doors.isOpen should be false when all closed');
console.log('  ✓ Front-Left door Open and Close verified.');

// B. Front-Right Door
const openedFR = vehicle.openDoor('frontRight');
assert.strictEqual(openedFR, true, 'openDoor(frontRight) should return true');
assert.strictEqual(vehicle.doors.frontRight.isOpen, true, 'Front-Right door should be OPEN');
assert.strictEqual(vehicle.doors.frontLeft.isOpen, false, 'Front-Left door should remain CLOSED');

vehicle.closeDoor('frontRight');
assert.strictEqual(vehicle.doors.frontRight.isOpen, false, 'Front-Right door should now be CLOSED');
console.log('  ✓ Front-Right door Open and Close verified.');

// C. Rear-Left Door
const openedRL = vehicle.openDoor('rearLeft');
assert.strictEqual(openedRL, true, 'openDoor(rearLeft) should return true');
assert.strictEqual(vehicle.doors.rearLeft.isOpen, true, 'Rear-Left door should be OPEN');

vehicle.closeDoor('rearLeft');
assert.strictEqual(vehicle.doors.rearLeft.isOpen, false, 'Rear-Left door should now be CLOSED');
console.log('  ✓ Rear-Left door Open and Close verified.');

// D. Rear-Right Door
const openedRR = vehicle.openDoor('rearRight');
assert.strictEqual(openedRR, true, 'openDoor(rearRight) should return true');
assert.strictEqual(vehicle.doors.rearRight.isOpen, true, 'Rear-Right door should be OPEN');

vehicle.closeDoor('rearRight');
assert.strictEqual(vehicle.doors.rearRight.isOpen, false, 'Rear-Right door should now be CLOSED');
console.log('  ✓ Rear-Right door Open and Close verified.');

// 3. Testing Dedicated Named Methods
console.log('\n3. Testing Dedicated Named Methods (openFrontLeftDoor, etc.)...');
vehicle.openFrontLeftDoor();
assert.strictEqual(vehicle.doors.frontLeft.isOpen, true, 'openFrontLeftDoor should open FL');
vehicle.closeFrontLeftDoor();
assert.strictEqual(vehicle.doors.frontLeft.isOpen, false, 'closeFrontLeftDoor should close FL');

vehicle.openFrontRightDoor();
assert.strictEqual(vehicle.doors.frontRight.isOpen, true, 'openFrontRightDoor should open FR');
vehicle.closeFrontRightDoor();
assert.strictEqual(vehicle.doors.frontRight.isOpen, false, 'closeFrontRightDoor should close FR');

vehicle.openRearLeftDoor();
assert.strictEqual(vehicle.doors.rearLeft.isOpen, true, 'openRearLeftDoor should open RL');
vehicle.closeRearLeftDoor();
assert.strictEqual(vehicle.doors.rearLeft.isOpen, false, 'closeRearLeftDoor should close RL');

vehicle.openRearRightDoor();
assert.strictEqual(vehicle.doors.rearRight.isOpen, true, 'openRearRightDoor should open RR');
vehicle.closeRearRightDoor();
assert.strictEqual(vehicle.doors.rearRight.isOpen, false, 'closeRearRightDoor should close RR');

console.log('  ✓ All 8 individual named methods function correctly.');

// 4. Testing Door Toggling
console.log('\n4. Testing Door Toggling (toggleDoor, toggleAllDoors)...');
assert.strictEqual(vehicle.toggleDoor('frontLeft'), true, 'Toggling closed FL door should OPEN it');
assert.strictEqual(vehicle.doors.frontLeft.isOpen, true);
assert.strictEqual(vehicle.toggleDoor('frontLeft'), false, 'Toggling open FL door should CLOSE it');
assert.strictEqual(vehicle.doors.frontLeft.isOpen, false);

vehicle.openAllDoors();
assert.strictEqual(vehicle.doors.frontLeft.isOpen, true);
assert.strictEqual(vehicle.doors.frontRight.isOpen, true);
assert.strictEqual(vehicle.doors.rearLeft.isOpen, true);
assert.strictEqual(vehicle.doors.rearRight.isOpen, true);
assert.strictEqual(vehicle.doors.isOpen, true);

vehicle.closeAllDoors();
assert.strictEqual(vehicle.doors.frontLeft.isOpen, false);
assert.strictEqual(vehicle.doors.frontRight.isOpen, false);
assert.strictEqual(vehicle.doors.rearLeft.isOpen, false);
assert.strictEqual(vehicle.doors.rearRight.isOpen, false);
assert.strictEqual(vehicle.doors.isOpen, false);

console.log('  ✓ Toggling and All-Door operations verified.');

// 5. Testing Smooth Door Animations Across update(dt)
console.log('\n5. Testing Smooth Door Animations Across update(dt)...');
const animVehicle = new Vehicle(null, { type: 'nova_x' });
animVehicle.openDoor('frontLeft');

assert.strictEqual(animVehicle.doors.frontLeft.progress, 0, 'Initial progress is 0.0');

// Step 1: Advance by small delta time (16ms)
animVehicle.update(0.016);
const p1 = animVehicle.doors.frontLeft.progress;
console.log(`  Frame 1 (16ms) progress:  ${p1.toFixed(4)} (smoothly started opening)`);
assert(p1 > 0 && p1 < 0.20, 'Door progress should smoothly start increasing without instant jumping');

// Step 2: Advance across 10 frames
for (let i = 0; i < 10; i++) animVehicle.update(0.033);
const p10 = animVehicle.doors.frontLeft.progress;
console.log(`  Frame 10 (350ms) progress: ${p10.toFixed(4)} (smoothly swinging out)`);
assert(p10 > p1 && p10 < 0.95, 'Door progress should continuously increase smoothly');

// Step 3: Advance to full open settling
for (let i = 0; i < 30; i++) animVehicle.update(0.033);
const pFull = animVehicle.doors.frontLeft.progress;
console.log(`  Settled open progress:    ${pFull.toFixed(4)} (fully open)`);
assert.strictEqual(pFull, 1.0, 'Door progress should settle cleanly to exactly 1.0');

// Step 4: Close the door and verify smooth closing animation
animVehicle.closeDoor('frontLeft');
animVehicle.update(0.016);
const pClose1 = animVehicle.doors.frontLeft.progress;
console.log(`  Closing Frame 1 progress: ${pClose1.toFixed(4)} (smoothly started closing)`);
assert(pClose1 < 1.0 && pClose1 > 0.80, 'Door should smoothly begin closing');

for (let i = 0; i < 35; i++) animVehicle.update(0.033);
const pClosed = animVehicle.doors.frontLeft.progress;
console.log(`  Settled closed progress:  ${pClosed.toFixed(4)} (fully closed)`);
assert.strictEqual(pClosed, 0.0, 'Door progress should settle cleanly to exactly 0.0');

console.log('  ✓ Smooth animation verification passed (no popping, continuous interpolation).');

// 6. Testing Supported vs Unsupported Vehicles
console.log('\n6. Testing Supported vs Unsupported Vehicles...');
const supportedSedan = new Vehicle(null, { type: 'nova_x' });
assert.strictEqual(supportedSedan.isDoorSupported('frontLeft'), true, 'Nova X supports front-left door');
assert.strictEqual(supportedSedan.isDoorSupported('frontRight'), true, 'Nova X supports front-right door');
assert.strictEqual(supportedSedan.isDoorSupported('rearLeft'), true, 'Nova X supports rear-left door');
assert.strictEqual(supportedSedan.isDoorSupported('rearRight'), true, 'Nova X supports rear-right door');

const formulaCar = new Vehicle(null, { type: 'formula_r' });
assert.strictEqual(formulaCar.isDoorSupported('frontLeft'), false, 'Formula R monoposto has no doors');
assert.strictEqual(formulaCar.openDoor('frontLeft'), false, 'openDoor on Formula R should return false');
assert.strictEqual(formulaCar.doors.frontLeft.isOpen, false);

console.log('  ✓ Vehicle door support validation verified.');

// 7. Testing VehicleController Integration & Audio Feedback
console.log('\n7. Testing VehicleController Integration & Audio...');
const audio = new AudioManager();
let doorOpenSoundPlayed = false;
let doorCloseSoundPlayed = false;

audio.playDoorOpen = () => { doorOpenSoundPlayed = true; };
audio.playDoorClose = () => { doorCloseSoundPlayed = true; };

const input = new InputManager();
const testVeh = new Vehicle(null, { type: 'nova_x' });
const controller = new VehicleController(testVeh, null, audio, input);

controller.openDoor('frontLeft');
assert.strictEqual(doorOpenSoundPlayed, true, 'Opening door should trigger playDoorOpen sound');
assert.strictEqual(testVeh.doors.frontLeft.isOpen, true);

controller.closeDoor('frontLeft');
assert.strictEqual(doorCloseSoundPlayed, true, 'Closing door should trigger playDoorClose sound');
assert.strictEqual(testVeh.doors.frontLeft.isOpen, false);

// Check Telemetry
const telemetry = controller.getTelemetry();
assert(telemetry.doorStates !== undefined, 'Telemetry should have doorStates');
assert.strictEqual(telemetry.doorStates.frontLeft.isOpen, false);
assert.strictEqual(telemetry.doors, false, 'Telemetry doors boolean should be false when all closed');

controller.openDoor('rearRight');
const telemetryOpen = controller.getTelemetry();
assert.strictEqual(telemetryOpen.doorStates.rearRight.isOpen, true);
assert.strictEqual(telemetryOpen.doors, true, 'Telemetry doors boolean should be true when RR open');

console.log('  ✓ VehicleController actions, telemetry, and audio feedback verified.');

console.log('\n=== ALL DOOR SYSTEM TESTS PASSED PERFECTLY! ===');
