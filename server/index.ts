import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { getLastIndexedBlock } from "./db";
import { runIndexer } from "./indexer";
import { buildBoardMetrics } from "./metrics";

const app = express();

app.use(
  cors({
    origin: config.corsOrigins,
    methods: ["GET"],
  }),
);
app.use(express.json());

const healthLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const metricsLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", healthLimiter, (_req, res) => {
  res.json({
    ok: true,
    lastIndexedBlock: getLastIndexedBlock()?.toString() ?? null,
  });
});

app.get("/metrics/board", metricsLimiter, (_req, res, next) => {
  try {
    const metrics = buildBoardMetrics();
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  },
);

const bootstrap = async () => {
  runIndexer();
  app.listen(config.port, () => {
    console.log(`Flyover API listening on http://localhost:${config.port}`);
  });
};

bootstrap();
