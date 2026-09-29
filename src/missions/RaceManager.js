import * as THREE from 'three';
import { MathUtils } from '../utilities/MathUtils.js';

/**
 * Grand Prix Circuit Race Manager
 * Handles:
 * - Free Track Driving & Time Trial modes
 * - 3-2-1-GO starting grid lights countdown
 * - Lap timing formatted as MM:SS.mmm (e.g. 01:24.532)
 * - Best lap recording with localStorage persistence
 * - Timing checkpoints & sector splits
 * - Pit stop detection & service
 * - Solo precision driving (No AI opponents required)
 */
export class RaceManager {
  constructor(audioManager) {
    this.audio = audioManager;
    this.active = false;
    this.raceMode = 'TIME_TRIAL'; // 'TIME_TRIAL' | 'FREE_TRACK'

    this.currentLap = 1;
    this.totalLaps = 3;
    this.currentLapTime = 0;
    this.lastLapTime = null;
    this.isNewBestLap = false;
    this.newBestLapTimer = 0;

    // Load persisted best lap time (defaults to benchmark record 79.871s -> 01:19.871)
    const savedBest = localStorage.getItem('openroad_circuit_best_lap');
    this.bestLapTime = savedBest ? parseFloat(savedBest) : 79.871;

    // Countdown state (3, 2, 1, GO)
    this.countdown = 3.5;
    this.isCountingDown = false;
    this.canDrive = true;
    this.countdownInt = 3;

    // Pit stop status
    this.inPitStop = false;
    this.pitStopTimer = 0;
    this.pitStopCompleted = false;

    // Sector timing
    this.currentSector = 1;
    this.sectorTimes = [0, 0, 0];
    this.lastSectorTimes = [0, 0, 0];

    // Checkpoints covering the full circuit loop
    // Start / Finish Line is at X: -460, Z: -100
    this.circuitCheckpoints = [
      { x: -460, z: -20, radius: 16, sector: 1, name: 'Main Straight Mid' },
      { x: -460, z: 90, radius: 16, sector: 1, name: 'Turn 1 Braking Point' },
      { x: -485, z: 160, radius: 16, sector: 1, isSectorSplit: true, splitIndex: 1, name: 'Sector 1 Split - Turn 1 Entry' },
      { x: -530, z: 215, radius: 18, sector: 2, name: 'South Hairpin Apex' },
      { x: -575, z: 155, radius: 16, sector: 2, name: 'Turn 3 Exit' },
      { x: -580, z: 0, radius: 16, sector: 2, name: 'Back Straight Speed Trap' },
      { x: -580, z: -110, radius: 16, sector: 2, isSectorSplit: true, splitIndex: 2, name: 'Sector 2 Split - Turn 4 Entry' },
      { x: -555, z: -180, radius: 16, sector: 3, name: 'North Chicane Apex' },
      { x: -505, z: -185, radius: 16, sector: 3, name: 'Turn 5 Sweeper' },
      { x: -470, z: -145, radius: 16, sector: 3, name: 'Turn 6 Final Corner' },
      { x: -460, z: -100, radius: 18, sector: 3, isFinishLine: true, name: 'Start / Finish Line' }
    ];
    this.currentCheckpointIndex = 0;
  }

  startRace(mode = 'TIME_TRIAL') {
    this.active = true;
    this.raceMode = mode;
    this.currentLap = 1;
    this.totalLaps = mode === 'TIME_TRIAL' ? 3 : Infinity;
    this.currentLapTime = 0;
    this.currentCheckpointIndex = 0;
    this.currentSector = 1;
    this.sectorTimes = [0, 0, 0];
    this.isNewBestLap = false;
    this.newBestLapTimer = 0;

    if (mode === 'TIME_TRIAL') {
      this.countdown = 3.5;
      this.isCountingDown = true;
      this.canDrive = false;
      this.countdownInt = 3;
    } else {
      // Free Track Driving starts immediately
      this.isCountingDown = false;
      this.canDrive = true;
      this.countdown = 0;
    }
  }

