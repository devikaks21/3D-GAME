/**
 * Desktop Driving Controls & Keybinding Manager
 * 
 * Handles all keyboard, mouse, touch, and configurable keybindings:
 * W / ↑       Accelerate
 * S / ↓       Brake / Reverse
 * A / ←       Steer Left
 * D / →       Steer Right
 * SPACE       Handbrake
 * SHIFT       Sport Mode
 * R           Reset Vehicle
 * C           Change Camera
 * G           Gear Control
 * L           Lights
 * I           Left Indicator
 * K           Right Indicator
 * X           Wipers (Clean alternative avoiding conflict with Accelerate W)
 * P           Pause
 * M           Map
 * ESC         Menu
 */

export const DEFAULT_KEY_BINDINGS = {
  accelerate: {
    id: 'accelerate',
    label: 'Accelerate',
    desc: 'Throttle power / forward drive',
    keys: ['KeyW', 'ArrowUp']
  },
  brake: {
    id: 'brake',
    label: 'Brake / Reverse',
    desc: 'Foot brake and reverse drive',
    keys: ['KeyS', 'ArrowDown']
  },
  steerLeft: {
    id: 'steerLeft',
    label: 'Steer Left',
    desc: 'Turn steering rack left',
    keys: ['KeyA', 'ArrowLeft']
  },
  steerRight: {
    id: 'steerRight',
    label: 'Steer Right',
    desc: 'Turn steering rack right',
    keys: ['KeyD', 'ArrowRight']
  },
  handbrake: {
    id: 'handbrake',
    label: 'Handbrake',
    desc: 'Emergency brake / drift lock',
    keys: ['Space']
  },
  sportMode: {
    id: 'sportMode',
    label: 'Sport Mode',
    desc: 'Boost throttle response & sharpen handling',
    keys: ['ShiftLeft', 'ShiftRight']
  },
  resetVehicle: {
    id: 'resetVehicle',
    label: 'Reset Vehicle',
    desc: 'Recover vehicle upright on roadway',
    keys: ['KeyR']
  },
  changeCamera: {
    id: 'changeCamera',
    label: 'Change Camera',
    desc: 'Cycle chase, cockpit, hood, bumper, orbit',
    keys: ['KeyC']
  },
  gearControl: {
    id: 'gearControl',
    label: 'Gear Control',
    desc: 'Cycle / shift transmission gear',
    keys: ['KeyG']
  },
  lights: {
    id: 'lights',
    label: 'Lights',
    desc: 'Toggle headlights beam',
    keys: ['KeyL']
  },
  leftIndicator: {
    id: 'leftIndicator',
    label: 'Left Indicator',
    desc: 'Turn indicator left',
    keys: ['KeyI']
  },
  rightIndicator: {
    id: 'rightIndicator',
    label: 'Right Indicator',
    desc: 'Turn indicator right',
    keys: ['KeyK']
  },
  hazard: {
    id: 'hazard',
    label: 'Hazard Lights',
    desc: 'Emergency 4-way hazard blinkers',
    keys: ['KeyH']
  },
  indicatorsOff: {
    id: 'indicatorsOff',
    label: 'Indicators Off',
    desc: 'Turn off all indicators and hazard lights',
    keys: ['KeyJ']
  },
  wipers: {
    id: 'wipers',
    label: 'Wipers',
    desc: 'Windshield wipers (Clean alternative to avoid Accelerate W conflict)',
    keys: ['KeyX']
  },
  pause: {
    id: 'pause',
    label: 'Pause',
    desc: 'Pause driving simulation',
    keys: ['KeyP']
  },
  map: {
    id: 'map',
    label: 'Map',
    desc: 'Open world GPS radar map',
    keys: ['KeyM']
  },
  menu: {
    id: 'menu',
    label: 'Menu',
    desc: 'Return to menu / escape overlays',
    keys: ['Escape']
  }
};

export function formatKeyCode(code) {
  if (!code) return 'NONE';
  if (code.startsWith('Key')) return code.slice(3).toUpperCase();
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'Space') return 'SPACE';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'CTRL';
  if (code === 'AltLeft' || code === 'AltRight') return 'ALT';
  if (code === 'Escape') return 'ESC';
  if (code === 'Enter') return 'ENTER';
  if (code === 'Tab') return 'TAB';
  return code.toUpperCase();
}

