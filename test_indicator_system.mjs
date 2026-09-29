/**
 * test_indicator_system.mjs
 * Comprehensive automated verification of the Automotive Indicator System:
 * - LEFT INDICATOR
 * - RIGHT INDICATOR
 * - HAZARD
 * - OFF
 * - Realistic Blink Interval (SAE / ECE 88 flashes/min)
 * - Automatic Turn Cancellation & Hazard Immunity
 * - HUD & Input Integration
 */

import { Vehicle } from './src/vehicle/Vehicle.js';
import { VehiclePhysics } from './src/vehicle/VehiclePhysics.js';
import { VehicleController } from './src/vehicle/VehicleController.js';
import { InputManager } from './src/core/InputManager.js';
import { HUD } from './src/ui/HUD.js';

// Setup Mock DOM & Web Audio environment
globalThis.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: () => {},
  removeEventListener: () => {}
};

class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...names) { names.forEach(n => this.classes.add(n)); }
  remove(...names) { names.forEach(n => this.classes.delete(n)); }
  toggle(name, force) {
    if (force === undefined) {
      if (this.classes.has(name)) { this.classes.delete(name); return false; }
      else { this.classes.add(name); return true; }
    }
    if (force) this.classes.add(name);
    else this.classes.delete(name);
    return !!force;
  }
  contains(name) { return this.classes.has(name); }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.className = '';
    this.textContent = '';
    this._innerHTML = '';
    this.style = {};
    this.attributes = {};
    this.dataset = {};
    this.children = [];
    this.parentElement = null;
    this.classList = new MockClassList();
    this.listeners = {};
  }

  get innerHTML() { return this._innerHTML || ''; }
  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tagName = match[1];
      const attrStr = match[2];
      const el = new MockElement(tagName);

      const idMatch = /id=["']([^"']+)["']/i.exec(attrStr);
      if (idMatch) el.id = idMatch[1];

      const classMatch = /class=["']([^"']+)["']/i.exec(attrStr);
      if (classMatch) {
        el.className = classMatch[1];
        classMatch[1].split(/\s+/).forEach(c => c && el.classList.add(c));
      }

      this.appendChild(el);
    }
  }

  setAttribute(name, val) { this.attributes[name] = String(val); }
  getAttribute(name) { return this.attributes[name] || null; }
  removeAttribute(name) { delete this.attributes[name]; }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  click() {
    if (this.listeners['click']) {
      this.listeners['click'].forEach(fn => fn({ preventDefault: () => {}, stopPropagation: () => {} }));
    }
  }

  querySelector(sel) {
    return this._find(sel);
  }

  querySelectorAll(sel) {
    const results = [];
    this._findAll(sel, results);
    return results;
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }

  _find(sel) {
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      if (this.id === id) return this;
      for (const c of this.children) {
        const found = c._find(sel);
        if (found) return found;
      }
    } else if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (this.className.includes(cls) || this.classList.contains(cls)) return this;
      for (const c of this.children) {
        const found = c._find(sel);
        if (found) return found;
      }
    }
    return null;
  }

  _findAll(sel, results) {
    if (sel.startsWith('#')) {
      if (this.id === sel.slice(1)) results.push(this);
    } else if (sel.startsWith('.')) {
      if (this.className.includes(sel.slice(1)) || this.classList.contains(sel.slice(1))) results.push(this);
    }
    for (const c of this.children) {
      c._findAll(sel, results);
    }
  }
}

globalThis.document = {
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => null,
  body: new MockElement('BODY'),
  head: new MockElement('HEAD')
};

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: () => {} },
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
}
globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

console.log('=== TEST SUITE: AUTOMOTIVE INDICATOR SYSTEM ===\n');

// 1. Initial State Verification
console.log('1. Testing Initial Indicator States...');
const vehicle = new Vehicle({ type: 'apex_gt' });
if (vehicle.leftIndicatorOn !== false || vehicle.rightIndicatorOn !== false || vehicle.hazardOn !== false) {
  throw new Error('Indicators should be OFF by default');
}
const initialInd = vehicle.getIndicators();
if (initialInd.left !== false || initialInd.right !== false || initialInd.hazard !== false || initialInd.isOff !== true) {
  throw new Error('Initial indicators status object invalid');
}
console.log('  ✓ Initial state is cleanly OFF: left=false, right=false, hazard=false, isOff=true.');

