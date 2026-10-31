import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRoutes from "./routes";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { scheduleEmbeddingSync } from "./services/embeddingService";
import { warmUpReranker } from "./services/rerankerService";

const app = express();
const PORT = parseInt(process.env.PORT ?? "4000", 10);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use("/api", apiRoutes);

// ─── Error Handling (must be last) ───────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 AI Smart Search Backend on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV ?? "development"}`);
  console.log(`   Health      : http://localhost:${PORT}/api/health`);
  console.log(`   Opportunities: http://localhost:${PORT}/api/opportunities\n`);

  // Warm up the local models and backfill any missing embedding vectors
  scheduleEmbeddingSync();
  warmUpReranker();
});

export default app;
