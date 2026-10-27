/**
 * Pure Game Rules and Logic for Roll a Ball
 * Decoupled from Three.js and React rendering for fast unit testing.
 */

import { LevelConfig, LevelCoin, LevelHazard, LevelEdge, TrackSegment, RespawnMode, DEFAULT_LEVEL } from '../config/levelConfig';

export interface CheckpointState {
  activatedCheckpoints?: [boolean, boolean, boolean];
  lastRespawnPoint?: [number, number, number];
  level?: LevelConfig;
}

export interface PlayerStats {
  score: number;
  energy: number;
  energyUsed: number;
  collectedCoinIds: string[];
  activatedCheckpoints: [boolean, boolean, boolean]; // CP1, CP2, CP3
  lastRespawnPoint: [number, number, number];
  respawnMode: RespawnMode;
  visitedNodeIds: string[];
  gameStatus: 'ready' | 'playing' | 'paused' | 'completed' | 'failed';
  totalTimeSeconds: number;
  hudMessage?: string | null;
  hudMessageExpiresAt?: number;
}

export function createInitialPlayerStats(
  level: LevelConfig,
  respawnMode: RespawnMode = 'last_checkpoint'
): PlayerStats {
  return {
    score: 0,
    energy: level.initialEnergy,
    energyUsed: 0,
    collectedCoinIds: [],
    activatedCheckpoints: [false, false, false],
    lastRespawnPoint: [...level.spawnPosition],
    respawnMode,
    visitedNodeIds: ['S'],
    gameStatus: 'ready',
    totalTimeSeconds: 0,
    hudMessage: null,
  };
}

/**
 * Check whether the ball is over any track segment.
 * Uses x and z with ball radius as margin.
 */
export function isBallOverTrack(
  ballPos: [number, number, number],
  trackSegments: TrackSegment[],
  ballRadius: number = 0
): boolean {
  const [bx, , bz] = ballPos;
  return trackSegments.some(
    (seg) =>
      bx >= seg.minX - ballRadius &&
      bx <= seg.maxX + ballRadius &&
      bz >= seg.minZ - ballRadius &&
      bz <= seg.maxZ + ballRadius
  );
}

/**
 * Check whether the ball is falling off the track.
 * The ball has fallen when its center is outside every track segment by more than the ball radius.
 */
export function isBallFalling(
  ballPos: [number, number, number],
  trackSegments: TrackSegment[],
  ballRadius: number = 0
): boolean {
  return !isBallOverTrack(ballPos, trackSegments, ballRadius);
}

/**
 * Check whether the ball is on the track.
 * The ball is on track when it is over a track segment AND above killHeight.
 */
export function isBallOnTrack(
  ballPos: [number, number, number],
  trackSegments: TrackSegment[],
  killHeight: number,
  ballRadius: number = 0
): boolean {
  const [bx, by, bz] = ballPos;
  if (by < killHeight) {
    return false;
  }
  return isBallOverTrack(ballPos, trackSegments, ballRadius);
}

/**
 * The ball has fallen when EITHER:
 * - its center is outside every trackSegment (use x and z, with the ball radius as a margin), OR
 * - its y is below killHeight.
 */
export function hasBallFallen(
  ballPos: [number, number, number],
  trackSegments: TrackSegment[],
  killHeight: number,
  ballRadius: number = 0
): boolean {
  const [bx, by, bz] = ballPos;
  if (by < killHeight) {
    return true;
  }
  return isBallFalling(ballPos, trackSegments, ballRadius);
}

/**
 * Compute the effective respawn position on hazard collision or fall off
 * Supports both (mode, level, lastRespawnPoint) and (mode, checkpointState).
 */
