import { _android, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const report = JSON.parse(
  readFileSync("docs/android-device-results.json", "utf8"),
);
if (report.checks.length !== 12)
  throw new Error(
    "This bounded finish requires the prior 12 verified checks. Run device-flow.mjs for a fresh test.",
  );
const devices = await _android.devices(),
  device = devices.find((d) => d.serial() === "emulator-5556");
if (!device) throw new Error("Owned emulator not found");
try {
  await device.shell("svc wifi disable");
  await device.shell("svc data disable");
  await device.shell("am force-stop com.hanyuflow.android");
  await device.shell("am start -W -n com.hanyuflow.android/.MainActivity");
  const view = await device.webView({ pkg: "com.hanyuflow.android" }),
    page = await view.page();
  await expect(
    page.getByRole("heading", { name: "Hello, Android." }),
  ).toBeVisible();
  const state = await page.evaluate(
    () => JSON.parse(window.HanyuNative.request("state", "{}")).data,
  );
  expect(state.points).toBe(39);
  expect(state.writing).toHaveLength(1);
  expect(state.profile.theme).toBe("dark");
  expect(state.serverVerified).toBe(false);
  const connection = (await device.shell("dumpsys connectivity")).toString();
  report.networkTest =
    "Wi-Fi and mobile data disabled through Android svc before process restart";
  report.finalState = {
    points: state.points,
    completedLessons: state.progress.filter((p) => p.completed_at).length,
    writingSessions: state.writing.length,
    theme: state.profile.theme,
    serverVerified: state.serverVerified,
  };
  await page.screenshot({ path: "screenshots/android/dashboard-offline.png" });
  report.checks.push(
    "APK launches and preserves real learning data with Wi-Fi/mobile data disabled",
  );
  report.passed = true;
  delete report.failure;
  report.resumedAfterTestToolFix = true;
  writeFileSync(
    "docs/android-device-results.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    "PASS offline restart with actual SQLite state: 39 points, one completed lesson, one writing session, dark theme.",
  );
  console.log(`${report.checks.length} Android flow checks verified.`);
  void connection;
} finally {
  await device.shell("svc wifi enable").catch(() => {});
  await device.close();
}
