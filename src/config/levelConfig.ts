/**
 * Level Configuration for Roll a Ball
 * 
 * Central configuration for level geometry, graph nodes,
 * hazard-adjusted edge weights, coin placements, checkpoints,
 * track boundary segments, and configurable respawn positions.
 */

export interface TrackSegment {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface LevelNode {
  id: string;
  name: string;
  position: [number, number, number]; // [x, y, z] in 3D scene
  isStart?: boolean;
  isCheckpoint?: boolean;
  checkpointIndex?: 1 | 2 | 3;
  isFinish?: boolean;
}

export interface LevelEdge {
  from: string;
  to: string;
  weight: number; // Hazard-adjusted weight (energy/time cost)
  baseWeight: number;
  hazardBonus?: number;
  hazardDescription?: string;
}

export interface LevelCoin {
  id: string;
  name: string;
  position: [number, number, number];
  cost: number;  // Energy cost to collect or detour (0-30 budget)
  value: number; // Score points awarded
  color?: string;
}

export interface LevelHazard {
  id: string;
  name: string;
  type: 'lava_pit' | 'laser_barrier' | 'spike_trap';
  position: [number, number, number];
  size: [number, number, number]; // width, height, depth
  energyPenalty: number;
  causesRespawn: boolean;
}

export type RespawnMode = 'last_checkpoint' | 'start' | 'cp1' | 'cp2' | 'cp3';

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  spawnPosition: [number, number, number];
  defaultRespawnPosition: [number, number, number];
  initialEnergy: number;
  energyBudget: number; // For knapsack optimization (0-30)
  nodes: LevelNode[];
  edges: LevelEdge[];
  blockedEdges: Array<{ from: string; to: string }>;
  coins: LevelCoin[];
  hazards: LevelHazard[];
  trackSegments: TrackSegment[];
  killHeight: number;
  fallEnergyPenalty: number;
  finishRadius: number;
}

/**
 * Level 1: Alpine Circuit (9 nodes, 3 checkpoints, 10 coins)
 * Fully mapped to a coherent 3D course with 3 sequential checkpoints and route branches.
 */
