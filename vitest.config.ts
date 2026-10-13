import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include:
      process.env.INTEGRATION === "true"
        ? ["tests/integration.test.ts"]
        : ["tests/engine.test.ts", "tests/providers.test.ts", "tests/program.test.ts", "tests/bridge-content.test.ts"],
    fileParallelism: false,
  },
});
