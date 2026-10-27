import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LEVEL } from '../config/levelConfig';
import {
  createInitialPlayerStats,
  tryCollectCoin,
  applyCoinCollection,
  tryActivateCheckpoint,
  calculatePathCost,
  computeRespawnPoint,
  isBallOnTrack,
  hasBallFallen,
  handleBallFall,
  handleFinishTouch,
  tryAddRouteNode,
  MovementKeys,
  applyMovementPhysics,
  updateBallVertical,
  isBallOverTrack,
  isBallFalling,
  REST_Y,
  GRAVITY,
  checkHazardCollision,
} from './gameLogic';

test('gameLogic: configurable respawn point returns correct coordinate for mode', () => {
  const lastActiveCp: [number, number, number] = [-14, 1.5, -20];

  const spawnRespawn = computeRespawnPoint('start', DEFAULT_LEVEL, lastActiveCp);
  assert.deepEqual(spawnRespawn, DEFAULT_LEVEL.spawnPosition);

  const cp1Respawn = computeRespawnPoint('cp1', DEFAULT_LEVEL, lastActiveCp);
  assert.equal(cp1Respawn[0], -14);

  const defaultRespawn = computeRespawnPoint('last_checkpoint', DEFAULT_LEVEL, lastActiveCp);
  assert.deepEqual(defaultRespawn, lastActiveCp);
});

test('gameLogic: initial stats set correctly from level config', () => {
  const stats = createInitialPlayerStats(DEFAULT_LEVEL);
  assert.equal(stats.score, 0);
  assert.equal(stats.energy, DEFAULT_LEVEL.initialEnergy);
  assert.deepEqual(stats.activatedCheckpoints, [false, false, false]);
  assert.equal(stats.gameStatus, 'ready');
});

test('gameLogic: coin collection awards score and prevents duplicate awards', () => {
  let stats = createInitialPlayerStats(DEFAULT_LEVEL);
  const coin = DEFAULT_LEVEL.coins[0];

  stats = applyCoinCollection(stats, coin);
  assert.equal(stats.score, coin.value);
  assert.equal(stats.energyUsed, coin.cost);
  assert.ok(stats.collectedCoinIds.includes(coin.id));

  // Applying same coin again must NOT increase score or cost
  const repeatStats = applyCoinCollection(stats, coin);
  assert.equal(repeatStats.score, coin.value);
  assert.equal(repeatStats.energyUsed, coin.cost);
});

test('gameLogic: tryCollectCoin finds coin within radius', () => {
  const coin = DEFAULT_LEVEL.coins[0];
  const ballNear: [number, number, number] = [
    coin.position[0] + 0.5,
    coin.position[1],
    coin.position[2] + 0.5,
  ];

  const found = tryCollectCoin(ballNear, 0.6, DEFAULT_LEVEL.coins, new Set());
  assert.ok(found);
  assert.equal(found?.id, coin.id);

  // Once collected, cannot be collected again
  const alreadyCollected = new Set([coin.id]);
  const foundAgain = tryCollectCoin(ballNear, 0.6, DEFAULT_LEVEL.coins, alreadyCollected);
  assert.equal(foundAgain, null);
});

test('gameLogic: checkpoint activation activates sequentially and updates respawn', () => {
  const cp1Node = DEFAULT_LEVEL.nodes.find((n) => n.checkpointIndex === 1)!;
  const ballAtCp1: [number, number, number] = [...cp1Node.position];

  const result = tryActivateCheckpoint(ballAtCp1, DEFAULT_LEVEL, [false, false, false]);
  assert.ok(result);
  assert.equal(result?.activatedIndex, 1);
  assert.equal(result?.newRespawn[1], cp1Node.position[1] + 1.0);
});

