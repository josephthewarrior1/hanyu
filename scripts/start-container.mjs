import { spawnSync, spawn } from "node:child_process";
for (const [script, args] of [
  ["node_modules/prisma/build/index.js", ["migrate", "deploy"]],
  ["node_modules/tsx/dist/cli.mjs", ["prisma/seed.ts"]],
]) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const server = spawn(process.execPath, ["server.js"], { stdio: "inherit" });
process.on("SIGTERM", () => server.kill("SIGTERM"));
process.on("SIGINT", () => server.kill("SIGINT"));
server.on("exit", (code) => process.exit(code ?? 0));
