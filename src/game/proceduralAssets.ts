/**
 * Procedural 3D Assets and Mesh Generators for Roll a Ball
 * Follows the 3-12 part composite model requirement, zero external textures,
 * and high physical PBR fidelity.
 */

import * as THREE from 'three';
import { LevelNode, LevelCoin, LevelHazard } from '../config/levelConfig';

// Reusable procedural materials
export interface GameMaterials {
  groundMat: THREE.MeshStandardMaterial;
  roadMat: THREE.MeshStandardMaterial;
  trackGlowMat: THREE.MeshStandardMaterial;
  railMat: THREE.MeshStandardMaterial;
  ballMat: THREE.MeshStandardMaterial;
  ballTrimMat: THREE.MeshStandardMaterial;
  coinMats: Map<string, THREE.MeshStandardMaterial>;
  checkpointInactiveMat: THREE.MeshStandardMaterial;
  checkpointActiveMat: THREE.MeshStandardMaterial;
  checkpointPedestalMat: THREE.MeshStandardMaterial;
  hazardLavaMat: THREE.MeshStandardMaterial;
  hazardLaserMat: THREE.MeshStandardMaterial;
  finishArchMat: THREE.MeshStandardMaterial;
  finishPortalMat: THREE.MeshStandardMaterial;
  nodeMarkerMat: THREE.MeshStandardMaterial;
  nodeMarkerActiveMat: THREE.MeshStandardMaterial;
}

/**
 * Procedural subtle cobblestone / grid bump texture
 */
function createGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#22272e';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle grid lines
  ctx.strokeStyle = '#2d333b';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Soft noise dots
  ctx.fillStyle = '#373e47';
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createGameMaterials(): GameMaterials {
  const gridTex = createGridTexture();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.9,
    metalness: 0.1,
  });

  const roadMat = new THREE.MeshStandardMaterial({
    map: gridTex,
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.7,
    emissive: 0x071527,
    emissiveIntensity: 0.25,
  });

  const trackGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0x0284c7,
    emissiveIntensity: 1.1,
  });

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.35,
    metalness: 0.7,
  });

  // Hero Ball: vibrant metallic azure with soft emissive sheen
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0x0369a1,
    emissiveIntensity: 0.3,
  });

  const ballTrimMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.15,
    metalness: 0.9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
  });

  const checkpointInactiveMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.4,
    metalness: 0.5,
    emissive: 0x475569,
    emissiveIntensity: 0.2,
  });

  const checkpointActiveMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.15,
    metalness: 0.7,
    emissive: 0x059669,
    emissiveIntensity: 0.8,
  });

  const checkpointPedestalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.3,
  });

  const hazardLavaMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0xdc2626,
    emissiveIntensity: 0.9,
  });

  const hazardLaserMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0xe11d48,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.85,
  });

  const finishArchMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.25,
    metalness: 0.8,
  });

  const finishPortalMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    roughness: 0.1,
    metalness: 0.4,
    emissive: 0x7c3aed,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.8,
  });

  const nodeMarkerMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.4,
    emissive: 0x0f172a,
    emissiveIntensity: 0.3,
  });

  const nodeMarkerActiveMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.6,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
  });

  return {
    groundMat,
    roadMat,
    trackGlowMat,
    railMat,
    ballMat,
    ballTrimMat,
    coinMats: new Map(),
    checkpointInactiveMat,
    checkpointActiveMat,
    checkpointPedestalMat,
    hazardLavaMat,
    hazardLaserMat,
    finishArchMat,
    finishPortalMat,
    nodeMarkerMat,
    nodeMarkerActiveMat,
  };
}

/**
 * Simple Hero Ball with a Soft Point Light:
 * Sphere body with minimal accent ring and attached soft light.
 */