// Track boundary, fall condition (OR logic), and respawn unit tests
test('gameLogic: a point inside a track segment is on track', () => {
  // Start platform in DEFAULT_LEVEL: minX: -4.5, maxX: 4.5, minZ: -39.5, maxZ: -32.5
  const pointInside: [number, number, number] = [0, 0.5, -36];
  assert.equal(isBallOnTrack(pointInside, DEFAULT_LEVEL.trackSegments, DEFAULT_LEVEL.killHeight), true);
  assert.equal(hasBallFallen(pointInside, DEFAULT_LEVEL.trackSegments, DEFAULT_LEVEL.killHeight), false);

  // Another point along road S -> A: [-8, 0.5, -28]
  const pointOnRoad: [number, number, number] = [-8, 0.5, -28];
  assert.equal(isBallOnTrack(pointOnRoad, DEFAULT_LEVEL.trackSegments, DEFAULT_LEVEL.killHeight), true);
  assert.equal(hasBallFallen(pointOnRoad, DEFAULT_LEVEL.trackSegments, DEFAULT_LEVEL.killHeight), false);
});

test('gameLogic: a point outside every segment is off track', () => {
  // Empty space in the chasm between branch S->A and branch S->B at [0, 0.5, -25]
  const pointInChasm: [number, number, number] = [0, 0.5, -25];
  assert.equal(isBallOnTrack(pointInChasm, DEFAULT_LEVEL.trackSegments, DEFAULT_LEVEL.killHeight), false);
  assert.equal(hasBallFallen(pointInChasm, DEFAULT_LEVEL.trackSegments, DEFAULT_LEVEL.killHeight), true);

  // Far outside all track segments
  const pointFarOutside: [number, number, number] = [50, 0.5, 50];
  assert.equal(isBallOnTrack(pointFarOutside, DEFAULT_LEVEL.trackSegments, DEFAULT_LEVEL.killHeight), false);
  assert.equal(hasBallFallen(pointFarOutside, DEFAULT_LEVEL.trackSegments, DEFAULT_LEVEL.killHeight), true);
});

test('gameLogic: a point with y below killHeight is off track', () => {
  // Inside segment x/z bounds but below killHeight (-0.2)
  const pointBelowKillHeight: [number, number, number] = [0, -0.5, -36];
  assert.equal(isBallOnTrack(pointBelowKillHeight, DEFAULT_LEVEL.trackSegments, DEFAULT_LEVEL.killHeight), false);
  assert.equal(hasBallFallen(pointBelowKillHeight, DEFAULT_LEVEL.trackSegments, DEFAULT_LEVEL.killHeight), true);
});

test('gameLogic: an off-track ball triggers respawn and the energy penalty', () => {
  const initialStats = createInitialPlayerStats(DEFAULT_LEVEL);
  const initialEnergy = initialStats.energy;
  const result = handleBallFall(initialStats, DEFAULT_LEVEL);

  // Velocity stops and ball respawns at respawn point
  assert.deepEqual(result.respawnPosition, DEFAULT_LEVEL.spawnPosition);
  assert.deepEqual(result.newVelocity, [0, 0, 0]);

  // Fall energy penalty is subtracted
  assert.equal(result.stats.energy, initialEnergy - DEFAULT_LEVEL.fallEnergyPenalty);
  assert.equal(result.stats.hudMessage, 'Fell off track. Respawned.');
});

// Bug 2 Unit Tests: Finish portal checkpoint requirement
test('gameLogic: a finish touch with 2 of 3 checkpoints does not complete the level', () => {
  let stats = createInitialPlayerStats(DEFAULT_LEVEL);
  stats.activatedCheckpoints = [true, true, false]; // 2 of 3 active
  const finishPos: [number, number, number] = [0, 0.5, 38]; // Center of Finish Portal F

  const result = handleFinishTouch(finishPos, stats, DEFAULT_LEVEL);
  assert.equal(result.completed, false);
  assert.equal(result.rejected, true);
  assert.notEqual(result.stats.gameStatus, 'completed');
  assert.equal(result.stats.hudMessage, 'Activate all 3 checkpoints first');
  // Ball moved back to last active checkpoint (CP2, node 'D' at x=8)
  assert.ok(result.respawnPosition);
  assert.equal(result.respawnPosition[0], 8);
});

