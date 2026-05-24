import Database from "better-sqlite3";

const db = new Database("flyover.db");

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS indexer_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_block TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bridge_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  quote_hash TEXT,
  lp_address TEXT,
  requester_address TEXT,
  amount_wei TEXT NOT NULL,
  success INTEGER,
  block_number INTEGER NOT NULL,
  block_timestamp INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  UNIQUE(tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_bridge_events_event_time
  ON bridge_events (event_name, block_timestamp);
CREATE INDEX IF NOT EXISTS idx_bridge_events_lp
  ON bridge_events (lp_address);
CREATE INDEX IF NOT EXISTS idx_bridge_events_quote
  ON bridge_events (quote_hash);
`);

export type InsertBridgeEventInput = {
  eventName: string;
  quoteHash: string | null;
  lpAddress: string | null;
  requesterAddress: string | null;
  amountWei: string;
  success: boolean | null;
  blockNumber: number;
  blockTimestamp: number;
  txHash: string;
  logIndex: number;
};

const upsertBridgeEventStmt = db.prepare(`
INSERT OR IGNORE INTO bridge_events
  (event_name, quote_hash, lp_address, requester_address, amount_wei, success, block_number, block_timestamp, tx_hash, log_index)
VALUES
  (@eventName, @quoteHash, @lpAddress, @requesterAddress, @amountWei, @success, @blockNumber, @blockTimestamp, @txHash, @logIndex)
`);

export const upsertBridgeEvent = (input: InsertBridgeEventInput) =>
  upsertBridgeEventStmt.run({
    ...input,
    success: input.success === null ? null : input.success ? 1 : 0,
  });

const setLastIndexedBlockInTransaction = (block: bigint) => {
  db.prepare(`
    INSERT INTO indexer_state (id, last_block)
    VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET last_block = excluded.last_block
  `).run(block.toString());
};

export const indexBlockRangeTransaction = (
  events: InsertBridgeEventInput[],
  toBlock: bigint,
) => {
  const persist = db.transaction(
    (batch: InsertBridgeEventInput[], block: bigint) => {
      for (const input of batch) {
        upsertBridgeEvent(input);
      }
      setLastIndexedBlockInTransaction(block);
    },
  );
  persist(events, toBlock);
};

export const getLastIndexedBlock = (): bigint | null => {
  const row = db
    .prepare("SELECT last_block FROM indexer_state WHERE id = 1")
    .get() as { last_block: string } | undefined;
  return row ? BigInt(row.last_block) : null;
};

export const setLastIndexedBlock = (block: bigint) => {
  db.prepare(`
    INSERT INTO indexer_state (id, last_block)
    VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET last_block = excluded.last_block
  `).run(block.toString());
};

export const getDatabase = () => db;
