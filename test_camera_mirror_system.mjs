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
const { CameraManager, CameraModes } = await import('./src/camera/CameraManager.js');
const { MirrorSystem } = await import('./src/camera/MirrorSystem.js');
const { InputManager } = await import('./src/core/InputManager.js');
const { AudioManager } = await import('./src/core/AudioManager.js');
import * as THREE from 'three';

console.log('=== TEST SUITE: CAMERA SYSTEM & MIRROR SYSTEM SPECIFICATION ===\n');

// ==========================================
// 1. CAMERA SYSTEM: 5 DISTINCT CAMERA MODES
// ==========================================
console.log('1. Testing 5 Camera Modes Initialization & Index Mapping...');

const mockCamera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 1000);
const input = new InputManager();
const camManager = new CameraManager(mockCamera, null, input);

// Mode 1: Third-person chase camera
camManager.setCameraByIndex(1);
assert.strictEqual(camManager.mode, CameraModes.CHASE, 'Camera 1 should be Third-Person Chase');
assert.strictEqual(camManager.getCameraIndex(), 1, 'getCameraIndex() should return 1');
assert(camManager.getCameraModeName().includes('CHASE'), 'Camera name should contain CHASE');
console.log('  ✓ Camera 1 verified: Third-person chase camera');

// Mode 2: Closer third-person camera
camManager.setCameraByIndex(2);
assert.strictEqual(camManager.mode, CameraModes.CLOSE_CHASE, 'Camera 2 should be Closer Third-Person Chase');
assert.strictEqual(camManager.getCameraIndex(), 2, 'getCameraIndex() should return 2');
assert(camManager.getCameraModeName().includes('CLOSE'), 'Camera name should contain CLOSE');
console.log('  ✓ Camera 2 verified: Closer third-person camera');

// Mode 3: Cockpit/interior camera
camManager.setCameraByIndex(3);
assert.strictEqual(camManager.mode, CameraModes.COCKPIT, 'Camera 3 should be Cockpit/Interior');
assert.strictEqual(camManager.getCameraIndex(), 3, 'getCameraIndex() should return 3');
assert(camManager.getCameraModeName().includes('COCKPIT'), 'Camera name should contain COCKPIT');
console.log('  ✓ Camera 3 verified: Cockpit/interior camera');

// Mode 4: Rear camera
camManager.setCameraByIndex(4);
assert.strictEqual(camManager.mode, CameraModes.REAR, 'Camera 4 should be Rear Camera');
assert.strictEqual(camManager.getCameraIndex(), 4, 'getCameraIndex() should return 4');
assert(camManager.getCameraModeName().includes('REAR'), 'Camera name should contain REAR');
console.log('  ✓ Camera 4 verified: Rear camera');

// Mode 5: Free/inspection camera
camManager.setCameraByIndex(5);
assert.strictEqual(camManager.mode, CameraModes.FREE, 'Camera 5 should be Free/Inspection');
assert.strictEqual(camManager.getCameraIndex(), 5, 'getCameraIndex() should return 5');
assert(camManager.getCameraModeName().includes('FREE'), 'Camera name should contain FREE');
console.log('  ✓ Camera 5 verified: Free/inspection camera\n');

// ==========================================
// 2. CAMERA SYSTEM: CYCLING & SMOOTH SWITCHING
// ==========================================
console.log('2. Testing Camera Mode Cycling & Smooth Switching Transition...');

// Test sequential cycling
camManager.setCameraByIndex(1);
assert.strictEqual(camManager.getCameraIndex(), 1);

const cycle1 = camManager.cycleCamera();
assert.strictEqual(cycle1, CameraModes.CLOSE_CHASE, 'Cycling from 1 should yield Camera 2');
assert.strictEqual(camManager.getCameraIndex(), 2);

const cycle2 = camManager.cycleCamera();
assert.strictEqual(cycle2, CameraModes.COCKPIT, 'Cycling from 2 should yield Camera 3');
assert.strictEqual(camManager.getCameraIndex(), 3);

const cycle3 = camManager.cycleCamera();
assert.strictEqual(cycle3, CameraModes.REAR, 'Cycling from 3 should yield Camera 4');
assert.strictEqual(camManager.getCameraIndex(), 4);