export const DEFAULT_LEVEL: LevelConfig = {
  id: 'alpine_circuit',
  name: 'Alpine Circuit & Data Ridge',
  description: '9-node network with branching canyon/ridge routes, 3 checkpoints, 10 collectible coins, and hazard traps.',
  spawnPosition: [0, 1.2, -36],
  defaultRespawnPosition: [0, 1.2, -36],
  initialEnergy: 25,
  energyBudget: 15, // Algorithm Lab default budget

  // 9 nodes spanning from Z = -36 to Z = +38
  nodes: [
    { id: 'S', name: 'Start Bay (S)', position: [0, 0.5, -36], isStart: true },
    { id: 'A', name: 'West Ridge (CP 1)', position: [-14, 0.5, -20], isCheckpoint: true, checkpointIndex: 1 },
    { id: 'B', name: 'East Canyon', position: [14, 0.5, -20] },
    { id: 'C', name: 'Terrace Junction', position: [-6, 0.5, -4] },
    { id: 'D', name: 'Lava Overpass (CP 2)', position: [8, 0.5, -4], isCheckpoint: true, checkpointIndex: 2 },
    { id: 'E', name: 'Steep Ascent', position: [-12, 1.0, 14] },
    { id: 'G', name: 'Skyway (CP 3)', position: [12, 1.0, 14], isCheckpoint: true, checkpointIndex: 3 },
    { id: 'H', name: 'Citadel Gate', position: [0, 0.5, 26] },
    { id: 'F', name: 'Finish Portal (F)', position: [0, 0.5, 38], isFinish: true },
  ],

  // Hazard-adjusted undirected edges
  edges: [
    { from: 'S', to: 'A', baseWeight: 3, hazardBonus: 1, weight: 4, hazardDescription: 'Icy gusts' },
    { from: 'S', to: 'B', baseWeight: 5, hazardBonus: 0, weight: 5 },
    { from: 'A', to: 'C', baseWeight: 3, hazardBonus: 0, weight: 3 },
    { from: 'B', to: 'C', baseWeight: 4, hazardBonus: 2, weight: 6, hazardDescription: 'Crusher corridor' },
    { from: 'B', to: 'D', baseWeight: 3, hazardBonus: 1, weight: 4, hazardDescription: 'Steam vents' },
    { from: 'C', to: 'D', baseWeight: 2, hazardBonus: 0, weight: 2 },
    { from: 'C', to: 'E', baseWeight: 4, hazardBonus: 1, weight: 5, hazardDescription: 'Loose gravel' },
    { from: 'D', to: 'G', baseWeight: 4, hazardBonus: 2, weight: 6, hazardDescription: 'Lava spray' },
    { from: 'E', to: 'H', baseWeight: 3, hazardBonus: 0, weight: 3 },
    { from: 'G', to: 'H', baseWeight: 2, hazardBonus: 1, weight: 3, hazardDescription: 'High wind' },
    { from: 'H', to: 'F', baseWeight: 2, hazardBonus: 0, weight: 2 },
  ],

  // Blocked edges per level condition
  blockedEdges: [],

  // 9 collectible coins (only Red Coins worth 3 points and Yellow Coins worth 2 points)
  coins: [
    { id: 'r1', name: 'Red Coin', position: [-14, 0.9, -20], cost: 3, value: 3, color: '#ef4444' },
    { id: 'r2', name: 'Red Coin', position: [14, 0.9, -20], cost: 3, value: 3, color: '#ef4444' },
    { id: 'r3', name: 'Red Coin', position: [0, 0.9, -4], cost: 3, value: 3, color: '#ef4444' },
    { id: 'r4', name: 'Red Coin', position: [0, 0.9, 20], cost: 3, value: 3, color: '#ef4444' },
    { id: 'y1', name: 'Yellow Coin', position: [-8, 0.9, -28], cost: 2, value: 2, color: '#facc15' },
    { id: 'y2', name: 'Yellow Coin', position: [8, 0.9, -28], cost: 2, value: 2, color: '#facc15' },
    { id: 'y3', name: 'Yellow Coin', position: [-10, 0.9, 8], cost: 2, value: 2, color: '#facc15' },
    { id: 'y4', name: 'Yellow Coin', position: [10, 0.9, 8], cost: 2, value: 2, color: '#facc15' },
    { id: 'y5', name: 'Yellow Coin', position: [0, 0.9, 32], cost: 2, value: 2, color: '#facc15' },
  ],

  // Physical hazards in the 3D level
  hazards: [
    {
      id: 'haz_1',
      name: 'Lava Trench Alpha',
      type: 'lava_pit',
      position: [0, -0.2, -18],
      size: [6, 0.4, 4],
      energyPenalty: 5,
      causesRespawn: true,
    },
    {
      id: 'haz_2',
      name: 'Laser Barrier',
      type: 'laser_barrier',
      position: [0, 0.6, 2],
      size: [8, 0.8, 1.5],
      energyPenalty: 4,
      causesRespawn: false,
    },
    {
      id: 'haz_3',
      name: 'Magma Pit Beta',
      type: 'lava_pit',
      position: [2, -0.2, 20],
      size: [6, 0.4, 5],
      energyPenalty: 6,
      causesRespawn: true,
    },
  ],

  // Bounding box segments covering the track corridors & platforms tightly matched to visible roads
  trackSegments: [
    // S platform
    { minX: -4.5, maxX: 4.5, minZ: -39.5, maxZ: -32.5 },
    // Road S (0, -36) -> A (-14, -20) segmented tightly to avoid central chasm
    { minX: -6.5, maxX: 3, minZ: -38, maxZ: -30 },
    { minX: -10, maxX: -0.5, minZ: -34, maxZ: -26 },
    { minX: -13.5, maxX: -4, minZ: -30, maxZ: -22 },
    { minX: -17, maxX: -7.5, minZ: -26, maxZ: -18 },
    // Road S (0, -36) -> B (14, -20) segmented tightly to avoid central chasm
    { minX: -3, maxX: 6.5, minZ: -38, maxZ: -30 },
    { minX: 0.5, maxX: 10, minZ: -34, maxZ: -26 },
    { minX: 4, maxX: 13.5, minZ: -30, maxZ: -22 },
    { minX: 7.5, maxX: 17, minZ: -26, maxZ: -18 },
    // Platform A [-14, 0.5, -20]
    { minX: -17, maxX: -11, minZ: -23, maxZ: -17 },
    // Platform B [14, 0.5, -20]
    { minX: 11, maxX: 17, minZ: -23, maxZ: -17 },
    // Road A (-14, -20) -> C (-6, -4)
    { minX: -17, maxX: -8.5, minZ: -22, maxZ: -13 },
    { minX: -14.5, maxX: -5.5, minZ: -17, maxZ: -7 },
    { minX: -11.5, maxX: -3, minZ: -11, maxZ: -2 },
    // Road B (14, -20) -> C (-6, -4)
    { minX: 6, maxX: 17, minZ: -22, maxZ: -14 },
    { minX: 1, maxX: 12, minZ: -18, maxZ: -10 },
    { minX: -4, maxX: 7, minZ: -14, maxZ: -6 },
    { minX: -9, maxX: 2, minZ: -10, maxZ: -2 },
    // Road B (14, -20) -> D (8, -4)
    { minX: 9, maxX: 17, minZ: -22, maxZ: -13 },
    { minX: 7, maxX: 15, minZ: -17, maxZ: -7 },
    { minX: 5, maxX: 13, minZ: -11, maxZ: -2 },
    // Junction C & D platform and connector C -> D
    { minX: -9, maxX: 11, minZ: -7, maxZ: -1 },
    // Road C (-6, -4) -> E (-12, 14)
    { minX: -11, maxX: -3, minZ: -6, maxZ: 4 },
    { minX: -13, maxX: -5, minZ: 0, maxZ: 10 },
    { minX: -15, maxX: -7, minZ: 6, maxZ: 16 },
    // Road D (8, -4) -> G (12, 14)
    { minX: 5, maxX: 12.5, minZ: -6, maxZ: 4 },
    { minX: 6.5, maxX: 13.5, minZ: 0, maxZ: 10 },
    { minX: 8, maxX: 15, minZ: 6, maxZ: 16 },
    // Platform E [-12, 1.0, 14]
    { minX: -15, maxX: -9, minZ: 11, maxZ: 17 },
    // Platform G [12, 1.0, 14]
    { minX: 9, maxX: 15, minZ: 11, maxZ: 17 },
    // Road E (-12, 14) -> H (0, 26)
    { minX: -15, maxX: -5, minZ: 12, maxZ: 20 },
    { minX: -11, maxX: -1, minZ: 16, maxZ: 24 },
    { minX: -7, maxX: 3, minZ: 18.5, maxZ: 28 },
    // Road G (12, 14) -> H (0, 26)
    { minX: 5, maxX: 15, minZ: 12, maxZ: 20 },
    { minX: 1, maxX: 11, minZ: 16, maxZ: 24 },
    { minX: -3, maxX: 7, minZ: 18.5, maxZ: 28 },
    // Platform H [0, 0.5, 26]
    { minX: -4, maxX: 4, minZ: 23, maxZ: 29 },
    // Road H -> F and Finish Portal F
    { minX: -3.5, maxX: 3.5, minZ: 25, maxZ: 41 },
  ],

  killHeight: -0.2,
  fallEnergyPenalty: 5,
  finishRadius: 3.5,
};

