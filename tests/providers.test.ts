import { describe, it, expect, vi, afterEach } from "vitest";
import { OpenAICompatibleTutor, capabilities } from "../src/lib/providers";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("honest provider failures", () => {
  it("shows unconfigured without credentials", async () => {
    vi.stubEnv("AI_API_KEY", "");
    vi.stubEnv("AI_MODEL", "");
    expect(capabilities().ai).toBe(false);
    await expect(new OpenAICompatibleTutor().reply([])).rejects.toThrow(
      "unconfigured",
    );
    expect(capabilities().pronunciation).toBe(false);
  });
  it("handles timeout without inventing feedback", async () => {
    vi.stubEnv("AI_API_KEY", "test-only");
    vi.stubEnv("AI_MODEL", "test-model");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Timeout", "TimeoutError")),
    );
    await expect(new OpenAICompatibleTutor().reply([])).rejects.toThrow(
      "did not respond",
    );
  });
  it("rejects malformed successful provider responses", async () => {
    vi.stubEnv("AI_API_KEY", "test-only");
    vi.stubEnv("AI_MODEL", "test-model");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    );
    await expect(new OpenAICompatibleTutor().reply([])).rejects.toThrow(
      "Invalid tutor response",
    );
  });
  it("returns content and usage only from provider data", async () => {
    vi.stubEnv("AI_API_KEY", "test-only");
    vi.stubEnv("AI_MODEL", "test-model");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "你好！" } }],
            usage: { total_tokens: 12 },
          }),
          { status: 200 },
        ),
      ),
    );
    expect(await new OpenAICompatibleTutor().reply([])).toEqual({
      text: "你好！",
      usageTokens: 12,
    });
  });
});