test('gameLogic: a finish touch with 3 of 3 checkpoints completes the level', () => {
  let stats = createInitialPlayerStats(DEFAULT_LEVEL);
  stats.activatedCheckpoints = [true, true, true]; // all 3 checkpoints active
  const finishPos: [number, number, number] = [0, 0.5, 38];

  const result = handleFinishTouch(finishPos, stats, DEFAULT_LEVEL);
  assert.equal(result.completed, true);
  assert.equal(result.rejected, false);
  assert.equal(result.stats.gameStatus, 'completed');
});

// Bug 3 Unit Tests: Graph edge checking and route cost summation
test('gameLogic: a route only adds nodes connected by an existing graph edge', () => {
  let visited = ['S'];

  // In DEFAULT_LEVEL, edge (S, A) exists
  const addA = tryAddRouteNode(visited, 'A', DEFAULT_LEVEL.edges);
  assert.equal(addA.added, true);
  assert.deepEqual(addA.visitedNodeIds, ['S', 'A']);
  visited = addA.visitedNodeIds;

  // In DEFAULT_LEVEL, no direct edge exists between A and F (Finish)
  const addF = tryAddRouteNode(visited, 'F', DEFAULT_LEVEL.edges);
  assert.equal(addF.added, false);
  assert.deepEqual(addF.visitedNodeIds, ['S', 'A']); // Node F not added

  // Edge (A, C) exists
  const addC = tryAddRouteNode(visited, 'C', DEFAULT_LEVEL.edges);
  assert.equal(addC.added, true);
  assert.deepEqual(addC.visitedNodeIds, ['S', 'A', 'C']);
});

test('gameLogic: route cost equals the sum of the recorded edge weights', () => {
  // S -> A -> C -> D in DEFAULT_LEVEL:
  // Edge (S, A): weight 4
  // Edge (A, C): weight 3
  // Edge (C, D): weight 2
  // Expected sum = 4 + 3 + 2 = 9
  const route = ['S', 'A', 'C', 'D'];
  const cost = calculatePathCost(route, DEFAULT_LEVEL);
  assert.equal(cost, 9);

  // Another route: S -> B -> D -> G -> H -> F
  // (S, B): 5, (B, D): 4, (D, G): 6, (G, H): 3, (H, F): 2 = 20
  const fullRoute = ['S', 'B', 'D', 'G', 'H', 'F'];
  const fullCost = calculatePathCost(fullRoute, DEFAULT_LEVEL);
  assert.equal(fullCost, 20);
});

test('gameLogic: with camera looking along -z, pressing D must produce positive x velocity and pressing A negative x velocity', () => {
  const cameraForward: [number, number, number] = [0, 0, -1];
  const dt = 0.05;

  // Pressing D (Right Arrow) moves toward screen-right -> produces positive x velocity
  const keysD: MovementKeys = { up: false, down: false, left: false, right: true };
  const velD = applyMovementPhysics([0, 0, 0], keysD, cameraForward, dt);
  assert.ok(velD[0] > 0, `Expected positive x velocity when pressing D, got ${velD[0]}`);
  assert.equal(velD[2], 0, `Expected zero z velocity when pressing D, got ${velD[2]}`);

  // Pressing A (Left Arrow) moves toward screen-left -> produces negative x velocity
  const keysA: MovementKeys = { up: false, down: false, left: true, right: false };
  const velA = applyMovementPhysics([0, 0, 0], keysA, cameraForward, dt);
  assert.ok(velA[0] < 0, `Expected negative x velocity when pressing A, got ${velA[0]}`);
  assert.equal(velA[2], 0, `Expected zero z velocity when pressing A, got ${velA[2]}`);
});