export function createCompositeBall(materials: GameMaterials): THREE.Group {
  const group = new THREE.Group();

  // 1. Primary sphere body
  const sphereGeo = new THREE.SphereGeometry(0.65, 32, 24);
  const sphere = new THREE.Mesh(sphereGeo, materials.ballMat);
  sphere.castShadow = true;
  group.add(sphere);

  // 2. Minimal accent equator ring
  const ringGeo = new THREE.TorusGeometry(0.66, 0.035, 12, 32);
  const ring = new THREE.Mesh(ringGeo, materials.ballTrimMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // 3. Soft point light illuminating the ball and adjacent track
  const ballLight = new THREE.PointLight(0x38bdf8, 1.8, 8);
  ballLight.position.set(0, 0.2, 0);
  group.add(ballLight);

  return group;
}

/**
 * Soft contact shadow and contact glow group under the ball
 * Grounds the ball and clearly highlights its position relative to the track surface.
 */
export function createContactShadowDisc(radius: number = 0.75): THREE.Group {
  const group = new THREE.Group();
  group.position.y = 0.02;

  // 1. Inner soft contact shadow (grounds the ball)
  const shadowGeo = new THREE.CircleGeometry(radius, 24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  group.add(shadowMesh);

  // 2. Soft contact glow ring (provides clean spatial orientation under the ball)
  const glowGeo = new THREE.RingGeometry(radius * 0.45, radius * 1.35, 24);
  glowGeo.rotateX(-Math.PI / 2);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.position.y = 0.005;
  group.add(glowMesh);

  return group;
}

/**
 * Composite 5-part Checkpoint Pedestal:
 * Base tier, octagonal riser, energy ring, hovering floating diamond crystal, and light beam.
 */
export function createCheckpointPedestal(
  node: LevelNode,
  materials: GameMaterials
): { group: THREE.Group; crystal: THREE.Mesh; light: THREE.PointLight } {
  const group = new THREE.Group();
  group.position.set(...node.position);

  // 1. Base platform
  const baseGeo = new THREE.CylinderGeometry(2.0, 2.2, 0.25, 8);
  const base = new THREE.Mesh(baseGeo, materials.checkpointPedestalMat);
  base.position.y = 0.125;
  base.receiveShadow = true;
  group.add(base);

  // 2. Inner pedestal pillar
  const pillarGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.6, 8);
  const pillar = new THREE.Mesh(pillarGeo, materials.checkpointPedestalMat);
  pillar.position.y = 0.55;
  pillar.receiveShadow = true;
  group.add(pillar);

  // 3. Glowing ring on top
  const ringGeo = new THREE.TorusGeometry(0.8, 0.08, 12, 24);
  const ring = new THREE.Mesh(ringGeo, materials.checkpointInactiveMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.88;
  group.add(ring);

  // 4. Floating crystal (Octahedron)
  const crystalGeo = new THREE.OctahedronGeometry(0.65, 0);
  const crystal = new THREE.Mesh(crystalGeo, materials.checkpointInactiveMat);
  crystal.position.y = 2.0;
  crystal.castShadow = true;
  group.add(crystal);

  // 5. Point light for active illumination
  const light = new THREE.PointLight(0x10b981, 0, 8);
  light.position.y = 2.2;
  group.add(light);

  return { group, crystal, light };
}

/**
 * Composite 3-part Collectible Coin:
 * Beveled cylinder coin body, center relief star, and contact shadow.
 */
export function createCompositeCoin(
  coin: LevelCoin,
  materials: GameMaterials
): { group: THREE.Group; coinMesh: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(...coin.position);

  const coinGroup = new THREE.Group();

  let coinMat = materials.coinMats.get(coin.color || '#fbbf24');
  if (!coinMat) {
    coinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(coin.color || '#fbbf24'),
      roughness: 0.2,
      metalness: 0.85,
      emissive: new THREE.Color(coin.color || '#fbbf24'),
      emissiveIntensity: 0.35,
    });
    materials.coinMats.set(coin.color || '#fbbf24', coinMat);
  }

  // 1. Coin disc
  const discGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 24);
  const disc = new THREE.Mesh(discGeo, coinMat);
  disc.rotation.x = Math.PI / 2;
  coinGroup.add(disc);

  // 2. Outer rim
  const rimGeo = new THREE.TorusGeometry(0.5, 0.05, 12, 24);
  const rim = new THREE.Mesh(rimGeo, coinMat);
  coinGroup.add(rim);

  // 3. Center gem facet
  const facetGeo = new THREE.OctahedronGeometry(0.2, 0);
  const facet = new THREE.Mesh(facetGeo, coinMat);
  coinGroup.add(facet);

  coinGroup.position.y = 0.2;
  group.add(coinGroup);

  // Soft contact shadow
  const shadow = createContactShadowDisc(0.55);
  shadow.position.y = -coin.position[1] + 0.05;
  group.add(shadow);

  return { group, coinMesh: coinGroup };
}

