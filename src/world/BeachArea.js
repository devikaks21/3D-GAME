import * as THREE from 'three';

/**
 * Coastal beach environment with ocean water, sandy shoreline, palm trees and pier
 */
export class BeachArea {
  constructor(scene, assetManager, collisionSystem) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.collisionSystem = collisionSystem;
    this.group = new THREE.Group();

    this.waterMesh = null;
    this.buildBeach();
    this.scene.add(this.group);
  }

  buildBeach() {
    // Center: (X: 0, Z: 480)
    const baseZ = 480;
    const roadTexture = this.assetManager.getRoadTexture();

    // 1. Coastal Boulevard highway
    const roadGeom = new THREE.PlaneGeometry(600, 22);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.8
    });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, baseZ - 40);
    road.receiveShadow = true;
    this.group.add(road);

    // 2. Sandy Beach Shoreline
    const sandGeom = new THREE.PlaneGeometry(700, 160);
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xdec18c,
      roughness: 0.95
    });
    const sand = new THREE.Mesh(sandGeom, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, -0.01, baseZ + 50);
    sand.receiveShadow = true;
    this.group.add(sand);

    // 3. Ocean Water
    const waterGeom = new THREE.PlaneGeometry(1000, 400, 32, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x006699,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88
    });
    this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(0, -0.5, baseZ + 250);
    this.group.add(this.waterMesh);

    // 4. Palm Trees along the coastal promenade
    for (let x = -280; x <= 280; x += 35) {
      this.addPalmTree(x, baseZ - 24);
      this.addPalmTree(x + 12, baseZ + 15);
    }

    // 5. Wooden Pier stretching out into the sea
    const pierGeom = new THREE.BoxGeometry(12, 1.2, 140);
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x6e5238, roughness: 0.85 });
    const pier = new THREE.Mesh(pierGeom, pierMat);
    pier.position.set(40, 0.4, baseZ + 120);
    this.group.add(pier);

    // Pier pylons
    for (let pz = baseZ + 60; pz <= baseZ + 180; pz += 25) {
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 8), pierMat);
      pylon.position.set(40, -1.2, pz);
      this.group.add(pylon);
    }

    // 6. Coastal Lighthouse
    const lightTowerGeom = new THREE.CylinderGeometry(3.5, 5.5, 28, 16);
    const lightTowerMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 });
    const lighthouse = new THREE.Mesh(lightTowerGeom, lightTowerMat);
    lighthouse.position.set(160, 14, baseZ + 40);

    const lightLantern = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 4, 16), new THREE.MeshBasicMaterial({ color: 0xffea70 }));
    lightLantern.position.set(160, 29, baseZ + 40);

    this.group.add(lighthouse, lightLantern);
    this.collisionSystem.addCollider(lighthouse, 'building');
  }

  addPalmTree(x, z) {
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0, z),
      new THREE.Vector3(x + 0.6, 3.5, z),
      new THREE.Vector3(x + 1.4, 7, z)
    ]);
    const trunkGeom = new THREE.TubeGeometry(trunkCurve, 8, 0.28, 8, false);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4128, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    this.group.add(trunk);

    // Palm fronds
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const frondGeom = new THREE.ConeGeometry(0.9, 3.5, 4);
      const frond = new THREE.Mesh(frondGeom, frondMat);
      frond.position.set(x + 1.4, 7.2, z);
      frond.rotation.z = Math.PI / 2.5;
      frond.rotation.y = (i / 6) * Math.PI * 2;
      this.group.add(frond);
    }
  }

  update(time) {
    // Subtle ocean undulation
    if (this.waterMesh) {
      this.waterMesh.position.y = -0.5 + Math.sin(time * 1.5) * 0.12;
    }
  }
}
