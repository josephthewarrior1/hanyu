import { describe, it, expect } from "vitest";
import {
  grade,
  schedule,
  localDay,
  updateStreak,
  displayedStreak,
  canEdit,
  canManageUsers,
  xpEvent,
} from "../src/lib/engine";
import { followsGuide, strokeGuides } from "../src/lib/strokes";
import { lessonDrafts, units, words, grammar } from "../src/lib/content";
import { lessonSchema, profileSchema } from "../src/lib/validation";
import { sameOrigin } from "../src/lib/security";
describe("CSRF request origin", () => {
  it("accepts the actual browser host when Next canonicalizes the request URL", () =>
    expect(() =>
      sameOrigin(
        new Request("http://localhost:3000/api/profile", {
          headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
        }),
      ),
    ).not.toThrow());
  it("rejects foreign origins and missing origins", () => {
    expect(() =>
      sameOrigin(
        new Request("http://localhost:3000/api/profile", {
          headers: { host: "localhost:3000", origin: "https://evil.example" },
        }),
      ),
    ).toThrow("Invalid request origin");
    expect(() =>
      sameOrigin(new Request("http://localhost:3000/api/profile")),
    ).toThrow("Invalid request origin");
  });
});
describe("server answer grading", () => {
  it("normalizes punctuation, Unicode and whitespace", () => {
    expect(grade("blank", " 我 喝 水！", "我喝水")).toBe(true);
    expect(grade("pinyin", " WǑ ", "wǒ")).toBe(true);
  });
  it("preserves tone accents and rejects wrong words", () => {
    expect(grade("pinyin", "wo", "wǒ")).toBe(false);
    expect(grade("blank", "你", "我")).toBe(false);
  });
  it("accepts declared alternatives", () =>
    expect(grade("blank", "您好", "你好", ["您好"])).toBe(true));
  it("checks ordered tokens", () => {
    expect(grade("ordering", ["我", "喝", "水"], ["我", "喝", "水"])).toBe(
      true,
    );
    expect(grade("ordering", ["水", "喝", "我"], ["我", "喝", "水"])).toBe(
      false,
    );
  });
  it("checks every matching position and rejects malformed input", () => {
    expect(grade("matching", ["a", "b"], ["a", "b"])).toBe(true);
    expect(grade("matching", ["b", "a"], ["a", "b"])).toBe(false);
    expect(grade("ordering", [4], ["四"])).toBe(false);
  });
});
describe("documented SM-2 inspired scheduling", () => {
  const base = { difficulty: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 };
  const now = new Date("2026-01-01T12:00:00Z");
  it("again is ten minutes with a lapse", () => {
    const n = schedule(base, "AGAIN", now);
    expect(n.due.toISOString()).toBe("2026-01-01T12:10:00.000Z");
    expect(n.lapses).toBe(1);
    expect(n.repetitions).toBe(0);
  });
  it("starts GOOD at one day and then three days", () => {
    const first = schedule(base, "GOOD", now);
    expect(first.intervalDays).toBe(1);
    expect(schedule(first, "GOOD", now).intervalDays).toBe(3);
  });
  it("hard is at least one day; easy starts at four", () => {
    expect(schedule(base, "HARD", now).intervalDays).toBe(1);
    expect(schedule(base, "EASY", now).intervalDays).toBe(4);
  });
  it("caps interval and ease under repeated updates", () => {
    const state = {
      ...base,
      intervalDays: 360,
      repetitions: 10,
      difficulty: 3.5,
    };
    expect(schedule(state, "EASY", now).intervalDays).toBe(365);
    expect(
      schedule({ ...base, difficulty: 1.3 }, "AGAIN", now).difficulty,
    ).toBe(1.3);
  });
});
describe("timezone streaks and privileges", () => {
  it("resolves local dates around UTC midnight", () => {
    expect(localDay(new Date("2026-01-01T20:00:00Z"), "Asia/Jakarta")).toBe(
      "2026-01-02",
    );
    expect(
      localDay(new Date("2026-01-01T01:00:00Z"), "America/Los_Angeles"),
    ).toBe("2025-12-31");
  });
  it("increments consecutive local days without duplicating same-day work", () => {
    const state = { current: 2, longest: 4, lastDay: "2026-01-01" };
    const next = updateStreak(
      state,
      new Date("2026-01-01T18:00:00Z"),
      "Asia/Jakarta",
    );
    expect(next.current).toBe(3);
    expect(
      updateStreak(next, new Date("2026-01-02T12:00:00Z"), "Asia/Jakarta"),
    ).toEqual(next);
  });
  it("resets missed days and hides stale streaks", () => {
    const state = { current: 4, longest: 4, lastDay: "2026-01-01" };
    expect(
      updateStreak(state, new Date("2026-01-04T00:00:00Z"), "UTC").current,
    ).toBe(1);
    expect(
      displayedStreak(state, new Date("2026-01-04T00:00:00Z"), "UTC"),
    ).toBe(0);
  });
  it("handles daylight-saving calendar boundaries", () => {
    const state = { current: 1, longest: 1, lastDay: "2026-03-07" };
    expect(
      updateStreak(state, new Date("2026-03-09T03:30:00Z"), "America/New_York")
        .current,
    ).toBe(2);
  });
  it("separates editor permissions from admin permissions", () => {
    expect(canEdit("EDITOR")).toBe(true);
    expect(canManageUsers("EDITOR")).toBe(false);
    expect(canEdit("STUDENT")).toBe(false);
    expect(canManageUsers("ADMIN")).toBe(true);
  });
  it("binds XP event identity to user and logical lesson, not content version", () => {
    expect(xpEvent("u", "l")).toBe("lesson:u:l");
    expect(xpEvent("u2", "l")).not.toBe(xpEvent("u", "l"));
  });
});
describe("content quality and authoring contract", () => {
  it("has ten original units, each with three playable lessons", () => {
    expect(units).toHaveLength(10);
    expect(words).toHaveLength(60);
    expect(grammar).toHaveLength(10);
    for (const u of units)
      expect(lessonDrafts.filter((l) => l.unitId === u.id)).toHaveLength(3);
  });
  it("validates every seed lesson and grades all 210 intended answers", () => {
    let count = 0;
    for (const l of lessonDrafts) {
      expect(lessonSchema.safeParse(l).success).toBe(true);
      for (const e of l.exercises) {
        expect(grade(e.type, e.answer, e.answer, e.alternatives)).toBe(true);
        count++;
      }
    }
    expect(count).toBe(210);
  });
  it("rejects ambiguous options and missing correct answers", () => {
    const lesson = structuredClone(lessonDrafts[0]);
    lesson.exercises[0].options = ["wrong", "wrong"];
    expect(lessonSchema.safeParse(lesson).success).toBe(false);
  });
  it("rejects invalid timezone and reminder values", () => {
    expect(profileSchema.safeParse({ timezone: "Invalid/Moon" }).success).toBe(
      false,
    );
    expect(profileSchema.safeParse({ reminderTime: "29:70" }).success).toBe(
      false,
    );
  });
  it("contains Hanzi and accented pinyin", () => {
    expect(words[0].hanzi).toBe("你好");
    expect(words[0].pinyin).toBe("nǐ hǎo");
    expect(words.every((w) => /\p{Script=Han}/u.test(w.sample))).toBe(true);
  });
});
describe("original geometric stroke data", () => {
  it("accepts forward paths and rejects reverse stroke order or bad geometry", () => {
    const path = strokeGuides["一"].paths[0];
    expect(followsGuide(path, path)).toBe(true);
    expect(followsGuide([...path].reverse(), path)).toBe(false);
    expect(
      followsGuide(
        [
          [0, 0],
          [300, 300],
        ],
        path,
      ),
    ).toBe(false);
  });
});