const cycle4 = camManager.cycleCamera();
assert.strictEqual(cycle4, CameraModes.FREE, 'Cycling from 4 should yield Camera 5');
assert.strictEqual(camManager.getCameraIndex(), 5);

const cycle5 = camManager.cycleCamera();
assert.strictEqual(cycle5, CameraModes.CHASE, 'Cycling from 5 should loop back to Camera 1');
assert.strictEqual(camManager.getCameraIndex(), 1);

console.log('  ✓ Sequential cycleCamera() correctly loops 1 -> 2 -> 3 -> 4 -> 5 -> 1');

// Test Smooth Switching Physics & Interpolation
console.log('  Testing smooth camera transition interpolation...');
const testCar = new Vehicle(null, { type: 'nova_x' });
const mockPhysics = {
  position: new THREE.Vector3(10, 0.4, 20),
  heading: 0.5,
  speedKmh: 65,
  vehicle: testCar
};

// Initial camera update on Camera 1 (Chase)
camManager.setCameraByIndex(1);
for (let i = 0; i < 30; i++) camManager.update(mockPhysics, 0.016, testCar);
const initialCamPos = camManager.camera.position.clone();

// Switch to Camera 3 (Cockpit)
camManager.setCameraByIndex(3);
assert.strictEqual(camManager.isTransitioning, true, 'isTransitioning should be true upon mode change');

// Update single frame (16ms)
camManager.update(mockPhysics, 0.016, testCar);
const midTransitionPos = camManager.camera.position.clone();

// Ensure position did NOT abruptly teleport directly to destination
assert.notDeepStrictEqual(midTransitionPos, initialCamPos, 'Camera position should begin moving');
const distanceMoved = midTransitionPos.distanceTo(initialCamPos);
assert(distanceMoved < 2.0, `Camera should move smoothly, not jump instantaneously (moved: ${distanceMoved.toFixed(3)}m)`);

// Complete transition frames
for (let i = 0; i < 40; i++) {
  camManager.update(mockPhysics, 0.016, testCar);
}
assert.strictEqual(camManager.isTransitioning, false, 'isTransitioning should complete cleanly');
console.log('  ✓ Camera switching is continuous and smooth without jarring snaps.\n');

// ==========================================
// 3. INPUT MANAGER DIRECT NUMBER KEYS & SHORTCUTS
// ==========================================
console.log('3. Testing Keybindings for Camera Switching...');
let lastActionTriggered = null;
input.onAction('camera1', () => { lastActionTriggered = 'camera1'; });
input.onAction('camera2', () => { lastActionTriggered = 'camera2'; });
input.onAction('camera3', () => { lastActionTriggered = 'camera3'; });
input.onAction('camera4', () => { lastActionTriggered = 'camera4'; });
input.onAction('camera5', () => { lastActionTriggered = 'camera5'; });

input.handleKeyDownAction('Digit1');
assert.strictEqual(lastActionTriggered, 'camera1', 'Digit1 should trigger camera1');

input.handleKeyDownAction('Digit2');
assert.strictEqual(lastActionTriggered, 'camera2', 'Digit2 should trigger camera2');

input.handleKeyDownAction('Digit3');
assert.strictEqual(lastActionTriggered, 'camera3', 'Digit3 should trigger camera3');

input.handleKeyDownAction('Digit4');
assert.strictEqual(lastActionTriggered, 'camera4', 'Digit4 should trigger camera4');

input.handleKeyDownAction('Digit5');
assert.strictEqual(lastActionTriggered, 'camera5', 'Digit5 should trigger camera5');

console.log('  ✓ Digit1..Digit5 input actions verified.\n');

// ==========================================
// 4. MIRROR SYSTEM: SUPPORTED VEHICLES (3 MIRRORS)
// ==========================================
console.log('4. Testing Mirror System on Supported Vehicle (Nova X)...');
const sedan = new Vehicle(null, { type: 'nova_x' });

assert(sedan.mirrors !== null, 'sedan.mirrors should exist');
assert(sedan.mirrors.left !== undefined, 'Left side mirror must exist');
assert(sedan.mirrors.right !== undefined, 'Right side mirror must exist');
assert(sedan.mirrors.rearView !== undefined, 'Rear-view mirror must exist');

