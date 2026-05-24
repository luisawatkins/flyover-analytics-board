import {
  createPublicClient,
  formatEther,
  http,
  parseAbiItem,
} from "viem";
import { type Chain } from "viem";
import { rootstock, rootstockTestnet, sepolia } from "viem/chains";
import {
  callForUserEvent,
  pegInRegisteredEvent,
  pegOutDepositEvent,
} from "./abi";
import { config } from "./config";
import {
  getLastIndexedBlock,
  indexBlockRangeTransaction,
  type InsertBridgeEventInput,
} from "./db";

type KnownEventName =
  | "PegOutDeposit"
  | "CallForUser"
  | "PegInRegistered";

// Most public RPC providers cap eth_getLogs to ~1000 blocks per request.
const LOGS_BLOCK_RANGE = 899n;

const resolveChain = (): Chain => {
  const key = config.chain.toLowerCase();
  if (key === "rootstock" || key === "rsk-mainnet") {
    return rootstock;
  }
  if (key === "rootstock-testnet" || key === "rsk-testnet") {
    return rootstockTestnet;
  }
  if (key === "sepolia") {
    return sepolia;
  }
  throw new Error(
    `Unsupported CHAIN="${config.chain}". Use rootstock, rootstock-testnet, or sepolia.`,
  );
};

const selectedChain = resolveChain();

const client = createPublicClient({
  chain: selectedChain,
  transport: http(config.rpcUrl),
});

const parseQuoteRequested = parseAbiItem(pegOutDepositEvent);
const parseQuoteCompleted = parseAbiItem(callForUserEvent);
const parseDepositTransferred = parseAbiItem(pegInRegisteredEvent);

const eventParser = {
  PegOutDeposit: parseQuoteRequested,
  CallForUser: parseQuoteCompleted,
  PegInRegistered: parseDepositTransferred,
} as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toTimestamp = (value: bigint) => Number(value);

const logLine = (message: string) => {
  const iso = new Date().toISOString();
  console.log(`[${iso}] ${message}`);
};

let blockTimestampCache = new Map<bigint, number>();

const getCachedBlockTimestamp = async (blockNumber: bigint): Promise<number> => {
  const cached = blockTimestampCache.get(blockNumber);
  if (cached !== undefined) {
    return cached;
  }
  const block = await client.getBlock({ blockNumber });
  const timestamp = toTimestamp(block.timestamp);
  blockTimestampCache.set(blockNumber, timestamp);
  return timestamp;
};

const extractAmountWei = (
  eventName: KnownEventName,
  args: Record<string, unknown>,
): bigint => {
  if (eventName === "CallForUser") {
    return (args.value as bigint | undefined) ?? 0n;
  }
  if (eventName === "PegInRegistered") {
    const transferred = (args.transferredAmount as bigint | undefined) ?? 0n;
    return transferred < 0n ? -transferred : transferred;
  }
  return (args.amount as bigint | undefined) ?? 0n;
};

const fetchLogs = async (
  eventName: KnownEventName,
  fromBlock: bigint,
  toBlock: bigint,
) => {
  return client.getLogs({
    address: config.lbcAddress,
    event: eventParser[eventName],
    fromBlock,
    toBlock,
  });
};

type FetchedLog = Awaited<ReturnType<typeof fetchLogs>>[number];

const logToBridgeEvent = async (
  eventName: KnownEventName,
  log: FetchedLog,
): Promise<InsertBridgeEventInput> => {
  const timestamp = await getCachedBlockTimestamp(log.blockNumber);
  const args = log.args as Record<string, unknown>;
  const amount = extractAmountWei(eventName, args);
  const quoteHashRaw = (args.quoteHash as string | undefined) ?? null;
  const quoteHash = quoteHashRaw ? quoteHashRaw.toLowerCase() : null;
  const lp = (args.from as string | undefined) ?? null;
  const requester = (args.sender as string | undefined) ?? null;
  const success =
    typeof args.success === "boolean" ? (args.success as boolean) : null;
  const pegoutTimestamp =
    eventName === "PegOutDeposit"
      ? Number((args.timestamp as bigint | undefined) ?? BigInt(timestamp))
      : timestamp;

  return {
    eventName,
    quoteHash,
    lpAddress: lp,
    requesterAddress: requester,
    amountWei: amount.toString(),
    success,
    blockNumber: Number(log.blockNumber),
    blockTimestamp: pegoutTimestamp,
    txHash: log.transactionHash,
    logIndex: Number(log.logIndex),
  };
};

const summarizeBatch = (
  eventName: KnownEventName,
  logs: FetchedLog[],
  fromBlock: bigint,
  toBlock: bigint,
) => {
  if (logs.length === 0) {
    return;
  }
  const totalEth = logs.reduce((acc, log) => {
    return acc + extractAmountWei(eventName, log.args as Record<string, unknown>);
  }, 0n);
  logLine(
    `${eventName}: +${logs.length} events (${formatEther(totalEth)} RBTC) in blocks ${fromBlock}-${toBlock}`,
  );
};

const indexOnce = async (): Promise<boolean> => {
  blockTimestampCache = new Map();

  const chainHead = await client.getBlockNumber();
  const safeHead =
    chainHead > config.confirmations ? chainHead - config.confirmations : 0n;
  const saved = getLastIndexedBlock();
  const fromBlock = saved ? saved + 1n : config.startBlock;
  if (fromBlock > safeHead) {
    return false;
  }

  const toBlock =
    fromBlock + LOGS_BLOCK_RANGE > safeHead
      ? safeHead
      : fromBlock + LOGS_BLOCK_RANGE;

  const eventNames: KnownEventName[] = [
    "PegOutDeposit",
    "CallForUser",
    "PegInRegistered",
  ];

  const allEvents: InsertBridgeEventInput[] = [];

  for (const eventName of eventNames) {
    const logs = await fetchLogs(eventName, fromBlock, toBlock);
    summarizeBatch(eventName, logs, fromBlock, toBlock);
    for (const log of logs) {
      allEvents.push(await logToBridgeEvent(eventName, log));
    }
  }

  indexBlockRangeTransaction(allEvents, toBlock);
  return true;
};

export const runIndexer = async () => {
  logLine(
    `Flyover indexer started on ${selectedChain.name} (${selectedChain.id})`,
  );
  while (true) {
    try {
      const processed = await indexOnce();
      if (!processed) {
        await sleep(config.pollIntervalMs);
      }
    } catch (error) {
      logLine(`Indexer error: ${(error as Error).message}`);
      await sleep(config.pollIntervalMs);
    }
  }
};

if (process.argv[1]?.endsWith("indexer.ts")) {
  runIndexer();
}
