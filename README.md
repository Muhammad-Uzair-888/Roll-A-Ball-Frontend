# Roll a Ball: 3D Algorithmic Odyssey

A browser-based 3D roll-a-ball game built with React, Three.js, and TypeScript, featuring a real-time physics simulation, branching routes, collectible coins, hazard traps, checkpoints, and a dedicated **Algorithm Lab** that compares player decisions with Dijkstra's shortest path and 0/1 Knapsack dynamic programming.

Targeted for desktop Google Chrome and ready to deploy on Vercel.

---

## Features

1. **3D Gameplay & Physics**:
   - Local browser physics: rolling momentum, ball rotation, friction, braking, bounce, and respawn.
   - Smooth dynamic camera follow with exponential damping.
   - 3 sequential glowing checkpoint pedestals that update respawn coordinates upon activation.
   - Collectible gems and coins with deduplication safeguards.
   - Rotating laser traps, lava hazards, and route branches (e.g. West Ridge vs. East Canyon).
   - High-fidelity Three.js studio lighting, procedural PBR materials, contact shadows, and horizon fog.

2. **Algorithm Lab**:
   - **Dijkstra Shortest Path**: Graph route planning with animated trace events (`initialize`, `visit`, `relax_edge`), settled distance table, optimal path highlighting, and player route cost comparison.
   - **0/1 Knapsack Optimizer**: Energy budget constraint optimization with an interactive Dynamic Programming table matrix and player score comparison.
   - **Trace Stepper**: Run, Step Forward, Step Backward, Auto-Play (1x, 2x, 4x), and Reset controls. Reset resets the visualization only without affecting the 3D game.

3. **Resilient API Architecture**:
   - Endpoints: `POST /api/dijkstra`, `POST /api/knapsack`, `GET /api/health`.
   - Full error envelope checking, timeout safeguards, and non-blocking background requests.
   - Works seamlessly with both the built-in full-stack Express server and remote backends.

---

## Project Structure

```
├── api/                        # Vercel serverless function handlers
│   ├── dijkstra.ts             # POST /api/dijkstra
│   ├── knapsack.ts             # POST /api/knapsack
│   └── health.ts               # GET /api/health
├── docs/
│   └── API.md                  # Algorithm API specification
├── server.ts                   # Full-stack Express server (dev & production)
├── src/
│   ├── audio/
│   │   └── soundEffects.ts     # Procedural Web Audio sound generator (zero external audio)
│   ├── components/
│   │   ├── hud/
│   │   │   └── GameHUD.tsx     # Collapsible bottom dock, stats indicators, sound toggles
│   │   ├── lab/
│   │   │   ├── AlgorithmLab.tsx# Algorithm Lab screen container
│   │   │   ├── DijkstraView.tsx# Graph visualizer, trace events & comparison panel
│   │   │   └── KnapsackView.tsx# DP table matrix & score comparison panel
│   │   └── modals/
│   │       └── GameModals.tsx  # Ready screen and Course Completed victory dialog
│   ├── config/
│   │   └── levelConfig.ts      # Single source of truth for graph, coins, hazards, checkpoints
│   ├── game/
│   │   ├── GameCanvas.tsx      # Three.js WebGL canvas, animation loop, controls
│   │   ├── gameLogic.ts        # Pure game rules, scoring, collisions, route cost
│   │   ├── gameLogic.test.ts   # Automated unit tests for rules and scoring
│   │   ├── levelBuilder.ts     # Procedural 3D roads, markers, and perimeter geometry
│   │   └── proceduralAssets.ts # 3-12 part composite hero ball, checkpoints, coins
│   ├── server/
│   │   ├── algorithms.ts       # Dijkstra & Knapsack logic with validation and trace
│   │   └── algorithms.test.ts  # Automated unit tests for algorithms
│   ├── services/
│   │   └── apiClient.ts        # Resilient API client service with timeouts & retry
│   ├── types/
│   │   └── api.ts              # TypeScript interfaces matching docs/API.md
│   ├── App.tsx                 # Root application state & screen coordinator
│   └── main.tsx                # React DOM entry point
├── package.json
└── tsconfig.json
```

---

## Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in Google Chrome.

### 3. Run Unit Tests
```bash
npm test
```
Runs the automated tests for game rules, scoring, Dijkstra shortest path, and Knapsack DP table generation.

---

## Setting `VITE_API_BASE_URL`

The API client reads the `VITE_API_BASE_URL` environment variable to determine where algorithm requests are sent:

- **Default (empty)**: When `VITE_API_BASE_URL` is omitted, the frontend automatically routes requests to `/api/...`, which is handled directly by the built-in server (or Vercel serverless functions).
- **Local Python/Backend Server**:
  Create or edit `.env`:
  ```bash
  VITE_API_BASE_URL="http://127.0.0.1:8000"
  ```
- **Remote Production Server**:
  ```bash
  VITE_API_BASE_URL="https://YOUR-API-PROJECT.vercel.app"
  ```

---

## Level Configuration (`src/config/levelConfig.ts`)

All 3D course data is centralized in `src/config/levelConfig.ts`. You can modify:
- **`nodes`**: 3D positions `[x, y, z]`, IDs, labels, checkpoint flags (`isCheckpoint: true, checkpointIndex: 1 | 2 | 3`).
- **`edges`**: Undirected graph roads with `baseWeight`, `hazardBonus`, and hazard descriptions.
- **`blockedEdges`**: Temporarily closed routes (e.g. collapsed bridges).
- **`coins`**: 3D positions, costs (energy budget), values (score points), and colors.
- **`hazards`**: Lava pits, rotating laser barriers, energy penalties, and respawn behaviors.
- **`spawnPosition`** & **`defaultRespawnPosition`**: Player starting coordinates.

---

## Desktop Controls

| Key | Action |
|---|---|
| `W` / `Up Arrow` | Roll Forward |
| `S` / `Down Arrow` | Roll Backward |
| `A` / `Left Arrow` | Roll Left |
| `D` / `Right Arrow` | Roll Right |
| `Spacebar` | Brake / Decelerate |
| `Algorithm Lab` button | Open interactive algorithm trace and comparison |

URL query parameters:
- `?autostart=1`: Immediately starts the game from the title screen.
- `?openlab=1`: Immediately opens the Algorithm Lab.
