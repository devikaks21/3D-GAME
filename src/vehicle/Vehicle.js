import * as THREE from 'three';
import { MathUtils } from '../utilities/MathUtils.js';

/**
 * 3D Procedural Vehicle with animated doors, trunk, convertible roof,
 * wipers, spinning/steering wheels, dynamic headlights, and interior mirrors
 */
export class Vehicle {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.config = config;
    this.type = config.type || 'apex_gt';
    this.name = config.name || 'Apex GT';

    // 1. POSITION (3D Vector in world space)
    this.position = new THREE.Vector3();

    // 2. ROTATION (Euler & Quaternion, heading yaw, pitch, roll)
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.quaternion = new THREE.Quaternion();
    this.heading = 0;
    this.pitch = 0;
    this.roll = 0;

    // 3. SPEED (m/s, km/h, forward and lateral slip)
    this.speed = 0;
    this.speedKmh = 0;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;

    // 4. ACCELERATION (Vector3 & scalar m/s^2, engine power)
    this.acceleration = new THREE.Vector3();
    this.accelerationRate = 0;
    this.enginePower = config.enginePower || (config.physicsConfig ? config.physicsConfig.enginePower : 450);

    // 5. BRAKING (0 to 1 value, active boolean, brake force)
    this.braking = 0;
    this.isBraking = false;
    this.brakeForce = config.brakeForce || (config.physicsConfig ? config.physicsConfig.brakeForce : 35);

    // 6. STEERING (normalized -1..1, angle in radians, max angle)
    this.steering = 0;
    this.steerAngle = 0;
    this.maxSteerAngle = config.maxSteerAngle || MathUtils.degToRad(35);

    // 7. GEAR ('P', 'R', 'N', '1'-'6', current index, engine RPM)
    this.gear = '1';
    this.currentGear = 3;
    this.rpm = 850;
    this.gearNames = ['P', 'R', 'N', '1', '2', '3', '4', '5', '6'];

    // 8. HANDBRAKE (boolean active state & slip lock)
    this.handbrake = false;
    this.isHandbrakeActive = false;

    // 9. DRIVE TYPE ('RWD', 'FWD', 'AWD', '4WD')
    this.driveType = config.driveType || (config.physicsConfig ? config.physicsConfig.driveType : 'RWD');

    // VEHICLE STATISTICS (Top Speed, Acceleration, Braking, Handling, Drive Type, Weight)
    this.statistics = Object.assign({
      topSpeed: '310 km/h',
      acceleration: '9.2/10',
      braking: '8.8/10',
      handling: '8.6/10',
      driveType: this.driveType,
      weight: '1,380 kg'
    }, config.statistics || config.displayStats || {});

    // 10. HEIGHT (vehicle total height, ground clearance rideHeight, isGrounded)
    const defaultHeights = {
      falcon_s1: 1.44,
      nova_x: 1.42,
      vortex_gt: 1.28,
      apex_r: 1.20,
      titan_sport: 1.34,
      aero_roadster: 1.18,
      titan_4x4: 1.95,
      formula_r: 0.95,
      urban_pulse: 1.48,
      apex_gt: 1.25,
      venom_spyder: 1.20
    };
    const defaultRideHeights = {
      falcon_s1: 0.16,
      nova_x: 0.15,
      vortex_gt: 0.13,
      apex_r: 0.11,
      titan_sport: 0.13,
      aero_roadster: 0.13,
      titan_4x4: 0.38,
      formula_r: 0.08,
      urban_pulse: 0.18,
      apex_gt: 0.14,
      venom_spyder: 0.13
    };

    this.height = config.height || defaultHeights[this.type] || 1.25;
    this.rideHeight = config.rideHeight || (config.physicsConfig ? config.physicsConfig.rideHeight : (defaultRideHeights[this.type] || 0.14));
    this.baseRideHeight = this.rideHeight;
    this.rideHeightOffset = 0;
    this.groundHeight = 0;
    this.isGrounded = true;

    // 11. HANDLING (dynamic grip, downforce, steeringSpeed, driftControl, suspensionStiffness)
    this.handling = Object.assign({
      grip: 1.0,
      downforce: 1.0,
      steeringSpeed: 3.5,
      driftControl: 0.35,
      suspensionStiffness: 1.0
    }, config.handling || (config.physicsConfig ? config.physicsConfig.handling : {}));
    this.baseHandling = Object.assign({}, this.handling);
    this.handlingSportRatio = 0.5;

    // 12. COLOUR (primary vehicle paint hex)
    const defaultColours = {
      falcon_s1: 0x00c4cc,
      nova_x: 0x1f3c88,
      vortex_gt: 0xe65100,
      apex_r: 0xcc1111,
      titan_sport: 0x141416,
      aero_roadster: 0xffcc00,
      apex_gt: 0xcc1111,
      venom_spyder: 0xffcc00,
      titan_4x4: 0x225533,
      urban_pulse: 0x00c4cc,
      formula_r: 0xdd1122
    };
    const defaultColour = defaultColours[this.type] || 0xcc1111;
    this.colour = config.colour !== undefined ? config.colour : (config.color !== undefined ? config.color : defaultColour);

    // 13. LIGHTS (headlights, taillights, brakeLights, reverseLights, underglow)
    this.lights = {
      headlights: false,
      taillights: false,
      brakeLights: false,
      reverseLights: false,
      underglow: false
    };

    // 14. INDICATORS (left, right, hazard, blinking state)
    this.indicators = {
      left: false,
      right: false,
      hazard: false,
      blinking: false
    };

    // 15. WIPERS (active, sweep angle, blade meshes)
    this.wipers = Object.assign([], {
      active: false,
      angle: 0,
      blades: []
    });

    // 16. DOORS SYSTEM (frontLeft, frontRight, rearLeft, rearRight)
    const isScissor = this.type === 'apex_r' || this.type === 'apex_gt';
    const hasDoors = this.type !== 'formula_r';
    this.hasDoors = hasDoors;
    this.isScissorDoor = isScissor;

    this.doors = {
      frontLeft: {
        id: 'frontLeft',
        name: 'Front-Left Door',
        side: 'left',
        position: 'front',
        isRear: false,
        isOpen: false,
        progress: 0,
        targetProgress: 0,
        group: null,
        mesh: null,
        supported: hasDoors,
        maxAngle: MathUtils.degToRad(68),
        type: isScissor ? 'scissor' : 'standard'
      },
      frontRight: {
        id: 'frontRight',
        name: 'Front-Right Door',
        side: 'right',
        position: 'front',
        isRear: false,
        isOpen: false,
        progress: 0,
        targetProgress: 0,
        group: null,
        mesh: null,
        supported: hasDoors,
        maxAngle: -MathUtils.degToRad(68),
        type: isScissor ? 'scissor' : 'standard'
      },
      rearLeft: {
        id: 'rearLeft',
        name: 'Rear-Left Door',
        side: 'left',
        position: 'rear',
        isRear: true,
        isOpen: false,
        progress: 0,
        targetProgress: 0,
        group: null,
        mesh: null,
        supported: hasDoors,
        maxAngle: MathUtils.degToRad(62),
        type: 'standard'
      },
      rearRight: {
        id: 'rearRight',
        name: 'Rear-Right Door',
        side: 'right',
        position: 'rear',
        isRear: true,
        isOpen: false,
        progress: 0,
        targetProgress: 0,
        group: null,
        mesh: null,
        supported: hasDoors,
        maxAngle: -MathUtils.degToRad(62),
        type: 'standard'
      },
      // Backward compatibility aliases
      left: null,
      right: null,
      isOpen: false,
      progress: 0,
      type: isScissor ? 'scissor' : 'standard'
    };

    // 17. BOOT (mesh, isOpen, progress - with trunk alias)
    const hasBoot = this.type !== 'formula_r';
    this.hasBoot = hasBoot;
    this.boot = {
      mesh: null,
      isOpen: false,
      progress: 0,
      supported: hasBoot
    };

    // CONVERTIBLE ROOF
    this.isConvertible = this.type === 'aero_roadster' || this.type === 'venom_spyder';
    this.roof = {
      group: null,
      isOpen: false,
      progress: 0,
      supported: this.isConvertible
    };

    // 18. CAMERA (vehicle-calibrated anchors: cockpit, hood, bumper, chase, orbit)
    this.camera = this.initCameraMounts(config.camera);

    // MIRROR SYSTEM (Left side mirror, Right side mirror, Rear-view mirror)
    const hasRearView = this.type !== 'formula_r';
    this.mirrors = {
      left: {
        id: 'left',
        name: 'Left Side Mirror',
        group: null,
        housing: null,
        glass: null,
        supported: true
      },
      right: {
        id: 'right',
        name: 'Right Side Mirror',
        group: null,
        housing: null,
        glass: null,
        supported: true
      },
      rearView: {
        id: 'rearView',
        name: 'Rear-View Mirror',
        group: null,
        housing: null,
        glass: null,
        supported: hasRearView
      },
      supported: true
    };

    // Visual root group & chassis group
    this.group = new THREE.Group();
    this.chassisGroup = new THREE.Group();
    this.group.add(this.chassisGroup);

    // Interactive animated parts
    this.wheels = [];
    this.frontLeftDoor = null;
    this.frontRightDoor = null;
    this.rearLeftDoor = null;
    this.rearRightDoor = null;
    this.leftDoor = null;
    this.rightDoor = null;
    this.trunk = null; // Alias for boot
    this.bootGroup = null;
    this.roofGroup = null;
    this.steeringWheel = null;

    // Lighting components
    this.headlights = [];
    this.headlightMeshes = [];
    this.taillightMeshes = [];
    this.reverseLightMeshes = [];
    this.indicatorLeftMeshes = [];
    this.indicatorRightMeshes = [];
    this.underglowLight = null;

    // Component states
    this.isConvertible = this.type === 'aero_roadster' || this.type === 'venom_spyder';
    this.roofOpen = false;
    this.roofAnimProgress = 0; // 0 = closed, 1 = open

    this.doorsOpen = false;
    this.doorAnimProgress = 0;

    this.bootOpen = false;
    this.trunkOpen = false;
    this.bootAnimProgress = 0;
    this.trunkAnimProgress = 0;

    this.wipersActive = false;
    this.wiperAngle = 0;

    this.headlightsOn = false;
    this.leftIndicatorOn = false;
    this.rightIndicatorOn = false;
    this.hazardOn = false;
    this.indicatorBlinkTimer = 0;
    this.indicatorBlinkRate = 0.33; // 1.5 Hz realistic interval (90 flashes/min)
    this.indicatorBlinkState = false;
    this.turnEngaged = false;
    this.turnPeakSteer = 0;
    this.turnCancelledStalk = false;
    this.isSportMode = false;

    // Materials dictionary for live customization
    this.materials = {};

