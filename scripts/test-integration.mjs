import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
const databasePath = path
  .resolve("prisma/local/integration.db")
  .replaceAll("\\", "/");
const env = {
  ...process.env,
  DATABASE_URL: "file:" + databasePath,
  INTEGRATION: "true",
  SEED_DEV_USERS: "false",
};
const run = (file, args) =>
  execFileSync(process.execPath, [file, ...args], { stdio: "inherit", env });
try {
  run("node_modules/prisma/build/index.js", [
    "generate",
    "--schema",
    "prisma/local/schema.prisma",
  ]);
  run("node_modules/prisma/build/index.js", [
    "migrate",
    "deploy",
    "--schema",
    "prisma/local/schema.prisma",
  ]);
  run("node_modules/tsx/dist/cli.mjs", ["prisma/seed.ts"]);
  run("node_modules/vitest/vitest.mjs", ["run"]);
} finally {
  const local =
    existsSync(".env") && readFileSync(".env", "utf8").includes("file:");
  execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "generate",
      "--schema",
      local ? "prisma/local/schema.prisma" : "prisma/schema.prisma",
    ],
    { stdio: "inherit", env: process.env },
  );
}
