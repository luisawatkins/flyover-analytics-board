import "dotenv/config";

const oneDayMs = 24 * 60 * 60 * 1000;

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  chain: process.env.CHAIN ?? "rootstock",
  rpcUrl: process.env.RPC_URL ?? "https://public-node.rsk.co",
  lbcAddress: (process.env.LBC_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  startBlock: BigInt(process.env.START_BLOCK ?? "0"),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 15_000),
  dashboardWindowMs: Number(process.env.DASHBOARD_WINDOW_MS ?? 14 * oneDayMs),
  quoteEventName: process.env.QUOTE_REQUESTED_EVENT ?? "QuoteRequested",
  completedEventName: process.env.QUOTE_COMPLETED_EVENT ?? "QuoteCompleted",
  depositEventName: process.env.DEPOSIT_TRANSFERRED_EVENT ?? "DepositTransferred",
};
