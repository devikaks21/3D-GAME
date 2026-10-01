import * as THREE from 'three';
import { RoadNetwork } from './src/ai/RoadNetwork.js';
import { AICar } from './src/ai/AICar.js';
import { TrafficManager, TRAFFIC_DENSITIES } from './src/world/TrafficManager.js';
import { GameState } from './src/core/GameState.js';

console.log('🧪 Starting AI Traffic and Traffic Density Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------
// TEST SUITE 1: Road Network Graph & Waypoint Navigation
// ---------------------------------------------------------------------
console.log('Test Suite 1: Road Network & Connected Waypoints');
const roadNet = new RoadNetwork();
const allWps = roadNet.getAllWaypoints();

assert(allWps.length >= 60, `Road network has ${allWps.length} waypoints (expected >= 60)`);

// Check every waypoint has valid connections
let disconnectedCount = 0;
allWps.forEach(wp => {
  if (!wp.connected || wp.connected.length === 0) disconnectedCount++;
});
assert(disconnectedCount === 0, 'Every waypoint in RoadNetwork has at least one connected route');

// Test route selection: Road Network ➔ Waypoint A ➔ Waypoint B ➔ Waypoint C ➔ Waypoint D
const wpA = roadNet.getRandomWaypoint();
assert(wpA !== null, `Waypoint A selected: ${wpA?.id}`);

const wpB = roadNet.getNextWaypoint(wpA.id);
assert(wpB !== null && wpA.connected.includes(wpB.id), `Waypoint B (${wpB?.id}) is connected to Waypoint A`);

const wpC = roadNet.getNextWaypoint(wpB.id, wpA.id);
assert(wpC !== null && wpB.connected.includes(wpC.id), `Waypoint C (${wpC?.id}) is connected to Waypoint B`);

const wpD = roadNet.getNextWaypoint(wpC.id, wpB.id);
assert(wpD !== null && wpC.connected.includes(wpD.id), `Waypoint D (${wpD?.id}) is connected to Waypoint C`);

// Test intersection detection & multi-branch routes
const intersections = allWps.filter(w => w.isIntersection);
assert(intersections.length > 0, `Found ${intersections.length} intersection waypoints with traffic light compliance`);

// Test radius queries
const center = new THREE.Vector3(0, 0, 0);
const radiusWps = roadNet.getWaypointsInRadius(center, 40, 160);
assert(radiusWps.length > 5, `getWaypointsInRadius found ${radiusWps.length} candidate spawn waypoints around center`);

// ---------------------------------------------------------------------
// TEST SUITE 2: AICar Behavior & Vehicle Archetypes
// ---------------------------------------------------------------------
console.log('\nTest Suite 2: AICar Navigation, Archetypes & Model Variety');
const mockScene = new THREE.Scene();

// Test archetypes
const archetypes = ['sedan', 'suv', 'hatchback', 'coupe', 'taxi'];
archetypes.forEach(arch => {
  const car = new AICar(mockScene, roadNet, null, arch);
  assert(car.group.children.length >= 4, `AICar archetype "${arch}" created successfully with 3D model parts`);
  assert(car.taillights.length === 2, `AICar archetype "${arch}" has functional dual taillights`);
  assert(car.headlights.length === 2, `AICar archetype "${arch}" has functional dual headlights`);
  assert(car.indicatorLeftLights.length === 2 && car.indicatorRightLights.length === 2, `AICar archetype "${arch}" has amber corner indicators`);
  car.destroy();
});

// Test road following & movement
const testCar = new AICar(mockScene, roadNet, wpA.id, 'sedan');
const initialPos = testCar.position.clone();

// Simulate 2 seconds of free movement on open road
for (let step = 0; step < 20; step++) {
  testCar.update(0.1, null, 'green', [testCar]);
}
const movedDist = testCar.position.distanceTo(initialPos);
assert(movedDist > 1.0, `AICar navigated along road (distance traveled: ${movedDist.toFixed(2)}m)`);
assert(testCar.speed > 2.0, `AICar accelerated to road cruising speed: ${testCar.speed.toFixed(2)} m/s`);

// ---------------------------------------------------------------------
// TEST SUITE 3: Collision Avoidance (Player & Inter-AI)
// ---------------------------------------------------------------------
console.log('\nTest Suite 3: Collision Avoidance');

// A. Collision avoidance with player directly in front
const playerPos = testCar.position.clone().add(
  new THREE.Vector3(Math.sin(testCar.heading) * 6, 0, Math.cos(testCar.heading) * 6)
);
const speedBeforePlayer = testCar.speed;

// Update with player 6m ahead
for (let step = 0; step < 15; step++) {
  testCar.update(0.1, playerPos, 'green', [testCar]);
}
assert(testCar.speed < speedBeforePlayer * 0.3, `AICar braked for player ahead (speed reduced from ${speedBeforePlayer.toFixed(2)} to ${testCar.speed.toFixed(2)} m/s)`);
assert(testCar.isBraking, 'AICar engaged brake lights while avoiding player');

// B. Collision avoidance between two AI cars in convoy
const aveTarget = roadNet.getWaypoint('ave_nb_0_z90');
const leadCar = new AICar(mockScene, roadNet, aveTarget.id, 'suv');
leadCar.currentWaypoint = aveTarget;
leadCar.position.set(aveTarget.x, 0.35, aveTarget.z - 20);
leadCar.heading = 0; // heading +Z towards aveTarget
leadCar.speed = 0; // Stopped ahead in lane

const chaseCar = new AICar(mockScene, roadNet, aveTarget.id, 'coupe');
chaseCar.currentWaypoint = aveTarget;
chaseCar.position.set(aveTarget.x, 0.35, aveTarget.z - 30); // 10m behind leadCar
chaseCar.heading = 0;
chaseCar.speed = 10.0;

for (let step = 0; step < 20; step++) {
  chaseCar.update(0.1, null, 'green', [leadCar, chaseCar]);
}
const finalDistBetweenCars = chaseCar.position.distanceTo(leadCar.position);
assert(finalDistBetweenCars > 4.0, `AICar safely avoided rear-ending leading car (buffer maintained: ${finalDistBetweenCars.toFixed(2)}m)`);
assert(chaseCar.speed < 4.0, `chaseCar decelerated behind leading vehicle (speed: ${chaseCar.speed.toFixed(2)} m/s)`);

// ---------------------------------------------------------------------
// TEST SUITE 4: Intersection & Traffic Light Stopping
// ---------------------------------------------------------------------
console.log('\nTest Suite 4: Intersection Stopping');

const intWp = intersections[0];
const intCar = new AICar(mockScene, roadNet, intWp.id, 'taxi');
// Position car 12m before intersection waypoint
intCar.position.set(intWp.x - 12, 0.35, intWp.z);
intCar.heading = Math.PI / 2; // Heading east towards intWp
intCar.currentWaypoint = intWp;
intCar.speed = 12.0;

// Simulate approaching red light
for (let step = 0; step < 20; step++) {
  intCar.update(0.1, null, 'red', [intCar]);
}
assert(intCar.speed < 1.0, `AICar came to complete stop before red light (speed: ${intCar.speed.toFixed(2)} m/s)`);
assert(intCar.isStoppedAtRedLight, 'AICar is correctly flagged as stopped at red light');

// Now switch traffic light to green
for (let step = 0; step < 20; step++) {
  intCar.update(0.1, null, 'green', [intCar]);
}
assert(intCar.speed > 2.0, `AICar resumed travel when traffic light turned green (speed: ${intCar.speed.toFixed(2)} m/s)`);

// ---------------------------------------------------------------------
// TEST SUITE 5: Lane Changing with Turn Signals
// ---------------------------------------------------------------------
console.log('\nTest Suite 5: Lane Changing & Turn Indicators');

const laneCar = new AICar(mockScene, roadNet, wpA.id, 'sedan');
assert(laneCar.currentLane === 0, 'Car starts in lane 0 (right lane)');
assert(laneCar.turnSignal === 'none', 'Turn signal initially off');

// Trigger lane change to overtaking lane 1
laneCar.changeLane(1);
assert(laneCar.currentLane === 1, 'Car switched target lane to lane 1');
assert(laneCar.isChangingLane, 'Car state isChangingLane is true');
assert(laneCar.turnSignal === 'left', 'Left turn signal activated during lane change to left lane');

// Update lane change progression
for (let step = 0; step < 25; step++) {
  laneCar.update(0.1, null, 'green', [laneCar]);
}
assert(!laneCar.isChangingLane, 'Lane change transition completed smoothly');
assert(laneCar.turnSignal === 'none', 'Turn signal automatically turned off after completing lane change');
assert(Math.abs(laneCar.lateralOffset - (-2.6)) < 0.2, `Lateral offset smoothly applied to left lane (${laneCar.lateralOffset.toFixed(2)}m)`);

// ---------------------------------------------------------------------
// TEST SUITE 6: Traffic Density & Intelligent Spawning / Despawning
// ---------------------------------------------------------------------
console.log('\nTest Suite 6: Traffic Density & Intelligent Spawn/Despawn');

const tm = new TrafficManager(mockScene, 'medium');
assert(tm.getDensity() === 'medium', 'TrafficManager initial density is medium');
assert(tm.targetCount === TRAFFIC_DENSITIES.medium, `TrafficManager target count for medium is ${TRAFFIC_DENSITIES.medium}`);
assert(tm.cars.length === TRAFFIC_DENSITIES.medium, `TrafficManager initially spawned ${tm.cars.length} cars`);

// Change to Low Density
tm.setDensity('low');
assert(tm.getDensity() === 'low', 'TrafficManager density updated to low');
assert(tm.targetCount === TRAFFIC_DENSITIES.low, `Target count for low is ${TRAFFIC_DENSITIES.low}`);
assert(tm.cars.length <= TRAFFIC_DENSITIES.low, `Vehicle count culled down to low density: ${tm.cars.length}`);

// Change to High Density
tm.setDensity('high');
assert(tm.getDensity() === 'high', 'TrafficManager density updated to high');
assert(tm.targetCount === TRAFFIC_DENSITIES.high, `Target count for high is ${TRAFFIC_DENSITIES.high}`);

// Update with player position to test dynamic spawning up to high density
const dummyPlayer = new THREE.Vector3(0, 0, 0);
for (let step = 0; step < 50; step++) {
  tm.update(0.1, dummyPlayer, 'green');
}
assert(tm.cars.length === TRAFFIC_DENSITIES.high, `TrafficManager replenished active vehicles to high target count: ${tm.cars.length}/${TRAFFIC_DENSITIES.high}`);

// Test intelligent despawning: Add a car 350m away from player (beyond despawn radius 230m)
const distantWp = { id: 'dist_wp', x: 350, y: 0.35, z: 350, speedLimit: 12, isIntersection: false, connected: [] };
roadNet.addWaypoint(distantWp);
const distantCar = new AICar(mockScene, roadNet, 'dist_wp');
tm.cars.push(distantCar);
const countBeforeDespawn = tm.cars.length;

// Update should detect distantCar at distance > 230m and despawn it
tm.update(0.1, dummyPlayer, 'green');
assert(tm.cars.includes(distantCar) === false, 'Intelligent despawn removed vehicle that drove beyond 230m radius');

// ---------------------------------------------------------------------
// TEST SUITE 7: GameState Settings Integration
// ---------------------------------------------------------------------
console.log('\nTest Suite 7: GameState Settings Integration');
const gs = new GameState();
assert(gs.settings.trafficDensity === 'medium', 'GameState defaults to medium traffic density');
gs.settings.trafficDensity = 'high';
assert(gs.settings.trafficDensity === 'high', 'GameState trafficDensity can be modified to high');

// Clean up
testCar.destroy();
leadCar.destroy();
chaseCar.destroy();
intCar.destroy();
laneCar.destroy();
tm.clear();

console.log(`\n========================================`);
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  console.log('🎉 ALL AI TRAFFIC AND TRAFFIC DENSITY TESTS PASSED!');
} else {
  process.exit(1);
}
