import { _android, expect } from "@playwright/test";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
const serial = process.env.HANYUFLOW_ANDROID_SERIAL ?? "emulator-5556";
const app = "com.hanyuflow.android";
const devices = await _android.devices();
const device = devices.find((d) => d.serial() === serial);
if (!device)
  throw new Error(
    `Test emulator ${serial} not found. Do not silently use another user's phone.`,
  );
device.setDefaultTimeout(15000);
mkdirSync("screenshots/android", { recursive: true });
const resume = process.env.HANYUFLOW_ANDROID_RESUME === "true";
const report = resume
  ? JSON.parse(readFileSync("docs/android-device-results.json", "utf8"))
  : { serial, checks: [], errors: [], capabilities: null };
const passed = (name) => {
  report.checks.push(name);
  console.log("PASS " + name);
};
const current = async () => {
  const view = await device.webView({ pkg: app });
  const page = await view.page();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  return page;
};
const call = (page, method, data = {}) =>
  page.evaluate(
    ({ method, data }) =>
      JSON.parse(window.HanyuNative.request(method, JSON.stringify(data))),
    { method, data },
  );
let page, state;
try {
  if (resume) {
    page = await current();
  } else {
    await device.shell(`pm clear ${app}`);
    await device.shell(`am start -W -n ${app}/.MainActivity`);
    page = await current();
    await expect(
      page.getByRole("heading", { name: "Mulai perjalananmu" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mulai langsung", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Halo, Pelajar." }),
    ).toBeVisible();
    passed(
      "first launch starts offline immediately with no account or AI setup",
    );
    await page.getByRole("button", { name: "Profil", exact: true }).click();
    await page.getByRole("button", { name: "Pengaturan", exact: true }).click();
    await page.getByLabel("Nama", { exact: true }).fill("Android Learner");
    await page
      .getByRole("combobox", { name: "Bahasa antarmuka", exact: true })
      .selectOption("en");
    await page.getByLabel("Zona waktu", { exact: true }).fill("UTC");
    await page
      .getByRole("button", { name: "Simpan preferensi", exact: true })
      .click();
    await page.getByRole("button", { name: "Dismiss message" }).click();
    await device.shell(`am force-stop ${app}`);
    await device.shell(`am start -W -n ${app}/.MainActivity`);
    page = await current();
    await expect(
      page.getByRole("heading", { name: "Hello, Android." }),
    ).toBeVisible();
    passed("optional local profile survives process restart");
    await page
      .getByRole("button", { name: "Continue learning", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Meet 你好", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Start practice", exact: true })
      .click();
    await page.screenshot({ path: "screenshots/android/lesson.png" });
    const curriculum = await page.evaluate(
      async () => await (await fetch("curriculum.json")).json(),
    );
    const lesson = curriculum.lessons[0];
    for (let i = 0; i < lesson.exercises.length; i++) {
      const e = lesson.exercises[i];
      if (i === 0) {
        await page.getByRole("radio").filter({ hasText: "thank you" }).click();
        await page
          .getByRole("button", { name: "Check answer", exact: true })
          .click();
        await expect(
          page.getByText("A useful mistake. Try again.", { exact: true }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Retry", exact: true }).click();
      }
      if (e.type === "ordering") {
        for (const token of e.answer)
          await page
            .locator(".token-list")
            .getByRole("button", { name: token, exact: true })
            .click();
      } else if (e.type === "matching") {
        for (let j = 0; j < e.answer.length; j++)
          await page
            .locator(".matching select")
            .nth(j)
            .selectOption(e.answer[j]);
      } else if (e.type === "blank")
        await page
          .getByLabel("Your answer in Hanzi", { exact: true })
          .fill(e.answer);
      else
        await page
          .getByRole("radio")
          .filter({
            hasText:
              e.type === "choice"
                ? curriculum.words.find((w) => w.id === e.answer).translation.en
                : e.answer,
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
            i === lesson.exercises.length - 1 ? "Finish lesson" : "Continue",
          exact: true,
        })
        .click();
      if (i === 0) {
        await device.shell(`am force-stop ${app}`);
        await device.shell(`am start -W -n ${app}/.MainActivity`);
        page = await current();
        await page
          .getByRole("button", { name: "Continue learning", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: "Choose the pinyin with tones." }),
        ).toBeVisible();
        passed("lesson cursor and attempts survive process death");
      }
    }
    await expect(
      page.getByRole("heading", { name: "You made room for progress." }),
    ).toBeVisible();
    await expect(page.getByText("86%", { exact: true })).toBeVisible();
    await page.screenshot({ path: "screenshots/android/completion.png" });
    state = (await call(page, "state")).data;
    expect(state.points).toBe(37);
    expect(state.serverVerified).toBe(false);
    expect(
      (await call(page, "complete", { id: "greetings-1" })).data.duplicate,
    ).toBe(true);
    expect((await call(page, "state")).data.points).toBe(37);
    passed(
      "seven real Android-graded exercise types and idempotent device points",
    );
    await page
      .getByRole("button", { name: "Review words", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Reveal meaning", exact: true })
      .click();
    await page.getByRole("button", { name: "Good", exact: true }).click();
    state = (await call(page, "state")).data;
    expect(state.points).toBe(39);
    expect(state.reviews.filter((r) => r.due <= state.now)).toHaveLength(1);
    passed("SQLite spaced repetition and persisted review points");
    await page.getByRole("button", { name: "Vocabulary", exact: true }).click();
    await page.getByLabel("Search vocabulary").fill("nǐ hǎo");
    await expect(page.locator(".word-card")).toHaveCount(1);
    await device.shell("input keyevent 4");
    await expect(
      page.getByRole("heading", { name: "Let your words take root" }),
    ).toBeVisible();
    passed("Android back navigation returns to previous screen");
    await page.getByRole("button", { name: "Profile", exact: true }).click();
    await page
      .getByRole("button", { name: "Writing studio", exact: true })
      .click();
    const canvas = page.locator("canvas"),
      box = await canvas.boundingBox();
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
      page.getByText("Saved. Sequence follows this geometric guide."),
    ).toBeVisible();
    expect((await call(page, "state")).data.writing).toHaveLength(1);
    await page.screenshot({ path: "screenshots/android/writing.png" });
    passed("pointer writing saved in real Android SQLite");
    const dismiss = page.getByRole("button", { name: "Dismiss message" });
    if (await dismiss.count()) await dismiss.click();
    await page.getByRole("button", { name: "Speak", exact: true }).click();
    await expect(
      page.getByText("AI & transcription: unconfigured in device mode"),
    ).toBeVisible();
    report.capabilities = (await call(page, "capabilities")).data;
    await page
      .getByRole("button", { name: "Play Mandarin", exact: true })
      .click();
    if (!report.capabilities.mandarinVoice) {
      await expect(
        page
          .getByText("Mandarin TTS voice unavailable.", { exact: false })
          .last(),
      ).toBeVisible();
    }
    passed("native Android TTS configured/unavailable state is honest");
  }
  if (!resume) {
    if (await page.getByRole("button", { name: "Dismiss message" }).count())
      await page.getByRole("button", { name: "Dismiss message" }).click();
    await device.shell(`pm revoke ${app} android.permission.RECORD_AUDIO`);
    await page.getByRole("button", { name: "Allow mic & record" }).click();
  }
  await device.shell(
    "uiautomator dump /data/local/tmp/hanyuflow-permission.xml",
  );
  const permissionXml = (
    await device.shell("cat /data/local/tmp/hanyuflow-permission.xml")
  ).toString();
  const deny = permissionXml.match(
    /<node[^>]*resource-id="[^"]*permission_deny_button"[^>]*>/,
  );
  if (!deny) throw new Error("Actual Android deny button not found");
  const bounds = deny[0].match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!bounds) throw new Error("Permission button bounds missing");
  await device.shell(
    `input tap ${Math.round((Number(bounds[1]) + Number(bounds[3])) / 2)} ${Math.round((Number(bounds[2]) + Number(bounds[4])) / 2)}`,
  );
  await expect(
    page.getByText("Microphone permission denied.", { exact: false }),
  ).toBeVisible();
  passed("actual Android microphone denial handled");
  if (await page.getByRole("button", { name: "Dismiss message" }).count())
    await page.getByRole("button", { name: "Dismiss message" }).click();
  await device.shell(`pm grant ${app} android.permission.RECORD_AUDIO`);
  await page.getByRole("button", { name: "Allow mic & record" }).click();
  await expect(
    page.getByRole("button", { name: "Stop recording", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("2s", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Stop recording", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Delete recording", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete recording", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Delete recording", exact: true }),
  ).toHaveCount(0);
  passed(
    "native record/stop/replay/delete works on emulator (no physical speech quality claim)",
  );
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Backend HTTPS origin", { exact: true })
    .fill("https://127.0.0.1:3000");
  await page.getByRole("button", { name: "Check & open backend" }).click();
  await expect(
    page.getByText("Use a reachable HTTPS backend origin.", { exact: false }),
  ).toBeVisible();
  passed(
    "phone-local laptop URL rejected instead of shipping a broken wrapper",
  );
  if (await page.getByRole("button", { name: "Dismiss message" }).count())
    await page.getByRole("button", { name: "Dismiss message" }).click();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("dark");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "screenshots/android/settings-dark.png" });
  passed("Android preferences persist to SQLite");
  await device.shell("svc wifi disable");
  await device.shell("svc data disable");
  await device.shell(`am force-stop ${app}`);
  await device.shell(`am start -W -n ${app}/.MainActivity`);
  page = await current();
  await expect(
    page.getByRole("heading", { name: "Hello, Android." }),
  ).toBeVisible();
  state = (await call(page, "state")).data;
  expect(state.points).toBe(39);
  expect(state.writing).toHaveLength(1);
  expect(state.profile.theme).toBe("dark");
  await page.screenshot({ path: "screenshots/android/dashboard-offline.png" });
  passed(
    "APK launches and preserves real learning data with Wi-Fi/mobile data disabled",
  );
  expect(report.errors).toEqual([]);
  report.passed = true;
  delete report.failure;
  report.resumedAfterTestToolFix = resume;
  writeFileSync(
    "docs/android-device-results.json",
    JSON.stringify(report, null, 2),
  );
  console.log(`${report.checks.length} Android device flow checks passed.`);
} catch (e) {
  report.passed = false;
  report.failure = String(e);
  writeFileSync(
    "docs/android-device-results.json",
    JSON.stringify(report, null, 2),
  );
  if (page)
    await page
      .screenshot({ path: "screenshots/android/failure.png" })
      .catch(() => {});
  throw e;
} finally {
  await device.shell("svc wifi enable").catch(() => {});
  await device.close();
}