export function computeRespawnPoint(
  mode: RespawnMode,
  checkpointStateOrLevel: LevelConfig | CheckpointState | [number, number, number],
  lastCheckpointRespawn?: [number, number, number]
): [number, number, number] {
  // Case 1: checkpointStateOrLevel is LevelConfig
  if (
    checkpointStateOrLevel &&
    'spawnPosition' in checkpointStateOrLevel &&
    'nodes' in checkpointStateOrLevel
  ) {
    const level = checkpointStateOrLevel as LevelConfig;
    if (mode === 'start') {
      return [...level.spawnPosition];
    }
    if (mode === 'cp1') {
      const cp = level.nodes.find((n) => n.checkpointIndex === 1);
      if (cp) return [cp.position[0], cp.position[1] + 0.8, cp.position[2]];
    }
    if (mode === 'cp2') {
      const cp = level.nodes.find((n) => n.checkpointIndex === 2);
      if (cp) return [cp.position[0], cp.position[1] + 0.8, cp.position[2]];
    }
    if (mode === 'cp3') {
      const cp = level.nodes.find((n) => n.checkpointIndex === 3);
      if (cp) return [cp.position[0], cp.position[1] + 0.8, cp.position[2]];
    }
    if (lastCheckpointRespawn) {
      return [...lastCheckpointRespawn];
    }
    return [...level.spawnPosition];
  }

  // Case 2: Array [x, y, z]
  if (Array.isArray(checkpointStateOrLevel)) {
    return [...checkpointStateOrLevel];
  }

  // Case 3: CheckpointState object
  const state = checkpointStateOrLevel as CheckpointState;
  const level = state?.level || DEFAULT_LEVEL;

  if (mode === 'start') {
    return [...level.spawnPosition];
  }
  if (mode === 'cp1') {
    const cp = level.nodes.find((n) => n.checkpointIndex === 1);
    if (cp) return [cp.position[0], cp.position[1] + 0.8, cp.position[2]];
  }
  if (mode === 'cp2') {
    const cp = level.nodes.find((n) => n.checkpointIndex === 2);
    if (cp) return [cp.position[0], cp.position[1] + 0.8, cp.position[2]];
  }
  if (mode === 'cp3') {
    const cp = level.nodes.find((n) => n.checkpointIndex === 3);
    if (cp) return [cp.position[0], cp.position[1] + 0.8, cp.position[2]];
  }

  if (state?.lastRespawnPoint) {
    return [...state.lastRespawnPoint];
  }

  if (lastCheckpointRespawn) {
    return [...lastCheckpointRespawn];
  }

  return [...level.spawnPosition];
}

export interface MovementKeys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Compute camera-relative movement direction on the XZ plane:
 * - Flat forward direction (y = 0, normalized)
 * - Right direction as cross(forward, up) where up = [0, 1, 0]
 * - D or Right Arrow moves the ball toward screen-right (+right)
 * - A or Left Arrow moves the ball toward screen-left (-right)
 * - W or Up Arrow moves the ball away from the camera (+forward)
 * - S or Down Arrow moves the ball toward the camera (-forward)
 */
export function computeCameraRelativeDirection(
  keys: MovementKeys,
  cameraForward: [number, number, number]
): [number, number, number] {
  const [fxRaw, , fzRaw] = cameraForward;
  const fLen = Math.hypot(fxRaw, fzRaw);

  let fx = 0;
  let fz = -1;
  if (fLen > 1e-6) {
    fx = fxRaw / fLen;
    fz = fzRaw / fLen;
  }

  // Right direction: cross(forward, up) with up = [0, 1, 0]
  // [fx, 0, fz] x [0, 1, 0] = [-fz, 0, fx]
  const rx = -fz;
  const rz = fx;

  let moveX = 0;
  let moveZ = 0;

  if (keys.up) {
    moveX += fx;
    moveZ += fz;
  }
  if (keys.down) {
    moveX -= fx;
    moveZ -= fz;
  }
  if (keys.right) {
    moveX += rx;
    moveZ += rz;
  }
  if (keys.left) {
    moveX -= rx;
    moveZ -= rz;
  }

  const len = Math.hypot(moveX, moveZ);
  if (len > 1e-6) {
    return [moveX / len, 0, moveZ / len];
  }
  return [0, 0, 0];
}

export const REST_Y = 1.2;
export const GRAVITY = 20.0;

/**
 * Pure Game Rules and Logic for Roll a Ball
 * Decoupled from Three.js and React rendering for fast unit testing.
 */

/**
 * Apply camera-relative movement physics to ball velocity:
 * - Applies acceleration along computed camera-relative direction
 * - Applies ground friction / damping
 * - Adds gravity of 20 units per second squared to vy each frame
 * - Caps speed at maxSpeed
 */
