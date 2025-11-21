import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "admin" | "user";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: "admin" | "user";
    passwordHash?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    accessToken?: string;
    role?: "admin" | "user";
  }
}
