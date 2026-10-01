import * as THREE from 'three';
import { Vehicle } from './Vehicle.js';
import { VehiclePhysics } from './VehiclePhysics.js';
import { VehicleController } from './VehicleController.js';
import { VehicleCustomization } from './VehicleCustomization.js';

export const VEHICLE_CATALOG = [
  {
    id: 'falcon_s1',
    name: 'Falcon S1',
    category: 'Compact Car',
    description: 'Agile turbocharged hot-hatch with quick turn-in, lightweight chassis, and responsive urban handling.',
    height: 1.42,
    rideHeight: 0.16,
    driveType: 'FWD',
    colour: 0x00c4cc,
    handling: {
      grip: 1.02,
      downforce: 0.75,
      steeringSpeed: 4.0,
      driftControl: 0.28,
      suspensionStiffness: 1.05
    },
    camera: {
      cockpit: { offset: { x: 0.35, y: 1.05, z: 0.1 }, lookOffset: { x: 0.35, y: 1.0, z: 20 }, fov: 66 },
      hood: { offset: { x: 0, y: 0.92, z: 1.15 }, lookOffset: { x: 0, y: 0.85, z: 30 }, fov: 65 },
      bumper: { offset: { x: 0, y: 0.38, z: 1.9 }, lookOffset: { x: 0, y: 0.32, z: 30 }, fov: 65 },
      chase: { distance: 5.8, height: 2.1, lookHeight: 1.0, fov: 65 },
      orbit: { distance: 6.2, height: 1.3 }
    },
    displayStats: {
      topSpeed: '240 km/h',
      acceleration: '7.8/10',
      braking: '8.2/10',
      handling: '9.0/10',
      driveType: 'FWD',
      weight: '1,240 kg'
    },
    stats: {
      speed: 76,
      acceleration: 78,
      handling: 90,
      braking: 82
    },
    specs: {
      topSpeed: '240 km/h',
      acceleration: '7.8/10',
      zeroToHundred: '4.9s',
      handling: '9.0/10',
      braking: '8.2/10',
      driveType: 'FWD',
      weight: '1,240 kg',
      power: '310 HP'
    },
    physicsConfig: {
      mass: 1240,
      maxSpeed: 240,
      enginePower: 310,
      brakeForce: 34,
      driveType: 'FWD',
      rideHeight: 0.16,
      handling: {
        grip: 1.02,
        downforce: 0.75,
        steeringSpeed: 4.0,
        driftControl: 0.28,
        suspensionStiffness: 1.05
      }
    },
    supportedCustomization: {
      colour: true,
      wheelAppearance: true,
      rideHeight: true,
      handling: true,
      driveConfig: true,
      allowedDrives: ['FWD', 'AWD']
    }
  },
  {
    id: 'nova_x',
    name: 'Nova X',
    category: 'Sedan',
    description: 'Premium high-performance sports executive sedan offering smooth long-wheelbase poise and twin-turbo torque.',
    height: 1.45,
    rideHeight: 0.16,
    driveType: 'AWD',
    colour: 0x1f3c88,
    handling: {
      grip: 1.08,
      downforce: 0.9,
      steeringSpeed: 3.6,
      driftControl: 0.38,
      suspensionStiffness: 1.15
    },
    camera: {
      cockpit: { offset: { x: 0.38, y: 1.08, z: 0.2 }, lookOffset: { x: 0.38, y: 1.02, z: 20 }, fov: 66 },
      hood: { offset: { x: 0, y: 0.92, z: 1.35 }, lookOffset: { x: 0, y: 0.84, z: 30 }, fov: 65 },
      bumper: { offset: { x: 0, y: 0.40, z: 2.25 }, lookOffset: { x: 0, y: 0.35, z: 30 }, fov: 65 },
      chase: { distance: 6.4, height: 2.2, lookHeight: 1.05, fov: 65 },
      orbit: { distance: 6.8, height: 1.4 }
    },
    displayStats: {
      topSpeed: '280 km/h',
      acceleration: '8.4/10',
      braking: '8.6/10',
      handling: '8.5/10',
      driveType: 'AWD',
      weight: '1,680 kg'
    },
    stats: {
      speed: 84,
      acceleration: 84,
      handling: 85,
      braking: 86
    },
    specs: {
      topSpeed: '280 km/h',
      acceleration: '8.4/10',
      zeroToHundred: '3.6s',
      handling: '8.5/10',
      braking: '8.6/10',
      driveType: 'AWD',
      weight: '1,680 kg',
      power: '480 HP'
    },
    physicsConfig: {
      mass: 1680,
      maxSpeed: 280,
      enginePower: 480,
      brakeForce: 36,
      driveType: 'AWD',
      rideHeight: 0.16,
      handling: {
        grip: 1.08,
        downforce: 0.9,
        steeringSpeed: 3.6,
        driftControl: 0.38,
        suspensionStiffness: 1.15
      }
    },
    supportedCustomization: {
      colour: true,
      wheelAppearance: true,
      rideHeight: true,
      handling: true,
      driveConfig: true,
      allowedDrives: ['AWD', 'RWD']
    }
  },
  {
    id: 'vortex_gt',
    name: 'Vortex GT',
    category: 'Sports Coupe',
    description: 'Dynamic front-engine rear-wheel-drive grand tourer combining aggressive muscular proportions with sublime cornering balance.',
    height: 1.32,
    rideHeight: 0.14,
    driveType: 'RWD',
    colour: 0xe65100,
    handling: {
      grip: 1.12,
      downforce: 1.05,
      steeringSpeed: 4.1,
      driftControl: 0.52,
      suspensionStiffness: 1.2
    },
    camera: {
      cockpit: { offset: { x: 0.36, y: 0.98, z: 0.18 }, lookOffset: { x: 0.36, y: 0.92, z: 20 }, fov: 68 },
      hood: { offset: { x: 0, y: 0.86, z: 1.3 }, lookOffset: { x: 0, y: 0.76, z: 30 }, fov: 65 },
      bumper: { offset: { x: 0, y: 0.36, z: 2.2 }, lookOffset: { x: 0, y: 0.32, z: 30 }, fov: 65 },
      chase: { distance: 6.2, height: 2.05, lookHeight: 0.95, fov: 65 },
      orbit: { distance: 6.6, height: 1.3 }
    },
    displayStats: {
      topSpeed: '305 km/h',
      acceleration: '8.9/10',
      braking: '8.7/10',
      handling: '8.8/10',
      driveType: 'RWD',
      weight: '1,530 kg'
    },
    stats: {
      speed: 89,
      acceleration: 89,
      handling: 88,
      braking: 87
    },
    specs: {
      topSpeed: '305 km/h',
      acceleration: '8.9/10',
      zeroToHundred: '3.3s',
      handling: '8.8/10',
      braking: '8.7/10',
      driveType: 'RWD',
      weight: '1,530 kg',
      power: '580 HP'
    },
    physicsConfig: {
      mass: 1530,
      maxSpeed: 305,
      enginePower: 580,
      brakeForce: 37,
      driveType: 'RWD',
      rideHeight: 0.14,
      handling: {
        grip: 1.12,
        downforce: 1.05,
        steeringSpeed: 4.1,
        driftControl: 0.52,
        suspensionStiffness: 1.2
      }
    },
    supportedCustomization: {
      colour: true,
      wheelAppearance: true,
      rideHeight: true,
      handling: true,
      driveConfig: true,
      allowedDrives: ['RWD', 'AWD']
    }
  },
  {
    id: 'apex_r',
    name: 'Apex R',
    category: 'Supercar',
    description: 'Ultra-aerodynamic mid-engine hypercar with active swan-neck wing, scissor dihedral doors, and blistering track pace.',
    height: 1.22,
    rideHeight: 0.12,
    driveType: 'AWD',
    colour: 0xcc1111,
    handling: {
      grip: 1.22,
      downforce: 1.35,
      steeringSpeed: 4.5,
      driftControl: 0.42,
      suspensionStiffness: 1.35
    },
    camera: {
      cockpit: { offset: { x: 0.38, y: 0.95, z: 0.2 }, lookOffset: { x: 0.38, y: 0.9, z: 20 }, fov: 68 },
      hood: { offset: { x: 0, y: 0.82, z: 1.3 }, lookOffset: { x: 0, y: 0.72, z: 30 }, fov: 65 },
      bumper: { offset: { x: 0, y: 0.35, z: 2.2 }, lookOffset: { x: 0, y: 0.3, z: 30 }, fov: 65 },
      chase: { distance: 6.2, height: 2.05, lookHeight: 0.9, fov: 65 },
      orbit: { distance: 6.8, height: 1.3 }
    },
    displayStats: {
      topSpeed: '310 km/h',
      acceleration: '9.2/10',
      braking: '8.8/10',
      handling: '8.6/10',
      driveType: 'AWD',
      weight: '1,380 kg'
    },
    stats: {
      speed: 90,
      acceleration: 92,
      handling: 86,
      braking: 88
    },
    specs: {
      topSpeed: '310 km/h',
      acceleration: '9.2/10',
      zeroToHundred: '2.8s',
      handling: '8.6/10',
      braking: '8.8/10',
      driveType: 'AWD',
      weight: '1,380 kg',
      power: '780 HP'
    },
    physicsConfig: {
      mass: 1380,
      maxSpeed: 310,
      enginePower: 780,
      brakeForce: 42,
      driveType: 'AWD',
      rideHeight: 0.12,
      handling: {
        grip: 1.22,
        downforce: 1.35,
        steeringSpeed: 4.5,
        driftControl: 0.42,
        suspensionStiffness: 1.35
      }
    },
    supportedCustomization: {
      colour: true,
      wheelAppearance: true,
      rideHeight: true,
      handling: true,
      driveConfig: true,
      allowedDrives: ['AWD', 'RWD']
    }
  },
  {
    id: 'titan_sport',
    name: 'Titan Sport',
    category: 'Performance Car',
    description: 'Widebody track-focused endurance weapon with vented hood scoop, flared wheel arches, and race-spec downforce.',
    height: 1.36,
    rideHeight: 0.13,
    driveType: 'AWD',
    colour: 0x141416,
    handling: {
      grip: 1.18,
      downforce: 1.25,
      steeringSpeed: 4.2,
      driftControl: 0.48,
      suspensionStiffness: 1.25
    },
    camera: {
      cockpit: { offset: { x: 0.38, y: 1.0, z: 0.2 }, lookOffset: { x: 0.38, y: 0.95, z: 20 }, fov: 68 },
      hood: { offset: { x: 0, y: 0.88, z: 1.35 }, lookOffset: { x: 0, y: 0.78, z: 30 }, fov: 65 },
      bumper: { offset: { x: 0, y: 0.36, z: 2.25 }, lookOffset: { x: 0, y: 0.32, z: 30 }, fov: 65 },
      chase: { distance: 6.3, height: 2.1, lookHeight: 0.98, fov: 65 },
      orbit: { distance: 6.8, height: 1.35 }
    },
    displayStats: {
      topSpeed: '318 km/h',
      acceleration: '9.1/10',
      braking: '9.1/10',
      handling: '9.0/10',
      driveType: 'AWD',
      weight: '1,490 kg'
    },
    stats: {
      speed: 91,
      acceleration: 91,
      handling: 90,
      braking: 91
    },
    specs: {
      topSpeed: '318 km/h',
      acceleration: '9.1/10',
      zeroToHundred: '3.0s',
      handling: '9.0/10',
      braking: '9.1/10',
      driveType: 'AWD',
      weight: '1,490 kg',
      power: '640 HP'
    },
    physicsConfig: {
      mass: 1490,
      maxSpeed: 318,
      enginePower: 640,
      brakeForce: 40,
      driveType: 'AWD',
      rideHeight: 0.13,
      handling: {
        grip: 1.18,
        downforce: 1.25,
        steeringSpeed: 4.2,
        driftControl: 0.48,
        suspensionStiffness: 1.25
      }
    },
    supportedCustomization: {
      colour: true,
      wheelAppearance: true,
      rideHeight: true,
      handling: true,
      driveConfig: true,
      allowedDrives: ['AWD', 'RWD']
    }
  },
  {
    id: 'aero_roadster',
    name: 'Aero Roadster',
    category: 'Convertible',
    description: 'Exquisite open-air roadster engineered with dual aero nacelles, chrome roll hoops, and an automated folding hardtop.',
    height: 1.20,
    rideHeight: 0.13,
    driveType: 'RWD',
    colour: 0xffcc00,
    handling: {
      grip: 1.06,
      downforce: 0.95,
      steeringSpeed: 4.1,
      driftControl: 0.55,
      suspensionStiffness: 1.12
    },
    camera: {
      cockpit: { offset: { x: 0.36, y: 0.92, z: 0.15 }, lookOffset: { x: 0.36, y: 0.88, z: 20 }, fov: 70 },
      hood: { offset: { x: 0, y: 0.8, z: 1.25 }, lookOffset: { x: 0, y: 0.7, z: 30 }, fov: 65 },
      bumper: { offset: { x: 0, y: 0.32, z: 2.1 }, lookOffset: { x: 0, y: 0.28, z: 30 }, fov: 65 },
      chase: { distance: 6.0, height: 1.95, lookHeight: 0.85, fov: 65 },
      orbit: { distance: 6.5, height: 1.2 }
    },
    displayStats: {
      topSpeed: '298 km/h',
      acceleration: '8.7/10',
      braking: '8.6/10',
      handling: '8.5/10',
      driveType: 'RWD',
      weight: '1,500 kg'
    },
    stats: {
      speed: 87,
      acceleration: 87,
      handling: 85,
      braking: 86
    },
    specs: {
      topSpeed: '298 km/h',
      acceleration: '8.7/10',
      zeroToHundred: '3.1s',
      handling: '8.5/10',
      braking: '8.6/10',
      driveType: 'RWD',
      weight: '1,500 kg',
      power: '570 HP'
    },
    physicsConfig: {
      mass: 1500,
      maxSpeed: 298,
      enginePower: 570,
      brakeForce: 35,
      driveType: 'RWD',
      rideHeight: 0.13,
      handling: {
        grip: 1.06,
        downforce: 0.95,
        steeringSpeed: 4.1,
        driftControl: 0.55,
        suspensionStiffness: 1.12
      }
    },
    supportedCustomization: {
      colour: true,
      wheelAppearance: true,
      rideHeight: true,
      handling: true,
      driveConfig: false,
      driveLockReason: 'RWD Roadster Platform Locked',
      allowedDrives: ['RWD']
    }
  },
  {
    id: 'apex_gt',
    name: 'Apex GT',
    category: 'Supercar',
    description: 'Twin-turbo V8 hypercar engineered for razor-sharp track precision and extreme top speeds.',
    height: 1.25,
    rideHeight: 0.14,
    driveType: 'AWD',
    colour: 0xcc1111,
    handling: {
      grip: 1.15,
      downforce: 1.2,
      steeringSpeed: 4.2,
      driftControl: 0.45,
      suspensionStiffness: 1.2
    },
    camera: {
      cockpit: { offset: { x: 0.38, y: 0.95, z: 0.2 }, lookOffset: { x: 0.38, y: 0.9, z: 20 }, fov: 68 },
      hood: { offset: { x: 0, y: 0.82, z: 1.3 }, lookOffset: { x: 0, y: 0.72, z: 30 }, fov: 65 },
      bumper: { offset: { x: 0, y: 0.35, z: 2.2 }, lookOffset: { x: 0, y: 0.3, z: 30 }, fov: 65 },
      chase: { distance: 6.2, height: 2.05, lookHeight: 0.9, fov: 65 },
      orbit: { distance: 6.8, height: 1.3 }
    },
    displayStats: {
      topSpeed: '325 km/h',
      acceleration: '9.4/10',
      braking: '9.0/10',
      handling: '8.9/10',
      driveType: 'AWD',
      weight: '1,450 kg'
    },
    stats: {
      speed: 92,
      acceleration: 94,
      handling: 89,
      braking: 90
    },
    specs: {
      topSpeed: '325 km/h',
      acceleration: '9.4/10',
      zeroToHundred: '2.8s',
      handling: '8.9/10',
      braking: '9.0/10',
      driveType: 'AWD',
      weight: '1,450 kg',
      power: '680 HP'
    },
    physicsConfig: {
      mass: 1450,
      maxSpeed: 325,
      enginePower: 680,
      brakeForce: 38,
      driveType: 'AWD',
      rideHeight: 0.14,
      handling: {
        grip: 1.15,
        downforce: 1.2,
        steeringSpeed: 4.2,
        driftControl: 0.45,
        suspensionStiffness: 1.2
      }
    },
    supportedCustomization: {
      colour: true,
      wheelAppearance: true,
      rideHeight: true,
      handling: true,
      driveConfig: true,
      allowedDrives: ['AWD', 'RWD']
    }
  },
  {
    id: 'venom_spyder',
    name: 'Venom Spyder',
    category: 'Convertible Roadster',
    description: 'Open-air luxury roadster featuring a mechanized folding roof and sonorous naturally-aspirated V10.',
    height: 1.20,
    rideHeight: 0.13,
    driveType: 'RWD',
    colour: 0xffcc00,
    handling: {
      grip: 1.05,
      downforce: 0.95,
      steeringSpeed: 4.0,
      driftControl: 0.55,
      suspensionStiffness: 1.1
    },
    camera: {
      cockpit: { offset: { x: 0.36, y: 0.92, z: 0.15 }, lookOffset: { x: 0.36, y: 0.88, z: 20 }, fov: 70 },
      hood: { offset: { x: 0, y: 0.8, z: 1.25 }, lookOffset: { x: 0, y: 0.7, z: 30 }, fov: 65 },
      bumper: { offset: { x: 0, y: 0.32, z: 2.1 }, lookOffset: { x: 0, y: 0.28, z: 30 }, fov: 65 },
      chase: { distance: 6.0, height: 1.95, lookHeight: 0.85, fov: 65 },
      orbit: { distance: 6.5, height: 1.2 }
    },
    displayStats: {
      topSpeed: '295 km/h',
      acceleration: '8.8/10',
      braking: '8.6/10',
      handling: '8.5/10',
      driveType: 'RWD',
      weight: '1,520 kg'
    },
    stats: {
      speed: 86,
      acceleration: 88,
      handling: 85,
      braking: 86
    },
    specs: {
      topSpeed: '295 km/h',
      acceleration: '8.8/10',
      zeroToHundred: '3.2s',
      handling: '8.5/10',
      braking: '8.6/10',
      driveType: 'RWD',
      weight: '1,520 kg',
      power: '560 HP'
    },
    physicsConfig: {
      mass: 1520,
      maxSpeed: 295,
      enginePower: 560,
      brakeForce: 34,
      driveType: 'RWD',
      rideHeight: 0.13,
      handling: {
        grip: 1.05,
        downforce: 0.95,
        steeringSpeed: 4.0,
        driftControl: 0.55,
        suspensionStiffness: 1.1
      }
    },
    supportedCustomization: {
      colour: true,
      wheelAppearance: true,
      rideHeight: true,
      handling: true,
      driveConfig: false,
      driveLockReason: 'RWD Spyder Platform Locked',
      allowedDrives: ['RWD']
    }
  },
  {
    id: 'titan_4x4',
    name: 'Titan 4x4',
    category: 'Off-Road Explorer',
    description: 'Rugged terrain conqueror with lifted suspension, locking differentials, and high-impact armor.',
    height: 1.95,
    rideHeight: 0.38,
    driveType: '4WD',
    colour: 0x225533,
    handling: {
      grip: 0.92,
      downforce: 0.6,
      steeringSpeed: 3.0,
      driftControl: 0.25,
      suspensionStiffness: 0.75
    },
    camera: {
      cockpit: { offset: { x: 0.45, y: 1.45, z: 0.1 }, lookOffset: { x: 0.45, y: 1.35, z: 20 }, fov: 68 },
      hood: { offset: { x: 0, y: 1.35, z: 1.4 }, lookOffset: { x: 0, y: 1.25, z: 30 }, fov: 65 },
      bumper: { offset: { x: 0, y: 0.65, z: 2.4 }, lookOffset: { x: 0, y: 0.6, z: 30 }, fov: 65 },
      chase: { distance: 7.5, height: 2.8, lookHeight: 1.4, fov: 65 },
      orbit: { distance: 8.0, height: 1.8 }
    },
    displayStats: {
      topSpeed: '195 km/h',
      acceleration: '7.0/10',
      braking: '7.5/10',
      handling: '6.5/10',
      driveType: '4WD',
      weight: '2,300 kg'
    },
    stats: {
      speed: 68,
      acceleration: 70,
      handling: 65,
      braking: 75
    },
    specs: {
      topSpeed: '195 km/h',
      acceleration: '7.0/10',
      zeroToHundred: '5.8s',
      handling: '6.5/10',
      braking: '7.5/10',
      driveType: '4WD',
      weight: '2,300 kg',
      power: '450 HP'
    },
    physicsConfig: {
      mass: 2300,
      maxSpeed: 195,
      enginePower: 450,
      brakeForce: 42,
      driveType: '4WD',
      rideHeight: 0.38,
      handling: {
        grip: 0.92,
        downforce: 0.6,
        steeringSpeed: 3.0,
        driftControl: 0.25,
        suspensionStiffness: 0.75
      }
    },
    supportedCustomization: {
      colour: true,
      wheelAppearance: true,
      rideHeight: true,
      handling: true,
      driveConfig: true,
      allowedDrives: ['4WD', 'AWD', 'RWD']
    }
  },
  {
    id: 'urban_pulse',
    name: 'Urban Pulse',
    category: 'Performance Hatch',
    description: 'Lightweight turbocharged city hatch with immediate throttle response and surgical nimbleness.',
    height: 1.48,
    rideHeight: 0.18,
    driveType: 'FWD',
    colour: 0x0099ff,
    handling: {
      grip: 1.0,
      downforce: 0.8,
      steeringSpeed: 3.8,
      driftControl: 0.2,
      suspensionStiffness: 0.95
    },
    camera: {
      cockpit: { offset: { x: 0.35, y: 1.05, z: 0.1 }, lookOffset: { x: 0.35, y: 1.0, z: 20 }, fov: 66 },
      hood: { offset: { x: 0, y: 0.92, z: 1.15 }, lookOffset: { x: 0, y: 0.85, z: 30 }, fov: 65 },
      bumper: { offset: { x: 0, y: 0.38, z: 1.9 }, lookOffset: { x: 0, y: 0.32, z: 30 }, fov: 65 },
      chase: { distance: 5.8, height: 2.1, lookHeight: 1.0, fov: 65 },
      orbit: { distance: 6.2, height: 1.3 }
    },
    displayStats: {
      topSpeed: '240 km/h',
      acceleration: '7.8/10',
      braking: '8.2/10',
      handling: '9.2/10',
      driveType: 'FWD',
      weight: '1,280 kg'
    },
    stats: {
      speed: 76,
      acceleration: 78,
      handling: 92,
      braking: 82
    },
    specs: {
      topSpeed: '240 km/h',
      acceleration: '7.8/10',
      zeroToHundred: '4.8s',
      handling: '9.2/10',
      braking: '8.2/10',
      driveType: 'FWD',
      weight: '1,280 kg',
      power: '320 HP'
    },
    physicsConfig: {
      mass: 1280,
      maxSpeed: 240,
      enginePower: 320,
      brakeForce: 32,
      driveType: 'FWD',
      rideHeight: 0.18,
      handling: {
        grip: 1.0,
        downforce: 0.8,
        steeringSpeed: 3.8,
        driftControl: 0.2,
        suspensionStiffness: 0.95
      }
    },
    supportedCustomization: {
      colour: true,
      wheelAppearance: true,
      rideHeight: true,
      handling: true,
      driveConfig: true,
      allowedDrives: ['FWD', 'AWD']
    }
  },
  {
    id: 'formula_r',
    name: 'Formula R',
    category: 'Circuit Monoposto',
    description: 'Pure motorsport single-seater with extreme aerodynamic downforce and instantaneous cornering.',
    height: 0.95,
    rideHeight: 0.08,
    driveType: 'RWD',
    colour: 0xdd1122,
    handling: {
      grip: 1.45,
      downforce: 2.2,
      steeringSpeed: 5.0,
      driftControl: 0.15,
      suspensionStiffness: 1.8
    },
    camera: {
      cockpit: { offset: { x: 0, y: 0.65, z: 0.05 }, lookOffset: { x: 0, y: 0.6, z: 25 }, fov: 75 },
      hood: { offset: { x: 0, y: 0.52, z: 1.4 }, lookOffset: { x: 0, y: 0.45, z: 30 }, fov: 70 },
      bumper: { offset: { x: 0, y: 0.22, z: 2.7 }, lookOffset: { x: 0, y: 0.2, z: 30 }, fov: 70 },
      chase: { distance: 6.5, height: 1.85, lookHeight: 0.75, fov: 68 },
      orbit: { distance: 7.2, height: 1.1 }
    },
    displayStats: {
      topSpeed: '350 km/h',
      acceleration: '9.9/10',
      braking: '9.8/10',
      handling: '9.8/10',
      driveType: 'RWD',
      weight: '790 kg'
    },
    stats: {
      speed: 98,
      acceleration: 99,
      handling: 98,
      braking: 98
    },
    specs: {
      topSpeed: '350 km/h',
      acceleration: '9.9/10',
      zeroToHundred: '2.1s',
      handling: '9.8/10',
      braking: '9.8/10',
      driveType: 'RWD',
      weight: '790 kg',
      power: '850 HP'
    },
    physicsConfig: {
      mass: 790,
      maxSpeed: 350,
      enginePower: 850,
      brakeForce: 45,
      driveType: 'RWD',
      rideHeight: 0.08,
      handling: {
        grip: 1.45,
        downforce: 2.2,
        steeringSpeed: 5.0,
        driftControl: 0.15,
        suspensionStiffness: 1.8
      }
    },
    supportedCustomization: {
      colour: true,
      wheelAppearance: false,
      wheelLockReason: 'FIA Spec Center-Lock Wheels Locked',
      rideHeight: false,
      heightLockReason: 'FIA Ground-Effect Aero Skirts Locked',
      handling: true,
      driveConfig: false,
      driveLockReason: 'FIA Formula Regs Mandate RWD Only',
      allowedDrives: ['RWD']
    }
  }
];

