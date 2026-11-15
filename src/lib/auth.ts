import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";

/**
 * Auth.js v5 config.
 * Database sessions (not JWT): single-node self-hosted deploy, fully
 * server-rendered — sessions are revocable server-side and there is no
 * edge round-trip penalty to protect against.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      // Surface the app-level fields the UI needs.
      if (session.user) {
        session.user.id = user.id;
        (session.user as { currencyCode?: string | null }).currencyCode = (
          user as { currencyCode?: string | null }
        ).currencyCode;
        (session.user as { timezone?: string }).timezone = (
          user as { timezone?: string }
        ).timezone;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Seed the per-user default category set on first sign-in.
      if (!user.id) return;
      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({
          userId: user.id!,
          name: c.name,
          kind: c.kind,
          icon: c.icon,
          sortOrder: c.sortOrder,
        })),
        skipDuplicates: true,
      });
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      currencyCode?: string | null;
      timezone?: string;
    };
  }
}
