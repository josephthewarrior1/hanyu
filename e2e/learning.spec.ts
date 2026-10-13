import { test, expect, Page } from "@playwright/test";
import { lessonDrafts, words } from "../src/lib/content";
import { mkdirSync, writeFileSync } from "node:fs";
const email = `browser-${Date.now()}@test.local`,
  password = "BrowserStudy!2026";
const origin = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const seeded = lessonDrafts[0];
const word = (id: string) => words.find((w) => w.id === id)!;
async function login(page: Page, emailAddress: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.locator("input[name=email]").fill(emailAddress);
  await page
    .locator("input[name=password]")
    .fill(
      password === emailAddress
        ? ""
        : emailAddress.endsWith("hanyuflow.local")
          ? "LocalStudy!2026"
          : password,
    );
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
test.describe.serial("verified local learning experience", () => {
  test("signup → resumable onboarding → scored lesson → dashboard → review", async ({
    page,
  }) => {
    mkdirSync("screenshots", { recursive: true });
    await page.goto("/register");
    await page.getByRole("button", { name: "English", exact: true }).click();
    await page.locator("input[name=name]").fill("Browser Learner");
    await page.locator("input[name=email]").fill(email);
    await page.locator("input[name=password]").fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page).toHaveURL(/onboarding/);
    await page.getByRole("button", { name: /English Learn/ }).click();
    await page.getByRole("button", { name: /Lanjut|Continue/ }).click();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Where are you starting?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("button", { name: "15 minutes A sustainable small habit" })
      .click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByLabel("Timezone", { exact: true }).fill("UTC");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const quiz = page.locator("select");
    await quiz.nth(0).selectOption("hello");
    await quiz.nth(1).selectOption("wǒ");
    await quiz.nth(2).selectOption("我喝水");
    await page
      .getByRole("button", { name: "Start learning", exact: true })
      .click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(
      page.getByRole("heading", { name: /Hello, Browser/ }),
    ).toBeVisible();
    const me = await (await page.request.get("/api/me")).json();
    expect(me.data.profile.placementScore).toBe(3);
    expect(me.data.profile.dailyMinutes).toBe(15);
    await page
      .getByRole("link", { name: "Continue learning", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Meet 你好", exact: true }),
    ).toBeVisible();
    const voices = await page.evaluate(() =>
      speechSynthesis.getVoices().map((v) => ({ name: v.name, lang: v.lang })),
    );
    writeFileSync(
      "screenshots/audio-capability.json",
      JSON.stringify(
        {
          mandarinVoices: voices.filter((v) => v.lang.startsWith("zh")),
          note: "Actual installed browser voices, not a speech quality test.",
        },
        null,
        2,
      ),
    );
    await page
      .getByRole("button", { name: "Play Mandarin audio", exact: true })
      .first()
      .click();
    if (!voices.some((v) => v.lang.startsWith("zh")))
      await expect(
        page
          .getByText("No Mandarin voice installed on this device.", {
            exact: false,
          })
          .first(),
      ).toBeVisible();
    await page
      .getByRole("button", { name: "Start practice", exact: true })
      .click();
    await page.screenshot({
      path: "screenshots/lesson-desktop.png",
      fullPage: true,
    });
    for (let i = 0; i < seeded.exercises.length; i++) {
      const exercise = seeded.exercises[i];
      if (i === 0) {
        await page
          .getByRole("radio")
          .filter({ hasText: word(seeded.vocabulary[1]).translation.en })
          .click();
        await page
          .getByRole("button", { name: "Check answer", exact: true })
          .click();
        await expect(
          page.getByText("A useful mistake. Try again."),
        ).toBeVisible();
        await page.getByRole("button", { name: "Retry", exact: true }).click();
      }
      if (exercise.type === "ordering") {
        for (const token of exercise.answer as string[])
          await page
            .locator(".token-list")
            .getByRole("button", { name: token, exact: true })
            .click();
      } else if (exercise.type === "matching") {
        for (let j = 0; j < (exercise.answer as string[]).length; j++)
          await page
            .locator(".matching select")
            .nth(j)
            .selectOption((exercise.answer as string[])[j]);
      } else if (exercise.type === "blank")
        await page
          .getByLabel("Your answer in Hanzi")
          .fill(exercise.answer as string);
      else
        await page
          .getByRole("radio")
          .filter({
            hasText:
              exercise.type === "choice"
                ? word(exercise.answer as string).translation.en
                : (exercise.answer as string),
          })
          .click();
      await page
        .getByRole("button", { name: "Check answer", exact: true })
        .click();
      await expect(
        page.getByText("That’s right!", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name:
            i === seeded.exercises.length - 1 ? "Finish lesson" : "Continue",
          exact: true,
        })
        .click();
      if (i === 0) {
        await page.reload();
        await expect(
          page.getByRole("heading", { name: "Choose the pinyin with tones." }),
        ).toBeVisible();
      }
    }
    await expect(
      page.getByRole("heading", { name: "You made room for progress." }),
    ).toBeVisible();
    await expect(page.getByText("86%", { exact: true })).toBeVisible();
    await expect(page.getByText("37 XP", { exact: true })).toBeVisible();
    await page.screenshot({
      path: "screenshots/completion.png",
      fullPage: true,
    });
    const duplicate = await page.request.post(
      "/api/lessons/greetings-1/complete",
      { headers: { Origin: origin }, data: {} },
    );
    expect(duplicate.ok()).toBe(true);
    expect((await duplicate.json()).data.duplicate).toBe(true);
    await page
      .getByRole("link", { name: "Back to today", exact: true })
      .click();
    const dashboard = await (await page.request.get("/api/dashboard")).json();
    expect(dashboard.data.xp).toBe(37);
    expect(dashboard.data.completed).toBe(1);
    expect(dashboard.data.due).toBe(2);
    await page.reload();
    await page.goto("/review");
    await page
      .getByRole("button", { name: "Reveal meaning", exact: true })
      .click();
    await page.getByRole("button", { name: /Good 1/ }).click();
    await expect(page.getByText("1 reviewed · 1 due")).toBeVisible();
    const after = await (await page.request.get("/api/dashboard")).json();
    expect(after.data.xp).toBe(39);
    expect(after.data.due).toBe(1);
    await page.goto("/dashboard");
    await page.screenshot({
      path: "screenshots/dashboard-desktop.png",
      fullPage: true,
    });
  });
  test("responsive widths, vocabulary search, grammar and offline reading", async ({
    page,
    context,
  }) => {
    await login(page, email);
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: /Hello, Browser/ }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `screenshots/dashboard-${width}.png`,
        fullPage: true,
      });
    }
    await page.goto("/vocabulary");
    await page.getByLabel("Search vocabulary").fill("nǐ hǎo");
    await expect(page.locator(".word-card")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Save this page for offline reading" })
      .click();
    await page.goto("/grammar/greetings");
    await expect(page.getByText("Subject + 好", { exact: true })).toBeVisible();
    await page.goto("/offline");
    await expect(
      page.getByRole("heading", { name: "你好", exact: true }),
    ).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "你好", exact: true }),
    ).toBeVisible();
    await context.setOffline(false);
  });
  test("unconfigured integrations, denied microphone and server role boundaries", async ({
    page,
  }) => {
    await login(page, email);
    const admin = await page.request.get("/api/admin/users");
    expect(admin.status()).toBe(403);
    const status = await (await page.request.get("/api/capabilities")).json();
    expect(status.data.ai).toBe(false);
    expect(status.data.pronunciation).toBe(false);
    await page.addInitScript(() => {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        value: async () => {
          throw new DOMException("Denied for failure test", "NotAllowedError");
        },
      });
    });
    await page.goto("/speaking/guided");
    await expect(page.getByText("AI tutor: unconfigured")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Allow mic & record" }).click();
    await expect(
      page.getByText("Microphone permission denied.", { exact: false }),
    ).toBeVisible();
    const noOrigin = await page.request.post("/api/profile", {
      data: { name: "Invalid" },
    });
    expect(noOrigin.status()).toBe(403);
    const invalid = await page.request.post("/api/profile", {
      headers: { Origin: origin },
      data: { timezone: "Moon/Test" },
    });
    expect(invalid.status()).toBe(400);
  });
  test("admin creates and publishes a validated lesson, student accesses it", async ({
    page,
    browser,
  }) => {
    await login(page, "admin@hanyuflow.local");
    await page.request.post("/api/profile", {
      headers: { Origin: origin },
      data: { locale: "en" },
    });
    await page.goto("/admin/lessons");
    await expect(
      page.getByRole("heading", { name: "Content studio" }),
    ).toBeVisible();
    const id = `browser-published-${Date.now()}`;
    const input = {
      ...seeded,
      id,
      order: 4,
      title: {
        en: "Browser published lesson",
        id: "Pelajaran terbit uji browser",
      },
      exercises: [seeded.exercises[2]],
    };
    await page
      .getByLabel("Content JSON editor")
      .fill(JSON.stringify(input, null, 2));
    await page.getByRole("button", { name: "Save new draft version" }).click();
    await expect(
      page.getByText("Draft version 1 saved.", { exact: false }),
    ).toBeVisible();
    const row = page.locator("tr").filter({ hasText: id });
    await row.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(row.getByText(/v1 · PUBLISHED/)).toBeVisible();
    const studentContext = await browser.newContext();
    const student = await studentContext.newPage();
    await login(student, email);
    await student.goto("/lesson/" + id);
    await expect(
      student.getByRole("heading", {
        name: "Browser published lesson",
        exact: true,
      }),
    ).toBeVisible();
    await student
      .getByRole("button", { name: "Start practice", exact: true })
      .click();
    await student.getByRole("radio").filter({ hasText: "谢谢" }).click();
    await student
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await student
      .getByRole("button", { name: "Finish lesson", exact: true })
      .click();
    await expect(
      student.getByRole("heading", { name: "You made room for progress." }),
    ).toBeVisible();
    await expect(student.getByText("40 XP", { exact: true })).toBeVisible();
    await studentContext.close();
    await page.screenshot({
      path: "screenshots/admin-publishing.png",
      fullPage: true,
    });
  });
  test("settings persist, data export excludes secrets, and pointer writing is saved", async ({
    page,
  }) => {
    await login(page, email);
    await page.goto("/settings");
    await page
      .getByRole("combobox", { name: "Theme", exact: true })
      .selectOption("dark");
    await page
      .getByRole("button", { name: "Save preferences", exact: true })
      .click();
    await expect(
      page.getByText("Preferences saved.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.screenshot({
      path: "screenshots/settings-dark.png",
      fullPage: true,
    });
    const exported = await (await page.request.get("/api/export")).json();
    expect(exported.email).toBe(email);
    expect("passwordHash" in exported).toBe(false);
    expect(exported.progress.length).toBeGreaterThan(0);
    await page
      .getByRole("combobox", { name: "Theme", exact: true })
      .selectOption("light");
    await page
      .getByRole("button", { name: "Save preferences", exact: true })
      .click();
    await expect(
      page.getByText("Preferences saved.", { exact: true }),
    ).toBeVisible();
    await page.goto("/hanzi");
    const canvas = page.locator("canvas");
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 6, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + (box.width * 5) / 6, box.y + box.height / 2, {
      steps: 20,
    });
    await page.mouse.up();
    await page
      .getByRole("button", { name: "Save practice", exact: true })
      .click();
    await expect(
      page.getByText(
        "Saved. Your stroke sequence follows this simple geometric guide.",
      ),
    ).toBeVisible();
    const progress = await (await page.request.get("/api/progress")).json();
    expect(progress.data.writing).toBe(1);
    await page.screenshot({
      path: "screenshots/hanzi-practice.png",
      fullPage: true,
    });
  });
});
