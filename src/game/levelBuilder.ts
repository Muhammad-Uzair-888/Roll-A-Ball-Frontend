/**
 * Level Geometry Builder
 * Generates the 3D course platforms, connecting roads, branch forks,
 * guardrails, node ground markers, and natural perimeter scenery.
 */

import * as THREE from 'three';
import { LevelConfig, LevelNode } from '../config/levelConfig';
import { GameMaterials } from './proceduralAssets';

export interface LevelSceneObjects {
  rootGroup: THREE.Group;
  roadMeshes: THREE.Mesh[];
  nodeMarkers: Map<string, { group: THREE.Group; mat: THREE.MeshStandardMaterial }>;
}

/**
 * Procedural Node Ground Marker with Node Letter
 */
function createNodeMarker(
  node: LevelNode,
  materials: GameMaterials
): { group: THREE.Group; mat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  group.position.set(node.position[0], 0.04, node.position[2]);

  // Circular ground plate
  const circleGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.05, 32);
  const ringMat = materials.nodeMarkerMat.clone();
  const disc = new THREE.Mesh(circleGeo, ringMat);
  disc.receiveShadow = true;
  group.add(disc);

  // Outer accent border
  const borderGeo = new THREE.TorusGeometry(1.82, 0.06, 8, 32);
  borderGeo.rotateX(Math.PI / 2);
  const border = new THREE.Mesh(borderGeo, materials.railMat);
  border.position.y = 0.03;
  group.add(border);

  // Canvas texture for node ID label
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.id, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const labelGeo = new THREE.PlaneGeometry(1.6, 1.6);
  labelGeo.rotateX(-Math.PI / 2);
  const labelMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const labelMesh = new THREE.Mesh(labelGeo, labelMat);
  labelMesh.position.y = 0.06;
  group.add(labelMesh);

  return { group, mat: ringMat };
}

/**
 * Build road segment between two 3D points with glowing neon edge rails
 */
function createRoadSegment(
  p1: [number, number, number],
  p2: [number, number, number],
  width: number,
  materials: GameMaterials
): THREE.Group {
  const v1 = new THREE.Vector3(...p1);
  const v2 = new THREE.Vector3(...p2);

  const dir = new THREE.Vector3().subVectors(v2, v1);
  const length = dir.length();
  const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);

  const group = new THREE.Group();
  group.position.copy(mid);

  // Main track surface
  const geo = new THREE.BoxGeometry(width, 0.4, length);
  const mesh = new THREE.Mesh(geo, materials.roadMat);
  mesh.receiveShadow = true;
  mesh.position.y -= 0.15; // Flush with track surface
  group.add(mesh);

  // Glowing neon edge strips
  const railGeo = new THREE.BoxGeometry(0.18, 0.10, length);
  const leftRail = new THREE.Mesh(railGeo, materials.trackGlowMat);
  leftRail.position.set(-width / 2 + 0.09, 0.0, 0);
  group.add(leftRail);

  const rightRail = new THREE.Mesh(railGeo, materials.trackGlowMat);
  rightRail.position.set(width / 2 - 0.09, 0.0, 0);
  group.add(rightRail);

  // Orient along the edge vector
  group.lookAt(v2);

  return group;
}

export function buildLevelGeometry(
  level: LevelConfig,
  materials: GameMaterials
): LevelSceneObjects {
  const rootGroup = new THREE.Group();
  const roadMeshes: THREE.Mesh[] = [];
  const nodeMarkers = new Map<string, { group: THREE.Group; mat: THREE.MeshStandardMaterial }>();

  // 1. Build road segments for each edge in the level config (space track)
  const nodeMap = new Map<string, LevelNode>();
  for (const n of level.nodes) {
    nodeMap.set(n.id, n);
  }

  for (const edge of level.edges) {
    const n1 = nodeMap.get(edge.from);
    const n2 = nodeMap.get(edge.to);
    if (n1 && n2) {
      const road = createRoadSegment(n1.position, n2.position, 5.2, materials);
      rootGroup.add(road);
    }
  }

  // 2. Node Ground Markers
  for (const n of level.nodes) {
    const marker = createNodeMarker(n, materials);
    rootGroup.add(marker.group);
    nodeMarkers.set(n.id, marker);
  }

  return { rootGroup, roadMeshes, nodeMarkers };
}
