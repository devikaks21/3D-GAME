import { MathUtils } from '../utilities/MathUtils.js';

export const POI_LOCATIONS = [
  { id: 'city_center', name: 'Downtown City Center', x: 0, z: 0, icon: '🏙️' },
  { id: 'park', name: 'Emerald Public Park', x: 135, z: -135, icon: '🌳' },
  { id: 'dealership', name: 'Car Dealership Showroom', x: 220, z: -45, icon: '✨' },
  { id: 'garage_tuning', name: 'Custom Tuning Garage', x: 220, z: 40, icon: '🔧' },
  { id: 'car_wash', name: 'Express Car Wash', x: 220, z: 105, icon: '🧼' },
  { id: 'petrol_station', name: 'Octane Gas & Fuel Station', x: 0, z: 220, icon: '⛽' },
  { id: 'school', name: 'Oakridge Academy School', x: 135, z: 135, icon: '🏫' },
  { id: 'apartments', name: 'Skyline Residential Apartments', x: -135, z: -135, icon: '🏢' },
  { id: 'parking_lot', name: 'Driving Practice Parking Lot', x: -135, z: 135, icon: '🅿️' },
  { id: 'tram_line', name: 'Central Avenue Tram Station', x: -45, z: 0, icon: '🚊' },
  { id: 'riverbed', name: 'Riverbed Suspension Bridge', x: 0, z: -260, icon: '🌊' },
  { id: 'ring_road', name: 'Metropolitan Ring Road Highway', x: 0, z: -290, icon: '🛣️' },
  { id: 'airport', name: 'International Airport & Runway', x: 480, z: 0, icon: '✈️' },
  { id: 'beach', name: 'Coastal Beach & Pier', x: 0, z: 440, icon: '🏖️' },
  { id: 'mountain', name: 'Alpine Mountain Pass', x: 0, z: -420, icon: '⛰️' },
  { id: 'racing_circuit', name: 'Grand Prix Racing Circuit', x: -480, z: -140, icon: '🏁' },
  { id: 'playground', name: 'Mega Stunt Playground', x: -360, z: 360, icon: '🎪' }
];

export class NavigationSystem {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;

    this.destination = POI_LOCATIONS[0];
    this.checkpoints = [];
    this.activeCheckpointIndex = 0;
  }

  setDestination(poi) {
    this.destination = poi;
  }

  setCheckpoints(checkpoints) {
    this.checkpoints = checkpoints;
    this.activeCheckpointIndex = 0;
  }

  update(playerPos, playerHeading, trafficPositions = []) {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const radarRadius = w * 0.46;
    const zoom = 0.5;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Save context for rotating radar map with player heading
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(playerHeading);

    // Radar background circle
    ctx.fillStyle = '#080c12';
    ctx.beginPath();
    ctx.arc(0, 0, radarRadius, 0, Math.PI * 2);
    ctx.fill();

    // Road network lines (relative to player)
    ctx.strokeStyle = '#223040';
    ctx.lineWidth = 6;
    ctx.beginPath();

    // City grid
    const blockSize = 90;
    for (let i = -2; i <= 2; i++) {
      const lineX = (i * blockSize - playerPos.x) * zoom;
      const lineZ = (i * blockSize - playerPos.z) * zoom;

      ctx.moveTo(lineX, -radarRadius * 2);
      ctx.lineTo(lineX, radarRadius * 2);

      ctx.moveTo(-radarRadius * 2, lineZ);
      ctx.lineTo(radarRadius * 2, lineZ);
    }
    ctx.stroke();

    // Ring Road Highway Loop (4 perimeter lines)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    const r = 290;
    const hwN = (-r - playerPos.z) * zoom;
    const hwS = (r - playerPos.z) * zoom;
    const hwW = (-r - playerPos.x) * zoom;
    const hwE = (r - playerPos.x) * zoom;

    ctx.strokeRect(hwW, hwN, hwE - hwW, hwS - hwN);

    // River Water Channel line
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 8;
    ctx.beginPath();
    const rz = (-260 - playerPos.z) * zoom;
    ctx.moveTo(-radarRadius * 2, rz);
    ctx.lineTo(radarRadius * 2, rz);
    ctx.stroke();

    // Active Mission Checkpoints
    if (this.checkpoints.length > 0 && this.activeCheckpointIndex < this.checkpoints.length) {
      const cp = this.checkpoints[this.activeCheckpointIndex];
      const cpx = (cp.x - playerPos.x) * zoom;
      const cpz = (cp.z - playerPos.z) * zoom;

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cpx, cpz, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(cpx, cpz, 8, 0, Math.PI * 2);
      ctx.fill();

      // GPS Guide line to active checkpoint
      ctx.strokeStyle = '#00f0ff';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(cpx, cpz);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Destination Pin
    if (this.destination) {
      const dx = (this.destination.x - playerPos.x) * zoom;
      const dz = (this.destination.z - playerPos.z) * zoom;

      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(dx, dz, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // AI Traffic blips
    ctx.fillStyle = '#ff2a5f';
    trafficPositions.forEach(t => {
      const tx = (t.x - playerPos.x) * zoom;
      const tz = (t.z - playerPos.z) * zoom;
      if (Math.hypot(tx, tz) < radarRadius) {
        ctx.beginPath();
        ctx.arc(tx, tz, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();

    // Radar Circular Border
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Player Direction Arrow
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9);
    ctx.lineTo(cx - 6, cy + 7);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx + 6, cy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cardinal Compass markings (North, East, South, West)
    const compassHeading = -playerHeading;
    const compassPoints = [
      { label: 'N', angle: 0, color: '#ff3333' },
      { label: 'E', angle: Math.PI / 2, color: '#8899aa' },
      { label: 'S', angle: Math.PI, color: '#8899aa' },
      { label: 'W', angle: -Math.PI / 2, color: '#8899aa' }
    ];

    ctx.font = 'bold 10px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    compassPoints.forEach(cp => {
      const totalAngle = cp.angle + compassHeading - Math.PI / 2;
      const px = cx + Math.cos(totalAngle) * (radarRadius - 10);
      const py = cy + Math.sin(totalAngle) * (radarRadius - 10);
      ctx.fillStyle = cp.color;
      ctx.fillText(cp.label, px, py);
    });
  }

  getGpsDistance(playerPos) {
    if (!this.destination) return 0;
    const dx = this.destination.x - playerPos.x;
    const dz = this.destination.z - playerPos.z;
    return Math.round(Math.hypot(dx, dz));
  }
}