export function applyMovementPhysics(
  currentVelocity: [number, number, number],
  keys: MovementKeys,
  cameraForward: [number, number, number],
  dt: number,
  isBraking: boolean = false,
  accel: number = 28.0,
  maxSpeed: number = 16.0
): [number, number, number] {
  const [dirX, , dirZ] = computeCameraRelativeDirection(keys, cameraForward);
  let vx = currentVelocity[0] + dirX * accel * dt;
  const vy = currentVelocity[1] - GRAVITY * dt;
  let vz = currentVelocity[2] + dirZ * accel * dt;

  const friction = isBraking ? 8.0 : 2.5;
  const decay = Math.max(0, 1 - friction * dt);
  vx *= decay;
  vz *= decay;

  const speed = Math.hypot(vx, vz);
  if (speed > maxSpeed) {
    vx = (vx / speed) * maxSpeed;
    vz = (vz / speed) * maxSpeed;
  }

  return [vx, vy, vz];
}

/**
 * Update vertical position and velocity under gravity and track support:
 * - While the ball's center is over a track segment, its y must never go below restY (0.5).
 *   Clamp it and set vy to 0 if it would.
 * - Outside every track segment (by more than ball radius), mark it as falling and let gravity act.
 */
export function updateBallVertical(
  ballPos: [number, number, number],
  velocity: [number, number, number],
  dt: number,
  trackSegments: TrackSegment[],
  restY: number = REST_Y,
  ballRadius: number = 0
): {
  ballPos: [number, number, number];
  velocity: [number, number, number];
  isFalling: boolean;
} {
  const [bx, by, bz] = ballPos;
  const [vx, vy, vz] = velocity;

  const isOver = isBallOverTrack(ballPos, trackSegments, ballRadius);

  if (isOver) {
    // While over track segment, y must never go below restY. Clamp it and set vy to 0 if it would.
    let newVy = vy;
    let newY = by;

    if (by <= restY) {
      newY = restY;
      newVy = 0;
    } else {
      newVy = vy - GRAVITY * dt;
      newY = by + newVy * dt;
      if (newY <= restY) {
        newY = restY;
        newVy = 0;
      }
    }

    return {
      ballPos: [bx, Math.max(restY, newY), bz],
      velocity: [vx, newVy, vz],
      isFalling: false,
    };
  }

  // Outside every track segment: mark as falling at edge, gravity acts
  const newVy = vy - GRAVITY * dt;
  const newY = by + newVy * dt;

  return {
    ballPos: [bx, newY, bz],
    velocity: [vx, newVy, vz],
    isFalling: true,
  };
}

/**
 * Handle ball fall off track:
 * - Stops velocity
 * - Computes respawn position
 * - Deducts fallEnergyPenalty
 * - Shows "Fell off track. Respawned." in HUD for 2 seconds
 */
export function handleBallFall(
  stats: PlayerStats,
  level: LevelConfig
): {
  stats: PlayerStats;
  respawnPosition: [number, number, number];
  newVelocity: [number, number, number];
} {
  const respawnPosition = computeRespawnPoint(
    stats.respawnMode,
    level,
    stats.lastRespawnPoint
  );
  const penalty = level.fallEnergyPenalty ?? 5;
  const newEnergy = Math.max(0, stats.energy - penalty);
  const newStatus = newEnergy <= 0 ? 'failed' : stats.gameStatus;

  const newStats: PlayerStats = {
    ...stats,
    energy: newEnergy,
    gameStatus: newStatus,
    hudMessage: 'Fell off track. Respawned.',
    hudMessageExpiresAt: stats.totalTimeSeconds + 2.0,
  };

  return {
    stats: newStats,
    respawnPosition,
    newVelocity: [0, 0, 0],
  };
}

/**
 * Get position of last active checkpoint, or start bay if none are active
 */
export function getLastActiveCheckpointOrStart(
  stats: PlayerStats,
  level: LevelConfig
): [number, number, number] {
  if (stats.activatedCheckpoints[2]) {
    const cp3 = level.nodes.find((n) => n.checkpointIndex === 3);
    if (cp3) return [cp3.position[0], cp3.position[1] + 0.8, cp3.position[2]];
  }
  if (stats.activatedCheckpoints[1]) {
    const cp2 = level.nodes.find((n) => n.checkpointIndex === 2);
    if (cp2) return [cp2.position[0], cp2.position[1] + 0.8, cp2.position[2]];
  }
  if (stats.activatedCheckpoints[0]) {
    const cp1 = level.nodes.find((n) => n.checkpointIndex === 1);
    if (cp1) return [cp1.position[0], cp1.position[1] + 0.8, cp1.position[2]];
  }
  return [...level.spawnPosition];
}