    this.buildVehicle();
    if (this.scene && typeof this.scene.add === 'function') {
      this.scene.add(this.group);
    }
  }

  initCameraMounts(custom = {}) {
    let presets = {
      cockpit: {
        offset: new THREE.Vector3(0.38, 0.95, 0.2),
        lookOffset: new THREE.Vector3(0.38, 0.9, 20),
        fov: 68
      },
      hood: {
        offset: new THREE.Vector3(0, 0.82, 1.3),
        lookOffset: new THREE.Vector3(0, 0.72, 30),
        fov: 65
      },
      bumper: {
        offset: new THREE.Vector3(0, 0.35, 2.2),
        lookOffset: new THREE.Vector3(0, 0.3, 30),
        fov: 65
      },
      chase: {
        distance: 6.2,
        height: 2.05,
        lookHeight: 0.9,
        fov: 65
      },
      orbit: {
        distance: 6.8,
        height: 1.3
      }
    };

    switch (this.type) {
      case 'falcon_s1':
      case 'urban_pulse':
        presets = {
          cockpit: {
            offset: new THREE.Vector3(0.35, 1.02, 0.1),
            lookOffset: new THREE.Vector3(0.35, 0.98, 20),
            fov: 66
          },
          hood: {
            offset: new THREE.Vector3(0, 0.90, 1.15),
            lookOffset: new THREE.Vector3(0, 0.85, 30),
            fov: 65
          },
          bumper: {
            offset: new THREE.Vector3(0, 0.36, 1.9),
            lookOffset: new THREE.Vector3(0, 0.32, 30),
            fov: 65
          },
          chase: {
            distance: 5.8,
            height: 2.05,
            lookHeight: 0.95,
            fov: 65
          },
          orbit: {
            distance: 6.2,
            height: 1.3
          }
        };
        break;

      case 'nova_x':
        presets = {
          cockpit: {
            offset: new THREE.Vector3(0.38, 1.05, 0.15),
            lookOffset: new THREE.Vector3(0.38, 1.0, 20),
            fov: 68
          },
          hood: {
            offset: new THREE.Vector3(0, 0.88, 1.45),
            lookOffset: new THREE.Vector3(0, 0.82, 30),
            fov: 65
          },
          bumper: {
            offset: new THREE.Vector3(0, 0.36, 2.45),
            lookOffset: new THREE.Vector3(0, 0.32, 30),
            fov: 65
          },
          chase: {
            distance: 6.6,
            height: 2.15,
            lookHeight: 0.95,
            fov: 65
          },
          orbit: {
            distance: 7.2,
            height: 1.4
          }
        };
        break;

      case 'vortex_gt':
        presets = {
          cockpit: {
            offset: new THREE.Vector3(0.36, 0.94, -0.05),
            lookOffset: new THREE.Vector3(0.36, 0.90, 20),
            fov: 68
          },
          hood: {
            offset: new THREE.Vector3(0, 0.82, 1.4),
            lookOffset: new THREE.Vector3(0, 0.75, 30),
            fov: 65
          },
          bumper: {
            offset: new THREE.Vector3(0, 0.34, 2.35),
            lookOffset: new THREE.Vector3(0, 0.30, 30),
            fov: 65
          },
          chase: {
            distance: 6.2,
            height: 2.0,
            lookHeight: 0.9,
            fov: 65
          },
          orbit: {
            distance: 6.8,
            height: 1.3
          }
        };
        break;

      case 'apex_r':
      case 'apex_gt':
        presets = {
          cockpit: {
            offset: new THREE.Vector3(0.36, 0.88, 0.15),
            lookOffset: new THREE.Vector3(0.36, 0.84, 20),
            fov: 70
          },
          hood: {
            offset: new THREE.Vector3(0, 0.76, 1.35),
            lookOffset: new THREE.Vector3(0, 0.68, 30),
            fov: 68
          },
          bumper: {
            offset: new THREE.Vector3(0, 0.28, 2.3),
            lookOffset: new THREE.Vector3(0, 0.25, 30),
            fov: 68
          },
          chase: {
            distance: 6.2,
            height: 1.95,
            lookHeight: 0.85,
            fov: 65
          },
          orbit: {
            distance: 6.8,
            height: 1.2
          }
        };
        break;

      case 'titan_sport':
        presets = {
          cockpit: {
            offset: new THREE.Vector3(0.40, 0.98, 0.1),
            lookOffset: new THREE.Vector3(0.40, 0.94, 20),
            fov: 68
          },
          hood: {
            offset: new THREE.Vector3(0, 0.86, 1.45),
            lookOffset: new THREE.Vector3(0, 0.80, 30),
            fov: 65
          },
          bumper: {
            offset: new THREE.Vector3(0, 0.35, 2.4),
            lookOffset: new THREE.Vector3(0, 0.32, 30),
            fov: 65
          },
          chase: {
            distance: 6.5,
            height: 2.1,
            lookHeight: 0.95,
            fov: 65
          },
          orbit: {
            distance: 7.0,
            height: 1.35
          }
        };
        break;

      case 'aero_roadster':
      case 'venom_spyder':
        presets = {
          cockpit: {
            offset: new THREE.Vector3(0.36, 0.90, 0.12),
            lookOffset: new THREE.Vector3(0.36, 0.86, 20),
            fov: 70
          },
          hood: {
            offset: new THREE.Vector3(0, 0.78, 1.25),
            lookOffset: new THREE.Vector3(0, 0.70, 30),
            fov: 65
          },
          bumper: {
            offset: new THREE.Vector3(0, 0.30, 2.2),
            lookOffset: new THREE.Vector3(0, 0.26, 30),
            fov: 65
          },
          chase: {
            distance: 6.0,
            height: 1.95,
            lookHeight: 0.85,
            fov: 65
          },
          orbit: {
            distance: 6.5,
            height: 1.2
          }
        };
        break;

      case 'titan_4x4':
        presets = {
          cockpit: {
            offset: new THREE.Vector3(0.45, 1.45, 0.1),
            lookOffset: new THREE.Vector3(0.45, 1.35, 20),
            fov: 68
          },
          hood: {
            offset: new THREE.Vector3(0, 1.35, 1.4),
            lookOffset: new THREE.Vector3(0, 1.25, 30),
            fov: 65
          },
          bumper: {
            offset: new THREE.Vector3(0, 0.65, 2.4),
            lookOffset: new THREE.Vector3(0, 0.6, 30),
            fov: 65
          },
          chase: {
            distance: 7.5,
            height: 2.8,
            lookHeight: 1.4,
            fov: 65
          },
          orbit: {
            distance: 8.0,
            height: 1.8
          }
        };
        break;

      case 'formula_r':
        presets = {
          cockpit: {
            offset: new THREE.Vector3(0, 0.65, 0.05),
            lookOffset: new THREE.Vector3(0, 0.6, 25),
            fov: 75
          },
          hood: {
            offset: new THREE.Vector3(0, 0.52, 1.4),
            lookOffset: new THREE.Vector3(0, 0.45, 30),
            fov: 70
          },
          bumper: {
            offset: new THREE.Vector3(0, 0.22, 2.7),
            lookOffset: new THREE.Vector3(0, 0.2, 30),
            fov: 70
          },
          chase: {
            distance: 6.5,
            height: 1.85,
            lookHeight: 0.75,
            fov: 68
          },
          orbit: {
            distance: 7.2,
            height: 1.1
          }
        };
        break;
    }

    if (custom) {
      if (custom.cockpit) {
        if (custom.cockpit.offset) presets.cockpit.offset.copy(custom.cockpit.offset);
        if (custom.cockpit.lookOffset) presets.cockpit.lookOffset.copy(custom.cockpit.lookOffset);
        if (custom.cockpit.fov) presets.cockpit.fov = custom.cockpit.fov;
      }
      if (custom.hood) {
        if (custom.hood.offset) presets.hood.offset.copy(custom.hood.offset);
        if (custom.hood.lookOffset) presets.hood.lookOffset.copy(custom.hood.lookOffset);
        if (custom.hood.fov) presets.hood.fov = custom.hood.fov;
      }
      if (custom.bumper) {
        if (custom.bumper.offset) presets.bumper.offset.copy(custom.bumper.offset);
        if (custom.bumper.lookOffset) presets.bumper.lookOffset.copy(custom.bumper.lookOffset);
        if (custom.bumper.fov) presets.bumper.fov = custom.bumper.fov;
      }
      if (custom.chase) {
        if (custom.chase.distance !== undefined) presets.chase.distance = custom.chase.distance;
        if (custom.chase.height !== undefined) presets.chase.height = custom.chase.height;
        if (custom.chase.lookHeight !== undefined) presets.chase.lookHeight = custom.chase.lookHeight;
        if (custom.chase.fov !== undefined) presets.chase.fov = custom.chase.fov;
      }
      if (custom.orbit) {
        if (custom.orbit.distance !== undefined) presets.orbit.distance = custom.orbit.distance;
        if (custom.orbit.height !== undefined) presets.orbit.height = custom.orbit.height;
      }
    }

    return presets;
  }

  buildVehicle() {
    this.initMaterials();

    switch (this.type) {
      case 'falcon_s1':
      case 'urban_pulse':
        this.buildCompactModel();
        break;
      case 'nova_x':
        this.buildSedanModel();
        break;
      case 'vortex_gt':
        this.buildSportsCoupeModel();
        break;
      case 'apex_r':
      case 'apex_gt':
        this.buildSupercarModel();
        break;
      case 'titan_sport':
        this.buildPerformanceCarModel();
        break;
      case 'aero_roadster':
      case 'venom_spyder':
        this.buildConvertibleRoadsterModel();
        break;
      case 'titan_4x4':
        this.buildOffroadModel();
        break;
      case 'formula_r':
        this.buildFormulaModel();
        break;
      default:
        this.buildSupercarModel();
        break;
    }

    this.buildWheels();
    this.buildInterior();
    this.buildLights();
    this.buildWipers();
    this.buildUnderglow();
    this.buildSmokeSystem();
  }

  initMaterials() {
    // Car paint
    this.materials.paint = new THREE.MeshPhysicalMaterial({
      color: this.colour,
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    this.materials.carbon = new THREE.MeshStandardMaterial({
      color: 0x181818,
      metalness: 0.3,
      roughness: 0.5
    });

    this.materials.glass = new THREE.MeshPhysicalMaterial({
      color: 0x111622,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.75,
      transparent: true,
      opacity: 0.65
    });

    this.materials.interior = new THREE.MeshStandardMaterial({
      color: 0x1e1e24,
      roughness: 0.7
    });

    this.materials.chrome = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      metalness: 0.95,
      roughness: 0.1
    });

    this.materials.caliper = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      metalness: 0.6,
      roughness: 0.3
    });

    this.materials.tire = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.85,
      metalness: 0.1
    });

    this.materials.headlightGlow = new THREE.MeshBasicMaterial({
      color: 0xeeffff
    });

    this.materials.taillightGlow = new THREE.MeshStandardMaterial({
      color: 0x660000,
      emissive: 0x440000,
      emissiveIntensity: 0.4
    });

    this.materials.indicatorGlow = new THREE.MeshBasicMaterial({
      color: 0xff8800
    });

    this.materials.mirror = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.98,
      roughness: 0.05
    });
  }

  // ==========================================
  // ORIGINAL VEHICLE 3D PROCEDURAL MODELS
  // ==========================================

  // 1. COMPACT CAR - Falcon S1
  buildCompactModel() {
    // Nimble aerodynamic urban compact chassis
    const bodyGeom = new THREE.BoxGeometry(1.72, 0.44, 3.8);
    const bodyMesh = new THREE.Mesh(bodyGeom, this.materials.paint);
    bodyMesh.position.set(0, 0.35, 0);
    bodyMesh.castShadow = true;
    this.chassisGroup.add(bodyMesh);

    // Aerodynamic rounded front nose
    const noseGeom = new THREE.BoxGeometry(1.68, 0.26, 0.85);
    const nose = new THREE.Mesh(noseGeom, this.materials.paint);
    nose.position.set(0, 0.28, 2.1);
    this.chassisGroup.add(nose);

    // Honeycomb hexagonal carbon grille insert
    const grilleGeom = new THREE.BoxGeometry(1.15, 0.18, 0.05);
    const grille = new THREE.Mesh(grilleGeom, this.materials.carbon);
    grille.position.set(0, 0.24, 2.53);
    this.chassisGroup.add(grille);

    // Front lower aerodynamic chin spoiler
    const chinGeom = new THREE.BoxGeometry(1.75, 0.04, 0.4);
    const chin = new THREE.Mesh(chinGeom, this.materials.carbon);
    chin.position.set(0, 0.14, 2.25);
    this.chassisGroup.add(chin);

    // Compact hatchback passenger cabin
    const cabinGeom = new THREE.BoxGeometry(1.48, 0.52, 2.15);
    const cabin = new THREE.Mesh(cabinGeom, this.materials.paint);
    cabin.position.set(0, 0.82, -0.3);
    this.chassisGroup.add(cabin);

    // Raked front windshield
    const windshieldGeom = new THREE.PlaneGeometry(1.38, 0.72);
    const windshield = new THREE.Mesh(windshieldGeom, this.materials.glass);
    windshield.position.set(0, 0.80, 0.82);
    windshield.rotation.x = -Math.PI / 4.2;
    this.chassisGroup.add(windshield);

    // Steep vertical rear hatch window
    const rearWinGeom = new THREE.PlaneGeometry(1.32, 0.55);
    const rearWin = new THREE.Mesh(rearWinGeom, this.materials.glass);
    rearWin.position.set(0, 0.84, -1.38);
    rearWin.rotation.x = Math.PI / 4.8;
    this.chassisGroup.add(rearWin);

    // Side windows
    const sideWinGeom = new THREE.PlaneGeometry(1.7, 0.38);
    const leftSideWin = new THREE.Mesh(sideWinGeom, this.materials.glass);
    leftSideWin.position.set(0.75, 0.80, -0.3);
    leftSideWin.rotation.y = Math.PI / 2;
    const rightSideWin = new THREE.Mesh(sideWinGeom, this.materials.glass);
    rightSideWin.position.set(-0.75, 0.80, -0.3);
    rightSideWin.rotation.y = -Math.PI / 2;
    this.chassisGroup.add(leftSideWin, rightSideWin);

    // Sporty aerodynamic rear hatch roof spoiler
    const hatchSpoilerGeom = new THREE.BoxGeometry(1.44, 0.04, 0.32);
    const hatchSpoiler = new THREE.Mesh(hatchSpoilerGeom, this.materials.carbon);
    hatchSpoiler.position.set(0, 1.10, -1.45);
    this.chassisGroup.add(hatchSpoiler);

    // Dual central stainless steel exhaust tips
    const exhGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.22, 12);
    const exhL = new THREE.Mesh(exhGeom, this.materials.chrome);
    exhL.rotation.x = Math.PI / 2;
    exhL.position.set(0.07, 0.18, -1.92);
    const exhR = new THREE.Mesh(exhGeom, this.materials.chrome);
    exhR.rotation.x = Math.PI / 2;
    exhR.position.set(-0.07, 0.18, -1.92);
    this.chassisGroup.add(exhL, exhR);

    // Doors & Hatchback Boot
    this.buildDoors(1.3, 0.48, 1.4, false);
    this.buildBoot(1.3, 0.52, 0.1, -1.82);
  }

  // 2. SEDAN - Nova X
  buildSedanModel() {
    // Elongated executive luxury sports sedan body
    const bodyGeom = new THREE.BoxGeometry(1.88, 0.48, 4.85);
    const bodyMesh = new THREE.Mesh(bodyGeom, this.materials.paint);
    bodyMesh.position.set(0, 0.38, 0);
    bodyMesh.castShadow = true;
    this.chassisGroup.add(bodyMesh);

    // Sculpted executive hood
    const hoodGeom = new THREE.BoxGeometry(1.84, 0.30, 1.05);
    const hood = new THREE.Mesh(hoodGeom, this.materials.paint);
    hood.position.set(0, 0.30, 2.6);
    this.chassisGroup.add(hood);

    // Horizontal chrome executive grille
    const grilleGeom = new THREE.BoxGeometry(1.25, 0.24, 0.06);
    const grille = new THREE.Mesh(grilleGeom, this.materials.chrome);
    grille.position.set(0, 0.28, 3.14);
    this.chassisGroup.add(grille);

    // Front lower intake valence
    const valenceGeom = new THREE.BoxGeometry(1.86, 0.08, 0.5);
    const valence = new THREE.Mesh(valenceGeom, this.materials.carbon);
    valence.position.set(0, 0.15, 2.7);
    this.chassisGroup.add(valence);

    // Stretched executive 4-door cabin greenhouse
    const cabinGeom = new THREE.BoxGeometry(1.58, 0.54, 2.75);
    const cabin = new THREE.Mesh(cabinGeom, this.materials.paint);
    cabin.position.set(0, 0.88, -0.1);
    this.chassisGroup.add(cabin);

    // Front executive windshield
    const windshieldGeom = new THREE.PlaneGeometry(1.48, 0.78);
    const windshield = new THREE.Mesh(windshieldGeom, this.materials.glass);
    windshield.position.set(0, 0.86, 1.25);
    windshield.rotation.x = -Math.PI / 4;
    this.chassisGroup.add(windshield);

    // Rear fastback rear glass
    const rearWinGeom = new THREE.PlaneGeometry(1.42, 0.75);
    const rearWin = new THREE.Mesh(rearWinGeom, this.materials.glass);
    rearWin.position.set(0, 0.86, -1.48);
    rearWin.rotation.x = Math.PI / 3.8;
    this.chassisGroup.add(rearWin);

    // Side passenger windows (front and rear side windows)
    const sideWinGeom = new THREE.PlaneGeometry(2.35, 0.40);
    const leftSideWin = new THREE.Mesh(sideWinGeom, this.materials.glass);
    leftSideWin.position.set(0.80, 0.85, -0.1);
    leftSideWin.rotation.y = Math.PI / 2;
    const rightSideWin = new THREE.Mesh(sideWinGeom, this.materials.glass);
    rightSideWin.position.set(-0.80, 0.85, -0.1);
    rightSideWin.rotation.y = -Math.PI / 2;
    this.chassisGroup.add(leftSideWin, rightSideWin);

    // Chrome window beltline accents
    const trimGeom = new THREE.BoxGeometry(0.04, 0.03, 2.45);
    const trimL = new THREE.Mesh(trimGeom, this.materials.chrome);
    trimL.position.set(0.81, 0.64, -0.1);
    const trimR = new THREE.Mesh(trimGeom, this.materials.chrome);
    trimR.position.set(-0.81, 0.64, -0.1);
    this.chassisGroup.add(trimL, trimR);

    // Integrated rear trunk ducktail lip spoiler
    const spoilerGeom = new THREE.BoxGeometry(1.82, 0.06, 0.25);
    const spoiler = new THREE.Mesh(spoilerGeom, this.materials.paint);
    spoiler.position.set(0, 0.65, -2.42);
    this.chassisGroup.add(spoiler);

    // Dual twin-port integrated rectangular chrome exhaust finishers
    const exhFinGeom = new THREE.BoxGeometry(0.24, 0.08, 0.15);
    const exhFinL = new THREE.Mesh(exhFinGeom, this.materials.chrome);
    exhFinL.position.set(0.65, 0.18, -2.44);
    const exhFinR = new THREE.Mesh(exhFinGeom, this.materials.chrome);
    exhFinR.position.set(-0.65, 0.18, -2.44);
    this.chassisGroup.add(exhFinL, exhFinR);

    // Doors & Trunk Boot
    this.buildDoors(1.45, 0.50, 1.55, false);
    this.buildBoot(1.45, 0.12, 0.95, -2.0);
  }

  // 3. SPORTS COUPE - Vortex GT
  buildSportsCoupeModel() {
    // Muscular front-engine fastback sports coupe body
    const bodyGeom = new THREE.BoxGeometry(1.92, 0.44, 4.65);
    const bodyMesh = new THREE.Mesh(bodyGeom, this.materials.paint);
    bodyMesh.position.set(0, 0.34, 0);
    bodyMesh.castShadow = true;
    this.chassisGroup.add(bodyMesh);

    // Long sculpted power-bonnet
    const hoodGeom = new THREE.BoxGeometry(1.88, 0.28, 1.15);
    const hood = new THREE.Mesh(hoodGeom, this.materials.paint);
    hood.position.set(0, 0.28, 2.5);
    this.chassisGroup.add(hood);

    // Twin hood heat extractor vents
    const ventGeom = new THREE.BoxGeometry(0.24, 0.02, 0.45);
    const ventL = new THREE.Mesh(ventGeom, this.materials.carbon);
    ventL.position.set(0.38, 0.43, 2.3);
    const ventR = new THREE.Mesh(ventGeom, this.materials.carbon);
    ventR.position.set(-0.38, 0.43, 2.3);
    this.chassisGroup.add(ventL, ventR);

    // Front aggressive air dam with carbon splitter
    const splitterGeom = new THREE.BoxGeometry(1.95, 0.05, 0.65);
    const splitter = new THREE.Mesh(splitterGeom, this.materials.carbon);
    splitter.position.set(0, 0.14, 2.75);
    this.chassisGroup.add(splitter);

    // Fastback coupe greenhouse tapering aggressively rearward
    const cabinGeom = new THREE.BoxGeometry(1.48, 0.46, 2.2);
    const cabin = new THREE.Mesh(cabinGeom, this.materials.paint);
    cabin.position.set(0, 0.76, -0.25);
    this.chassisGroup.add(cabin);

    // Raked front sports windshield
    const windshieldGeom = new THREE.PlaneGeometry(1.42, 0.76);
    const windshield = new THREE.Mesh(windshieldGeom, this.materials.glass);
    windshield.position.set(0, 0.75, 0.85);
    windshield.rotation.x = -Math.PI / 3.8;
    this.chassisGroup.add(windshield);

    // Sloping fastback rear window
    const rearWinGeom = new THREE.PlaneGeometry(1.36, 0.95);
    const rearWin = new THREE.Mesh(rearWinGeom, this.materials.glass);
    rearWin.position.set(0, 0.72, -1.45);
    rearWin.rotation.x = Math.PI / 3.2;
    this.chassisGroup.add(rearWin);

    // Side coupe quarter windows
    const sideWinGeom = new THREE.PlaneGeometry(1.65, 0.35);
    const leftSideWin = new THREE.Mesh(sideWinGeom, this.materials.glass);
    leftSideWin.position.set(0.75, 0.74, -0.25);
    leftSideWin.rotation.y = Math.PI / 2;
    const rightSideWin = new THREE.Mesh(sideWinGeom, this.materials.glass);
    rightSideWin.position.set(-0.75, 0.74, -0.25);
    rightSideWin.rotation.y = -Math.PI / 2;
    this.chassisGroup.add(leftSideWin, rightSideWin);

    // Muscular flared rear wheel arches / haunches
    const haunchGeom = new THREE.BoxGeometry(0.12, 0.36, 1.4);
    const haunchL = new THREE.Mesh(haunchGeom, this.materials.paint);
    haunchL.position.set(0.96, 0.36, -1.25);
    const haunchR = new THREE.Mesh(haunchGeom, this.materials.paint);
    haunchR.position.set(-0.96, 0.36, -1.25);
    this.chassisGroup.add(haunchL, haunchR);

    // Low-profile carbon rear deck spoiler
    const deckSpoilerGeom = new THREE.BoxGeometry(1.82, 0.05, 0.28);
    const deckSpoiler = new THREE.Mesh(deckSpoilerGeom, this.materials.carbon);
    deckSpoiler.position.set(0, 0.62, -2.35);
    this.chassisGroup.add(deckSpoiler);

    // Quad round stainless exhaust tips
    const exhGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 12);
    [-0.64, -0.50, 0.50, 0.64].forEach(x => {
      const tip = new THREE.Mesh(exhGeom, this.materials.chrome);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(x, 0.17, -2.36);
      this.chassisGroup.add(tip);
    });

    // Doors & Fastback Boot
    this.buildDoors(1.4, 0.48, 1.6, false);
    this.buildBoot(1.38, 0.1, 1.0, -1.85);
  }

  // 4. SUPERCAR - Apex R
  buildSupercarModel() {
    // Ultra-low mid-engine hypercar monocoque
    const bodyGeom = new THREE.BoxGeometry(1.96, 0.40, 4.5);
    const bodyMesh = new THREE.Mesh(bodyGeom, this.materials.paint);
    bodyMesh.position.set(0, 0.32, 0);
    bodyMesh.castShadow = true;
    this.chassisGroup.add(bodyMesh);

    // Front sharp wedge nose
    const noseGeom = new THREE.BoxGeometry(1.88, 0.26, 0.95);
    const nose = new THREE.Mesh(noseGeom, this.materials.paint);
    nose.position.set(0, 0.26, 2.35);
    nose.castShadow = true;
    this.chassisGroup.add(nose);

    // Deep front carbon splitter with dual side canards
    const splitterGeom = new THREE.BoxGeometry(2.02, 0.06, 0.75);
    const splitter = new THREE.Mesh(splitterGeom, this.materials.carbon);
    splitter.position.set(0, 0.12, 2.58);
    this.chassisGroup.add(splitter);

    const canardGeom = new THREE.BoxGeometry(0.25, 0.02, 0.25);
    const canardL = new THREE.Mesh(canardGeom, this.materials.carbon);
    canardL.position.set(0.92, 0.24, 2.5);
    canardL.rotation.z = 0.2;
    const canardR = new THREE.Mesh(canardGeom, this.materials.carbon);
    canardR.position.set(-0.92, 0.24, 2.5);
    canardR.rotation.z = -0.2;
    this.chassisGroup.add(canardL, canardR);

    // Side aerodynamic cooling pods / air scoops
    const podGeom = new THREE.BoxGeometry(0.18, 0.32, 1.1);
    const podL = new THREE.Mesh(podGeom, this.materials.carbon);
    podL.position.set(0.98, 0.34, -0.3);
    const podR = new THREE.Mesh(podGeom, this.materials.carbon);
    podR.position.set(-0.98, 0.34, -0.3);
    this.chassisGroup.add(podL, podR);

    // Cockpit canopy
    const cabinGeom = new THREE.BoxGeometry(1.48, 0.42, 2.0);
    const cabin = new THREE.Mesh(cabinGeom, this.materials.paint);
    cabin.position.set(0, 0.70, -0.15);
    this.chassisGroup.add(cabin);

    // Roof-mounted induction ram-air scoop
    const scoopGeom = new THREE.BoxGeometry(0.35, 0.12, 0.7);
    const scoop = new THREE.Mesh(scoopGeom, this.materials.carbon);
    scoop.position.set(0, 0.94, -0.2);
    this.chassisGroup.add(scoop);

    // Windshield
    const windshieldGeom = new THREE.PlaneGeometry(1.42, 0.76);
    const windshield = new THREE.Mesh(windshieldGeom, this.materials.glass);
    windshield.position.set(0, 0.72, 0.85);
    windshield.rotation.x = -Math.PI / 3.8;
    this.chassisGroup.add(windshield);

    // Rear louvered glass engine cover
    const rearWinGeom = new THREE.PlaneGeometry(1.36, 0.85);
    const rearWin = new THREE.Mesh(rearWinGeom, this.materials.glass);
    rearWin.position.set(0, 0.68, -1.25);
    rearWin.rotation.x = Math.PI / 3.2;
    this.chassisGroup.add(rearWin);

    // Side windows
    const sideWinGeom = new THREE.PlaneGeometry(1.65, 0.32);
    const leftSideWin = new THREE.Mesh(sideWinGeom, this.materials.glass);
    leftSideWin.position.set(0.75, 0.68, -0.15);
    leftSideWin.rotation.y = Math.PI / 2;
    const rightSideWin = new THREE.Mesh(sideWinGeom, this.materials.glass);
    rightSideWin.position.set(-0.75, 0.68, -0.15);
    rightSideWin.rotation.y = -Math.PI / 2;
    this.chassisGroup.add(leftSideWin, rightSideWin);

    // Rear downforce diffuser with vertical strakes
    const diffuserGeom = new THREE.BoxGeometry(1.95, 0.14, 0.7);
    const diffuser = new THREE.Mesh(diffuserGeom, this.materials.carbon);
    diffuser.position.set(0, 0.18, -2.40);
    this.chassisGroup.add(diffuser);

    // Swan-neck pedestal carbon rear wing
    const wingGeom = new THREE.BoxGeometry(1.98, 0.05, 0.45);
    const wing = new THREE.Mesh(wingGeom, this.materials.carbon);
    wing.position.set(0, 0.92, -2.15);

    const strutGeom = new THREE.BoxGeometry(0.05, 0.35, 0.18);
    const strutL = new THREE.Mesh(strutGeom, this.materials.carbon);
    strutL.position.set(0.52, 0.76, -2.12);
    strutL.rotation.x = -0.15;
    const strutR = new THREE.Mesh(strutGeom, this.materials.carbon);
    strutR.position.set(-0.52, 0.76, -2.12);
    strutR.rotation.x = -0.15;
    this.chassisGroup.add(wing, strutL, strutR);

    // High-mount central dual titanium exhaust outlets
    const exhGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 16);
    const exhL = new THREE.Mesh(exhGeom, this.materials.chrome);
    exhL.rotation.x = Math.PI / 2;
    exhL.position.set(0.12, 0.45, -2.32);
    const exhR = new THREE.Mesh(exhGeom, this.materials.chrome);
    exhR.rotation.x = Math.PI / 2;
    exhR.position.set(-0.12, 0.45, -2.32);
    this.chassisGroup.add(exhL, exhR);

    // Dihedral Scissor Doors (swing upward) & Rear Engine Boot
    this.buildDoors(1.4, 0.48, 1.6, true);
    this.buildBoot(1.4, 0.1, 0.9, -1.7);
  }

  // 5. PERFORMANCE CAR - Titan Sport
  buildPerformanceCarModel() {
    // Widebody track performance chassis
    const bodyGeom = new THREE.BoxGeometry(2.02, 0.48, 4.75);
    const bodyMesh = new THREE.Mesh(bodyGeom, this.materials.paint);
    bodyMesh.position.set(0, 0.36, 0);
    bodyMesh.castShadow = true;
    this.chassisGroup.add(bodyMesh);

    // Power-bulge vented hood
    const hoodGeom = new THREE.BoxGeometry(1.94, 0.32, 1.15);
    const hood = new THREE.Mesh(hoodGeom, this.materials.paint);
    hood.position.set(0, 0.32, 2.5);
    this.chassisGroup.add(hood);

    // Raised supercharger cowl induction scoop
    const cowlGeom = new THREE.BoxGeometry(0.55, 0.08, 0.9);
    const cowl = new THREE.Mesh(cowlGeom, this.materials.carbon);
    cowl.position.set(0, 0.50, 2.3);
    this.chassisGroup.add(cowl);

    // Wide-mouth front air dam with carbon splitter
    const splitterGeom = new THREE.BoxGeometry(2.06, 0.06, 0.7);
    const splitter = new THREE.Mesh(splitterGeom, this.materials.carbon);
    splitter.position.set(0, 0.14, 2.75);
    this.chassisGroup.add(splitter);

    // Flared widebody fender extensions (front and rear)
    [-1.04, 1.04].forEach(x => {
      const fenderF = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 1.1), this.materials.paint);
      fenderF.position.set(x, 0.38, 1.3);
      const fenderR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 1.25), this.materials.paint);
      fenderR.position.set(x, 0.40, -1.25);
      this.chassisGroup.add(fenderF, fenderR);
    });

    // Carbon aerodynamic side skirts
    const skirtGeom = new THREE.BoxGeometry(0.08, 0.05, 2.2);
    const skirtL = new THREE.Mesh(skirtGeom, this.materials.carbon);
    skirtL.position.set(1.02, 0.14, 0);
    const skirtR = new THREE.Mesh(skirtGeom, this.materials.carbon);
    skirtR.position.set(-1.02, 0.14, 0);
    this.chassisGroup.add(skirtL, skirtR);

    // High-cockpit performance greenhouse
    const cabinGeom = new THREE.BoxGeometry(1.54, 0.50, 2.35);
    const cabin = new THREE.Mesh(cabinGeom, this.materials.paint);
    cabin.position.set(0, 0.82, -0.15);
    this.chassisGroup.add(cabin);

    // Performance windshield
    const windshieldGeom = new THREE.PlaneGeometry(1.46, 0.76);
    const windshield = new THREE.Mesh(windshieldGeom, this.materials.glass);
    windshield.position.set(0, 0.80, 1.02);
    windshield.rotation.x = -Math.PI / 4;
    this.chassisGroup.add(windshield);

    // Fastback rear glass
    const rearWinGeom = new THREE.PlaneGeometry(1.40, 0.75);
    const rearWin = new THREE.Mesh(rearWinGeom, this.materials.glass);
    rearWin.position.set(0, 0.80, -1.32);
    rearWin.rotation.x = Math.PI / 3.6;
    this.chassisGroup.add(rearWin);

    // Side windows
    const sideWinGeom = new THREE.PlaneGeometry(1.9, 0.38);
    const leftSideWin = new THREE.Mesh(sideWinGeom, this.materials.glass);
    leftSideWin.position.set(0.78, 0.80, -0.15);
    leftSideWin.rotation.y = Math.PI / 2;
    const rightSideWin = new THREE.Mesh(sideWinGeom, this.materials.glass);
    rightSideWin.position.set(-0.78, 0.80, -0.15);
    rightSideWin.rotation.y = -Math.PI / 2;
    this.chassisGroup.add(leftSideWin, rightSideWin);

    // High-downforce elevated GT3 pedestal racing wing with endplates
    const wingGeom = new THREE.BoxGeometry(1.98, 0.06, 0.45);
    const wing = new THREE.Mesh(wingGeom, this.materials.carbon);
    wing.position.set(0, 1.05, -2.35);

    const endplateGeom = new THREE.BoxGeometry(0.04, 0.22, 0.52);
    const endL = new THREE.Mesh(endplateGeom, this.materials.carbon);
    endL.position.set(0.99, 1.05, -2.35);
    const endR = new THREE.Mesh(endplateGeom, this.materials.carbon);
    endR.position.set(-0.99, 1.05, -2.35);

    const pylonGeom = new THREE.BoxGeometry(0.06, 0.45, 0.16);
    const pylonL = new THREE.Mesh(pylonGeom, this.materials.carbon);
    pylonL.position.set(0.55, 0.82, -2.32);
    const pylonR = new THREE.Mesh(pylonGeom, this.materials.carbon);
    pylonR.position.set(-0.55, 0.82, -2.32);
    this.chassisGroup.add(wing, endL, endR, pylonL, pylonR);

    // Dual large-bore oval ceramic exhaust tips
    const exhGeom = new THREE.BoxGeometry(0.22, 0.10, 0.25);
    const exhL = new THREE.Mesh(exhGeom, this.materials.chrome);
    exhL.position.set(0.58, 0.20, -2.40);
    const exhR = new THREE.Mesh(exhGeom, this.materials.chrome);
    exhR.position.set(-0.58, 0.20, -2.40);
    this.chassisGroup.add(exhL, exhR);

    // Doors & Reinforced Boot
    this.buildDoors(1.45, 0.50, 1.55, false);
    this.buildBoot(1.45, 0.12, 0.85, -1.95);
  }

  // 6. CONVERTIBLE - Aero Roadster
  buildConvertibleRoadsterModel() {
    // Low-slung open-air roadster body
    const bodyGeom = new THREE.BoxGeometry(1.86, 0.42, 4.35);
    const bodyMesh = new THREE.Mesh(bodyGeom, this.materials.paint);
    bodyMesh.position.set(0, 0.34, 0);
    bodyMesh.castShadow = true;
    this.chassisGroup.add(bodyMesh);

    // Sculpted aerodynamic hood
    const noseGeom = new THREE.BoxGeometry(1.82, 0.28, 0.95);
    const nose = new THREE.Mesh(noseGeom, this.materials.paint);
    nose.position.set(0, 0.28, 2.3);
    this.chassisGroup.add(nose);

    // Curved frameless speedster windshield
    const windshieldGeom = new THREE.PlaneGeometry(1.42, 0.58);
    const windshield = new THREE.Mesh(windshieldGeom, this.materials.glass);
    windshield.position.set(0, 0.72, 0.82);
    windshield.rotation.x = -Math.PI / 3.8;
    this.chassisGroup.add(windshield);

    // Polished chrome anti-roll safety hoops behind headrests
    const hoopGeom = new THREE.TorusGeometry(0.18, 0.04, 8, 16, Math.PI);
    const hoopL = new THREE.Mesh(hoopGeom, this.materials.chrome);
    hoopL.position.set(0.42, 0.72, -0.65);
    const hoopR = new THREE.Mesh(hoopGeom, this.materials.chrome);
    hoopR.position.set(-0.42, 0.72, -0.65);
    this.chassisGroup.add(hoopL, hoopR);

    // Speedster headrest aerodynamic tonneau nacelles on rear deck
    const nacelleGeom = new THREE.ConeGeometry(0.24, 0.75, 8);
    const nacelleL = new THREE.Mesh(nacelleGeom, this.materials.paint);
    nacelleL.rotation.x = Math.PI / 2;
    nacelleL.position.set(0.42, 0.58, -1.05);
    const nacelleR = new THREE.Mesh(nacelleGeom, this.materials.paint);
    nacelleR.rotation.x = Math.PI / 2;
    nacelleR.position.set(-0.42, 0.58, -1.05);
    this.chassisGroup.add(nacelleL, nacelleR);

    // Mechanized folding convertible roof mechanism
    this.roofGroup = new THREE.Group();
    this.roofGroup.position.set(0, 0.55, -0.65); // Pivot point near rear deck

    const roofPanelGeom = new THREE.BoxGeometry(1.44, 0.06, 1.48);
    const roofPanel = new THREE.Mesh(roofPanelGeom, this.materials.carbon);
    roofPanel.position.set(0, 0.38, 0.7);

    const rearSoftWinGeom = new THREE.PlaneGeometry(1.12, 0.36);
    const rearSoftWin = new THREE.Mesh(rearSoftWinGeom, this.materials.glass);
    rearSoftWin.position.set(0, 0.25, 0.02);
    rearSoftWin.rotation.x = Math.PI / 4;

    this.roofGroup.add(roofPanel, rearSoftWin);
    this.chassisGroup.add(this.roofGroup);

    // Dual polished rear exhaust outlets
    const exhGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.22, 12);
    const exhL = new THREE.Mesh(exhGeom, this.materials.chrome);
    exhL.rotation.x = Math.PI / 2;
    exhL.position.set(0.52, 0.18, -2.18);
    const exhR = new THREE.Mesh(exhGeom, this.materials.chrome);
    exhR.rotation.x = Math.PI / 2;
    exhR.position.set(-0.52, 0.18, -2.18);
    this.chassisGroup.add(exhL, exhR);

    // Frameless roadster doors & rear boot
    this.buildDoors(1.35, 0.45, 1.5, false);
    this.buildBoot(1.35, 0.08, 0.85, -1.6);
  }

  // Backwards compatibility alias
  buildRoadsterModel() {
    this.buildConvertibleRoadsterModel();
  }

  buildHatchbackModel() {
    this.buildCompactModel();
  }

  buildOffroadModel() {
    // Heavy duty SUV chassis
    const bodyGeom = new THREE.BoxGeometry(2.0, 0.65, 4.6);
    const bodyMesh = new THREE.Mesh(bodyGeom, this.materials.paint);
    bodyMesh.position.set(0, 0.6, 0);
    this.chassisGroup.add(bodyMesh);

    // Tall cabin
    const cabinGeom = new THREE.BoxGeometry(1.8, 0.7, 2.7);
    const cabin = new THREE.Mesh(cabinGeom, this.materials.paint);
    cabin.position.set(0, 1.25, -0.3);
    this.chassisGroup.add(cabin);

    // Rugged bull bar
    const barGeom = new THREE.CylinderGeometry(0.05, 0.05, 1.9);
    const bar = new THREE.Mesh(barGeom, this.materials.carbon);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.55, 2.45);
    this.chassisGroup.add(bar);

    // Roof rack
    const rackGeom = new THREE.BoxGeometry(1.6, 0.08, 2.2);
    const rack = new THREE.Mesh(rackGeom, this.materials.carbon);
    rack.position.set(0, 1.65, -0.3);
    this.chassisGroup.add(rack);

    // Doors & Tailgate
    this.buildDoors(1.5, 0.6, 1.6, false);
    this.buildBoot(1.5, 0.6, 0.1, -2.3);
  }

  buildFormulaModel() {
    // Narrow sleek monocoque fuselage
    const bodyGeom = new THREE.BoxGeometry(0.85, 0.35, 4.6);
    const bodyMesh = new THREE.Mesh(bodyGeom, this.materials.paint);
    bodyMesh.position.set(0, 0.28, 0);
    this.chassisGroup.add(bodyMesh);

    // Nose cone
    const coneGeom = new THREE.ConeGeometry(0.35, 1.2, 8);
    const cone = new THREE.Mesh(coneGeom, this.materials.paint);
    cone.position.set(0, 0.26, 2.8);
    cone.rotation.x = Math.PI / 2;
    this.chassisGroup.add(cone);

    // Massive front wing
    const fWingGeom = new THREE.BoxGeometry(2.1, 0.05, 0.5);
    const fWing = new THREE.Mesh(fWingGeom, this.materials.carbon);
    fWing.position.set(0, 0.15, 2.6);
    this.chassisGroup.add(fWing);

    // High rear wing
    const rWingGeom = new THREE.BoxGeometry(1.7, 0.06, 0.55);
    const rWing = new THREE.Mesh(rWingGeom, this.materials.carbon);
    rWing.position.set(0, 0.95, -2.2);

    const rPillar1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.2), this.materials.carbon);
    rPillar1.position.set(0.4, 0.65, -2.15);
    const rPillar2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.2), this.materials.carbon);
    rPillar2.position.set(-0.4, 0.65, -2.15);
    this.chassisGroup.add(rWing, rPillar1, rPillar2);

    // Halo safety bar
    const haloGeom = new THREE.TorusGeometry(0.3, 0.04, 8, 16, Math.PI);
    const halo = new THREE.Mesh(haloGeom, this.materials.carbon);
    halo.position.set(0, 0.62, 0.1);
    halo.rotation.x = Math.PI / 6;
    this.chassisGroup.add(halo);

    this.buildBoot(0.65, 0.2, 0.8, -1.2);
  }

  buildDoors(width, height, length, isScissor = false) {
    this.isScissorDoor = isScissor;
    this.doors.type = isScissor ? 'scissor' : 'standard';

    const halfW = width * 0.52;
    const doorH = height * 0.88;
    const frontL = length * 0.44;
    const rearL = length * 0.42;
    const frontZ = length * 0.26;
    const rearZ = -length * 0.18;

    // 1. FRONT-LEFT DOOR (Pivot at A-Pillar)
    this.frontLeftDoor = new THREE.Group();
    this.frontLeftDoor.position.set(halfW, 0.35, frontZ);
    const doorFLGeom = new THREE.BoxGeometry(0.08, doorH, frontL);
    const doorFLMesh = new THREE.Mesh(doorFLGeom, this.materials.paint);
    doorFLMesh.position.set(0, 0.05, -frontL * 0.5);
    doorFLMesh.castShadow = true;
    this.frontLeftDoor.add(doorFLMesh);

    // Front-Left Window Glass
    const winFLGeom = new THREE.BoxGeometry(0.03, doorH * 0.42, frontL * 0.88);
    const winFLMesh = new THREE.Mesh(winFLGeom, this.materials.glass);
    winFLMesh.position.set(0, doorH * 0.52, -frontL * 0.5);
    this.frontLeftDoor.add(winFLMesh);

    // Front-Left Chrome Handle
    const handleFLGeom = new THREE.BoxGeometry(0.035, 0.025, 0.12);
    const handleFLMesh = new THREE.Mesh(handleFLGeom, this.materials.chrome);
    handleFLMesh.position.set(0.045, 0.10, -frontL * 0.85);
    this.frontLeftDoor.add(handleFLMesh);
    this.chassisGroup.add(this.frontLeftDoor);

    // 2. FRONT-RIGHT DOOR (Pivot at A-Pillar)
    this.frontRightDoor = new THREE.Group();
    this.frontRightDoor.position.set(-halfW, 0.35, frontZ);
    const doorFRGeom = new THREE.BoxGeometry(0.08, doorH, frontL);
    const doorFRMesh = new THREE.Mesh(doorFRGeom, this.materials.paint);
    doorFRMesh.position.set(0, 0.05, -frontL * 0.5);
    doorFRMesh.castShadow = true;
    this.frontRightDoor.add(doorFRMesh);

    // Front-Right Window Glass
    const winFRGeom = new THREE.BoxGeometry(0.03, doorH * 0.42, frontL * 0.88);
    const winFRMesh = new THREE.Mesh(winFRGeom, this.materials.glass);
    winFRMesh.position.set(0, doorH * 0.52, -frontL * 0.5);
    this.frontRightDoor.add(winFRMesh);

    // Front-Right Chrome Handle
    const handleFRGeom = new THREE.BoxGeometry(0.035, 0.025, 0.12);
    const handleFRMesh = new THREE.Mesh(handleFRGeom, this.materials.chrome);
    handleFRMesh.position.set(-0.045, 0.10, -frontL * 0.85);
    this.frontRightDoor.add(handleFRMesh);
    this.chassisGroup.add(this.frontRightDoor);

    // 3. REAR-LEFT DOOR (Pivot at B-Pillar)
    this.rearLeftDoor = new THREE.Group();
    this.rearLeftDoor.position.set(halfW, 0.35, rearZ);
    const doorRLGeom = new THREE.BoxGeometry(0.08, doorH * 0.94, rearL);
    const doorRLMesh = new THREE.Mesh(doorRLGeom, this.materials.paint);
    doorRLMesh.position.set(0, 0.05, -rearL * 0.5);
    doorRLMesh.castShadow = true;
    this.rearLeftDoor.add(doorRLMesh);

    // Rear-Left Window Glass
    const winRLGeom = new THREE.BoxGeometry(0.03, doorH * 0.38, rearL * 0.84);
    const winRLMesh = new THREE.Mesh(winRLGeom, this.materials.glass);
    winRLMesh.position.set(0, doorH * 0.48, -rearL * 0.5);
    this.rearLeftDoor.add(winRLMesh);

    // Rear-Left Chrome Handle
    const handleRLGeom = new THREE.BoxGeometry(0.035, 0.025, 0.12);
    const handleRLMesh = new THREE.Mesh(handleRLGeom, this.materials.chrome);
    handleRLMesh.position.set(0.045, 0.10, -rearL * 0.82);
    this.rearLeftDoor.add(handleRLMesh);
    this.chassisGroup.add(this.rearLeftDoor);

    // 4. REAR-RIGHT DOOR (Pivot at B-Pillar)
    this.rearRightDoor = new THREE.Group();
    this.rearRightDoor.position.set(-halfW, 0.35, rearZ);
    const doorRRGeom = new THREE.BoxGeometry(0.08, doorH * 0.94, rearL);
    const doorRRMesh = new THREE.Mesh(doorRRGeom, this.materials.paint);
    doorRRMesh.position.set(0, 0.05, -rearL * 0.5);
    doorRRMesh.castShadow = true;
    this.rearRightDoor.add(doorRRMesh);

    // Rear-Right Window Glass
    const winRRGeom = new THREE.BoxGeometry(0.03, doorH * 0.38, rearL * 0.84);
    const winRRMesh = new THREE.Mesh(winRRGeom, this.materials.glass);
    winRRMesh.position.set(0, doorH * 0.48, -rearL * 0.5);
    this.rearRightDoor.add(winRRMesh);

    // Rear-Right Chrome Handle
    const handleRRGeom = new THREE.BoxGeometry(0.035, 0.025, 0.12);
    const handleRRMesh = new THREE.Mesh(handleRRGeom, this.materials.chrome);
    handleRRMesh.position.set(-0.045, 0.10, -rearL * 0.82);
    this.rearRightDoor.add(handleRRMesh);
    this.chassisGroup.add(this.rearRightDoor);

    // Store references in door objects
    this.doors.frontLeft.group = this.frontLeftDoor;
    this.doors.frontLeft.mesh = doorFLMesh;
    this.doors.frontRight.group = this.frontRightDoor;
    this.doors.frontRight.mesh = doorFRMesh;
    this.doors.rearLeft.group = this.rearLeftDoor;
    this.doors.rearLeft.mesh = doorRLMesh;
    this.doors.rearRight.group = this.rearRightDoor;
    this.doors.rearRight.mesh = doorRRMesh;

    // Backward compatibility aliases
    this.leftDoor = this.frontLeftDoor;
    this.rightDoor = this.frontRightDoor;
    this.doors.left = this.frontLeftDoor;
    this.doors.right = this.frontRightDoor;
  }

  buildBoot(width, height, length, posZ) {
    if (!this.hasBoot) return;
    this.bootGroup = new THREE.Group();
    this.bootGroup.position.set(0, 0.6, posZ + length * 0.5); // Hinge
    const bootMeshGeom = new THREE.BoxGeometry(width, height, length);
    const bootMesh = new THREE.Mesh(bootMeshGeom, this.materials.paint);
    bootMesh.position.set(0, 0, -length * 0.5);
    this.bootGroup.add(bootMesh);
    this.chassisGroup.add(this.bootGroup);

    this.boot.mesh = this.bootGroup;
    this.trunk = this.bootGroup; // Backward-compatibility alias
  }

  buildTrunk(width, height, length, posZ) {
    this.buildBoot(width, height, length, posZ);
  }

  buildWheels() {
    let wheelRadius = 0.35;
    let wheelWidth = 0.28;
    let trackWidth = 1.88;
    let wheelBase = 2.6;

    if (this.type === 'falcon_s1') {
      wheelRadius = 0.32;
      wheelWidth = 0.24;
      trackWidth = 1.76;
      wheelBase = 2.38;
    } else if (this.type === 'nova_x') {
      wheelRadius = 0.35;
      wheelWidth = 0.26;
      trackWidth = 1.88;
      wheelBase = 2.80;
    } else if (this.type === 'vortex_gt') {
      wheelRadius = 0.36;
      wheelWidth = 0.30;
      trackWidth = 1.94;
      wheelBase = 2.65;
    } else if (this.type === 'apex_r' || this.type === 'apex_gt') {
      wheelRadius = 0.36;
      wheelWidth = 0.34;
      trackWidth = 2.05;
      wheelBase = 2.70;
    } else if (this.type === 'titan_sport') {
      wheelRadius = 0.37;
      wheelWidth = 0.35;
      trackWidth = 2.08;
      wheelBase = 2.75;
    } else if (this.type === 'aero_roadster' || this.type === 'venom_spyder') {
      wheelRadius = 0.34;
      wheelWidth = 0.28;
      trackWidth = 1.86;
      wheelBase = 2.50;
    } else if (this.type === 'titan_4x4') {
      wheelRadius = 0.48;
      wheelWidth = 0.36;
      trackWidth = 2.1;
      wheelBase = 2.7;
    } else if (this.type === 'formula_r') {
      wheelRadius = 0.38;
      wheelWidth = 0.42;
      trackWidth = 2.15;
      wheelBase = 3.1;
    }

    const positions = [
      { x: trackWidth * 0.5, z: wheelBase * 0.5, isFront: true, isLeft: true },
      { x: -trackWidth * 0.5, z: wheelBase * 0.5, isFront: true, isLeft: false },
      { x: trackWidth * 0.5, z: -wheelBase * 0.5, isFront: false, isLeft: true },
      { x: -trackWidth * 0.5, z: -wheelBase * 0.5, isFront: false, isLeft: false }
    ];

    this.wheels = [];

    positions.forEach((pos) => {
      const wheelMount = new THREE.Group();
      wheelMount.position.set(pos.x, wheelRadius, pos.z);

      // Rotating hub
      const hubGroup = new THREE.Group();

      // Tire cylinder
      const tireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
      const tire = new THREE.Mesh(tireGeom, this.materials.tire);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      hubGroup.add(tire);

      // Rim spokes
      const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.68, wheelRadius * 0.68, wheelWidth + 0.01, 16);
      const rim = new THREE.Mesh(rimGeom, this.materials.chrome);
      rim.rotation.z = Math.PI / 2;
      hubGroup.add(rim);

      // Wheel hubcap / nuts
      const capGeom = new THREE.CylinderGeometry(wheelRadius * 0.2, wheelRadius * 0.2, wheelWidth + 0.03, 8);
      const cap = new THREE.Mesh(capGeom, this.materials.carbon);
      cap.rotation.z = Math.PI / 2;
      hubGroup.add(cap);

      // Brake caliper (non-rotating)
      const caliperGeom = new THREE.BoxGeometry(0.08, wheelRadius * 0.45, wheelRadius * 0.3);
      const caliper = new THREE.Mesh(caliperGeom, this.materials.caliper);
      caliper.position.set(pos.isLeft ? -wheelWidth * 0.25 : wheelWidth * 0.25, wheelRadius * 0.35, 0);

      wheelMount.add(hubGroup, caliper);
      this.group.add(wheelMount);

      this.wheels.push({
        mount: wheelMount,
        hub: hubGroup,
        isFront: pos.isFront,
        isLeft: pos.isLeft,
        rotationAngle: 0
      });
    });
  }

  buildInterior() {
    // Cockpit steering wheel
    const steerGroup = new THREE.Group();
    steerGroup.position.set(0.38, 0.68, 0.42); // Left hand drive
    steerGroup.rotation.x = Math.PI / 6;

    const ringGeom = new THREE.TorusGeometry(0.18, 0.025, 8, 24);
    const ring = new THREE.Mesh(ringGeom, this.materials.interior);
    steerGroup.add(ring);

    const centerGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12);
    const center = new THREE.Mesh(centerGeom, this.materials.carbon);
    center.rotation.x = Math.PI / 2;
    steerGroup.add(center);

    this.steeringWheel = steerGroup;
    this.chassisGroup.add(steerGroup);

    // Build Complete 3-Mirror System (Left, Right, Rear-view)
    this.buildMirrors();
  }

  buildMirrors(width = null, height = 0.72, length = 0.75) {
    let effectiveWidth = width;
    if (effectiveWidth === null) {
      if (this.type === 'formula_r') effectiveWidth = 1.05;
      else if (this.type === 'titan_4x4') effectiveWidth = 2.15;
      else if (this.type === 'titan_sport') effectiveWidth = 2.05;
      else if (this.type === 'apex_r' || this.type === 'apex_gt') effectiveWidth = 2.02;
      else if (this.type === 'vortex_gt') effectiveWidth = 1.94;
      else if (this.type === 'falcon_s1') effectiveWidth = 1.76;
      else effectiveWidth = 1.88;
    }
    const halfW = effectiveWidth * 0.52;
    const hasRearView = this.type !== 'formula_r';

    // 1. LEFT SIDE MIRROR
    const leftMirrorGroup = new THREE.Group();
    leftMirrorGroup.position.set(halfW + 0.05, height, length);

    const housingGeom = new THREE.BoxGeometry(0.18, 0.10, 0.12);
    const housingL = new THREE.Mesh(housingGeom, this.materials.carbon || this.materials.paint);
    leftMirrorGroup.add(housingL);

    const glassGeom = new THREE.PlaneGeometry(0.16, 0.08);
    const glassL = new THREE.Mesh(glassGeom, this.materials.mirror);
    glassL.position.set(-0.01, 0, -0.062);
    glassL.rotation.y = Math.PI - 0.14;
    leftMirrorGroup.add(glassL);
    this.chassisGroup.add(leftMirrorGroup);

    // 2. RIGHT SIDE MIRROR
    const rightMirrorGroup = new THREE.Group();
    rightMirrorGroup.position.set(-halfW - 0.05, height, length);

    const housingR = new THREE.Mesh(housingGeom, this.materials.carbon || this.materials.paint);
    rightMirrorGroup.add(housingR);

    const glassR = new THREE.Mesh(glassGeom, this.materials.mirror);
    glassR.position.set(0.01, 0, -0.062);
    glassR.rotation.y = Math.PI + 0.14;
    rightMirrorGroup.add(glassR);
    this.chassisGroup.add(rightMirrorGroup);

    // 3. REAR-VIEW MIRROR (Central Windshield / Cockpit)
    let rearViewMirrorGroup = null;
    let housingRear = null;
    let glassRear = null;

    if (hasRearView) {
      rearViewMirrorGroup = new THREE.Group();
      rearViewMirrorGroup.position.set(0, height + 0.24, length - 0.07);

      const rvHousingGeom = new THREE.BoxGeometry(0.28, 0.08, 0.04);
      housingRear = new THREE.Mesh(rvHousingGeom, this.materials.carbon);
      rearViewMirrorGroup.add(housingRear);

      const rvGlassGeom = new THREE.PlaneGeometry(0.26, 0.065);
      glassRear = new THREE.Mesh(rvGlassGeom, this.materials.mirror);
      glassRear.position.set(0, 0, -0.022);
      glassRear.rotation.y = Math.PI;
      rearViewMirrorGroup.add(glassRear);
      this.chassisGroup.add(rearViewMirrorGroup);
    }

    this.mirrors = {
      left: {
        id: 'left',
        name: 'Left Side Mirror',
        group: leftMirrorGroup,
        housing: housingL,
        glass: glassL,
        supported: true
      },
      right: {
        id: 'right',
        name: 'Right Side Mirror',
        group: rightMirrorGroup,
        housing: housingR,
        glass: glassR,
        supported: true
      },
      rearView: {
        id: 'rearView',
        name: 'Rear-View Mirror',
        group: rearViewMirrorGroup,
        housing: housingRear,
        glass: glassRear,
        supported: hasRearView
      },
      supported: true
    };
  }

  buildLights() {
    // Dynamic Spotlights for realistic night driving
    const spotL = new THREE.SpotLight(0xffffff, 0, 70, Math.PI / 7, 0.35, 1.2);
    spotL.position.set(0.65, 0.45, 2.3);
    const targetL = new THREE.Object3D();
    targetL.position.set(0.65, 0, 30);
    this.chassisGroup.add(spotL, targetL);
    spotL.target = targetL;

    const spotR = new THREE.SpotLight(0xffffff, 0, 70, Math.PI / 7, 0.35, 1.2);
    spotR.position.set(-0.65, 0.45, 2.3);
    const targetR = new THREE.Object3D();
    targetR.position.set(-0.65, 0, 30);
    this.chassisGroup.add(spotR, targetR);
    spotR.target = targetR;

    this.headlights = [spotL, spotR];

    // Headlight glowing glass covers
    const hlGeom = new THREE.BoxGeometry(0.24, 0.1, 0.05);
    const hlMeshL = new THREE.Mesh(hlGeom, this.materials.headlightGlow);
    hlMeshL.position.set(0.65, 0.45, 2.3);
    const hlMeshR = new THREE.Mesh(hlGeom, this.materials.headlightGlow);
    hlMeshR.position.set(-0.65, 0.45, 2.3);
    this.chassisGroup.add(hlMeshL, hlMeshR);
    this.headlightMeshes = [hlMeshL, hlMeshR];

    // Taillights / Brake lights
    const tlGeom = new THREE.BoxGeometry(0.28, 0.08, 0.05);
    const tlMeshL = new THREE.Mesh(tlGeom, this.materials.taillightGlow);
    tlMeshL.position.set(0.68, 0.52, -2.15);
    const tlMeshR = new THREE.Mesh(tlGeom, this.materials.taillightGlow);
    tlMeshR.position.set(-0.68, 0.52, -2.15);
    this.chassisGroup.add(tlMeshL, tlMeshR);
    this.taillightMeshes = [tlMeshL, tlMeshR];

    // Turn Indicators (Front & Rear orange blinkers)
    const indGeom = new THREE.BoxGeometry(0.08, 0.06, 0.05);

    const indLF = new THREE.Mesh(indGeom, this.materials.indicatorGlow);
    indLF.position.set(0.85, 0.45, 2.25);
    const indLR = new THREE.Mesh(indGeom, this.materials.indicatorGlow);
    indLR.position.set(0.88, 0.52, -2.15);
    this.indicatorLeftMeshes = [indLF, indLR];
    this.chassisGroup.add(indLF, indLR);

    const indRF = new THREE.Mesh(indGeom, this.materials.indicatorGlow);
    indRF.position.set(-0.85, 0.45, 2.25);
    const indRR = new THREE.Mesh(indGeom, this.materials.indicatorGlow);
    indRR.position.set(-0.88, 0.52, -2.15);
    this.indicatorRightMeshes = [indRF, indRR];
    this.chassisGroup.add(indRF, indRR);

    // Hide indicator meshes by default
    [...this.indicatorLeftMeshes, ...this.indicatorRightMeshes].forEach(m => m.visible = false);
  }

  buildWipers() {
    const bladeGeom = new THREE.BoxGeometry(0.02, 0.42, 0.02);

    const wiperL = new THREE.Group();
    wiperL.position.set(0.3, 0.62, 0.95);
    wiperL.rotation.x = -Math.PI / 4;
    const bladeL = new THREE.Mesh(bladeGeom, this.materials.carbon);
    bladeL.position.set(0, 0.2, 0);
    wiperL.add(bladeL);

    const wiperR = new THREE.Group();
    wiperR.position.set(-0.25, 0.62, 0.95);
    wiperR.rotation.x = -Math.PI / 4;
    const bladeR = new THREE.Mesh(bladeGeom, this.materials.carbon);
    bladeR.position.set(0, 0.2, 0);
    wiperR.add(bladeR);

    this.chassisGroup.add(wiperL, wiperR);
    this.wipers.length = 0;
    this.wipers.push(wiperL, wiperR);
    this.wipers.blades = [wiperL, wiperR];
  }

  buildUnderglow() {
    this.underglowLight = new THREE.PointLight(0x00e5ff, 0, 4, 2);
    this.underglowLight.position.set(0, 0.15, 0);
    this.chassisGroup.add(this.underglowLight);
  }

  buildSmokeSystem() {
    this.smokePool = [];
    const geom = new THREE.SphereGeometry(0.2, 5, 5);
    this.smokeGroup = new THREE.Group();
    this.smokeGroup.name = 'tireSmokeEmitter';

    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xdddddd,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.visible = false;
      this.smokeGroup.add(mesh);
      this.smokePool.push({
        mesh,
        material: mat,
        life: 0,
        maxLife: 0.55,
        velocity: new THREE.Vector3(),
        active: false
      });
    }
    this.group.add(this.smokeGroup);
    this.smokeTimer = 0;
  }

  update(physics, dt = 0.016) {
    if (typeof physics === 'number') {
      dt = physics;
      physics = null;
    }

    if (physics && typeof physics === 'object') {
      // 1. POSITION
      if (physics.position) this.position.copy(physics.position);

      // 2. ROTATION
      this.rotation.copy(physics.rotation);
      this.quaternion.copy(physics.quaternion);
      this.heading = physics.heading;
      this.pitch = physics.pitch;
      this.roll = physics.roll;

      // 3. SPEED
      this.speed = physics.speed;
      this.speedKmh = physics.speedKmh;
      this.forwardSpeed = physics.forwardSpeed;
      this.lateralSpeed = physics.lateralSpeed;

      // 4. ACCELERATION
      this.acceleration.copy(physics.acceleration);
      this.accelerationRate = physics.accelerationRate;

      // 5. BRAKING
      this.braking = physics.braking !== undefined ? physics.braking : 0;
      this.isBraking = Math.abs(this.speedKmh) > 1 && physics.velocity.dot(physics.getForwardVector()) > 0 && this.gear !== 'R' && this.braking > 0.05;

      // 6. STEERING
      this.steerAngle = physics.steerAngle;
      this.steering = physics.maxSteerAngle > 0 ? (physics.steerAngle / physics.maxSteerAngle) : 0;

      // 7. GEAR
      this.currentGear = physics.currentGear;
      this.gear = physics.getGearName ? physics.getGearName() : (this.gearNames[this.currentGear] || '1');
      this.rpm = physics.rpm;

      // 8. HANDBRAKE
      this.handbrake = !!physics.handbrakeActive;
      this.isHandbrakeActive = this.handbrake;

      // 9. DRIVE TYPE
      this.driveType = physics.driveType || this.driveType;

      // 10. HEIGHT
      this.rideHeight = physics.rideHeight || this.rideHeight;
      this.groundHeight = physics.groundHeight || 0;
      this.isGrounded = physics.isGrounded !== undefined ? physics.isGrounded : true;

      // 11. HANDLING
      this.handling = physics.handling || this.handling;

      // Synchronize Visual Transforms
      this.group.position.copy(this.position);
      this.group.quaternion.copy(this.quaternion);
      this.chassisGroup.position.y = this.rideHeight;
      this.chassisGroup.rotation.x = physics.chassisPitch;
      this.chassisGroup.rotation.z = physics.chassisRoll;
    } else {
      this.group.position.copy(this.position);
      this.group.quaternion.copy(this.quaternion);
      this.chassisGroup.position.y = this.rideHeight;
    }

    // 3. Wheel steering, spinning & Handbrake Rear Lockup
    const speed = this.forwardSpeed;
    const wheelSpinRate = (speed / 0.35) * dt;

    this.wheels.forEach(w => {
      // Front wheels spin freely with road speed.
      // Rear wheels lock up when handbrake is active, dragging over the road!
      const spin = (w.isFront || !this.handbrake) ? wheelSpinRate : (wheelSpinRate * 0.04);
      w.rotationAngle += spin;
      w.hub.rotation.x = w.rotationAngle;
      if (w.isFront) {
        w.mount.rotation.y = this.steerAngle;
      }
    });

    // 4. Steering wheel in cockpit
    if (this.steeringWheel) {
      this.steeringWheel.rotation.z = -this.steerAngle * 2.8;
    }

    // 13. LIGHTS & Visual Brake Feedback (taillights illuminate on footbrake OR handbrake)
    this.lights.headlights = this.headlightsOn;
    this.lights.taillights = true;
    this.lights.brakeLights = this.isBraking || this.handbrake;
    this.lights.reverseLights = (this.gear === 'R');
    this.lights.underglow = !!(this.underglowLight && this.underglowLight.intensity > 0);

    const brakeIntensity = (this.isBraking || this.handbrake) ? 2.5 : 0.4;
    this.materials.taillightGlow.emissiveIntensity = brakeIntensity;
    this.materials.taillightGlow.emissive.setHex((this.isBraking || this.handbrake) ? 0xff0000 : 0x440000);

    // Visual Tire Smoke & Skid Particle System
    if (this.smokePool && this.smokePool.length > 0) {
      const isSlidingWithHandbrake = this.handbrake && Math.abs(this.speedKmh) > 5;
      const isDriftSliding = physics && physics.slipRatio > 0.52 && Math.abs(this.speedKmh) > 10;
      const shouldEmitSmoke = isSlidingWithHandbrake || isDriftSliding;

      this.smokeTimer = (this.smokeTimer || 0) + dt;
      if (shouldEmitSmoke && this.smokeTimer >= 0.045) {
        this.smokeTimer = 0;
        const rearWheels = this.wheels.filter(w => !w.isFront);
        rearWheels.forEach(w => {
          const particle = this.smokePool.find(p => !p.active);
          if (particle) {
            particle.active = true;
            particle.life = 0;
            particle.maxLife = 0.42 + Math.random() * 0.2;
            particle.mesh.visible = true;
            particle.mesh.position.set(
              w.mount.position.x + (Math.random() - 0.5) * 0.12,
              w.mount.position.y * 0.35,
              w.mount.position.z - 0.15
            );
            particle.velocity.set(
              (Math.random() - 0.5) * 0.6,
              0.55 + Math.random() * 0.5,
              -Math.sign(speed || 1) * (0.8 + Math.random() * 0.8)
            );
            particle.mesh.scale.setScalar(0.4);
            particle.material.opacity = 0.45;
          }
        });
      }

      // Step active smoke particles
      this.smokePool.forEach(p => {
        if (!p.active) return;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          p.mesh.visible = false;
          p.material.opacity = 0;
        } else {
          p.mesh.position.addScaledVector(p.velocity, dt);
          const progress = p.life / p.maxLife;
          p.mesh.scale.setScalar(0.5 + progress * 2.2);
          p.material.opacity = (1 - progress) * 0.42;
        }
      });
    }

    // 14. INDICATORS blinking (Realistic 1.5 Hz interval, 90 flashes/min) & Auto Turn Cancellation
    const anyIndicatorActive = this.leftIndicatorOn || this.rightIndicatorOn || this.hazardOn;
    if (anyIndicatorActive) {
      this.indicatorBlinkTimer += dt;
      if (this.indicatorBlinkTimer >= this.indicatorBlinkRate) {
        this.indicatorBlinkTimer = 0;
        this.indicatorBlinkState = !this.indicatorBlinkState;
      }
    } else {
      this.indicatorBlinkTimer = 0;
      this.indicatorBlinkState = false;
    }

    // Auto-cancellation after completing a turn (Left / Right, never Hazard)
    if (!this.hazardOn && (this.leftIndicatorOn || this.rightIndicatorOn)) {
      const steer = this.steerAngle;
      const speed = Math.abs(this.forwardSpeed);

      if (this.leftIndicatorOn) {
        // Step 1: Detect turn engagement
        if (steer < -0.10) {
          this.turnEngaged = true;
          this.turnPeakSteer = Math.min(this.turnPeakSteer || 0, steer);
        }
        // Step 2: Detect turn completion when wheel straightens back towards center
        if (this.turnEngaged && this.turnPeakSteer < -0.14 && steer >= -0.035 && speed > 0.4) {
          this.turnOffIndicators();
          this.turnCancelledStalk = true;
          this.turnEngaged = false;
          this.turnPeakSteer = 0;
        }
      } else if (this.rightIndicatorOn) {
        // Step 1: Detect turn engagement
        if (steer > 0.10) {
          this.turnEngaged = true;
          this.turnPeakSteer = Math.max(this.turnPeakSteer || 0, steer);
        }
        // Step 2: Detect turn completion when wheel straightens back towards center
        if (this.turnEngaged && this.turnPeakSteer > 0.14 && steer <= 0.035 && speed > 0.4) {
          this.turnOffIndicators();
          this.turnCancelledStalk = true;
          this.turnEngaged = false;
          this.turnPeakSteer = 0;
        }
      }
    } else {
      this.turnEngaged = false;
      this.turnPeakSteer = 0;
    }

    this.indicators.left = this.leftIndicatorOn;
    this.indicators.right = this.rightIndicatorOn;
    this.indicators.hazard = this.hazardOn;
    this.indicators.blinking = this.indicatorBlinkState;

    const showLeft = (this.leftIndicatorOn || this.hazardOn) && this.indicatorBlinkState;
    const showRight = (this.rightIndicatorOn || this.hazardOn) && this.indicatorBlinkState;

    this.indicatorLeftMeshes.forEach(m => m.visible = showLeft);
    this.indicatorRightMeshes.forEach(m => m.visible = showRight);

    // 15. WIPERS animation
    if (this.wipersActive) {
      this.wiperAngle = Math.sin(Date.now() * 0.006) * 0.75;
      this.wipers.forEach(w => w.rotation.z = this.wiperAngle);
    } else {
      this.wipers.forEach(w => w.rotation.z = MathUtils.damp(w.rotation.z, -0.65, 8, dt));
    }
    this.wipers.active = this.wipersActive;
    this.wipers.angle = this.wiperAngle;

    // 16. DOORS ANIMATION (Smooth per-door damped transitions for all 4 doors)
    const doorKeys = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'];
    let sumProgress = 0;
    let anyDoorOpen = false;

    for (const key of doorKeys) {
      const door = this.doors[key];
      if (!door) continue;

      if (door.isOpen) anyDoorOpen = true;

      const target = door.isOpen ? 1.0 : 0.0;
      door.targetProgress = target;
      door.progress = MathUtils.damp(door.progress, target, 5.0, dt);
      if (Math.abs(door.progress - target) < 0.005) {
        door.progress = target;
      }
      sumProgress += door.progress;

      if (door.group) {
        if (door.type === 'scissor' || (this.isScissorDoor && !door.isRear)) {
          // Dihedral scissor doors swing upward and slightly outward
          const mult = door.side === 'left' ? 1 : -1;
          door.group.rotation.x = -door.progress * 0.95;
          door.group.rotation.y = mult * door.progress * 0.25;
          door.group.rotation.z = mult * door.progress * 0.12;
        } else {
          // Standard outward swinging door around Y-axis
          door.group.rotation.y = door.progress * door.maxAngle;
        }
      }
    }

    this.doorAnimProgress = sumProgress / 4;
    this.doors.progress = this.doorAnimProgress;
    this.doors.isOpen = anyDoorOpen;
    this.doorsOpen = anyDoorOpen;

    // 17. BOOT / TRUNK animation (Smooth damped angular interpolation)
    const targetBootProgress = this.bootOpen ? 1.0 : 0.0;
    this.bootAnimProgress = MathUtils.damp(this.bootAnimProgress, targetBootProgress, 5.0, dt);
    if (Math.abs(this.bootAnimProgress - targetBootProgress) < 0.005) {
      this.bootAnimProgress = targetBootProgress;
    }
    this.trunkAnimProgress = this.bootAnimProgress;
    this.boot.isOpen = this.bootOpen;
    this.boot.progress = this.bootAnimProgress;

    const bootTarget = this.bootGroup || this.trunk || (this.boot ? this.boot.mesh : null);
    if (bootTarget) {
      bootTarget.rotation.x = this.bootAnimProgress === 0 ? 0 : -this.bootAnimProgress * 0.9;
    }

    // CONVERTIBLE ROOF animation (Smooth folding kinematics into rear deck)
    if (this.isConvertible) {
      const targetRoof = this.roofOpen ? 1.0 : 0.0;
      this.roofAnimProgress = MathUtils.damp(this.roofAnimProgress, targetRoof, 3.5, dt);
      if (Math.abs(this.roofAnimProgress - targetRoof) < 0.005) {
        this.roofAnimProgress = targetRoof;
      }
      if (this.roof) {
        this.roof.isOpen = this.roofOpen;
        this.roof.progress = this.roofAnimProgress;
      }

      if (this.roofGroup) {
        this.roofGroup.rotation.x = this.roofAnimProgress === 0 ? 0 : this.roofAnimProgress * 1.85;
        this.roofGroup.position.y = 0.55 - this.roofAnimProgress * 0.35;
        this.roofGroup.position.z = -0.65 - this.roofAnimProgress * 0.45;
        this.roofGroup.scale.setScalar(1.0 - this.roofAnimProgress * 0.2);
      }
    }
  }

  // ==========================================
  // UNIFIED 18-NODE VEHICLE SYSTEM API
  // ==========================================

  // 1. POSITION
  getPosition() {
    return this.position;
  }

  setPosition(x, y, z) {
    if (typeof x === 'object' && x !== null) {
      this.position.copy(x);
    } else {
      this.position.set(x, y, z);
    }
    this.group.position.copy(this.position);
    return this.position;
  }

  // 2. ROTATION
  getRotation() {
    return this.rotation;
  }

  setRotation(x, y, z) {
    if (typeof x === 'object' && x !== null) {
      this.rotation.copy(x);
    } else {
      this.rotation.set(x, y, z);
    }
    this.quaternion.setFromEuler(this.rotation);
    this.group.quaternion.copy(this.quaternion);
    this.heading = this.rotation.y;
    return this.rotation;
  }

  // 3. SPEED
  getSpeed() {
    return this.speed;
  }

  getSpeedKmh() {
    return this.speedKmh;
  }

  // 4. ACCELERATION
  getAcceleration() {
    return this.accelerationRate;
  }

  getAccelerationVector() {
    return this.acceleration;
  }

  // 5. BRAKING
  getBraking() {
    return this.braking;
  }

  isBrakingActive() {
    return this.isBraking;
  }

  // 6. STEERING
  getSteering() {
    return this.steerAngle;
  }

  getSteeringNormalized() {
    return this.steering;
  }

  // 7. GEAR
  getGear() {
    return this.gear;
  }

  getCurrentGearIndex() {
    return this.currentGear;
  }

  // 8. HANDBRAKE
  isHandbrakeEngaged() {
    return this.handbrake;
  }

  setHandbrake(state) {
    this.handbrake = !!state;
    this.isHandbrakeActive = this.handbrake;
    return this.handbrake;
  }

  // 9. DRIVE TYPE
  getDriveType() {
    return this.driveType;
  }

  // 10. HEIGHT
  getHeight() {
    return this.height;
  }

  getRideHeight() {
    return this.rideHeight;
  }

  setRideHeightOffset(offset) {
    this.rideHeightOffset = offset;
    this.rideHeight = (this.baseRideHeight || 0.14) + offset;
    if (this.chassisGroup) {
      this.chassisGroup.position.y = offset;
    }
    if (this.physics) {
      this.physics.rideHeight = this.rideHeight;
    }
    return this.rideHeight;
  }

  // 11. HANDLING
  getHandling() {
    return this.handling;
  }

  setHandlingSetting(sportRatio) {
    this.handlingSportRatio = Math.max(0, Math.min(1, sportRatio));
    const base = this.baseHandling || { grip: 1.0, downforce: 1.0, steeringSpeed: 3.5, driftControl: 0.35, suspensionStiffness: 1.0 };

    // Interpolate between STABLE (0.0) and SPORT (1.0)
    const r = this.handlingSportRatio;
    this.handling.grip = THREE.MathUtils.lerp(base.grip * 1.15, base.grip * 0.95, r);
    this.handling.downforce = THREE.MathUtils.lerp(base.downforce * 0.9, base.downforce * 1.3, r);
    this.handling.steeringSpeed = THREE.MathUtils.lerp(base.steeringSpeed * 0.85, base.steeringSpeed * 1.3, r);
    this.handling.driftControl = THREE.MathUtils.lerp(base.driftControl * 0.7, base.driftControl * 1.4, r);
    this.handling.suspensionStiffness = THREE.MathUtils.lerp(base.suspensionStiffness * 0.85, base.suspensionStiffness * 1.25, r);

    if (this.physics && this.physics.handling) {
      Object.assign(this.physics.handling, this.handling);
      this.physics.steerSpeed = this.handling.steeringSpeed;
    }
    return this.handling;
  }

  // DRIVE CONFIGURATION
  setDriveType(type) {
    this.driveType = type;
    if (this.physics) {
      this.physics.driveType = type;
    }
    if (this.statistics) {
      this.statistics.driveType = type;
    }
    return this.driveType;
  }

  // VEHICLE STATISTICS
  getStatistics() {
    return {
      name: this.name,
      type: this.type,
      topSpeed: this.statistics.topSpeed,
      acceleration: this.statistics.acceleration,
      braking: this.statistics.braking,
      handling: this.statistics.handling,
      driveType: this.statistics.driveType || this.driveType,
      weight: this.statistics.weight
    };
  }

  // 12. COLOUR
  getColour() {
    return this.colour;
  }

  getColor() {
    return this.colour;
  }

  setColour(hexColor) {
    this.colour = hexColor;
    if (this.materials.paint) {
      this.materials.paint.color.set(hexColor);
    }
    return this.colour;
  }

  setColor(hexColor) {
    return this.setColour(hexColor);
  }

  setPaintColor(hexColor) {
    return this.setColour(hexColor);
  }

  setRimColor(hexColor) {
    if (this.materials.chrome) {
      this.materials.chrome.color.set(hexColor);
    }
  }

  setCaliperColor(hexColor) {
    if (this.materials.caliper) {
      this.materials.caliper.color.set(hexColor);
    }
  }

  // 13. LIGHTS
  getLights() {
    return this.lights;
  }

  toggleHeadlights() {
    this.headlightsOn = !this.headlightsOn;
    this.lights.headlights = this.headlightsOn;
    this.headlights.forEach(h => h.intensity = this.headlightsOn ? 120 : 0);
    this.materials.headlightGlow.color.setHex(this.headlightsOn ? 0xffffff : 0x445566);
    return this.headlightsOn;
  }

  setHeadlights(on) {
    this.headlightsOn = !!on;
    this.lights.headlights = this.headlightsOn;
    this.headlights.forEach(h => h.intensity = this.headlightsOn ? 120 : 0);
    this.materials.headlightGlow.color.setHex(this.headlightsOn ? 0xffffff : 0x445566);
    return this.headlightsOn;
  }

  setUnderglow(color, intensity = 2.5) {
    if (this.underglowLight) {
      this.underglowLight.color.set(color);
      this.underglowLight.intensity = intensity;
      this.lights.underglow = intensity > 0;
    }
  }

  // 14. INDICATORS SYSTEM (LEFT, RIGHT, HAZARD, OFF)
  getIndicators() {
    return this.indicators;
  }

  getIndicatorState() {
    if (this.hazardOn) return 'HAZARD';
    if (this.leftIndicatorOn) return 'LEFT';
    if (this.rightIndicatorOn) return 'RIGHT';
    return 'OFF';
  }

  setIndicatorState(state) {
    const s = String(state || 'OFF').toUpperCase().trim();
    if (s === 'LEFT') {
      this.leftIndicatorOn = true;
      this.rightIndicatorOn = false;
      this.hazardOn = false;
    } else if (s === 'RIGHT') {
      this.rightIndicatorOn = true;
      this.leftIndicatorOn = false;
      this.hazardOn = false;
    } else if (s === 'HAZARD') {
      this.hazardOn = true;
      this.leftIndicatorOn = false;
      this.rightIndicatorOn = false;
    } else {
      // OFF
      this.leftIndicatorOn = false;
      this.rightIndicatorOn = false;
      this.hazardOn = false;
    }

    this.turnEngaged = false;
    this.turnPeakSteer = 0;
    this.indicators.left = this.leftIndicatorOn;
    this.indicators.right = this.rightIndicatorOn;
    this.indicators.hazard = this.hazardOn;
    return this.getIndicatorState();
  }

  turnOffIndicators() {
    return this.setIndicatorState('OFF');
  }

  toggleLeftIndicator() {
    if (this.leftIndicatorOn) {
      return this.setIndicatorState('OFF');
    } else {
      return this.setIndicatorState('LEFT');
    }
  }

  toggleRightIndicator() {
    if (this.rightIndicatorOn) {
      return this.setIndicatorState('OFF');
    } else {
      return this.setIndicatorState('RIGHT');
    }
  }

  toggleHazard() {
    if (this.hazardOn) {
      return this.setIndicatorState('OFF');
    } else {
      return this.setIndicatorState('HAZARD');
    }
  }

  // 15. WIPERS
  getWipers() {
    return this.wipers;
  }

  toggleWipers() {
    this.wipersActive = !this.wipersActive;
    this.wipers.active = this.wipersActive;
    return this.wipersActive;
  }

  setWipers(on) {
    this.wipersActive = !!on;
    this.wipers.active = this.wipersActive;
    return this.wipersActive;
  }

  // 16. DOOR SYSTEM (FRONT-LEFT, FRONT-RIGHT, REAR-LEFT, REAR-RIGHT)
  normalizeDoorKey(key) {
    if (!key) return null;
    const k = String(key).toLowerCase().replace(/[-_\s]/g, '');
    if (k === 'frontleft' || k === 'fl' || k === 'doorfl' || k === 'leftfront') return 'frontLeft';
    if (k === 'frontright' || k === 'fr' || k === 'doorfr' || k === 'rightfront') return 'frontRight';
    if (k === 'rearleft' || k === 'rl' || k === 'doorrl' || k === 'leftrear' || k === 'backleft') return 'rearLeft';
    if (k === 'rearright' || k === 'rr' || k === 'doorrr' || k === 'rightrear' || k === 'backright') return 'rearRight';
    if (k === 'left' || k === 'driver') return 'frontLeft';
    if (k === 'right' || k === 'passenger') return 'frontRight';
    return null;
  }

  isDoorSupported(key) {
    if (!this.hasDoors) return false;
    const norm = this.normalizeDoorKey(key);
    return Boolean(norm && this.doors[norm] && this.doors[norm].supported);
  }

  openDoor(key) {
    const norm = this.normalizeDoorKey(key);
    if (!norm || !this.doors[norm] || !this.doors[norm].supported) return false;
    const door = this.doors[norm];
    door.isOpen = true;
    door.targetProgress = 1.0;
    this.updateGlobalDoorStatus();
    return true;
  }

  closeDoor(key) {
    const norm = this.normalizeDoorKey(key);
    if (!norm || !this.doors[norm] || !this.doors[norm].supported) return false;
    const door = this.doors[norm];
    door.isOpen = false;
    door.targetProgress = 0.0;
    this.updateGlobalDoorStatus();
    return false;
  }

  toggleDoor(key) {
    const norm = this.normalizeDoorKey(key);
    if (!norm || !this.doors[norm] || !this.doors[norm].supported) return false;
    if (this.doors[norm].isOpen) {
      this.closeDoor(norm);
      return false;
    } else {
      this.openDoor(norm);
      return true;
    }
  }

  getDoorState(key) {
    const norm = this.normalizeDoorKey(key);
    if (!norm || !this.doors[norm]) return null;
    const d = this.doors[norm];
    return {
      id: d.id,
      name: d.name,
      isOpen: d.isOpen,
      progress: d.progress,
      targetProgress: d.targetProgress,
      angle: d.group ? (d.group.rotation.y || d.group.rotation.x || 0) : 0,
      supported: !!d.supported,
      type: d.type
    };
  }

  getAllDoorStates() {
    const keys = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'];
    const result = {};
    let allOpen = true;
    let anyOpen = false;
    for (const k of keys) {
      const state = this.getDoorState(k);
      result[k] = state;
      if (state && state.supported) {
        if (state.isOpen) anyOpen = true;
        else allOpen = false;
      }
    }
    result.anyOpen = anyOpen;
    result.allOpen = anyOpen && allOpen;
    return result;
  }

  // Front-Left Door Methods
  openFrontLeftDoor() { return this.openDoor('frontLeft'); }
  closeFrontLeftDoor() { return this.closeDoor('frontLeft'); }
  toggleFrontLeftDoor() { return this.toggleDoor('frontLeft'); }

  // Front-Right Door Methods
  openFrontRightDoor() { return this.openDoor('frontRight'); }
  closeFrontRightDoor() { return this.closeDoor('frontRight'); }
  toggleFrontRightDoor() { return this.toggleDoor('frontRight'); }

  // Rear-Left Door Methods
  openRearLeftDoor() { return this.openDoor('rearLeft'); }
  closeRearLeftDoor() { return this.closeDoor('rearLeft'); }
  toggleRearLeftDoor() { return this.toggleDoor('rearLeft'); }

  // Rear-Right Door Methods
  openRearRightDoor() { return this.openDoor('rearRight'); }
  closeRearRightDoor() { return this.closeDoor('rearRight'); }
  toggleRearRightDoor() { return this.toggleDoor('rearRight'); }

  // Global All-Door Operations
  openAllDoors() {
    ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'].forEach(k => this.openDoor(k));
    return true;
  }

  closeAllDoors() {
    ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'].forEach(k => this.closeDoor(k));
    return false;
  }

  toggleAllDoors() {
    if (this.doors.isOpen) {
      return this.closeAllDoors();
    } else {
      return this.openAllDoors();
    }
  }

  updateGlobalDoorStatus() {
    const anyOpen = Boolean(
      (this.doors.frontLeft && this.doors.frontLeft.isOpen) ||
      (this.doors.frontRight && this.doors.frontRight.isOpen) ||
      (this.doors.rearLeft && this.doors.rearLeft.isOpen) ||
      (this.doors.rearRight && this.doors.rearRight.isOpen)
    );
    this.doorsOpen = anyOpen;
    this.doors.isOpen = anyOpen;
  }

  getDoors() {
    return this.doors;
  }

  toggleDoors() {
    return this.toggleAllDoors();
  }

  openDoors() {
    return this.openAllDoors();
  }

  closeDoors() {
    return this.closeAllDoors();
  }

  // 17. BOOT / TRUNK SYSTEM (OPEN BOOT, CLOSE BOOT, TOGGLE BOOT)
  isBootSupported() {
    return Boolean(this.hasBoot && this.type !== 'formula_r');
  }

  isTrunkSupported() {
    return this.isBootSupported();
  }

  getBoot() {
    return this.boot;
  }

  getBootState() {
    return {
      isOpen: Boolean(this.bootOpen),
      progress: this.bootAnimProgress,
      supported: this.isBootSupported()
    };
  }

  openBoot() {
    if (!this.isBootSupported()) return false;
    this.bootOpen = true;
    this.trunkOpen = true;
    this.boot.isOpen = true;
    return true;
  }

  closeBoot() {
    if (!this.isBootSupported()) return false;
    this.bootOpen = false;
    this.trunkOpen = false;
    this.boot.isOpen = false;
    return false;
  }

  toggleBoot() {
    if (!this.isBootSupported()) return false;
    if (this.bootOpen) {
      return this.closeBoot();
    } else {
      return this.openBoot();
    }
  }

  openTrunk() {
    return this.openBoot();
  }

  closeTrunk() {
    return this.closeBoot();
  }

  toggleTrunk() {
    return this.toggleBoot();
  }

  // 18. CAMERA
  getCamera(mode = 'chase') {
    return this.camera[mode] || this.camera.chase;
  }

  getCameraConfig(mode = 'chase') {
    return this.camera[mode] || this.camera.chase;
  }

  // CONVERTIBLE ROOF SYSTEM (OPEN ROOF, CLOSE ROOF, TOGGLE ROOF)
  isConvertibleVehicle() {
    return Boolean(this.isConvertible);
  }

  isRoofSupported() {
    return Boolean(this.isConvertible);
  }

  openRoof() {
    if (!this.isConvertible) return false;
    this.roofOpen = true;
    if (this.roof) this.roof.isOpen = true;
    return true;
  }

  closeRoof() {
    if (!this.isConvertible) return false;
    this.roofOpen = false;
    if (this.roof) this.roof.isOpen = false;
    return false;
  }

  toggleRoof() {
    if (!this.isConvertible) return false;
    if (this.roofOpen) {
      return this.closeRoof();
    } else {
      return this.openRoof();
    }
  }

  getRoofState() {
    return {
      isOpen: Boolean(this.roofOpen),
      progress: this.roofAnimProgress,
      isConvertible: Boolean(this.isConvertible),
      supported: Boolean(this.isConvertible)
    };
  }

  // MIRROR SYSTEM (Left side mirror, Right side mirror, Rear-view mirror)
  isMirrorSupported(type = 'all') {
    if (!this.mirrors) return false;
    if (type === 'left') return Boolean(this.mirrors.left && this.mirrors.left.supported);
    if (type === 'right') return Boolean(this.mirrors.right && this.mirrors.right.supported);
    if (type === 'rearView' || type === 'rear') return Boolean(this.mirrors.rearView && this.mirrors.rearView.supported);
    return Boolean(this.mirrors.supported);
  }

  getMirrors() {
    return this.mirrors;
  }

  getMirrorState() {
    return {
      supported: this.isMirrorSupported('all'),
      left: this.isMirrorSupported('left'),
      right: this.isMirrorSupported('right'),
      rearView: this.isMirrorSupported('rearView')
    };
  }

  setMirrorMaterial(material) {
    if (!material || !this.mirrors) return;
    if (this.mirrors.left && this.mirrors.left.glass) {
      this.mirrors.left.glass.material = material;
    }
    if (this.mirrors.right && this.mirrors.right.glass) {
      this.mirrors.right.glass.material = material;
    }
    if (this.mirrors.rearView && this.mirrors.rearView.glass) {
      this.mirrors.rearView.glass.material = material;
    }
  }

  toggleSportMode() {
    this.isSportMode = !this.isSportMode;
    if (this.physics && typeof this.physics.toggleSportMode === 'function') {
      this.physics.isSportMode = this.isSportMode;
    }
    return this.isSportMode;
  }

  destroy() {
    this.scene.remove(this.group);
    Object.values(this.materials).forEach(mat => mat.dispose && mat.dispose());
  }
}
