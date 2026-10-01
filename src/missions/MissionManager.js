import * as THREE from 'three';
import { GameModes } from '../core/GameState.js';
import { DRIVING_LESSONS, ROAD_TEST_ROUTE, PARKING_TEST } from './DrivingTest.js';
import { OFFICIAL_COURSE_TEST, COURSE_TESTS } from './CourseTest.js';
import { RaceManager } from './RaceManager.js';
import { DrivingSchoolManager } from './DrivingSchoolManager.js';
import { Checkpoint } from '../utilities/Checkpoint.js';

export class MissionManager {
  constructor(scene, gameState, audioManager, collisionSystem) {
    this.scene = scene;
    this.gameState = gameState;
    this.audio = audioManager;
    this.collisionSystem = collisionSystem;
    this.raceManager = new RaceManager(audioManager);
    this.drivingSchoolManager = new DrivingSchoolManager(scene, gameState, audioManager, collisionSystem);

    this.activeMission = null;
    this.activeCheckpoints = [];
    this.checkpointMeshes = [];
    this.currentCheckpointIndex = 0;

    this.missionTimer = 0;
    this.isCompleted = false;
    this.isFailed = false;
    this.failReason = '';

    // Playground Experiment & Stunt telemetry
    this.stuntScore = 0;
    this.driftScore = 0;
    this.airTime = 0;
    this.maxAirTime = 0;
    this.smashCount = 0;
    this.jumpCount = 0;
    this.wasAirborne = false;

    // 0-100 km/h acceleration test
    this.isTiming0to100 = false;
    this.accelTimer = 0;
    this.last0to100 = null;

    // 100-0 km/h braking test
    this.isTimingBraking = false;
    this.brakeStartPos = null;
    this.lastBrakeDist = null;
  }

  startMode(mode, missionIndex = 0) {
    this.cleanup();
    this.isCompleted = false;
    this.isFailed = false;
    this.failReason = '';
    this.missionTimer = 0;

    switch (mode) {
      case GameModes.DRIVING_SCHOOL:
      case GameModes.PRACTICE:
        this.activeMission = { title: 'Driving School: Practice Mode' };
        this.drivingSchoolManager.startMode('PRACTICE', typeof missionIndex === 'object' ? missionIndex : {});
        this.activeCheckpoints = this.drivingSchoolManager.checkpoints;
        break;

      case GameModes.ROAD_TEST:
        this.activeMission = ROAD_TEST_ROUTE;
        this.drivingSchoolManager.startMode('ROAD_TEST');
        this.activeCheckpoints = ROAD_TEST_ROUTE.checkpoints;
        break;

      case GameModes.COURSE_TEST:
        this.activeMission = OFFICIAL_COURSE_TEST;
        this.drivingSchoolManager.startMode('COURSE_TEST');
        this.activeCheckpoints = OFFICIAL_COURSE_TEST.checkpoints;
        break;

      case GameModes.PARKING_TEST:
        this.activeMission = PARKING_TEST;
        this.drivingSchoolManager.startMode('PARKING_TEST');
        this.activeCheckpoints = PARKING_TEST.checkpoints;
        break;

      case GameModes.RACING_TRACK: {
        const raceType = (typeof missionIndex === 'object' && missionIndex.raceType)
          ? missionIndex.raceType
          : (typeof missionIndex === 'string' ? missionIndex : 'TIME_TRIAL');
        this.activeMission = {
          title: raceType === 'TIME_TRIAL' ? 'Circuit Time Trial (3 Laps)' : 'Circuit Free Track Driving'
        };
        this.raceManager.startRace(raceType);
        this.setupCheckpoints(this.raceManager.getActiveCheckpoints());
        break;
      }

      case GameModes.CAR_PLAYGROUND:
        this.activeMission = { title: 'Dedicated Vehicle Playground' };
        this.stuntScore = 0;
        this.driftScore = 0;
        this.airTime = 0;
        this.maxAirTime = 0;
        this.smashCount = 0;
        this.jumpCount = 0;
        this.wasAirborne = false;
        this.isTiming0to100 = false;
        this.accelTimer = 0;
        this.last0to100 = null;
        this.isTimingBraking = false;
        this.brakeStartPos = null;
        this.lastBrakeDist = null;
        break;

      case GameModes.FREE_DRIVE:
      default:
        this.activeMission = { title: 'Open-World Free Drive' };
        break;
    }
  }

