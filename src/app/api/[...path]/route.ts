import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/user";
import { HttpError, limit, sameOrigin } from "@/lib/security";
import {
  signupSchema,
  profileSchema,
  answerSchema,
  reviewSchema,
  lessonSchema,
  bilingualSchema,
} from "@/lib/validation";
import {
  lessonForUser,
  submitAttempt,
  completeLesson,
  rateReview,
  transaction,
} from "@/lib/learning";
import {
  canEdit,
  canManageUsers,
  displayedStreak,
  localDay,
} from "@/lib/engine";
import {
  capabilities,
  OpenAICompatibleTutor,
  tutorInstruction,
  transcribe,
} from "@/lib/providers";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const ok = (data: unknown, status = 200) =>
  NextResponse.json(
    { data },
    { status, headers: { "Cache-Control": "no-store" } },
  );
const fail = (e: unknown) => {
  if (e instanceof HttpError)
    return NextResponse.json(
      { error: { message: e.message } },
      { status: e.status },
    );
  if (e instanceof z.ZodError)
    return NextResponse.json(
      {
        error: {
          message: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
      },
      { status: 400 },
    );
  console.error(
    "HanyuFlow request failed",
    e instanceof Error ? e.message : "Unknown error",
  );
  return NextResponse.json(
    { error: { message: "The request could not be completed. Please retry." } },
    { status: 500 },
  );
};
async function body(req: Request) {
  const text = await req.text();
  if (text.length > 256000) throw new HttpError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
const safeUser = (u: Awaited<ReturnType<typeof currentUser>>) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  plan: u.plan,
  profile: u.profile,
  notifications: u.notifications,
  emailVerified: Boolean(u.emailVerified),
});
const versionSummary = {
  orderBy: { version: "desc" as const },
  where: { status: "PUBLISHED" },
  take: 1,
};
export async function GET(req: Request, context: Context) {
  try {
    const path = (await context.params).path;
    const route = path.join("/");
    if (route === "capabilities") return ok(capabilities());
    const user = await currentUser();
    if (route === "me") return ok(safeUser(user));
    if (route === "curriculum") {
      const units = await db.unit.findMany({
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              versions: {
                orderBy: { version: "desc" },
                where: { status: "PUBLISHED" },
                include: {
                  progress: {
                    where: { userId: user.id },
                    select: {
                      cursor: true,
                      accuracy: true,
                      completedAt: true,
                    },
                  },
                },
              },
              prerequisites: true,
            },
          },
        },
      });
      return ok(
        units.map((unit) => ({
          ...unit,
          lessons: unit.lessons.map((lesson) => {
            const pinned =
              lesson.versions.find((version) => version.progress.length) ??
              lesson.versions[0];
            return { ...lesson, versions: pinned ? [pinned] : [] };
          }),
        })),
      );
    }
    if (path[0] === "lessons" && path.length === 2)
      return ok(await lessonForUser(path[1], user.id));
    if (route === "dashboard" || route === "progress") {
      const [xp, progress, due, states, activity, achievements, latest, next] =
        await Promise.all([
          db.xpLedger.aggregate({
            where: { userId: user.id },
            _sum: { amount: true },
          }),
          db.lessonProgress.findMany({
            where: { userId: user.id },
            include: { version: { select: { lessonId: true, title: true } } },
            orderBy: { startedAt: "desc" },
          }),
          db.reviewState.count({
            where: { userId: user.id, due: { lte: new Date() } },
          }),
          db.reviewState.findMany({
            where: { userId: user.id },
            select: {
              repetitions: true,
              lapses: true,
              intervalDays: true,
              due: true,
            },
          }),
          db.xpLedger.findMany({
            where: {
              userId: user.id,
              createdAt: { gte: new Date(Date.now() - 8 * 86400000) },
            },
            select: { amount: true, createdAt: true },
          }),
          db.userAchievement.findMany({
            where: { userId: user.id },
            include: { achievement: true },
          }),
          db.learningSession.aggregate({
            where: { userId: user.id },
            _sum: { seconds: true },
          }),
          db.lesson.findMany({
            orderBy: [{ unit: { order: "asc" } }, { order: "asc" }],
            include: { versions: versionSummary },
          }),
        ]);
      const completed = progress.filter((p) => p.completedAt);
      const resume = progress.find((p) => !p.completedAt);
      const nextLesson =
        resume?.version.lessonId ??
        next.find(
          (l) =>
            l.versions.length &&
            !completed.some((p) => p.version.lessonId === l.id),
        )?.id;
      const today = localDay(new Date(), user.profile!.timezone);
      const chart = Array.from({ length: 7 }, (_, i) => {
        const day = localDay(
          new Date(Date.now() - (6 - i) * 86400000),
          user.profile!.timezone,
        );
        return {
          day,
          xp: activity
            .filter(
              (x) => localDay(x.createdAt, user.profile!.timezone) === day,
            )
            .reduce((s, x) => s + x.amount, 0),
        };
      });
      const [reviews, writing, speaking, missions] = await Promise.all([
        db.reviewLog.findMany({
          where: { userId: user.id },
          select: { rating: true },
        }),
        db.hanziPractice.count({ where: { userId: user.id } }),
        db.speakingConversation.count({ where: { userId: user.id } }),
        db.userMission.findMany({
          where: { userId: user.id, day: today },
          include: { mission: true },
        }),
      ]);
      return ok({
        user: safeUser(user),
        xp: xp._sum.amount ?? 0,
        completed: completed.length,
        totalLessons: next.filter((l) => l.versions.length).length,
        due,
        mastered: states.filter(
          (s) => s.repetitions >= 5 && s.intervalDays >= 21,
        ).length,
        difficult: states.filter((s) => s.lapses > 0).length,
        upcoming: states.filter((s) => s.due > new Date()).length,
        overdue: states.filter((s) => s.due < new Date(Date.now() - 86400000))
          .length,
        retention: reviews.length
          ? Math.round(
              (reviews.filter((r) => r.rating !== "AGAIN").length /
                reviews.length) *
                100,
            )
          : null,
        streak: displayedStreak(
          user.streak,
          new Date(),
          user.profile!.timezone,
        ),
        accuracy: completed.length
          ? Math.round(
              completed.reduce((s, p) => s + (p.accuracy ?? 0), 0) /
                completed.length,
            )
          : null,
        minutes: Math.floor((latest._sum.seconds ?? 0) / 60),
        todayXp: chart.at(-1)!.xp,
        chart,
        achievements,
        nextLesson,
        progress,
        writing,
        speaking,
        missions,
        readinessLabel:
          "Original foundations progress; no official HSK estimate",
      });
    }
    if (path[0] === "vocabulary") {
      if (path.length === 2) {
        const word = await db.vocabulary.findUnique({
          where: { id: path[1] },
          include: {
            translations: true,
            reviews: { where: { userId: user.id } },
          },
        });
        if (!word) throw new HttpError(404, "Word not found.");
        return ok(word);
      }
      const url = new URL(req.url);
      const q = (url.searchParams.get("q") ?? "").slice(0, 100);
      const page = Math.max(
        1,
        Math.min(10000, Number(url.searchParams.get("page")) || 1),
      );
      const topic = url.searchParams.get("topic");
      const filter = url.searchParams.get("filter");
      const where = {
        AND: [
          q
            ? {
                OR: [
                  { hanzi: { contains: q } },
                  { pinyin: { contains: q } },
                  { translations: { some: { text: { contains: q } } } },
                ],
              }
            : {},
          topic ? { id: { startsWith: topic + "-" } } : {},
          filter === "favorite"
            ? {
                id: {
                  in: Array.isArray(user.profile?.favorites)
                    ? (user.profile.favorites as string[])
                    : [],
                },
              }
            : filter === "mastered"
              ? {
                  reviews: {
                    some: {
                      userId: user.id,
                      repetitions: { gte: 5 },
                      intervalDays: { gte: 21 },
                    },
                  },
                }
              : filter === "difficult"
                ? { reviews: { some: { userId: user.id, lapses: { gt: 0 } } } }
                : {},
        ],
      };
      const [items, total] = await Promise.all([
        db.vocabulary.findMany({
          where,
          skip: (page - 1) * 20,
          take: 20,
          orderBy: { id: "asc" },
          include: {
            translations: true,
            reviews: { where: { userId: user.id } },
          },
        }),
        db.vocabulary.count({ where }),
      ]);
      return ok({ items, total, page, pages: Math.ceil(total / 20) });
    }
    if (path[0] === "grammar") {
      if (path.length === 2) {
        const g = await db.grammarPoint.findUnique({
          where: { id: path[1] },
          include: {
            lessons: {
              include: {
                version: {
                  select: { lessonId: true, title: true, status: true },
                },
              },
            },
          },
        });
        if (!g) throw new HttpError(404, "Grammar not found.");
        return ok(g);
      }
      return ok(await db.grammarPoint.findMany({ orderBy: { id: "asc" } }));
    }
    if (route === "reviews")
      return ok(
        await db.reviewState.findMany({
          where: { userId: user.id, due: { lte: new Date() } },
          orderBy: { due: "asc" },
          take: 50,
          include: { vocabulary: { include: { translations: true } } },
        }),
      );
    if (route === "achievements")
      return ok(
        await db.achievement.findMany({
          include: {
            users: { where: { userId: user.id }, select: { earnedAt: true } },
          },
          orderBy: { threshold: "asc" },
        }),
      );
    if (route === "leaderboard") {
      const users = await db.user.findMany({
        where: { profile: { publicLeaderboard: true } },
        select: { id: true, name: true, xp: { select: { amount: true } } },
        take: 500,
      });
      return ok(
        users
          .map((u) => ({
            name: u.name,
            xp: u.xp.reduce((s, x) => s + x.amount, 0),
          }))
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 20),
      );
    }
    if (route === "conversations")
      return ok(
        await db.speakingConversation.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { messages: { orderBy: { createdAt: "asc" } } },
        }),
      );
    if (route === "export") {
      const data = await db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          profile: true,
          progress: { include: { attempts: true } },
          reviews: true,
          reviewLogs: true,
          xp: true,
          learningSessions: true,
          conversations: { include: { messages: true } },
          pronunciation: true,
          writing: true,
          achievements: true,
          streak: true,
          missions: true,
          notifications: true,
        },
      });
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="hanyuflow-data.json"',
          "Cache-Control": "no-store",
        },
      });
    }
    if (path[0] === "admin") {
      if (!canEdit(user.role))
        throw new HttpError(403, "Editor access required.");
      if (path[1] === "users") {
        if (!canManageUsers(user.role))
          throw new HttpError(403, "Administrator access required.");
        return ok(
          await db.user.findMany({
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              plan: true,
              createdAt: true,
            },
            take: 100,
            orderBy: { createdAt: "desc" },
          }),
        );
      }
      if (path[1] === "lessons" || path[1] === "exercises")
        return ok(
          await db.lesson.findMany({
            orderBy: [{ unit: { order: "asc" } }, { order: "asc" }],
            include: {
              unit: true,
              versions: {
                orderBy: { version: "desc" },
                include: {
                  exercises: {
                    orderBy: { order: "asc" },
                    include: { options: { orderBy: { order: "asc" } } },
                  },
                  vocabulary: true,
                  grammar: true,
                },
              },
            },
          }),
        );
      if (path[1] === "audit")
        return ok(
          await db.auditLog.findMany({
            take: 100,
            orderBy: { createdAt: "desc" },
            include: { actor: { select: { name: true } } },
          }),
        );
      if (path[1] === "units" || path[1] === "curriculum")
        return ok(
          await db.curriculum.findMany({
            include: {
              levels: {
                include: {
                  units: { include: { _count: { select: { lessons: true } } } },
                },
              },
            },
          }),
        );
      if (path[1] === "vocabulary")
        return ok(
          await db.vocabulary.findMany({
            include: { translations: true },
            take: 500,
          }),
        );
      if (path[1] === "grammar")
        return ok(await db.grammarPoint.findMany({ take: 200 }));
      if (path[1] === "dialogues")
        return ok(
          await db.dialogue.findMany({ include: { lines: true }, take: 100 }),
        );
      if (path[1] === "media")
        return ok(await db.mediaAsset.findMany({ take: 100 }));
      if (path[1] === "ai")
        return ok({
          capabilities: capabilities(),
          systemInstruction: tutorInstruction,
          freeDailyQuota: 5,
          proDailyQuota: Number(process.env.AI_DAILY_LIMIT) || 20,
        });
      return ok({
        users: await db.user.count(),
        lessons: await db.lesson.count(),
        completed: await db.lessonProgress.count({
          where: { completedAt: { not: null } },
        }),
        attempts: await db.exerciseAttempt.count(),
        reviews: await db.reviewLog.count(),
        drafts: await db.lessonVersion.count({ where: { status: "DRAFT" } }),
      });
    }
    throw new HttpError(404, "Route not found.");
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request, context: Context) {
  try {
    sameOrigin(req);
    const path = (await context.params).path;
    const route = path.join("/");
    if (route === "register") {
      const input = signupSchema.parse(await body(req));
      await limit(
        `register:${req.headers.get("x-forwarded-for") ?? "local"}`,
        10,
        3600000,
      );
      if (await db.user.findUnique({ where: { email: input.email } }))
        throw new HttpError(409, "Unable to register with this email.");
      const user = await db.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: await hash(input.password, 12),
          profile: { create: {} },
          streak: { create: {} },
          notifications: { create: {} },
        },
      });
      return ok({ id: user.id }, 201);
    }
    if (route === "forgot-password")
      throw new HttpError(
        503,
        "Email delivery and password reset are unconfigured. Contact the local administrator.",
      );
    const user = await currentUser();
    await limit(`writes:${user.id}`, 120, 60000);
    if (route === "profile") {
      const { name, placementAnswers, notifications, ...input } =
        profileSchema.parse(await body(req));
      const placementScore = placementAnswers
        ? placementAnswers.filter((a, i) => a === ["hello", "wǒ", "我喝水"][i])
            .length
        : undefined;
      const result = await transaction(async (tx) => {
        if (name)
          await tx.user.update({ where: { id: user.id }, data: { name } });
        if (notifications)
          await tx.notificationPreference.upsert({
            where: { userId: user.id },
            create: { userId: user.id, ...notifications },
            update: notifications,
          });
        if (input.goal || input.dailyMinutes)
          await tx.learningGoal.create({
            data: {
              profileId: user.id,
              goal: input.goal ?? user.profile!.goal,
              minutes: input.dailyMinutes ?? user.profile!.dailyMinutes,
            },
          });
        return tx.profile.update({
          where: { userId: user.id },
          data: {
            ...input,
            ...(placementScore !== undefined ? { placementScore } : {}),
          },
        });
      });
      return ok(result);
    }
    if (path[0] === "lessons" && path[2] === "attempt")
      return ok(
        await submitAttempt(
          user.id,
          path[1],
          answerSchema.parse(await body(req)),
        ),
      );
    if (path[0] === "lessons" && path[2] === "complete")
      return ok(await completeLesson(user.id, path[1]));
    if (route === "reviews")
      return ok(await rateReview(user.id, reviewSchema.parse(await body(req))));
    if (route === "writing") {
      const input = z
        .object({
          character: z.enum(["一", "二", "三", "十"]),
          strokes: z
            .array(
              z
                .array(
                  z.tuple([
                    z.number().min(0).max(300),
                    z.number().min(0).max(300),
                  ]),
                )
                .min(2)
                .max(2000),
            )
            .min(1)
            .max(50),
          seconds: z.number().int().min(0).max(1800),
        })
        .parse(await body(req));
      return ok(
        await db.hanziPractice.create({ data: { userId: user.id, ...input } }),
      );
    }
    if (route === "password") {
      const input = z
        .object({
          current: z.string().max(128),
          password: z.string().min(10).max(128),
        })
        .parse(await body(req));
      await limit(`password:${user.id}`, 5, 900000);
      if (!(await compare(input.current, user.passwordHash)))
        throw new HttpError(400, "Incorrect current password.");
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: await hash(input.password, 12) },
      });
      return ok({ changed: true });
    }
    if (route === "delete-account") {
      const input = z
        .object({
          password: z.string().max(128),
          confirmation: z.literal("DELETE"),
        })
        .parse(await body(req));
      await limit(`delete:${user.id}`, 5, 900000);
      if (!(await compare(input.password, user.passwordHash)))
        throw new HttpError(400, "Incorrect password.");
      if (
        user.role === "ADMIN" &&
        (await db.user.count({ where: { role: "ADMIN" } })) < 2
      )
        throw new HttpError(
          409,
          "Create another administrator before deleting the last admin account.",
        );
      await db.user.delete({ where: { id: user.id } });
      return ok({ deleted: true });
    }
    if (route === "chat") {
      if (!capabilities().ai)
        throw new HttpError(
          503,
          "AI tutor is unconfigured. Add server credentials to enable it.",
        );
      const input = z
        .object({
          conversationId: z.string().max(100).optional(),
          scenario: z.enum([
            "guided",
            "free",
            "restaurant",
            "travel",
            "shopping",
            "introductions",
            "workplace",
            "interview",
            "hsk-oral",
            "custom",
          ]),
          custom: z.string().max(500).optional(),
          text: z.string().trim().min(1).max(2000),
          support: z.enum(["chinese", "pinyin", "translated"]),
        })
        .parse(await body(req));
      await limit(`ai-minute:${user.id}`, 5, 60000);
      const quota =
        user.plan === "PRO" ? Number(process.env.AI_DAILY_LIMIT) || 20 : 5;
      await limit(
        `ai-day:${user.id}:${localDay(new Date(), user.profile!.timezone)}`,
        quota,
        48 * 3600000,
      );
      const conversation = input.conversationId
        ? await db.speakingConversation.findFirst({
            where: { id: input.conversationId, userId: user.id },
          })
        : await db.speakingConversation.create({
            data: { userId: user.id, scenario: input.scenario },
          });
      if (!conversation) throw new HttpError(404, "Conversation not found.");
      const history = await db.speakingMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take: 12,
      });
      const reply = await new OpenAICompatibleTutor().reply([
        {
          role: "system",
          content: `${tutorInstruction}\nExperience: ${user.profile!.experience}. Interface: ${user.profile!.locale}. Support: ${input.support}. Scenario: ${conversation.scenario}. ${input.custom ?? ""}`,
        },
        ...history.reverse().map((m) => ({ role: m.role, content: m.text })),
        { role: "user", content: input.text },
      ]);
      await db.speakingMessage.createMany({
        data: [
          { conversationId: conversation.id, role: "user", text: input.text },
          {
            conversationId: conversation.id,
            role: "assistant",
            text: reply.text,
            usageTokens: reply.usageTokens,
          },
        ],
      });
      return ok({ conversationId: conversation.id, ...reply });
    }
    if (route === "delete-conversation") {
      const input = z.object({ id: z.string() }).parse(await body(req));
      await db.speakingConversation.deleteMany({
        where: { id: input.id, userId: user.id },
      });
      return ok({ deleted: true });
    }
    if (route === "transcribe") {
      if (Number(req.headers.get("content-length")) > 6 * 1024 * 1024)
        throw new HttpError(413, "Audio too large.");
      await limit(`speech:${user.id}`, 10, 3600000);
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        throw new HttpError(400, "Audio recording required.");
      const transcript = await transcribe(file);
      await db.pronunciationAttempt.create({
        data: {
          userId: user.id,
          transcript,
          provider: "openai-compatible-stt",
          result: {
            kind: "transcription-only",
            pronunciationAssessment: false,
          },
        },
      });
      return ok({ transcript, kind: "transcription-only" });
    }
    if (path[0] === "admin") {
      if (!canEdit(user.role))
        throw new HttpError(403, "Editor access required.");
      if (path[1] === "users") {
        if (!canManageUsers(user.role))
          throw new HttpError(403, "Administrator access required.");
        const input = z
          .object({
            id: z.string(),
            role: z.enum(["STUDENT", "EDITOR", "ADMIN"]),
            plan: z.enum(["FREE", "PRO"]),
          })
          .parse(await body(req));
        if (input.id === user.id && input.role !== "ADMIN")
          throw new HttpError(409, "Administrators cannot demote themselves.");
        await transaction(async (tx) => {
          await tx.user.update({
            where: { id: input.id },
            data: { role: input.role, plan: input.plan },
          });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "USER_ROLE_PLAN",
              target: input.id,
              details: { role: input.role, plan: input.plan },
            },
          });
        });
        return ok({ updated: true });
      }
      if (path[1] === "lessons") {
        const input = lessonSchema.parse(await body(req));
        if (!(await db.unit.findUnique({ where: { id: input.unitId } })))
          throw new HttpError(400, "Unknown unit.");
        if (
          (await db.vocabulary.count({
            where: { id: { in: input.vocabulary } },
          })) !== new Set(input.vocabulary).size
        )
          throw new HttpError(400, "Unknown vocabulary ID.");
        if (
          (await db.grammarPoint.count({
            where: { id: { in: input.grammar } },
          })) !== new Set(input.grammar).size
        )
          throw new HttpError(400, "Unknown grammar ID.");
        const matchingIds = input.exercises
          .filter((e) => e.type === "matching")
          .flatMap((e) => e.options);
        if (
          (await db.vocabulary.count({
            where: { id: { in: matchingIds } },
          })) !== new Set(matchingIds).size
        )
          throw new HttpError(400, "Matching options must be vocabulary IDs.");
        const created = await transaction(async (tx) => {
          const lesson = input.id
            ? await tx.lesson.upsert({
                where: { id: input.id },
                create: {
                  id: input.id,
                  unitId: input.unitId,
                  order: input.order,
                },
                update: {},
              })
            : await tx.lesson.create({
                data: { unitId: input.unitId, order: input.order },
              });
          if (lesson.unitId !== input.unitId)
            throw new HttpError(409, "An existing lesson cannot move units.");
          const max = await tx.lessonVersion.aggregate({
            where: { lessonId: lesson.id },
            _max: { version: true },
          });
          const v = await tx.lessonVersion.create({
            data: {
              lessonId: lesson.id,
              version: (max._max.version ?? 0) + 1,
              title: input.title,
              objective: input.objective,
              estimatedMinutes: input.estimatedMinutes,
              threshold: input.threshold,
              vocabulary: {
                create: input.vocabulary.map((vocabularyId) => ({
                  vocabularyId,
                })),
              },
              grammar: {
                create: input.grammar.map((grammarId) => ({ grammarId })),
              },
              exercises: {
                create: input.exercises.map((e, order) => ({
                  ...e,
                  order,
                  options: {
                    create: e.options.map((text, i) => ({ text, order: i })),
                  },
                })),
              },
            },
          });
          await tx.contentRevision.create({
            data: {
              versionId: v.id,
              actorId: user.id,
              action: "DRAFT_CREATED",
              snapshot: input,
            },
          });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "LESSON_DRAFT",
              target: v.id,
              details: { lessonId: lesson.id, version: v.version },
            },
          });
          return v;
        });
        return ok(created, 201);
      }
      if (path[1] === "publish") {
        const input = z
          .object({ versionId: z.string() })
          .parse(await body(req));
        return ok(
          await transaction(async (tx) => {
            const v = await tx.lessonVersion.findUnique({
              where: { id: input.versionId },
              include: {
                exercises: { include: { options: true } },
                vocabulary: true,
                grammar: true,
                lesson: true,
              },
            });
            if (!v || v.status !== "DRAFT")
              throw new HttpError(409, "Only drafts can be published.");
            lessonSchema.parse({
              unitId: v.lesson.unitId,
              order: v.lesson.order,
              title: v.title,
              objective: v.objective,
              estimatedMinutes: v.estimatedMinutes,
              threshold: v.threshold,
              vocabulary: v.vocabulary.map((w) => w.vocabularyId),
              grammar: v.grammar.map((g) => g.grammarId),
              exercises: v.exercises.map((e) => ({
                ...e,
                options: e.options.map((o) => o.text),
              })),
            });
            await tx.auditLog.create({
              data: {
                actorId: user.id,
                action: "LESSON_PUBLISH",
                target: v.id,
                details: { lessonId: v.lessonId, version: v.version },
              },
            });
            return tx.lessonVersion.update({
              where: { id: v.id },
              data: { status: "PUBLISHED", publishedAt: new Date() },
            });
          }),
        );
      }
      if (path[1] === "delete-draft") {
        const input = z
          .object({ versionId: z.string() })
          .parse(await body(req));
        await transaction(async (tx) => {
          const v = await tx.lessonVersion.findUnique({
            where: { id: input.versionId },
          });
          if (!v || v.status !== "DRAFT")
            throw new HttpError(409, "Only drafts can be deleted.");
          await tx.lessonVersion.delete({ where: { id: v.id } });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "DRAFT_DELETE",
              target: v.id,
              details: {},
            },
          });
        });
        return ok({ deleted: true });
      }
      if (path[1] === "units") {
        const input = z
          .object({
            id: z.string().regex(/^[a-z0-9-]{3,80}$/),
            title: bilingualSchema,
            description: bilingualSchema,
            icon: z.string().min(1).max(8),
            order: z.number().int().min(1).max(999),
            levelId: z.string(),
          })
          .parse(await body(req));
        const v = await db.unit.upsert({
          where: { id: input.id },
          create: input,
          update: input,
        });
        await db.auditLog.create({
          data: {
            actorId: user.id,
            action: "UNIT_SAVE",
            target: v.id,
            details: {},
          },
        });
        return ok(v);
      }
      if (path[1] === "grammar") {
        const input = z
          .object({
            id: z.string().regex(/^[a-z0-9-]{3,80}$/),
            title: bilingualSchema,
            pattern: z.string().max(300),
            explanation: bilingualSchema,
            examples: z
              .array(
                z.object({
                  hanzi: z.string().max(300),
                  pinyin: z.string().max(300),
                  translation: bilingualSchema,
                }),
              )
              .min(1)
              .max(30),
            commonErrors: bilingualSchema,
          })
          .parse(await body(req));
        const v = await db.grammarPoint.upsert({
          where: { id: input.id },
          create: input,
          update: input,
        });
        await db.auditLog.create({
          data: {
            actorId: user.id,
            action: "GRAMMAR_SAVE",
            target: v.id,
            details: {},
          },
        });
        return ok(v);
      }
      if (path[1] === "vocabulary") {
        const input = z
          .object({
            id: z.string().regex(/^[a-z0-9-]{3,80}$/),
            hanzi: z.string().max(100),
            pinyin: z.string().max(200),
            sample: z.string().max(500),
            samplePinyin: z.string().max(500),
            sampleTranslation: bilingualSchema,
            tags: z.array(z.string().max(80)).max(10),
            translations: bilingualSchema,
          })
          .parse(await body(req));
        const { translations, ...word } = input;
        const v = await transaction(async (tx) => {
          const v = await tx.vocabulary.upsert({
            where: { id: word.id },
            create: word,
            update: word,
          });
          for (const locale of ["en", "id"] as const)
            await tx.vocabularyTranslation.upsert({
              where: { vocabularyId_locale: { vocabularyId: v.id, locale } },
              create: {
                vocabularyId: v.id,
                locale,
                text: translations[locale],
              },
              update: { text: translations[locale] },
            });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "VOCABULARY_SAVE",
              target: v.id,
              details: {},
            },
          });
          return v;
        });
        return ok(v);
      }
    }
    throw new HttpError(404, "Action not found.");
  } catch (e) {
    return fail(e);
  }
}
