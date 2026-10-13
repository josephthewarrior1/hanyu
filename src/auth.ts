import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { credentialsSchema } from "@/lib/validation";
import { limit } from "@/lib/security";
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      authorize: async (input) => {
        const parsed = credentialsSchema.safeParse(input);
        if (!parsed.success) return null;
        await limit(`login:${parsed.data.email}`, 10, 15 * 60000);
        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });
        // Constant bcrypt work for nonexistent users prevents easy timing enumeration.
        const valid = await compare(
          parsed.data.password,
          user?.passwordHash ??
            "$2b$12$OQVXZKoEY7XLxVKY7.j86OfNt.vjxepUtauvuBx/RBUZNjVPao.H.",
        );
        return valid && user
          ? { id: user.id, email: user.email, name: user.name }
          : null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