export class VehicleManager {
  constructor(scene, audio, input) {
    this.scene = scene;
    this.audio = audio;
    this.input = input;

    this.customization = new VehicleCustomization();
    this.currentVehicle = null;
    this.currentPhysics = null;
    this.currentController = null;
    this.currentId = 'falcon_s1';
  }

  spawnVehicle(vehicleId, x = 0, y = 0.5, z = 0, heading = 0) {
    // Clean up existing vehicle
    if (this.currentVehicle) {
      this.currentVehicle.destroy();
    }

    const catalogEntry = VEHICLE_CATALOG.find(v => v.id === vehicleId) || VEHICLE_CATALOG[0];
    this.currentId = catalogEntry.id;

    // Instantiate 3D model with all 18 vehicle system attributes and statistics
    this.currentVehicle = new Vehicle(this.scene, {
      type: catalogEntry.id,
      name: catalogEntry.name,
      height: catalogEntry.height,
      rideHeight: catalogEntry.rideHeight,
      driveType: catalogEntry.driveType,
      handling: catalogEntry.handling,
      colour: catalogEntry.colour,
      camera: catalogEntry.camera,
      displayStats: catalogEntry.displayStats,
      statistics: catalogEntry.displayStats,
      physicsConfig: catalogEntry.physicsConfig
    });

    // Apply saved customizations
    this.customization.apply(this.currentVehicle, catalogEntry.id);

    // Instantiate physics engine
    this.currentPhysics = new VehiclePhysics(catalogEntry.physicsConfig);
    this.currentPhysics.resetPosition(x, y, z, heading);

    // Link physics and vehicle bidirectional references
    this.currentPhysics.vehicle = this.currentVehicle;
    this.currentVehicle.physics = this.currentPhysics;

    // Instantiate controller
    this.currentController = new VehicleController(
      this.currentVehicle,
      this.currentPhysics,
      this.audio,
      this.input
    );

    return {
      vehicle: this.currentVehicle,
      physics: this.currentPhysics,
      controller: this.currentController
    };
  }

