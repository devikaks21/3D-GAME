import * as THREE from 'three';

/**
 * RoadNetwork
 * 
 * Provides a waypoint-based navigation graph for autonomous AI traffic.
 * 
 * Structure:
 * Road Network ➔ Waypoint A ➔ Waypoint B ➔ Waypoint C ➔ Waypoint D
 * 
 * Features:
 * - Multi-lane road paths (Right lane & Left passing lane).
 * - Multi-branch intersection connections for straight travel and turns.
 * - City grid network (Downtown avenues & cross streets).
 * - Outer orbital ring road arterial highway.
 * - Highway ramps connecting city to ring road.
 */
export class RoadNetwork {
  constructor() {
    this.waypoints = new Map();
    this.intersections = new Map();
    this.buildNetwork();
  }

  addWaypoint(wp) {
    if (!wp.id) return;
    this.waypoints.set(wp.id, {
      id: wp.id,
      position: new THREE.Vector3(wp.x, wp.y || 0, wp.z),
      x: wp.x,
      y: wp.y || 0,
      z: wp.z,
      lane: wp.lane !== undefined ? wp.lane : 0,
      laneOffset: wp.laneOffset || 0,
      speedLimit: wp.speedLimit || 12.0, // m/s (~43 km/h default city)
      roadType: wp.roadType || 'city',   // 'city' | 'highway'
      isIntersection: Boolean(wp.isIntersection),
      intersectionId: wp.intersectionId || null,
      trafficLight: Boolean(wp.trafficLight),
      connected: wp.connected ? [...wp.connected] : []
    });
  }

  connect(fromId, toId) {
    const fromWp = this.waypoints.get(fromId);
    if (fromWp && !fromWp.connected.includes(toId)) {
      fromWp.connected.push(toId);
    }
  }

  getWaypoint(id) {
    return this.waypoints.get(id) || null;
  }

  getAllWaypoints() {
    return Array.from(this.waypoints.values());
  }

  getRandomWaypoint() {
    const list = Array.from(this.waypoints.values());
    if (list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  getNextWaypoint(currentWpId, previousWpId = null) {
    const currentWp = this.waypoints.get(currentWpId);
    if (!currentWp || !currentWp.connected || currentWp.connected.length === 0) {
      return this.getRandomWaypoint();
    }

    // Filter candidate connections to avoid reversing direction
    let candidates = currentWp.connected;
    if (candidates.length > 1 && previousWpId) {
      const filtered = candidates.filter(id => id !== previousWpId);
      if (filtered.length > 0) candidates = filtered;
    }

    // Pick random connected waypoint
    const chosenId = candidates[Math.floor(Math.random() * candidates.length)];
    return this.waypoints.get(chosenId) || null;
  }

  getNearestWaypoint(pos, maxDist = Infinity) {
    let nearest = null;
    let minD2 = maxDist * maxDist;

    for (const wp of this.waypoints.values()) {
      const dx = wp.x - pos.x;
      const dz = wp.z - pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < minD2) {
        minD2 = d2;
        nearest = wp;
      }
    }
    return nearest;
  }

  getWaypointsInRadius(centerPos, minRadius = 40, maxRadius = 180) {
    const minD2 = minRadius * minRadius;
    const maxD2 = maxRadius * maxRadius;
    const results = [];

    for (const wp of this.waypoints.values()) {
      const dx = wp.x - centerPos.x;
      const dz = wp.z - centerPos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= minD2 && d2 <= maxD2) {
        results.push(wp);
      }
    }
    return results;
  }

  getNearestSafeRoadPosition(pos, collisionSystem = null) {
    const list = Array.from(this.waypoints.values());
    if (list.length === 0) {
      return {
        position: new THREE.Vector3(pos.x, 0.45, pos.z),
        heading: 0
      };
    }

    // Sort waypoints by squared horizontal distance to pos
    const sorted = [...list].sort((a, b) => {
      const da = (a.x - pos.x) ** 2 + (a.z - pos.z) ** 2;
      const db = (b.x - pos.x) ** 2 + (b.z - pos.z) ** 2;
      return da - db;
    });

    // Check candidate waypoints starting from closest
    for (let i = 0; i < Math.min(12, sorted.length); i++) {
      const wp = sorted[i];
      const groundY = collisionSystem ? collisionSystem.getGroundHeight(wp.x, wp.z) : (wp.y || 0);
      const testPos = new THREE.Vector3(wp.x, groundY + 0.45, wp.z);

      // Verify no obstacle collider at this waypoint
      if (collisionSystem) {
        const hit = collisionSystem.checkSphereCollision(testPos, 1.4);
        if (hit && hit.collided) continue;
      }

      // Calculate road heading from waypoint to its connected neighbor
      let roadHeading = 0;
      if (wp.connected && wp.connected.length > 0) {
        const nextWp = this.waypoints.get(wp.connected[0]);
        if (nextWp) {
          roadHeading = Math.atan2(nextWp.x - wp.x, nextWp.z - wp.z);
        }
      }

      return {
        position: testPos,
        heading: roadHeading,
        waypoint: wp
      };
    }

    // Fallback to closest waypoint
    const closest = sorted[0];
    let heading = 0;
    if (closest.connected && closest.connected.length > 0) {
      const next = this.waypoints.get(closest.connected[0]);
      if (next) heading = Math.atan2(next.x - closest.x, next.z - closest.z);
    }
    const groundY = collisionSystem ? collisionSystem.getGroundHeight(closest.x, closest.z) : (closest.y || 0);
    return {
      position: new THREE.Vector3(closest.x, groundY + 0.45, closest.z),
      heading,
      waypoint: closest
    };
  }

