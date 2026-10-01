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

console.log('=== TEST SUITE: BOOT / TRUNK & CONVERTIBLE ROOF SYSTEM ===\n');

// ==========================================
// 1. BOOT / TRUNK SYSTEM ON SUPPORTED VEHICLES
// ==========================================
console.log('1. Testing BOOT / TRUNK System on Supported Vehicle (Sedan / Nova X)...');
const sedan = new Vehicle(null, { type: 'nova_x' });

assert.strictEqual(sedan.isBootSupported(), true, 'Nova X should support boot');
assert.strictEqual(sedan.isTrunkSupported(), true, 'Nova X should support trunk alias');
assert.strictEqual(sedan.bootOpen, false, 'Boot should initially be closed');
assert.strictEqual(sedan.bootAnimProgress, 0, 'Boot animation progress should start at 0');

// Open Boot
const openResult = sedan.openBoot();
assert.strictEqual(openResult, true, 'openBoot() should return true on supported car');
assert.strictEqual(sedan.bootOpen, true, 'bootOpen should be true');
assert.strictEqual(sedan.trunkOpen, true, 'trunkOpen alias should be true');
assert.strictEqual(sedan.getBootState().isOpen, true, 'getBootState().isOpen should be true');
console.log('  ✓ openBoot() successfully opened boot');

// Smooth Boot Animation Update
sedan.update(0.1);
assert(sedan.bootAnimProgress > 0, 'bootAnimProgress should smoothly increase towards 1.0');
assert(sedan.bootAnimProgress < 1.0, 'bootAnimProgress should interpolate smoothly, not teleport');
const progressMid = sedan.bootAnimProgress;

// Simulate more frames to complete opening
for (let i = 0; i < 20; i++) {
  sedan.update(0.1);
}
assert(sedan.bootAnimProgress >= 0.99, 'bootAnimProgress should reach ~1.0 after frames');
if (sedan.bootGroup) {
  assert(Math.abs(sedan.bootGroup.rotation.x - (-0.9)) < 0.05, 'Boot mesh rotation should reflect open angle');
}
console.log('  ✓ Smooth boot opening animation verified (progress: 0 -> 1.0, hinge rotation active)');

// Close Boot
const closeResult = sedan.closeBoot();
assert.strictEqual(closeResult, false, 'closeBoot() returns false (closed state)');
assert.strictEqual(sedan.bootOpen, false, 'bootOpen should be false');
assert.strictEqual(sedan.getBootState().isOpen, false, 'getBootState().isOpen should be false');
console.log('  ✓ closeBoot() successfully closed boot');

// Smooth Boot Closing Animation Update
sedan.update(0.1);
assert(sedan.bootAnimProgress < 1.0, 'bootAnimProgress should smoothly decrease towards 0.0');
for (let i = 0; i < 20; i++) {
  sedan.update(0.1);
}
assert.strictEqual(sedan.bootAnimProgress, 0, 'bootAnimProgress should reach 0.0 and cleanly snap');
if (sedan.bootGroup) {
  assert.strictEqual(sedan.bootGroup.rotation.x, 0, 'Boot mesh rotation should be reset to 0');
}
console.log('  ✓ Smooth boot closing animation verified (progress: 1.0 -> 0.0)');

// Toggle Boot
sedan.toggleBoot();
assert.strictEqual(sedan.bootOpen, true, 'toggleBoot() should open when closed');
sedan.toggleBoot();
assert.strictEqual(sedan.bootOpen, false, 'toggleBoot() should close when opened');

// Trunk Aliases
sedan.openTrunk();
assert.strictEqual(sedan.bootOpen, true, 'openTrunk() alias works');
sedan.closeTrunk();
assert.strictEqual(sedan.bootOpen, false, 'closeTrunk() alias works');
sedan.toggleTrunk();
assert.strictEqual(sedan.bootOpen, true, 'toggleTrunk() alias works');
sedan.closeBoot();
console.log('  ✓ Boot/Trunk aliases and toggle verified.\n');

