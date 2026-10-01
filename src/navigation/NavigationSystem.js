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
    const zoom = 0.48;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Save context for rotating radar map with player heading
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(playerHeading);

    // 1. Radar background circular base
    ctx.fillStyle = '#070b12';
    ctx.beginPath();
    ctx.arc(0, 0, radarRadius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle concentric distance range rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach(rRatio => {
      ctx.beginPath();
      ctx.arc(0, 0, radarRadius * rRatio, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 2. ROADS: Urban streets, intersections, and highway loop
    // A. City Grid Street Corridors
    const blockSize = 90;
    const gridRange = 3;

    // Road asphalt base
    ctx.strokeStyle = '#182232';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = -gridRange; i <= gridRange; i++) {
      const lineX = (i * blockSize - playerPos.x) * zoom;
      const lineZ = (i * blockSize - playerPos.z) * zoom;
      ctx.moveTo(lineX, -radarRadius * 2.2);
      ctx.lineTo(lineX, radarRadius * 2.2);
      ctx.moveTo(-radarRadius * 2.2, lineZ);
      ctx.lineTo(radarRadius * 2.2, lineZ);
    }
    ctx.stroke();

    // Road centerlines (dashed)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    for (let i = -gridRange; i <= gridRange; i++) {
      const lineX = (i * blockSize - playerPos.x) * zoom;
      const lineZ = (i * blockSize - playerPos.z) * zoom;
      ctx.moveTo(lineX, -radarRadius * 2);
      ctx.lineTo(lineX, radarRadius * 2);
      ctx.moveTo(-radarRadius * 2, lineZ);
      ctx.lineTo(radarRadius * 2, lineZ);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // B. Metropolitan Ring Road Highway Loop (r = 290)
    const r = 290;
    const hwN = (-r - playerPos.z) * zoom;
    const hwS = (r - playerPos.z) * zoom;
    const hwW = (-r - playerPos.x) * zoom;
    const hwE = (r - playerPos.x) * zoom;

    ctx.strokeStyle = '#22384e';
    ctx.lineWidth = 13;
    ctx.strokeRect(hwW, hwN, hwE - hwW, hwS - hwN);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hwW, hwN, hwE - hwW, hwS - hwN);

    // C. Riverbed Waterway Channel (Z = -260)
    const rz = (-260 - playerPos.z) * zoom;
    ctx.strokeStyle = 'rgba(2, 132, 199, 0.45)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(-radarRadius * 2.2, rz);
    ctx.lineTo(radarRadius * 2.2, rz);
    ctx.stroke();

    // 3. IMPORTANT LOCATIONS (Points of Interest)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '10px sans-serif';

    const importantPois = [
      { id: 'city_center', name: 'CITY', x: 0, z: 0, color: '#a855f7', icon: '🏙️' },
      { id: 'school', name: 'ACADEMY', x: 135, z: 135, color: '#38bdf8', icon: '🎓' },
      { id: 'parking_lot', name: 'PARKING', x: -135, z: 135, color: '#22c55e', icon: '🅿️' },
      { id: 'petrol_station', name: 'GAS', x: 0, z: 220, color: '#f59e0b', icon: '⛽' },
      { id: 'garage_tuning', name: 'GARAGE', x: 220, z: 40, color: '#06b6d4', icon: '🔧' },
      { id: 'racing_circuit', name: 'RACE', x: -480, z: -140, color: '#10b981', icon: '🏁' },
      { id: 'playground', name: 'STUNT', x: -360, z: 360, color: '#ec4899', icon: '🎪' }
    ];

    importantPois.forEach(poi => {
      const px = (poi.x - playerPos.x) * zoom;
      const pz = (poi.z - playerPos.z) * zoom;
      const pDist = Math.hypot(px, pz);

      if (pDist < radarRadius - 8) {
        // Draw POI marker pin
        ctx.fillStyle = poi.color;
        ctx.beginPath();
        ctx.arc(px, pz, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = 'bold 8px Rajdhani, sans-serif';
        ctx.fillText(poi.name, px, pz - 8);
      }
    });

    // 4. NAVIGATION ROUTE (Polyline path connecting player -> checkpoints -> destination)
    if (this.checkpoints.length > 0 && this.activeCheckpointIndex < this.checkpoints.length) {
      // Glow underlay for route
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);

      const lookAhead = Math.min(this.checkpoints.length, this.activeCheckpointIndex + 5);
      for (let i = this.activeCheckpointIndex; i < lookAhead; i++) {
        const cp = this.checkpoints[i];
        const cpx = (cp.x - playerPos.x) * zoom;
        const cpz = (cp.z - playerPos.z) * zoom;
        ctx.lineTo(cpx, cpz);
      }
      ctx.stroke();

      // Sharp core route line
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = this.activeCheckpointIndex; i < lookAhead; i++) {
        const cp = this.checkpoints[i];
        const cpx = (cp.x - playerPos.x) * zoom;
        const cpz = (cp.z - playerPos.z) * zoom;
        ctx.lineTo(cpx, cpz);
      }
      ctx.stroke();

      // Draw active checkpoints on route
      for (let i = this.activeCheckpointIndex; i < lookAhead; i++) {
        const cp = this.checkpoints[i];
        const cpx = (cp.x - playerPos.x) * zoom;
        const cpz = (cp.z - playerPos.z) * zoom;
        const isCurrent = (i === this.activeCheckpointIndex);

        ctx.strokeStyle = isCurrent ? '#00f0ff' : 'rgba(0, 240, 255, 0.5)';
        ctx.lineWidth = isCurrent ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(cpx, cpz, isCurrent ? 7 : 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = isCurrent ? 'rgba(0, 240, 255, 0.5)' : 'rgba(0, 240, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(cpx, cpz, isCurrent ? 5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.destination) {
      // Direct navigation route line to destination
      const dx = (this.destination.x - playerPos.x) * zoom;
      const dz = (this.destination.z - playerPos.z) * zoom;

      ctx.strokeStyle = 'rgba(255, 187, 0, 0.3)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dx, dz);
      ctx.stroke();

      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dx, dz);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. DESTINATION BEACON
    if (this.destination) {
      const dx = (this.destination.x - playerPos.x) * zoom;
      const dz = (this.destination.z - playerPos.z) * zoom;
      const dist = Math.hypot(dx, dz);

      if (dist < radarRadius - 8) {
        // Destination within radar circle
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(dx, dz, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(dx, dz, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Rajdhani, sans-serif';
        ctx.fillText('DEST', dx, dz - 11);
      } else {
        // Clamp destination beacon to edge with directional indicator
        const angle = Math.atan2(dz, dx);
        const edgeX = Math.cos(angle) * (radarRadius - 10);
        const edgeZ = Math.sin(angle) * (radarRadius - 10);

        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(edgeX, edgeZ, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. AI TRAFFIC VEHICLES
    ctx.fillStyle = '#ff3366';
    trafficPositions.forEach(t => {
      const tx = (t.x - playerPos.x) * zoom;
      const tz = (t.z - playerPos.z) * zoom;
      if (Math.hypot(tx, tz) < radarRadius - 4) {
        ctx.beginPath();
        ctx.arc(tx, tz, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();

    // 7. Radar Border & Glow Ring
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 8. PLAYER VEHICLE MARKER (Centered)
    ctx.save();
    ctx.translate(cx, cy);

    // Heading beam glow
    const grad = ctx.createRadialGradient(0, 0, 2, 0, -14, 18);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.6)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 18, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
    ctx.closePath();
    ctx.fill();

    // Player Direction Arrow / Car Glyph
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(-5.5, 6);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(5.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 9. CARDINAL COMPASS (N, E, S, W)
    const compassHeading = -playerHeading;
    const compassPoints = [
      { label: 'N', angle: 0, color: '#ff3b30' },
      { label: 'E', angle: Math.PI / 2, color: 'rgba(255, 255, 255, 0.6)' },
      { label: 'S', angle: Math.PI, color: 'rgba(255, 255, 255, 0.6)' },
      { label: 'W', angle: -Math.PI / 2, color: 'rgba(255, 255, 255, 0.6)' }
    ];

    ctx.font = 'bold 9px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    compassPoints.forEach(cp => {
      const totalAngle = cp.angle + compassHeading - Math.PI / 2;
      const px = cx + Math.cos(totalAngle) * (radarRadius - 9);
      const py = cy + Math.sin(totalAngle) * (radarRadius - 9);
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