  buildNetwork() {
    // ----------------------------------------------------
    // 1. DOWNTOWN CITY GRID NETWORK
    // Roads at X = -180, -90, 0, 90, 180 and Z = -180, -90, 0, 90, 180
    // ----------------------------------------------------
    const avenues = [-180, -90, 0, 90, 180];
    const streets = [-180, -90, 0, 90, 180];

    // Lane offsets from road centerline
    const rightLaneOffset = 4.2;
    const leftLaneOffset = 1.6;

    // A. North-South Avenues
    avenues.forEach(aveX => {
      // 1. Northbound Traffic (+Z direction)
      const nbKeyPoints = [-210, -180, -135, -90, -45, 0, 45, 90, 135, 180, 210];
      for (let i = 0; i < nbKeyPoints.length; i++) {
        const z = nbKeyPoints[i];
        const isInt = streets.includes(z);
        const wpId = `ave_nb_${aveX}_z${z}`;

        this.addWaypoint({
          id: wpId,
          x: aveX + rightLaneOffset,
          z: z,
          speedLimit: 12.5, // ~45 km/h
          roadType: 'city',
          lane: 0,
          isIntersection: isInt,
          intersectionId: isInt ? `int_${aveX}_${z}` : null,
          trafficLight: isInt
        });

        // Connect sequentially northbound
        if (i > 0) {
          const prevId = `ave_nb_${aveX}_z${nbKeyPoints[i - 1]}`;
          this.connect(prevId, wpId);
        }
      }

      // Loop northbound end into southbound at boundaries
      this.connect(`ave_nb_${aveX}_z210`, `ave_sb_${aveX}_z210`);

      // 2. Southbound Traffic (-Z direction)
      const sbKeyPoints = [210, 180, 135, 90, 45, 0, -45, -90, -135, -180, -210];
      for (let i = 0; i < sbKeyPoints.length; i++) {
        const z = sbKeyPoints[i];
        const isInt = streets.includes(z);
        const wpId = `ave_sb_${aveX}_z${z}`;

        this.addWaypoint({
          id: wpId,
          x: aveX - rightLaneOffset,
          z: z,
          speedLimit: 12.5,
          roadType: 'city',
          lane: 0,
          isIntersection: isInt,
          intersectionId: isInt ? `int_${aveX}_${z}` : null,
          trafficLight: isInt
        });

        if (i > 0) {
          const prevId = `ave_sb_${aveX}_z${sbKeyPoints[i - 1]}`;
          this.connect(prevId, wpId);
        }
      }

      // Loop southbound end into northbound at boundaries
      this.connect(`ave_sb_${aveX}_z-210`, `ave_nb_${aveX}_z-210`);
    });

    // B. East-West Streets
    streets.forEach(streetZ => {
      // 1. Eastbound Traffic (+X direction)
      const ebKeyPoints = [-210, -180, -135, -90, -45, 0, 45, 90, 135, 180, 210];
      for (let i = 0; i < ebKeyPoints.length; i++) {
        const x = ebKeyPoints[i];
        const isInt = avenues.includes(x);
        const wpId = `str_eb_x${x}_z${streetZ}`;

        this.addWaypoint({
          id: wpId,
          x: x,
          z: streetZ - rightLaneOffset,
          speedLimit: 12.0,
          roadType: 'city',
          lane: 0,
          isIntersection: isInt,
          intersectionId: isInt ? `int_${x}_${streetZ}` : null,
          trafficLight: isInt
        });

        if (i > 0) {
          const prevId = `str_eb_x${ebKeyPoints[i - 1]}_z${streetZ}`;
          this.connect(prevId, wpId);
        }
      }

      // Loop eastbound end into westbound at boundaries
      this.connect(`str_eb_x210_z${streetZ}`, `str_wb_x210_z${streetZ}`);

      // 2. Westbound Traffic (-X direction)
      const wbKeyPoints = [210, 180, 135, 90, 45, 0, -45, -90, -135, -180, -210];
      for (let i = 0; i < wbKeyPoints.length; i++) {
        const x = wbKeyPoints[i];
        const isInt = avenues.includes(x);
        const wpId = `str_wb_x${x}_z${streetZ}`;

        this.addWaypoint({
          id: wpId,
          x: x,
          z: streetZ + rightLaneOffset,
          speedLimit: 12.0,
          roadType: 'city',
          lane: 0,
          isIntersection: isInt,
          intersectionId: isInt ? `int_${x}_${streetZ}` : null,
          trafficLight: isInt
        });

        if (i > 0) {
          const prevId = `str_wb_x${wbKeyPoints[i - 1]}_z${streetZ}`;
          this.connect(prevId, wpId);
        }
      }

      // Loop westbound end into eastbound at boundaries
      this.connect(`str_wb_x-210_z${streetZ}`, `str_eb_x-210_z${streetZ}`);
    });

    // C. Intersections Branching & Turns
    // Connect intersecting avenues and streets so AI vehicles can turn at any intersection
    avenues.forEach(aveX => {
      streets.forEach(streetZ => {
        const nbInt = `ave_nb_${aveX}_z${streetZ}`;
        const sbInt = `ave_sb_${aveX}_z${streetZ}`;
        const ebInt = `str_eb_x${aveX}_z${streetZ}`;
        const wbInt = `str_wb_x${aveX}_z${streetZ}`;

        // Northbound avenue can turn East or West
        this.connect(nbInt, ebInt);
        this.connect(nbInt, wbInt);

        // Southbound avenue can turn East or West
        this.connect(sbInt, ebInt);
        this.connect(sbInt, wbInt);

        // Eastbound street can turn North or South
        this.connect(ebInt, nbInt);
        this.connect(ebInt, sbInt);

        // Westbound street can turn North or South
        this.connect(wbInt, nbInt);
        this.connect(wbInt, sbInt);
      });
    });

    // ----------------------------------------------------
    // 2. ORBITAL RING ROAD HIGHWAY NETWORK (Radius 290)
    // Fast multi-lane arterial loop (65-80 km/h)
    // ----------------------------------------------------
    const r = 290;
    const hwyLaneOffset = 5.0;
    const hwySpeed = 20.0; // ~72 km/h

    // Outer Clockwise Highway Loop
    const cwCorners = [
      { id: 'hwy_cw_nw', x: -r + hwyLaneOffset, z: -r + hwyLaneOffset },
      { id: 'hwy_cw_n_mid', x: 0, z: -r + hwyLaneOffset },
      { id: 'hwy_cw_ne', x: r - hwyLaneOffset, z: -r + hwyLaneOffset },
      { id: 'hwy_cw_e_mid', x: r - hwyLaneOffset, z: 0 },
      { id: 'hwy_cw_se', x: r - hwyLaneOffset, z: r - hwyLaneOffset },
      { id: 'hwy_cw_s_mid', x: 0, z: r - hwyLaneOffset },
      { id: 'hwy_cw_sw', x: -r + hwyLaneOffset, z: r - hwyLaneOffset },
      { id: 'hwy_cw_w_mid', x: -r + hwyLaneOffset, z: 0 }
    ];

    cwCorners.forEach((p, idx) => {
      this.addWaypoint({
        id: p.id,
        x: p.x,
        z: p.z,
        speedLimit: hwySpeed,
        roadType: 'highway',
        lane: 0,
        isIntersection: false
      });
    });

    for (let i = 0; i < cwCorners.length; i++) {
      const nextIdx = (i + 1) % cwCorners.length;
      this.connect(cwCorners[i].id, cwCorners[nextIdx].id);
    }

    // Connect Downtown Avenue ends to Highway Ramps
    this.connect('ave_nb_0_z210', 'hwy_cw_s_mid');
    this.connect('hwy_cw_s_mid', 'ave_sb_0_z210');
    this.connect('ave_sb_0_z-210', 'hwy_cw_n_mid');
    this.connect('hwy_cw_n_mid', 'ave_nb_0_z-210');
    this.connect('str_eb_x210_z0', 'hwy_cw_e_mid');
    this.connect('hwy_cw_e_mid', 'str_wb_x210_z0');
    this.connect('str_wb_x-210_z0', 'hwy_cw_w_mid');
    this.connect('hwy_cw_w_mid', 'str_eb_x-210_z0');
  }
}
