/**
 * Global game state management
 */
export const GameStates = {
  MENU: 'MENU',
  GARAGE: 'GARAGE',
  MAP: 'MAP',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  MISSION_RESULT: 'MISSION_RESULT',
  SETTINGS: 'SETTINGS'
};

export const GameModes = {
  FREE_DRIVE: 'FREE_DRIVE',
  DRIVING_SCHOOL: 'DRIVING_SCHOOL',
  ROAD_TEST: 'ROAD_TEST',
  COURSE_TEST: 'COURSE_TEST',
  RACING_TRACK: 'RACING_TRACK',
  CAR_PLAYGROUND: 'CAR_PLAYGROUND'
};

export class GameState {
  constructor() {
    this.currentState = GameStates.MENU;
    this.currentMode = GameModes.FREE_DRIVE;
    this.previousState = null;

    // Player stats & progression
    this.credits = 15000;
    this.unlockedVehicles = ['falcon_s1', 'nova_x', 'vortex_gt', 'apex_r', 'titan_sport', 'aero_roadster', 'apex_gt', 'venom_spyder', 'titan_4x4', 'urban_pulse', 'formula_r'];
    this.selectedVehicleId = 'falcon_s1';

    this.drivingSchoolCompleted = 0;
    this.roadTestPassed = false;
    this.bestLapTime = null;
    this.playgroundHighCombo = 0;

    // Settings
    this.settings = {
      graphicsQuality: 'high', // low, medium, high, ultra
      shadows: true,
      audioMasterVolume: 0.8,
      audioEngineVolume: 0.9,
      audioEffectsVolume: 0.8,
      transmission: 'auto', // 'auto' | 'manual'
      cameraView: 'chase',
      speedUnit: 'KM/H', // 'KM/H' | 'MPH'
      timeOfDay: 'day' // 'day', 'sunset', 'night'
    };

    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  setState(newState) {
    if (this.currentState === newState) return;
    this.previousState = this.currentState;
    this.currentState = newState;
    this.emit('stateChange', { current: newState, previous: this.previousState });
  }

  setMode(newMode) {
    this.currentMode = newMode;
    this.emit('modeChange', newMode);
  }

  selectVehicle(vehicleId) {
    if (this.unlockedVehicles.includes(vehicleId)) {
      this.selectedVehicleId = vehicleId;
      this.emit('vehicleChanged', vehicleId);
      return true;
    }
    return false;
  }

  unlockVehicle(vehicleId) {
    if (!this.unlockedVehicles.includes(vehicleId)) {
      this.unlockedVehicles.push(vehicleId);
      this.emit('vehicleUnlocked', vehicleId);
    }
  }

  addCredits(amount) {
    this.credits += amount;
    this.emit('creditsUpdated', this.credits);
  }
}