/**
 * Composite Finish Portal:
 * Two massive marble pillars, upper lintel, side braziers, and glowing portal gateway.
 */
export function createFinishPortal(
  node: LevelNode,
  materials: GameMaterials
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...node.position);

  // Base platform
  const baseGeo = new THREE.BoxGeometry(7, 0.4, 4);
  const base = new THREE.Mesh(baseGeo, materials.checkpointPedestalMat);
  base.position.y = 0.2;
  base.receiveShadow = true;
  group.add(base);

  // Left Pillar
  const pillarGeo = new THREE.CylinderGeometry(0.5, 0.6, 5.0, 16);
  const leftPillar = new THREE.Mesh(pillarGeo, materials.finishArchMat);
  leftPillar.position.set(-2.5, 2.7, 0);
  leftPillar.castShadow = true;
  group.add(leftPillar);

  // Right Pillar
  const rightPillar = new THREE.Mesh(pillarGeo, materials.finishArchMat);
  rightPillar.position.set(2.5, 2.7, 0);
  rightPillar.castShadow = true;
  group.add(rightPillar);

  // Lintel Beam
  const lintelGeo = new THREE.BoxGeometry(6.4, 0.7, 1.2);
  const lintel = new THREE.Mesh(lintelGeo, materials.finishArchMat);
  lintel.position.set(0, 5.4, 0);
  lintel.castShadow = true;
  group.add(lintel);

  // Portal Vortex plane
  const portalGeo = new THREE.PlaneGeometry(4.2, 4.8);
  const portal = new THREE.Mesh(portalGeo, materials.finishPortalMat);
  portal.position.set(0, 2.8, 0);
  group.add(portal);

  return group;
}

/**
 * Hazard 3D Mesh (Lava pit or laser emitter)
 */
export function createHazardMesh(
  hazard: LevelHazard,
  materials: GameMaterials
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...hazard.position);

  const [w, h, d] = hazard.size;

  if (hazard.type === 'lava_pit') {
    // Red glowing magma slab
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, materials.hazardLavaMat);
    group.add(mesh);

    // Hazard warning border frame
    const borderGeo = new THREE.BoxGeometry(w + 0.4, 0.2, d + 0.4);
    const border = new THREE.Mesh(borderGeo, materials.checkpointPedestalMat);
    border.position.y = -0.1;
    group.add(border);
  } else {
    // Laser Barrier with two emitter posts
    const postGeo = new THREE.CylinderGeometry(0.2, 0.25, 2.0, 12);
    const p1 = new THREE.Mesh(postGeo, materials.checkpointPedestalMat);
    p1.position.set(-w / 2, 1.0, 0);
    group.add(p1);

    const p2 = new THREE.Mesh(postGeo, materials.checkpointPedestalMat);
    p2.position.set(w / 2, 1.0, 0);
    group.add(p2);

    // Laser beam volume
    const beamGeo = new THREE.BoxGeometry(w, 0.35, 0.1);
    const beam = new THREE.Mesh(beamGeo, materials.hazardLaserMat);
    beam.position.y = 1.0;
    group.add(beam);
  }

  return group;
}
