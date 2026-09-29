/**
 * Math and geometry utilities for Open Road 3D
 */
export const MathUtils = {
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  lerp(start, end, t) {
    return start + (end - start) * t;
  },

  damp(current, target, smoothing, dt) {
    return this.lerp(current, target, 1 - Math.exp(-smoothing * dt));
  },

  angleDifference(from, to) {
    let diff = (to - from) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  },

  lerpAngle(from, to, t) {
    return from + this.angleDifference(from, to) * t;
  },

  degToRad(degrees) {
    return degrees * (Math.PI / 180);
  },

  radToDeg(radians) {
    return radians * (180 / Math.PI);
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  },

  formatLapTime(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) {
      return '--:--.---';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  },

  formatDelta(deltaSeconds) {
    if (deltaSeconds === null || deltaSeconds === undefined || isNaN(deltaSeconds)) return '';
    const sign = deltaSeconds > 0 ? '+' : '-';
    const abs = Math.abs(deltaSeconds);
    const secs = Math.floor(abs);
    const ms = Math.floor((abs % 1) * 1000);
    return `${sign}${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  },

  randomRange(min, max) {
    return min + Math.random() * (max - min);
  },

  randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  distance2D(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dz * dz);
  }
};
