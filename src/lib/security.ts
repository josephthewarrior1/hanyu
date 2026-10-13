import { db } from "./db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function limit(key: string, max: number, windowMs: number) {
  const now = new Date();
  // Reset with a conditional update, then atomic upsert/increment. Durable across restarts.
  await db.rateLimit.updateMany({
    where: { key, resetAt: { lte: now } },
    data: { count: 0, resetAt: new Date(now.getTime() + windowMs) },
  });
  const row = await db.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, resetAt: new Date(now.getTime() + windowMs) },
    update: { count: { increment: 1 } },
  });
  if (row.count > max)
    throw new HttpError(429, "Too many requests. Please try again later.");
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = new Set([
    new URL(req.url).origin,
    ...(process.env.AUTH_URL ? [new URL(process.env.AUTH_URL).origin] : []),
  ]);
  // Next.js can canonicalize req.url to AUTH_URL. Compare the real browser Host
  // too; browsers cannot override this header in cross-origin form/fetch requests.
  const host = req.headers.get("host");
  if (host && /^[a-z0-9.:[\]-]+$/i.test(host))
    allowed.add(new URL(`${new URL(req.url).protocol}//${host}`).origin);
  if (!origin || !allowed.has(origin))
    throw new HttpError(403, "Invalid request origin.");
}
