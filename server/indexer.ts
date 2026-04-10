import { createPublicClient, formatEther, http, parseAbiItem } from "viem";
import { type Chain } from "viem";
import { rootstock, rootstockTestnet, sepolia } from "viem/chains";
import { config } from "./config";
import {
  getLastIndexedBlock,
  setLastIndexedBlock,
  upsertBridgeEvent,
} from "./db";

type KnownEventName =
  | "PegOutDeposit"
  | "CallForUser"
  | "PegInRegistered";

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

const parseQuoteRequested = parseAbiItem(
  "event PegOutDeposit(bytes32 indexed quoteHash, address indexed sender, uint256 amount, uint256 timestamp)",
);
const parseQuoteCompleted = parseAbiItem(
  "event CallForUser(address indexed from, address indexed dest, uint256 gasLimit, uint256 value, bytes data, bool success, bytes32 quoteHash)",
);
const parseDepositTransferred = parseAbiItem(
  "event PegInRegistered(bytes32 indexed quoteHash, int256 transferredAmount)",
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toTimestamp = (value: bigint) => Number(value);

const logLine = (message: string) => {
  const iso = new Date().toISOString();
  console.log(`[${iso}] ${message}`);
};

const upsertLog = async (
  eventName: KnownEventName,
  fromBlock: bigint,
  toBlock: bigint,
) => {
  let parsedCount = 0;
  const logs = await client.getLogs({
    address: config.lbcAddress,
    event:
      eventName === "PegOutDeposit"
        ? parseQuoteRequested
        : eventName === "CallForUser"
          ? parseQuoteCompleted
          : parseDepositTransferred,
    fromBlock,
    toBlock,
  });

  for (const log of logs) {
    const block = await client.getBlock({ blockNumber: log.blockNumber });
    const timestamp = toTimestamp(block.timestamp);
    const args = log.args as Record<string, unknown>;
    const amount =
      eventName === "CallForUser"
        ? ((args.value as bigint | undefined) ?? 0n)
        : eventName === "PegInRegistered"
          ? (() => {
              const t =
                (args.transferredAmount as bigint | undefined) ?? 0n;
              return t < 0n ? -t : t;
            })()
          : ((args.amount as bigint | undefined) ?? 0n);
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

    upsertBridgeEvent({
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
    });
    parsedCount += 1;
  }

  if (parsedCount > 0) {
    const totalEth = logs.reduce((acc, l) => {
      const a = l.args as Record<string, unknown>;
      let v = 0n;
      if (eventName === "CallForUser") {
        v = (a.value as bigint | undefined) ?? 0n;
      } else if (eventName === "PegInRegistered") {
        const t = (a.transferredAmount as bigint | undefined) ?? 0n;
        v = t < 0n ? -t : t;
      } else {
        v = (a.amount as bigint | undefined) ?? 0n;
      }
      return acc + v;
    }, 0n);
    logLine(
      `${eventName}: +${parsedCount} events (${formatEther(totalEth)} RBTC) in blocks ${fromBlock}-${toBlock}`,
    );
  }
};

const indexOnce = async (): Promise<boolean> => {
  const chainHead = await client.getBlockNumber();
  const saved = getLastIndexedBlock();
  const fromBlock = saved ? saved + 1n : config.startBlock;
  if (fromBlock > chainHead) {
    return false;
  }

  const toBlock = fromBlock + 899n > chainHead ? chainHead : fromBlock + 899n;
  await upsertLog("PegOutDeposit", fromBlock, toBlock);
  await upsertLog("CallForUser", fromBlock, toBlock);
  await upsertLog("PegInRegistered", fromBlock, toBlock);
  setLastIndexedBlock(toBlock);
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