/**
 * Check if ball center is within the finish radius circle
 */
export function isBallInFinishRadius(
  ballPos: [number, number, number],
  level: LevelConfig
): boolean {
  const finishNode = level.nodes.find((n) => n.isFinish);
  if (!finishNode) return false;

  const [bx, , bz] = ballPos;
  const [fx, , fz] = finishNode.position;
  const dx = bx - fx;
  const dz = bz - fz;
  const radius = level.finishRadius ?? 3.5;
  return dx * dx + dz * dz <= radius * radius;
}

/**
 * Handle touch of finish portal:
 * - If fewer than 3 checkpoints active: do not end game, move ball back to last CP or start,
 *   show "Activate all 3 checkpoints first" in HUD for 2 seconds.
 * - If 3 checkpoints active: completes the level.
 */
export function handleFinishTouch(
  ballPos: [number, number, number],
  stats: PlayerStats,
  level: LevelConfig
): {
  completed: boolean;
  rejected: boolean;
  stats: PlayerStats;
  respawnPosition?: [number, number, number];
  newVelocity?: [number, number, number];
} {
  if (!isBallInFinishRadius(ballPos, level)) {
    return { completed: false, rejected: false, stats };
  }

  const cpCount = stats.activatedCheckpoints.filter(Boolean).length;
  if (cpCount < 3) {
    const returnPos = getLastActiveCheckpointOrStart(stats, level);
    const updatedStats: PlayerStats = {
      ...stats,
      hudMessage: 'Activate all 3 checkpoints first',
      hudMessageExpiresAt: stats.totalTimeSeconds + 2.0,
    };
    return {
      completed: false,
      rejected: true,
      stats: updatedStats,
      respawnPosition: returnPos,
      newVelocity: [0, 0, 0],
    };
  }

  // All 3 checkpoints active: course completed
  const completedStats: PlayerStats = {
    ...stats,
    gameStatus: 'completed',
  };
  return {
    completed: true,
    rejected: false,
    stats: completedStats,
  };
}

/**
 * Verify whether an undirected edge exists in the level graph between two nodes
 */
export function hasGraphEdge(
  fromNodeId: string,
  toNodeId: string,
  edges: LevelEdge[]
): boolean {
  return edges.some(
    (e) =>
      (e.from === fromNodeId && e.to === toNodeId) ||
      (e.from === toNodeId && e.to === fromNodeId)
  );
}

/**
 * Record a route node only if an edge exists in the level graph between the last
 * recorded node and the new one.
 */
export function tryAddRouteNode(
  currentVisited: string[],
  newNodeId: string,
  edges: LevelEdge[]
): { visitedNodeIds: string[]; added: boolean } {
  if (currentVisited.length === 0) {
    return { visitedNodeIds: [newNodeId], added: true };
  }

  const lastNode = currentVisited[currentVisited.length - 1];
  if (lastNode === newNodeId) {
    return { visitedNodeIds: currentVisited, added: false };
  }

  if (!hasGraphEdge(lastNode, newNodeId, edges)) {
    return { visitedNodeIds: currentVisited, added: false };
  }

  return { visitedNodeIds: [...currentVisited, newNodeId], added: true };
}

/**
 * Check if sphere at pos with radius intersects an uncollected coin
 * Returns the coin if collected, or null.
 * Guaranteed no duplicate collection.
 */
export function tryCollectCoin(
  ballPos: [number, number, number],
  ballRadius: number,
  coins: LevelCoin[],
  collectedCoinIds: Set<string>
): LevelCoin | null {
  const [bx, by, bz] = ballPos;
  const pickupRadius = ballRadius + 1.2;
  const pickupRadiusSq = pickupRadius * pickupRadius;

  for (const coin of coins) {
    if (collectedCoinIds.has(coin.id)) continue;
    const [cx, cy, cz] = coin.position;
    const dx = bx - cx;
    const dy = by - cy;
    const dz = bz - cz;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq <= pickupRadiusSq) {
      return coin;
    }
  }

  return null;
}

/**
 * Apply coin collection to stats immutably
 */