test('gameLogic: a ball center inside a track segment rests at restY', () => {
  // Center is inside start platform: minX: -6, maxX: 6, minZ: -40, maxZ: -32
  const insidePos: [number, number, number] = [0, 0.4, -36];
  const result = updateBallVertical(insidePos, [0, -5, 0], 0.05, DEFAULT_LEVEL.trackSegments, REST_Y);
  assert.equal(result.ballPos[1], REST_Y);
  assert.equal(result.velocity[1], 0);

  // Center exactly at restY
  const atRestPos: [number, number, number] = [0, REST_Y, -36];
  const resultAtRest = updateBallVertical(atRestPos, [0, 0, 0], 0.05, DEFAULT_LEVEL.trackSegments, REST_Y);
  assert.equal(resultAtRest.ballPos[1], REST_Y);
  assert.equal(resultAtRest.velocity[1], 0);
});

test('gameLogic: a ball center outside every track segment falls (vy becomes negative, y decreases)', () => {
  // Outside any track segment
  const outsidePos: [number, number, number] = [50, 0.5, 50];
  const initialVel: [number, number, number] = [0, 0, 0];
  const dt = 0.05;

  const result = updateBallVertical(outsidePos, initialVel, dt, DEFAULT_LEVEL.trackSegments, REST_Y);
  assert.ok(result.velocity[1] < 0, `Expected vy to be negative, got ${result.velocity[1]}`);
  assert.ok(result.ballPos[1] < outsidePos[1], `Expected y to decrease, got ${result.ballPos[1]}`);
});

test('gameLogic: a ball falling over multiple steps drops below killHeight', () => {
  let pos: [number, number, number] = [50, REST_Y, 50];
  let vel: [number, number, number] = [0, 0, 0];
  const dt = 0.05;

  // Over 10 steps (0.5s), ball drops from 0.5 below killHeight (-0.2)
  for (let step = 0; step < 10; step++) {
    const res = updateBallVertical(pos, vel, dt, DEFAULT_LEVEL.trackSegments, REST_Y);
    pos = res.ballPos;
    vel = res.velocity;
  }

  assert.ok(pos[1] < DEFAULT_LEVEL.killHeight, `Expected y < killHeight (${DEFAULT_LEVEL.killHeight}), got ${pos[1]}`);
});

test('gameLogic: a fall triggers handleBallFall and deducts the fallEnergyPenalty', () => {
  const initialStats = createInitialPlayerStats(DEFAULT_LEVEL);
  const initialEnergy = initialStats.energy;
  const fallRes = handleBallFall(initialStats, DEFAULT_LEVEL);

  assert.deepEqual(fallRes.respawnPosition, DEFAULT_LEVEL.spawnPosition);
  assert.deepEqual(fallRes.newVelocity, [0, 0, 0]);
  assert.equal(fallRes.stats.energy, initialEnergy - DEFAULT_LEVEL.fallEnergyPenalty);
  assert.equal(fallRes.stats.hudMessage, 'Fell off track. Respawned.');
});

test('gameLogic: verify gravity is 20 units/s²', () => {
  assert.equal(GRAVITY, 20.0);

  // In applyMovementPhysics, 1 second of dt reduces vy by exactly 20 units
  const cameraForward: [number, number, number] = [0, 0, -1];
  const keysNone: MovementKeys = { up: false, down: false, left: false, right: false };
  const vel = applyMovementPhysics([0, 0, 0], keysNone, cameraForward, 1.0);
  assert.equal(vel[1], -20.0);

  // In updateBallVertical outside track, 1 second of dt accelerates vy by 20 units downward
  const vert = updateBallVertical([50, 10, 50], [0, 0, 0], 1.0, [], REST_Y);
  assert.equal(vert.velocity[1], -20.0);
});

test('gameLogic: a ball over a segment stays at or above restY', () => {
  // A ball over a segment with downward velocity or initial y below restY
  const insidePos: [number, number, number] = [0, 0.3, -36];
  const result = updateBallVertical(insidePos, [0, -10, 0], 0.05, DEFAULT_LEVEL.trackSegments, REST_Y, 0.65);
  assert.equal(result.ballPos[1], REST_Y);
  assert.equal(result.velocity[1], 0);
  assert.equal(result.isFalling, false);

  // Ball at restY remains at restY and does not sink beneath segment
  const atRestResult = updateBallVertical([0, REST_Y, -36], [0, -2, 0], 0.05, DEFAULT_LEVEL.trackSegments, REST_Y, 0.65);
  assert.equal(atRestResult.ballPos[1], REST_Y);
  assert.equal(atRestResult.velocity[1], 0);
  assert.equal(atRestResult.isFalling, false);
});

