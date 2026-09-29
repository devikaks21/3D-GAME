import * as THREE from 'three';
import { GameState, GameStates, GameModes } from './GameState.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { AssetManager } from './AssetManager.js';
import { CollisionSystem } from '../utilities/Collision.js';
import { VehicleManager, VEHICLE_CATALOG } from '../vehicle/VehicleManager.js';
import { CameraManager, CameraModes } from '../camera/CameraManager.js';
import { NavigationSystem } from '../navigation/NavigationSystem.js';
import { MissionManager } from '../missions/MissionManager.js';

// Connected Open-World Modules
import { City } from '../world/City.js';
import { Park } from '../world/Park.js';
import { Dealership } from '../world/Dealership.js';
import { GarageLocation } from '../world/GarageLocation.js';
import { CarWash } from '../world/CarWash.js';
import { PetrolStation } from '../world/PetrolStation.js';
import { School } from '../world/School.js';
import { Apartments } from '../world/Apartments.js';
import { TramLine } from '../world/TramLine.js';
import { Riverbed } from '../world/Riverbed.js';
import { ParkingLot } from '../world/ParkingLot.js';
import { RingRoad } from '../world/RingRoad.js';
import { MountainArea } from '../world/MountainArea.js';
import { BeachArea } from '../world/BeachArea.js';
import { Airport } from '../world/Airport.js';
import { RacingTrack } from '../world/RacingTrack.js';
import { Playground } from '../world/Playground.js';
import { TrafficManager } from '../world/TrafficManager.js';

// User Interface Layers
import { MainMenu } from '../ui/MainMenu.js';
import { HUD } from '../ui/HUD.js';
import { GarageUI } from '../ui/GarageUI.js';
import { DealershipUI } from '../ui/DealershipUI.js';
import { MapUI } from '../ui/MapUI.js';
import { MissionUI } from '../ui/MissionUI.js';
import { SettingsUI } from '../ui/SettingsUI.js';
import { PitStopUI } from '../ui/PitStopUI.js';

