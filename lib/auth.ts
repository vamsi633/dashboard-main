// lib/auth.ts - Shared authentication configuration
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import type { NextAuthOptions } from "next-auth";

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
  ],
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt", // Changed to JWT for better compatibility
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug logs
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log("JWT Callback - user:", !!user, "account:", !!account);
      // When user signs in for the first time
      if (account && user) {
        console.log("New user login - User ID:", user.id);
        return {
          ...token,
          accessToken: account.access_token,
          userId: user.id, // Store the MongoDB user ID
          sub: user.id, // Ensure sub is set to user ID
        };
      }
      // For subsequent requests, ensure userId is preserved
      if (!token.userId && token.sub) {
        token.userId = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session Callback - token userId:", token.userId);
      if (session?.user && token) {
        // Ensure the user ID is available in the session
        session.user.id = (token.userId || token.sub) as string;
        // Log for debugging
        console.log("Session user ID set to:", session.user.id);
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("Redirect Callback - url:", url, "baseUrl:", baseUrl);
      // Handle different redirect scenarios
      if (url === `${baseUrl}/dashboard`) {
        return baseUrl; // Redirect dashboard to home
      }
      // If the URL is relative, make it absolute
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // If URL is on the same domain, allow it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to home page
      return baseUrl;
    },
    async signIn({ user }) {
      console.log("SignIn Callback - user:", user.email);
      // Allow the sign in
      return true;
    },
  },
  events: {
    async signIn(message) {
      console.log("User signed in:", message.user.email);
    },
    async signOut() {
      console.log("User signed out");
    },
    async createUser(message) {
      console.log("New user created:", message.user.email);
    },
  },
};
