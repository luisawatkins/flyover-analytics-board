# Flyover Analytics Board

Analytics dashboard and indexer for **Flyover** (Fast Bridge) liquidity providers and researchers. It ingests Liquidity Bridge Contract (LBC) logs into a local SQLite database and serves aggregated metrics to a React UI.

## Features

- **Indexer** — polls `eth_getLogs` for LBC events (see below), normalizes rows, and stores them in `flyover.db`.
- **Metrics API** — Express server with board aggregates: 24h/7d volume, estimated TVL, LP leaderboard (volume and success rate), quote timing scatter data, and daily volume series.
- **Dashboard** — React + Vite + Recharts; polls `/metrics/board` on an interval.

### Indexed events (LBC)

The server tracks these Solidity events (names match the contract):

| Event | Role |
| --- | --- |
| `PegOutDeposit` | Peg-out quote / deposit signal |
| `CallForUser` | Call execution (includes `success` and `quoteHash`) |
| `PegInRegistered` | Peg-in transfer registration |

## Stack

- **Frontend:** React 19, Vite 8, Recharts  
- **Backend:** Express 5, [viem](https://viem.sh), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)  
- **Runtime:** Node.js (ES modules)

## Prerequisites

- Node.js 20+ recommended  
- An RPC URL that supports **`eth_getLogs`** (many public Rootstock endpoints do not)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy the example file and edit values:

   ```bash
   cp .env.example .env
   ```

   On Windows (cmd/PowerShell) you can use:

   ```powershell
   copy .env.example .env
   ```

3. **Run API, indexer, and dashboard together**

   ```bash
   npm run dev
   ```

   | URL | Description |
   | --- | --- |
   | [http://localhost:5173](http://localhost:5173) | Dashboard (Vite) |
   | [http://localhost:4000/health](http://localhost:4000/health) | API health + last indexed block |
   | [http://localhost:4000/metrics/board](http://localhost:4000/metrics/board) | Board metrics JSON |

   In dev, Vite proxies `/health` and `/metrics` to the API, so the UI can call the same origin.

### Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `API_PORT` | HTTP port for the API | `4000` |
| `CHAIN` | `rootstock`, `rootstock-testnet`, `rsk-mainnet`, `rsk-testnet`, or `sepolia` | `rootstock` |
| `RPC_URL` | Chain JSON-RPC endpoint (must support logs) | `https://public-node.rsk.co` |
| `LBC_ADDRESS` | Liquidity Bridge Contract (`0x…`) — **required** at startup | — |
| `START_BLOCK` | First block to index (bigint string) | `0` |
| `POLL_INTERVAL_MS` | Pause between indexer rounds when caught up | `15000` |
| `CONFIRMATIONS` | Blocks to wait behind chain head before indexing (reorg safety) | `12` |
| `CORS_ORIGIN` | Comma-separated allowed frontend origins | `http://localhost:5173,http://localhost:5174` |
| `ALLOW_PRIVATE_RPC` | Set to `true` to allow localhost/private RPC URLs in dev | unset |
| `DASHBOARD_WINDOW_MS` | Rolling window for some dashboard metrics | `14` days |

Example for Rootstock mainnet:

```env
API_PORT=4000
CHAIN=rootstock
RPC_URL=https://30.rpc.thirdweb.com
LBC_ADDRESS=0xYourLbcAddress
START_BLOCK=1234567
POLL_INTERVAL_MS=15000
```

If you see **`eth_getLogs` does not exist or is not available**, switch to a provider that exposes log queries (for example Thirdweb’s Rootstock RPC above) or your own API key.

The server **refuses to start** without a valid `LBC_ADDRESS`. The indexer also waits `CONFIRMATIONS` blocks behind the chain head to reduce reorg risk.

## NPM scripts

| Script | Command |
| --- | --- |
| `npm run dev` | API + indexer + Vite dev server |
| `npm run dev:api` | API + indexer only |
| `npm run dev:web` | Vite only |
| `npm run indexer` | Standalone indexer process (`server/indexer.ts`) |
| `npm run build` | Typecheck + production Vite build |
| `npm run preview` | Serve built frontend |
| `npm run lint` | ESLint |

## Project layout

- `server/index.ts` — Express app and indexer bootstrap  
- `server/indexer.ts` — Log polling and SQLite writes  
- `server/db.ts` — Schema and queries  
- `server/metrics.ts` — Aggregations for `/metrics/board`  
- `server/config.ts` — Environment configuration  
- `src/` — Dashboard UI  

