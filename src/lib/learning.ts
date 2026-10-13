import { Prisma } from "@prisma/client";
import { db } from "./db";
import {
  grade,
  schedule,
  updateStreak,
  xpEvent,
  localDay,
  Rating,
} from "./engine";
import { HttpError } from "./security";
const includes = {
  exercises: {
    include: { options: { orderBy: { order: "asc" as const } } },
    orderBy: { order: "asc" as const },
  },
  vocabulary: { include: { vocabulary: { include: { translations: true } } } },
  grammar: { include: { grammar: true } },
  dialogues: { include: { lines: { orderBy: { order: "asc" as const } } } },
};
export async function transaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let i = 0; i < 4; i++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 15000,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(e.code) &&
        i < 3
      )
        continue;
      throw e;
    }
  }
  throw new Error("Transaction could not complete");
}
export async function lessonForUser(lessonId: string, userId: string) {
  // Pin resumable progress to its immutable content version, even after a new publish.
  const active = await db.lessonProgress.findFirst({
    where: { userId, version: { lessonId } },
    orderBy: { startedAt: "desc" },
  });
  const version = active
    ? await db.lessonVersion.findUnique({
        where: { id: active.versionId },
        include: includes,
      })
    : await db.lessonVersion.findFirst({
        where: { lessonId, status: "PUBLISHED" },
        orderBy: { version: "desc" },
        include: includes,
      });
  if (!version) throw new HttpError(404, "Published lesson not found.");
  const prerequisites = await db.prerequisite.findMany({ where: { lessonId } });
  if (prerequisites.length) {
    const done = await db.lessonProgress.count({
      where: {
        userId,
        completedAt: { not: null },
        version: { lessonId: { in: prerequisites.map((p) => p.requiredId) } },
      },
    });
    if (done < prerequisites.length)
      throw new HttpError(403, "Complete the required lessons first.");
  }
  const progress = await db.lessonProgress.upsert({
    where: { userId_versionId: { userId, versionId: version.id } },
    create: { userId, versionId: version.id },
    update: {},
    include: { attempts: { orderBy: { createdAt: "asc" } } },
  });
  const optionIds = version.exercises
    .filter((e) => e.type === "choice" || e.type === "matching")
    .flatMap((e) => e.options.map((o) => o.text));
  const optionWords = await db.vocabulary.findMany({
    where: { id: { in: optionIds } },
    include: { translations: true },
  });
  const exercises = version.exercises.map(
    ({
      answer: _answer,
      alternatives: _alts,
      explanation: _explanation,
      ...e
    }) => {
      void _answer;
      void _alts;
      void _explanation;
      return {
        ...e,
        options: e.options.map((o) => {
          const word = optionWords.find((word) => word.id === o.text);
          return {
            ...o,
            display: word
              ? {
                  en:
                    word.translations.find((t) => t.locale === "en")?.text ??
                    o.text,
                  id:
                    word.translations.find((t) => t.locale === "id")?.text ??
                    o.text,
                }
              : undefined,
            hanzi: word?.hanzi,
          };
        }),
      };
    },
  );
  return { ...version, exercises, progress };
}
export async function submitAttempt(
  userId: string,
  lessonId: string,
  input: { exerciseId: string; answer: string | string[]; eventId: string },
) {
  return transaction(async (tx) => {
    const duplicate = await tx.exerciseAttempt.findUnique({
      where: { eventId: input.eventId },
      include: {
        progress: { include: { version: { select: { lessonId: true } } } },
        exercise: true,
      },
    });
    if (duplicate) {
      if (
        duplicate.progress.userId !== userId ||
        duplicate.progress.version.lessonId !== lessonId ||
        duplicate.exercise.id !== input.exerciseId ||
        duplicate.progress.versionId !== duplicate.exercise.versionId ||
        JSON.stringify(duplicate.answer) !== JSON.stringify(input.answer)
      )
        throw new HttpError(
          409,
          "Idempotency key does not match this attempt.",
        );
      return {
        correct: duplicate.correct,
        explanation: duplicate.exercise.explanation,
        answer: duplicate.exercise.answer,
        cursor: duplicate.progress.cursor,
      };
    }
    const progress = await tx.lessonProgress.findFirst({
      where: { userId, version: { lessonId } },
      orderBy: { startedAt: "desc" },
      include: { version: { include: { exercises: true } } },
    });
    if (!progress) throw new HttpError(409, "Start the lesson first.");
    if (progress.completedAt)
      throw new HttpError(409, "Lesson already completed.");
    const exercise = progress.version.exercises.find(
      (e) => e.id === input.exerciseId,
    );
    if (!exercise) throw new HttpError(404, "Exercise not found.");
    if (exercise.order > progress.cursor)
      throw new HttpError(409, "Answer exercises in order.");
    const count = await tx.exerciseAttempt.count({
      where: { progressId: progress.id, exerciseId: exercise.id },
    });
    if (count >= 10)
      throw new HttpError(429, "Attempt limit reached for this exercise.");
    const correct = grade(
      exercise.type,
      input.answer,
      exercise.answer,
      exercise.alternatives,
    );
    await tx.exerciseAttempt.create({
      data: {
        progressId: progress.id,
        exerciseId: exercise.id,
        answer: input.answer,
        correct,
        attemptNo: count + 1,
        eventId: input.eventId,
      },
    });
    const cursor = Math.max(progress.cursor, exercise.order + 1);
    await tx.lessonProgress.update({
      where: { id: progress.id },
      data: { cursor },
    });
    return {
      correct,
      explanation: exercise.explanation,
      answer: exercise.answer,
      cursor,
    };
  });
}
export async function completeLesson(userId: string, lessonId: string) {
  return transaction(async (tx) => {
    const progress = await tx.lessonProgress.findFirst({
      where: { userId, version: { lessonId } },
      orderBy: { startedAt: "desc" },
      include: {
        attempts: { orderBy: { attemptNo: "asc" } },
        version: { include: { exercises: true, vocabulary: true } },
      },
    });
    if (!progress) throw new HttpError(409, "Start the lesson first.");
    const prior = await tx.xpLedger.findUnique({
      where: { eventId: xpEvent(userId, lessonId) },
    });
    if (progress.completedAt)
      return {
        accuracy: progress.accuracy,
        xp: prior?.amount ?? 0,
        duplicate: true,
        words: progress.version.vocabulary.length,
      };
    const first = progress.version.exercises.map((e) =>
      progress.attempts.find((a) => a.exerciseId === e.id),
    );
    const latest = progress.version.exercises.map((e) =>
      progress.attempts.filter((a) => a.exerciseId === e.id).at(-1),
    );
    if (first.some((a) => !a))
      throw new HttpError(409, "Answer every exercise before completing.");
    const mastery = Math.round(
      (latest.filter((a) => a?.correct).length / first.length) * 100,
    );
    if (mastery < progress.version.threshold)
      throw new HttpError(
        422,
        "Review your mistakes and retry before completing this lesson.",
      );
    const accuracy = Math.round(
      (first.filter((a) => a?.correct).length / first.length) * 100,
    );
    const xp = prior ? 0 : 20 + Math.round(accuracy / 5);
    await tx.lessonProgress.update({
      where: { id: progress.id },
      data: { completedAt: new Date(), accuracy },
    });
    if (!prior)
      await tx.xpLedger.create({
        data: {
          userId,
          eventId: xpEvent(userId, lessonId),
          amount: xp,
          kind: "LESSON",
        },
      });
    for (const v of progress.version.vocabulary)
      await tx.reviewState.upsert({
        where: {
          userId_vocabularyId: { userId, vocabularyId: v.vocabularyId },
        },
        create: { userId, vocabularyId: v.vocabularyId },
        update: {},
      });
    const profile = await tx.profile.findUniqueOrThrow({ where: { userId } });
    const now = new Date();
    const streak = await tx.streakState.findUnique({ where: { userId } });
    const next = updateStreak(
      streak ?? { current: 0, longest: 0, lastDay: null },
      now,
      profile.timezone,
    );
    await tx.streakState.upsert({
      where: { userId },
      create: { userId, ...next },
      update: next,
    });
    const seconds = Math.max(
      0,
      Math.min(
        1800,
        Math.floor((now.getTime() - progress.startedAt.getTime()) / 1000),
      ),
    );
    await tx.learningSession.create({
      data: { userId, kind: "LESSON", seconds },
    });
    const count = await tx.lessonProgress.count({
      where: { userId, completedAt: { not: null } },
    });
    const achievements = await tx.achievement.findMany({
      where: { kind: "LESSONS", threshold: { lte: count } },
    });
    for (const a of achievements)
      await tx.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: a.id } },
        create: { userId, achievementId: a.id },
        update: {},
      });
    const day = localDay(now, profile.timezone);
    await tx.userMission.upsert({
      where: { userId_missionId_day: { userId, missionId: "one-lesson", day } },
      create: { userId, missionId: "one-lesson", day, progress: 1 },
      update: { progress: { increment: 1 } },
    });
    return {
      accuracy,
      mastery,
      xp,
      words: progress.version.vocabulary.length,
      duplicate: false,
    };
  });
}
export async function rateReview(
  userId: string,
  input: {
    stateId: string;
    rating: Rating;
    eventId: string;
    expectedDue: string;
  },
) {
  return transaction(async (tx) => {
    const duplicate = await tx.reviewLog.findUnique({
      where: { eventId: input.eventId },
    });
    if (duplicate) {
      if (
        duplicate.userId !== userId ||
        duplicate.stateId !== input.stateId ||
        duplicate.rating !== input.rating
      )
        throw new HttpError(409, "Review key conflict.");
      return { due: duplicate.nextDue, duplicate: true };
    }
    const state = await tx.reviewState.findFirst({
      where: { id: input.stateId, userId },
    });
    if (!state) throw new HttpError(404, "Review card not found.");
    if (state.due.toISOString() !== input.expectedDue)
      throw new HttpError(
        409,
        "This card changed on another device. Refresh the review queue.",
      );
    const now = new Date();
    if (state.due > now) throw new HttpError(409, "This card is not due yet.");
    const next = schedule(state, input.rating, now);
    await tx.reviewState.update({ where: { id: state.id }, data: next });
    await tx.reviewLog.create({
      data: {
        userId,
        stateId: state.id,
        eventId: input.eventId,
        rating: input.rating,
        previousDue: state.due,
        nextDue: next.due,
      },
    });
    await tx.xpLedger.create({
      data: {
        userId,
        eventId: `review:${input.eventId}`,
        amount: 2,
        kind: "REVIEW",
      },
    });
    const profile = await tx.profile.findUniqueOrThrow({ where: { userId } });
    const streak = await tx.streakState.findUnique({ where: { userId } });
    const streakNext = updateStreak(
      streak ?? { current: 0, longest: 0, lastDay: null },
      now,
      profile.timezone,
    );
    await tx.streakState.upsert({
      where: { userId },
      create: { userId, ...streakNext },
      update: streakNext,
    });
    return {
      due: next.due,
      intervalDays: next.intervalDays,
      xp: 2,
      duplicate: false,
    };
  });
}
