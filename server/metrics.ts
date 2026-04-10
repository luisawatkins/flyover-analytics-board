import { formatEther } from "viem";
import { getDatabase } from "./db";

const db = getDatabase();
const DAY_SECONDS = 24 * 60 * 60;

const toEth = (wei: string): number => Number(formatEther(BigInt(wei)));

export type BoardMetrics = {
  volume24h: number;
  volume7d: number;
  tvl: number;
  leaderboard: Array<{
    lpAddress: string;
    totalVolume: number;
    successRate: number;
    quotesCompleted: number;
  }>;
  quoteTimes: Array<{
    quoteHash: string;
    requestedAt: number;
    deliveredAt: number;
    deltaSeconds: number;
  }>;
  volumeSeries: Array<{
    day: string;
    volume: number;
  }>;
};

export const buildBoardMetrics = (): BoardMetrics => {
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - DAY_SECONDS;
  const weekAgo = now - 7 * DAY_SECONDS;

  const volume24hRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount_wei), '0') as total
       FROM bridge_events
       WHERE event_name = 'PegInRegistered'
       AND block_timestamp >= ?`,
    )
    .get(dayAgo) as { total: string };

  const volume7dRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount_wei), '0') as total
       FROM bridge_events
       WHERE event_name = 'PegInRegistered'
       AND block_timestamp >= ?`,
    )
    .get(weekAgo) as { total: string };

  const inboundRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount_wei), '0') as total
       FROM bridge_events WHERE event_name = 'PegOutDeposit'`,
    )
    .get() as { total: string };

  const outboundRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount_wei), '0') as total
       FROM bridge_events
       WHERE event_name = 'CallForUser'
         AND success = 1`,
    )
    .get() as { total: string };

  const leaderboardRows = db
    .prepare(
      `SELECT
         lp_address as lpAddress,
         COUNT(*) as quotesCompleted,
         SUM(amount_wei) as totalWei,
         AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as successRate
       FROM bridge_events
       WHERE event_name = 'CallForUser'
         AND lp_address IS NOT NULL
       GROUP BY lp_address
       ORDER BY totalWei DESC
       LIMIT 10`,
    )
    .all() as Array<{
      lpAddress: string;
      quotesCompleted: number;
      totalWei: string;
      successRate: number;
    }>;

  const quoteRows = db
    .prepare(
      `SELECT
         reg.quote_hash as quoteHash,
         cf.block_timestamp as requestedAt,
         reg.block_timestamp as deliveredAt
       FROM bridge_events cf
       JOIN bridge_events reg ON lower(reg.quote_hash) = lower(cf.quote_hash)
       WHERE cf.event_name = 'CallForUser'
         AND reg.event_name = 'PegInRegistered'
       ORDER BY reg.block_timestamp DESC
       LIMIT 120`,
    )
    .all() as Array<{
      quoteHash: string;
      requestedAt: number;
      deliveredAt: number;
    }>;

  const dailyRows = db
    .prepare(
      `SELECT
         strftime('%Y-%m-%d', datetime(block_timestamp, 'unixepoch')) as day,
         COALESCE(SUM(amount_wei), '0') as totalWei
       FROM bridge_events
       WHERE event_name = 'PegInRegistered'
         AND block_timestamp >= ?
       GROUP BY day
       ORDER BY day ASC`,
    )
    .all(now - 14 * DAY_SECONDS) as Array<{ day: string; totalWei: string }>;

  return {
    volume24h: toEth(volume24hRow.total),
    volume7d: toEth(volume7dRow.total),
    tvl: Math.max(0, toEth(inboundRow.total) - toEth(outboundRow.total)),
    leaderboard: leaderboardRows.map((row) => ({
      lpAddress: row.lpAddress,
      totalVolume: toEth(row.totalWei),
      successRate: row.successRate * 100,
      quotesCompleted: row.quotesCompleted,
    })),
    quoteTimes: quoteRows.map((row) => ({
      ...row,
      deltaSeconds: Math.max(0, row.deliveredAt - row.requestedAt),
    })),
    volumeSeries: dailyRows.map((row) => ({
      day: row.day,
      volume: toEth(row.totalWei),
    })),
  };
};
