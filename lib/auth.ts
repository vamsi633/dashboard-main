// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId, type Collection } from "mongodb";
import { invitesCollection } from "./invites";

type Role = "admin" | "user";

interface UserDoc {
  _id: ObjectId | string;
  email: string;
  name?: string | null;
  image?: string | null;
  passwordHash?: string;
  role?: Role;
}

const DB_NAME = process.env.MONGODB_DB ?? "epiciot";

// --- Helpers (typed, no `any`) ---
function normalizeId(id: string): ObjectId | string {
  try {
    return new ObjectId(id);
  } catch {
    return id;
  }
}

async function usersCollection(): Promise<Collection<UserDoc>> {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<UserDoc>("users");
}

export const authOptions: NextAuthOptions = {
  // Pin the adapter to the same DB your app already uses
  adapter: MongoDBAdapter(clientPromise, { databaseName: DB_NAME }),

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!, // your env names
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // makes it easier to switch Google accounts when you’re testing admin/non-admin
          prompt: "consent select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // Optional Credentials login (kept from your previous code)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;

        const users = await usersCollection();
        const user = await users.findOne(
          { email },
          {
            projection: {
              passwordHash: 1,
              email: 1,
              name: 1,
              image: 1,
              _id: 1,
            },
          }
        );
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: typeof user._id === "string" ? user._id : user._id.toHexString(),
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    // newUser: "/", // after first OAuth creation
  },

  // New users (created by the adapter) default to role "user"
  events: {
    async createUser({ user }) {
      if (!user?.id) return;
      const users = await usersCollection();
      await users.updateOne(
        { _id: normalizeId(user.id) },
        { $set: { role: "user" as Role } }
      );
    },
  },

  callbacks: {
    // Backfill role for older records
    async signIn({ user, account }) {
      // Only apply the gate to OAuth (Google) sign-ins
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase().trim();
        if (!email) return "/auth/error?error=EmailMissing";

        const users = await usersCollection();

        // 1) Existing user? allow
        const existing = await users.findOne(
          { email },
          { projection: { _id: 1, role: 1 } }
        );
        if (existing) {
          // (Optional) ensure role exists for older rows
          if (!("role" in existing) || !existing.role) {
            await users.updateOne(
              { _id: existing._id },
              { $set: { role: "user" } }
            );
          }
          return true;
        }

        // 2) New email → must have a valid pending invite
        const invites = await invitesCollection();
        const invite = await invites.findOne(
          {
            email,
            status: "pending",
            expiresAt: { $gt: new Date() },
          },
          { projection: { _id: 1 } }
        );

        if (!invite) {
          // No invite → block signup
          return "/auth/error?error=InviteRequired";
        }

        // There is a valid invite → allow. The consume page will mark it used.
        return true;
      }

      // Non-OAuth providers (e.g., Credentials) follow your existing logic
      return true;
    },

    // JWT: normalize id, backfill userId by email if missing, and always attach fresh role
    async jwt({ token, user, account }): Promise<JWT> {
      // Initial sign-in: normalize Mongo _id into token.userId & token.sub
      if (account && user?.id) {
        const mongoId = typeof user.id === "string" ? user.id : String(user.id);
        (token as JWT & { userId?: string }).userId = mongoId;
        token.sub = mongoId;

        // (optional) keep Google access token if you need to call Google APIs
        if (account.provider === "google" && "access_token" in account) {
          (token as JWT & { accessToken?: string }).accessToken = (
            account as unknown as { access_token?: string }
          ).access_token;
        }
      }

      // Backfill userId by email if missing (robustness)
      if (!(token as JWT & { userId?: string }).userId && token.email) {
        const users = await usersCollection();
        const u = await users.findOne(
          { email: token.email.toLowerCase() },
          { projection: { _id: 1 } }
        );
        if (u?._id) {
          const id = typeof u._id === "string" ? u._id : u._id.toString();
          (token as JWT & { userId?: string }).userId = id;
          token.sub = id;
        }
      }

      // Always refresh role from DB so changes apply without sign-out
      const idForRole =
        (user?.id as string) ?? (token.sub as string | undefined);
      if (idForRole) {
        const users = await usersCollection();
        const doc = await users.findOne(
          { _id: normalizeId(idForRole) },
          { projection: { role: 1 } }
        );
        (token as JWT & { role?: Role }).role = (doc?.role as Role) ?? "user";
      } else {
        (token as JWT & { role?: Role }).role =
          (token as JWT & { role?: Role }).role ?? "user";
      }

      return token;
    },

    // Session: expose Mongo _id and role to the client
    async session({ session, token }) {
      if (session.user) {
        const t = token as JWT & { userId?: string; role?: Role };
        if (t.userId) {
          (session.user as { id?: string }).id = t.userId;
        }
        (session.user as { role?: Role }).role = t.role ?? "user";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      try {
        // Allow relative callback URLs (e.g., "/auth/invite/consume?...").
        if (url.startsWith("/")) return `${baseUrl}${url}`;

        // Allow same-origin absolute URLs.
        const to = new URL(url);
        const from = new URL(baseUrl);
        if (to.origin === from.origin) return url;

        // Fallback: home.
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },
  },
};
