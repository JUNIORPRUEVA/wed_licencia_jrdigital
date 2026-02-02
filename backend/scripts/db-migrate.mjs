import { spawnSync } from "node:child_process";

function requireEnv(key) {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing env var: ${key}`);
    console.error("Copy backend/.env.example to backend/.env and fill values.");
    process.exit(1);
  }
  return v;
}

requireEnv("DATABASE_URL");

const isProd = process.env.NODE_ENV === "production";
const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const args = isProd
  ? ["prisma", "migrate", "deploy"]
  : ["prisma", "migrate", "dev"];

console.log(`Running: ${cmd} ${args.join(" ")}`);
const res = spawnSync(cmd, args, { stdio: "inherit" });
process.exit(res.status ?? 1);
