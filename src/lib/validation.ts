import { z } from "zod";
export const credentialsSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(10).max(128),
});
export const signupSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(60),
});
export const bilingualSchema = z.object({
  en: z.string().trim().min(1).max(1200),
  id: z.string().trim().min(1).max(1200),
});
export const timezoneSchema = z
  .string()
  .max(80)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone");
export const profileSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  locale: z.enum(["id", "en"]).optional(),
  experience: z.enum(["beginner", "some", "intermediate"]).optional(),
  goal: z
    .enum(["travel", "work", "school", "hsk", "friends", "curiosity"])
    .optional(),
  dailyMinutes: z
    .union([
      z.literal(5),
      z.literal(10),
      z.literal(15),
      z.literal(20),
      z.literal(30),
    ])
    .optional(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  timezone: timezoneSchema.optional(),
  onboardingStep: z.number().int().min(0).max(6).optional(),
  onboardingDone: z.boolean().optional(),
  placementAnswers: z.array(z.string()).length(3).optional(),
  pinyin: z.boolean().optional(),
  traditional: z.boolean().optional(),
  audio: z.boolean().optional(),
  publicLeaderboard: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  favorites: z.array(z.string().max(80)).max(500).optional(),
  notifications: z
    .object({
      enabled: z.boolean(),
      quietStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      quietEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    })
    .optional(),
});
export const answerSchema = z.object({
  exerciseId: z.string().max(100),
  answer: z.union([z.string().max(1000), z.array(z.string().max(200)).max(50)]),
  eventId: z.uuid(),
});
export const reviewSchema = z.object({
  stateId: z.string().max(100),
  rating: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
  eventId: z.uuid(),
  expectedDue: z.iso.datetime(),
});
export const exerciseSchema = z
  .object({
    type: z.enum([
      "choice",
      "pinyin",
      "character",
      "ordering",
      "blank",
      "matching",
      "dialogue",
    ]),
    prompt: bilingualSchema,
    hanzi: z.string().max(300).nullable().optional(),
    pinyin: z.string().max(300).nullable().optional(),
    answer: z.union([
      z.string().min(1).max(1000),
      z.array(z.string().min(1).max(200)).min(1).max(30),
    ]),
    alternatives: z.array(z.string().max(1000)).default([]),
    hint: bilingualSchema,
    explanation: bilingualSchema,
    options: z.array(z.string().min(1).max(300)).max(30),
  })
  .superRefine((e, ctx) => {
    if (["ordering", "matching"].includes(e.type) && !Array.isArray(e.answer))
      ctx.addIssue({
        code: "custom",
        message: "This type requires an array answer",
      });
    if (
      !["ordering", "matching"].includes(e.type) &&
      typeof e.answer !== "string"
    )
      ctx.addIssue({
        code: "custom",
        message: "This type requires a text answer",
      });
    if (
      ["choice", "pinyin", "character", "dialogue"].includes(e.type) &&
      (!e.options.includes(e.answer as string) ||
        new Set(e.options).size !== e.options.length ||
        e.options.length < 2)
    )
      ctx.addIssue({
        code: "custom",
        message: "Options must be unique and include the answer",
      });
    if (
      e.type === "ordering" &&
      Array.isArray(e.answer) &&
      [...e.options].sort().join("|") !== [...e.answer].sort().join("|")
    )
      ctx.addIssue({
        code: "custom",
        message: "Ordering options must contain exactly the answer tokens",
      });
    if (
      e.type === "matching" &&
      (!Array.isArray(e.answer) ||
        e.answer.length !== e.options.length ||
        !e.answer.every((a) => e.options.includes(a)))
    )
      ctx.addIssue({
        code: "custom",
        message: "Matching must use the same vocabulary IDs",
      });
  });
export const lessonSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]{3,80}$/)
    .optional(),
  unitId: z.string().max(80),
  order: z.number().int().min(1).max(999),
  title: bilingualSchema,
  objective: bilingualSchema,
  estimatedMinutes: z.number().int().min(1).max(60),
  threshold: z.number().int().min(0).max(100),
  vocabulary: z.array(z.string().max(80)).max(30),
  grammar: z.array(z.string().max(80)).max(20),
  exercises: z.array(exerciseSchema).min(1).max(50),
});
