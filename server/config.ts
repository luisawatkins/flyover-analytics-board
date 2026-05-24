import "dotenv/config";
import { isAddress } from "viem";

const oneDayMs = 24 * 60 * 60 * 1000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const isPrivateHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }
  if (host.startsWith("10.") || host.startsWith("192.168.")) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    return true;
  }
  if (host.startsWith("169.254.") || host === "0.0.0.0") {
    return true;
  }
  return false;
};

const validateRpcUrl = (raw: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid RPC_URL: "${raw}" is not a valid URL`);
  }

  const isProduction = process.env.NODE_ENV === "production";
  const allowPrivate = process.env.ALLOW_PRIVATE_RPC === "true";

  if (parsed.protocol === "http:" && isProduction) {
    throw new Error("RPC_URL must use https: in production");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`RPC_URL must use http: or https:, got "${parsed.protocol}"`);
  }
  if (!allowPrivate && isPrivateHost(parsed.hostname)) {
    throw new Error(
      `RPC_URL host "${parsed.hostname}" is private/link-local. Set ALLOW_PRIVATE_RPC=true for local dev.`,
    );
  }

  return raw;
};

const validateLbcAddress = (raw: string | undefined): `0x${string}` => {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed === ZERO_ADDRESS) {
    throw new Error(
      "LBC_ADDRESS is required and must be a valid Liquidity Bridge Contract address",
    );
  }
  if (!isAddress(trimmed)) {
    throw new Error(`LBC_ADDRESS "${trimmed}" is not a valid Ethereum address`);
  }
  return trimmed as `0x${string}`;
};

const defaultCorsOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  chain: process.env.CHAIN ?? "rootstock",
  rpcUrl: validateRpcUrl(process.env.RPC_URL ?? "https://public-node.rsk.co"),
  lbcAddress: validateLbcAddress(process.env.LBC_ADDRESS),
  startBlock: BigInt(process.env.START_BLOCK ?? "0"),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 15_000),
  dashboardWindowMs: Number(process.env.DASHBOARD_WINDOW_MS ?? 14 * oneDayMs),
  confirmations: BigInt(process.env.CONFIRMATIONS ?? "12"),
  corsOrigins: (process.env.CORS_ORIGIN ?? defaultCorsOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
