import * as THREE from 'three';

/**
 * Visual glowing checkpoint gate / ring with pulsing animation
 */
export class Checkpoint {
  constructor(scene, position, radius = 5, color = 0x00f0ff) {
    this.scene = scene;
    this.position = position.clone();
    this.radius = radius;
    this.color = color;
    this.active = true;
    this.passed = false;

    this.group = new THREE.Group();
    this.group.position.copy(position);

    // Glowing outer ring/arch
    const torusGeom = new THREE.TorusGeometry(radius, 0.25, 12, 32, Math.PI);
    this.torusMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8
    });
    const arch = new THREE.Mesh(torusGeom, this.torusMat);
    arch.position.y = 0;
    this.group.add(arch);

    // Vertical side pillars
    const pillarGeom = new THREE.CylinderGeometry(0.2, 0.25, 4, 16);
    const p1 = new THREE.Mesh(pillarGeom, this.torusMat);
    p1.position.set(-radius, 2, 0);
    const p2 = new THREE.Mesh(pillarGeom, this.torusMat);
    p2.position.set(radius, 2, 0);
    this.group.add(p1, p2);

    // Ground target circle
    const discGeom = new THREE.RingGeometry(0.5, radius, 32);
    this.discMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeom, this.discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.05;
    this.group.add(disc);

    // Animated vertical light beam
    const beamGeom = new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, 14, 16, 1, true);
    this.beamMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeom, this.beamMat);
    beam.position.y = 7;
    this.group.add(beam);

    this.scene.add(this.group);
  }

  update(time, dt) {
    if (!this.active) return;
    const pulse = 0.8 + 0.3 * Math.sin(time * 4);
    this.torusMat.emissiveIntensity = pulse;
    this.discMat.opacity = 0.25 + 0.15 * Math.sin(time * 3);
  }

  checkCollision(vehiclePosition) {
    if (!this.active || this.passed) return false;
    const dist2D = Math.hypot(this.position.x - vehiclePosition.x, this.position.z - vehiclePosition.z);
    const distY = Math.abs(this.position.y - vehiclePosition.y);
    if (dist2D <= this.radius + 2.5 && distY <= 8.0) {
      this.passed = true;
      this.setActive(false);
      return true;
    }
    return false;
  }

  setColor(color) {
    this.color = color;
    this.torusMat.color.set(color);
    this.torusMat.emissive.set(color);
    this.discMat.color.set(color);
    this.beamMat.color.set(color);
  }

  setActive(active) {
    this.active = active;
    this.group.visible = active;
  }

  destroy() {
    this.scene.remove(this.group);
    this.torusMat.dispose();
    this.discMat.dispose();
    this.beamMat.dispose();
  }
}