  update(dt, vehiclePos, racingTrack) {
    if (!this.active) return null;

    // 1. Countdown update (for Time Trial)
    if (this.isCountingDown) {
      const prevInt = Math.ceil(this.countdown);
      this.countdown -= dt;
      const currentInt = Math.ceil(this.countdown);

      if (currentInt !== prevInt && currentInt > 0) {
        this.countdownInt = currentInt;
        this.audio.playCheckpointChime();
      }

      if (this.countdown <= 0) {
        this.isCountingDown = false;
        this.canDrive = true;
        this.audio.playCheckpointChime();
      }

      return {
        mode: this.raceMode,
        isCountingDown: true,
        countdown: Math.max(0, Math.ceil(this.countdown)),
        lapDisplay: this.getLapDisplay(),
        currentStr: 'CURRENT: ' + MathUtils.formatLapTime(0),
        bestStr: 'BEST: ' + MathUtils.formatLapTime(this.bestLapTime),
        canDrive: this.canDrive
      };
    }

    // 2. Lap timer running
    this.currentLapTime += dt;
    this.sectorTimes[this.currentSector - 1] += dt;

    if (this.newBestLapTimer > 0) {
      this.newBestLapTimer -= dt;
      if (this.newBestLapTimer <= 0) this.isNewBestLap = false;
    }

    // 3. Checkpoint & Sector progression
    const cp = this.circuitCheckpoints[this.currentCheckpointIndex];
    const dist = Math.hypot(cp.x - vehiclePos.x, cp.z - vehiclePos.z);

    if (dist <= cp.radius) {
      this.audio.playCheckpointChime();

      if (cp.isSectorSplit) {
        this.lastSectorTimes[cp.splitIndex - 1] = this.sectorTimes[cp.splitIndex - 1];
        this.currentSector = cp.splitIndex + 1;
      }

      if (cp.isFinishLine) {
        // Complete lap!
        this.lastLapTime = this.currentLapTime;
        this.lastSectorTimes[2] = this.sectorTimes[2];

        // Check if new best lap
        if (!this.bestLapTime || this.currentLapTime < this.bestLapTime) {
          this.bestLapTime = this.currentLapTime;
          this.isNewBestLap = true;
          this.newBestLapTimer = 5.0; // Flash banner for 5 seconds
          localStorage.setItem('openroad_circuit_best_lap', this.bestLapTime.toString());
        }

        if (this.raceMode === 'TIME_TRIAL' && this.currentLap >= this.totalLaps) {
          // Time trial completed!
          this.active = false;
          return {
            mode: this.raceMode,
            finished: true,
            currentLap: this.currentLap,
            totalLaps: this.totalLaps,
            lapDisplay: `LAP ${this.totalLaps}/${this.totalLaps}`,
            bestLap: this.bestLapTime,
            bestStr: 'BEST: ' + MathUtils.formatLapTime(this.bestLapTime),
            lastLapTime: this.lastLapTime,
            lastLapStr: MathUtils.formatLapTime(this.lastLapTime),
            currentStr: 'CURRENT: ' + MathUtils.formatLapTime(this.lastLapTime),
            totalTime: this.currentLapTime,
            isNewBestLap: this.isNewBestLap
          };
        } else {
          // Start next lap
          this.currentLap++;
          this.currentLapTime = 0;
          this.currentCheckpointIndex = 0;
          this.currentSector = 1;
          this.sectorTimes = [0, 0, 0];
        }
      } else {
        this.currentCheckpointIndex++;
      }
    }

    // 4. Pit stop check
    if (racingTrack && racingTrack.checkPitStop(vehiclePos)) {
      if (!this.inPitStop) {
        this.inPitStop = true;
        this.pitStopTimer = 3.5; // 3.5 second tire change & refuel
        this.audio.playCheckpointChime();
      } else if (this.pitStopTimer > 0) {
        this.pitStopTimer -= dt;
        if (this.pitStopTimer <= 0) {
          this.pitStopCompleted = true;
        }
      }
    } else {
      this.inPitStop = false;
      this.pitStopCompleted = false;
    }

    return {
      mode: this.raceMode,
      currentLap: this.currentLap,
      totalLaps: this.totalLaps,
      lapDisplay: this.getLapDisplay(),
      currentStr: 'CURRENT: ' + MathUtils.formatLapTime(this.currentLapTime),
      bestStr: 'BEST: ' + MathUtils.formatLapTime(this.bestLapTime),
      lapTime: this.currentLapTime,
      bestLap: this.bestLapTime,
      lastLapTime: this.lastLapTime,
      lastLapStr: this.lastLapTime ? MathUtils.formatLapTime(this.lastLapTime) : null,
      currentSector: this.currentSector,
      sectorTime: this.sectorTimes[this.currentSector - 1],
      isNewBestLap: this.isNewBestLap,
      inPitStop: this.inPitStop,
      pitTimeLeft: Math.max(0, this.pitStopTimer).toFixed(1),
      pitStopCompleted: this.pitStopCompleted,
      canDrive: this.canDrive,
      isCountingDown: false
    };
  }

  getLapDisplay() {
    if (this.raceMode === 'TIME_TRIAL') {
      return `LAP ${this.currentLap}/${this.totalLaps}`;
    }
    return `LAP ${this.currentLap}`;
  }

  getActiveCheckpoints() {
    return this.circuitCheckpoints;
  }
}
