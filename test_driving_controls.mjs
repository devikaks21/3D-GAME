import { InputManager, DEFAULT_KEY_BINDINGS, formatKeyCode } from './src/core/InputManager.js';
import { VehiclePhysics } from './src/vehicle/VehiclePhysics.js';

// Setup Mock DOM environment for headless testing
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

console.log('=== TEST SUITE: DRIVING CONTROLS SPECIFICATION ===\n');

// 1. Verify all 16 requested controls in DEFAULT_KEY_BINDINGS
console.log('1. Checking all 16 requested desktop controls...');
const expectedControls = [
  { id: 'accelerate', label: 'Accelerate', primaryKey: 'KeyW', secondaryKey: 'ArrowUp' },
  { id: 'brake', label: 'Brake / Reverse', primaryKey: 'KeyS', secondaryKey: 'ArrowDown' },
  { id: 'steerLeft', label: 'Steer Left', primaryKey: 'KeyA', secondaryKey: 'ArrowLeft' },
  { id: 'steerRight', label: 'Steer Right', primaryKey: 'KeyD', secondaryKey: 'ArrowRight' },
  { id: 'handbrake', label: 'Handbrake', primaryKey: 'Space' },
  { id: 'sportMode', label: 'Sport Mode', primaryKey: 'ShiftLeft' },
  { id: 'resetVehicle', label: 'Reset Vehicle', primaryKey: 'KeyR' },
  { id: 'changeCamera', label: 'Change Camera', primaryKey: 'KeyC' },
  { id: 'gearControl', label: 'Gear Control', primaryKey: 'KeyG' },
  { id: 'lights', label: 'Lights', primaryKey: 'KeyL' },
  { id: 'leftIndicator', label: 'Left Indicator', primaryKey: 'KeyI' },
  { id: 'rightIndicator', label: 'Right Indicator', primaryKey: 'KeyK' },
  { id: 'wipers', label: 'Wipers (Clean alternative resolving W conflict)', primaryKey: 'KeyX' },
  { id: 'pause', label: 'Pause', primaryKey: 'KeyP' },
  { id: 'map', label: 'Map', primaryKey: 'KeyM' },
  { id: 'menu', label: 'Menu', primaryKey: 'Escape' }
];

for (const req of expectedControls) {
  const binding = DEFAULT_KEY_BINDINGS[req.id];
  if (!binding) {
    throw new Error(`Missing required binding in DEFAULT_KEY_BINDINGS: ${req.id}`);
  }
  if (!binding.keys.includes(req.primaryKey)) {
    throw new Error(`Expected primary key ${req.primaryKey} for ${req.id}, got: ${binding.keys}`);
  }
  if (req.secondaryKey && !binding.keys.includes(req.secondaryKey)) {
    throw new Error(`Expected secondary key ${req.secondaryKey} for ${req.id}, got: ${binding.keys}`);
  }
  console.log(`  ✓ ${binding.label.padEnd(20)} [${binding.keys.map(formatKeyCode).join(' / ')}]`);
}

// 2. Conflict Analysis
console.log('\n2. Verifying No Default Key Assignment Conflicts...');
const keyUsage = new Map();
for (const [actionId, def] of Object.entries(DEFAULT_KEY_BINDINGS)) {
  for (const k of def.keys) {
    if (keyUsage.has(k)) {
      throw new Error(`Conflicting key '${k}' detected between ${keyUsage.get(k)} and ${actionId}!`);
    }
    keyUsage.set(k, actionId);
  }
}
console.log(`  ✓ Checked ${keyUsage.size} unique key bindings across 16 actions without conflict.`);
console.log(`  ✓ Wipers clean alternative (KeyX) prevents conflict with Accelerate (KeyW).`);

// 3. Dynamic Rebinding & Conflict Resolution
console.log('\n3. Testing Dynamic Rebinding & Clean Conflict Resolution...');
const input = new InputManager();

// Rebind wipers to KeyU
input.rebind('wipers', 0, 'KeyU');
if (input.bindings.wipers.keys[0] !== 'KeyU') {
  throw new Error(`Failed to rebind wipers to KeyU`);
}
console.log('  ✓ Rebound wipers slot 0 to KeyU.');