assert.strictEqual(sedan.isMirrorSupported('left'), true, 'Left side mirror should be supported');
assert.strictEqual(sedan.isMirrorSupported('right'), true, 'Right side mirror should be supported');
assert.strictEqual(sedan.isMirrorSupported('rearView'), true, 'Rear-view mirror should be supported');
assert.strictEqual(sedan.isMirrorSupported('all'), true, 'All mirrors supported flag should be true');

// Verify meshes exist
assert(sedan.mirrors.left.housing !== null, 'Left mirror housing mesh must exist');
assert(sedan.mirrors.left.glass !== null, 'Left mirror glass mesh must exist');
assert(sedan.mirrors.right.housing !== null, 'Right mirror housing mesh must exist');
assert(sedan.mirrors.right.glass !== null, 'Right mirror glass mesh must exist');
assert(sedan.mirrors.rearView.housing !== null, 'Rear-view mirror housing mesh must exist');
assert(sedan.mirrors.rearView.glass !== null, 'Rear-view mirror glass mesh must exist');

console.log('  ✓ Left side mirror, Right side mirror, and Rear-view mirror verified on Sedan.');

// ==========================================
// 5. MIRROR SYSTEM: FORMULA 1 VEHICLE
// ==========================================
console.log('\n5. Testing Mirror System on Formula 1 (Formula R)...');
const formula = new Vehicle(null, { type: 'formula_r' });

assert.strictEqual(formula.isMirrorSupported('left'), true, 'Formula R supports left wing mirror');
assert.strictEqual(formula.isMirrorSupported('right'), true, 'Formula R supports right wing mirror');
assert.strictEqual(formula.isMirrorSupported('rearView'), false, 'Formula R monoposto does NOT have center windshield mirror');

console.log('  ✓ Formula R mirror configuration correctly verified (wing mirrors supported, center mirror omitted).');

// ==========================================
// 6. MIRROR SYSTEM: SIMPLIFIED RENDER TEXTURE & PERFORMANCE
// ==========================================
console.log('\n6. Testing MirrorSystem Performance & Material Assignment...');
const mockScene = new THREE.Scene();
const mirrorSystem = new MirrorSystem(null, mockScene);

assert(mirrorSystem.material !== null, 'mirrorSystem should provide reflective mirror material');
assert.strictEqual(mirrorSystem.width, 256, 'Render texture width should be compact (256px) for performance');
assert.strictEqual(mirrorSystem.height, 128, 'Render texture height should be compact (128px) for performance');
assert.strictEqual(mirrorSystem.updateInterval, 2, 'Update interval should be throttled (every 2 frames) for performance');

// Attach to vehicle
mirrorSystem.attachToVehicle(sedan);
assert.strictEqual(sedan.mirrors.left.glass.material, mirrorSystem.getMaterial(), 'Left mirror glass should receive mirror material');
assert.strictEqual(sedan.mirrors.right.glass.material, mirrorSystem.getMaterial(), 'Right mirror glass should receive mirror material');
assert.strictEqual(sedan.mirrors.rearView.glass.material, mirrorSystem.getMaterial(), 'Rear-view mirror glass should receive mirror material');

// Run update safely without crashing
mirrorSystem.update(sedan, 0.016);
mirrorSystem.update(sedan, 0.016);
console.log('  ✓ MirrorSystem low-overhead render texture technique and material binding verified.');

// ==========================================
// 7. VEHICLE CONTROLLER TELEMETRY INTEGRATION
// ==========================================
console.log('\n7. Testing VehicleController Telemetry Integration...');
const audio = new AudioManager();
const controller = new VehicleController(sedan, null, audio, input);

const telem = controller.getTelemetry();
assert(telem.mirrors !== undefined, 'Telemetry should include mirrors state');
assert.strictEqual(telem.mirrors.left, true);
assert.strictEqual(telem.mirrors.right, true);
assert.strictEqual(telem.mirrors.rearView, true);
assert.strictEqual(controller.isMirrorSupported('left'), true);
assert.strictEqual(controller.isMirrorSupported('rearView'), true);

const formCtrl = new VehicleController(formula, null, audio, input);
assert.strictEqual(formCtrl.isMirrorSupported('rearView'), false);

console.log('  ✓ VehicleController telemetry and mirror query methods verified.\n');

console.log('🎉 ALL CAMERA AND MIRROR SYSTEM TESTS PASSED PERFECTLY WITH ZERO ERRORS!');
