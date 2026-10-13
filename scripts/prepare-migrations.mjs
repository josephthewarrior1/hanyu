import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
mkdirSync("prisma/local", { recursive: true });
writeFileSync(
  "prisma/local/schema.prisma",
  readFileSync("prisma/schema.prisma", "utf8").replace(
    'provider = "postgresql"',
    'provider = "sqlite"',
  ),
);
for (const [schema, folder, provider] of [
  ["prisma/schema.prisma", "prisma/migrations", "postgresql"],
  ["prisma/local/schema.prisma", "prisma/local/migrations", "sqlite"],
]) {
  mkdirSync(folder + "/20261012000000_initial", { recursive: true });
  const sql = execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      schema,
      "--script",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL:
          provider === "sqlite"
            ? "file:./local.db"
            : "postgresql://unused:unused@localhost:5432/unused",
      },
    },
  );
  writeFileSync(folder + "/20261012000000_initial/migration.sql", sql);
  writeFileSync(folder + "/migration_lock.toml", `provider = "${provider}"\n`);
}
