import { VEHICLE_CATALOG } from '../vehicle/VehicleManager.js';

/**
 * Dealership showroom vehicle selection and information modal
 */
export class DealershipUI {
  constructor(container, gameState, vehicleManager, audioManager, onSelectCar) {
    this.container = container;
    this.gameState = gameState;
    this.vehicleManager = vehicleManager;
    this.audio = audioManager;
    this.onSelectCar = onSelectCar;

    this.root = null;
    this.selectedCarId = gameState.selectedVehicleId;
    this.init();
  }

  init() {
    this.root = document.createElement('div');
    this.root.className = 'modal-backdrop';
    this.root.id = 'dealership-modal';
    this.root.style.display = 'none';

    this.root.innerHTML = `
      <div class="modal-dialog dealership-dialog glass-panel">
        <div class="modal-header">
          <div>
            <span class="brand-badge">PREMIER MOTORS</span>
            <h2 class="modal-title">VEHICLE SHOWROOM</h2>
          </div>
          <button class="modal-close-btn" id="btn-close-dealership">✕</button>
        </div>

        <div class="dealership-body">
          <!-- Car selection list -->
          <div class="dealership-cars-list" id="dealership-cars-list"></div>

          <!-- Selected car details -->
          <div class="dealership-details-panel glass-panel">
            <div class="d-car-badge" id="d-car-badge">SUPERCAR</div>
            <h3 class="d-car-title" id="d-car-title">APEX GT</h3>
            <p class="d-car-desc" id="d-car-desc"></p>

            <div class="d-specs-grid">
              <div class="d-spec-box"><span class="d-spec-lbl">TOP SPEED</span><span class="d-spec-val" id="d-val-speed">310 km/h</span></div>
              <div class="d-spec-box"><span class="d-spec-lbl">ACCELERATION</span><span class="d-spec-val" id="d-val-accel">9.2/10</span></div>
              <div class="d-spec-box"><span class="d-spec-lbl">BRAKING</span><span class="d-spec-val" id="d-val-braking">8.8/10</span></div>
              <div class="d-spec-box"><span class="d-spec-lbl">HANDLING</span><span class="d-spec-val" id="d-val-handling">8.6/10</span></div>
              <div class="d-spec-box"><span class="d-spec-lbl">DRIVE TYPE</span><span class="d-spec-val" id="d-val-drive">AWD</span></div>
              <div class="d-spec-box"><span class="d-spec-lbl">WEIGHT</span><span class="d-spec-val" id="d-val-weight">1,380 kg</span></div>
            </div>

            <div class="d-actions-row">
              <button class="drive-cta-btn" id="btn-dealership-drive">TAKE FOR TEST DRIVE ➔</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.root);
    this.buildCarCards();
    this.bindEvents();
  }

  buildCarCards() {
    const list = this.root.querySelector('#dealership-cars-list');
    list.innerHTML = '';

    VEHICLE_CATALOG.forEach(car => {
      const card = document.createElement('div');
      card.className = `dealership-car-card ${car.id === this.selectedCarId ? 'active' : ''}`;
      const dStats = car.displayStats || car.specs;
      card.innerHTML = `
        <div class="d-card-header">
          <span class="d-card-name">${car.name}</span>
          <span class="d-card-cat">${car.category}</span>
        </div>
        <div class="d-card-stats">
          <span>🚀 ${dStats.acceleration}</span>
          <span>🏁 ${dStats.topSpeed}</span>
          <span>⚙️ ${dStats.driveType || car.driveType}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        this.selectedCarId = car.id;
        this.audio.playUIClick();
        this.updateSelected(car.id);
      });
      list.appendChild(card);
    });
  }

  updateSelected(carId) {
    const car = VEHICLE_CATALOG.find(v => v.id === carId);
    if (!car) return;

    this.root.querySelectorAll('.dealership-car-card').forEach((c, idx) => {
      c.classList.toggle('active', VEHICLE_CATALOG[idx].id === carId);
    });

    this.root.querySelector('#d-car-badge').textContent = car.category.toUpperCase();
    this.root.querySelector('#d-car-title').textContent = car.name.toUpperCase();
    this.root.querySelector('#d-car-desc').textContent = car.description;

    const dStats = car.displayStats || car.specs;
    this.root.querySelector('#d-val-speed').textContent = dStats.topSpeed;
    this.root.querySelector('#d-val-accel').textContent = dStats.acceleration;
    this.root.querySelector('#d-val-braking').textContent = dStats.braking;
    this.root.querySelector('#d-val-handling').textContent = dStats.handling;
    this.root.querySelector('#d-val-drive').textContent = dStats.driveType || car.driveType;
    this.root.querySelector('#d-val-weight').textContent = dStats.weight;
  }

  bindEvents() {
    this.root.querySelector('#btn-close-dealership').addEventListener('click', () => {
      this.hide();
      this.audio.playUIClick();
    });

    this.root.querySelector('#btn-dealership-drive').addEventListener('click', () => {
      this.gameState.selectVehicle(this.selectedCarId);
      this.audio.playUIClick();
      this.hide();
      if (this.onSelectCar) this.onSelectCar(this.selectedCarId);
    });
  }

  show() {
    this.root.style.display = 'flex';
    this.updateSelected(this.gameState.selectedVehicleId);
  }

  hide() {
    this.root.style.display = 'none';
  }
}
