import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
const schema = readFileSync("prisma/schema.prisma", "utf8").replace(
  'provider = "postgresql"',
  'provider = "sqlite"',
);
mkdirSync("prisma/local", { recursive: true });
writeFileSync("prisma/local/schema.prisma", schema);
if (!existsSync(".env"))
  writeFileSync(
    ".env",
    `DATABASE_URL="file:./local.db"\nAUTH_SECRET="${randomBytes(48).toString("base64url")}"\nAUTH_URL="http://localhost:3000"\nAUTH_TRUST_HOST=true\nSEED_DEV_USERS=true\n`,
  );
if (!readFileSync(".env", "utf8").includes("file:"))
  throw new Error(
    "Local setup requires SQLite .env. Preserve the existing PostgreSQL configuration and use db:migrate instead.",
  );
const run = (args) =>
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", ...args],
    { stdio: "inherit" },
  );
run(["generate", "--schema", "prisma/local/schema.prisma"]);
run(["migrate", "deploy", "--schema", "prisma/local/schema.prisma"]);
execFileSync(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"],
  { stdio: "inherit" },
);
