/**
 * GameCanvas Component
 * Three.js WebGL 3D rolling ball canvas with responsive controls,
 * local physics, checkpoint progression, coins, hazards, and camera damping.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DEFAULT_LEVEL, LevelConfig, gridY, gridOpacity } from '../config/levelConfig';
import {
  PlayerStats,
  createInitialPlayerStats,
  tryCollectCoin,
  applyCoinCollection,
  tryActivateCheckpoint,
  checkNodeProximity,
  checkHazardCollision,
  isBallOnTrack,
  hasBallFallen,
  handleBallFall,
  handleFinishTouch,
  tryAddRouteNode,
  updateHudMessageTimer,
  applyMovementPhysics,
  updateBallVertical,
  REST_Y,
} from './gameLogic';
import {
  createGameMaterials,
  createCompositeBall,
  createContactShadowDisc,
  createCheckpointPedestal,
  createCompositeCoin,
  createFinishPortal,
  createHazardMesh,
} from './proceduralAssets';
import { buildLevelGeometry } from './levelBuilder';
import { soundController } from '../audio/soundEffects';

interface GameCanvasProps {
  level?: LevelConfig;
  gameStatus: 'ready' | 'playing' | 'paused' | 'completed' | 'failed';
  onStatsUpdate: (stats: PlayerStats) => void;
  onCheckpointActivated?: (index: 1 | 2 | 3) => void;
  onFinishReached?: () => void;
  onRespawn?: () => void;
}

// Lightweight procedural starfield (static 3D Points, zero physics / particle overhead)
function createStarfield(): THREE.Points {
  const count = 450;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const r = 90 + Math.random() * 90;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const type = Math.random();
    if (type > 0.85) {
      colors[i * 3] = 0.55;
      colors[i * 3 + 1] = 0.82;
      colors[i * 3 + 2] = 1.0;
    } else if (type > 0.7) {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.94;
      colors[i * 3 + 2] = 0.8;
    } else {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 2.0,
    vertexColors: true,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.95,
  });

  return new THREE.Points(geo, mat);
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level = DEFAULT_LEVEL,
  gameStatus,
  onStatsUpdate,
  onCheckpointActivated,
  onFinishReached,
  onRespawn,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Store mutable state & callbacks in refs to avoid React re-triggering Three.js mount
  const statsRef = useRef<PlayerStats>(createInitialPlayerStats(level));
  const gameStatusRef = useRef(gameStatus);
  const onStatsUpdateRef = useRef(onStatsUpdate);
  const onCheckpointActivatedRef = useRef(onCheckpointActivated);
  const onFinishReachedRef = useRef(onFinishReached);
  const onRespawnRef = useRef(onRespawn);
  const isFallingRef = useRef<boolean>(false);
  const hasRespawnedRef = useRef<boolean>(false);

  // Sync refs with latest props
  useEffect(() => {
    gameStatusRef.current = gameStatus;
    statsRef.current.gameStatus = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    isFallingRef.current = false;
    hasRespawnedRef.current = false;
  }, [level]);

  useEffect(() => {
    onStatsUpdateRef.current = onStatsUpdate;
    onCheckpointActivatedRef.current = onCheckpointActivated;
    onFinishReachedRef.current = onFinishReached;
    onRespawnRef.current = onRespawn;
  }, [onStatsUpdate, onCheckpointActivated, onFinishReached, onRespawn]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect Software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Initialize Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Scene & Camera (Space Style Starfield)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a);
    scene.fog = new THREE.FogExp2(0x02040a, 0.007);

    // Add starfield
    const starfield = createStarfield();
    scene.add(starfield);

    // Large, faint visual reference grid plane placed well below track at gridY (well under killHeight)
    // Dark blue-grey lines with low opacity fitting the space look
    const gridHelper = new THREE.GridHelper(260, 65, 0x334155, 0x1e293b);
    gridHelper.position.set(0, gridY, 0);
    if (gridHelper.material instanceof THREE.Material) {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = gridOpacity;
      gridHelper.material.depthWrite = false;
    }
    scene.add(gridHelper);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );

    // Initial camera position looking toward start bay
    const [sx, sy, sz] = level.spawnPosition;
    camera.position.set(sx, sy + 7, sz - 10);
    camera.lookAt(sx, REST_Y, sz);

    // 4. Studio Environment & Lighting (Deep Space Lighting)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Distant Star Key Light
    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 1.4);
    keyLight.position.set(20, 35, 10);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 5;
      keyLight.shadow.camera.far = 100;
      keyLight.shadow.camera.left = -40;
      keyLight.shadow.camera.right = 40;
      keyLight.shadow.camera.top = 50;
      keyLight.shadow.camera.bottom = -50;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    // Deep Space Cosmic Fill
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x020617, 0.65);
    scene.add(hemiLight);

    // 5. Build Level Elements
    const materials = createGameMaterials();
    const { rootGroup: levelGroup, nodeMarkers } = buildLevelGeometry(level, materials);
    scene.add(levelGroup);

    // Checkpoint Pedestals
    const checkpointObjects: Array<{
      index: 1 | 2 | 3;
      crystal: THREE.Mesh;
      light: THREE.PointLight;
      node: any;
    }> = [];

    for (const node of level.nodes) {
      if (node.isCheckpoint && node.checkpointIndex) {
        const cp = createCheckpointPedestal(node, materials);
        scene.add(cp.group);
        checkpointObjects.push({
          index: node.checkpointIndex,
          crystal: cp.crystal,
          light: cp.light,
          node,
        });
      }
    }

    // Finish Portal
    const finishNode = level.nodes.find((n) => n.isFinish);
    if (finishNode) {
      const finishMesh = createFinishPortal(finishNode, materials);
      scene.add(finishMesh);
    }

    // Collectible Coins
    const coinMeshes = new Map<string, { group: THREE.Group; coinMesh: THREE.Group }>();
    for (const coin of level.coins) {
      const c = createCompositeCoin(coin, materials);
      scene.add(c.group);
      coinMeshes.set(coin.id, c);
    }

    // Hazards
    const hazardMeshes: Array<{ hazard: any; group: THREE.Group }> = [];
    for (const haz of level.hazards) {
      const hMesh = createHazardMesh(haz, materials);
      scene.add(hMesh);
      hazardMeshes.push({ hazard: haz, group: hMesh });
    }

    // Hero Ball & Contact Shadow
    const ballGroup = createCompositeBall(materials);
    const ballShadow = createContactShadowDisc(0.7);
    scene.add(ballGroup);
    scene.add(ballShadow);

    // Ball Physics State
    const ballRadius = 0.65;
    const ballPos = new THREE.Vector3(sx, sy, sz);
    const ballVel = new THREE.Vector3(0, 0, 0);
    ballGroup.position.copy(ballPos);

    // Input state
    const keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      brake: false,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) keys.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keys.down = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = true;
      if (['Space'].includes(e.code)) keys.brake = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keys.down = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = false;
      if (['Space'].includes(e.code)) keys.brake = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Pre-allocated scratch math objects outside loop
    const _camForward = new THREE.Vector3();
    const _targetCamPos = new THREE.Vector3();
    const _targetLookAt = new THREE.Vector3();
    const clock = new THREE.Clock();
    let lastHudUpdateTime = 0;
    let frameId = 0;

    // Software WebGL pacing helper
    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    // Main Game Loop
    function tick() {
      const dt = Math.min(clock.getDelta(), 0.08);
      const isPlaying = gameStatusRef.current === 'playing';

      if (isPlaying) {
        statsRef.current.totalTimeSeconds += dt;
        statsRef.current = updateHudMessageTimer(statsRef.current);

        // 1. Camera-relative Player Movement Input (delegated to gameLogic)
        camera.getWorldDirection(_camForward);
        const newVel = applyMovementPhysics(
          [ballVel.x, ballVel.y, ballVel.z],
          keys,
          [_camForward.x, _camForward.y, _camForward.z],
          dt,
          keys.brake
        );
        ballVel.x = newVel[0];
        ballVel.z = newVel[2];

        // Update horizontal position
        ballPos.x += ballVel.x * dt;
        ballPos.z += ballVel.z * dt;

        // Visual rolling rotation based on velocity
        const speed = Math.hypot(ballVel.x, ballVel.z);
        if (speed > 0.01) {
          const rollAngleX = (ballVel.z * dt) / ballRadius;
          const rollAngleZ = -(ballVel.x * dt) / ballRadius;
          ballGroup.rotation.x += rollAngleX;
          ballGroup.rotation.z += rollAngleZ;
        }

        // Call updateBallVertical before position is written to mesh
        const verticalResult = updateBallVertical(
          [ballPos.x, ballPos.y, ballPos.z],
          [ballVel.x, ballVel.y, ballVel.z],
          dt,
          level.trackSegments,
          REST_Y,
          ballRadius
        );
        ballPos.y = verticalResult.ballPos[1];
        ballVel.y = verticalResult.velocity[1];
        isFallingRef.current = verticalResult.isFalling;

        ballGroup.position.copy(ballPos);

        // Contact shadow position beneath ball
        ballShadow.position.set(ballPos.x, 0.56, ballPos.z);

        const currentBallTuple: [number, number, number] = [ballPos.x, ballPos.y, ballPos.z];

        // Reset respawn lock once ball is safely back on track and above killHeight
        if (!isFallingRef.current && ballPos.y >= level.killHeight) {
          hasRespawnedRef.current = false;
        }

        // 2. Check Fall Off Track:
        // Marked falling at edge by updateBallVertical, gravity acts, and respawn triggers
        // once y drops below killHeight. Call handleBallFall once per fall.
        if (ballPos.y < level.killHeight && !hasRespawnedRef.current) {
          hasRespawnedRef.current = true;
          const fallRes = handleBallFall(statsRef.current, level);
          statsRef.current = fallRes.stats;
          ballPos.set(...fallRes.respawnPosition);
          ballVel.set(...fallRes.newVelocity);
          isFallingRef.current = false;
          ballGroup.position.copy(ballPos);
          ballShadow.position.set(ballPos.x, 0.56, ballPos.z);
          soundController.playRespawn();
          onRespawnRef.current?.();
          onStatsUpdateRef.current({ ...statsRef.current });
        }

        // 3. Coin Intersections
        const collectedCoin = tryCollectCoin(
          currentBallTuple,
          ballRadius,
          level.coins,
          new Set(statsRef.current.collectedCoinIds)
        );

        if (collectedCoin) {
          statsRef.current = applyCoinCollection(statsRef.current, collectedCoin);
          soundController.playCoin();

          // Remove coin visually
          const cObj = coinMeshes.get(collectedCoin.id);
          if (cObj) {
            scene.remove(cObj.group);
          }
          onStatsUpdateRef.current({ ...statsRef.current });
        }

        // 4. Checkpoint Triggering
        const cpActivation = tryActivateCheckpoint(
          currentBallTuple,
          level,
          statsRef.current.activatedCheckpoints
        );

        if (cpActivation) {
          const idx = cpActivation.activatedIndex;
          const newActivated: [boolean, boolean, boolean] = [
            ...statsRef.current.activatedCheckpoints,
          ];
          newActivated[idx - 1] = true;

          statsRef.current.activatedCheckpoints = newActivated;
          statsRef.current.lastRespawnPoint = [...cpActivation.newRespawn];

          // Record route node for this checkpoint if graph edge exists
          const cpNode = level.nodes.find((n) => n.checkpointIndex === idx);
          if (cpNode) {
            const routeRes = tryAddRouteNode(
              statsRef.current.visitedNodeIds,
              cpNode.id,
              level.edges
            );
            if (routeRes.added) {
              statsRef.current.visitedNodeIds = routeRes.visitedNodeIds;
              const markerObj = nodeMarkers.get(cpNode.id);
              if (markerObj) {
                markerObj.mat.color.setHex(0x38bdf8);
                markerObj.mat.emissive.setHex(0x0284c7);
                markerObj.mat.emissiveIntensity = 0.8;
              }
            }
          }

          soundController.playCheckpoint();
          onCheckpointActivatedRef.current?.(idx);
          onStatsUpdateRef.current({ ...statsRef.current });

          // Update checkpoint visual
          const cpObj = checkpointObjects.find((c) => c.index === idx);
          if (cpObj) {
            cpObj.crystal.material = materials.checkpointActiveMat;
            cpObj.light.intensity = 2.5;
          }
        }

        // 5. Graph Node Proximity (Route Tracking via Graph Edges)
        const nearbyNode = checkNodeProximity(
          currentBallTuple,
          level,
          statsRef.current.visitedNodeIds
        );
        if (nearbyNode) {
          const routeRes = tryAddRouteNode(
            statsRef.current.visitedNodeIds,
            nearbyNode,
            level.edges
          );
          if (routeRes.added) {
            statsRef.current.visitedNodeIds = routeRes.visitedNodeIds;

            // Highlight node ground marker
            const markerObj = nodeMarkers.get(nearbyNode);
            if (markerObj) {
              markerObj.mat.color.setHex(0x38bdf8);
              markerObj.mat.emissive.setHex(0x0284c7);
              markerObj.mat.emissiveIntensity = 0.8;
            }
            onStatsUpdateRef.current({ ...statsRef.current });
          }
        }

        // 6. Hazard Collision
        const hazardHit = checkHazardCollision(currentBallTuple, ballRadius, level.hazards, level.killHeight);
        if (hazardHit) {
          soundController.playHazard();

          // Deduct energy or trigger respawn
          if (hazardHit === 'fall_off' || (typeof hazardHit === 'object' && hazardHit.causesRespawn)) {
            if (!hasRespawnedRef.current) {
              hasRespawnedRef.current = true;
              const fallRes = handleBallFall(statsRef.current, level);
              statsRef.current = fallRes.stats;
              ballPos.set(...fallRes.respawnPosition);
              ballVel.set(...fallRes.newVelocity);
              isFallingRef.current = false;
              ballGroup.position.copy(ballPos);
              ballShadow.position.set(ballPos.x, 0.56, ballPos.z);
              soundController.playRespawn();
              onRespawnRef.current?.();
              onStatsUpdateRef.current({ ...statsRef.current });
            }
          } else if (typeof hazardHit === 'object') {
            statsRef.current.energy = Math.max(0, statsRef.current.energy - hazardHit.energyPenalty);
            if (statsRef.current.energy <= 0) {
              statsRef.current.gameStatus = 'failed';
            }
            ballVel.multiplyScalar(-0.6);
            onStatsUpdateRef.current({ ...statsRef.current });
          }
        }

        // 7. Finish Portal Goal Reached
        const finishRes = handleFinishTouch(currentBallTuple, statsRef.current, level);
        if (finishRes.rejected) {
          statsRef.current = finishRes.stats;
          if (finishRes.respawnPosition) {
            ballPos.set(...finishRes.respawnPosition);
            ballVel.set(0, 0, 0);
            ballGroup.position.copy(ballPos);
            ballShadow.position.set(ballPos.x, 0.56, ballPos.z);
          }
          soundController.playHazard();
          onStatsUpdateRef.current({ ...statsRef.current });
        } else if (finishRes.completed) {
          const finishNode = level.nodes.find((n) => n.isFinish);
          if (finishNode) {
            const routeRes = tryAddRouteNode(
              statsRef.current.visitedNodeIds,
              finishNode.id,
              level.edges
            );
            if (routeRes.added) {
              finishRes.stats.visitedNodeIds = routeRes.visitedNodeIds;
            }
          }
          statsRef.current = finishRes.stats;
          soundController.playVictory();
          onFinishReachedRef.current?.();
          onStatsUpdateRef.current({ ...statsRef.current });
        }
      }

      // Rotate active coin meshes gently
      const elapsed = clock.getElapsedTime();
      for (const [id, cObj] of coinMeshes.entries()) {
        if (!statsRef.current.collectedCoinIds.includes(id)) {
          cObj.coinMesh.rotation.y += dt * 2.2;
          cObj.coinMesh.position.y = 0.2 + Math.sin(elapsed * 3 + id.charCodeAt(1)) * 0.08;
        }
      }

      // Rotate checkpoint crystals
      for (const cp of checkpointObjects) {
        cp.crystal.rotation.y += dt * 1.5;
        cp.crystal.rotation.x = Math.sin(elapsed * 2) * 0.15;
      }

      // Rotate laser barriers
      for (const haz of hazardMeshes) {
        if (haz.hazard.type === 'laser_barrier') {
          haz.group.rotation.y += dt * 0.8;
        }
      }

      // Smooth Dynamic Camera Follow with Exponential Damping
      const camDistBack = 11.0;
      const camHeight = 7.5;
      _targetCamPos.set(
        ballPos.x * 0.85,
        ballPos.y + camHeight,
        ballPos.z - camDistBack
      );
      _targetLookAt.set(ballPos.x, ballPos.y + 0.8, ballPos.z + 2.5);

      const dampLambda = 6.0;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, dampLambda, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, dampLambda, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, dampLambda, dt);

      camera.lookAt(_targetLookAt);

      // Throttle React HUD updates to ~10Hz
      const now = performance.now();
      if (now - lastHudUpdateTime > 90) {
        lastHudUpdateTime = now;
        onStatsUpdateRef.current({ ...statsRef.current });
      }

      // Render Scene
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [level]);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full select-none overflow-hidden bg-slate-950"
      data-testid="threejs-game-viewport"
    />
  );
};
