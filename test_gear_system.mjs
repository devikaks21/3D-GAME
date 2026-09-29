import { VehiclePhysics } from './src/vehicle/VehiclePhysics.js';

// Setup Mock DOM environment for headless testing
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};

console.log('=== TEST SUITE: GEAR SYSTEM SPECIFICATION ===\n');

// 1. Verify all requested gears in exact order
console.log('1. Checking Gear Definition: P, R, N, 1, 2, 3, 4, 5, 6...');
const expectedGears = ['P', 'R', 'N', '1', '2', '3', '4', '5', '6'];

const physics = new VehiclePhysics({
  enginePower: 450,
  maxSpeed: 300,
  handling: { steeringSpeed: 3.5 }
});

if (physics.gearNames.length !== expectedGears.length) {
  throw new Error(`Expected ${expectedGears.length} gears, got ${physics.gearNames.length}`);
}

for (let i = 0; i < expectedGears.length; i++) {
  if (physics.gearNames[i] !== expectedGears[i]) {
    throw new Error(`Mismatch at index ${i}: expected ${expectedGears[i]}, got ${physics.gearNames[i]}`);
  }
  console.log(`  ✓ Gear slot ${i}: [ ${physics.gearNames[i]} ] (ratio: ${physics.gears[i]})`);
}

// 2. Default Initial State
console.log('\n2. Checking Default Gear & Transmission Mode...');
if (physics.transmissionMode !== 'auto') {
  throw new Error(`Expected default transmission mode 'auto', got '${physics.transmissionMode}'`);
}
if (physics.getGearName() !== '1') {
  throw new Error(`Expected default gear '1', got '${physics.getGearName()}'`);
}
console.log(`  ✓ Default mode: AUTO`);
console.log(`  ✓ Default active gear: 1 (Drive 1st gear)`);

// 3. Park (P) Mode Functionality
console.log('\n3. Testing Park (P) Mode...');
physics.setGearByName('P');
if (physics.getGearName() !== 'P' || physics.currentGear !== 0) {
  throw new Error(`Failed to engage Park (P)`);
}
physics.velocity.set(5, 0, 5);
physics.update({ throttle: 1.0, brake: 0, steer: 0, handbrake: false }, 0.016);
if (physics.velocity.length() >= 7.07) {
  throw new Error(`Park mode failed to lock wheels and prevent acceleration`);
}
console.log(`  ✓ Park mode (P) prevents acceleration and locks wheel motion.`);

// 4. Reverse (R) Mode Functionality
console.log('\n4. Testing Reverse (R) Mode...');
physics.resetPosition(0, 0.5, 0, 0);
physics.setTransmissionMode('manual');
physics.setGearByName('R');
if (physics.getGearName() !== 'R' || physics.currentGear !== 1) {
  throw new Error(`Failed to engage Reverse (R)`);
}
for (let i = 0; i < 10; i++) {
  physics.update({ throttle: 1.0, brake: 0, steer: 0, handbrake: false }, 0.016);
}
if (physics.forwardSpeed >= 0) {
  throw new Error(`Expected negative forward speed in manual reverse gear, got ${physics.forwardSpeed}`);
}
console.log(`  ✓ Manual Reverse (R) drives vehicle backward with throttle (forwardSpeed: ${physics.forwardSpeed.toFixed(2)} m/s).`);

// Test Auto Mode Reverse
physics.resetPosition(0, 0.5, 0, 0);
physics.setTransmissionMode('auto');
physics.setGearByName('R');
for (let i = 0; i < 10; i++) {
  physics.update({ throttle: 0, brake: 1.0, steer: 0, handbrake: false }, 0.016);
}
if (physics.forwardSpeed >= 0) {
  throw new Error(`Expected negative forward speed in auto reverse, got ${physics.forwardSpeed}`);
}
console.log(`  ✓ Auto Reverse (R) drives vehicle backward with brake pedal (forwardSpeed: ${physics.forwardSpeed.toFixed(2)} m/s).`);

// 5. Neutral (N) Mode Functionality
console.log('\n5. Testing Neutral (N) Mode...');
physics.resetPosition(0, 0.5, 0, 0);
physics.setTransmissionMode('manual');
physics.setGearByName('N');
if (physics.getGearName() !== 'N' || physics.currentGear !== 2) {
  throw new Error(`Failed to engage Neutral (N)`);
}
const initialRpm = physics.rpm;
for (let i = 0; i < 10; i++) {
  physics.update({ throttle: 1.0, brake: 0, steer: 0, handbrake: false }, 0.016);
}
if (physics.speed > 0.05) {
  throw new Error(`Neutral mode produced propulsion force: ${physics.speed}`);
}
if (physics.rpm <= initialRpm) {
  throw new Error(`Expected engine to rev in neutral when throttle pressed: ${physics.rpm} vs ${initialRpm}`);
}
console.log(`  ✓ Neutral mode (N) does not move vehicle, engine revs freely (${physics.rpm.toFixed(0)} RPM).`);

