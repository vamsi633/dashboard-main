// lib/auth.ts - Shared authentication configuration (Google + Credentials)
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import type { NextAuthOptions } from "next-auth";
import bcrypt from "bcrypt";
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
    // Google OAuth (unchanged)
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

    // Email + Password via Credentials provider
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
        // Narrow the credentials type safely
        const { email, password } = (credentials ?? {}) as {
          email?: string;
          password?: string;
        };

        if (!email || !password) return null;

        const client = await clientPromise;
        const db = client.db("epiciot");
        const users = db.collection<DBUser>("users");

        const user = await users.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.passwordHash) {
          // user not found OR only has Google login (no password set yet)
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Minimal user object for NextAuth
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: true,

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in (Google or Credentials), attach user id
      if (account && user) {
        token.userId = user.id; // <- typed via next-auth.d.ts augmentation
        token.sub = user.id;

        // Keep access token for Google if present
        if (account.provider === "google" && account.access_token) {
          token.accessToken = account.access_token;
        }
      }
      // Ensure userId persists on subsequent calls
      if (!token.userId && token.sub) token.userId = token.sub;
      return token;
    },

    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = (token.userId || token.sub) as string;
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
