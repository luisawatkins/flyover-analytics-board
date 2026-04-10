# Flyover Analytics Board

A dedicated analytics dashboard for Flyover (Fast Bridge) LPs and researchers.

## What this project includes

- Event indexer for `QuoteRequested`, `QuoteCompleted`, and `DepositTransferred`
- Local SQLite event store
- Metrics API for:
  - 24h/7d peg-in volume
  - Estimated bridge TVL
  - LP leaderboard with success rates
  - Quote request-to-delivery time scatter data
- React dashboard with charts and leaderboard

## Step-by-step setup

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
cp .env.example .env
```

Then update `.env`:

- `CHAIN`: `rootstock` (mainnet), `rootstock-testnet`, or `sepolia`
- `RPC_URL`: your chain RPC endpoint
- `LBC_ADDRESS`: Liquidity Bridge Contract address
- `START_BLOCK`: block to start indexing from

Example Rootstock mainnet config:

```env
CHAIN=rootstock
RPC_URL=https://30.rpc.thirdweb.com
LBC_ADDRESS=0xYourLBCAddress
START_BLOCK=1234567
```

Note: Some public Rootstock RPC endpoints do not expose `eth_getLogs`. If you see `the method eth_getLogs does not exist/is not available`, switch `RPC_URL` to one that supports logs (for example `https://30.rpc.thirdweb.com`) or use a provider key.

3. Run API + indexer + dashboard

```bash
npm run dev
```

- Dashboard: [http://localhost:5173](http://localhost:5173)
- API health: [http://localhost:4000/health](http://localhost:4000/health)

## Important implementation notes

- `server/indexer.ts` polls logs and stores normalized rows in `flyover.db`.
- `server/metrics.ts` computes aggregates directly from SQLite.
- `src/App.tsx` refreshes metrics every 30 seconds.
- `CHAIN` selection is resolved in `server/indexer.ts`.

## Next improvements

- Replace the placeholder ABI with your production LBC ABI.
- Add token decimals/symbol support for non-ETH values.
- Add chain + contract selectors in the UI.
- Add tests for SQL metric aggregations.