export class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.clock = new THREE.Clock();

    // Core systems
    this.gameState = new GameState();
    this.inputManager = new InputManager();
    this.audioManager = new AudioManager();
    this.assetManager = new AssetManager();
    this.collisionSystem = new CollisionSystem();

    // Scene & Renderer
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Environmental lighting
    this.sunLight = null;
    this.ambientLight = null;
    this.hemiLight = null;

    // Entities
    this.vehicleManager = null;
    this.cameraManager = null;
    this.navigationSystem = null;
    this.missionManager = null;

    // 14 Connected World Sectors & Facilities
    this.city = null;
    this.park = null;
    this.dealership = null;
    this.garageLocation = null;
    this.carWash = null;
    this.petrolStation = null;
    this.school = null;
    this.apartments = null;
    this.tramLine = null;
    this.riverbed = null;
    this.parkingLot = null;
    this.ringRoad = null;
    this.mountain = null;
    this.beach = null;
    this.airport = null;
    this.racingTrack = null;
    this.playground = null;
    this.trafficManager = null;

    // UI instances
    this.uiContainer = document.getElementById('ui-container');
    this.mainMenu = null;
    this.hud = null;
    this.garageUI = null;
    this.dealershipUI = null;
    this.mapUI = null;
    this.missionUI = null;
    this.settingsUI = null;
    this.pitStopUI = null;
    this.hasOpenedPitStopRecently = false;

    // Gameplay telemetry state
    this.fuelLevel = 100;

    this.init();
  }

  init() {
    this.initThree();
    this.initLighting();
    this.initWorld();
    this.initVehicle();
    this.initUI();
    this.setupStateHandling();

    // Start directly in active driving simulator mode with speedometer visible
    this.startPlayMode(GameModes.FREE_DRIVE);

    // Window resize listener
    window.addEventListener('resize', () => this.onWindowResize());

    // Audio unlock on user gesture
    const unlockAudio = () => {
      this.audioManager.ensureContext();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // Game loop
    this.animate();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090b10);
    this.scene.fog = new THREE.FogExp2(0x090b10, 0.0022);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1500);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.appendChild(this.renderer.domElement);
    this.cameraManager = new CameraManager(this.camera, this.renderer.domElement, this.inputManager);
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.hud && typeof this.hud.onResize === 'function') {
      this.hud.onResize();
    }
  }

  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x7090b0, 0x22262c, 0.45);
    this.hemiLight.position.set(0, 100, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaf0, 1.4);
    this.sunLight.position.set(120, 160, 90);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 400;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
  }

  setTimeOfDay(timeOfDay) {
    switch (timeOfDay) {
      case 'sunset':
        this.scene.background.set(0x2d1720);
        this.scene.fog.color.set(0x2d1720);
        this.sunLight.color.set(0xff7733);
        this.sunLight.intensity = 1.2;
        this.sunLight.position.set(160, 40, 90);
        this.ambientLight.color.set(0xffaa77);
        this.ambientLight.intensity = 0.4;
        break;

      case 'night':
        this.scene.background.set(0x050608);
        this.scene.fog.color.set(0x050608);
        this.sunLight.color.set(0x224466);
        this.sunLight.intensity = 0.2;
        this.ambientLight.color.set(0x112233);
        this.ambientLight.intensity = 0.25;
        if (this.vehicleManager && this.vehicleManager.getActiveVehicle()) {
          const v = this.vehicleManager.getActiveVehicle();
          if (!v.headlightsOn) v.toggleHeadlights();
        }
        break;

      case 'day':
      default:
        this.scene.background.set(0x090b10);
        this.scene.fog.color.set(0x090b10);
        this.sunLight.color.set(0xfffaf0);
        this.sunLight.intensity = 1.4;
        this.sunLight.position.set(120, 160, 90);
        this.ambientLight.color.set(0xffffff);
        this.ambientLight.intensity = 0.45;
        break;
    }
  }

  initWorld() {
    // 1. Downtown City
    this.city = new City(this.scene, this.assetManager, this.collisionSystem);

    // 2. Green Public Park
    this.park = new Park(this.scene, this.collisionSystem);

    // 3. Car Dealership Showroom
    this.dealership = new Dealership(this.scene, this.collisionSystem);

    // 4. Drive-In Physical Garage
    this.garageLocation = new GarageLocation(this.scene, this.collisionSystem);

    // 5. Automated Car Wash Tunnel
    this.carWash = new CarWash(this.scene, this.collisionSystem, this.audioManager);

    // 6. Realistic Petrol Station
    this.petrolStation = new PetrolStation(this.scene, this.collisionSystem, this.audioManager);

    // 7. School Campus & Zones
    this.school = new School(this.scene, this.collisionSystem);

    // 8. Multi-Floor Apartments
    this.apartments = new Apartments(this.scene, this.collisionSystem);

    // 9. Urban Tram Line with Moving Tram
    this.tramLine = new TramLine(this.scene);

    // 10. Riverbed & Bridges
    this.riverbed = new Riverbed(this.scene, this.collisionSystem);

    // 11. Large Parking Lot for practice
    this.parkingLot = new ParkingLot(this.scene, this.collisionSystem);

    // 12. Arterial Ring Road Highway
    this.ringRoad = new RingRoad(this.scene, this.assetManager, this.collisionSystem);

    // 13. Mountain, Beach, Airport, Circuit & Playground
    this.mountain = new MountainArea(this.scene, this.assetManager, this.collisionSystem);
    this.beach = new BeachArea(this.scene, this.assetManager, this.collisionSystem);
    this.airport = new Airport(this.scene, this.assetManager, this.collisionSystem);
    this.racingTrack = new RacingTrack(this.scene, this.assetManager, this.collisionSystem);
    this.playground = new Playground(this.scene, this.assetManager, this.collisionSystem);

    // 14. Autonomous AI Traffic System
    this.trafficManager = new TrafficManager(this.scene);
  }

  initVehicle() {
    this.vehicleManager = new VehicleManager(this.scene, this.audioManager, this.inputManager);
    this.vehicleManager.spawnVehicle(this.gameState.selectedVehicleId, 0, 0.4, 0, 0);

    this.missionManager = new MissionManager(this.scene, this.gameState, this.audioManager, this.collisionSystem);
  }

  initUI() {
    this.mainMenu = new MainMenu(
      this.uiContainer,
      this.gameState,
      this.audioManager,
      (selectedMode) => this.startPlayMode(selectedMode)
    );

    this.hud = new HUD(
      this.uiContainer,
      this.inputManager,
      this.audioManager,
      () => this.pauseGame(),
      this.vehicleManager
    );

    this.navigationSystem = new NavigationSystem(this.hud.radarCanvas);

    this.garageUI = new GarageUI(
      this.uiContainer,
      this.gameState,
      this.vehicleManager,
      this.audioManager,
      () => this.startPlayMode(GameModes.FREE_DRIVE)
    );

    this.dealershipUI = new DealershipUI(
      this.uiContainer,
      this.gameState,
      this.vehicleManager,
      this.audioManager,
      (selectedCarId) => {
        this.vehicleManager.spawnVehicle(selectedCarId, 195, 0.4, -45, Math.PI / 2);
        this.startPlayMode(GameModes.FREE_DRIVE);
      }
    );

    this.mapUI = new MapUI(
      this.uiContainer,
      this.gameState,
      this.audioManager,
      (spawn) => {
        this.teleportVehicle(spawn);
        this.startPlayMode(GameModes.FREE_DRIVE);
      }
    );

    this.missionUI = new MissionUI(
      this.uiContainer,
      this.audioManager,
      {
        onContinue: () => this.gameState.setState(GameStates.PLAYING),
        onRetry: () => this.startPlayMode(this.gameState.currentMode),
        onResume: () => this.gameState.setState(GameStates.PLAYING),
        onGarage: () => this.gameState.setState(GameStates.GARAGE),
        onMainMenu: () => this.gameState.setState(GameStates.MENU)
      }
    );

    this.settingsUI = new SettingsUI(
      this.uiContainer,
      this.gameState,
      this.audioManager,
      (timeOfDay) => this.setTimeOfDay(timeOfDay),
      this.inputManager
    );

    this.pitStopUI = new PitStopUI(
      this.uiContainer,
      this.audioManager,
      {
        onRepair: () => {
          const phys = this.vehicleManager.getActivePhysics();
          if (phys) {
            phys.chassisPitch = 0;
            phys.chassisRoll = 0;
            phys.steerAngle = 0;
          }
          this.hud.setPrompt('VEHICLE FULLY REPAIRED & TUNED! 🔧');
          setTimeout(() => this.hud.setPrompt(''), 3000);
        },
        onFuel: () => {
          this.fuelLevel = 100;
          this.hud.setPrompt('RACING FUEL TANK REFILLED TO 100%! ⛽');
          setTimeout(() => this.hud.setPrompt(''), 3000);
        },
        onContinue: () => {
          this.hud.setPrompt('PIT SERVICE COMPLETE - ACCELERATE TO REJOIN TRACK! 🏁');
          setTimeout(() => this.hud.setPrompt(''), 3500);
        }
      }
    );

    // Interactive Action triggers (Refuel & Facility Interaction)
    this.inputManager.onAction('refuel', () => {
      const phys = this.vehicleManager.getActivePhysics();
      if (phys && this.petrolStation && this.petrolStation.checkPlayerNearby(phys.position)) {
        this.fuelLevel = this.petrolStation.refuel();
        this.hud.setPrompt('VEHICLE TANK REFUELED TO 100%!');
        setTimeout(() => this.hud.setPrompt(''), 2500);
      }
    });

    this.inputManager.onAction('interact', () => {
      const phys = this.vehicleManager.getActivePhysics();
      if (!phys) return;

      if (this.pitStopUI && this.pitStopUI.isOpen()) {
        this.pitStopUI.hide();
        return;
      }

      if (this.racingTrack && this.racingTrack.checkPitStop(phys.position)) {
        this.pitStopUI.show();
      } else if (this.dealership && this.dealership.checkPlayerNearby(phys.position)) {
        this.dealershipUI.show();
      } else if (this.garageLocation && this.garageLocation.checkPlayerNearby(phys.position)) {
        this.gameState.setState(GameStates.GARAGE);
      }
    });

    this.inputManager.onAction('pause', () => {
      if (this.gameState.currentState === GameStates.PLAYING) {
        this.pauseGame();
      } else if (this.gameState.currentState === GameStates.PAUSED) {
        this.gameState.setState(GameStates.PLAYING);
      }
    });

    this.inputManager.onAction('map', () => {
      if (this.gameState.currentState === GameStates.PLAYING) {
        this.gameState.setState(GameStates.MAP);
      } else if (this.gameState.currentState === GameStates.MAP) {
        this.gameState.setState(GameStates.PLAYING);
      }
    });

    this.inputManager.onAction('menu', () => {
      if (this.gameState.currentState === GameStates.PLAYING) {
        this.pauseGame();
      } else if (this.gameState.currentState === GameStates.PAUSED || this.gameState.currentState === GameStates.MAP || this.gameState.currentState === GameStates.SETTINGS) {
        this.gameState.setState(GameStates.PLAYING);
      }
    });

    this.inputManager.onAction('resetVehicle', () => {
      const phys = this.vehicleManager.getActivePhysics();
      if (phys) {
        phys.resetPosition(phys.position.x, 0.5, phys.position.z, phys.heading);
        this.audioManager.playUIClick();
      }
    });
  }

  setupStateHandling() {
    this.gameState.on('stateChange', ({ current }) => {
      this.mainMenu.hide();
      this.hud.hide();
      this.garageUI.hide();
      this.dealershipUI.hide();
      this.mapUI.hide();
      this.settingsUI.hide();
      this.missionUI.hidePause();
      this.missionUI.hideResult();
      if (this.pitStopUI) this.pitStopUI.hide();

      switch (current) {
        case GameStates.MENU:
          this.cameraManager.setMode(CameraModes.SHOWROOM);
          this.mainMenu.show();
          this.audioManager.setAmbientShowroom(true);
          break;

        case GameStates.GARAGE:
          this.cameraManager.setMode(CameraModes.SHOWROOM);
          this.garageUI.show();
          this.audioManager.setAmbientShowroom(true);
          break;

        case GameStates.MAP:
          this.mapUI.show();
          break;

        case GameStates.SETTINGS:
          this.settingsUI.show();
          break;

        case GameStates.PLAYING:
          this.cameraManager.setMode(CameraModes.CHASE);
          this.hud.show();
          this.audioManager.setAmbientShowroom(false);
          break;

        case GameStates.PAUSED:
          this.hud.show();
          this.missionUI.showPause();
          break;
      }
    });
  }

  startPlayMode(mode, options = {}) {
    this.gameState.setMode(mode);
    this.gameState.setState(GameStates.PLAYING);

    let spawn = { x: 0, y: 0.4, z: 0, heading: 0 };
    if (mode === GameModes.RACING_TRACK) {
      // Spawn on Starting Grid Box 1 (Pole Position) facing North down the straight
      spawn = { x: -464, y: 0.4, z: -125, heading: 0 };
    } else if (mode === GameModes.CAR_PLAYGROUND) {
      // Spawn at the start of the 400m Drag Strip facing North
      spawn = { x: -420, y: 0.4, z: 200, heading: 0 };
    } else if (mode === GameModes.DRIVING_SCHOOL) {
      spawn = { x: 0, y: 0.4, z: -20, heading: 0 };
    }

    this.teleportVehicle(spawn);
    this.missionManager.startMode(mode, options);
    this.navigationSystem.setCheckpoints(this.missionManager.activeCheckpoints);
  }

  teleportVehicle(spawn) {
    const phys = this.vehicleManager.getActivePhysics();
    if (phys) {
      phys.resetPosition(spawn.x, spawn.y, spawn.z, spawn.heading);
    }
  }

  pauseGame() {
    this.gameState.setState(GameStates.PAUSED);
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsedTime = this.clock.getElapsedTime();

    const currentPhysics = this.vehicleManager.getActivePhysics();
    const currentController = this.vehicleManager.getActiveController();

    // 1. Update world elements & animations
    if (this.city) this.city.update(dt);
    if (this.beach) this.beach.update(elapsedTime);
    if (this.riverbed) this.riverbed.update(elapsedTime);
    if (this.tramLine) this.tramLine.update(dt);
    if (this.dealership) this.dealership.update(dt);
    if (this.collisionSystem) this.collisionSystem.updateDynamicBoxes(dt);

    if (this.trafficManager && currentPhysics) {
      this.trafficManager.update(dt, currentPhysics.position, this.city ? this.city.trafficLightState : 'green');
    }

    // 2. Update player vehicle & gameplay
    if (this.gameState.currentState === GameStates.PLAYING) {
      this.vehicleManager.update(dt, this.collisionSystem);

      // Deplete fuel slowly while driving
      if (currentPhysics && currentPhysics.forwardSpeed > 1) {
        this.fuelLevel = Math.max(0, this.fuelLevel - (dt * 0.04));
      }

      // Proximity Interactive Prompts
      if (currentPhysics) {
        const p = currentPhysics.position;

        // Hold vehicle in place while Pit Stop UI is open
        if (this.pitStopUI && this.pitStopUI.isOpen()) {
          currentPhysics.velocity.set(0, 0, 0);
        }

        // Car Wash update
        const washStatus = this.carWash.update(dt, p);
        if (washStatus.isWashing) {
          this.hud.setPrompt('🧼 CAR WASH IN PROGRESS... RESTORING GLEAM SHINE');
        } else if (this.racingTrack && this.racingTrack.checkPitStop(p)) {
          this.hud.setPrompt('PIT STOP AREA • PRESS [E] FOR SERVICE 🔧⛽');
          // If vehicle slows down in pit box (< 10 km/h), auto-open pit stop interface if not opened recently
          if (Math.abs(currentPhysics.speedKmh) < 10 && !this.pitStopUI.isOpen() && !this.hasOpenedPitStopRecently) {
            this.pitStopUI.show();
            this.hasOpenedPitStopRecently = true;
          }
        } else {
          this.hasOpenedPitStopRecently = false;
          if (this.petrolStation && this.petrolStation.checkPlayerNearby(p)) {
            this.hud.setPrompt('PRESS [F] TO REFUEL TANK ⛽');
          } else if (this.dealership && this.dealership.checkPlayerNearby(p)) {
            this.hud.setPrompt('PRESS [E] ENTER PREMIER MOTOR SHOWROOM ✨');
          } else if (this.garageLocation && this.garageLocation.checkPlayerNearby(p)) {
            this.hud.setPrompt('PRESS [E] ENTER CUSTOM TUNING GARAGE 🔧');
          } else {
            this.hud.setPrompt('');
          }
        }
      }

      // Step missions
      const missionData = this.missionManager.update(dt, currentPhysics, this.collisionSystem, this.racingTrack);
      if (missionData && missionData.isCompleted) {
        this.missionUI.showResult(true, 'MISSION COMPLETE', 'All checkpoints conquered!', missionData.reward || 2000);
      } else if (missionData && missionData.isFailed) {
        this.missionUI.showResult(false, 'TEST FAILED', missionData.failReason || 'Disqualified', 0);
      }

      // Update Navigation System radar
      const trafficPos = this.trafficManager ? this.trafficManager.getTrafficPositions() : [];
      this.navigationSystem.activeCheckpointIndex = this.missionManager.currentCheckpointIndex;
      this.navigationSystem.update(currentPhysics.position, currentPhysics.heading, trafficPos);

      // Update HUD telemetry & fuel
      const telemetry = currentController.getTelemetry();
      const gpsDistance = this.navigationSystem.getGpsDistance(currentPhysics.position);
      this.hud.update(telemetry, this.cameraManager.mode, missionData, gpsDistance, this.fuelLevel, dt);

      // Sunlight shadows follow vehicle
      if (this.sunLight && currentPhysics) {
        this.sunLight.position.x = currentPhysics.position.x + 120;
        this.sunLight.position.z = currentPhysics.position.z + 90;
        this.sunLight.target.position.copy(currentPhysics.position);
      }
    } else if (this.gameState.currentState === GameStates.MENU || this.gameState.currentState === GameStates.GARAGE) {
      const vehicle = this.vehicleManager.getActiveVehicle();
      if (vehicle) vehicle.update(currentPhysics, dt);
    }

    // Camera update
    this.cameraManager.update(currentPhysics, dt, this.vehicleManager.getActiveVehicle());

    // WebGL render pass
    this.renderer.render(this.scene, this.camera);
  }
}