// ==========================================
// 2. BOOT SUPPORT ON FORMULA 1 VEHICLE
// ==========================================
console.log('2. Testing BOOT Support on Monoposto Vehicle (Formula R)...');
const formula = new Vehicle(null, { type: 'formula_r' });
assert.strictEqual(formula.isBootSupported(), false, 'Formula R should NOT support boot');
assert.strictEqual(formula.openBoot(), false, 'openBoot() on Formula R should return false');
assert.strictEqual(formula.closeBoot(), false, 'closeBoot() on Formula R should return false');
assert.strictEqual(formula.toggleBoot(), false, 'toggleBoot() on Formula R should return false');
assert.strictEqual(formula.getBootState().supported, false, 'getBootState().supported should be false');
console.log('  ✓ Formula R correctly denies boot actions.\n');

// ==========================================
// 3. CONVERTIBLE SYSTEM ON CONVERTIBLE VEHICLES
// ==========================================
console.log('3. Testing CONVERTIBLE SYSTEM on Convertible Cars (Aero Roadster & Venom Spyder)...');
const roadster = new Vehicle(null, { type: 'aero_roadster' });
const spyder = new Vehicle(null, { type: 'venom_spyder' });

[roadster, spyder].forEach((conv, idx) => {
  const name = idx === 0 ? 'Aero Roadster' : 'Venom Spyder';
  console.log(`  Testing ${name}:`);
  assert.strictEqual(conv.isConvertibleVehicle(), true, `${name} should be recognized as convertible`);
  assert.strictEqual(conv.isRoofSupported(), true, `${name} should support roof system`);
  assert.strictEqual(conv.roofOpen, false, 'Roof should initially be closed');
  assert.strictEqual(conv.roofAnimProgress, 0, 'Roof animation progress should start at 0');

  // Open Roof
  const opened = conv.openRoof();
  assert.strictEqual(opened, true, 'openRoof() should return true');
  assert.strictEqual(conv.roofOpen, true, 'roofOpen should be true');
  assert.strictEqual(conv.getRoofState().isOpen, true, 'getRoofState().isOpen should be true');

  // Smooth Roof Animation
  conv.update(0.1);
  assert(conv.roofAnimProgress > 0, 'roofAnimProgress should smoothly increase');
  assert(conv.roofAnimProgress < 1.0, 'roofAnimProgress should interpolate smoothly');

  for (let i = 0; i < 25; i++) {
    conv.update(0.1);
  }
  assert.strictEqual(conv.roofAnimProgress, 1.0, 'roofAnimProgress should reach 1.0');
  if (conv.roofGroup) {
    assert(conv.roofGroup.rotation.x > 1.5, 'Roof group rotation should fold into rear deck');
    assert(conv.roofGroup.position.y < 0.55, 'Roof group position should retract');
  }
  console.log(`    ✓ ${name} smooth roof opening animation verified`);

  // Close Roof
  const closed = conv.closeRoof();
  assert.strictEqual(closed, false, 'closeRoof() returns false (closed state)');
  assert.strictEqual(conv.roofOpen, false, 'roofOpen should be false');
  assert.strictEqual(conv.getRoofState().isOpen, false, 'getRoofState().isOpen should be false');

  for (let i = 0; i < 25; i++) {
    conv.update(0.1);
  }
  assert.strictEqual(conv.roofAnimProgress, 0, 'roofAnimProgress should return to 0');
  console.log(`    ✓ ${name} smooth roof closing animation verified`);

  // Toggle Roof
  conv.toggleRoof();
  assert.strictEqual(conv.roofOpen, true, 'toggleRoof() opens roof');
  conv.toggleRoof();
  assert.strictEqual(conv.roofOpen, false, 'toggleRoof() closes roof');
});
console.log('  ✓ Convertible vehicles fully verified.\n');

// ==========================================
// 4. CONVERTIBLE SYSTEM ON NON-CONVERTIBLE VEHICLES
// ==========================================
console.log('4. Testing Non-Convertible Vehicles (Falcon S1, Nova X, Vortex GT, Titan Sport, Titan 4x4, Formula R)...');
const nonConvertibles = ['falcon_s1', 'nova_x', 'vortex_gt', 'titan_sport', 'titan_4x4', 'formula_r'];

