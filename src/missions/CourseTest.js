/**
 * Predefined Course Test configurations
 * Features: Cones, turns, narrow roads, stop zones, checkpoints, and a parking section.
 * Tracks: Completion time, collisions, missed checkpoints, and driving accuracy.
 */
export const OFFICIAL_COURSE_TEST = {
  id: 'official_course_test',
  title: 'COURSE TEST',
  description: 'Technical vehicle maneuvering test through cones, turns, narrow roads, stop zone, and parking section.',
  objective: 'Navigate technical course with high driving accuracy.',
  timeLimit: 120,
  reward: 4000,
  startPoint: { x: -165, y: 0.45, z: 65, heading: 0 },
  checkpoints: [
    { x: -165, z: 95, radius: 5.5, stageType: 'cones', title: 'Stage 1: Slalom Cones' },
    { x: -165, z: 125, radius: 6.0, stageType: 'turn', isTurn: true, turnDir: 'right', title: 'Stage 2: Technical Right Turn' },
    { x: -130, z: 145, radius: 6.0, stageType: 'chicane', isTurn: true, title: 'Stage 3: S-Chicane Curves' },
    { x: -95, z: 135, radius: 6.0, stageType: 'turn', isTurn: true, turnDir: 'right', title: 'Stage 4: Hairpin Bend' },
    { x: -95, z: 95, radius: 5.0, stageType: 'narrow_road', title: 'Stage 5: Narrow Road Corridor' },
    { x: -95, z: 60, radius: 5.0, stageType: 'stop_zone', isStopZone: true, title: 'Stage 6: Mandatory Stop Zone' },
    { x: -120, z: 50, radius: 6.0, stageType: 'turn', title: 'Stage 7: Approach to Parking' },
    { x: -145, z: 50, radius: 5.0, stageType: 'parking', isParkingSection: true, isParkingBay: true, isDestination: true, isFinishLine: true, title: 'Stage 8: Final Parking Section' }
  ]
};

export const COURSE_TESTS = [
  OFFICIAL_COURSE_TEST,
  {
    id: 'course_urban_sprint',
    title: 'Urban Apex Precision Sprint',
    description: 'Negotiate the high-speed downtown chicane course through narrow corridors within the target time.',
    timeLimit: 45,
    reward: 2500,
    checkpoints: [
      { x: 0, z: 45, radius: 8 },
      { x: -45, z: 90, radius: 8 },
      { x: -90, z: 135, radius: 8 },
      { x: -135, z: 90, radius: 8 },
      { x: -90, z: 0, radius: 8 },
      { x: 0, z: -45, radius: 8 },
      { x: 45, z: 0, radius: 8, isFinishLine: true }
    ]
  },
  {
    id: 'course_mountain_ascent',
    title: 'Alpine Summit Hillclimb',
    description: 'Race up the serpentine mountain pass through realistic curves, gorge viaduct, and tunnel to the summit lookout.',
    timeLimit: 85,
    reward: 5000,
    checkpoints: [
      { x: 0, z: -280, radius: 10 },
      { x: -45, z: -320, radius: 10 },
      { x: -75, z: -390, radius: 10 },
      { x: 95, z: -425, radius: 10 },
      { x: 145, z: -480, radius: 10 },
      { x: -35, z: -525, radius: 10 },
      { x: -45, z: -605, radius: 10 },
      { x: 10, z: -660, radius: 12, isFinishLine: true }
    ]
  }
];
