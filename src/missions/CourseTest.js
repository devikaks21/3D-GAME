/**
 * Predefined Course Test track configurations
 */
export const COURSE_TESTS = [
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
      { x: 0, z: -280, radius: 10 },     // Entry at Riverbed bridge
      { x: -45, z: -320, radius: 10 },    // Foothills curve
      { x: -75, z: -390, radius: 10 },    // Hairpin 1 apex & Overlook
      { x: 95, z: -425, radius: 10 },     // Gorge Viaduct bridge
      { x: 145, z: -480, radius: 10 },    // Hairpin 2 apex
      { x: -35, z: -525, radius: 10 },    // Mountain Tunnel entry portal
      { x: -45, z: -605, radius: 10 },    // Mountain Tunnel exit portal
      { x: 10, z: -660, radius: 12, isFinishLine: true } // Summit Vista Point
    ]
  }
];
