import "dotenv/config";
import path from "node:path";
import { spawn } from "node:child_process";
import { cpSync } from "node:fs";
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
cpSync("public", ".next/standalone/public", { recursive: true });
const env = {
  ...process.env,
  HOSTNAME: "127.0.0.1",
  PORT: process.env.PORT ?? "3000",
};
if (
  env.DATABASE_URL?.startsWith("file:") &&
  !path.isAbsolute(env.DATABASE_URL.slice(5))
)
  env.DATABASE_URL =
    "file:" +
    path
      .resolve("prisma/local", env.DATABASE_URL.slice(5))
      .replaceAll("\\", "/");
const server = spawn(process.execPath, [".next/standalone/server.js"], {
  stdio: "inherit",
  env,
});
process.on("SIGTERM", () => server.kill("SIGTERM"));
process.on("SIGINT", () => server.kill("SIGINT"));
server.on("exit", (code) => process.exit(code ?? 0));
