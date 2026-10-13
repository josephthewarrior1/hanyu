import { auth } from "@/auth";
import { db } from "./db";
import { HttpError } from "./security";
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) throw new HttpError(401, "Please sign in.");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true, notifications: true, streak: true },
  });
  if (!user) throw new HttpError(401, "Account no longer exists.");
  return user;
}
