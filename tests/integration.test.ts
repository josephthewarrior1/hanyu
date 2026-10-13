import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { hash, compare } from "bcryptjs";
import { db } from "../src/lib/db";
import {
  lessonForUser,
  submitAttempt,
  completeLesson,
  rateReview,
} from "../src/lib/learning";
import { POST, GET } from "../src/app/api/[...path]/route";
import { lessonDrafts } from "../src/lib/content";
const sessionContext = vi.hoisted(() => ({ id: null as string | null }));
vi.mock("@/auth", () => ({
  auth: async () =>
    sessionContext.id ? { user: { id: sessionContext.id } } : null,
}));
let userId: string;
let otherId: string;
const event = () => randomUUID();
beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes("integration.db"))
    throw new Error("Integration tests require the isolated integration.db");
  for (const name of ["Integration Learner", "Other Learner"]) {
    const user = await db.user.create({
      data: {
        name,
        email: `${randomUUID()}@test.local`,
        passwordHash: await hash("TestPassword!2026", 10),
        profile: { create: { onboardingDone: true } },
        streak: { create: {} },
        notifications: { create: {} },
      },
    });
    if (name === "Integration Learner") userId = user.id;
    else otherId = user.id;
  }
});
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
  await db.$disconnect();
});
describe("persistent learning and transactional invariants", () => {
  it("enforces role boundaries and publishes validated immutable drafts through actual routes", async () => {
    const request = (path: string[], data: unknown) =>
      POST(
        new Request("http://localhost:3000/api/" + path.join("/"), {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }),
        { params: Promise.resolve({ path }) },
      );
    const id = `integration-published-${event()}`;
    const input = {
      ...lessonDrafts[0],
      id,
      order: 99,
      exercises: [lessonDrafts[0].exercises[2]],
    };
    try {
      sessionContext.id = userId;
      expect((await request(["admin", "lessons"], input)).status).toBe(403);
      await db.user.update({ where: { id: userId }, data: { role: "EDITOR" } });
      expect(
        (
          await GET(new Request("http://localhost:3000/api/admin/users"), {
            params: Promise.resolve({ path: ["admin", "users"] }),
          })
        ).status,
      ).toBe(403);
      const created = await request(["admin", "lessons"], input);
      expect(created.status).toBe(201);
      const version = (await created.json()).data;
      sessionContext.id = otherId;
      expect(
        (
          await GET(new Request("http://localhost:3000/api/lessons/" + id), {
            params: Promise.resolve({ path: ["lessons", id] }),
          })
        ).status,
      ).toBe(404);
      sessionContext.id = userId;
      expect(
        (await request(["admin", "publish"], { versionId: version.id })).status,
      ).toBe(200);
      expect(
        (await request(["admin", "publish"], { versionId: version.id })).status,
      ).toBe(409);
      sessionContext.id = otherId;
      expect(
        (
          await GET(new Request("http://localhost:3000/api/lessons/" + id), {
            params: Promise.resolve({ path: ["lessons", id] }),
          })
        ).status,
      ).toBe(200);
    } finally {
      sessionContext.id = null;
      await db.user.update({
        where: { id: userId },
        data: { role: "STUDENT" },
      });
      await db.lesson.deleteMany({ where: { id } });
    }
  });
  it("returns translated distractors without exposing grading answers", async () => {
    const lesson = await lessonForUser("greetings-2", otherId);
    expect(
      lesson.exercises[0].options.every((o) =>
        Boolean(o.display?.en && o.display?.id),
      ),
    ).toBe(true);
    expect("answer" in lesson.exercises[0]).toBe(false);
    expect("alternatives" in lesson.exercises[0]).toBe(false);
  });
  it("registers a user through the actual validated route", async () => {
    const email = `${event()}@test.local`;
    const req = new Request("http://localhost:3000/api/register", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password: "TestPassword!2026",
        name: "Test Signup",
      }),
    });
    const response = await POST(req, {
      params: Promise.resolve({ path: ["register"] }),
    });
    expect(response.status).toBe(201);
    const created = await db.user.findUniqueOrThrow({
      where: { email },
      include: { profile: true },
    });
    expect(await compare("TestPassword!2026", created.passwordHash)).toBe(true);
    expect(created.profile?.onboardingDone).toBe(false);
    await db.user.delete({ where: { id: created.id } });
  });
  it("rejects cross-origin signup", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { origin: "https://evil.example" },
        body: "{}",
      }),
      { params: Promise.resolve({ path: ["register"] }) },
    );
    expect(response.status).toBe(403);
  });
  it("rejects unauthenticated private API access", async () => {
    const response = await GET(new Request("http://localhost:3000/api/me"), {
      params: Promise.resolve({ path: ["me"] }),
    });
    expect(response.status).toBe(401);
  });
  it("saves onboarding choices and resumes the same lesson version", async () => {
    await db.profile.update({
      where: { userId },
      data: { onboardingStep: 3, locale: "en", dailyMinutes: 15 },
    });
    expect(
      (await db.profile.findUniqueOrThrow({ where: { userId } }))
        .onboardingStep,
    ).toBe(3);
    const a = await lessonForUser("greetings-1", userId),
      b = await lessonForUser("greetings-1", userId);
    expect(a.id).toBe(b.id);
    expect(a.progress.id).toBe(b.progress.id);
  });
  it("rejects skipping and early completion", async () => {
    const l = await lessonForUser("greetings-1", userId);
    await expect(completeLesson(userId, l.lessonId)).rejects.toThrow(
      "every exercise",
    );
    await expect(
      submitAttempt(userId, l.lessonId, {
        exerciseId: l.exercises[2].id,
        answer: "谢谢",
        eventId: event(),
      }),
    ).rejects.toThrow("in order");
  });
  it("stores wrong answers honestly and accepts an idempotent retry", async () => {
    const l = await lessonForUser("greetings-1", userId);
    const e = await db.exercise.findUniqueOrThrow({
      where: { id: l.exercises[0].id },
    });
    const id = event();
    const wrong = await submitAttempt(userId, l.lessonId, {
      exerciseId: e.id,
      answer: "wrong",
      eventId: id,
    });
    expect(wrong.correct).toBe(false);
    const duplicate = await submitAttempt(userId, l.lessonId, {
      exerciseId: e.id,
      answer: "wrong",
      eventId: id,
    });
    expect(duplicate.correct).toBe(false);
    expect(await db.exerciseAttempt.count({ where: { eventId: id } })).toBe(1);
    await expect(
      submitAttempt(otherId, l.lessonId, {
        exerciseId: e.id,
        answer: "wrong",
        eventId: id,
      }),
    ).rejects.toThrow("Idempotency");
    await expect(
      submitAttempt(userId, l.lessonId, {
        exerciseId: e.id,
        answer: "changed",
        eventId: id,
      }),
    ).rejects.toThrow("Idempotency");
    await submitAttempt(userId, l.lessonId, {
      exerciseId: e.id,
      answer: e.answer as string,
      eventId: event(),
    });
  });
  it("completes from server data and awards XP exactly once under concurrent requests", async () => {
    const l = await lessonForUser("greetings-1", userId);
    for (const e of l.exercises.slice(1)) {
      const actual = await db.exercise.findUniqueOrThrow({
        where: { id: e.id },
      });
      await submitAttempt(userId, l.lessonId, {
        exerciseId: e.id,
        answer: actual.answer as string | string[],
        eventId: event(),
      });
    }
    const results = await Promise.all([
      completeLesson(userId, l.lessonId),
      completeLesson(userId, l.lessonId),
    ]);
    expect(results.every((r) => r.accuracy === 86)).toBe(true);
    expect(await db.xpLedger.count({ where: { userId, kind: "LESSON" } })).toBe(
      1,
    );
    expect(await db.reviewState.count({ where: { userId } })).toBe(2);
    expect(await db.userAchievement.count({ where: { userId } })).toBe(1);
    const completed = await db.lessonProgress.findFirstOrThrow({
      where: { userId, completedAt: { not: null } },
    });
    expect(completed.accuracy).toBe(86);
  });
  it("makes review updates idempotent and prevents stale and premature ratings", async () => {
    const card = await db.reviewState.findFirstOrThrow({ where: { userId } });
    const id = event();
    const input = {
      stateId: card.id,
      rating: "GOOD" as const,
      eventId: id,
      expectedDue: card.due.toISOString(),
    };
    await rateReview(userId, input);
    expect((await rateReview(userId, input)).duplicate).toBe(true);
    expect(await db.reviewLog.count({ where: { userId } })).toBe(1);
    expect(await db.xpLedger.count({ where: { userId, kind: "REVIEW" } })).toBe(
      1,
    );
    await expect(
      rateReview(otherId, { ...input, eventId: event() }),
    ).rejects.toThrow("not found");
    await expect(
      rateReview(userId, { ...input, eventId: event() }),
    ).rejects.toThrow("changed on another device");
    const updated = await db.reviewState.findUniqueOrThrow({
      where: { id: card.id },
    });
    await expect(
      rateReview(userId, {
        ...input,
        eventId: event(),
        expectedDue: updated.due.toISOString(),
      }),
    ).rejects.toThrow("not due");
  });
  it("keeps started attempts pinned after a new content version is published", async () => {
    const original = await lessonForUser("numbers-1", userId);
    const l = await db.lessonVersion.findUniqueOrThrow({
      where: { id: original.id },
    });
    const version = await db.lessonVersion.create({
      data: {
        lessonId: l.lessonId,
        version: 999,
        title: { en: "Integration version", id: "Versi uji" },
        objective: l.objective as Prisma.InputJsonValue,
        threshold: 70,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    expect((await lessonForUser(l.lessonId, userId)).id).toBe(original.id);
    expect((await lessonForUser(l.lessonId, otherId)).id).toBe(version.id);
    await db.lessonProgress.deleteMany({ where: { versionId: version.id } });
    await db.lessonVersion.delete({ where: { id: version.id } });
  });
  it("denies a lesson when a real prerequisite is unmet", async () => {
    await db.prerequisite.create({
      data: { lessonId: "food-1", requiredId: "greetings-1" },
    });
    try {
      await expect(lessonForUser("food-1", otherId)).rejects.toThrow(
        "required lessons",
      );
      expect((await lessonForUser("food-1", userId)).lessonId).toBe("food-1");
    } finally {
      await db.prerequisite.delete({
        where: {
          lessonId_requiredId: {
            lessonId: "food-1",
            requiredId: "greetings-1",
          },
        },
      });
    }
  });
});