// Now attempt to bind 'KeyW' (already used by accelerate) to 'wipers'
const conflictResult = input.rebind('wipers', 0, 'KeyW');
console.log('  ✓ Conflict detection triggered:', conflictResult);
if (!conflictResult || conflictResult.conflictedAction !== 'accelerate') {
  throw new Error(`Expected conflict detection with accelerate, got: ${JSON.stringify(conflictResult)}`);
}
if (input.bindings.accelerate.keys.includes('KeyW')) {
  throw new Error(`Expected KeyW to be cleanly unbound from accelerate`);
}
if (input.bindings.wipers.keys[0] !== 'KeyW') {
  throw new Error(`Expected wipers to now have KeyW`);
}
console.log('  ✓ Conflicting key was cleanly unbound from previous action and assigned.');

// Test Reset to Defaults
input.resetBindings();
if (input.bindings.accelerate.keys[0] !== 'KeyW' || input.bindings.wipers.keys[0] !== 'KeyX') {
  throw new Error(`Failed to restore factory defaults`);
}
console.log('  ✓ resetBindings() cleanly restored factory defaults.');

// 4. Persistence Test (localStorage)
console.log('\n4. Testing LocalStorage Persistence...');
input.rebind('lights', 0, 'KeyT');
const storedJson = global.localStorage.getItem('openroad3d_keybindings');
if (!storedJson || !storedJson.includes('KeyT')) {
  throw new Error(`Expected localStorage to persist KeyT for lights`);
}
console.log('  ✓ Keybindings successfully saved to localStorage.');

const input2 = new InputManager();
if (input2.bindings.lights.keys[0] !== 'KeyT') {
  throw new Error(`Failed to load persisted keybindings from localStorage`);
}
console.log('  ✓ New InputManager instance successfully loaded saved bindings from localStorage.');
input2.resetBindings(); // Clean up

// 5. Vehicle Physics: Sport Mode, Gear Control & Reset
console.log('\n5. Testing Vehicle Physics & Controller Features...');
const physics = new VehiclePhysics({
  enginePower: 400,
  maxSpeed: 280,
  handling: { steeringSpeed: 3.5 }
});

// Sport mode
if (physics.isSportMode !== false) throw new Error('Expected sport mode off by default');
physics.toggleSportMode();
if (physics.isSportMode !== true) throw new Error('Expected sport mode to toggle ON');
console.log('  ✓ Sport mode toggled ON.');

// Test throttle boost in sport mode
const inputsSport = { throttle: 1.0, brake: 0, steer: 0, handbrake: false };
for (let i = 0; i < 10; i++) {
  physics.update(inputsSport, 0.016);
}
const speed1 = physics.speed;

// Reset and run without sport mode
physics.resetPosition(0, 0.5, 0, 0);
physics.isSportMode = false;
for (let i = 0; i < 10; i++) {
  physics.update(inputsSport, 0.016);
}
const speedNormal = physics.speed;

if (speed1 <= speedNormal) {
  throw new Error(`Expected sport mode acceleration (${speed1}) to exceed standard (${speedNormal})`);
}
console.log(`  ✓ Sport mode provides enhanced throttle acceleration (${speed1.toFixed(4)} vs ${speedNormal.toFixed(4)}).`);

// Gear Control
const initialGear = physics.currentGear;
const newGear = physics.cycleGear();
if (newGear !== initialGear + 1) {
  throw new Error(`Expected cycleGear to shift to next gear`);
}
console.log(`  ✓ Gear Control shifted gear from ${initialGear} to ${newGear}.`);

// Reset Upright
physics.chassisPitch = 0.5;
physics.chassisRoll = -0.4;
physics.velocity.set(15, 2, 20);
physics.resetUpright();
if (physics.velocity.length() !== 0 || physics.chassisPitch !== 0 || physics.chassisRoll !== 0) {
  throw new Error('Expected resetUpright to zero velocity, pitch, and roll');
}
console.log('  ✓ resetUpright cleanly stabilized vehicle.');

console.log('\n=== ALL DRIVING CONTROLS TESTS PASSED PERFECTLY! ===');
