import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./env";
import { prisma } from "./prisma";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import activationRouter from "./routes/activation";
import publicRouter from "./routes/public";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "connected" });
  } catch (e) {
    res.status(500).json({ ok: false, db: "error", error: String(e) });
  }
});

const authLimiter = rateLimit({ windowMs: 60_000, limit: 60 });
const activationLimiter = rateLimit({ windowMs: 60_000, limit: 200 });

app.use("/auth", authLimiter, authRouter);
app.use("/admin", authLimiter, adminRouter);
app.use("/activation", activationLimiter, activationRouter);
app.use("/public", publicRouter);

app.listen(env.PORT, () => {
  console.log(`License Core API running on http://localhost:${env.PORT}`);
});