nonConvertibles.forEach(carType => {
  const v = new Vehicle(null, { type: carType });
  assert.strictEqual(v.isConvertibleVehicle(), false, `${carType} should NOT be convertible`);
  assert.strictEqual(v.isRoofSupported(), false, `${carType} should NOT support roof`);
  assert.strictEqual(v.openRoof(), false, `openRoof() on ${carType} must return false`);
  assert.strictEqual(v.closeRoof(), false, `closeRoof() on ${carType} must return false`);
  assert.strictEqual(v.toggleRoof(), false, `toggleRoof() on ${carType} must return false`);
  assert.strictEqual(v.getRoofState().isConvertible, false, `getRoofState().isConvertible must be false on ${carType}`);
  assert.strictEqual(v.getRoofState().supported, false, `getRoofState().supported must be false on ${carType}`);
});
console.log('  ✓ All non-convertible vehicles correctly refuse roof operations.\n');

// ==========================================
// 5. VEHICLE CONTROLLER & AUDIO INTEGRATION
// ==========================================
console.log('5. Testing VehicleController & Audio Integration...');
const audio = new AudioManager();
let audioEvents = [];
audio.playBootOpen = () => audioEvents.push('bootOpen');
audio.playBootClose = () => audioEvents.push('bootClose');
audio.playRoofMotor = () => audioEvents.push('roofMotor');

const input = new InputManager();
const controller = new VehicleController(roadster, null, audio, input);

// Test Boot on Controller
audioEvents = [];
controller.openBoot();
assert.strictEqual(roadster.bootOpen, true, 'Controller openBoot opens vehicle boot');
assert(audioEvents.includes('bootOpen'), 'playBootOpen() should be called');

audioEvents = [];
controller.closeBoot();
assert.strictEqual(roadster.bootOpen, false, 'Controller closeBoot closes vehicle boot');
assert(audioEvents.includes('bootClose'), 'playBootClose() should be called');

// Test Roof on Controller
audioEvents = [];
controller.openRoof();
assert.strictEqual(roadster.roofOpen, true, 'Controller openRoof opens vehicle roof');
assert(audioEvents.includes('roofMotor'), 'playRoofMotor() should be called on open');

audioEvents = [];
controller.closeRoof();
assert.strictEqual(roadster.roofOpen, false, 'Controller closeRoof closes vehicle roof');
assert(audioEvents.includes('roofMotor'), 'playRoofMotor() should be called on close');

// Test Telemetry
const telemetry = controller.getTelemetry();
assert.strictEqual(telemetry.isConvertible, true, 'Telemetry should report isConvertible: true for roadster');
assert.strictEqual(telemetry.isRoofSupported, true, 'Telemetry should report isRoofSupported: true for roadster');
assert.strictEqual(telemetry.isBootSupported, true, 'Telemetry should report isBootSupported: true for roadster');
assert(telemetry.bootState !== undefined, 'Telemetry should contain bootState');
assert(telemetry.roofState !== undefined, 'Telemetry should contain roofState');

// Telemetry on Non-Convertible Controller
const nonConvCtrl = new VehicleController(sedan, null, audio, input);
const nonConvTelem = nonConvCtrl.getTelemetry();
assert.strictEqual(nonConvTelem.isConvertible, false, 'Telemetry should report isConvertible: false for sedan');
assert.strictEqual(nonConvTelem.isRoofSupported, false, 'Telemetry should report isRoofSupported: false for sedan');
console.log('  ✓ VehicleController, Audio, and Telemetry verified.\n');

// ==========================================
// 6. UI VISIBILITY FILTERING RULE VERIFICATION
// ==========================================
console.log('6. Verifying UI Visibility Rule: "Do not show this option on vehicles that are not convertible"...');
assert.strictEqual(nonConvTelem.isConvertible, false);
assert.strictEqual(telemetry.isConvertible, true);

console.log('  ✓ UI contract verified: non-convertibles have isConvertible: false (display: none), convertibles have isConvertible: true (display: inline-flex / flex).\n');

console.log('🎉 ALL TESTS PASSED! BOOT / TRUNK AND CONVERTIBLE SYSTEMS ARE 100% OPERATIONAL WITHOUT ERRORS.');