export function applyCoinCollection(stats: PlayerStats, coin: LevelCoin): PlayerStats {
  if (stats.collectedCoinIds.includes(coin.id)) {
    return stats; // Prevent duplicate award
  }

  return {
    ...stats,
    score: stats.score + coin.value,
    energy: Math.max(0, stats.energy - coin.cost),
    energyUsed: stats.energyUsed + coin.cost,
    collectedCoinIds: [...stats.collectedCoinIds, coin.id],
  };
}

/**
 * Check and activate checkpoints
 */
export function tryActivateCheckpoint(
  ballPos: [number, number, number],
  level: LevelConfig,
  currentActivated: [boolean, boolean, boolean]
): { activatedIndex: 1 | 2 | 3; newRespawn: [number, number, number] } | null {
  const [bx, by, bz] = ballPos;
  const activationRadiusSq = 3.5 * 3.5;

  for (const node of level.nodes) {
    if (node.isCheckpoint && node.checkpointIndex) {
      const idx = node.checkpointIndex;
      if (!currentActivated[idx - 1]) {
        const [nx, ny, nz] = node.position;
        const dx = bx - nx;
        const dy = by - ny;
        const dz = bz - nz;
        if (dx * dx + dy * dy + dz * dz <= activationRadiusSq) {
          return {
            activatedIndex: idx,
            newRespawn: [nx, ny + 1.0, nz],
          };
        }
      }
    }
  }

  return null;
}

/**
 * Check if player has visited a node in the graph
 */
export function checkNodeProximity(
  ballPos: [number, number, number],
  level: LevelConfig,
  currentVisited: string[]
): string | null {
  const [bx, , bz] = ballPos;
  const reachRadiusSq = 4.0 * 4.0;
  const lastVisited = currentVisited[currentVisited.length - 1];

  for (const node of level.nodes) {
    if (node.id === lastVisited) continue;
    const [nx, , nz] = node.position;
    const dx = bx - nx;
    const dz = bz - nz;
    if (dx * dx + dz * dz <= reachRadiusSq) {
      return node.id;
    }
  }

  return null;
}

/**
 * Check if ball collides with hazards or fell off edge
 */
export function checkHazardCollision(
  ballPos: [number, number, number],
  ballRadius: number,
  hazards: LevelHazard[],
  killHeight: number = -0.2
): LevelHazard | 'fall_off' | null {
  const [bx, by, bz] = ballPos;

  // Fall off platform
  if (by < killHeight) {
    return 'fall_off';
  }

  for (const haz of hazards) {
    const [hx, hy, hz] = haz.position;
    const [hw, hh, hd] = haz.size;

    const minX = hx - hw / 2 - ballRadius;
    const maxX = hx + hw / 2 + ballRadius;
    const minY = hy - hh / 2 - ballRadius;
    const maxY = hy + hh / 2 + ballRadius;
    const minZ = hz - hd / 2 - ballRadius;
    const maxZ = hz + hd / 2 + ballRadius;

    if (bx >= minX && bx <= maxX && by >= minY && by <= maxY && bz >= minZ && bz <= maxZ) {
      return haz;
    }
  }

  return null;
}

/**
 * Check finish goal (requires all 3 checkpoints if stats is provided)
 */
export function checkFinishReached(
  ballPos: [number, number, number],
  level: LevelConfig,
  stats?: PlayerStats
): boolean {
  if (!isBallInFinishRadius(ballPos, level)) {
    return false;
  }
  if (stats) {
    return stats.activatedCheckpoints.filter(Boolean).length === 3;
  }
  return true;
}

/**
 * Calculate total route cost for player's visited path using level edge weights.
 * Strictly sums the weights of the edges in the recorded route.
 */
export function calculatePathCost(path: string[], level: LevelConfig): number {
  if (path.length <= 1) return 0;
  let totalCost = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const edge = level.edges.find(
      (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from)
    );
    if (edge) {
      totalCost += edge.weight;
    }
  }

  return totalCost;
}

/**
 * Updates the HUD message timer and expires message after its 2s window
 */
export function updateHudMessageTimer(stats: PlayerStats): PlayerStats {
  if (stats.hudMessage && stats.hudMessageExpiresAt !== undefined) {
    if (stats.totalTimeSeconds >= stats.hudMessageExpiresAt) {
      return {
        ...stats,
        hudMessage: null,
        hudMessageExpiresAt: undefined,
      };
    }
  }
  return stats;
}
