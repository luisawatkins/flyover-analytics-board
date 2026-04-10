import cors from "cors";
import express from "express";
import { config } from "./config";
import { getLastIndexedBlock } from "./db";
import { runIndexer } from "./indexer";
import { buildBoardMetrics } from "./metrics";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    lastIndexedBlock: getLastIndexedBlock()?.toString() ?? null,
  });
});

app.get("/metrics/board", (_req, res) => {
  const metrics = buildBoardMetrics();
  res.json(metrics);
});

const bootstrap = async () => {
  runIndexer();
  app.listen(config.port, () => {
    console.log(`Flyover API listening on http://localhost:${config.port}`);
  });
};

bootstrap();