  update(dt, collisionSystem, trafficCars = []) {
    if (this.currentController) {
      this.currentController.update(dt, collisionSystem, trafficCars);
    }
  }

  getActiveVehicle() {
    return this.currentVehicle;
  }

  getActivePhysics() {
    return this.currentPhysics;
  }

  getActiveController() {
    return this.currentController;
  }

  getCatalogEntry(vehicleId) {
    return VEHICLE_CATALOG.find(v => v.id === vehicleId);
  }

  resetActiveVehicle(roadNetwork = null, collisionSystem = null) {
    if (!this.currentPhysics) return null;

    let targetPos = new THREE.Vector3().copy(this.currentPhysics.position);
    let targetHeading = this.currentPhysics.heading;

    // 1. If roadNetwork is available, find nearest safe road position
    if (roadNetwork && typeof roadNetwork.getNearestSafeRoadPosition === 'function') {
      const roadInfo = roadNetwork.getNearestSafeRoadPosition(targetPos, collisionSystem);
      if (roadInfo && roadInfo.position) {
        targetPos = roadInfo.position;
        targetHeading = roadInfo.heading !== undefined ? roadInfo.heading : targetHeading;
      }
    } else if (collisionSystem && typeof collisionSystem.findSafeClearance === 'function') {
      // 2. Fallback to collisionSystem clearance search
      targetPos = collisionSystem.findSafeClearance(targetPos, targetHeading, 4.5);
    } else {
      // 3. Simple upright safety ground lift
      targetPos.y = Math.max(0.45, targetPos.y);
    }

    this.currentPhysics.resetToRoad(targetPos, targetHeading);

    if (this.currentVehicle && typeof this.currentVehicle.update === 'function') {
      this.currentVehicle.update(this.currentPhysics, 0.016);
    }

    return {
      success: true,
      position: targetPos,
      heading: targetHeading
    };
  }
}