test('gameLogic: a ball just past a segment edge is marked falling before y drops below killHeight', () => {
  // Road S->B at Z = -36 has maxX = 6.5. With ball radius 0.65, track edge is at X = 7.15.
  // Point just past edge: X = 7.3, Y = 0.5 (REST_Y), Z = -36.
  const pastEdgePos: [number, number, number] = [7.3, REST_Y, -36];
  assert.ok(pastEdgePos[1] > DEFAULT_LEVEL.killHeight, 'Ball y is still above killHeight');

  const falling = isBallFalling(pastEdgePos, DEFAULT_LEVEL.trackSegments, 0.65);
  assert.equal(falling, true);

  const vertResult = updateBallVertical(pastEdgePos, [0, 0, 0], 0.05, DEFAULT_LEVEL.trackSegments, REST_Y, 0.65);
  assert.equal(vertResult.isFalling, true);
  assert.ok(vertResult.ballPos[1] > DEFAULT_LEVEL.killHeight, 'Ball is marked falling before y drops below killHeight');
});

test('gameLogic: a fall respawns once and deducts the energy penalty once', () => {
  let stats = createInitialPlayerStats(DEFAULT_LEVEL);
  const initialEnergy = stats.energy;
  let hasRespawned = false;

  const triggerFallRespawn = () => {
    if (!hasRespawned) {
      hasRespawned = true;
      const res = handleBallFall(stats, DEFAULT_LEVEL);
      stats = res.stats;
      return res;
    }
    return null;
  };

  // First trigger on fall drops below killHeight
  const firstRes = triggerFallRespawn();
  assert.ok(firstRes);
  assert.equal(stats.energy, initialEnergy - DEFAULT_LEVEL.fallEnergyPenalty);
  assert.deepEqual(firstRes.respawnPosition, DEFAULT_LEVEL.spawnPosition);
  assert.deepEqual(firstRes.newVelocity, [0, 0, 0]);
  assert.equal(stats.hudMessage, 'Fell off track. Respawned.');

  // Subsequent trigger while falling/handling fall must not call handleBallFall again or deduct energy again
  const secondRes = triggerFallRespawn();
  assert.equal(secondRes, null);
  assert.equal(stats.energy, initialEnergy - DEFAULT_LEVEL.fallEnergyPenalty);
});
test('gameLogic: every coin value in DEFAULT_LEVEL is 2 or 3 and matches red or yellow type', () => {
  assert.equal(DEFAULT_LEVEL.coins.length, 9);
  for (const coin of DEFAULT_LEVEL.coins) {
    assert.ok(coin.value === 2 || coin.value === 3, `Coin ${coin.id} value must be 2 or 3, got ${coin.value}`);
    if (coin.value === 3) {
      assert.equal(coin.color, '#ef4444');
      assert.equal(coin.name, 'Red Coin');
      assert.equal(coin.cost, 3);
    } else {
      assert.equal(coin.color, '#facc15');
      assert.equal(coin.name, 'Yellow Coin');
      assert.equal(coin.cost, 2);
    }
  }
});

test('gameLogic: every coin in DEFAULT_LEVEL is inside track segments with at least 1 unit margin', () => {
  const margin = 1.0;
  for (const coin of DEFAULT_LEVEL.coins) {
    const [cx, , cz] = coin.position;
    const isInsideWithMargin = DEFAULT_LEVEL.trackSegments.some((seg) => {
      return (
        cx >= seg.minX + margin &&
        cx <= seg.maxX - margin &&
        cz >= seg.minZ + margin &&
        cz <= seg.maxZ - margin
      );
    });
    assert.ok(
      isInsideWithMargin,
      `Coin ${coin.id} at [${cx}, ${cz}] must be inside at least one track segment with at least ${margin} unit margin`
    );
  }
});
