import { formatEther } from "viem";
import type { BoardMetrics } from "../shared/boardMetrics";
import { getDatabase } from "./db";

export type { BoardMetrics } from "../shared/boardMetrics";

const db = getDatabase();
const DAY_SECONDS = 24 * 60 * 60;

const parseWei = (wei: string): bigint => {
  if (!wei || !/^\d+$/.test(wei)) return 0n;
  return BigInt(wei);
};

const toEth = (wei: string | bigint): number => {
  const value = typeof wei === "bigint" ? wei : parseWei(wei);
  return Number(formatEther(value));
};

const sumRows = (rows: { amount_wei: string }[]): bigint =>
  rows.reduce((acc, row) => acc + parseWei(row.amount_wei), 0n);

const volume24hStmt = db.prepare(`
  SELECT amount_wei FROM bridge_events
  WHERE event_name = 'PegInRegistered' AND block_timestamp >= ?
`);

const volume7dStmt = db.prepare(`
  SELECT amount_wei FROM bridge_events
  WHERE event_name = 'PegInRegistered' AND block_timestamp >= ?
`);

const inboundStmt = db.prepare(`
  SELECT amount_wei FROM bridge_events WHERE event_name = 'PegOutDeposit'
`);

const outboundStmt = db.prepare(`
  SELECT amount_wei FROM bridge_events
  WHERE event_name = 'CallForUser' AND success = 1
`);

const leaderboardStmt = db.prepare(`
  SELECT
    lp_address as lpAddress,
    amount_wei as amountWei,
    CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END as successFlag
  FROM bridge_events
  WHERE event_name = 'CallForUser' AND lp_address IS NOT NULL
`);

const quoteTimesStmt = db.prepare(`
  SELECT
    reg.quote_hash as quoteHash,
    cf.block_timestamp as requestedAt,
    reg.block_timestamp as deliveredAt
  FROM bridge_events cf
  JOIN bridge_events reg ON lower(reg.quote_hash) = lower(cf.quote_hash)
  WHERE cf.event_name = 'CallForUser'
    AND reg.event_name = 'PegInRegistered'
  ORDER BY reg.block_timestamp DESC
  LIMIT 120
`);

const dailyRowsStmt = db.prepare(`
  SELECT
    strftime('%Y-%m-%d', datetime(block_timestamp, 'unixepoch')) as day,
    amount_wei
  FROM bridge_events
  WHERE event_name = 'PegInRegistered' AND block_timestamp >= ?
  ORDER BY day ASC
`);

type LeaderboardRawRow = {
  lpAddress: string;
  amountWei: string;
  successFlag: number;
};

const buildLeaderboard = (): BoardMetrics["leaderboard"] => {
  const rows = leaderboardStmt.all() as LeaderboardRawRow[];
  const byLp = new Map<
    string,
    { quotesCompleted: number; totalWei: bigint; successSum: number }
  >();

  for (const row of rows) {
    const existing = byLp.get(row.lpAddress) ?? {
      quotesCompleted: 0,
      totalWei: 0n,
      successSum: 0,
    };
    existing.quotesCompleted += 1;
    existing.totalWei += parseWei(row.amountWei);
    existing.successSum += row.successFlag;
    byLp.set(row.lpAddress, existing);
  }

  return [...byLp.entries()]
    .map(([lpAddress, stats]) => ({
      lpAddress,
      quotesCompleted: stats.quotesCompleted,
      totalWei: stats.totalWei,
      successRate: (stats.successSum / stats.quotesCompleted) * 100,
    }))
    .sort((a, b) => (a.totalWei > b.totalWei ? -1 : a.totalWei < b.totalWei ? 1 : 0))
    .slice(0, 10)
    .map((row) => ({
      lpAddress: row.lpAddress,
      totalVolume: toEth(row.totalWei),
      successRate: row.successRate,
      quotesCompleted: row.quotesCompleted,
    }));
};

const buildVolumeSeries = (since: number): BoardMetrics["volumeSeries"] => {
  const rows = dailyRowsStmt.all(since) as { day: string; amount_wei: string }[];
  const byDay = new Map<string, bigint>();

  for (const row of rows) {
    byDay.set(row.day, (byDay.get(row.day) ?? 0n) + parseWei(row.amount_wei));
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, totalWei]) => ({
      day,
      volume: toEth(totalWei),
    }));
};

export const buildBoardMetrics = (): BoardMetrics => {
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - DAY_SECONDS;
  const weekAgo = now - 7 * DAY_SECONDS;

  const volume24h = sumRows(volume24hStmt.all(dayAgo) as { amount_wei: string }[]);
  const volume7d = sumRows(volume7dStmt.all(weekAgo) as { amount_wei: string }[]);
  const inbound = sumRows(inboundStmt.all() as { amount_wei: string }[]);
  const outbound = sumRows(outboundStmt.all() as { amount_wei: string }[]);

  const quoteRows = quoteTimesStmt.all() as Array<{
    quoteHash: string;
    requestedAt: number;
    deliveredAt: number;
  }>;

  return {
    volume24h: toEth(volume24h),
    volume7d: toEth(volume7d),
    tvl: Math.max(0, toEth(inbound) - toEth(outbound)),
    leaderboard: buildLeaderboard(),
    quoteTimes: quoteRows.map((row) => ({
      ...row,
      deltaSeconds: Math.max(0, row.deliveredAt - row.requestedAt),
    })),
    volumeSeries: buildVolumeSeries(now - 14 * DAY_SECONDS),
  };
};
