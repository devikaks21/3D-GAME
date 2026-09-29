import * as THREE from 'three';

/**
 * Natural River and sunken Riverbed with terrain banks and roadway bridges
 */
export class Riverbed {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    // River cuts across from East to West: (Z: -260)
    this.riverZ = -260;
    this.riverWidth = 48;
    this.riverLength = 800;

    this.waterMesh = null;
    this.buildRiverbed();
    this.scene.add(this.group);
  }

  buildRiverbed() {
    const rz = this.riverZ;
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x3d352e, roughness: 0.95 });
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x224422, roughness: 0.9 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x2b303a, roughness: 0.7 });

    // 1. Sunken Riverbed Channel Ground (-2.5m)
    const bed = new THREE.Mesh(
      new THREE.PlaneGeometry(this.riverLength, this.riverWidth),
      earthMat
    );
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(0, -2.5, rz);
    bed.receiveShadow = true;
    this.group.add(bed);

    // 2. Animated Flowing River Water
    const waterGeom = new THREE.PlaneGeometry(this.riverLength, this.riverWidth - 4, 32, 8);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x006677,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88
    });
    this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(0, -1.2, rz);
    this.group.add(this.waterMesh);

    // 3. Sloping Terrain Riverbanks (North & South banks)
    const bankSlopeNorth = new THREE.Mesh(new THREE.PlaneGeometry(this.riverLength, 8), bankMat);
    bankSlopeNorth.rotation.x = -Math.PI / 3;
    bankSlopeNorth.position.set(0, -0.6, rz - this.riverWidth * 0.5);

    const bankSlopeSouth = new THREE.Mesh(new THREE.PlaneGeometry(this.riverLength, 8), bankMat);
    bankSlopeSouth.rotation.x = -2 * Math.PI / 3;
    bankSlopeSouth.position.set(0, -0.6, rz + this.riverWidth * 0.5);

    this.group.add(bankSlopeNorth, bankSlopeSouth);

    // 4. Large River Rocks along the shore
    for (let x = -350; x <= 350; x += 40) {
      const rockGeom = new THREE.DodecahedronGeometry(1.4 + Math.random() * 1.8);
      const rock = new THREE.Mesh(rockGeom, rockMat);
      rock.position.set(x + (Math.random() - 0.5) * 15, -1.4, rz + (Math.random() - 0.5) * (this.riverWidth - 10));
      this.group.add(rock);
      this.collisionSystem.addCollider(rock, 'rock');
    }

    // 5. Roadway Suspension Bridges across Riverbed
    // Central Main Bridge at X: 0
    this.createBridge(0, rz, bridgeMat);
    // East Bridge at X: 220
    this.createBridge(220, rz, bridgeMat);
    // West Bridge at X: -220
    this.createBridge(-220, rz, bridgeMat);
  }

  createBridge(x, z, material) {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(x, 0.4, z);

    // Bridge road deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, this.riverWidth + 14), material);
    deck.position.set(0, 0.6, 0);
    deck.receiveShadow = true;
    bridgeGroup.add(deck);

    // Guardrails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, this.riverWidth + 14), railMat);
    railL.position.set(11, 1.6, 0);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, this.riverWidth + 14), railMat);
    railR.position.set(-11, 1.6, 0);
    bridgeGroup.add(railL, railR);

    // Concrete riverbed support pillars
    [-8, 8].forEach(dx => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 6, 12), material);
      pillar.position.set(dx, -2.5, 0);
      bridgeGroup.add(pillar);
    });

    this.group.add(bridgeGroup);
    this.collisionSystem.addCollider(railL, 'barrier');
    this.collisionSystem.addCollider(railR, 'barrier');
  }

  update(time) {
    if (this.waterMesh) {
      this.waterMesh.position.y = -1.2 + Math.sin(time * 2.0) * 0.08;
    }
  }
}