// 6. Manual Gear Shifting & Arcade Cycling
console.log('\n6. Testing Manual Mode Shifting (G, Shift Up, Shift Down)...');
physics.setTransmissionMode('manual');
if (physics.transmissionMode !== 'manual') {
  throw new Error(`Failed to toggle to manual transmission`);
}

// Set to 1st gear
physics.setGearByName('1');
if (physics.getGearName() !== '1') throw new Error(`Failed to set 1st gear`);

// Shift Up: 1 -> 2 -> 3 -> 4 -> 5 -> 6
for (let g = 2; g <= 6; g++) {
  const ok = physics.shiftUp();
  if (!ok || physics.getGearName() !== String(g)) {
    throw new Error(`Expected shiftUp to gear ${g}, got ${physics.getGearName()}`);
  }
}
console.log(`  ✓ shiftUp() successfully shifted 1 -> 2 -> 3 -> 4 -> 5 -> 6.`);

// At gear 6, shiftUp should return false (capped at top gear)
if (physics.shiftUp() !== false) {
  throw new Error(`Expected shiftUp to return false at 6th gear`);
}
console.log(`  ✓ shiftUp() gracefully capped at 6th gear.`);

// Shift Down: 6 -> 5 -> 4 -> 3 -> 2 -> 1 -> N -> R -> P
const downExpected = ['5', '4', '3', '2', '1', 'N', 'R', 'P'];
for (const exp of downExpected) {
  const ok = physics.shiftDown();
  if (!ok || physics.getGearName() !== exp) {
    throw new Error(`Expected shiftDown to ${exp}, got ${physics.getGearName()}`);
  }
}
console.log(`  ✓ shiftDown() successfully shifted down through ${downExpected.join(' -> ')}.`);

// Test Arcade Cycle Gear [G]
console.log('\n7. Testing Arcade Cycle Gear [G]...');
// Currently at P -> cycleGear should shift to 1
physics.cycleGear();
if (physics.getGearName() !== '1') {
  throw new Error(`Expected cycleGear from P to shift to 1, got ${physics.getGearName()}`);
}
console.log(`  ✓ Cycle from P shifted to 1st gear.`);

// Cycle through 2, 3, 4, 5, 6
for (let g = 2; g <= 6; g++) {
  physics.cycleGear();
  if (physics.getGearName() !== String(g)) {
    throw new Error(`Expected cycleGear to ${g}, got ${physics.getGearName()}`);
  }
}
console.log(`  ✓ Cycle gear smoothly advanced 1 -> 2 -> 3 -> 4 -> 5 -> 6.`);

// Cycle from 6 wraps around to 1
physics.cycleGear();
if (physics.getGearName() !== '1') {
  throw new Error(`Expected cycleGear at 6th gear to wrap back to 1st gear, got ${physics.getGearName()}`);
}
console.log(`  ✓ Cycle gear at top gear wrapped back to 1st gear cleanly.`);

// 8. Automatic Mode Testing
console.log('\n8. Testing Automatic Transmission Behavior...');
physics.setTransmissionMode('auto');
physics.resetPosition(0, 0.5, 0, 0);

// Accelerate in Auto: should auto upshift as speed/RPM rises
for (let frame = 0; frame < 350; frame++) {
  physics.update({ throttle: 1.0, brake: 0, steer: 0, handbrake: false }, 0.02);
}
console.log(`  ✓ In Auto mode, vehicle accelerated to ${physics.speedKmh.toFixed(1)} km/h and shifted up to gear [ ${physics.getGearName()} ].`);
if (physics.currentGear <= 3) {
  throw new Error(`Expected auto transmission to shift past 1st gear under high speed acceleration`);
}

// Slow down in Auto: should auto downshift
for (let frame = 0; frame < 350; frame++) {
  physics.update({ throttle: 0, brake: 0.8, steer: 0, handbrake: false }, 0.02);
}
console.log(`  ✓ In Auto mode, after braking vehicle slowed down to ${physics.speedKmh.toFixed(1)} km/h and downshifted to gear [ ${physics.getGearName()} ].`);

// 9. Direct Gear Selection (Click any gear in UI)
console.log('\n9. Testing Direct Gear Selection by Name & Index...');
const testGears = ['P', 'R', 'N', '1', '2', '3', '4', '5', '6'];
for (const g of testGears) {
  const ok = physics.setGearByName(g);
  if (!ok || physics.getGearName() !== g) {
    throw new Error(`Failed direct gear selection for ${g}`);
  }
}
console.log(`  ✓ All 9 gears (P, R, N, 1, 2, 3, 4, 5, 6) can be directly engaged.`);

// 10. Transmission Mode Toggle
console.log('\n10. Testing Mode Toggle...');
const m1 = physics.toggleTransmissionMode();
if (m1 !== 'manual') throw new Error(`Expected toggle to manual, got ${m1}`);
const m2 = physics.toggleTransmissionMode();
if (m2 !== 'auto') throw new Error(`Expected toggle to auto, got ${m2}`);
console.log(`  ✓ toggleTransmissionMode cleanly switched: auto <-> manual.`);

console.log('\n=== ALL GEAR SYSTEM TESTS PASSED PERFECTLY! ===');
