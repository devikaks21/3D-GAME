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
  title: 'Official City Road Driving Test',
  description: 'Follow the full test route through downtown traffic. Obey speed limits (max 60 km/h) and reach the test destination safely.',
  maxSpeedLimit: 65,
  checkpoints: [
    { x: 0, z: 45, radius: 6 },
    { x: 0, z: 135, radius: 6 },
    { x: 45, z: 180, radius: 6 },
    { x: 135, z: 180, radius: 6 },
    { x: 180, z: 135, radius: 6 },
    { x: 180, z: 0, radius: 6 },
    { x: 90, z: 0, radius: 6 },
    { x: 0, z: 0, radius: 6, isStopZone: true }
  ],
  timeLimit: 120,
  reward: 5000
};