// 2. LEFT INDICATOR Feature
console.log('\n2. Testing LEFT INDICATOR Behavior...');
vehicle.setLeftIndicator(true);
if (!vehicle.leftIndicatorOn || vehicle.rightIndicatorOn || vehicle.hazardOn) {
  throw new Error('Left indicator failed to activate or opposite indicator remained active');
}
if (!vehicle.getIndicators().left || vehicle.getIndicators().isOff) {
  throw new Error('indicators.left should be true and isOff should be false');
}
console.log('  ✓ setLeftIndicator(true) turns LEFT on and guarantees RIGHT is off.');

// Toggle left off
vehicle.toggleLeftIndicator();
if (vehicle.leftIndicatorOn) {
  throw new Error('toggleLeftIndicator should turn left indicator OFF when already on');
}
console.log('  ✓ toggleLeftIndicator() turns LEFT off when already active.');

// 3. RIGHT INDICATOR Feature
console.log('\n3. Testing RIGHT INDICATOR Behavior...');
vehicle.setRightIndicator(true);
if (!vehicle.rightIndicatorOn || vehicle.leftIndicatorOn || vehicle.hazardOn) {
  throw new Error('Right indicator failed to activate or opposite indicator remained active');
}
if (!vehicle.getIndicators().right || vehicle.getIndicators().isOff) {
  throw new Error('indicators.right should be true and isOff should be false');
}
console.log('  ✓ setRightIndicator(true) turns RIGHT on and guarantees LEFT is off.');

// Switching from RIGHT to LEFT mutually cancels RIGHT
vehicle.setLeftIndicator(true);
if (!vehicle.leftIndicatorOn || vehicle.rightIndicatorOn) {
  throw new Error('Switching to LEFT indicator should cancel RIGHT indicator');
}
console.log('  ✓ Mutually exclusive operation: activating LEFT cancels active RIGHT.');

// 4. HAZARD Feature
console.log('\n4. Testing HAZARD (4-Way Emergency Flashers)...');
vehicle.setHazard(true);
if (!vehicle.hazardOn) {
  throw new Error('Hazard failed to activate');
}
if (!vehicle.getIndicators().hazard || vehicle.getIndicators().isOff) {
  throw new Error('indicators.hazard should be true and isOff should be false');
}
console.log('  ✓ setHazard(true) successfully engages 4-way hazard flashers.');

// 5. OFF Feature (Explicit Turn-Off Action)
console.log('\n5. Testing Explicit OFF Functionality (turnOffIndicators)...');
vehicle.turnOffIndicators();
if (vehicle.leftIndicatorOn || vehicle.rightIndicatorOn || vehicle.hazardOn) {
  throw new Error('turnOffIndicators() failed to turn off all signals');
}
if (!vehicle.getIndicators().isOff) {
  throw new Error('indicators.isOff must be true when all are turned off');
}
if (vehicle.indicatorLeftMeshes.some(m => m.visible) || vehicle.indicatorRightMeshes.some(m => m.visible)) {
  throw new Error('All indicator exterior 3D meshes must be hidden on OFF');
}
console.log('  ✓ turnOffIndicators() immediately deactivates left, right, hazard, and hides all blinker meshes.');

// 6. Realistic Blink Interval (SAE / ECE Compliant: ~88 flashes/minute)
console.log('\n6. Testing Realistic Blink Interval (~0.34s half-cycle / ~88 flashes/min)...');
vehicle.setLeftIndicator(true);
// Immediately on engage, light should be ON (state = true)
if (!vehicle.indicatorBlinkState) {
  throw new Error('Indicator should illuminate immediately upon activation');
}

// Advance simulation by 0.20s (less than 0.34s half-cycle)
vehicle.update(null, 0.20);
if (!vehicle.indicatorBlinkState) {
  throw new Error('Indicator should remain ON before 0.34s elapsed');
}

// Advance by 0.15s (total 0.35s > 0.34s) -> should flip to OFF
vehicle.update(null, 0.15);
if (vehicle.indicatorBlinkState) {
  throw new Error('Indicator should flip to OFF after 0.34s half-cycle');
}

// Advance by another 0.35s (total ~0.70s) -> should flip back to ON
vehicle.update(null, 0.35);
if (!vehicle.indicatorBlinkState) {
  throw new Error('Indicator should flip back to ON after full cycle');
}
console.log('  ✓ Blink interval cadence is authentic: 0.34s on, 0.34s off (88.2 flashes/min).');

// 7. Automatic Turn Cancellation Feature
console.log('\n7. Testing Automatic Turn Cancellation (Left Turn)...');
// Reset vehicle signals
vehicle.turnOffIndicators();
vehicle.setLeftIndicator(true);