export class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = {
      isDown: false,
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0,
      yaw: 0,
      pitch: 0.2
    };

    // Virtual control states (for on-screen HUD & Mobile Touch Buttons)
    this.virtualControls = {
      throttle: 0,
      brake: 0,
      steer: 0,
      handbrake: false
    };

    this.onActionCallbacks = new Map();

    // Load persisted keybindings or initialize defaults
    this.bindings = this.loadBindings();

    this.initKeyboard();
    this.initMouse();
  }

  loadBindings() {
    try {
      const stored = localStorage.getItem('openroad3d_keybindings');
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = JSON.parse(JSON.stringify(DEFAULT_KEY_BINDINGS));
        for (const action in merged) {
          if (parsed[action] && Array.isArray(parsed[action].keys)) {
            merged[action].keys = parsed[action].keys;
          }
        }
        return merged;
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_KEY_BINDINGS));
  }

  saveBindings() {
    try {
      localStorage.setItem('openroad3d_keybindings', JSON.stringify(this.bindings));
    } catch (_) {}
  }

  getBindings() {
    return this.bindings;
  }

  resetBindings() {
    this.bindings = JSON.parse(JSON.stringify(DEFAULT_KEY_BINDINGS));
    this.saveBindings();
    this.triggerAction('bindingsChanged');
  }

  /**
   * Rebind a key safely. Avoids assigning the same key to conflicting functions.
   */
  rebind(actionName, slotIndex, newCode) {
    if (!this.bindings[actionName]) return { success: false, reason: 'Unknown action' };

    // Prevent binding invalid keys like undefined or empty
    if (!newCode) return { success: false, reason: 'Invalid key' };

    let conflictMessage = null;
    let conflictedAction = null;

    // Check for conflicts across all actions
    for (const otherAction in this.bindings) {
      const item = this.bindings[otherAction];
      const conflictIdx = item.keys.indexOf(newCode);
      if (conflictIdx !== -1) {
        // If conflict is found in another action:
        if (otherAction !== actionName) {
          // Remove the key from the other action to ensure zero conflicts
          item.keys.splice(conflictIdx, 1);
          conflictMessage = `Reassigned from ${item.label} to avoid conflicts.`;
          conflictedAction = otherAction;
        }
      }
    }

    // Ensure slot exists
    if (!this.bindings[actionName].keys) this.bindings[actionName].keys = [];
    if (slotIndex >= this.bindings[actionName].keys.length) {
      this.bindings[actionName].keys.push(newCode);
    } else {
      this.bindings[actionName].keys[slotIndex] = newCode;
    }

    this.saveBindings();
    this.triggerAction('bindingsChanged');

    return {
      success: true,
      conflictMessage,
      conflictedAction,
      action: this.bindings[actionName]
    };
  }

  getBindingDisplay(actionName) {
    const item = this.bindings[actionName];
    if (!item || !item.keys || item.keys.length === 0) return 'UNBOUND';
    return item.keys.map(formatKeyCode).join(' / ');
  }

  isActionPressed(actionName) {
    const item = this.bindings[actionName];
    if (!item || !item.keys) return false;
    return item.keys.some(k => Boolean(this.keys[k]));
  }

  onAction(actionName, callback) {
    if (!this.onActionCallbacks.has(actionName)) {
      this.onActionCallbacks.set(actionName, []);
    }
    this.onActionCallbacks.get(actionName).push(callback);
  }

  triggerAction(actionName) {
    if (this.onActionCallbacks.has(actionName)) {
      this.onActionCallbacks.get(actionName).forEach(cb => cb());
    }
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept when typing in text inputs or rebinding
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.classList.contains('is-rebinding')) return;

      const code = e.code;
      if (!this.keys[code]) {
        this.keys[code] = true;
        this.handleKeyDownAction(code);
      }

      // Prevent scrolling on arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.mouse.isDown = false;
    });
  }

  handleKeyDownAction(code) {
    // 1. Change Camera: C
    if (this.bindings.changeCamera.keys.includes(code)) {
      this.triggerAction('toggleCamera');
      return;
    }

    // 2. Lights: L
    if (this.bindings.lights.keys.includes(code)) {
      this.triggerAction('toggleHeadlights');
      return;
    }

    // 3. Left Indicator: I (or Q as secondary)
    if (this.bindings.leftIndicator.keys.includes(code) || code === 'KeyQ') {
      this.triggerAction('toggleLeftIndicator');
      return;
    }

    // 4. Right Indicator: K (or E as secondary)
    if ((this.bindings.rightIndicator && this.bindings.rightIndicator.keys.includes(code)) || code === 'KeyE') {
      this.triggerAction('toggleRightIndicator');
      return;
    }

    // Hazard Flashers: H
    if (this.bindings.hazard && this.bindings.hazard.keys.includes(code)) {
      this.triggerAction('toggleHazard');
      return;
    }

    // Indicators Off: J
    if (this.bindings.indicatorsOff && this.bindings.indicatorsOff.keys.includes(code)) {
      this.triggerAction('indicatorsOff');
      return;
    }

    // 5. Wipers: X (Alternative key mapping avoiding conflict with Accelerate W)
    if (this.bindings.wipers.keys.includes(code)) {
      this.triggerAction('toggleWipers');
      return;
    }

    // 6. Sport Mode: Shift
    if (this.bindings.sportMode.keys.includes(code)) {
      this.triggerAction('sportMode');
      return;
    }

    // 7. Gear Control: G
    if (this.bindings.gearControl.keys.includes(code)) {
      this.triggerAction('gearControl');
      return;
    }

    // 8. Reset Vehicle: R
    if (this.bindings.resetVehicle.keys.includes(code)) {
      this.triggerAction('resetVehicle');
      return;
    }

    // 9. Pause: P
    if (this.bindings.pause.keys.includes(code)) {
      this.triggerAction('pause');
      return;
    }

    // 10. Map: M
    if (this.bindings.map.keys.includes(code)) {
      this.triggerAction('map');
      return;
    }

    // 11. Menu: ESC
    if (this.bindings.menu.keys.includes(code)) {
      this.triggerAction('menu');
      this.triggerAction('pause');
      return;
    }

    // Supplementary vehicle features
    switch (code) {
      case 'KeyH':
        this.triggerAction('toggleHazard');
        break;
      case 'KeyJ':
        this.triggerAction('indicatorsOff');
        break;
      case 'KeyT':
        this.triggerAction('toggleRoof');
        break;
      case 'KeyO':
        this.triggerAction('toggleDoors');
        break;
      case 'KeyB':
        this.triggerAction('horn');
        break;
      case 'KeyV':
        this.triggerAction('toggleStats');
        break;
      case 'KeyF':
        this.triggerAction('refuel');
        break;
    }
  }

  initMouse() {
    window.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.interactive-ui')) return;
      this.mouse.isDown = true;
      this.mouse.startX = e.clientX;
      this.mouse.startY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.mouse.isDown) return;
      const dx = e.clientX - this.mouse.startX;
      const dy = e.clientY - this.mouse.startY;
      this.mouse.deltaX = dx;
      this.mouse.deltaY = dy;
      this.mouse.startX = e.clientX;
      this.mouse.startY = e.clientY;

      this.mouse.yaw -= dx * 0.005;
      this.mouse.pitch = Math.max(-0.2, Math.min(1.2, this.mouse.pitch + dy * 0.005));
    });

    window.addEventListener('mouseup', () => {
      this.mouse.isDown = false;
      this.mouse.deltaX = 0;
      this.mouse.deltaY = 0;
    });
  }

  // Returns driving inputs between -1 and 1
  getDrivingInput() {
    let throttle = 0;
    let brake = 0;
    let steer = 0;
    let handbrake = false;

    // Configurable Desktop Keyboard Controls
    if (this.isActionPressed('accelerate')) throttle += 1;
    if (this.isActionPressed('brake')) brake += 1;
    if (this.isActionPressed('steerLeft')) steer += 1; // +1 = Steer Left in physics
    if (this.isActionPressed('steerRight')) steer -= 1; // -1 = Steer Right in physics
    if (this.isActionPressed('handbrake')) handbrake = true;

    // Merge with virtual touch controls (full coexistence)
    throttle = Math.max(throttle, this.virtualControls.throttle);
    brake = Math.max(brake, this.virtualControls.brake);
    if (this.virtualControls.steer !== 0) steer = this.virtualControls.steer;
    if (this.virtualControls.handbrake) handbrake = true;

    return {
      throttle: Math.min(1, Math.max(0, throttle)),
      brake: Math.min(1, Math.max(0, brake)),
      steer: Math.min(1, Math.max(-1, steer)),
      handbrake
    };
  }
}
