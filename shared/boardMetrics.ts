import { z } from "zod";

export const boardMetricsSchema = z.object({
  volume24h: z.number(),
  volume7d: z.number(),
  tvl: z.number(),
  leaderboard: z.array(
    z.object({
      lpAddress: z.string(),
      totalVolume: z.number(),
      successRate: z.number(),
      quotesCompleted: z.number(),
    }),
  ),
  quoteTimes: z.array(
    z.object({
      quoteHash: z.string(),
      requestedAt: z.number(),
      deliveredAt: z.number(),
      deltaSeconds: z.number(),
    }),
  ),
  volumeSeries: z.array(
    z.object({
      day: z.string(),
      volume: z.number(),
    }),
  ),
});

export type BoardMetrics = z.infer<typeof boardMetricsSchema>;