let autoCancelCallbackCalled = false;
let autoCancelDirection = null;
vehicle.onIndicatorAutoCancel = (dir) => {
  autoCancelCallbackCalled = true;
  autoCancelDirection = dir;
};

// Create mock physics for steering simulation
const mockPhysics = { steerAngle: 0 };

// Scenario A: Minor steering wobble (< 0.16) should NOT trigger turn entry
mockPhysics.steerAngle = 0.08;
vehicle.update(mockPhysics, 0.016);
if (vehicle.turnInProgress !== null) {
  throw new Error('Minor steering wobble (< 0.16) should not initiate turn tracking');
}
mockPhysics.steerAngle = 0.02;
vehicle.update(mockPhysics, 0.016);
if (!vehicle.leftIndicatorOn) {
  throw new Error('Indicator should NOT cancel prematurely on minor wobble');
}
console.log('  ✓ False-cancel immunity: minor steering adjustments do not trigger premature cancellation.');

// Scenario B: Full left turn entry (steerAngle > 0.16)
mockPhysics.steerAngle = 0.28; // ~16 degrees left
vehicle.update(mockPhysics, 0.016);
if (vehicle.turnInProgress !== 'left') {
  throw new Error('Vehicle should register turnInProgress = left when steer > 0.16');
}
if (!vehicle.leftIndicatorOn) {
  throw new Error('Indicator should remain active during turn entry');
}

// Vehicle continues turning
mockPhysics.steerAngle = 0.22;
vehicle.update(mockPhysics, 0.016);
if (!vehicle.leftIndicatorOn) {
  throw new Error('Indicator should stay active while wheel is turned');
}

// Wheel straightens back to center (steerAngle < 0.05) -> AUTO CANCEL!
mockPhysics.steerAngle = 0.03; // ~1.7 degrees
vehicle.update(mockPhysics, 0.016);
if (vehicle.leftIndicatorOn) {
  throw new Error('Left indicator should auto-cancel once steering wheel straightens (< 0.05)');
}
if (!autoCancelCallbackCalled || autoCancelDirection !== 'left') {
  throw new Error('onIndicatorAutoCancel callback should be invoked with "left"');
}
console.log('  ✓ Left turn auto-cancellation verified: steer in -> steer out -> automatically cancels.');

// Scenario C: Right Turn Auto-Cancellation
console.log('\n8. Testing Automatic Turn Cancellation (Right Turn)...');
autoCancelCallbackCalled = false;
autoCancelDirection = null;
vehicle.setRightIndicator(true);

// Steer right into corner (steerAngle < -0.16)
mockPhysics.steerAngle = -0.25;
vehicle.update(mockPhysics, 0.016);
if (vehicle.turnInProgress !== 'right') {
  throw new Error('Vehicle should register turnInProgress = right when steer < -0.16');
}

// Wheel straightens back toward center (steerAngle > -0.05) -> AUTO CANCEL!
mockPhysics.steerAngle = -0.02;
vehicle.update(mockPhysics, 0.016);
if (vehicle.rightIndicatorOn) {
  throw new Error('Right indicator should auto-cancel once steering wheel straightens (> -0.05)');
}
if (!autoCancelCallbackCalled || autoCancelDirection !== 'right') {
  throw new Error('onIndicatorAutoCancel callback should be invoked with "right"');
}
console.log('  ✓ Right turn auto-cancellation verified: steer in -> steer out -> automatically cancels.');

// Scenario D: Hazard Immunity to Steering
console.log('\n9. Testing Hazard Flashers Immunity to Auto-Cancellation...');
vehicle.setHazard(true);
mockPhysics.steerAngle = 0.35;
vehicle.update(mockPhysics, 0.016);
mockPhysics.steerAngle = 0.01;
vehicle.update(mockPhysics, 0.016);
if (!vehicle.hazardOn) {
  throw new Error('Hazard lights must NEVER auto-cancel on steering wheel rotation');
}
console.log('  ✓ Hazard safety confirmed: hazard lights remain active through turns and straightaways.');

// Clean reset before testing controller actions
vehicle.turnOffIndicators();

