// lib/auth.ts - Shared authentication configuration (Google + Credentials)
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import type { NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

interface DBUser {
  _id: ObjectId;
  email: string;
  name?: string;
  image?: string | null;
  passwordHash?: string; // present only for credentials users or those who set a password
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
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
        const { email, password } = (credentials ?? {}) as {
          email?: string;
          password?: string;
        };
        if (!email || !password) return null;

        const client = await clientPromise;
        const db = client.db("epiciot");
        const users = db.collection<DBUser>("users");

        const user = await users.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user._id.toHexString(),
          email: user.email,
          name: user.name,
          image: user.image ?? undefined,
        };
      },
    }),
  ],

  adapter: MongoDBAdapter(clientPromise),

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: true,

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/",
  },

  callbacks: {
    // Robust JWT: always use Mongo _id as userId/sub; backfill by email if needed
    async jwt({ token, user, account }) {
      // Initial sign-in (Google or Credentials): we get a `user`
      if (account && user) {
        const mongoId = typeof user.id === "string" ? user.id : String(user.id);
        (token as { userId?: string }).userId = mongoId;
        token.sub = mongoId; // normalize sub to Mongo _id

        const access = (account as { access_token?: string })?.access_token;
        if (access) (token as { accessToken?: string }).accessToken = access;
        return token;
      }

      // Backfill for old tokens: resolve Mongo _id by email (if needed)
      if (!(token as { userId?: string }).userId && token.email) {
        const client = await clientPromise;
        const db = client.db("epiciot");
        const u = await db
          .collection("users")
          .findOne(
            { email: token.email.toLowerCase() },
            { projection: { _id: 1 } }
          );
        if (u?._id) {
          const id = u._id.toString();
          (token as { userId?: string }).userId = id;
          token.sub = id;
        }
      }

      // IMPORTANT: do NOT fall back to the original OAuth subject anymore
      // (i.e., remove: if (!token.userId && token.sub) token.userId = token.sub)

      return token;
    },

    // Session must expose Mongo _id as session.user.id
    async session({ session, token }) {
      const uid = (token as { userId?: string }).userId;
      if (session?.user && uid) {
        (session.user as { id?: string }).id = uid;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url === `${baseUrl}/dashboard`) return baseUrl;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },

    async signIn({ user }) {
      console.log("SignIn Callback - user:", user?.email);
      return true;
    },
  },

  events: {
    async signIn(message) {
      console.log("User signed in:", message.user?.email);
    },
    async signOut() {
      console.log("User signed out");
    },
    async createUser(message) {
      console.log("New user created:", message.user?.email);
    },
  },
};
