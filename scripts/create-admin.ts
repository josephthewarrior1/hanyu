import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
const input = z
  .object({
    email: z.email(),
    name: z.string().min(2),
    password: z.string().min(16).max(128),
  })
  .parse({
    email: process.env.ADMIN_EMAIL,
    name: process.env.ADMIN_NAME,
    password: process.env.ADMIN_PASSWORD,
  });
const db = new PrismaClient();
try {
  if (await db.user.findUnique({ where: { email: input.email } }))
    throw new Error(
      "Account exists. Use the authorized admin UI to change roles.",
    );
  await db.user.create({
    data: {
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: await hash(input.password, 12),
      role: "ADMIN",
      profile: { create: { onboardingDone: true } },
      notifications: { create: {} },
      streak: { create: {} },
    },
  });
  console.log("Administrator created. Password was not printed.");
} finally {
  await db.$disconnect();
}