  setupCheckpoints(checkpoints) {
    this.activeCheckpoints = checkpoints;
    this.currentCheckpointIndex = 0;

    // Spawn 3D visual checkpoint rings with terrain elevation
    checkpoints.forEach((cp, idx) => {
      let groundY = cp.y !== undefined ? cp.y : 0;
      if (this.collisionSystem) {
        const gh = this.collisionSystem.getGroundHeight(cp.x, cp.z);
        if (gh !== 0) groundY = gh;
      }
      const pos = new THREE.Vector3(cp.x, groundY, cp.z);
      const color = cp.isFinishLine || cp.isStopZone ? 0xffbb00 : 0x00f0ff;
      const ring = new Checkpoint(this.scene, pos, cp.radius || 6, color);
      ring.setActive(idx === 0);
      this.checkpointMeshes.push(ring);
    });
  }

  update(dt, vehiclePhysics, collisionSystem, racingTrack, vehicleController = null, inputManager = null) {
    if (!vehiclePhysics) return null;

    const currentMode = this.gameState.currentMode;
    const pos = vehiclePhysics.position;
    const speedKmh = Math.abs(vehiclePhysics.speedKmh);

    // 1. Race Manager update if in Racing Track mode
    if (currentMode === GameModes.RACING_TRACK) {
      const raceData = this.raceManager.update(dt, pos, racingTrack);
      if (racingTrack && raceData) {
        if (raceData.isCountingDown) {
          racingTrack.setStartingLightsState(true, false);
          // Lock vehicle on starting grid during countdown
          vehiclePhysics.velocity.set(0, 0, 0);
        } else {
          racingTrack.setStartingLightsState(true, true);
        }
      }
      if (raceData && raceData.finished) {
        this.isCompleted = true;
        this.gameState.addCredits(5000);
      }
      return {
        mode: currentMode,
        title: this.activeMission?.title,
        raceData
      };
    }

    // 2. Stunt Playground scoring & physics experiments
    if (currentMode === GameModes.CAR_PLAYGROUND) {
      // A. Jumping & Airtime
      if (!vehiclePhysics.isGrounded) {
        this.airTime += dt;
        this.maxAirTime = Math.max(this.maxAirTime, this.airTime);
        this.stuntScore += Math.round(dt * 200 * (speedKmh / 50 + 1));
        this.wasAirborne = true;
      } else {
        if (this.wasAirborne && this.airTime > 0.35) {
          this.jumpCount++;
          this.stuntScore += Math.round(this.airTime * 600);
          this.audio.playCheckpointChime();
        }
        this.wasAirborne = false;
        this.airTime = 0;
      }

      // B. Turning & Drifting (Skidpad & Agility)
      if (vehiclePhysics.slipRatio > 0.35 && speedKmh > 15) {
        const driftPoints = Math.round(vehiclePhysics.slipRatio * 120 * dt);
        this.driftScore += driftPoints;
        this.stuntScore += driftPoints;
      }

      // C. Acceleration Test (0-100 km/h)
      if (speedKmh < 2 && !this.isTiming0to100) {
        this.accelTimer = 0;
        this.isTiming0to100 = true;
      } else if (this.isTiming0to100) {
        if (speedKmh >= 2 && speedKmh < 100) {
          this.accelTimer += dt;
        } else if (speedKmh >= 100) {
          this.last0to100 = this.accelTimer.toFixed(2) + 's';
          this.isTiming0to100 = false;
          this.audio.playCheckpointChime();
        }
      }

      // D. Braking Test (from > 80 km/h to 0)
      if (speedKmh > 80 && !this.isTimingBraking) {
        this.isTimingBraking = true;
        this.brakeStartPos = pos.clone();
      } else if (this.isTimingBraking) {
        if (speedKmh < 2 && this.brakeStartPos) {
          const dist = pos.distanceTo(this.brakeStartPos);
          this.lastBrakeDist = dist.toFixed(1) + 'm';
          this.isTimingBraking = false;
          this.audio.playCheckpointChime();
        } else if (speedKmh > 85) {
          this.brakeStartPos = pos.clone();
        }
      }

      // E. Collision Physics & Dynamic Smashes
      if (collisionSystem) {
        const hits = collisionSystem.hitDynamicBoxes(pos, vehiclePhysics.velocity, 2.5);
        if (hits > 0) {
          this.smashCount += hits;
          this.stuntScore += hits * 350;
          this.audio.playCrash(0.7);
        }
      }

      return {
        mode: currentMode,
        isPlayground: true,
        title: 'VEHICLE PLAYGROUND',
        stuntScore: this.stuntScore,
        airTime: this.airTime.toFixed(1),
        maxAirTime: this.maxAirTime.toFixed(1),
        driftPoints: this.driftScore,
        smashCount: this.smashCount,
        jumpCount: this.jumpCount,
        last0to100: this.last0to100,
        lastBrakeDist: this.lastBrakeDist
      };
    }

    // 3. Free Drive
    if (currentMode === GameModes.FREE_DRIVE) {
      return {
        mode: currentMode,
        title: 'Open World Free Drive'
      };
    }

    // 4. Dedicated Driving School Systems (PRACTICE, ROAD_TEST, PARKING_TEST, COURSE_TEST)
    if (currentMode === GameModes.DRIVING_SCHOOL || currentMode === GameModes.PRACTICE || currentMode === GameModes.ROAD_TEST || currentMode === GameModes.PARKING_TEST || currentMode === GameModes.COURSE_TEST) {
      const dsData = this.drivingSchoolManager.update(dt, vehiclePhysics, vehicleController, inputManager);
      if (dsData) {
        return {
          mode: currentMode,
          title: this.activeMission?.title || 'ROAD TEST',
          ...dsData
        };
      }
    }

    // 5. Mission-based modes (COURSE_TEST)
    if (!this.activeMission || this.isCompleted || this.isFailed) {
      return {
        isCompleted: this.isCompleted,
        isFailed: this.isFailed,
        failReason: this.failReason
      };
    }

    this.missionTimer += dt;

    // Time limit check
    if (this.activeMission.timeLimit && this.missionTimer > this.activeMission.timeLimit) {
      this.isFailed = true;
      this.failReason = 'Time Expired!';
      this.audio.playCrash(0.8);
      return { isFailed: true, failReason: this.failReason };
    }

    // Road test speed limit rule
    if (this.activeMission.maxSpeedLimit && speedKmh > this.activeMission.maxSpeedLimit) {
      this.isFailed = true;
      this.failReason = `Speed Limit Exceeded! (${Math.round(speedKmh)} km/h > ${this.activeMission.maxSpeedLimit} km/h)`;
      this.audio.playCrash(0.7);
      return { isFailed: true, failReason: this.failReason };
    }

    // Checkpoint detection
    if (this.currentCheckpointIndex < this.activeCheckpoints.length) {
      const activeRing = this.checkpointMeshes[this.currentCheckpointIndex];
      if (activeRing) {
        activeRing.update(this.missionTimer, dt);

        if (activeRing.checkCollision(pos)) {
          this.audio.playCheckpointChime();
          this.currentCheckpointIndex++;

          // Check if stop zone required
          const cpData = this.activeCheckpoints[this.currentCheckpointIndex - 1];
          if (cpData.isStopZone && speedKmh > 5) {
            // Need to bring to a full stop
            // Wait for car to halt
          }

          if (this.currentCheckpointIndex >= this.activeCheckpoints.length) {
            // Mission accomplished!
            this.isCompleted = true;
            const reward = this.activeMission.reward || 1500;
            this.gameState.addCredits(reward);
          } else {
            // Activate next checkpoint ring
            if (this.checkpointMeshes[this.currentCheckpointIndex]) {
              this.checkpointMeshes[this.currentCheckpointIndex].setActive(true);
            }
          }
        }
      }
    }

    return {
      mode: currentMode,
      title: this.activeMission.title,
      description: this.activeMission.description,
      timer: this.missionTimer,
      timeLimit: this.activeMission.timeLimit,
      checkpointsLeft: this.activeCheckpoints.length - this.currentCheckpointIndex,
      totalCheckpoints: this.activeCheckpoints.length,
      isCompleted: this.isCompleted,
      isFailed: this.isFailed,
      reward: this.activeMission.reward
    };
  }

  cleanup() {
    this.checkpointMeshes.forEach(m => m.destroy());
    this.checkpointMeshes = [];
    this.activeCheckpoints = [];
    this.currentCheckpointIndex = 0;
    if (this.drivingSchoolManager) {
      this.drivingSchoolManager.cleanupCheckpoints();
    }
  }
}