// 10. Controller & Audio & Input Integration
console.log('\n10. Testing InputManager Keybindings & VehicleController Actions...');
const inputManager = new InputManager();
const vehiclePhysics = new VehiclePhysics();
const mockAudio = {
  playIndicatorClick: () => {},
  playUIClick: () => {},
  playWiperSound: () => {},
  playGearShift: () => {},
  playHorn: () => {},
  playHandbrakeRatchet: () => {},
  playHandbrakeRelease: () => {},
  updateEngine: () => {},
  updateTireSlip: () => {},
  updateWind: () => {}
};
const controller = new VehicleController(vehicle, vehiclePhysics, mockAudio, inputManager);

// Test key trigger I -> toggleLeftIndicator
inputManager.triggerAction('toggleLeftIndicator');
if (!vehicle.leftIndicatorOn) {
  throw new Error('Key action toggleLeftIndicator should turn left indicator ON');
}

// Test key trigger K -> toggleRightIndicator
inputManager.triggerAction('toggleRightIndicator');
if (!vehicle.rightIndicatorOn || vehicle.leftIndicatorOn) {
  throw new Error('Key action toggleRightIndicator should turn right indicator ON and left OFF');
}

// Test key trigger H -> toggleHazard
inputManager.triggerAction('toggleHazard');
if (!vehicle.hazardOn) {
  throw new Error('Key action toggleHazard should turn hazard ON');
}

// Test key trigger J -> indicatorsOff
inputManager.triggerAction('indicatorsOff');
if (vehicle.leftIndicatorOn || vehicle.rightIndicatorOn || vehicle.hazardOn) {
  throw new Error('Key action indicatorsOff should turn OFF all signals');
}
console.log('  ✓ All 4 actions cleanly hooked up to InputManager (I, K, H, J).');

// 11. Modern Digital Dashboard HUD Integration
console.log('\n11. Testing Modern Digital Dashboard HUD Indicator Elements & Clicks...');
const container = new MockElement('div');
const hud = new HUD(container, inputManager, mockAudio, null, {
  getActiveVehicle: () => vehicle,
  getActiveController: () => controller,
  getActivePhysics: () => vehiclePhysics
});
hud.show();

if (!hud.blinkerLeft || !hud.blinkerRight || !hud.hazardIcon || !hud.indOffPill) {
  throw new Error('HUD missing indicator status elements (#hud-ind-left, #hud-ind-right, #hud-hazard-icon, #hud-ind-off)');
}

// Test Telemetry rendering Left Indicator
hud.update({
  speedKmh: 45,
  gearName: '3',
  isSportMode: false,
  leftIndicator: true,
  rightIndicator: false,
  hazard: false
});

if (!hud.blinkerLeft.classList.contains('active-blink')) {
  throw new Error('HUD #hud-ind-left missing active-blink class');
}
if (hud.blinkerRight.classList.contains('active-blink')) {
  throw new Error('HUD #hud-ind-right should not have active-blink class');
}
if (hud.indOffPill.classList.contains('active-dim')) {
  throw new Error('#hud-ind-off should not be dim when an indicator is active');
}

// Test Telemetry rendering OFF state
hud.update({
  speedKmh: 0,
  gearName: 'P',
  isSportMode: false,
  leftIndicator: false,
  rightIndicator: false,
  hazard: false
});

if (hud.blinkerLeft.classList.contains('active-blink') || hud.blinkerRight.classList.contains('active-blink')) {
  throw new Error('Blinkers should not be active-blink in OFF state');
}
if (!hud.indOffPill.classList.contains('active-dim')) {
  throw new Error('#hud-ind-off should have active-dim class in all-off state');
}

// Test HUD interactive click triggers
let actionFired = null;
inputManager.onAction('toggleLeftIndicator', () => { actionFired = 'left'; });
hud.blinkerLeft.click();
if (actionFired !== 'left') throw new Error('Clicking left indicator pill failed to trigger action');

inputManager.onAction('toggleRightIndicator', () => { actionFired = 'right'; });
hud.blinkerRight.click();
if (actionFired !== 'right') throw new Error('Clicking right indicator pill failed to trigger action');

inputManager.onAction('toggleHazard', () => { actionFired = 'hazard'; });
hud.hazardIcon.click();
if (actionFired !== 'hazard') throw new Error('Clicking hazard pill failed to trigger action');

inputManager.onAction('indicatorsOff', () => { actionFired = 'off'; });
hud.indOffPill.click();
if (actionFired !== 'off') throw new Error('Clicking off pill failed to trigger action');

console.log('  ✓ HUD click handlers and dynamic UI styling pass all tests.');

console.log('\n=== ALL AUTOMOTIVE INDICATOR SYSTEM TESTS PASSED PERFECTLY (100%)! ===');
