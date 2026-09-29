import * as THREE from 'three';

/**
 * Procedural texture and material generator
 * Produces crisp, beautiful materials without relying on external CDNs
 */
export class AssetManager {
  constructor() {
    this.textures = new Map();
    this.materials = new Map();
  }

  // Create asphalt road texture with lane markings
  getRoadTexture() {
    if (this.textures.has('road')) return this.textures.get('road');

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark asphalt base
    ctx.fillStyle = '#1c1f22';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle asphalt noise speckles
    for (let i = 0; i < 8000; i++) {
      const shade = Math.floor(22 + Math.random() * 20);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // White edge lines
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 0, 8, 512);
    ctx.fillRect(488, 0, 8, 512);

    // Dashed center yellow lines
    ctx.fillStyle = '#ffbb00';
    ctx.setLineDash([48, 48]);
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.textures.set('road', texture);
    return texture;
  }

  // Showroom reflective dark grid floor
  getShowroomGridTexture() {
    if (this.textures.has('showroomGrid')) return this.textures.get('showroomGrid');

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#08090c';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#182434';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 510, 510);

    ctx.strokeStyle = '#22384f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(256, 0); ctx.lineTo(256, 512);
    ctx.moveTo(0, 256); ctx.lineTo(512, 256);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(24, 24);
    this.textures.set('showroomGrid', texture);
    return texture;
  }

  // Building window facade texture with emissive warm & cool office lights
  getBuildingFacadeTexture() {
    if (this.textures.has('building')) return this.textures.get('building');

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Concrete/glass facade
    ctx.fillStyle = '#121418';
    ctx.fillRect(0, 0, 256, 512);

    const cols = 8;
    const rows = 24;
    const w = 256 / cols;
    const h = 512 / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rand = Math.random();
        if (rand > 0.45) {
          // Lighted window
          const hue = rand > 0.75 ? '#cceeff' : '#ffea9f'; // Cool cyan or warm yellow
          ctx.fillStyle = hue;
        } else {
          // Dark window
          ctx.fillStyle = '#0a0b0e';
        }
        ctx.fillRect(c * w + 4, r * h + 4, w - 8, h - 8);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.textures.set('building', texture);
    return texture;
  }

  // Red and white racing circuit kerb (rumble strip)
  getRacingKerbTexture() {
    if (this.textures.has('kerb')) return this.textures.get('kerb');

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#e60000';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 128, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.textures.set('kerb', texture);
    return texture;
  }

  // Carbon fiber weave texture for spoilers and trim
  getCarbonFiberTexture() {
    if (this.textures.has('carbon')) return this.textures.get('carbon');

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillRect(16, 16, 16, 16);

    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 8, 16, 8);
    ctx.fillRect(16, 24, 16, 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    this.textures.set('carbon', texture);
    return texture;
  }

  // Tire tread texture
  getTireTreadTexture() {
    if (this.textures.has('tire')) return this.textures.get('tire');

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, 64, 128);

    ctx.fillStyle = '#0a0a0a';
    for (let y = 0; y < 128; y += 16) {
      ctx.fillRect(8, y, 20, 6);
      ctx.fillRect(36, y + 8, 20, 6);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.textures.set('tire', texture);
    return texture;
  }

  // Black and white checkered start/finish line texture
  getCheckeredTexture() {
    if (this.textures.has('checkered')) return this.textures.get('checkered');

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const tileSize = 32;
    for (let y = 0; y < 64; y += tileSize) {
      for (let x = 0; x < 256; x += tileSize) {
        ctx.fillStyle = ((x / tileSize + y / tileSize) % 2 === 0) ? '#ffffff' : '#0a0a0a';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.textures.set('checkered', texture);
    return texture;
  }

  // Starting grid box texture with pole marker and boundary
  getGridBoxTexture(boxNumber = 1) {
    const key = `gridbox_${boxNumber}`;
    if (this.textures.has(key)) return this.textures.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.clearRect(0, 0, 256, 512);

    // Outer white box border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, 224, 480);

    // Front yellow pole line
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(16, 16, 224, 24);

    // Box number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${boxNumber}`, 128, 256);

    const texture = new THREE.CanvasTexture(canvas);
    this.textures.set(key, texture);
    return texture;
  }

  // High-contrast motorsport sponsor banner texture
  getSponsorBannerTexture(text = 'CIRCUIT GRAND PRIX', bgColor = '#e60000', textColor = '#ffffff') {
    const key = `sponsor_${text}_${bgColor}`;
    if (this.textures.has(key)) return this.textures.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 128);

    // Carbon / metallic accent strips top & bottom
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 512, 12);
    ctx.fillRect(0, 116, 512, 12);

    // Brand text
    ctx.fillStyle = textColor;
    ctx.font = '900 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '4px';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    this.textures.set(key, texture);
    return texture;
  }

  // Yellow and black diagonal hazard warning stripes for concrete blocks and barriers
  getHazardTexture() {
    if (this.textures.has('hazard')) return this.textures.get('hazard');

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#111111';
    ctx.beginPath();
    for (let i = -128; i < 256; i += 32) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 16, 0);
      ctx.lineTo(i + 16 + 128, 128);
      ctx.lineTo(i + 128, 128);
      ctx.closePath();
    }
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    this.textures.set('hazard', texture);
    return texture;
  }

  // Skidpad concentric turning circle rings texture
  getSkidpadTexture() {
    if (this.textures.has('skidpad')) return this.textures.get('skidpad');

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#18191e';
    ctx.fillRect(0, 0, 512, 512);

    // Concentric rings
    const radii = [60, 120, 180, 240];
    const colors = ['#00f0ff', '#ffaa00', '#00f0ff', '#ff0055'];

    radii.forEach((r, idx) => {
      ctx.strokeStyle = colors[idx];
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      ctx.arc(256, 256, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(256, 16); ctx.lineTo(256, 496);
    ctx.moveTo(16, 256); ctx.lineTo(496, 256);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    this.textures.set('skidpad', texture);
    return texture;
  }
}


