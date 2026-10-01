import * as THREE from 'three';

/**
 * Driving School Lessons & Official Road Tests
 */
export const DRIVING_LESSONS = [
  {
    id: 'lesson_1_accel_stop',
    title: 'Lesson 1: Precision Acceleration & Stop',
    description: 'Accelerate smoothly to at least 50 km/h and come to a complete halt inside the marked target stop zone.',
    targetSpeed: 50,
    checkpoints: [
      { x: 0, z: 20, radius: 6 },
      { x: 0, z: 90, radius: 5, isStopZone: true }
    ],
    timeLimit: 25,
    reward: 1000
  },
  {
    id: 'lesson_2_slalom',
    title: 'Lesson 2: Dynamic Slalom Handling',
    description: 'Weave smoothly through the slalom gate cones without losing control or leaving the lane.',
    checkpoints: [
      { x: -10, z: 30, radius: 5 },
      { x: 10, z: 65, radius: 5 },
      { x: -10, z: 100, radius: 5 },
      { x: 10, z: 135, radius: 5 },
      { x: 0, z: 170, radius: 6, isStopZone: true }
    ],
    timeLimit: 30,
    reward: 1500
  },
  {
    id: 'lesson_3_emergency_brake',
    title: 'Lesson 3: High-Speed Emergency Braking',
    description: 'Sprint to 80 km/h on the avenue. When the emergency signal triggers, brake with maximum force without spinning.',
    targetSpeed: 80,
    checkpoints: [
      { x: 0, z: 50, radius: 6 },
      { x: 0, z: 120, radius: 6 },
      { x: 0, z: 180, radius: 5, isStopZone: true }
    ],
    timeLimit: 20,
    reward: 2000
  }
];

export const ROAD_TEST_ROUTE = {
  id: 'official_road_test',
  title: 'ROAD TEST',
  description: 'Complete the route safely.',
  objective: 'Complete the route safely.',
  maxSpeedLimit: 65,
  maxAllowedMistakes: 3,
  timeLimit: 300,
  reward: 6000,
  startPoint: { x: 4.2, y: 0.45, z: -15, heading: 0 },
  checkpoints: [
    { x: 4.2, z: 35, radius: 6.5, title: 'Straight Northbound' },
    { x: 4.2, z: 80, radius: 6.5, title: 'Approach 1st Intersection' },
    { x: 45, z: 94.2, radius: 6.5, isTurn: true, turnDir: 'right', title: 'Turn Right onto East St' },
    { x: 85, z: 94.2, radius: 6.5, title: 'Eastbound Commercial Sector' },
    { x: 94.2, z: 135, radius: 6.5, isTurn: true, turnDir: 'left', title: 'Turn Left onto North Ave' },
    { x: 94.2, z: 180, radius: 6.5, title: 'East Transit Intersection' },
    { x: 45, z: 184.2, radius: 6.5, isTurn: true, turnDir: 'left', title: 'Turn Left onto North Blvd' },
    { x: -45, z: 184.2, radius: 6.5, title: 'Westbound Thoroughfare' },
    { x: -94.2, z: 135, radius: 6.5, isTurn: true, turnDir: 'left', title: 'Turn Left toward Academy' },
    { x: -94.2, z: 90, radius: 6.0, isStopZone: true, isDestination: true, isFinishLine: true, title: 'Destination: Academy Stop Zone' }
  ]
};

export const PARKING_TEST = {
  id: 'official_parking_test',
  title: 'PARKING TEST',
  instruction: 'Position vehicle inside the marked area.',
  description: 'Precision parking challenge: Straight parking, Reverse parking, and Parallel parking.',
  timeLimit: 180,
  reward: 4500,
  startPoint: { x: -135, y: 0.45, z: 80, heading: 0 },
  stalls: [
    {
      id: 'straight_parking',
      type: 'straight',
      name: 'Straight parking',
      title: 'Straight parking',
      instruction: 'Position vehicle inside the marked area.',
      x: -135,
      z: 103,
      width: 3.6,
      length: 6.8,
      heading: 0,
      radius: 5.5,
      isParkingBay: true,
      spawnPoint: { x: -135, y: 0.45, z: 80, heading: 0 }
    },
    {
      id: 'reverse_parking',
      type: 'reverse',
      name: 'Reverse parking',
      title: 'Reverse parking',
      instruction: 'Position vehicle inside the marked area.',
      x: -120,
      z: 135,
      width: 3.6,
      length: 6.8,
      heading: Math.PI,
      requiresReverse: true,
      radius: 5.5,
      isParkingBay: true,
      spawnPoint: { x: -120, y: 0.45, z: 112, heading: 0 }
    },
    {
      id: 'parallel_parking',
      type: 'parallel',
      name: 'Parallel parking',
      title: 'Parallel parking',
      instruction: 'Position vehicle inside the marked area.',
      x: -150,
      z: 155,
      width: 3.4,
      length: 7.8,
      heading: Math.PI / 2,
      radius: 6.0,
      isParkingBay: true,
      isFinishLine: true,
      spawnPoint: { x: -150, y: 0.45, z: 132, heading: 0 }
    }
  ],
  checkpoints: [
    { x: -135, z: 103, radius: 5.5, title: 'Straight parking', isParkingBay: true },
    { x: -120, z: 135, radius: 5.5, title: 'Reverse parking', isParkingBay: true, requiresReverse: true },
    { x: -150, z: 155, radius: 6.0, title: 'Parallel parking', isParkingBay: true, isFinishLine: true }
  ]
};

