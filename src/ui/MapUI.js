import { GameStates } from '../core/GameState.js';

export const WORLD_SECTORS = [
  {
    id: 'city',
    name: 'Downtown Metropolis',
    icon: '🏙️',
    description: 'High-density urban street grid lined with modern skyscrapers, animated traffic lights, and active AI traffic.',
    spawn: { x: 0, y: 0.4, z: 0, heading: 0 }
  },
  {
    id: 'dealership',
    name: 'Premier Car Dealership',
    icon: '✨',
    description: 'Luxury glass showroom featuring rotating vehicle display turntables, specs inspection, and sales floor.',
    spawn: { x: 195, y: 0.4, z: -45, heading: Math.PI / 2 }
  },
  {
    id: 'garage',
    name: 'Customs & Tuning Garage',
    icon: '🔧',
    description: 'Drive-in service bay equipped with hydraulic lift, tool chests, live paint studio, rims, and neon underglow tuning.',
    spawn: { x: 205, y: 0.4, z: 40, heading: Math.PI / 2 }
  },
  {
    id: 'car_wash',
    name: 'Express Car Wash Tunnel',
    icon: '🧼',
    description: 'Drive-through automated wash facility with rotating foam brushes, cascading water mist, and instant gleam finish.',
    spawn: { x: 220, y: 0.4, z: 75, heading: 0 }
  },
  {
    id: 'petrol_station',
    name: 'Octane Gas & Fuel Station',
    icon: '⛽',
    description: 'Highway service station featuring 4 dual-sided pump islands, overhead illuminated canopy, and convenience store.',
    spawn: { x: 0, y: 0.4, z: 200, heading: 0 }
  },
  {
    id: 'park',
    name: 'Emerald Public Park',
    icon: '🌳',
    description: 'Green urban oasis with winding cobblestone walking paths, central fountain, shaded benches, and trees.',
    spawn: { x: 135, y: 0.4, z: -80, heading: Math.PI }
  },
  {
    id: 'school',
    name: 'Oakridge Motoring Academy',
    icon: '🏫',
    description: 'Academic brick campus featuring clock tower, school drop-off loop, zebra crosswalks, and 30 km/h speed zone.',
    spawn: { x: 135, y: 0.4, z: 90, heading: 0 }
  },
  {
    id: 'apartments',
    name: 'Skyline Residential Towers',
    icon: '🏢',
    description: 'Multi-story residential apartment towers with individual balconies, glass entrance lobbies, and parking bays.',
    spawn: { x: -135, y: 0.4, z: -90, heading: Math.PI }
  },
  {
    id: 'parking_lot',
    name: 'Parking Practice Facility',
    icon: '🅿️',
    description: 'Massive asphalt parking lot with dual-sided stalls, divider curbs, and practice cone slalom bays.',
    spawn: { x: -135, y: 0.4, z: 90, heading: 0 }
  },
  {
    id: 'tram_line',
    name: 'Central Tram Route',
    icon: '🚊',
    description: 'Dual embedded tram rails and overhead catenary cables running along the avenue with an active electric tram.',
    spawn: { x: -45, y: 0.4, z: 0, heading: 0 }
  },
  {
    id: 'riverbed',
    name: 'Riverbed & Bridges',
    icon: '🌊',
    description: 'Sunken natural riverbed with earthen slopes, river rocks, and arched multi-lane suspension bridges.',
    spawn: { x: 0, y: 0.4, z: -260, heading: 0 }
  },
  {
    id: 'ring_road',
    name: 'Metropolitan Ring Road',
    icon: '🛣️',
    description: '4-lane arterial orbital highway enclosing the city with median barriers and overhead directional gantries.',
    spawn: { x: 0, y: 0.4, z: -290, heading: Math.PI / 2 }
  },
  {
    id: 'airport',
    name: 'International Airport',
    icon: '✈️',
    description: '750m paved runway for high-speed drag runs, passenger terminal, parking area, hangars, and control tower.',
    spawn: { x: 480, y: 0.4, z: 320, heading: Math.PI }
  },
  {
    id: 'beach',
    name: 'Emerald Coast Boulevard',
    icon: '🏖️',
    description: 'Scenic oceanfront highway with palm tree promenade, animated ocean waves, beach pier, and coastal lighthouse.',
    spawn: { x: 0, y: 0.4, z: 440, heading: -Math.PI / 2 }
  },
  {
    id: 'mountain',
    name: 'Alpine Mountain Pass',
    icon: '⛰️',
    description: 'Elevated winding serpentine pass, cliff-edge hairpins, gorge viaduct, mountain rock tunnel, and summit observatory lookout.',
    spawn: { x: 0, y: 0.5, z: -280, heading: Math.PI }
  },
  {
    id: 'circuit',
    name: 'Grand Prix Racing Circuit',
    icon: '🏁',
    description: 'Full motorsport race track with apex rumble kerbs, start/finish gantry, pit stop lane, and grandstands.',
    spawn: { x: -480, y: 0.4, z: -140, heading: 0 }
  },
  {
    id: 'playground',
    name: 'Mega Stunt Playground',
    icon: '🎪',
    description: 'Vehicle playground featuring mega launch ramps, stunt loops, half-pipes, and smashable dynamic obstacle crates.',
    spawn: { x: -350, y: 0.4, z: 350, heading: -Math.PI / 4 }
  }
];

export class MapUI {
  constructor(container, gameState, audioManager, onTeleport) {
    this.container = container;
    this.gameState = gameState;
    this.audio = audioManager;
    this.onTeleport = onTeleport;

    this.root = null;
    this.init();
  }

  init() {
    this.root = document.createElement('div');
    this.root.className = 'map-overlay cinematic-overlay';
    this.root.id = 'map-root';
    this.root.style.display = 'none';

    this.root.innerHTML = `
      <header class="map-header">
        <button class="back-btn glass-btn" id="map-back-btn">◀ MAIN MENU</button>
        <div class="map-title-wrap">
          <span class="brand-badge">SATELLITE TELEMETRY</span>
          <h2 class="map-title">CONNECTED OPEN-WORLD MAP</h2>
        </div>
        <div class="map-tag">14 SECTORS & DESTINATIONS</div>
      </header>

      <div class="map-grid-container">
        ${WORLD_SECTORS.map(sector => `
          <div class="sector-card glass-panel" data-sector="${sector.id}">
            <div class="sector-header">
              <span class="sector-icon">${sector.icon}</span>
              <span class="sector-badge">SECTOR</span>
            </div>
            <h3 class="sector-name">${sector.name}</h3>
            <p class="sector-desc">${sector.description}</p>
            <div class="sector-actions">
              <button class="teleport-btn" data-sector="${sector.id}">FAST TRAVEL ➔</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.container.appendChild(this.root);
    this.bindEvents();
  }

  bindEvents() {
    this.root.querySelector('#map-back-btn').addEventListener('click', () => {
      this.audio.playUIClick();
      this.gameState.setState(GameStates.MENU);
    });

    this.root.querySelectorAll('.teleport-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sectorId = btn.dataset.sector;
        const sector = WORLD_SECTORS.find(s => s.id === sectorId);
        if (sector) {
          this.audio.playUIClick();
          this.onTeleport(sector.spawn);
        }
      });
    });
  }

  show() {
    this.root.style.display = 'flex';
  }

  hide() {
    this.root.style.display = 'none';
  }
}
