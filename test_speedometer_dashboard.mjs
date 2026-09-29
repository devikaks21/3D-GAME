import { HUD } from './src/ui/HUD.js';
import { VehiclePhysics } from './src/vehicle/VehiclePhysics.js';
import { InputManager } from './src/core/InputManager.js';

// Setup Mock DOM environment for headless testing
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

  get textContent() { return this._textContent || ''; }
  set textContent(v) { this._textContent = v === null || v === undefined ? '' : String(v); }

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

      const dataGearMatch = /data-gear=["']([^"']+)["']/i.exec(attrStr);
      if (dataGearMatch) el.dataset.gear = dataGearMatch[1];

      this.appendChild(el);
    }
  }

  setAttribute(name, val) { this.attributes[name] = String(val); }
  getAttribute(name) { return this.attributes[name] || null; }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  click() {
    if (this.listeners['click']) {
      this.listeners['click'].forEach(fn => fn({ target: this }));
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

// Simple HTML Parser for mock tree creation
function parseMockHTML(html) {
  const root = new MockElement('div');
  // Extract IDs and elements
  const idRegex = /id=["']([^"']+)["']/g;
  let match;
  while ((match = idRegex.exec(html)) !== null) {
    const el = new MockElement('div');
    el.id = match[1];
    root.appendChild(el);
  }
  return root;
}

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};
global.document = {
  createElement: (tag) => new MockElement(tag),
  addEventListener: () => {},
  removeEventListener: () => {}
};

console.log('=== TEST SUITE: SPEEDOMETER & MODERN DIGITAL DASHBOARD ===\n');

// 1. Verify Layout Architecture & Elements
console.log('1. Testing Dashboard Elements Initialization...');
const container = new MockElement('div');
const input = new InputManager();

// Create mock vehicle controller
let mockSportState = false;
let mockLightsState = false;
let mockIndLeft = false;
let mockIndRight = false;
let mockHazard = false;

const vehicleManager = {
  getActiveVehicle: () => ({
    name: 'Apex R',
    type: 'supercar',
    isSportMode: mockSportState,
    toggleSportMode: () => { mockSportState = !mockSportState; return mockSportState; }
  }),
  getActiveController: () => ({
    toggleSportMode: () => { mockSportState = !mockSportState; return mockSportState; },
    setGear: () => true,
    toggleTransmissionMode: () => 'manual'
  }),
  getActivePhysics: () => ({
    getGearName: () => '4',
    shiftUp: () => true,
    shiftDown: () => true
  }),
  getCatalogEntry: () => null
};

const hud = new HUD(container, input, { playUIClick: () => {}, playGearShiftPop: () => {} }, () => {}, vehicleManager);

if (!hud.speedText) throw new Error('Missing #hud-speed element in HUD');
if (!hud.gearText) throw new Error('Missing #hud-gear element in HUD');
if (!hud.gearContainer) throw new Error('Missing #hud-gear-container element in HUD');
if (!hud.driveModeBadge) throw new Error('Missing #hud-drive-mode element in HUD');
if (!hud.lightStatusText) throw new Error('Missing #hud-light-status-text in HUD');
if (!hud.blinkerLeft) throw new Error('Missing #hud-ind-left in HUD');
if (!hud.blinkerRight) throw new Error('Missing #hud-ind-right in HUD');
if (!hud.headlightIcon) throw new Error('Missing #hud-light-icon in HUD');

console.log('  ✓ All modern digital dashboard elements cached successfully.');

// 2. Testing Display Format (142 KM/H, GEAR 4, SPORT MODE)
console.log('\n2. Testing Exact Dashboard Display Format...');
hud.show();

const testTelemetry = {
  speedKmh: 142,
  gearName: '4',
  gear: 4,
  isSportMode: true,
  driveMode: 'SPORT MODE',
  rpm: 4800,
  redlineRpm: 7200,
  headlights: true,
  leftIndicator: true,
  rightIndicator: false,
  hazard: false
};

// Initial update at dt = 1.0 (converge immediately for format test)
hud.update(testTelemetry, 'chase', null, 250, 95, 1.0);

console.log(`  Dashboard Speed Readout: [ ${hud.speedText.textContent} ${hud.speedUnitText ? hud.speedUnitText.textContent : 'KM/H'} ]`);
console.log(`  Dashboard Gear Readout:  [ GEAR ${hud.gearText.textContent} ]`);
console.log(`  Dashboard Mode Readout:  [ ${hud.driveModeBadge.textContent} ]`);

if (hud.speedText.textContent !== '142') {
  throw new Error(`Expected speed 142, got ${hud.speedText.textContent}`);
}
if (hud.gearText.textContent !== '4') {
  throw new Error(`Expected gear 4, got ${hud.gearText.textContent}`);
}
if (hud.driveModeBadge.textContent !== 'SPORT MODE') {
  throw new Error(`Expected 'SPORT MODE', got ${hud.driveModeBadge.textContent}`);
}
if (!hud.driveModeBadge.classList.contains('mode-sport')) {
  throw new Error('Expected mode-sport class on drive mode badge');
}
console.log('  ✓ Core display matches: 142 KM/H | GEAR 4 | SPORT MODE.');

// 3. Testing Comfort Mode & Other Gears
console.log('\n3. Testing Comfort Mode & Alternative Gears (P, R, N, 1, 6)...');
const gearsToTest = ['P', 'R', 'N', '1', '6'];
for (const g of gearsToTest) {
  hud.update({
    speedKmh: 0,
    gearName: g,
    gear: g,
    isSportMode: false,
    driveMode: 'COMFORT MODE',
    rpm: 850,
    redlineRpm: 7000
  }, 'chase', null, 0, 100, 1.0);

  if (hud.gearText.textContent !== g) {
    throw new Error(`Expected gear ${g}, got ${hud.gearText.textContent}`);
  }
  if (hud.driveModeBadge.textContent !== 'COMFORT MODE') {
    throw new Error(`Expected 'COMFORT MODE', got ${hud.driveModeBadge.textContent}`);
  }
  if (!hud.driveModeBadge.classList.contains('mode-comfort')) {
    throw new Error('Expected mode-comfort class on drive mode badge');
  }
}
console.log('  ✓ Comfort mode and gears (P, R, N, 1, 6) verified.');

// 4. Testing Smooth Speed Transitions
console.log('\n4. Testing Smooth Speed Transitions (No abrupt jumping)...');
// Reset displayed speed to 0
hud.displayedSpeed = 0;
hud.speedText.textContent = '0';

// Target speed jumps instantaneously from 0 to 142 KM/H in physics:
const targetSpeed = 142;
const dt = 0.016; // 60 FPS frame time
const speedHistory = [];

for (let frame = 0; frame < 30; frame++) {
  hud.update({
    speedKmh: targetSpeed,
    gearName: '4',
    isSportMode: true,
    rpm: 4500
  }, 'chase', null, 100, 90, dt);

  speedHistory.push(Number(hud.speedText.textContent));
}

console.log(`  Frame 1 speed:  ${speedHistory[0]} km/h`);
console.log(`  Frame 5 speed:  ${speedHistory[4]} km/h`);
console.log(`  Frame 15 speed: ${speedHistory[14]} km/h`);
console.log(`  Frame 30 speed: ${speedHistory[29]} km/h`);

// Check smooth monotonic increase
if (speedHistory[0] === targetSpeed) {
  throw new Error('Speed jumped to target immediately! Smooth transition failed.');
}
if (speedHistory[0] >= speedHistory[4] || speedHistory[4] >= speedHistory[14] || speedHistory[14] > speedHistory[29]) {
  throw new Error('Speed did not transition smoothly and monotonically towards target');
}
if (speedHistory[29] < 135) {
  throw new Error(`Speed transition too sluggish: reached only ${speedHistory[29]} after 30 frames`);
}
console.log('  ✓ Speed smoothly ramps up from 0 to 142 km/h across frames.');

// Test smooth deceleration down to 0
const decelHistory = [];
for (let frame = 0; frame < 35; frame++) {
  hud.update({
    speedKmh: 0,
    gearName: '1',
    isSportMode: false,
    rpm: 850
  }, 'chase', null, 0, 85, dt);

  decelHistory.push(Number(hud.speedText.textContent));
}
console.log(`  Braking Frame 1:  ${decelHistory[0]} km/h`);
console.log(`  Braking Frame 10: ${decelHistory[9]} km/h`);
console.log(`  Braking Frame 35: ${decelHistory[34]} km/h`);

if (decelHistory[34] !== 0) {
  throw new Error(`Speed failed to settle cleanly to 0 km/h: ended at ${decelHistory[34]}`);
}
console.log('  ✓ Speed smoothly decelerates and cleanly settles to 0 km/h.');

// 5. Testing Indicator Status & Light Status
console.log('\n5. Testing Indicator & Headlight Status...');
// Test Lights ON
hud.update({
  speedKmh: 50,
  headlights: true,
  leftIndicator: true,
  rightIndicator: false,
  hazard: false
}, 'chase', null, 50, 80, dt);

if (!hud.headlightIcon.classList.contains('active-blue')) {
  throw new Error('Expected active-blue class on headlight icon when lights on');
}
if (hud.lightStatusText.textContent !== 'LIGHTS ON') {
  throw new Error(`Expected 'LIGHTS ON', got ${hud.lightStatusText.textContent}`);
}
if (!hud.blinkerLeft.classList.contains('active-blink')) {
  throw new Error('Expected active-blink class on left indicator');
}
if (hud.blinkerRight.classList.contains('active-blink')) {
  throw new Error('Right indicator should not be active');
}
console.log('  ✓ Headlights ON and Left Indicator active verified.');

// Test Lights OFF and Right Indicator
hud.update({
  speedKmh: 50,
  headlights: false,
  leftIndicator: false,
  rightIndicator: true,
  hazard: false
}, 'chase', null, 50, 80, dt);

if (hud.headlightIcon.classList.contains('active-blue')) {
  throw new Error('Headlight icon should not have active-blue when lights off');
}
if (hud.lightStatusText.textContent !== 'LIGHTS OFF') {
  throw new Error(`Expected 'LIGHTS OFF', got ${hud.lightStatusText.textContent}`);
}
if (hud.blinkerLeft.classList.contains('active-blink')) {
  throw new Error('Left indicator should not be active');
}
if (!hud.blinkerRight.classList.contains('active-blink')) {
  throw new Error('Expected active-blink class on right indicator');
}
console.log('  ✓ Headlights OFF and Right Indicator active verified.');

// Test Hazard Flasher
hud.update({
  speedKmh: 0,
  headlights: false,
  leftIndicator: false,
  rightIndicator: false,
  hazard: true
}, 'chase', null, 0, 80, dt);

if (!hud.hazardIcon.classList.contains('active-blink')) {
  throw new Error('Expected active-blink on hazard icon when hazard active');
}
console.log('  ✓ Hazard flasher active verified.');

// 6. Testing Interactive Drive Mode Toggle Click
console.log('\n6. Testing Interactive Drive Mode Click Handler...');
let triggeredAction = null;
input.onAction('sportMode', () => {
  triggeredAction = 'sportMode';
});

hud.driveModeBadge.click();
if (triggeredAction !== 'sportMode') {
  throw new Error(`Clicking #hud-drive-mode did not trigger 'sportMode' action, got: ${triggeredAction}`);
}
console.log('  ✓ Clicking #hud-drive-mode successfully triggers sportMode action.');

console.log('\n=== ALL SPEEDOMETER & DIGITAL DASHBOARD TESTS PASSED! ===');