/**
 * Level 2: Exact Sample Graph & Coins from docs/API.md
 * Course from the Software Design Document.
 */
export const SAMPLE_API_LEVEL: LevelConfig = {
  id: 'api_sample_level',
  name: 'docs/API.md Sample Course (S-A-B-C-F)',
  description: 'The exact 5-node sample graph, blocked edge S->B, and sample coins from the API specification document.',
  spawnPosition: [0, 1.2, -30],
  defaultRespawnPosition: [0, 1.2, -30],
  initialEnergy: 20,
  energyBudget: 10,

  nodes: [
    { id: 'S', name: 'Start Bay (S)', position: [0, 0.5, -30], isStart: true },
    { id: 'A', name: 'Waypoint A (CP 1)', position: [-12, 0.5, -12], isCheckpoint: true, checkpointIndex: 1 },
    { id: 'B', name: 'Waypoint B (CP 2)', position: [12, 0.5, -12], isCheckpoint: true, checkpointIndex: 2 },
    { id: 'C', name: 'Junction C (CP 3)', position: [0, 0.5, 6], isCheckpoint: true, checkpointIndex: 3 },
    { id: 'F', name: 'Finish Portal (F)', position: [0, 0.5, 26], isFinish: true },
  ],

  edges: [
    { from: 'S', to: 'A', baseWeight: 2, weight: 2 },
    { from: 'S', to: 'B', baseWeight: 5, weight: 5 },
    { from: 'A', to: 'C', baseWeight: 3, weight: 3 },
    { from: 'B', to: 'C', baseWeight: 1, weight: 1 },
    { from: 'C', to: 'F', baseWeight: 2, weight: 2 },
  ],

  blockedEdges: [
    { from: 'S', to: 'B' },
  ],

  coins: [
    { id: 'y_sample', name: 'Yellow Coin', position: [-6, 0.9, -14], cost: 2, value: 2, color: '#facc15' },
    { id: 'r_sample', name: 'Red Coin', position: [0, 0.9, 0], cost: 3, value: 3, color: '#ef4444' },
  ],

  hazards: [
    {
      id: 'haz_sample',
      name: 'Central Magma Trench',
      type: 'lava_pit',
      position: [0, -0.2, -6],
      size: [6, 0.4, 4],
      energyPenalty: 5,
      causesRespawn: true,
    },
  ],

  trackSegments: [
    // S platform
    { minX: -4.5, maxX: 4.5, minZ: -33, maxZ: -27 },
    // Road S -> A
    { minX: -6.5, maxX: 3, minZ: -32, maxZ: -24 },
    { minX: -10, maxX: -0.5, minZ: -26, maxZ: -18 },
    { minX: -15, maxX: -6, minZ: -20, maxZ: -10 },
    // Road S -> B
    { minX: -3, maxX: 6.5, minZ: -32, maxZ: -24 },
    { minX: 0.5, maxX: 10, minZ: -26, maxZ: -18 },
    { minX: 6, maxX: 15, minZ: -20, maxZ: -10 },
    // Road A -> C
    { minX: -15, maxX: -6, minZ: -14, maxZ: -4 },
    { minX: -10, maxX: -0.5, minZ: -8, maxZ: 2 },
    { minX: -6.5, maxX: 3, minZ: -2, maxZ: 8 },
    // Road B -> C
    { minX: 6, maxX: 15, minZ: -14, maxZ: -4 },
    { minX: 0.5, maxX: 10, minZ: -8, maxZ: 2 },
    { minX: -3, maxX: 6.5, minZ: -2, maxZ: 8 },
    // Road C -> F and Finish Portal F
    { minX: -3.5, maxX: 3.5, minZ: 4, maxZ: 28 },
  ],

  killHeight: -0.2,
  fallEnergyPenalty: 5,
  finishRadius: 3.5,
};

export const LEVEL_PRESETS: LevelConfig[] = [DEFAULT_LEVEL, SAMPLE_API_LEVEL];

/**
 * Visual background grid settings for space-style scene
 * Grid plane placed well under killHeight (-0.2) so it never sits at track level
 */
export const gridY = -12;
export const gridOpacity = 0.22;
